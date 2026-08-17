import type { Card, MeldType, Rank, RunEnd, Suit } from './types';

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

const MIN_LEN = 3;
const MAX_LEN = 5;

function validateRunOrder(
  cards: Card[]
): { ok: true; points: number } | { ok: false } {
  if (cards.length < MIN_LEN || cards.length > MAX_LEN) return { ok: false };
  const anchorIdx = cards.findIndex((c) => !c.isJoker);
  if (anchorIdx === -1) return { ok: false };
  const suit = cards[anchorIdx].suit;
  const anchorSeq = RANK_SEQ[cards[anchorIdx].rank as Rank];
  let points = 0;
  const seenSeq = new Set<number>();
  for (let i = 0; i < cards.length; i++) {
    const seq = anchorSeq + (i - anchorIdx);
    if (seq < 2 || seq > 14) return { ok: false };
    if (seenSeq.has(seq)) return { ok: false };
    seenSeq.add(seq);
    const c = cards[i];
    if (!c.isJoker) {
      if (c.suit !== suit) return { ok: false };
      if (RANK_SEQ[c.rank as Rank] !== seq) return { ok: false };
    }
    points += seqPoints(seq);
  }
  return { ok: true, points };
}

export function seqToRank(seq: number): Rank | null {
  const found = (Object.entries(RANK_SEQ) as [Rank, number][]).find(([, v]) => v === seq);
  return found ? found[0] : null;
}

export interface MeldAddResult {
  cards: Card[];
  points: number;
  end: RunEnd | null;
}

export function addCardToMeldOptions(
  meld: { type: MeldType; cards: Card[] },
  card: Card
): MeldAddResult[] {
  if (meld.type === 'group') {
    if (meld.cards.length >= 4) return [];
    const combined = [...meld.cards, card];
    const res = validateMeld('group', combined);
    return res.ok ? [{ cards: combined, points: res.points, end: null }] : [];
  }
  const base = meld.cards;
  if (base.length >= MAX_LEN) return [];
  const out: MeldAddResult[] = [];
  const low = [card, ...base];
  const rl = validateRunOrder(low);
  if (rl.ok) out.push({ cards: low, points: rl.points, end: 'low' });
  const high = [...base, card];
  const rh = validateRunOrder(high);
  if (rh.ok) out.push({ cards: high, points: rh.points, end: 'high' });
  return out;
}

export function runEndTargetRanks(cards: Card[]): { low: Rank | null; high: Rank | null } {
  if (cards.length === 0 || cards.length >= MAX_LEN) return { low: null, high: null };
  const res = validateRunOrder(cards);
  if (!res.ok) return { low: null, high: null };
  const anchorIdx = cards.findIndex((c) => !c.isJoker);
  if (anchorIdx === -1) return { low: null, high: null };
  const anchorSeq = RANK_SEQ[cards[anchorIdx].rank as Rank];
  const lowSeq = anchorSeq - anchorIdx - 1;
  const highSeq = anchorSeq + (cards.length - 1 - anchorIdx) + 1;
  return {
    low: lowSeq >= 2 ? seqToRank(lowSeq) : null,
    high: highSeq <= 14 ? seqToRank(highSeq) : null,
  };
}

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
  const rank = seqToRank(seq);
  if (!rank) return null;
  return { suit, rank };
}

function searchOneMeld(
  meld: { type: MeldType; cards: Card[] },
  items: { card: Card; cardId: string; end?: RunEnd }[]
): { cardId: string; end: RunEnd | null }[] | null {
  const n = items.length;
  if (n === 0) return [];
  const used = new Array<boolean>(n).fill(false);
  const steps: { cardId: string; end: RunEnd | null }[] = [];

  const dfs = (current: { type: MeldType; cards: Card[] }): boolean => {
    if (steps.length === n) return true;
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const item = items[i];
      let opts = addCardToMeldOptions(current, item.card);
      if (item.end) {
        opts = opts.filter((o) => o.end === item.end || o.end === null);
      }
      for (const opt of opts) {
        used[i] = true;
        steps.push({ cardId: item.cardId, end: opt.end });
        if (dfs({ type: current.type, cards: opt.cards })) return true;
        steps.pop();
        used[i] = false;
      }
    }
    return false;
  };

  return dfs(meld) ? steps : null;
}

export function processEndsAmbiguous(
  meld: { type: MeldType; cards: Card[] },
  cards: Card[]
): boolean {
  if (meld.type !== 'run') return false;
  if (!cards.some((c) => c.isJoker)) return false;
  const items = cards.map((c) => ({ card: c, cardId: c.id }));
  if (!searchOneMeld(meld, items)) return false;
  const low = searchOneMeld(
    meld,
    items.map((it) => ({ ...it, end: 'low' as const }))
  );
  const high = searchOneMeld(
    meld,
    items.map((it) => ({ ...it, end: 'high' as const }))
  );
  return !!(low && high);
}

export function canProcessCardsOnMeld(
  meld: { type: MeldType; cards: Card[] },
  cards: Card[],
  end?: RunEnd
): boolean {
  const items = cards.map((c) => ({
    card: c,
    cardId: c.id,
    end,
  }));
  return searchOneMeld(meld, items) != null;
}

export function findLayoffSequence(
  melds: { id: string; type: MeldType; cards: Card[] }[],
  cards: Card[]
): { meldId: string; cardId: string; end: RunEnd | null }[] | null {
  if (cards.length === 0) return [];
  if (melds.length === 0) return null;

  const remaining = [...cards];
  const table = melds.map((m) => ({ ...m, cards: [...m.cards] }));
  const steps: { meldId: string; cardId: string; end: RunEnd | null }[] = [];

  const dfs = (): boolean => {
    if (remaining.length === 0) return true;
    for (let ci = 0; ci < remaining.length; ci++) {
      const card = remaining[ci];
      for (let mi = 0; mi < table.length; mi++) {
        const opts = addCardToMeldOptions(table[mi], card);
        for (const opt of opts) {
          const saved = table[mi].cards;
          table[mi].cards = opt.cards;
          remaining.splice(ci, 1);
          steps.push({
            meldId: table[mi].id,
            cardId: card.id,
            end: opt.end,
          });
          if (dfs()) return true;
          steps.pop();
          remaining.splice(ci, 0, card);
          table[mi].cards = saved;
        }
      }
    }
    return false;
  };

  return dfs() ? steps : null;
}
