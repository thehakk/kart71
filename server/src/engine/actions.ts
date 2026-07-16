import type { Card, Meld, MeldType, Seat } from '../shared/types.js';
import type { GameState } from './state.js';
import {
  requiredOpenForGame,
  requiredPairsForGame,
  syncPerBaraj,
  eldenFinishAllowed,
  playerHasOpened,
  anyoneOpened,
} from './state.js';
import { isEarlyDiscardPhase, nextTurnSeat, prevTurnSeat } from './turn.js';
import { validateMeld, validatePair, resolveJokerInRun, resolveJokerInGroup, resolveWildInPair, findWildIndex, buildRunOrder, isTabanLikeCard, discardHelpsPairs, discardHelpsCiftciPairs } from './melds.js';
import { findFinishPlan, findCiftFinishPlan } from './finishPlan.js';
import { applyHandScore, scoreHand, type FinishInfo } from './scoring.js';

function markCiftci(state: GameState, seat: Seat): void {
  const player = state.players[seat];
  if (player.openType === 'per')
    throw new ActionError('Per açtıktan sonra çiftçi olamazsın.');
  player.isCiftci = true;
  player.receivedAskDiscard = false;
  syncPerBaraj(state);
}

function clearAskTakeObligation(player: GameState['players'][number]): void {
  player.receivedAskDiscard = false;
}

export class ActionError extends Error {}

let meldCounter = 0;
function newMeldId(seat: Seat): string {
  meldCounter += 1;
  return `meld-${seat}-${meldCounter}`;
}

function requireTurn(state: GameState, seat: Seat) {
  if (state.phase === 'ended') throw new ActionError('El bitti.');
  if (state.turnSeat !== seat) throw new ActionError('Sıra sende değil.');
}

function nextSeat(seat: Seat): Seat {
  return nextTurnSeat(seat);
}

function requireNotEarlyForPerOpen(state: GameState): void {
  if (isEarlyDiscardPhase(state.discardsMade))
    throw new ActionError('İlk 4 atık düşene kadar per açılamaz veya sorulamaz.');
}

function requireNotEarlyForPairOpen(state: GameState): void {
  if (isEarlyDiscardPhase(state.discardsMade))
    throw new ActionError('İlk 4 atık düşene kadar çift açılamaz.');
}

// Desteden cek. Deste bossa el biter (deste tukendi).
export function drawFromPile(state: GameState, seat: Seat): { handEnded: boolean } {
  requireTurn(state, seat);
  if (state.pending) throw new ActionError('Bekleyen bir istek var.');
  if (state.phase !== 'draw') throw new ActionError('Şu an çekme/alma sırası değil.');
  if (state.drawPile.length === 0) {
    applyHandScore(state, scoreHand(state, null));
    return { handEnded: true };
  }
  const card = state.drawPile.shift()!; // index 0 = ust
  if (card.id === state.taban.id)
    throw new ActionError('Taban kartı yalnızca masada kalır; çekilemez.');
  state.players[seat].hand.push(card);
  state.takeBlocked = false;
  state.phase = 'discard';
  return { handEnded: false };
}

function isWildCard(state: GameState, c: Card): boolean {
  return c.isJoker || c.id === state.taban.id;
}

function isBlockedDiscardForCiftci(state: GameState, c: Card): boolean {
  return c.isJoker || isTabanLikeCard(c, state.taban);
}

function ciftciCanTakeDiscard(
  state: GameState,
  player: GameState['players'][number],
  top: Card
): boolean {
  if (isBlockedDiscardForCiftci(state, top)) return false;
  // Gercek oyuncu: taban/joker haric her atigi alabilir.
  if (!player.isBot) return true;
  return discardHelpsCiftciPairs(player.hand, top, state.taban);
}

/** Deste bittikten sonra son atik alinamaz / sorulamaz (ciftci dahil). */
function deckEmptyBlocksDiscardTake(state: GameState): boolean {
  return state.drawPile.length === 0 && state.discardsMade > 0;
}

export function canTakeTopDiscard(state: GameState, seat: Seat): boolean {
  if (state.takeBlocked) return false;
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) return false;
  const player = state.players[seat];
  // Acilis karti: baslayan joker dahil alabilir (taban haric).
  if (state.discardsMade === 0 && seat === state.starterSeat)
    return top.id !== state.taban.id;
  if (deckEmptyBlocksDiscardTake(state)) return false;
  if (isWildCard(state, top)) return false;
  if (player.isCiftci) return ciftciCanTakeDiscard(state, player, top);
  return true;
}

/** Deste bos ve atik alinamazsa el otomatik biter. */
export function maybeAutoEndOnEmptyDeck(state: GameState): boolean {
  if (state.drawPile.length > 0 || state.phase !== 'draw') return false;
  if (canTakeTopDiscard(state, state.turnSeat)) return false;
  applyHandScore(state, scoreHand(state, null));
  return true;
}

// Atigi al. ask=true => atan oyuncuya sor; ask=false => sormadan al (ciftci olur).
export function takeDiscard(state: GameState, seat: Seat, ask: boolean): void {
  requireTurn(state, seat);
  if (state.pending) throw new ActionError('Bekleyen bir istek var.');
  if (state.phase !== 'draw') throw new ActionError('Şu an çekme/alma sırası değil.');
  if (state.takeBlocked) throw new ActionError('Bu atığı bu tur alamazsın, desteden çek.');
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) throw new ActionError('Atıkta kağıt yok.');
  const player = state.players[seat];

  // Yerdeki ilk acik kart: baslayan oyuncu alir (joker dahil; ciftci olmaz).
  if (state.discardsMade === 0) {
    if (seat !== state.starterSeat)
      throw new ActionError('Açılış kartını yalnızca başlayan oyuncu alabilir.');
    if (top.id === state.taban.id)
      throw new ActionError('Taban açılış kartı olarak alınamaz.');
    state.discardPile.pop();
    player.hand.push(top);
    state.phase = 'discard';
    return;
  }

  if (isWildCard(state, top))
    throw new ActionError('Atılan joker/taban alınamaz.');

  if (deckEmptyBlocksDiscardTake(state))
    throw new ActionError('Deste bitti — son atık alınamaz ve sorulamaz.');

  // Zaten ciftciyse sorulmadan dogrudan al (taban/joker haric; bot yalnizca ise yarayan).
  if (player.isCiftci) {
    if (!ciftciCanTakeDiscard(state, player, top)) {
      throw new ActionError(
        isBlockedDiscardForCiftci(state, top)
          ? 'Çiftçi atılan taban veya joker kağıdını alamaz.'
          : 'Bu atık çiftçiye yaramıyor; desteden çek.'
      );
    }
    state.discardPile.pop();
    player.hand.push(top);
    state.phase = 'discard';
    return;
  }

  // ask parametresi ciftci icin yok sayilir; yukarida ele alindi.
  if (ask) {
    if (isEarlyDiscardPhase(state.discardsMade))
      throw new ActionError('İlk 4 atık düşene kadar per sorulamaz.');
    if (isIslekDiscard(state, top))
      throw new ActionError('İşlek atık sorulamaz; yalnızca desteden çekebilirsin.');
    const discarderSeat = prevTurnSeat(seat);
    state.pending = { askerSeat: seat, discarderSeat, card: top };
    state.phase = 'await';
  } else {
    // sormadan al -> ciftci ol (per acan haric)
    if (player.openType === 'per')
      throw new ActionError('Per açtıktan sonra çiftçi olamazsın.');
    state.discardPile.pop();
    player.hand.push(top);
    markCiftci(state, seat);
    state.phase = 'discard';
  }
}

/** Atik sorulabilir mi? (islek / joker / taban / ciftci / erken faz engelleri) */
export function canAskForDiscard(state: GameState, seat: Seat): boolean {
  if (state.takeBlocked) return false;
  if (state.phase !== 'draw' || state.turnSeat !== seat) return false;
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) return false;
  const player = state.players[seat];
  if (player.isCiftci) return false;
  if (state.discardsMade === 0) return false;
  if (deckEmptyBlocksDiscardTake(state)) return false;
  if (isWildCard(state, top)) return false;
  if (isIslekDiscard(state, top)) return false;
  if (isEarlyDiscardPhase(state.discardsMade)) return false;
  return true;
}

// Atik istegine yanit (atan oyuncu). give=true ver, false verme.
export function respondDiscard(state: GameState, responderSeat: Seat, give: boolean): void {
  if (!state.pending) throw new ActionError('Bekleyen istek yok.');
  if (state.pending.discarderSeat !== responderSeat)
    throw new ActionError('Bu istek sana değil.');
  const { askerSeat, card } = state.pending;

  if (give) {
    // atik ustu hala ayni kart olmali
    const top = state.discardPile[state.discardPile.length - 1];
    if (top && top.id === card.id) state.discardPile.pop();
    state.players[askerSeat].hand.push(card);
    state.players[askerSeat].receivedAskDiscard = true;
    state.pending = null;
    state.turnSeat = askerSeat;
    state.phase = 'discard';
  } else {
    // verme -> atan ciftci olur (per acan haric); asker bu tur atigi alamaz
    const responder = state.players[responderSeat];
    if (responder.openType !== 'per') markCiftci(state, responderSeat);
    state.pending = null;
    state.takeBlocked = true;
    state.turnSeat = askerSeat;
    state.phase = 'draw';
  }
}

/** Sira sendeyken ciftce git deklarasyonu (atik almadan ciftci olunur). */
export function declareCiftci(state: GameState, seat: Seat): void {
  requireTurn(state, seat);
  if (state.pending) throw new ActionError('Bekleyen bir istek var.');
  if (state.phase !== 'draw' && state.phase !== 'discard')
    throw new ActionError('Şu an çifte git deklare edilemez.');
  const player = state.players[seat];
  if (player.isCiftci) throw new ActionError('Zaten çiftçisin.');
  if (player.hasOpened || player.openType === 'per')
    throw new ActionError('Per açtıktan sonra çifte gidemezsin.');
  markCiftci(state, seat);
}

export interface OpenMeldReq {
  type: MeldType;
  cardIds: string[];
}

// Acma: perleri masaya indir (baraj + escalation kontrolu). Sonra oyuncu kart atar.
export function openMelds(state: GameState, seat: Seat, reqs: OpenMeldReq[]): void {
  requireTurn(state, seat);
  if (state.pending) throw new ActionError('Bekleyen bir istek var.');
  if (state.phase !== 'discard')
    throw new ActionError('Açmak için önce kağıt çekmelisin.');
  requireNotEarlyForPerOpen(state);
  const player = state.players[seat];
  if (player.hasOpened) throw new ActionError('Bu el zaten açtın.');
  if (player.isCiftci) throw new ActionError('Çiftçi perle açamaz, sadece çift açabilir.');
  clearAskTakeObligation(player);
  if (reqs.length === 0) throw new ActionError('En az bir per gerekli.');

  const hand = player.hand;
  const used = new Set<string>();
  const built: Meld[] = [];
  let total = 0;

  for (const req of reqs) {
    const cards: Card[] = [];
    for (const id of req.cardIds) {
      if (used.has(id)) throw new ActionError('Bir kağıt birden fazla perde kullanılamaz.');
      const c = hand.find((h) => h.id === id);
      if (!c) throw new ActionError('Seçilen kağıt elinde yok.');
      used.add(id);
      cards.push(c);
    }
    const ordered =
      req.type === 'run' ? (buildRunOrder(cards) ?? cards) : cards;
    const res = validateMeld(req.type, ordered);
    if (!res.ok) throw new ActionError(res.error);
    total += res.points;
    built.push({
      id: newMeldId(seat),
      type: res.type,
      cards: ordered,
      ownerSeat: seat,
      points: res.points,
    });
  }

  const required = requiredOpenForGame(state);
  if (total < required)
    throw new ActionError(
      `Açış yetersiz: ${total} puan. Gerekli: en az ${required}.`
    );

  // Kartlari elden cikar, perleri masaya koy.
  player.hand = hand.filter((c) => !used.has(c.id));
  state.melds.push(...built);
  player.hasOpened = true;
  player.openType = 'per';
  player.openedValue = total;
  state.lastOpenerValue = total;
}

// Acildiktan sonra elden yeni per indir (baraj yok; en az bir kart atmak icin elde kalmali).
export function layMelds(state: GameState, seat: Seat, reqs: OpenMeldReq[]): void {
  requireTurn(state, seat);
  if (state.pending) throw new ActionError('Bekleyen bir istek var.');
  if (state.phase !== 'discard')
    throw new ActionError('Per indirmek için önce kağıt çekmelisin.');
  requireNotEarlyForPerOpen(state);
  const player = state.players[seat];
  if (!player.hasOpened) throw new ActionError('Per indirmek için önce açmalısın.');
  if (player.isCiftci) throw new ActionError('Çiftçi per indiremez.');
  if (player.openType === 'cift') throw new ActionError('Çifte giden oyuncu per indiremez.');
  if (reqs.length === 0) throw new ActionError('En az bir per gerekli.');

  const hand = player.hand;
  const used = new Set<string>();
  const built: Meld[] = [];

  for (const req of reqs) {
    const cards: Card[] = [];
    for (const id of req.cardIds) {
      if (used.has(id)) throw new ActionError('Bir kağıt birden fazla perde kullanılamaz.');
      const c = hand.find((h) => h.id === id);
      if (!c) throw new ActionError('Seçilen kağıt elinde yok.');
      used.add(id);
      cards.push(c);
    }
    const ordered =
      req.type === 'run' ? (buildRunOrder(cards) ?? cards) : cards;
    const res = validateMeld(req.type, ordered);
    if (!res.ok) throw new ActionError(res.error);
    built.push({
      id: newMeldId(seat),
      type: res.type,
      cards: ordered,
      ownerSeat: seat,
      points: res.points,
    });
  }

  const remaining = hand.filter((c) => !used.has(c.id)).length;
  if (remaining === 0)
    throw new ActionError('En az bir kağıt atmak için elde kalmalı; bitirmeyi kullan.');

  player.hand = hand.filter((c) => !used.has(c.id));
  state.melds.push(...built);
  if (player.receivedAskDiscard) clearAskTakeObligation(player);
  // lastOpenerValue guncellenmez — indirilen perler ek baraj sayilmaz.
}

// Acildiktan sonra elden yeni cift indir (escalation yok; en az bir kart atmak icin elde kalmali).
export function layPairs(state: GameState, seat: Seat, pairIdGroups: string[][]): void {
  requireTurn(state, seat);
  if (state.pending) throw new ActionError('Bekleyen bir istek var.');
  if (state.phase !== 'discard')
    throw new ActionError('Çift indirmek için önce kağıt çekmelisin.');
  requireNotEarlyForPairOpen(state);
  const player = state.players[seat];
  if (!player.hasOpened) throw new ActionError('Çift indirmek için önce açmalısın.');
  if (player.openType !== 'cift')
    throw new ActionError('Yalnızca çiftle açmış oyuncu çift indirebilir.');
  if (pairIdGroups.length === 0) throw new ActionError('En az bir çift gerekli.');

  const hand = player.hand;
  const used = new Set<string>();
  const builtPairs: Card[][] = [];

  for (const group of pairIdGroups) {
    if (group.length !== 2) throw new ActionError('Her çift tam 2 kağıt olmalı.');
    const cards: Card[] = [];
    for (const id of group) {
      if (used.has(id)) throw new ActionError('Bir kağıt birden fazla çiftte olamaz.');
      const c = hand.find((h) => h.id === id);
      if (!c) throw new ActionError('Seçilen kağıt elinde yok.');
      used.add(id);
      cards.push(c);
    }
    const res = validatePair(cards[0], cards[1], state.taban);
    if (!res.ok) throw new ActionError(res.error);
    builtPairs.push(cards);
  }

  const remaining = hand.filter((c) => !used.has(c.id)).length;
  if (remaining === 0)
    throw new ActionError('En az bir kağıt atmak için elde kalmalı; bitirmeyi kullan.');

  player.hand = hand.filter((c) => !used.has(c.id));
  player.pairs.push(...builtPairs);
  // lastPairCount yalnizca ciftle acilista guncellenir; indirilen ciftler baraji +1 yapmaz.
}

// Cift acma: her cift 2 kart id. 5/6/7 escalation, puana bakilmaz. Baraj -> 101.
export function openPairs(state: GameState, seat: Seat, pairIdGroups: string[][]): void {
  requireTurn(state, seat);
  if (state.pending) throw new ActionError('Bekleyen bir istek var.');
  if (state.phase !== 'discard')
    throw new ActionError('Açmak için önce kağıt çekmelisin.');
  requireNotEarlyForPairOpen(state);
  const player = state.players[seat];
  if (player.hasOpened) throw new ActionError('Bu el zaten açtın.');
  clearAskTakeObligation(player);

  const requiredPairs = requiredPairsForGame(state);
  if (pairIdGroups.length < requiredPairs)
    throw new ActionError(
      `Çift açış yetersiz: ${pairIdGroups.length} çift. Gerekli: en az ${requiredPairs}.`
    );

  const hand = player.hand;
  const used = new Set<string>();
  const builtPairs: Card[][] = [];

  for (const group of pairIdGroups) {
    if (group.length !== 2) throw new ActionError('Her çift tam 2 kağıt olmalı.');
    const cards: Card[] = [];
    for (const id of group) {
      if (used.has(id)) throw new ActionError('Bir kağıt birden fazla çiftte olamaz.');
      const c = hand.find((h) => h.id === id);
      if (!c) throw new ActionError('Seçilen kağıt elinde yok.');
      used.add(id);
      cards.push(c);
    }
    const res = validatePair(cards[0], cards[1], state.taban);
    if (!res.ok) throw new ActionError(res.error);
    builtPairs.push(cards);
  }

  player.hand = hand.filter((c) => !used.has(c.id));
  player.pairs = builtPairs;
  player.hasOpened = true;
  player.openType = 'cift';
  markCiftci(state, seat);
  state.lastPairCount = builtPairs.length;
}

function tryAddToMeld(
  meld: Meld,
  card: Card
): { cards: Card[]; points: number } | null {
  if (meld.type === 'group') {
    if (meld.cards.length >= 4) return null;
    const combined = [...meld.cards, card];
    const res = validateMeld('group', combined);
    return res.ok ? { cards: combined, points: res.points } : null;
  }
  const base = buildRunOrder(meld.cards) ?? meld.cards;
  if (base.length >= 5) return null;
  const front = [card, ...base];
  const rf = validateMeld('run', front);
  if (rf.ok) return { cards: front, points: rf.points };
  const back = [...base, card];
  const rb = validateMeld('run', back);
  if (rb.ok) return { cards: back, points: rb.points };
  return null;
}

/** Kart, perdeki jokerin temsil ettigi gercek karta denk geliyorsa islek sayilir. */
function cardMatchesMeldJoker(meld: Meld, card: Card): boolean {
  if (card.isJoker || !card.suit || !card.rank) return false;
  for (let i = 0; i < meld.cards.length; i++) {
    if (!meld.cards[i].isJoker) continue;
    if (meld.type === 'run') {
      const resolved = resolveJokerInRun(meld.cards, i);
      if (resolved && resolved.suit === card.suit && resolved.rank === card.rank) return true;
    } else {
      const resolved = resolveJokerInGroup(meld.cards);
      if (resolved && resolved.suit === card.suit && resolved.rank === card.rank) return true;
    }
  }
  return false;
}

function canUseCardOnMeld(meld: Meld, card: Card): boolean {
  return tryAddToMeld(meld, card) != null || cardMatchesMeldJoker(meld, card);
}

/** Yerde per varken kart bir pere islenebiliyor veya joker yerine gecebiliyorsa islek. */
export function isIslekDiscard(state: GameState, card: Card): boolean {
  if (state.melds.length === 0) return false;
  if (isWildCard(state, card)) return false;
  return state.melds.some((m) => canUseCardOnMeld(m, card));
}

/** Islek cezasi: acmamis veya per acip hic islememis atan yazar; islemis per oyuncu muaf. */
function throwerLiableForIslek(
  state: GameState,
  thrower: GameState['players'][number]
): boolean {
  if (!playerHasOpened(thrower, state)) return true;
  if (thrower.openType === 'per' && !thrower.hasProcessed) return true;
  return false;
}

function shouldApplyIslekPenalty(
  state: GameState,
  discarderSeat: Seat,
  card: Card
): boolean {
  if (!isIslekDiscard(state, card)) return false;
  // Deste bittikten sonra masada acilis varsa son atik islek sayilmaz.
  if (deckEmptyBlocksDiscardTake(state) && anyoneOpened(state)) return false;
  const thrower = state.players[discarderSeat];
  if (!throwerLiableForIslek(state, thrower)) return false;
  return true;
}

function applyIslekPenaltyOnDiscard(
  state: GameState,
  discarderSeat: Seat,
  card: Card
): void {
  if (!shouldApplyIslekPenalty(state, discarderSeat, card)) return;
  const team = state.players[discarderSeat].team;
  state.islekPenalty[team] += 71;
  state.islekEventId += 1;
  state.lastIslekSeat = discarderSeat;
}

// Kart at, sira sonraki oyuncuya gecer.
export function discardCard(state: GameState, seat: Seat, cardId: string): void {
  requireTurn(state, seat);
  if (state.pending) throw new ActionError('Bekleyen bir istek var.');
  if (state.phase !== 'discard') throw new ActionError('Önce kağıt almalısın.');
  const player = state.players[seat];
  const hand = player.hand;
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new ActionError('Bu kağıt elinde yok.');
  if (player.receivedAskDiscard) {
    // Sorarak alma yukumlulugu yalnizca henuz acmamis oyuncu icin: acmadan atarsa ciftci.
    if (!player.hasOpened) {
      markCiftci(state, seat);
    } else {
      clearAskTakeObligation(player);
    }
  }
  const [card] = hand.splice(idx, 1);
  applyIslekPenaltyOnDiscard(state, seat, card);
  state.discardPile.push(card);
  state.discardsMade += 1;
  state.lastDiscarderSeat = seat;

  state.takeBlocked = false;
  state.turnSeat = nextSeat(seat);
  state.phase = 'draw';
  maybeAutoEndOnEmptyDeck(state);
}

export interface FinishReq {
  melds?: OpenMeldReq[];
  pairs?: string[][];
  discardCardId?: string;
  /** Per/cift/atilacak kart otomatik bulunur (istemci veya bot). */
  auto?: boolean;
}

// Bitir: kalan per/ciftleri bir anda indir + 15. karti at.
export function finishHand(state: GameState, seat: Seat, req: FinishReq): void {
  requireTurn(state, seat);
  if (state.pending) throw new ActionError('Bekleyen bir istek var.');
  if (state.phase !== 'discard') throw new ActionError('Bitirmek için önce kağıt çekmelisin.');

  const player = state.players[seat];
  let meldReqs = req.melds ?? [];
  let pairGroups = req.pairs ?? [];
  let discardCardId = req.discardCardId ?? '';

  if (req.auto || (meldReqs.length === 0 && pairGroups.length === 0)) {
    let plan = findFinishPlan(state, player.hand, player);
    if (
      plan &&
      player.receivedAskDiscard &&
      (plan.melds?.length ?? 0) > 0
    ) {
      plan =
        findCiftFinishPlan(player.hand, state.taban, player.hasOpened) ?? null;
    }
    if (!plan) throw new ActionError('Elin per veya çift olarak bitirilemedi.');
    meldReqs = plan.melds ?? [];
    pairGroups = plan.pairs ?? [];
    discardCardId = plan.discardCardId;
  }

  if (!discardCardId) throw new ActionError('Atılacak kağıt belirtilmedi.');
  if (player.receivedAskDiscard && meldReqs.length > 0)
    throw new ActionError(
      'Sorarak alınan kartla perle bitiremezsin; per aç, çift aç veya çiftle bitir.'
    );
  const hand = player.hand;

  const discardIdx = hand.findIndex((c) => c.id === discardCardId);
  if (discardIdx === -1) throw new ActionError('Atılacak kağıt elinde yok.');
  const used = new Set<string>();
  used.add(discardCardId);
  if (player.isCiftci && meldReqs.length > 0)
    throw new ActionError('Çiftçi yalnızca çiftle bitebilir.');
  if (player.hasOpened && player.openType === 'cift' && meldReqs.length > 0)
    throw new ActionError('Çifte giden oyuncu yalnızca çiftle bitebilir.');
  if (player.hasOpened && player.openType === 'per' && pairGroups.length > 0)
    throw new ActionError('Perle açan oyuncu yalnızca perle bitebilir.');
  if (meldReqs.length > 0 && pairGroups.length > 0)
    throw new ActionError('Bitişte aynı anda hem per hem çift kullanılamaz.');

  const eldenAllowed = eldenFinishAllowed(state);

  // Perleri olustur.
  const built: Meld[] = [];
  let meldTotal = 0;
  for (const mr of meldReqs) {
    const cards: Card[] = [];
    for (const id of mr.cardIds) {
      if (used.has(id)) throw new ActionError('Bir kağıt birden fazla yerde kullanılamaz.');
      const c = hand.find((h) => h.id === id);
      if (!c) throw new ActionError('Seçilen kağıt elinde yok.');
      used.add(id);
      cards.push(c);
    }
    const ordered =
      mr.type === 'run' ? (buildRunOrder(cards) ?? cards) : cards;
    const res = validateMeld(mr.type, ordered);
    if (!res.ok) throw new ActionError(res.error);
    meldTotal += res.points;
    built.push({
      id: newMeldId(seat),
      type: res.type,
      cards: ordered,
      ownerSeat: seat,
      points: res.points,
    });
  }

  // Ciftleri olustur.
  const builtPairs: Card[][] = [];
  for (const group of pairGroups) {
    if (group.length !== 2) throw new ActionError('Her çift tam 2 kağıt olmalı.');
    const cards: Card[] = [];
    for (const id of group) {
      if (used.has(id)) throw new ActionError('Bir kağıt birden fazla yerde kullanılamaz.');
      const c = hand.find((h) => h.id === id);
      if (!c) throw new ActionError('Seçilen kağıt elinde yok.');
      used.add(id);
      cards.push(c);
    }
    const res = validatePair(cards[0], cards[1], state.taban);
    if (!res.ok) throw new ActionError(res.error);
    builtPairs.push(cards);
  }

  // Perden bitis: acilmamis oyuncu baraj+escalation saglamali. Elden bitiste baraj yok (§8.1).
  if (!player.hasOpened && meldReqs.length > 0 && !eldenAllowed) {
    const required = requiredOpenForGame(state);
    if (meldTotal < required)
      throw new ActionError(
        `Perden bitiş için açış yetersiz: ${meldTotal} puan (en az ${required}). Elden bitişte baraj aranmaz; masada kimse açmamış olmalı.`
      );
  }

  // Tum el (atilacak haric) kullanilmis olmali.
  if (used.size !== hand.length)
    throw new ActionError('Bitirmek için elindeki tüm kağıtları per/çift olarak indirmelisin.');

  const wasElden = eldenAllowed;
  const discardCard = hand[discardIdx];

  // Masaya koy / acilis durumunu guncelle.
  if (built.length > 0) {
    state.melds.push(...built);
    if (!player.hasOpened) {
      player.hasOpened = true;
      player.openType = 'per';
      player.openedValue = meldTotal;
      state.lastOpenerValue = meldTotal;
    }
  }
  if (builtPairs.length > 0) {
    player.pairs.push(...builtPairs);
    if (!player.hasOpened) {
      player.hasOpened = true;
      player.openType = 'cift';
      markCiftci(state, seat);
      state.lastPairCount = player.pairs.length;
    }
  }

  const eldenFinish = wasElden;
  const ciftFinish = player.openType === 'cift' || player.pairs.length >= 7;
  const finishType: FinishInfo['finishType'] = ciftFinish
    ? 'cift'
    : eldenFinish
      ? 'elden'
      : 'per';

  player.hand = hand.filter((c) => !used.has(c.id));
  state.discardPile.push(discardCard);
  state.discardsMade += 1;
  state.lastDiscarderSeat = seat;

  const finishInfo: FinishInfo = {
    winnerSeat: seat,
    finishType,
    eldenFinish,
    ciftFinish,
    jokerDiscard: discardCard.isJoker,
    finisherOpenValue:
      player.openType === 'per' ? player.openedValue || meldTotal : 0,
    finisherPairCount: player.pairs.length,
  };

  clearAskTakeObligation(player);
  applyHandScore(state, scoreHand(state, finishInfo));
}

function requireCanProcess(state: GameState, seat: Seat): void {
  requireTurn(state, seat);
  if (state.pending) throw new ActionError('Bekleyen bir istek var.');
  if (state.phase !== 'discard')
    throw new ActionError('İşlemek için önce kağıt çekmelisin.');
  const player = state.players[seat];
  if (!player.hasOpened) throw new ActionError('İşlemek için önce açmalısın.');
  if (player.isCiftci) throw new ActionError('Çiftçi işleyemez.');
}

export interface ProcessHandOp {
  meldId: string;
  cardId: string;
}

function applyProcessFromHand(
  state: GameState,
  seat: Seat,
  meldId: string,
  cardId: string
): void {
  const player = state.players[seat];
  const meld = state.melds.find((m) => m.id === meldId);
  if (!meld) throw new ActionError('Per bulunamadı.');
  const idx = player.hand.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new ActionError('Bu kağıt elinde yok.');
  const added = tryAddToMeld(meld, player.hand[idx]);
  if (!added) throw new ActionError('Bu kağıt bu pere işlenemez.');
  player.hand.splice(idx, 1);
  meld.cards = added.cards;
  meld.points = added.points;
}

// Isleme: elden bir veya birden fazla karti perlere ekle (ceza yok).
export function processFromHand(
  state: GameState,
  seat: Seat,
  meldId: string,
  cardId: string
): void {
  processFromHandBatch(state, seat, [{ meldId, cardId }]);
}

export function processFromHandBatch(
  state: GameState,
  seat: Seat,
  ops: ProcessHandOp[]
): void {
  requireCanProcess(state, seat);
  if (ops.length === 0) throw new ActionError('İşlenecek kağıt yok.');
  const player = state.players[seat];
  if (player.hand.length - ops.length < 1)
    throw new ActionError('Atmak için en az bir kağıt kalmalı.');
  const used = new Set<string>();
  for (const op of ops) {
    if (used.has(op.cardId))
      throw new ActionError('Bir kağıt aynı işlemde birden fazla kullanılamaz.');
    used.add(op.cardId);
    applyProcessFromHand(state, seat, op.meldId, op.cardId);
  }
  player.hasProcessed = true;
}

// Atik ustundeki karti bir pere isle (islek cezasi atista yazilir, burada degil).
export function processFromDiscard(
  state: GameState,
  seat: Seat,
  meldId: string
): void {
  requireCanProcess(state, seat);
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) throw new ActionError('Atıkta kağıt yok.');
  if (isWildCard(state, top)) throw new ActionError('Joker/taban işlenemez.');
  if (state.lastDiscarderSeat == null)
    throw new ActionError('Bu kağıt işlenemez.');
  const meld = state.melds.find((m) => m.id === meldId);
  if (!meld) throw new ActionError('Per bulunamadı.');
  const added = tryAddToMeld(meld, top);
  if (!added) throw new ActionError('Bu kağıt bu pere işlenemez.');
  state.discardPile.pop();
  meld.cards = added.cards;
  meld.points = added.points;
  state.players[seat].hasProcessed = true;
}

function requireDiscardPhase(state: GameState, seat: Seat): void {
  requireTurn(state, seat);
  if (state.pending) throw new ActionError('Bekleyen bir istek var.');
  if (state.phase !== 'discard')
    throw new ActionError('Bu işlem için önce kağıt çekmelisin.');
}

function canSwapJokerOnMeld(state: GameState, seat: Seat, meld: Meld): boolean {
  const player = state.players[seat];
  const owner = state.players[meld.ownerSeat];

  if (meld.type === 'run') {
    return player.openType === 'per' || player.openType === 'cift';
  }

  const jokers = meld.cards.filter((c) => c.isJoker).length;
  if (jokers === 0) return false;
  const reals = meld.cards.length - jokers;

  // 2 gercek + joker: yalnizca peri acan (per sahibi)
  if (meld.cards.length === 3 && reals === 2) {
    return seat === meld.ownerSeat && owner.openType === 'per';
  }
  // 3 gercek + joker: per sahibi veya ciftci
  if (meld.cards.length === 4 && reals === 3) {
    if (seat === meld.ownerSeat && owner.openType === 'per') return true;
    if (player.isCiftci && player.hasOpened) return true;
    return false;
  }
  return false;
}

function canSwapWildInPair(
  state: GameState,
  seat: Seat,
  ownerSeat: Seat
): boolean {
  const player = state.players[seat];
  const owner = state.players[ownerSeat];
  if (player.openType === 'per' && player.hasOpened) return true;
  if (
    player.isCiftci &&
    player.openType === 'cift' &&
    player.hasOpened &&
    player.pairs.length > owner.pairs.length
  )
    return true;
  return false;
}

// Joker el degistirme: perdeki jokeri gercek kartla degistir, jokeri ele al.
export function swapJokerInMeld(
  state: GameState,
  seat: Seat,
  meldId: string,
  cardId: string
): void {
  requireDiscardPhase(state, seat);
  const player = state.players[seat];
  if (!player.hasOpened) throw new ActionError('Joker almak için önce açmalısın.');

  const meld = state.melds.find((m) => m.id === meldId);
  if (!meld) throw new ActionError('Per bulunamadı.');
  const jIdx = meld.cards.findIndex((c) => c.isJoker);
  if (jIdx === -1) throw new ActionError('Bu perde joker yok.');
  if (!canSwapJokerOnMeld(state, seat, meld))
    throw new ActionError('Bu perdeki jokeri alamazsın.');

  const handIdx = player.hand.findIndex((c) => c.id === cardId);
  if (handIdx === -1) throw new ActionError('Bu kağıt elinde yok.');
  const card = player.hand[handIdx];
  if (card.isJoker) throw new ActionError('Joker ile joker değiştirilemez.');

  const expected =
    meld.type === 'run'
      ? resolveJokerInRun(meld.cards, jIdx)
      : resolveJokerInGroup(meld.cards);
  if (!expected) throw new ActionError('Joker çözümlenemedi.');
  if (card.suit !== expected.suit || card.rank !== expected.rank)
    throw new ActionError('Bu kağıt jokerin yerine geçemez.');

  const joker = meld.cards[jIdx];
  meld.cards[jIdx] = card;
  player.hand.splice(handIdx, 1);
  player.hand.push(joker);

  const res = validateMeld(meld.type, meld.cards);
  if (!res.ok) throw new ActionError(res.error);
  meld.points = res.points;
}

// Cifte wild (joker/taban) el degistirme.
export function swapWildInPair(
  state: GameState,
  seat: Seat,
  ownerSeat: Seat,
  pairIndex: number,
  cardId: string
): void {
  requireDiscardPhase(state, seat);
  const player = state.players[seat];
  if (!player.hasOpened) throw new ActionError('Joker almak için önce açmalısın.');
  if (!canSwapWildInPair(state, seat, ownerSeat))
    throw new ActionError('Bu çifteki jokeri alamazsın.');

  const owner = state.players[ownerSeat];
  const pair = owner.pairs[pairIndex];
  if (!pair) throw new ActionError('Çift bulunamadı.');
  const wIdx = findWildIndex(pair, state.taban);
  if (wIdx === -1) throw new ActionError('Bu çiftte joker/taban yok.');

  const expected = resolveWildInPair(pair, state.taban);
  if (!expected) throw new ActionError('Wild çözümlenemedi.');

  const handIdx = player.hand.findIndex((c) => c.id === cardId);
  if (handIdx === -1) throw new ActionError('Bu kağıt elinde yok.');
  const card = player.hand[handIdx];
  if (card.isJoker || card.id === state.taban.id)
    throw new ActionError('Wild ile wild değiştirilemez.');
  if (card.suit !== expected.suit || card.rank !== expected.rank)
    throw new ActionError('Bu kağıt çiftin yerine geçemez.');

  const wild = pair[wIdx];
  pair[wIdx] = card;
  player.hand.splice(handIdx, 1);
  player.hand.push(wild);
}
