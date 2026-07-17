import type { Card, MeldType, Rank, Suit } from '../shared/types.js';

export interface MeldOk {
  ok: true;
  type: MeldType;
  points: number;
}
export interface MeldErr {
  ok: false;
  error: string;
}
export type MeldResult = MeldOk | MeldErr;

const RANK_SEQ: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
};

// Sira degerinden puan: A=11, resimli=10, rakam kendi degeri.
export function seqPoints(seq: number): number {
  if (seq === 14) return 11; // A
  if (seq >= 11 && seq <= 13) return 10; // J,Q,K
  return seq; // 2..10
}

export function rankPoints(rank: Rank): number {
  return seqPoints(RANK_SEQ[rank]);
}

const MIN_LEN = 3;
const MAX_LEN = 5;

// Sirali per: verilen SIRA (soldan saga) uzerinden dogrula.
// Joker, bulundugu konumun sira degerini temsil eder.
function validateRun(cards: Card[]): MeldResult {
  if (cards.length < MIN_LEN) return { ok: false, error: 'Per en az 3 kağıt olmalı.' };
  if (cards.length > MAX_LEN) return { ok: false, error: 'Per en fazla 5 kağıt olabilir.' };

  const anchorIdx = cards.findIndex((c) => !c.isJoker);
  if (anchorIdx === -1) return { ok: false, error: 'Perde en az bir gerçek kağıt gerekli.' };

  const suit = cards[anchorIdx].suit;
  const anchorSeq = RANK_SEQ[cards[anchorIdx].rank as Rank];

  let points = 0;
  const seenSeq = new Set<number>();
  for (let i = 0; i < cards.length; i++) {
    const seq = anchorSeq + (i - anchorIdx);
    if (seq < 2 || seq > 14) return { ok: false, error: 'Sıralı per aralık dışı (A yalnızca en üstte).' };
    if (seenSeq.has(seq)) return { ok: false, error: 'Sıralı perde tekrar olamaz.' };
    seenSeq.add(seq);

    const c = cards[i];
    if (!c.isJoker) {
      if (c.suit !== suit) return { ok: false, error: 'Sıralı per aynı seriden olmalı.' };
      if (RANK_SEQ[c.rank as Rank] !== seq)
        return { ok: false, error: 'Kağıtlar sıralı değil.' };
    }
    points += seqPoints(seq);
  }
  return { ok: true, type: 'run', points };
}

// Erkek per: ayni sayidan farkli serilerden (joker o sayiyi temsil eder).
function validateGroup(cards: Card[]): MeldResult {
  if (cards.length < MIN_LEN) return { ok: false, error: 'Per en az 3 kağıt olmalı.' };
  if (cards.length > 4) return { ok: false, error: 'Erkek per en fazla 4 kağıt olabilir.' };

  const reals = cards.filter((c) => !c.isJoker);
  if (reals.length === 0) return { ok: false, error: 'Perde en az bir gerçek kağıt gerekli.' };

  const rank = reals[0].rank as Rank;
  const suits = new Set<string>();
  for (const c of reals) {
    if (c.rank !== rank) return { ok: false, error: 'Erkek per aynı sayıdan olmalı.' };
    if (c.suit && suits.has(c.suit))
      return { ok: false, error: 'Erkek perde aynı seri iki kez olamaz.' };
    if (c.suit) suits.add(c.suit);
  }
  const points = cards.length * rankPoints(rank);
  return { ok: true, type: 'group', points };
}

export function validateMeld(type: MeldType, cards: Card[]): MeldResult {
  return type === 'run' ? validateRun(cards) : validateGroup(cards);
}

/** Sirali per kagitlarini soldan saga diz (joker araligi doldurur). */
export function buildRunOrder(cards: Card[]): Card[] | null {
  const reals = cards.filter((c) => !c.isJoker);
  const jokerList = cards.filter((c) => c.isJoker);
  let jokers = jokerList.length;
  if (reals.length === 0) return null;

  const suit = reals[0].suit;
  if (!reals.every((c) => c.suit === suit)) return null;

  const seqs = reals.map((c) => RANK_SEQ[c.rank as Rank]);
  if (new Set(seqs).size !== seqs.length) return null;

  const min = Math.min(...seqs);
  const max = Math.max(...seqs);
  const span = max - min + 1;
  const interiorGaps = span - reals.length;
  if (interiorGaps < 0 || interiorGaps > jokers) return null;

  let extra = jokers - interiorGaps;
  let start = min;
  let end = max;
  const up = Math.min(extra, 14 - end);
  end += up;
  extra -= up;
  const down = Math.min(extra, start - 2);
  start -= down;
  extra -= down;
  if (extra > 0) return null;

  const len = end - start + 1;
  if (len < MIN_LEN || len > MAX_LEN) return null;

  const bySeq = new Map<number, Card>();
  reals.forEach((c) => bySeq.set(RANK_SEQ[c.rank as Rank], c));

  let ji = 0;
  const ordered: Card[] = [];
  for (let s = start; s <= end; s++) {
    const real = bySeq.get(s);
    if (real) ordered.push(real);
    else ordered.push(jokerList[ji++]);
  }
  return ordered;
}

/** Çiftte joker veya taban (fiziksel kart ya da ayni suit+rank kopyasi) wild sayilir. */
export function isPairWild(c: Card, taban: Card): boolean {
  if (c.isJoker) return true;
  if (c.id === taban.id) return true;
  if (
    !taban.isJoker &&
    taban.suit &&
    taban.rank &&
    c.suit === taban.suit &&
    c.rank === taban.rank
  ) {
    return true;
  }
  return false;
}

/** Atik veya eldeki kart tabanin kendisi ya da ayni suit+rank kopyasi mi. */
export function isTabanLikeCard(c: Card, taban: Card): boolean {
  if (c.id === taban.id) return true;
  if (
    !taban.isJoker &&
    taban.suit &&
    taban.rank &&
    c.suit === taban.suit &&
    c.rank === taban.rank
  ) {
    return true;
  }
  return false;
}

/** Atik ustundeki kart eldeki bir kartla cift olusturabilir mi. */
export function discardHelpsPairs(hand: Card[], card: Card, taban: Card): boolean {
  for (const c of hand) {
    if (validatePair(c, card, taban).ok) return true;
  }
  return false;
}

/**
 * Ciftci icin atik alma: yalnizca birebir ikiz tamamlar (ayni suit+rank, farkli kopya).
 * Elde joker/taban varken her atigi "ise yarar" sayma hatasini onler.
 */
export function discardHelpsCiftciPairs(hand: Card[], card: Card, taban: Card): boolean {
  if (card.isJoker || isTabanLikeCard(card, taban)) return false;
  if (!card.suit || !card.rank) return false;
  for (const c of hand) {
    if (c.id === card.id) continue;
    if (isPairWild(c, taban)) continue;
    if (c.suit === card.suit && c.rank === card.rank) return true;
  }
  return false;
}

// Cift: birebir ayni iki kart (kirmizi+mavi), veya biri joker/taban (wild).
export function validatePair(
  a: Card,
  b: Card,
  taban: Card
): { ok: true } | { ok: false; error: string } {
  if (a.id === b.id) return { ok: false, error: 'Aynı kağıt iki kez kullanılamaz.' };
  const aw = isPairWild(a, taban);
  const bw = isPairWild(b, taban);
  if (aw && bw) return { ok: false, error: 'Çiftte iki wild olamaz.' };
  if (!aw && !bw) {
    if (a.suit === b.suit && a.rank === b.rank) return { ok: true };
    return { ok: false, error: 'Çift birebir aynı kağıt olmalı.' };
  }
  // biri wild, digeri gercek -> gecerli
  return { ok: true };
}

// Sirali perde jokerin temsil ettigi kart.
export function resolveJokerInRun(
  cards: Card[],
  jokerIdx: number
): { suit: Suit; rank: Rank } | null {
  const anchorIdx = cards.findIndex((c) => !c.isJoker);
  if (anchorIdx === -1) return null;
  const suit = cards[anchorIdx].suit as Suit;
  const anchorSeq = RANK_SEQ[cards[anchorIdx].rank as Rank];
  const seq = anchorSeq + (jokerIdx - anchorIdx);
  if (seq < 2 || seq > 14) return null;
  const rank = Object.entries(RANK_SEQ).find(([, v]) => v === seq)?.[0] as Rank | undefined;
  if (!rank) return null;
  return { suit, rank };
}

// Erkek perde jokerin temsil ettigi kart (eksik seri).
export function resolveJokerInGroup(cards: Card[]): { suit: Suit; rank: Rank } | null {
  const reals = cards.filter((c) => !c.isJoker);
  if (reals.length === 0) return null;
  const rank = reals[0].rank as Rank;
  const usedSuits = new Set(reals.map((c) => c.suit).filter(Boolean));
  const allSuits: Suit[] = ['H', 'D', 'C', 'S'];
  const missing = allSuits.find((s) => !usedSuits.has(s));
  if (!missing) return null;
  return { suit: missing, rank };
}

// Ciftte wild (joker/taban) yerine gecmesi gereken birebir kart.
export function resolveWildInPair(
  pair: Card[],
  taban: Card
): { suit: Suit; rank: Rank } | null {
  // Joker varsa diger kart gercek kopyadir (taban ile ayni rank/suit olsa bile).
  const anchor = pair.find((c) => !c.isJoker && c.suit && c.rank);
  if (anchor) return { suit: anchor.suit!, rank: anchor.rank! };
  const real = pair.find((c) => !isPairWild(c, taban));
  if (!real?.suit || !real?.rank) return null;
  return { suit: real.suit, rank: real.rank };
}

export function findWildIndex(pair: Card[], taban: Card): number {
  const jokerIdx = pair.findIndex((c) => c.isJoker);
  if (jokerIdx !== -1) return jokerIdx;
  return pair.findIndex((c) => c.id === taban.id);
}
