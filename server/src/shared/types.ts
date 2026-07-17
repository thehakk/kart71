// Kart 71 - paylasilan tip tanimlari (domain + socket sozlesmeleri)
// Not: M0 iskeleti. Oyun motoru tipleri sonraki milestone'larda genisleyecek.

export type Suit = 'H' | 'D' | 'C' | 'S'; // Kupa Karo Sinek Maca
export type Rank =
  | 'A' | 'K' | 'Q' | 'J'
  | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
export type Back = 'red' | 'blue';

export interface Card {
  id: string; // benzersiz, or. "H7-red" / "JOKER-red"
  suit: Suit | null; // joker ise null
  rank: Rank | null; // joker ise null
  back: Back;
  isJoker: boolean;
}

export type Seat = 0 | 1 | 2 | 3;
export type Team = 0 | 1; // 0-2 => takim 0, 1-3 => takim 1

export interface PlayerView {
  seat: Seat;
  team: Team;
  name: string;
  isBot: boolean;
  connected: boolean;
  ready: boolean;
}

export type RoomStatus = 'lobby' | 'in_game' | 'finished';

// ---- Oyun (M1) gorunum tipleri ----

// Bir oyuncunun herkese acik bilgisi (el sayisi vb.)
export interface SeatPublic {
  seat: Seat;
  team: Team;
  name: string;
  isBot: boolean;
  connected: boolean;
  handCount: number;
  backs: Back[]; // her kartin gercek sirt rengi (yuz gizli)
  hasOpened: boolean;
  isCiftci: boolean;
  openType: 'none' | 'per' | 'cift';
  openedValue: number;
  pairCount: number;
  pairs: Card[][]; // masaya acilan ciftler (herkese acik)
}

// 'await' = birinden atik istegi bekleniyor
export type GamePhase = 'draw' | 'action' | 'discard' | 'await' | 'ended';

export interface PendingDiscard {
  askerSeat: Seat;
  discarderSeat: Seat;
  card: Card;
}

export type MeldType = 'run' | 'group'; // sirali per | erkek per

export interface Meld {
  id: string;
  type: MeldType;
  cards: Card[]; // soldan saga sirali (joker temsil ettigi konumda)
  ownerSeat: Seat;
  points: number;
}

export type FinishType = 'elden' | 'per' | 'cift';

export interface FinishInfo {
  winnerSeat: Seat;
  finishType: FinishType;
  eldenFinish: boolean;
  ciftFinish: boolean;
  jokerDiscard: boolean;
  finisherOpenValue: number;
  finisherPairCount: number;
}

export interface TeamHandBreakdown {
  team: Team;
  base: number;
  multiplier: number;
  kafa: number;
  islek: number;
  total: number;
}

export interface PlayerPenaltyLine {
  seat: Seat;
  team: Team;
  name: string;
  isCiftci: boolean;
  hasOpened: boolean;
  penalty: number;
}

export interface HandScoreResult {
  reason: 'finish' | 'deck_empty';
  winnerTeam: Team | null; // eli kazanan (dusuk ceza / bitiren)
  teamDelta: [number, number]; // skora yazilan fark cezasi
  rawTotals: [number, number]; // arka plan: her takimin ham el cezasi
  penaltyTeam: Team | null; // fark cezasini alan takim
  penaltyAmount: number; // yazilan fark
  breakdown: [TeamHandBreakdown, TeamHandBreakdown];
  finishInfo?: FinishInfo;
  playerPenalties?: PlayerPenaltyLine[];
  noScoringReason?: 'no_open_no_ciftci' | 'equal_totals';
}

/** Tamamlanan el ozeti (M7 skor tablosu). */
export interface HandHistoryEntry {
  handNumber: number;
  reason: 'finish' | 'deck_empty';
  teamDelta: [number, number];
  rawTotals: [number, number];
  penaltyTeam: Team | null;
  penaltyAmount: number;
  teamScoresAfter: [number, number];
}

/** 13 el sonunda oyun ozeti. */
export interface GameFinalResult {
  teamScores: [number, number];
  winnerTeam: Team | null;
  handHistory: HandHistoryEntry[];
}

// Sunucunun her oyuncuya ozel gonderdigi oyun gorunumu
export interface GameView {
  code: string;
  handNumber: number; // 1..13
  dealerSeat: Seat;
  starterSeat: Seat;
  cutterSeat: Seat;
  cutterJokerTaken: boolean;
  turnSeat: Seat;
  phase: GamePhase;
  seats: SeatPublic[];
  yourSeat: Seat;
  yourHand: Card[]; // yalnizca sahibine
  drawCount: number;
  drawTopBack: Back | null; // destenin ust kartinin gercek sirti
  discardTop: Card | null;
  discardCount: number;
  discardsMade: number; // 0 = henuz ilk atim yok (acilis karti alinabilir)
  discardAskable?: boolean; // islek/joker/taban haric sorarak alinabilir
  discardTakeable?: boolean; // islek/joker/taban/deste-bitti haric atik alinabilir
  visibleDiscards: Card[] | null; // ciftci gorunurlugu: izinliyse tum atiklar
  bothTeamsCiftci: boolean; // iki takimda da ciftci varsa herkes gorur
  taban: Card; // yere acilan gosterge; cekilemez
  /** Masada acilis yoksa true — Bitir elden sayilir, baraj aranmaz. */
  eldenFinishAllowed: boolean;
  perBaraj: 71 | 101;
  requiredOpen: number; // perle acmak icin gereken min puan (baraj + escalation)
  requiredPairs: number; // ciftle acmak icin gereken min cift sayisi (5/6/7)
  melds: Meld[]; // masadaki acilmis perler
  lastOpenerValue: number; // escalation: son acan oyuncunun toplami
  pending: PendingDiscard | null; // bekleyen atik istegi
  islekPenalty: [number, number]; // islek atis cezasi biriktirici (+71 / atis)
  islekEventId: number;
  lastIslekSeat: Seat | null;
  handResult: HandScoreResult | null;
  /** El bittiğinde her oyuncunun son eli (bitenin eli dahil). */
  endSnapshot: [Card[], Card[], Card[], Card[]] | null;
  /** El bittiğinde sonraki ele geçiş için hazır durumu. */
  handContinue?: HandContinueView;
  teamScores: [number, number];
  handHistory: HandHistoryEntry[];
}

export interface HandContinuePlayer {
  seat: Seat;
  name: string;
  isBot: boolean;
  ready: boolean;
}

export interface HandContinueView {
  readyBySeat: [boolean, boolean, boolean, boolean];
  yourReady: boolean;
  allReady: boolean;
  players: HandContinuePlayer[];
}

// Oyuncuya gonderilen oda gorunumu (M0)
export interface RoomView {
  code: string;
  status: RoomStatus;
  players: PlayerView[]; // 4 slot (bos slotlar icin null yerine bot/placeholder)
  yourSeat: Seat | null;
  finalResult: GameFinalResult | null;
}

// ---- Socket.IO event sozlesmeleri ----

export interface ClientToServerEvents {
  'room:join': (
    payload: { code?: string; name: string },
    ack: (res: { ok: true; code: string; seat: Seat } | { ok: false; error: string }) => void
  ) => void;
  'room:ready': (payload: { ready: boolean }) => void;
  'room:fillBots': () => void; // bos slotlari bot ile doldur
  'room:pickSeat': (payload: { seat: Seat }) => void; // bos bir koltuga tasin (takim secimi)
  'room:shuffleTeams': () => void; // oturanlari koltuklara rastgele dagit
  'room:leave': () => void;
  // Tur aksiyonlari (M2)
  'turn:drawPile': () => void;
  'turn:takeDiscard': (payload: { ask: boolean }) => void; // ask=false => sormadan al (ciftci)
  'turn:declareCiftci': () => void; // ciftce git deklarasyonu (atik almadan ciftci)
  'turn:discard': (payload: { cardId: string }) => void;
  // Acma (M3)
  'meld:open': (payload: { melds: { type: MeldType; cardIds: string[] }[] }) => void;
  // Acildiktan sonra elden per indir
  'meld:lay': (payload: { melds: { type: MeldType; cardIds: string[] }[] }) => void;
  // Acildiktan sonra elden cift indir
  'meld:layPairs': (payload: { pairs: string[][] }) => void;
  // Cift acma (M4): her cift = 2 kart id
  'meld:openPairs': (payload: { pairs: string[][] }) => void;
  // Atik istegine yanit (M4)
  'discard:respond': (payload: { give: boolean }) => void;
  // Isleme (M5): elden pere kart ekle (tek veya toplu)
  'meld:processHand': (payload: {
    meldId: string;
    cardId?: string;
    cardIds?: string[];
    ops?: { meldId: string; cardId: string }[];
  }) => void;
  // Islek (M5): atik ustunu pere isle (atan takima +71)
  'meld:processDiscard': (payload: { meldId: string }) => void;
  // Joker el degistirme (M5)
  'meld:swapJoker': (payload: { meldId: string; cardId: string }) => void;
  'meld:swapJokerPair': (payload: { ownerSeat: Seat; pairIndex: number; cardId: string }) => void;
  'meld:swapWildFromDiscard': (payload: { ownerSeat: Seat; pairIndex: number }) => void;
  // Bitir (M6): kalan per/ciftleri indir + son karti at
  'meld:finish': (payload: {
    melds?: { type: MeldType; cardIds: string[] }[];
    pairs?: string[][];
    discardCardId?: string;
    auto?: boolean;
  }) => void;
  // Sonraki ele gec (M6/M7)
  'game:continue': () => void;
  // Lobiye don, yeni 13 el baslat (M7)
  'room:playAgain': () => void;
}

export interface ServerToClientEvents {
  'room:update': (view: RoomView) => void;
  'game:update': (view: GameView) => void;
  'error': (payload: { message: string }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  code?: string;
  seat?: Seat;
}
