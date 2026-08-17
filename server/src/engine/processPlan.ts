import type { Card, MeldType, RunEnd } from '../shared/types.js';
import { addCardToMeldOptions } from './melds.js';

export interface ProcessOpInput {
  meldId: string;
  cardId: string;
  card: Card;
  end?: RunEnd;
}

export interface ProcessOpStep {
  meldId: string;
  cardId: string;
  end: RunEnd | null;
  cards: Card[];
  points: number;
}

function searchOneMeld(
  meld: { type: MeldType; cards: Card[] },
  items: { card: Card; cardId: string; end?: RunEnd }[]
): ProcessOpStep[] | null {
  const n = items.length;
  if (n === 0) return [];
  const used = new Array<boolean>(n).fill(false);
  const steps: ProcessOpStep[] = [];

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
        steps.push({
          meldId: '',
          cardId: item.cardId,
          end: opt.end,
          cards: opt.cards,
          points: opt.points,
        });
        if (dfs({ type: current.type, cards: opt.cards })) return true;
        steps.pop();
        used[i] = false;
      }
    }
    return false;
  };

  return dfs(meld) ? steps : null;
}

/** Ayni pere giden kagitlari gecerli sirada (joker ucu dahil) yerlestir. */
export function findProcessSequence(
  melds: { id: string; type: MeldType; cards: Card[] }[],
  ops: ProcessOpInput[]
): ProcessOpStep[] | null {
  const byMeld = new Map<string, ProcessOpInput[]>();
  for (const op of ops) {
    const list = byMeld.get(op.meldId) ?? [];
    list.push(op);
    byMeld.set(op.meldId, list);
  }
  const steps: ProcessOpStep[] = [];
  for (const [meldId, group] of byMeld) {
    const meld = melds.find((m) => m.id === meldId);
    if (!meld) return null;
    const found = searchOneMeld(meld, group);
    if (!found) return null;
    for (const s of found) s.meldId = meldId;
    steps.push(...found);
  }
  return steps;
}

export function processEndsAmbiguous(
  meld: { type: MeldType; cards: Card[] },
  cards: Card[]
): boolean {
  if (meld.type !== 'run') return false;
  if (!cards.some((c) => c.isJoker)) return false;
  const items = cards.map((c) => ({ card: c, cardId: c.id }));
  const unconstrained = searchOneMeld(meld, items);
  if (!unconstrained) return false;
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

/** Eldeki tum kagitlari masadaki perlere isleyebilecek bir sira bul. */
export function findLayoffSequence(
  melds: { id: string; type: MeldType; cards: Card[] }[],
  cards: Card[]
): ProcessOpStep[] | null {
  if (cards.length === 0) return [];
  if (melds.length === 0) return null;

  const remaining = [...cards];
  const table = melds.map((m) => ({ ...m, cards: [...m.cards] }));
  const steps: ProcessOpStep[] = [];

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
            cards: opt.cards,
            points: opt.points,
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
