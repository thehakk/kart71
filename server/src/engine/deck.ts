import type { Back, Card, Rank, Seat, Suit } from '../shared/types.js';
import { nextTurnSeat, prevTurnSeat } from './turn.js';

export const SUITS: Suit[] = ['H', 'D', 'C', 'S'];
export const RANKS: Rank[] = [
  'A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2',
];
export const BACKS: Back[] = ['red', 'blue'];

// Kart puani (acis/baraj, kafa ve elde kalan hesabi icin).
export function cardPoints(card: Card): number {
  if (card.isJoker) return 25; // elde kalirsa 25
  switch (card.rank) {
    case 'A':
      return 11;
    case 'K':
    case 'Q':
    case 'J':
      return 10;
    default:
      return Number(card.rank);
  }
}

// 106 kart: her sirt icin 52 + her sirt icin 1 joker.
export function buildDeck(): Card[] {
  const cards: Card[] = [];
  for (const back of BACKS) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ id: `${suit}${rank}-${back}`, suit, rank, back, isJoker: false });
      }
    }
    cards.push({ id: `JOKER-${back}`, suit: null, rank: null, back, isJoker: true });
  }
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Kesme: kesme noktasindaki kart joker ise kesen oyuncunun olur.
function cut(deck: Card[]): { deck: Card[]; cutterJoker: Card | null } {
  const idx = 1 + Math.floor(Math.random() * (deck.length - 1));
  const cutCard = deck[idx];
  let working = deck;
  let cutterJoker: Card | null = null;
  if (cutCard.isJoker) {
    cutterJoker = cutCard;
    working = [...deck.slice(0, idx), ...deck.slice(idx + 1)];
  }
  const rotated = [...working.slice(idx), ...working.slice(0, idx)];
  return { deck: rotated, cutterJoker };
}

function removeRandomNonJoker(deck: Card[]): { card: Card; rest: Card[] } {
  const candidates = deck.filter((c) => !c.isJoker);
  const pool = candidates.length > 0 ? candidates : deck;
  const idx = Math.floor(Math.random() * pool.length);
  const card = pool[idx];
  const rest = deck.filter((c) => c.id !== card.id);
  return { card, rest };
}

export interface DealResult {
  hands: Card[][]; // seat -> el (index 0..3)
  drawPile: Card[]; // index 0 = ust (siradaki cekilecek)
  taban: Card; // yere acilan gosterge; destede/elde dolasMAZ
  discardTop: Card; // yere acilan ilk kart
  cutterSeat: Seat;
  starterSeat: Seat;
  cutterJoker: Card | null;
}

// Dagitandan bir onundeki (CCW) keser; dagitandan sonraki (CCW) baslar.
export function createDeal(dealerSeat: Seat): DealResult {
  const cutterSeat = prevTurnSeat(dealerSeat);
  const starterSeat = nextTurnSeat(dealerSeat);

  const { deck: afterCut, cutterJoker } = cut(shuffle(buildDeck()));

  // Taban: yere acilir; fiziksel kart desteden cikarilir (esinin tek kopyasi oyun icinde kalir).
  const { card: taban, rest } = removeRandomNonJoker(afterCut);

  // Hedef kart sayilari: herkes 14; kesen joker aldiysa 13 (+joker = 14).
  const targets: number[] = [14, 14, 14, 14];
  if (cutterJoker) targets[cutterSeat] = 13;

  const hands: Card[][] = [[], [], [], []];
  if (cutterJoker) hands[cutterSeat].push(cutterJoker);

  const remaining = targets.slice();
  let deckCursor = 0;
  // 2'ser 2'ser, baslayan oyuncudan itibaren (saat yonunun tersi).
  let anyLeft = true;
  while (anyLeft) {
    anyLeft = false;
    for (let k = 0; k < 4; k++) {
      const seat = ((starterSeat + 4 - k) % 4) as Seat;
      if (remaining[seat] > 0) {
        const take = Math.min(2, remaining[seat]);
        for (let t = 0; t < take; t++) {
          hands[seat].push(rest[deckCursor++]);
        }
        remaining[seat] -= take;
        if (remaining[seat] > 0) anyLeft = true;
      }
    }
  }

  const discardTop = rest[deckCursor++];
  const drawPile = rest.slice(deckCursor);

  return {
    hands,
    drawPile,
    taban,
    discardTop,
    cutterSeat,
    starterSeat,
    cutterJoker,
  };
}
