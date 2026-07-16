import type {
  Card,
  GamePhase,
  GameView,
  HandHistoryEntry,
  HandScoreResult,
  Meld,
  PendingDiscard,
  Seat,
  SeatPublic,
  Team,
} from '../shared/types.js';
import { createDeal } from './deck.js';

export type OpenType = 'none' | 'per' | 'cift';

export interface EnginePlayer {
  seat: Seat;
  team: Team;
  name: string;
  isBot: boolean;
  connected: boolean;
  hand: Card[];
  hasOpened: boolean;
  isCiftci: boolean;
  /** Sorarak alinan atik: per/cift/bitir yapilmadan atilirsa ciftci olunur. */
  receivedAskDiscard: boolean;
  openedValue: number;
  openType: OpenType;
  pairs: Card[][]; // acilan ciftler
  /** Per acip en az bir kez isleme yapti (islek cezasi muafiyeti). */
  hasProcessed: boolean;
  /** Bu tur destenin son kartini cekti (deste bitti atisinda islek muafiyeti). */
  emptiedDeckThisTurn: boolean;
}

export interface GameState {
  code: string;
  handNumber: number;
  dealerSeat: Seat;
  starterSeat: Seat;
  cutterSeat: Seat;
  cutterJokerTaken: boolean;
  turnSeat: Seat;
  phase: GamePhase;
  players: EnginePlayer[]; // index = seat
  drawPile: Card[]; // 0 = ust (siradaki cekilecek)
  taban: Card; // yere acilan gosterge; cekilemez / elde dolasMAZ
  discardPile: Card[]; // son eleman = en ust (gorunur)
  perBaraj: 71 | 101;
  melds: Meld[];
  lastOpenerValue: number;
  lastPairCount: number; // son ciftle acilis (tek hamle) cift sayisi; indirilenler artirmaz
  pending: PendingDiscard | null;
  takeBlocked: boolean; // reddedilen atik bu tur tekrar alinamaz
  discardsMade: number; // oynanan atim sayisi (0 => yerdeki ilk acik kart)
  lastDiscarderSeat: Seat | null; // atik ustunu atan oyuncu (atiktaki kart icin)
  islekPenalty: [number, number]; // islek atis cezasi biriktirici (+71 / atis)
  islekEventId: number;
  lastIslekSeat: Seat | null;
  handResult: HandScoreResult | null; // el bittiginde puan ozeti (M6)
  /** El bittiginde oyuncularin son elleri (bitenin eli dahil). */
  endSnapshot: [Card[], Card[], Card[], Card[]] | null;
  teamScores: [number, number];
  handHistory: HandHistoryEntry[]; // tamamlanan el kayitlari (M7)
}

/** Oyuncu bu elde per/cift acmis mi (masadaki perler dahil). */
export function playerHasOpened(
  p: EnginePlayer,
  state: GameState
): boolean {
  return (
    p.hasOpened ||
    p.pairs.length > 0 ||
    state.melds.some((m) => m.ownerSeat === p.seat)
  );
}

/** Masada gorunen en yuksek cift sayisi (acilis + indirilenler). */
export function maxPairsOnTable(state: GameState): number {
  return state.players.reduce((max, p) => Math.max(max, p.pairs.length), 0);
}

/** Masada per/cift acilisi var mi — varsa elden bitis mumkun degil, baraj gerekir. */
export function anyoneOpened(state: GameState): boolean {
  if (state.melds.length > 0) return true;
  return state.players.some((p) => p.hasOpened || p.pairs.length > 0);
}

/** Elden bitis: masada acilis yok; 71/101 baraji aranmaz (TASARIM §8.1). */
export function eldenFinishAllowed(state: GameState): boolean {
  return !anyoneOpened(state);
}

/** Masada ciftci veya cift acilisi varsa per baraji 101 olur. */
export function syncPerBaraj(state: GameState): void {
  const raised =
    state.players.some((p) => p.isCiftci) ||
    state.players.some((p) => p.pairs.length > 0 || p.openType === 'cift');
  if (raised) state.perBaraj = 101;
}

/** Perle acmak icin gereken min puan (yalnizca ilk acilis escalation; indirilen perler dahil degil). */
export function requiredOpenForGame(state: GameState): number {
  syncPerBaraj(state);
  return Math.max(state.perBaraj, state.lastOpenerValue + 1);
}

/** Ciftle acmak icin gereken min cift: son acilis+1 VE masadaki max cift (indirilen dahil). */
export function requiredPairsForGame(state: GameState): number {
  return Math.max(5, state.lastPairCount + 1, maxPairsOnTable(state));
}

export interface SeatMeta {
  name: string;
  isBot: boolean;
  connected: boolean;
}

function teamOf(seat: Seat): Team {
  return (seat % 2) as Team;
}

export function createGameState(
  code: string,
  seats: SeatMeta[], // index = seat (0..3)
  dealerSeat: Seat,
  handNumber: number,
  teamScores: [number, number],
  handHistory: HandHistoryEntry[] = []
): GameState {
  const deal = createDeal(dealerSeat);

  const players: EnginePlayer[] = ([0, 1, 2, 3] as Seat[]).map((seat) => ({
    seat,
    team: teamOf(seat),
    name: seats[seat]?.name ?? `Oyuncu ${seat + 1}`,
    isBot: seats[seat]?.isBot ?? true,
    connected: seats[seat]?.connected ?? false,
    hand: deal.hands[seat],
    hasOpened: false,
    isCiftci: false,
    receivedAskDiscard: false,
    openedValue: 0,
    openType: 'none',
    pairs: [],
    hasProcessed: false,
    emptiedDeckThisTurn: false,
  }));

  return {
    code,
    handNumber,
    dealerSeat,
    starterSeat: deal.starterSeat,
    cutterSeat: deal.cutterSeat,
    cutterJokerTaken: deal.cutterJoker != null,
    turnSeat: deal.starterSeat,
    phase: 'draw',
    players,
    drawPile: deal.drawPile,
    taban: deal.taban,
    discardPile: [deal.discardTop],
    perBaraj: 71,
    melds: [],
    lastOpenerValue: 0,
    lastPairCount: 0,
    pending: null,
    takeBlocked: false,
    discardsMade: 0,
    lastDiscarderSeat: null,
    islekPenalty: [0, 0],
    islekEventId: 0,
    lastIslekSeat: null,
    handResult: null,
    endSnapshot: null,
    teamScores,
    handHistory,
  };
}

export function toSeatPublic(p: EnginePlayer, state: GameState): SeatPublic {
  const hasOpenedOnTable =
    p.hasOpened ||
    p.pairs.length > 0 ||
    state.melds.some((m) => m.ownerSeat === p.seat);

  return {
    seat: p.seat,
    team: p.team,
    name: p.name,
    isBot: p.isBot,
    connected: p.connected,
    handCount: p.hand.length,
    backs: p.hand.map((c) => c.back),
    hasOpened: hasOpenedOnTable,
    isCiftci: p.isCiftci,
    openType: hasOpenedOnTable ? p.openType : 'none',
    openedValue: p.openedValue,
    pairCount: p.pairs.length,
    pairs: p.pairs,
  };
}

// Bir oyuncu tum atiklari gorebilir mi? (kendisi ciftci ise; ya da iki takimda da ciftci varsa)
function canSeeAllDiscards(state: GameState, seat: Seat): boolean {
  const self = state.players[seat];
  if (self.isCiftci) return true;
  const team0HasCiftci = state.players.some((p) => p.team === 0 && p.isCiftci);
  const team1HasCiftci = state.players.some((p) => p.team === 1 && p.isCiftci);
  return team0HasCiftci && team1HasCiftci;
}

export function toGameView(state: GameState, forSeat: Seat): GameView {
  syncPerBaraj(state);
  const discardTop =
    state.discardPile.length > 0
      ? state.discardPile[state.discardPile.length - 1]
      : null;

  return {
    code: state.code,
    handNumber: state.handNumber,
    dealerSeat: state.dealerSeat,
    starterSeat: state.starterSeat,
    cutterSeat: state.cutterSeat,
    cutterJokerTaken: state.cutterJokerTaken,
    turnSeat: state.turnSeat,
    phase: state.phase,
    seats: state.players.map((p) => toSeatPublic(p, state)),
    yourSeat: forSeat,
    yourHand: state.players[forSeat]?.hand ?? [],
    drawCount: state.drawPile.length,
    drawTopBack: state.drawPile[0]?.back ?? null,
    discardTop,
    discardCount: state.discardPile.length,
    discardsMade: state.discardsMade,
    visibleDiscards: canSeeAllDiscards(state, forSeat)
      ? [...state.discardPile]
      : null,
    bothTeamsCiftci:
      state.players.some((p) => p.team === 0 && p.isCiftci) &&
      state.players.some((p) => p.team === 1 && p.isCiftci),
    taban: state.taban,
    eldenFinishAllowed: eldenFinishAllowed(state),
    perBaraj: state.perBaraj,
    requiredOpen: requiredOpenForGame(state),
    requiredPairs: requiredPairsForGame(state),
    melds: state.melds,
    lastOpenerValue: state.lastOpenerValue,
    pending: state.pending,
    islekPenalty: state.islekPenalty,
    islekEventId: state.islekEventId,
    lastIslekSeat: state.lastIslekSeat,
    handResult: state.handResult,
    endSnapshot: state.phase === 'ended' ? state.endSnapshot : null,
    teamScores: state.teamScores,
    handHistory: state.handHistory,
  };
}
