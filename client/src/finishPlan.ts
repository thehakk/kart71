import type { Card, MeldType, Rank } from './types';
import {
  buildRunOrder,
  validateMeld,
  validatePair,
  isPairWild,
  rankPoints,
} from './meldBuild';

function cardPoints(c: Card): number {
  if (c.isJoker) return 25;
  if (!c.rank) return 0;
  return rankPoints(c.rank);
}
export interface MeldReq {
  type: MeldType;
  cardIds: string[];
}

export interface FinishPlan {
  melds?: MeldReq[];
  pairs?: string[][];
  discardCardId: string;
}

const RANK_SEQ: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
};

function findGroupMelds(hand: Card[], used: Set<string>): MeldReq[] {
  const melds: MeldReq[] = [];
  const jokers = hand.filter((c) => c.isJoker && !used.has(c.id));
  const byRank = new Map<Rank, Card[]>();

  for (const c of hand) {
    if (c.isJoker || used.has(c.id) || !c.rank) continue;
    const list = byRank.get(c.rank) ?? [];
    list.push(c);
    byRank.set(c.rank, list);
  }

  for (const cards of byRank.values()) {
    const bySuit = new Map<string, Card>();
    for (const c of cards) {
      if (c.suit && !bySuit.has(c.suit)) bySuit.set(c.suit, c);
    }
    const uniq = [...bySuit.values()].filter((c) => !used.has(c.id));
    if (uniq.length >= 3) {
      const pick = uniq.slice(0, Math.min(4, uniq.length));
      if (validateMeld('group', pick).ok) {
        melds.push({ type: 'group', cardIds: pick.map((c) => c.id) });
        pick.forEach((c) => used.add(c.id));
        continue;
      }
    }
    if (uniq.length === 2 && jokers.length > 0) {
      const joker = jokers.find((j) => !used.has(j.id));
      if (joker) {
        const pick = [...uniq, joker];
        if (validateMeld('group', pick).ok) {
          melds.push({ type: 'group', cardIds: pick.map((c) => c.id) });
          pick.forEach((c) => used.add(c.id));
        }
      }
    }
  }
  return melds;
}

function findRunMelds(hand: Card[], used: Set<string>): MeldReq[] {
  const melds: MeldReq[] = [];
  const suits = ['H', 'D', 'C', 'S'] as const;
  const jokers = hand.filter((c) => c.isJoker && !used.has(c.id));

  for (const suit of suits) {
    const cards = hand
      .filter((c) => !used.has(c.id) && !c.isJoker && c.suit === suit && c.rank)
      .sort((a, b) => RANK_SEQ[a.rank as Rank] - RANK_SEQ[b.rank as Rank]);

    let i = 0;
    while (i < cards.length) {
      let j = i + 1;
      while (
        j < cards.length &&
        RANK_SEQ[cards[j].rank as Rank] === RANK_SEQ[cards[j - 1].rank as Rank] + 1
      ) {
        j++;
      }
      const runLen = j - i;
      if (runLen >= 3) {
        const len = Math.min(5, runLen);
        const pick = cards.slice(i, i + len);
        if (validateMeld('run', pick).ok) {
          melds.push({ type: 'run', cardIds: pick.map((c) => c.id) });
          pick.forEach((c) => used.add(c.id));
        }
      }
      i = j;
    }

    for (let a = 0; a < cards.length; a++) {
      for (let b = a + 1; b < cards.length; b++) {
        const joker = jokers.find((j) => !used.has(j.id));
        if (!joker) continue;
        const pick = [cards[a], cards[b], joker];
        const ordered = buildRunOrder(pick);
        if (ordered && validateMeld('run', ordered).ok) {
          melds.push({ type: 'run', cardIds: pick.map((c) => c.id) });
          pick.forEach((c) => used.add(c.id));
        }
      }
    }
  }
  return melds;
}

/** Elden/per bitisi icin eldeki per adaylarini bul. */
export function findOpenPlan(hand: Card[]): MeldReq[] {
  const used = new Set<string>();
  return [...findGroupMelds(hand, used), ...findRunMelds(hand, used)];
}

function* combinationsOf<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  if (arr.length < k) return;
  for (let i = 0; i <= arr.length - k; i++) {
    for (const tail of combinationsOf(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...tail];
    }
  }
}

function removeByIds(cards: Card[], ids: string[]): Card[] {
  const used = new Set(ids);
  return cards.filter((c) => !used.has(c.id));
}

const SUITS = ['H', 'D', 'C', 'S'] as const;

function pushMeld(
  melds: MeldReq[],
  seen: Set<string>,
  type: MeldType,
  ordered: Card[]
): void {
  if (!validateMeld(type, ordered).ok) return;
  const key = `${type}:${ordered
    .map((c) => c.id)
    .sort()
    .join(',')}`;
  if (seen.has(key)) return;
  seen.add(key);
  melds.push({ type, cardIds: ordered.map((c) => c.id) });
}

/** Erkek per adaylari: ayni sayidan farkli seriler (+ joker). */
function enumerateGroupMelds(cards: Card[], melds: MeldReq[], seen: Set<string>): void {
  const jokers = cards.filter((c) => c.isJoker);
  const byRank = new Map<Rank, Map<string, Card[]>>();

  for (const c of cards) {
    if (c.isJoker || !c.rank || !c.suit) continue;
    const rankMap = byRank.get(c.rank) ?? new Map<string, Card[]>();
    const list = rankMap.get(c.suit) ?? [];
    list.push(c);
    rankMap.set(c.suit, list);
    byRank.set(c.rank, rankMap);
  }

  for (const rankMap of byRank.values()) {
    const suitKeys = [...rankMap.keys()];

    const pickFromSuits = (suitSubset: string[], jokerCount: number): void => {
      const optsPerSuit = suitSubset.map((s) => rankMap.get(s)!);
      const pick = (i: number, picked: Card[]): void => {
        if (i === optsPerSuit.length) {
          const combo = [...picked, ...jokers.slice(0, jokerCount)];
          pushMeld(melds, seen, 'group', combo);
          return;
        }
        for (const c of optsPerSuit[i]) {
          if (picked.some((p) => p.id === c.id)) continue;
          pick(i + 1, [...picked, c]);
        }
      };
      pick(0, []);
    };

    for (let k = 3; k <= Math.min(4, suitKeys.length); k++) {
      for (const suitSubset of combinationsOf(suitKeys, k)) {
        pickFromSuits(suitSubset, 0);
      }
    }
    for (let k = 1; k <= Math.min(4, suitKeys.length); k++) {
      const jokerNeed = Math.min(jokers.length, 4 - k);
      if (jokerNeed <= 0) continue;
      for (const suitSubset of combinationsOf(suitKeys, k)) {
        pickFromSuits(suitSubset, jokerNeed);
      }
    }
  }
}

/** Sirali per adaylari: seri basina pencere + joker doldurma. */
function enumerateRunMelds(cards: Card[], melds: MeldReq[], seen: Set<string>): void {
  const jokers = cards.filter((c) => c.isJoker);

  for (const suit of SUITS) {
    const suitCards = cards.filter(
      (c) => !c.isJoker && c.suit === suit && c.rank
    );
    const bySeq = new Map<number, Card[]>();
    for (const c of suitCards) {
      const seq = RANK_SEQ[c.rank as Rank];
      const list = bySeq.get(seq) ?? [];
      list.push(c);
      bySeq.set(seq, list);
    }

    for (let start = 2; start <= 14; start++) {
      for (let len = 3; len <= 5; len++) {
        const end = start + len - 1;
        if (end > 14) continue;

        const slots: Card[][] = [];
        let gaps = 0;
        for (let s = start; s <= end; s++) {
          const opts = bySeq.get(s) ?? [];
          if (opts.length > 0) slots.push(opts);
          else {
            slots.push([]);
            gaps++;
          }
        }
        if (gaps > jokers.length) continue;

        const pickSlot = (slotIdx: number, picked: Card[], jUsed: number): void => {
          if (slotIdx === slots.length) {
            const combo = [...picked, ...jokers.slice(jUsed, jUsed + gaps)];
            const ordered = buildRunOrder(combo);
            if (ordered) pushMeld(melds, seen, 'run', ordered);
            return;
          }
          if (slots[slotIdx].length === 0) {
            pickSlot(slotIdx + 1, picked, jUsed);
            return;
          }
          for (const c of slots[slotIdx]) {
            if (picked.some((p) => p.id === c.id)) continue;
            pickSlot(slotIdx + 1, [...picked, c], jUsed);
          }
        };
        pickSlot(0, [], 0);
      }
    }
  }
}

function enumerateMelds(cards: Card[]): MeldReq[] {
  const melds: MeldReq[] = [];
  const seen = new Set<string>();
  enumerateGroupMelds(cards, melds, seen);
  enumerateRunMelds(cards, melds, seen);
  return melds.sort((a, b) => b.cardIds.length - a.cardIds.length);
}

function allValidPairs(cards: Card[], taban: Card): string[][] {
  const pairs: string[][] = [];
  const seen = new Set<string>();

  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (!validatePair(cards[i], cards[j], taban).ok) continue;
      const key = [cards[i].id, cards[j].id].sort().join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push([cards[i].id, cards[j].id]);
    }
  }

  return pairs;
}

interface HandCover {
  melds: MeldReq[];
  pairs: string[][];
}

function coverHand(
  cards: Card[],
  taban: Card,
  mode: 'melds' | 'pairs',
  memo = new Map<string, HandCover | null>()
): HandCover | null {
  if (cards.length === 0) return { melds: [], pairs: [] };

  const key = `${mode}:${cards
    .map((c) => c.id)
    .sort()
    .join(',')}`;
  if (memo.has(key)) return memo.get(key) ?? null;

  if (mode === 'melds') {
    for (const m of enumerateMelds(cards)) {
      const rest = removeByIds(cards, m.cardIds);
      const sub = coverHand(rest, taban, 'melds', memo);
      if (sub) {
        const result = { melds: [m, ...sub.melds], pairs: [] as string[][] };
        memo.set(key, result);
        return result;
      }
    }
  } else {
    for (const pair of allValidPairs(cards, taban)) {
      const rest = removeByIds(cards, pair);
      const sub = coverHand(rest, taban, 'pairs', memo);
      if (sub) {
        const result = { melds: [] as MeldReq[], pairs: [pair, ...sub.pairs] };
        memo.set(key, result);
        return result;
      }
    }
  }

  memo.set(key, null);
  return null;
}

export function findPairGroups(hand: Card[], taban: Card): string[][] {
  const used = new Set<string>();
  const pairs: string[][] = [];
  const wilds = hand.filter((c) => isPairWild(c, taban) && !used.has(c.id));

  const byExact = new Map<string, Card[]>();
  for (const c of hand) {
    if (isPairWild(c, taban) || used.has(c.id)) continue;
    const k = `${c.suit}-${c.rank}`;
    const list = byExact.get(k) ?? [];
    list.push(c);
    byExact.set(k, list);
  }

  for (const cards of byExact.values()) {
    for (let i = 0; i + 1 < cards.length; i += 2) {
      const a = cards[i];
      const b = cards[i + 1];
      if (validatePair(a, b, taban).ok) {
        pairs.push([a.id, b.id]);
        used.add(a.id);
        used.add(b.id);
      }
    }
  }

  for (const c of hand) {
    if (used.has(c.id) || isPairWild(c, taban)) continue;
    const j = wilds.find((x) => !used.has(x.id));
    if (j && validatePair(c, j, taban).ok) {
      pairs.push([c.id, j.id]);
      used.add(c.id);
      used.add(j.id);
    }
  }

  return pairs;
}

function tryGreedyMeldCover(rest: Card[]): HandCover | null {
  const melds = findOpenPlan(rest);
  const meldUsed = new Set(melds.flatMap((m) => m.cardIds));
  const left = rest.filter((c) => !meldUsed.has(c.id));
  if (left.length === 0 && melds.length > 0) {
    return { melds, pairs: [] };
  }
  return null;
}

function tryGreedyPairCover(rest: Card[], taban: Card): HandCover | null {
  const pairs = findPairGroups(rest, taban);
  const pairUsed = new Set(pairs.flat());
  const left = rest.filter((c) => !pairUsed.has(c.id));
  if (left.length === 0 && pairs.length > 0) {
    return { melds: [], pairs };
  }
  return null;
}

function discardCandidates(
  hand: Card[],
  taban: Card,
  preferJokerDiscard: boolean
): Card[] {
  return [...hand].sort((a, b) => {
    if (preferJokerDiscard && a.isJoker !== b.isJoker) {
      return a.isJoker ? -1 : 1;
    }
    const aw = isPairWild(a, taban) ? 1 : 0;
    const bw = isPairWild(b, taban) ? 1 : 0;
    return aw - bw || cardPoints(a) - cardPoints(b);
  });
}

/** Belirli biter kagidi icin kalan el per/çift plani. */
export function planFinishWithDiscard(
  hand: Card[],
  taban: Card,
  discardCardId: string,
  mode: 'per' | 'cift' | 'auto',
  allowDiscardOnly: boolean
): FinishPlan | null {
  if (!hand.some((c) => c.id === discardCardId)) return null;
  const rest = hand.filter((c) => c.id !== discardCardId);
  if (rest.length === 0) {
    return allowDiscardOnly
      ? { melds: [], pairs: [], discardCardId }
      : null;
  }

  if (mode === 'cift' || mode === 'auto') {
    const greedyPairs = tryGreedyPairCover(rest, taban);
    if (greedyPairs) {
      return { pairs: greedyPairs.pairs, discardCardId };
    }
    const pairCover = coverHand(rest, taban, 'pairs');
    if (pairCover && pairCover.pairs.length > 0) {
      return { pairs: pairCover.pairs, discardCardId };
    }
  }

  if (mode === 'per' || mode === 'auto') {
    const greedyMelds = tryGreedyMeldCover(rest);
    if (greedyMelds) {
      return { melds: greedyMelds.melds, pairs: [], discardCardId };
    }
    const meldCover = coverHand(rest, taban, 'melds');
    if (meldCover && meldCover.melds.length > 0) {
      return { melds: meldCover.melds, pairs: [], discardCardId };
    }
  }

  return null;
}

export function findCiftFinishPlan(
  hand: Card[],
  taban: Card,
  allowDiscardOnly = false,
  preferJokerDiscard = false
): FinishPlan | null {
  for (const discard of discardCandidates(hand, taban, preferJokerDiscard)) {
    const plan = planFinishWithDiscard(
      hand,
      taban,
      discard.id,
      'cift',
      allowDiscardOnly
    );
    if (plan) return plan;
  }
  return null;
}

export function findPerFinishPlan(
  hand: Card[],
  taban: Card,
  allowDiscardOnly = false,
  preferJokerDiscard = false
): FinishPlan | null {
  for (const discard of discardCandidates(hand, taban, preferJokerDiscard)) {
    const plan = planFinishWithDiscard(
      hand,
      taban,
      discard.id,
      'per',
      allowDiscardOnly
    );
    if (plan) return plan;
  }
  return null;
}

/** Istemci: biter kagit secildikten sonra kalan el plani. */
export function planFinishForHand(
  hand: Card[],
  taban: Card,
  discardCardId: string,
  opts: {
    isCiftci: boolean;
    openType: 'none' | 'per' | 'cift';
    hasOpened: boolean;
  }
): FinishPlan | null {
  const allowDiscardOnly = opts.hasOpened;
  const mode: 'per' | 'cift' | 'auto' =
    opts.isCiftci || opts.openType === 'cift'
      ? 'cift'
      : opts.openType === 'per'
        ? 'per'
        : 'auto';
  return planFinishWithDiscard(hand, taban, discardCardId, mode, allowDiscardOnly);
}