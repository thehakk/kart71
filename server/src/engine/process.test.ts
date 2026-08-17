import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card, Meld, Rank, Suit } from '../shared/types.js';
import { createGameState } from './state.js';
import { addCardToMeldOptions, resolveJokerInRun } from './melds.js';
import {
  discardCard,
  finishHand,
  processFromHandBatch,
} from './actions.js';
import { findFinishPlan } from './finishPlan.js';

function card(suit: Suit, rank: Rank, back: 'red' | 'blue' = 'red'): Card {
  return { id: `${suit}${rank}-${back}`, suit, rank, back, isJoker: false };
}

function joker(back: 'red' | 'blue' = 'red'): Card {
  return { id: `JOKER-${back}`, suit: null, rank: null, back, isJoker: true };
}

function jqkMeld(ownerSeat: 0 | 1 | 2 | 3 = 0): Meld {
  const cards = [card('H', 'J'), card('H', 'Q'), card('H', 'K')];
  return {
    id: `m${ownerSeat}-1`,
    type: 'run',
    cards,
    ownerSeat,
    points: 30,
  };
}

function openedState(hand: Card[], melds: Meld[]) {
  const state = createGameState(
    'TEST',
    [
      { name: 'P1', isBot: false, connected: true },
      { name: 'P2', isBot: true, connected: true },
      { name: 'P3', isBot: true, connected: true },
      { name: 'P4', isBot: true, connected: true },
    ],
    0,
    1,
    [0, 0]
  );
  state.phase = 'discard';
  state.turnSeat = 0;
  state.discardsMade = 5;
  state.pending = null;
  const p = state.players[0];
  p.hand = hand;
  p.hasOpened = true;
  p.openType = 'per';
  p.openedValue = 80;
  state.lastOpenerValue = 80;
  state.melds = melds;
  return state;
}

test('joker JQK perine hem 10 hem A olarak işlenebilir', () => {
  const meld = jqkMeld();
  const opts = addCardToMeldOptions(meld, joker());
  const ends = opts.map((o) => o.end).sort();
  assert.deepEqual(ends, ['high', 'low']);
  const asTen = opts.find((o) => o.end === 'low')!;
  assert.equal(resolveJokerInRun(asTen.cards, 0)?.rank, '10');
  const asAce = opts.find((o) => o.end === 'high')!;
  assert.equal(resolveJokerInRun(asAce.cards, 3)?.rank, 'A');
});

test('joker 10 olarak işlenince 9 alta eklenebilir (sıra korunur)', () => {
  const meld = jqkMeld();
  const withJoker = addCardToMeldOptions(meld, joker()).find((o) => o.end === 'low')!;
  meld.cards = withJoker.cards;
  meld.points = withJoker.points;
  const nine = addCardToMeldOptions(meld, card('H', '9'));
  assert.equal(nine.length, 1);
  assert.equal(nine[0].end, 'low');
  assert.equal(nine[0].cards.map((c) => (c.isJoker ? 'JOKER' : c.rank)).join('-'), '9-JOKER-J-Q-K');
});

test('9 ve joker JQK perine seçim sırasından bağımsız işlenir, 7 atılıp bitilir', () => {
  const nine = card('H', '9');
  const seven = card('C', '7');
  const jk = joker();
  const state = openedState([nine, seven, jk], [jqkMeld()]);

  processFromHandBatch(state, 0, [
    { meldId: state.melds[0].id, cardId: nine.id },
    { meldId: state.melds[0].id, cardId: jk.id, end: 'low' },
  ]);

  const ranks = state.melds[0].cards.map((c) => (c.isJoker ? 'JOKER' : c.rank));
  assert.deepEqual(ranks, ['9', 'JOKER', 'J', 'Q', 'K']);
  assert.equal(resolveJokerInRun(state.melds[0].cards, 1)?.rank, '10');
  assert.deepEqual(
    state.players[0].hand.map((c) => c.id),
    [seven.id]
  );

  finishHand(state, 0, { discardCardId: seven.id, melds: [], pairs: [] });
  assert.equal(state.phase, 'ended');
  assert.equal(state.handResult?.finishInfo?.winnerSeat, 0);
});

test('Bitir, JQK üzerine 10(joker)+9 işleyip 7 atmayı plana koyar', () => {
  const nine = card('H', '9');
  const seven = card('C', '7');
  const jk = joker();
  const state = openedState([nine, seven, jk], [jqkMeld()]);
  const plan = findFinishPlan(state, state.players[0].hand, state.players[0]);
  assert.ok(plan);
  assert.equal(plan!.discardCardId, seven.id);
  assert.equal(plan!.processOps?.length, 2);
  const ids = new Set(plan!.processOps!.map((op) => op.cardId));
  assert.ok(ids.has(nine.id) && ids.has(jk.id));

  finishHand(state, 0, { auto: true });
  assert.equal(state.phase, 'ended');
  const ranks = state.melds[0].cards.map((c) => (c.isJoker ? 'JOKER' : c.rank));
  assert.deepEqual(ranks, ['9', 'JOKER', 'J', 'Q', 'K']);
});

test('açmışken son kartı atmak bitiştir', () => {
  const seven = card('C', '7');
  const state = openedState([seven], [jqkMeld()]);
  discardCard(state, 0, seven.id);
  assert.equal(state.phase, 'ended');
  assert.equal(state.handResult?.finishInfo?.winnerSeat, 0);
});

test('joker As olarak işlenince 9 JQK perine eklenemez', () => {
  const nine = card('H', '9');
  const seven = card('C', '7');
  const jk = joker();
  const state = openedState([nine, seven, jk], [jqkMeld()]);
  processFromHandBatch(state, 0, [
    { meldId: state.melds[0].id, cardId: jk.id, end: 'high' },
  ]);
  assert.equal(resolveJokerInRun(state.melds[0].cards, 3)?.rank, 'A');
  assert.throws(
    () =>
      processFromHandBatch(state, 0, [
        { meldId: state.melds[0].id, cardId: nine.id },
      ]),
    /işlenemez/
  );
});
