// Sunucu ile paylasilan gorunum/event tipleri (M0 icin ilgili alt kume).
// Ileride ortak bir pakete tasinabilir.

export type Seat = 0 | 1 | 2 | 3;
export type Team = 0 | 1;
export type RoomStatus = 'lobby' | 'in_game' | 'finished';

export type Suit = 'H' | 'D' | 'C' | 'S';
export type Rank =
  | 'A' | 'K' | 'Q' | 'J'
  | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
export type Back = 'red' | 'blue';

export interface Card {
  id: string;
  suit: Suit | null;
  rank: Rank | null;
  back: Back;
  isJoker: boolean;
}

export type GamePhase = 'draw' | 'action' | 'discard' | 'await' | 'ended';

export type MeldType = 'run' | 'group';

export interface PendingDiscard {
  askerSeat: Seat;
  discarderSeat: Seat;
  card: Card;
}

export interface Meld {
  id: string;
  type: MeldType;
  cards: Card[];
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
  winnerTeam: Team | null;
  teamDelta: [number, number];
  rawTotals: [number, number];
  penaltyTeam: Team | null;
  penaltyAmount: number;
  breakdown: [TeamHandBreakdown, TeamHandBreakdown];
  finishInfo?: FinishInfo;
  playerPenalties?: PlayerPenaltyLine[];
  noScoringReason?: 'no_open_no_ciftci' | 'equal_totals';
}

export interface HandHistoryEntry {
  handNumber: number;
  reason: 'finish' | 'deck_empty';
  teamDelta: [number, number];
  rawTotals: [number, number];
  penaltyTeam: Team | null;
  penaltyAmount: number;
  teamScoresAfter: [number, number];
}

export interface GameFinalResult {
  teamScores: [number, number];
  winnerTeam: Team | null;
  handHistory: HandHistoryEntry[];
}

export interface SeatPublic {
  seat: Seat;
  team: Team;
  name: string;
  isBot: boolean;
  connected: boolean;
  handCount: number;
  backs: Back[];
  hasOpened: boolean;
  isCiftci: boolean;
  openType: 'none' | 'per' | 'cift';
  openedValue: number;
  pairCount: number;
  pairs: Card[][];
}

export interface GameView {
  code: string;
  handNumber: number;
  dealerSeat: Seat;
  starterSeat: Seat;
  cutterSeat: Seat;
  cutterJokerTaken: boolean;
  turnSeat: Seat;
  phase: GamePhase;
  seats: SeatPublic[];
  yourSeat: Seat;
  yourHand: Card[];
  drawCount: number;
  drawTopBack: Back | null;
  discardTop: Card | null;
  discardCount: number;
  discardsMade: number;
  discardAskable?: boolean;
  discardTakeable?: boolean;
  takeBlocked?: boolean;
  visibleDiscards: Card[] | null;
  bothTeamsCiftci: boolean;
  taban: Card;
  /** Masada açılış yoksa true — elden bitiş, baraj aranmaz. */
  eldenFinishAllowed: boolean;
  perBaraj: 71 | 101;
  requiredOpen: number;
  requiredPairs: number;
  melds: Meld[];
  lastOpenerValue: number;
  pending: PendingDiscard | null;
  islekPenalty: [number, number];
  islekEventId: number;
  lastIslekSeat: Seat | null;
  handResult: HandScoreResult | null;
  endSnapshot: [Card[], Card[], Card[], Card[]] | null;
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

export interface PlayerView {
  seat: Seat;
  team: Team;
  name: string;
  isBot: boolean;
  connected: boolean;
  ready: boolean;
}

export interface RoomView {
  code: string;
  status: RoomStatus;
  players: PlayerView[];
  yourSeat: Seat | null;
  finalResult: GameFinalResult | null;
}

export interface ServerToClientEvents {
  'room:update': (view: RoomView) => void;
  'game:update': (view: GameView) => void;
  error: (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (
    payload: { code?: string; name: string },
    ack: (
      res: { ok: true; code: string; seat: Seat } | { ok: false; error: string }
    ) => void
  ) => void;
  'room:ready': (payload: { ready: boolean }) => void;
  'room:fillBots': () => void;
  'room:pickSeat': (payload: { seat: Seat }) => void;
  'room:shuffleTeams': () => void;
  'room:leave': () => void;
  'turn:drawPile': () => void;
  'turn:takeDiscard': (payload: { ask: boolean }) => void;
  'turn:declareCiftci': () => void;
  'turn:discard': (payload: { cardId: string }) => void;
  'meld:open': (payload: { melds: { type: MeldType; cardIds: string[] }[] }) => void;
  'meld:lay': (payload: { melds: { type: MeldType; cardIds: string[] }[] }) => void;
  'meld:layPairs': (payload: { pairs: string[][] }) => void;
  'meld:openPairs': (payload: { pairs: string[][] }) => void;
  'discard:respond': (payload: { give: boolean }) => void;
  'meld:processHand': (payload: {
    meldId: string;
    cardId?: string;
    cardIds?: string[];
    ops?: { meldId: string; cardId: string }[];
  }) => void;
  'meld:processDiscard': (payload: { meldId: string }) => void;
  'meld:swapJoker': (payload: { meldId: string; cardId: string }) => void;
  'meld:swapJokerPair': (payload: { ownerSeat: Seat; pairIndex: number; cardId: string }) => void;
  'meld:swapWildFromDiscard': (payload: { ownerSeat: Seat; pairIndex: number }) => void;
  'meld:finish': (payload: {
    melds?: { type: MeldType; cardIds: string[] }[];
    pairs?: string[][];
    discardCardId?: string;
    auto?: boolean;
  }) => void;
  'game:continue': () => void;
  'room:playAgain': () => void;
}
