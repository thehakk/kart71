import type { Card, MeldType, Rank } from './types';

const RANK_SEQ: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
};

export function seqPoints(seq: number): number {
  if (seq === 14) return 11;
  if (seq >= 11 && seq <= 13) return 10;
  return seq;
}
export function rankPoints(rank: Rank): number {
  return seqPoints(RANK_SEQ[rank]);
}

// Sirali per icin kagitlari soldan saga dizmeye calis (joker bosluklari doldurur).
// Basarisizsa null.
export function buildRunOrder(cards: Card[]): Card[] | null {
  const reals = cards.filter((c) => !c.isJoker);
  const jokerList = cards.filter((c) => c.isJoker).sort((a, b) => a.id.localeCompare(b.id));
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
  if (len < 3 || len > 5) return null;

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

export interface BuiltMeld {
  type: MeldType;
  cards: Card[]; // sirali
  points: number;
}

// Secilen kagitlardan per turunu otomatik algila (once sirali, sonra erkek).
export function buildMeld(
  type: MeldType,
  selected: Card[]
): BuiltMeld | { error: string } {
  if (selected.length < 3) return { error: 'Per en az 3 kağıt olmalı.' };

  if (type === 'run') {
    if (selected.length > 5) return { error: 'Sıralı per en fazla 5 kağıt.' };
    const ordered = buildRunOrder(selected);
    if (!ordered) return { error: 'Geçerli bir sıralı per oluşmuyor.' };
    let points = 0;
    const reals = ordered.filter((c) => !c.isJoker);
    const anchorIdx = ordered.findIndex((c) => !c.isJoker);
    const anchorSeq = RANK_SEQ[reals[0].rank as Rank];
    for (let i = 0; i < ordered.length; i++) {
      points += seqPoints(anchorSeq + (i - anchorIdx));
    }
    return { type, cards: ordered, points };
  }

  // group (erkek per)
  if (selected.length > 4) return { error: 'Erkek per en fazla 4 kağıt.' };
  const reals = selected.filter((c) => !c.isJoker);
  if (reals.length === 0) return { error: 'Perde gerçek kağıt gerekli.' };
  const rank = reals[0].rank as Rank;
  if (!reals.every((c) => c.rank === rank))
    return { error: 'Erkek per aynı sayıdan olmalı.' };
  const suits = reals.map((c) => c.suit);
  if (new Set(suits).size !== suits.length)
    return { error: 'Erkek perde aynı seri iki kez olamaz.' };
  const points = selected.length * rankPoints(rank);
  return { type, cards: selected, points };
}

export function detectAndBuildMeld(
  selected: Card[]
): BuiltMeld | { error: string } {
  if (selected.length < 3) return { error: 'Per en az 3 kağıt olmalı.' };
  const run = buildMeld('run', selected);
  if (!('error' in run)) return run;
  const group = buildMeld('group', selected);
  if (!('error' in group)) return group;
  return { error: 'Seçilen kağıtlar geçerli bir per oluşturmuyor.' };
}

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

export function validatePair(
  a: Card,
  b: Card,
  taban: Card
): { ok: true } | { ok: false; error: string } {
  if (a.id === b.id) return { ok: false, error: 'Aynı kağıt iki kez kullanılamaz.' };
  const aw = isPairWild(a, taban);
  const bw = isPairWild(b, taban);
  if (aw && bw) return { ok: false, error: 'Çiftte iki wild olamaz.' };
  if (!aw && !bw && !(a.suit === b.suit && a.rank === b.rank)) {
    return { ok: false, error: 'Çift birebir aynı kağıt olmalı.' };
  }
  return { ok: true };
}

export function validateMeld(
  type: MeldType,
  cards: Card[]
): { ok: true; type: MeldType; points: number } | { ok: false; error: string } {
  const built = buildMeld(type, cards);
  if ('error' in built) return { ok: false, error: built.error };
  return { ok: true, type: built.type, points: built.points };
}
