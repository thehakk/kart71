import type { Card, MeldType, Rank, Seat } from '../shared/types.js';
import type { GameState } from './state.js';
import { requiredOpenForGame, requiredPairsForGame } from './state.js';
import { cardPoints } from './deck.js';
import { validateMeld, validatePair, isPairWild, buildRunOrder, discardHelpsPairs, discardHelpsCiftciPairs } from './melds.js';
import { kafaBonus } from './scoring.js';
import { isEarlyDiscardPhase } from './turn.js';
import { findFinishPlan, findOpenPlan, findPairGroups, findPerFinishPlan, findCiftFinishPlan } from './finishPlan.js';
import {
  canTakeTopDiscard,
  discardCard,
  drawFromPile,
  finishHand,
  isIslekDiscard,
  maybeAutoEndOnEmptyDeck,
  openMelds,
  openPairs,
  processFromHandBatch,
  takeDiscard,
  type FinishReq,
  type OpenMeldReq,
} from './actions.js';

export type BotTurnResult = 'handEnded' | 'continue' | 'noop';

const RANK_SEQ: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
};

/** El 1-3: temkinli; 4+ normal oyun */
const EARLY_LAST = 3;
const MID_LAST = 10;
const KAFA_WAIT_OPEN = 111;

function isDeckWild(c: Card, tabanId: string): boolean {
  return c.isJoker || c.id === tabanId;
}

function isEarly(handNumber: number): boolean {
  return handNumber <= EARLY_LAST;
}

function isLate(handNumber: number): boolean {
  return handNumber > MID_LAST;
}

function requiredOpen(state: GameState): number {
  return requiredOpenForGame(state);
}

function requiredPairs(state: GameState): number {
  return requiredPairsForGame(state);
}

function meldPoints(type: MeldType, cards: Card[]): number {
  const res = validateMeld(type, cards);
  return res.ok ? res.points : 0;
}

function findBestOpenPlan(hand: Card[], state: GameState): OpenMeldReq[] {
  const all = findOpenPlan(hand);
  if (all.length === 0) return [];
  const need = requiredOpen(state);
  const sorted = [...all].sort((a, b) => {
    const pa = openPlanPoints(hand, [a]);
    const pb = openPlanPoints(hand, [b]);
    return pb - pa;
  });
  const picked: OpenMeldReq[] = [];
  let total = 0;
  const used = new Set<string>();
  for (const m of sorted) {
    if (m.cardIds.some((id) => used.has(id))) continue;
    const pts = openPlanPoints(hand, [m]);
    picked.push(m);
    m.cardIds.forEach((id) => used.add(id));
    total += pts;
    if (total >= need) break;
  }
  return total >= need ? picked : [];
}

function openPlanPoints(hand: Card[], plan: OpenMeldReq[]): number {
  let total = 0;
  for (const m of plan) {
    const cards = m.cardIds.map((id) => hand.find((c) => c.id === id)!);
    total += meldPoints(m.type, cards);
  }
  return total;
}

function canPerOpen(hand: Card[], state: GameState): boolean {
  return findBestOpenPlan(hand, state).length > 0;
}

function pickHighestNonWild(hand: Card[], tabanId: string): Card {
  const pool = hand.filter((c) => !isDeckWild(c, tabanId));
  const src = pool.length > 0 ? pool : hand;
  return src.reduce((worst, c) => (cardPoints(c) > cardPoints(worst) ? c : worst));
}

function pickCiftciDiscard(hand: Card[], taban: Card): Card {
  const nonWild = hand.filter((c) => !isDeckWild(c, taban.id));
  const pool = nonWild.length > 0 ? nonWild : hand;
  const useless = pool.filter(
    (c) => !pool.some((other) => other.id !== c.id && validatePair(c, other, taban).ok)
  );
  return pickHighestNonWild(useless.length > 0 ? useless : pool, taban.id);
}

function pickSafeDiscard(state: GameState, hand: Card[], taban: Card): Card | null {
  const nonIslek = hand.filter((c) => !isIslekDiscard(state, c));
  if (nonIslek.length === 0) return null;
  const nonWild = nonIslek.filter((c) => !isDeckWild(c, taban.id));
  const pool = nonWild.length > 0 ? nonWild : nonIslek;
  return pickHighestNonWild(pool, taban.id);
}

function pickBotDiscard(state: GameState, hand: Card[], taban: Card, isCiftci: boolean): Card {
  const desperate = state.drawPile.length <= 2;
  if (state.melds.length > 0) {
    const safe = pickSafeDiscard(state, hand, taban);
    if (safe) return safe;
  }
  if (isCiftci) {
    if (desperate) return pickHighestNonWild(hand, taban.id);
    const ciftciPick = pickCiftciDiscard(hand, taban);
    if (state.melds.length === 0 || !isIslekDiscard(state, ciftciPick)) return ciftciPick;
    const safe = pickSafeDiscard(state, hand, taban);
    if (safe) return safe;
    return ciftciPick;
  }
  return pickHighestNonWild(hand, taban.id);
}

function shouldWaitForKafa(state: GameState, openPts: number, pairCount: number): boolean {
  if (isLate(state.handNumber)) return false;
  if (state.drawPile.length < 8) return false;

  const currentKafa = kafaBonus(openPts, pairCount);
  if (openPts >= 95 && openPts < KAFA_WAIT_OPEN && currentKafa === 0) return true;
  if (pairCount === 5 && requiredPairs(state) <= 5) return true;
  return false;
}

function shouldBecomeCiftci(state: GameState, hand: Card[], taban: Card): boolean {
  if (isEarlyDiscardPhase(state.discardsMade)) return false;
  const pairs = findPairGroups(hand, taban);
  if (isLate(state.handNumber)) return pairs.length >= 3;
  if (isEarly(state.handNumber)) return pairs.length >= 5;
  return pairs.length >= 4;
}

function shouldOpenPerNow(state: GameState, hand: Card[]): boolean {
  if (isEarlyDiscardPhase(state.discardsMade)) return false;
  if (!canPerOpen(hand, state)) return false;

  const plan = findBestOpenPlan(hand, state);
  const pts = openPlanPoints(hand, plan);

  if (findPerFinishPlan(hand, state.taban)) return true;
  if (shouldWaitForKafa(state, pts, 0) && state.drawPile.length > 4) return false;

  if (isLate(state.handNumber)) return true;
  if (pts >= KAFA_WAIT_OPEN) return true;
  if (!isEarly(state.handNumber)) return true;
  return pts >= requiredOpen(state) + 10;
}

function shouldOpenPairsNow(state: GameState, hand: Card[], taban: Card): boolean {
  if (isEarlyDiscardPhase(state.discardsMade)) return false;
  const need = requiredPairs(state);
  const pairs = findPairGroups(hand, taban);
  if (pairs.length < need) return false;

  if (findCiftFinishPlan(hand, taban)) return true;
  if (shouldWaitForKafa(state, 0, pairs.length) && state.drawPile.length > 4) return false;

  if (pairs.length >= 7 || pairs.length >= 6) return true;
  if (isLate(state.handNumber)) return true;
  if (!isEarly(state.handNumber)) return true;
  return pairs.length >= need;
}

function tryFinish(state: GameState, seat: Seat): boolean {
  const player = state.players[seat];
  const plan = findFinishPlan(state, player.hand, player);
  if (!plan) return false;
  try {
    finishHand(state, seat, plan);
    return true;
  } catch {
    return false;
  }
}

function shouldTakeDiscard(
  state: GameState,
  player: GameState['players'][number],
  top: Card
): boolean {
  if (isEarlyDiscardPhase(state.discardsMade)) return false;
  if (isIslekDiscard(state, top)) return false;
  if (!canTakeTopDiscard(state, player.seat)) return false;

  const helpsPairs = discardHelpsPairs(player.hand, top, state.taban);
  const withTop = [...player.hand, top];

  if (player.isCiftci) return discardHelpsCiftciPairs(player.hand, top, state.taban);

  if (!player.hasOpened) {
    if (helpsPairs && shouldBecomeCiftci(state, withTop, state.taban)) return true;
    if (canPerOpen(withTop, state)) return true;
    if (findFinishPlan(state, withTop, player)) return true;
    if (helpsPairs && !isEarly(state.handNumber)) return true;
  } else if (findFinishPlan(state, withTop, player)) {
    return true;
  }

  return false;
}

function botDraw(state: GameState, seat: Seat): BotTurnResult {
  const player = state.players[seat];

  if (state.drawPile.length === 0) {
    const res = drawFromPile(state, seat);
    return res.handEnded ? 'handEnded' : 'continue';
  }

  if (
    state.discardsMade === 0 &&
    seat === state.starterSeat &&
    canTakeTopDiscard(state, seat)
  ) {
    takeDiscard(state, seat, false);
    return 'continue';
  }

  // Ciftci: yalnizca birebir ikiz tamamlayan atigi al, yoksa desteden cek.
  if (player.isCiftci) {
    if (canTakeTopDiscard(state, seat)) {
      takeDiscard(state, seat, false);
      return 'continue';
    }
    const res = drawFromPile(state, seat);
    return res.handEnded ? 'handEnded' : 'continue';
  }

  if (canTakeTopDiscard(state, seat)) {
    const top = state.discardPile[state.discardPile.length - 1]!;
    if (shouldTakeDiscard(state, player, top)) {
      const helpsPairs = discardHelpsPairs(player.hand, top, state.taban);
      const withTop = [...player.hand, top];
      if (
        !player.isCiftci &&
        !player.hasOpened &&
        helpsPairs &&
        shouldBecomeCiftci(state, withTop, state.taban)
      ) {
        takeDiscard(state, seat, false);
        return 'continue';
      }
      const ask =
        !player.isCiftci &&
        !player.hasOpened &&
        !helpsPairs &&
        (canPerOpen(withTop, state) || !!findFinishPlan(state, withTop, player));
      takeDiscard(state, seat, ask);
      return 'continue';
    }
  }

  const res = drawFromPile(state, seat);
  return res.handEnded ? 'handEnded' : 'continue';
}

function botTryProcessHand(state: GameState, seat: Seat): void {
  let changed = true;
  while (changed) {
    changed = false;
    const player = state.players[seat];
    if (!player.hasOpened || player.isCiftci || state.melds.length === 0) return;
    if (player.hand.length <= 1) return;

    outer: for (const meld of state.melds) {
      for (const card of player.hand) {
        try {
          processFromHandBatch(state, seat, [{ meldId: meld.id, cardId: card.id }]);
          changed = true;
          break outer;
        } catch {
          // bu kart bu pere gitmez
        }
      }
    }
  }
}

function botDiscard(state: GameState, seat: Seat): BotTurnResult {
  const player = state.players[seat];

  if (tryFinish(state, seat)) return 'handEnded';

  const pairs = findPairGroups(player.hand, state.taban);
  const need = requiredPairs(state);

  if (
    (player.isCiftci || shouldBecomeCiftci(state, player.hand, state.taban)) &&
    shouldOpenPairsNow(state, player.hand, state.taban) &&
    pairs.length >= need &&
    !player.hasOpened
  ) {
    try {
      openPairs(state, seat, pairs.slice(0, need));
    } catch {
      // at
    }
  } else if (!player.hasOpened && !player.isCiftci && shouldOpenPerNow(state, player.hand)) {
    const plan = findBestOpenPlan(player.hand, state);
    try {
      if (plan.length > 0) openMelds(state, seat, plan);
    } catch {
      // at
    }
  }

  botTryProcessHand(state, seat);

  const card = pickBotDiscard(state, player.hand, state.taban, player.isCiftci);
  discardCard(state, seat, card.id);
  if (maybeAutoEndOnEmptyDeck(state)) return 'handEnded';
  return 'continue';
}

export function runBotTurn(state: GameState, seat: Seat): BotTurnResult {
  const player = state.players[seat];
  if (!player.isBot) return 'noop';

  if (state.phase === 'draw') return botDraw(state, seat);
  if (state.phase === 'discard') return botDiscard(state, seat);
  return 'noop';
}

/** Atan bot: cifte acma ihtimali yuksekse vermez (ciftci olur). */
export function shouldBotGiveDiscard(state: GameState, responderSeat: Seat): boolean {
  const player = state.players[responderSeat];
  if (!player.isBot) return true;
  if (player.isCiftci || player.hasOpened) return true;

  const pairs = findPairGroups(player.hand, state.taban);
  const need = requiredPairs(state);

  if (shouldOpenPairsNow(state, player.hand, state.taban)) return false;

  if (
    shouldBecomeCiftci(state, player.hand, state.taban) &&
    pairs.length >= Math.max(3, need - 1)
  ) {
    return false;
  }

  return true;
}
