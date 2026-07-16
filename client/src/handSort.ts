import type { Card, Rank, Suit } from './types';

export type SortMode = 'none' | 'per' | 'cift';

// Per dizilisi icin sira degeri: 2 en kucuk ... A en buyuk (A yalnizca ustte).
const RANK_SEQ: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
};
const SUIT_ORDER: Record<Suit, number> = { H: 0, D: 1, C: 2, S: 3 };

function seq(c: Card): number {
  return c.rank ? RANK_SEQ[c.rank] : 99;
}
function suitOrd(c: Card): number {
  return c.suit ? SUIT_ORDER[c.suit] : 9;
}

// Pere gore: seriye gore (kupa-karo-sinek-maca), her seride 2..A. Jokerler sona.
function sortPer(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.isJoker !== b.isJoker) return a.isJoker ? 1 : -1;
    if (a.isJoker && b.isJoker) return 0;
    if (suitOrd(a) !== suitOrd(b)) return suitOrd(a) - suitOrd(b);
    return seq(a) - seq(b);
  });
}

// Cifte gore: ayni kart (ayni sayi+seri) iki kopyasi yan yana. Once sayi, sonra seri.
function sortCift(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.isJoker !== b.isJoker) return a.isJoker ? 1 : -1;
    if (a.isJoker && b.isJoker) return 0;
    if (seq(a) !== seq(b)) return seq(a) - seq(b);
    if (suitOrd(a) !== suitOrd(b)) return suitOrd(a) - suitOrd(b);
    // ayni kart: kirmizi sirt once
    return a.back === b.back ? 0 : a.back === 'red' ? -1 : 1;
  });
}

export function arrangeHand(cards: Card[], mode: SortMode): Card[] {
  if (mode === 'per') return sortPer(cards);
  if (mode === 'cift') return sortCift(cards);
  return cards;
}
