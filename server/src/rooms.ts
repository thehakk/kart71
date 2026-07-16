import { customAlphabet } from 'nanoid';
import type {
  GameFinalResult,
  HandContinueView,
  PlayerView,
  RoomStatus,
  RoomView,
  Seat,
  Team,
} from './shared/types.js';
import { createGameState, type GameState, type SeatMeta } from './engine/state.js';
import { nextDealerSeat } from './engine/turn.js';
import { winnerFromScores } from './engine/scoring.js';
const genCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);

function randomSeat(): Seat {
  return Math.floor(Math.random() * 4) as Seat;
}

export function teamOf(seat: Seat): Team {
  return (seat % 2) as Team; // 0-2 => 0, 1-3 => 1
}

interface Slot {
  name: string;
  isBot: boolean;
  connected: boolean;
  ready: boolean;
  socketId: string | null;
}

export class Room {
  code: string;
  status: RoomStatus = 'lobby';
  slots: (Slot | null)[] = [null, null, null, null];
  game: GameState | null = null;
  dealerSeat: Seat = 0;
  finalResult: GameFinalResult | null = null;

  constructor(code: string) {
    this.code = code;
  }

  private buildFinalResult(game: GameState): GameFinalResult {
    return {
      teamScores: [...game.teamScores],
      winnerTeam: winnerFromScores(game.teamScores),
      handHistory: [...game.handHistory],
    };
  }

  seatMetas(): SeatMeta[] {
    return ([0, 1, 2, 3] as Seat[]).map((i) => {
      const s = this.slots[i];
      return {
        name: s ? s.name : `Oyuncu ${i + 1}`,
        isBot: s ? s.isBot : true,
        connected: s ? s.connected : false,
      };
    });
  }

  startGame(): void {
    this.finalResult = null;
    this.dealerSeat = randomSeat();
    this.game = createGameState(this.code, this.seatMetas(), this.dealerSeat, 1, [0, 0]);
    this.status = 'in_game';
  }

  /** El bitti: botlar ve kopuk oyuncular hazir, digerleri bekler. */
  resetHandContinueReady(): void {
    for (const s of this.slots) {
      if (!s) continue;
      s.ready = s.isBot || !s.connected;
    }
  }

  /** Tum oyuncular hazirsa sonraki ele gec. */
  maybeContinueHand(): boolean {
    if (!this.game || this.game.phase !== 'ended') return false;
    if (!this.allReady()) return false;
    return this.continueGame();
  }

  handContinueView(forSeat: Seat): HandContinueView {
    const readyBySeat = [0, 1, 2, 3].map(
      (i) => this.slots[i]?.ready ?? false
    ) as [boolean, boolean, boolean, boolean];
    return {
      readyBySeat,
      yourReady: this.slots[forSeat]?.ready ?? false,
      allReady: this.allReady(),
      players: ([0, 1, 2, 3] as Seat[]).map((seat) => {
        const s = this.slots[seat];
        return {
          seat,
          name: s?.name ?? `Oyuncu ${seat + 1}`,
          isBot: s?.isBot ?? false,
          ready: readyBySeat[seat],
        };
      }),
    };
  }

  /** Sonraki ele gec (M6/M7). 13 el bittiyse oyun biter. */
  continueGame(): boolean {
    if (!this.game || this.game.phase !== 'ended') return false;
    if (this.game.handNumber >= 13) {
      this.finalResult = this.buildFinalResult(this.game);
      this.status = 'finished';
      this.game = null;
      return false;
    }
    const teamScores = this.game.teamScores;
    const handHistory = this.game.handHistory;
    this.dealerSeat = nextDealerSeat(this.dealerSeat);
    this.game = createGameState(
      this.code,
      this.seatMetas(),
      this.dealerSeat,
      this.game.handNumber + 1,
      teamScores,
      handHistory
    );
    return true;
  }

  /** Lobiye don; yeni 13 el icin hazir ol (M7). */
  playAgain(): boolean {
    if (this.status !== 'in_game' && this.status !== 'finished') return false;
    if (this.game?.phase === 'ended' && this.game.handNumber >= 13) {
      this.finalResult = this.buildFinalResult(this.game);
    }
    this.game = null;
    this.dealerSeat = randomSeat();
    this.status = 'lobby';
    this.finalResult = null;
    for (const s of this.slots) {
      if (s && !s.isBot) s.ready = false;
    }
    return true;
  }

  firstFreeSeat(): Seat | null {
    for (let i = 0; i < 4; i++) {
      if (this.slots[i] === null) return i as Seat;
    }
    return null;
  }

  seatPlayer(name: string, socketId: string): Seat | null {
    const seat = this.firstFreeSeat();
    if (seat === null) return null;
    this.slots[seat] = { name, isBot: false, connected: true, ready: false, socketId };
    return seat;
  }

  fillBots(): void {
    for (let i = 0; i < 4; i++) {
      if (this.slots[i] === null) {
        this.slots[i] = {
          name: `Bot ${i + 1}`,
          isBot: true,
          connected: true,
          ready: true,
          socketId: null,
        };
      }
    }
  }

  setReady(seat: Seat, ready: boolean): void {
    const s = this.slots[seat];
    if (s && !s.isBot) s.ready = ready;
  }

  seatOfSocket(socketId: string): Seat | null {
    for (let i = 0; i < 4; i++) {
      if (this.slots[i]?.socketId === socketId) return i as Seat;
    }
    return null;
  }

  moveToSeat(socketId: string, target: Seat): boolean {
    if (this.status !== 'lobby') return false;
    if (this.slots[target] !== null) return false; // hedef dolu
    const from = this.seatOfSocket(socketId);
    if (from === null) return false;
    this.slots[target] = this.slots[from];
    this.slots[from] = null;
    return true;
  }

  shuffleTeams(): void {
    if (this.status !== 'lobby') return;
    const occupants = this.slots.filter((s): s is Slot => s !== null);
    for (let i = occupants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [occupants[i], occupants[j]] = [occupants[j], occupants[i]];
    }
    this.slots = [null, null, null, null];
    occupants.forEach((s, i) => {
      this.slots[i] = s;
    });
  }

  removeBySocket(socketId: string): Seat | null {
    for (let i = 0; i < 4; i++) {
      const s = this.slots[i];
      if (s && s.socketId === socketId) {
        this.slots[i] = null;
        return i as Seat;
      }
    }
    return null;
  }

  /** Kopma: koltuk ve isim korunur; oyunda bot devralir. */
  disconnectPlayer(socketId: string): Seat | null {
    for (let i = 0; i < 4; i++) {
      const s = this.slots[i];
      if (s && s.socketId === socketId && !s.isBot) {
        s.connected = false;
        s.socketId = null;
        if (this.game) {
          const p = this.game.players[i as Seat];
          if (p) p.connected = false;
        }
        return i as Seat;
      }
    }
    return null;
  }

  /** Ayni isimle oyun/lobi devam ederken yeniden baglan. */
  reconnectPlayer(name: string, socketId: string): Seat | null {
    const trimmed = name.trim() || 'Oyuncu';
    for (let i = 0; i < 4; i++) {
      const s = this.slots[i];
      if (s && !s.isBot && !s.connected && s.name === trimmed) {
        s.connected = true;
        s.socketId = socketId;
        if (this.game) {
          const p = this.game.players[i as Seat];
          if (p) p.connected = true;
        }
        return i as Seat;
      }
    }
    return null;
  }

  isEmpty(): boolean {
    return this.slots.every((s) => s === null || s.isBot);
  }

  allReady(): boolean {
    const occupied = this.slots.filter((s): s is Slot => s !== null);
    return occupied.length === 4 && occupied.every((s) => s.ready);
  }

  toView(forSeat: Seat | null): RoomView {
    const players: PlayerView[] = [];
    for (let i = 0; i < 4; i++) {
      const s = this.slots[i];
      const seat = i as Seat;
      players.push({
        seat,
        team: teamOf(seat),
        name: s ? s.name : '(bos)',
        isBot: s ? s.isBot : false,
        connected: s ? s.connected : false,
        ready: s ? s.ready : false,
      });
    }
    return {
      code: this.code,
      status: this.status,
      players,
      yourSeat: forSeat,
      finalResult: this.finalResult,
    };
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  getOrCreate(code?: string): Room {
    if (code) {
      const existing = this.rooms.get(code);
      if (existing) return existing;
      const room = new Room(code);
      this.rooms.set(code, room);
      return room;
    }
    let newCode = genCode();
    while (this.rooms.has(newCode)) newCode = genCode();
    const room = new Room(newCode);
    this.rooms.set(newCode, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }
}
