import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card, GameView, Seat } from '../types';
import { socket } from '../socket';
import { arrangeHand, type SortMode } from '../handSort';
import { detectAndBuildMeld, type BuiltMeld } from '../meldBuild';
import { CardBack, CardView } from './CardView';
import { MeldsArea } from './MeldsArea';
import { HandCards } from './HandCards';
import { HandResult } from './HandResult';
import { EndHandsPanel } from './EndHandsPanel';
import { Scoreboard } from './Scoreboard';

const POSITIONS = ['bottom', 'left', 'top', 'right'] as const;

// Istemci tarafi cift on-dogrulamasi (sunucu yine dogrular).
function isPairWildClient(c: Card, taban: Card): boolean {
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

function validatePairClient(a: Card, b: Card, taban: Card): string | null {
  if (!a || !b) return 'Çift için 2 kağıt gerekli.';
  if (a.id === b.id) return 'Aynı kağıt iki kez kullanılamaz.';
  const aw = isPairWildClient(a, taban);
  const bw = isPairWildClient(b, taban);
  if (aw && bw) return 'Çiftte iki wild olamaz.';
  if (!aw && !bw && !(a.suit === b.suit && a.rank === b.rank))
    return 'Çift birebir aynı kağıt olmalı.';
  return null;
}

function seatOpenLabel(p: GameView['seats'][number]): { long: string; short: string } | null {
  if (!p.hasOpened) return null;
  if (p.openType === 'cift') {
    return { long: `çift açtı (${p.pairCount})`, short: `Ç${p.pairCount}` };
  }
  if (p.openType === 'per') {
    return { long: `per açtı (${p.openedValue})`, short: `P${p.openedValue}` };
  }
  return { long: 'açık', short: 'A' };
}

export function GameTable({ game }: { game: GameView }) {
  const me = game.yourSeat;
  const meInfo = game.seats[me];
  const myTurn = game.turnSeat === me;
  const [sortMode, setSortMode] = useState<SortMode>('per');
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Acma modu durumu
  const [openMode, setOpenMode] = useState(false);
  const [openKind, setOpenKind] = useState<'per' | 'cift' | 'lay' | 'layCift'>('per');
  const [currentSel, setCurrentSel] = useState<string[]>([]);
  const [staged, setStaged] = useState<BuiltMeld[]>([]);
  const [stagedPairs, setStagedPairs] = useState<Card[][]>([]);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  // Isleme modu (M5)
  const [processMode, setProcessMode] = useState<'off' | 'hand' | 'discard'>('off');
  const [processCardIds, setProcessCardIds] = useState<string[]>([]);
  const [processStaged, setProcessStaged] = useState<{ meldId: string; cardId: string }[]>([]);
  const [jokerMode, setJokerMode] = useState(false);
  const [jokerCardId, setJokerCardId] = useState<string | null>(null);

  const canDraw = myTurn && game.phase === 'draw';
  const EARLY_DISCARD_LIMIT = 4;
  const earlyPhase = game.discardsMade < EARLY_DISCARD_LIMIT;
  const isOpeningTake =
    canDraw && game.discardsMade === 0 && game.turnSeat === game.starterSeat;
  const deckEmpty = game.drawCount === 0;
  const canDrawFromPile = canDraw && (deckEmpty || game.drawTopBack != null);
  const canDiscard = myTurn && game.phase === 'discard';
  const canOpenPer = canDiscard && !meInfo.hasOpened && !meInfo.isCiftci && !earlyPhase;
  const canOpenPairs = canDiscard && !meInfo.hasOpened && !earlyPhase;
  const canLayPer =
    canDiscard &&
    meInfo.hasOpened &&
    !meInfo.isCiftci &&
    meInfo.openType === 'per' &&
    !earlyPhase;
  const canLayPairs =
    canDiscard && meInfo.hasOpened && meInfo.openType === 'cift' && !earlyPhase;
  const canDeclareCift =
    myTurn &&
    !meInfo.isCiftci &&
    !meInfo.hasOpened &&
    !game.pending &&
    (game.phase === 'draw' || game.phase === 'discard') &&
    !openMode;
  const required = game.requiredOpen;
  const requiredPairs = game.requiredPairs;
  const discardTakeable =
    game.discardTop != null &&
    !deckEmpty &&
    (isOpeningTake
      ? game.discardTop.id !== game.taban.id
      : meInfo.isCiftci
        ? !game.discardTop.isJoker &&
          !isPairWildClient(game.discardTop, game.taban)
        : !game.discardTop.isJoker && game.discardTop.id !== game.taban.id);
  const pendingForMe = game.pending?.discarderSeat === me;
  const iAsked = game.pending?.askerSeat === me;
  const canProcess =
    canDiscard && meInfo.hasOpened && !meInfo.isCiftci && game.melds.length > 0;
  const handEnded = game.phase === 'ended';
  const finisherSeat = game.handResult?.finishInfo?.winnerSeat ?? null;
  const canFinishAction = canDiscard;
  const seesAllDiscards = game.visibleDiscards != null || meInfo.isCiftci;
  const bothTeamsCiftci =
    game.bothTeamsCiftci ||
    (game.seats.some((p) => p.team === 0 && p.isCiftci) &&
      game.seats.some((p) => p.team === 1 && p.isCiftci));
  const canSwapJoker = canDiscard && meInfo.hasOpened;
  const pairHasWild = (pr: Card[]) => pr.some((c) => isPairWildClient(c, game.taban));
  const hasTableWild =
    game.melds.some((m) => m.cards.some((c) => c.isJoker)) ||
    game.seats.some((p) => p.pairs.some(pairHasWild));

  // Acilis tamamlaninca modu sifirla
  useEffect(() => {
    if (meInfo.hasOpened) {
      setOpenMode(false);
      setStaged([]);
      setStagedPairs([]);
      setCurrentSel([]);
    }
  }, [meInfo.hasOpened]);

  // Sira/faz degisince isleme/joker modunu kapat
  useEffect(() => {
    if (!canDiscard) {
      setProcessMode('off');
      setProcessCardIds([]);
      setProcessStaged([]);
      setJokerMode(false);
      setJokerCardId(null);
    }
  }, [canDiscard]);

  // Ciftci deklarasyonu: bir oyuncu ilk kez ciftci olunca tek seferlik bildirim.
  const [toast, setToast] = useState<string | null>(null);
  const prevCiftciRef = useRef<boolean[]>([]);
  const prevIslekEventRef = useRef(0);
  const cutterToastHandRef = useRef(0);
  useEffect(() => {
    const prev = prevCiftciRef.current;
    for (const p of game.seats) {
      if (p.isCiftci && prev[p.seat] === false) {
        setToast(`${p.name} çiftçi oldu.`);
        window.clearTimeout((setToast as unknown as { _t?: number })._t);
        (setToast as unknown as { _t?: number })._t = window.setTimeout(
          () => setToast(null),
          3500
        );
      }
    }
    prevCiftciRef.current = game.seats.map((p) => p.isCiftci);
  }, [game.seats]);

  useEffect(() => {
    setToast((t) => (t === 'Bitiş aranıyor…' ? null : t));
  }, [game]);

  useEffect(() => {
    const onActionError = (p: { message: string }) => {
      setLocalMsg(p.message);
      setToast(p.message);
      window.clearTimeout((setToast as unknown as { _errT?: number })._errT);
      (setToast as unknown as { _errT?: number })._errT = window.setTimeout(
        () => setToast(null),
        4000
      );
    };
    socket.on('error', onActionError);
    return () => {
      socket.off('error', onActionError);
    };
  }, []);

  useEffect(() => {
    const eventId = game.islekEventId ?? 0;
    if (eventId > prevIslekEventRef.current && game.lastIslekSeat != null) {
      const thrower = game.seats[game.lastIslekSeat];
      const msg =
        game.lastIslekSeat === me
          ? 'İşlek 71'
          : `${thrower.name} işlek attı — 71`;
      setToast(msg);
      window.clearTimeout((setToast as unknown as { _islekT?: number })._islekT);
      (setToast as unknown as { _islekT?: number })._islekT = window.setTimeout(
        () => setToast(null),
        3000
      );
    }
    prevIslekEventRef.current = eventId;
  }, [game.islekEventId, game.lastIslekSeat, game.seats, me]);

  useEffect(() => {
    if (!game.cutterJokerTaken) return;
    if (cutterToastHandRef.current === game.handNumber) return;
    cutterToastHandRef.current = game.handNumber;
    const cutter = game.seats[game.cutterSeat];
    setToast(`${cutter.name} keserken joker aldı`);
    window.clearTimeout((setToast as unknown as { _cutterT?: number })._cutterT);
    (setToast as unknown as { _cutterT?: number })._cutterT = window.setTimeout(
      () => setToast(null),
      3500
    );
  }, [game.handNumber, game.cutterJokerTaken, game.cutterSeat, game.seats]);

  const stagedIds = useMemo(
    () =>
      new Set([
        ...staged.flatMap((m) => m.cards.map((c) => c.id)),
        ...stagedPairs.flatMap((pr) => pr.map((c) => c.id)),
      ]),
    [staged, stagedPairs]
  );

  // Goruntu sirasi: 'none' ise manuel siralama, degilse otomatik dizim.
  // Her durumda eldeki gercek kagitlarla uzlastirilir (yeni cekilenler sona eklenir).
  const displayHand = useMemo(() => {
    const handIds = game.yourHand.map((c) => c.id);
    const base =
      sortMode === 'none'
        ? manualOrder
        : arrangeHand(game.yourHand, sortMode).map((c) => c.id);
    const ordered = base.filter((id) => handIds.includes(id));
    for (const id of handIds) if (!ordered.includes(id)) ordered.push(id);
    const byId = new Map(game.yourHand.map((c) => [c.id, c]));
    return ordered.map((id) => byId.get(id)!);
  }, [game.yourHand, sortMode, manualOrder]);

  const handleReorder = (newIds: string[]) => {
    // Suruklenen sadece gorunur (staged olmayan) kagitlar; digerlerini koru.
    const hidden = game.yourHand.map((c) => c.id).filter((id) => !newIds.includes(id));
    setManualOrder([...newIds, ...hidden]);
    setSortMode('none');
  };

  const handCardsForDisplay = useMemo(
    () => displayHand.filter((c) => !stagedIds.has(c.id)),
    [displayHand, stagedIds]
  );

  const stagedTotal = staged.reduce((s, m) => s + m.points, 0);

  const cardById = (id: string): Card | undefined =>
    game.yourHand.find((c) => c.id === id);

  const onCardClick = (c: Card) => {
    if (openMode) {
      if (stagedIds.has(c.id)) return;
      setCurrentSel((prev) =>
        prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
      );
    } else if (processMode === 'hand') {
      setProcessCardIds((prev) =>
        prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
      );
    } else if (jokerMode) {
      setJokerCardId((prev) => (prev === c.id ? null : c.id));
    } else if (canDiscard) {
      setSelectedId((prev) => (prev === c.id ? null : c.id));
    }
  };

  const addMeld = () => {
    setLocalMsg(null);
    const cards = currentSel.map(cardById).filter(Boolean) as Card[];
    const res = detectAndBuildMeld(cards);
    if ('error' in res) {
      setLocalMsg(res.error);
      return;
    }
    setStaged((prev) => [...prev, res]);
    setCurrentSel([]);
  };

  const canOrganizeHand =
    !openMode && processMode === 'off' && !jokerMode;

  const addPair = () => {
    setLocalMsg(null);
    if (currentSel.length !== 2) {
      setLocalMsg('Çift için tam 2 kağıt seç.');
      return;
    }
    const cards = currentSel.map(cardById).filter(Boolean) as Card[];
    const err = validatePairClient(cards[0], cards[1], game.taban);
    if (err) {
      setLocalMsg(err);
      return;
    }
    setStagedPairs((prev) => [...prev, cards]);
    setCurrentSel([]);
  };

  const confirmOpen = () => {
    if (staged.length === 0) {
      setLocalMsg('En az bir per ekle.');
      return;
    }
    socket.emit('meld:open', {
      melds: staged.map((m) => ({ type: m.type, cardIds: m.cards.map((c) => c.id) })),
    });
  };

  const confirmLayMelds = () => {
    if (staged.length === 0) {
      setLocalMsg('En az bir per ekle.');
      return;
    }
    const used = new Set(staged.flatMap((m) => m.cards.map((c) => c.id)));
    const left = game.yourHand.filter((c) => !used.has(c.id)).length;
    if (left === 0) {
      setLocalMsg('En az bir kağıt atmak için elde kalmalı; bitirmeyi kullan.');
      return;
    }
    socket.emit('meld:lay', {
      melds: staged.map((m) => ({ type: m.type, cardIds: m.cards.map((c) => c.id) })),
    });
  };

  const confirmLayPairs = () => {
    if (stagedPairs.length === 0) {
      setLocalMsg('En az bir çift ekle.');
      return;
    }
    const used = new Set(stagedPairs.flatMap((pr) => pr.map((c) => c.id)));
    const left = game.yourHand.filter((c) => !used.has(c.id)).length;
    if (left === 0) {
      setLocalMsg('En az bir kağıt atmak için elde kalmalı; bitirmeyi kullan.');
      return;
    }
    socket.emit('meld:layPairs', {
      pairs: stagedPairs.map((pr) => pr.map((c) => c.id)),
    });
  };

  const confirmOpenPairs = () => {
    if (stagedPairs.length < requiredPairs) {
      setLocalMsg(`En az ${requiredPairs} çift gerekli.`);
      return;
    }
    socket.emit('meld:openPairs', {
      pairs: stagedPairs.map((pr) => pr.map((c) => c.id)),
    });
  };

  const cancelOpen = () => {
    setOpenMode(false);
    setStaged([]);
    setStagedPairs([]);
    setCurrentSel([]);
    setLocalMsg(null);
  };

  const startOpen = (kind: 'per' | 'cift' | 'lay' | 'layCift') => {
    setOpenKind(kind);
    setOpenMode(true);
    setStaged([]);
    setStagedPairs([]);
    setCurrentSel([]);
    setLocalMsg(null);
  };

  const takeDiscard = (ask: boolean) =>
    socket.emit('turn:takeDiscard', { ask: meInfo.isCiftci ? false : ask });

  /** Ciftci: atiga tikla, sormadan dogrudan al. Acilis karti ayri kural. */
  const takeTopDiscard = () => {
    if (!canDraw || !discardTakeable) return;
    if (isOpeningTake) {
      takeDiscard(true);
      return;
    }
    if (meInfo.isCiftci) {
      takeDiscard(false);
      return;
    }
    setLocalMsg('Atığı almak için aşağıdan "Sorarak al" veya "Sormadan al (çiftçi ol)" seç.');
  };
  const respond = (give: boolean) => socket.emit('discard:respond', { give });

  const startProcess = (mode: 'hand' | 'discard') => {
    setProcessMode(mode);
    setProcessCardIds([]);
    setProcessStaged([]);
    setSelectedId(null);
    setJokerMode(false);
    setJokerCardId(null);
    setLocalMsg(null);
  };
  const cancelProcess = () => {
    setProcessMode('off');
    setProcessCardIds([]);
    setProcessStaged([]);
  };
  const confirmProcess = () => {
    if (processStaged.length === 0) {
      setLocalMsg('İşlenecek kağıt ekle.');
      return;
    }
    socket.emit('meld:processHand', { meldId: '', ops: processStaged });
    setProcessStaged([]);
    setProcessCardIds([]);
    setLocalMsg(null);
  };
  const startJoker = () => {
    setJokerMode(true);
    setJokerCardId(null);
    setProcessMode('off');
    setProcessCardIds([]);
    setProcessStaged([]);
    setSelectedId(null);
    setLocalMsg(null);
  };
  const cancelJoker = () => {
    setJokerMode(false);
    setJokerCardId(null);
  };
  const onMeldClick = (meldId: string) => {
    if (processMode === 'hand') {
      if (processCardIds.length === 0) {
        setLocalMsg('Önce elinden işlenecek kağıdı seç.');
        return;
      }
      setProcessStaged((prev) => {
        const used = new Set(prev.map((op) => op.cardId));
        const fresh = processCardIds.filter((cardId) => !used.has(cardId));
        if (fresh.length === 0) {
          setLocalMsg('Bu kağıtlar zaten işleme sırasında.');
          return prev;
        }
        return [
          ...prev,
          ...fresh.map((cardId) => ({ meldId, cardId })),
        ];
      });
      setProcessCardIds([]);
      setLocalMsg(null);
    } else if (processMode === 'discard') {
      socket.emit('meld:processDiscard', { meldId });
      setProcessMode('off');
    } else if (jokerMode) {
      if (!jokerCardId) {
        setLocalMsg('Önce elinden jokerin yerine koyacağın kağıdı seç.');
        return;
      }
      socket.emit('meld:swapJoker', { meldId, cardId: jokerCardId });
      setJokerCardId(null);
    }
  };
  const onPairClick = (ownerSeat: Seat, pairIndex: number) => {
    if (!jokerMode) return;
    if (!jokerCardId) {
      setLocalMsg('Önce elinden jokerin yerine koyacağın kağıdı seç.');
      return;
    }
    socket.emit('meld:swapJokerPair', {
      ownerSeat,
      pairIndex,
      cardId: jokerCardId,
    });
    setJokerCardId(null);
  };

  const doDiscard = () => {
    if (selectedId) {
      socket.emit('turn:discard', { cardId: selectedId });
      setSelectedId(null);
    }
  };

  const tryAutoFinish = () => {
    setLocalMsg(null);
    setToast('Bitiş aranıyor…');
    socket.emit('meld:finish', { auto: true });
  };

  return (
    <div className={`game ${handEnded ? 'hand-ended' : ''}`}>
      {toast && <div className="toast">{toast}</div>}
      <div className="game-info">
        <span>El {game.handNumber}/13</span>
        <span>Dağıtan: {game.seats[game.dealerSeat].name}</span>
        {game.cutterJokerTaken && (
          <span className="cutter-joker-info">
            Kesen: {game.seats[game.cutterSeat].name} — joker aldı
          </span>
        )}
        <span>
          Takım 1: {game.teamScores[0]} / Takım 2: {game.teamScores[1]}
        </span>
        {((game.islekPenalty?.[0] ?? 0) > 0 || (game.islekPenalty?.[1] ?? 0) > 0) && (
          <span className="islek-info">
            İşlek — T1: {game.islekPenalty?.[0] ?? 0} / T2: {game.islekPenalty?.[1] ?? 0}
          </span>
        )}
        {(seesAllDiscards || bothTeamsCiftci) && (
          <span className="ciftci-visibility-tag">
            {bothTeamsCiftci
              ? 'Her iki takımda çiftçi — tüm atıklar görünür'
              : meInfo.isCiftci
                ? 'Çiftçi — tüm atıkları görüyorsun'
                : 'Tüm atıklar görünür'}
          </span>
        )}
      </div>

      <div className="table game-felt-table">
        <div className="center-area">
          <div className="pile">
            <button
              className={`pile-btn ${canDrawFromPile ? 'active' : ''} ${deckEmpty ? 'deck-empty' : ''}`}
              onClick={() => canDrawFromPile && socket.emit('turn:drawPile')}
              disabled={!canDrawFromPile}
              title={deckEmpty ? 'Deste bitti — eli kapat' : 'Desteden çek'}
            >
              {deckEmpty ? (
                <div className="card empty-slot deck-end-slot">El sonu</div>
              ) : game.drawTopBack ? (
                <CardBack back={game.drawTopBack} />
              ) : (
                <div className="card empty-slot" />
              )}
            </button>
            <span className="pile-label">Deste ({game.drawCount})</span>
          </div>
          <div className="pile">
            <button
              className={`pile-btn ${canDraw && discardTakeable ? 'active' : ''}`}
              onClick={takeTopDiscard}
              disabled={!canDraw || !discardTakeable}
              title={
                meInfo.isCiftci
                  ? 'Atığı al (çiftçi — sormadan)'
                  : 'Atığı iste (atan oyuncuya sor)'
              }
            >
              {game.discardTop ? (
                <CardView card={game.discardTop} />
              ) : (
                <div className="card empty-slot" />
              )}
            </button>
            <span className="pile-label">Atık ({game.discardCount})</span>
          </div>
          <div className="pile">
            <CardView card={game.taban} />
            <span className="pile-label">Taban</span>
          </div>
        </div>

        {POSITIONS.map((pos, i) => {
          const seat = ((me + i) % 4) as Seat;
          const p = game.seats[seat];
          const isMe = seat === me;
          const isTurn = seat === game.turnSeat;
          return (
            <div
              key={seat}
              className={`gseat gseat-${pos} team-${p.team} ${isTurn ? 'turn' : ''}`}
            >
              <div className="gseat-label">
                <span className="gseat-name" title={p.name}>
                  {p.name}
                </span>
                <div className="gseat-tags">
                  {p.isBot && (
                    <span className="tag">
                      <span className="tag-long">bot</span>
                      <span className="tag-short">B</span>
                    </span>
                  )}
                  {!p.isBot && !p.connected && (
                    <span className="tag disconnected">
                      <span className="tag-long">kopuk</span>
                      <span className="tag-short">!</span>
                    </span>
                  )}
                  {isMe && (
                    <span className="tag you">
                      <span className="tag-long">sen</span>
                      <span className="tag-short">S</span>
                    </span>
                  )}
                  {(() => {
                    const open = seatOpenLabel(p);
                    if (!open) return null;
                    return (
                      <span className="tag opened" title={open.long}>
                        <span className="tag-long">{open.long}</span>
                        <span className="tag-short">{open.short}</span>
                      </span>
                    );
                  })()}
                  {p.isCiftci && (
                    <span className="tag ciftci">
                      <span className="tag-long">çiftçi</span>
                      <span className="tag-short">Çf</span>
                    </span>
                  )}
                  {isTurn && (
                    <span className="tag turn-tag">
                      <span className="tag-long">sıra</span>
                      <span className="tag-short">●</span>
                    </span>
                  )}
                </div>
              </div>
              {!isMe && !handEnded && (
                <>
                  <div className="opp-hand">
                    {p.backs.map((b, k) => (
                      <CardBack key={k} back={b} small />
                    ))}
                  </div>
                  <span className="count-badge">{p.handCount} kağıt</span>
                </>
              )}
              {handEnded && !isMe && (
                <span className="count-badge muted">
                  {finisherSeat === seat ? 'bitirdi' : `${p.handCount} kağıt`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <MeldsArea
        melds={game.melds}
        seats={game.seats}
        clickable={processMode !== 'off' || jokerMode}
        jokerOnly={jokerMode}
        onMeldClick={onMeldClick}
      />

      {game.seats.some((p) => p.pairs.length > 0) && (
        <div className="pairs-area">
          {game.seats
            .filter((p) => p.pairs.length > 0)
            .map((p) => (
              <div key={p.seat} className={`pairs-owner team-${p.team}`}>
                <span className="pairs-owner-name">
                  {p.name} — {p.pairs.length} çift
                </span>
                <div className="pairs-list">
                  {p.pairs.map((pr, idx) => (
                    <div
                      key={idx}
                      className={`pair-group ${jokerMode && pairHasWild(pr) ? 'clickable' : ''}`}
                      onClick={
                        jokerMode && pairHasWild(pr)
                          ? () => onPairClick(p.seat, idx)
                          : undefined
                      }
                    >
                      {pr.map((c, k) => (
                        <CardView key={k} card={c} small />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {!handEnded && (
      <div className="my-hand">
        <div className="my-hand-head">
          <span>Elin ({game.yourHand.length})</span>
          <div className="sort-controls">
            <span className="sort-label">Diz:</span>
            <button
              className={sortMode === 'per' ? 'chip on' : 'chip'}
              onClick={() => setSortMode('per')}
            >
              Pere göre
            </button>
            <button
              className={sortMode === 'cift' ? 'chip on' : 'chip'}
              onClick={() => setSortMode('cift')}
            >
              Çifte göre
            </button>
            <button
              className={sortMode === 'none' ? 'chip on' : 'chip'}
              onClick={() => setSortMode('none')}
            >
              Elle
            </button>
          </div>
        </div>

        <div className="turn-status">
          {myTurn ? (
            game.phase === 'draw' ? (
              deckEmpty ? (
                <span className="turn-note">
                  Deste bitti — son atık alınamaz; <strong>El sonu</strong> butonuna tıkla
                </span>
              ) : meInfo.isCiftci && discardTakeable ? (
                <span className="turn-note">
                  Çiftçisin — atığa tıklayarak doğrudan al (sormana gerek yok)
                </span>
              ) : (
                <span className="turn-note">Sıra sende — desteden çek ya da atığı al</span>
              )
            ) : game.phase === 'await' ? (
              <span className="turn-note wait">
                {game.seats[game.pending!.discarderSeat].name} yanıtı bekleniyor...
              </span>
            ) : openMode ? (
              <span className="turn-note">
                {openKind === 'per'
                  ? `Perle açılış — Toplam ${stagedTotal} / gerekli ${required}`
                  : openKind === 'lay'
                    ? `Per indir — ${staged.length} per hazır`
                    : openKind === 'layCift'
                      ? `Çift indir — ${stagedPairs.length} çift hazır`
                      : `Çiftle açılış — ${stagedPairs.length} / gerekli ${requiredPairs} çift`}
              </span>
            ) : (
              <span className="turn-note">
                {earlyPhase
                  ? meInfo.hasOpened
                    ? 'Bir kağıt seçip at'
                    : 'Bir kağıt seçip at (per/çift açılışı henüz kapalı)'
                  : meInfo.hasOpened
                    ? 'Bir kağıt seçip at'
                    : 'Aç veya bir kağıt seçip at'}
              </span>
            )
          ) : (
            <span className="turn-note wait">
              {game.seats[game.turnSeat].name} oynuyor...
            </span>
          )}
        </div>

        {earlyPhase && (
          <div className="take-bar">
            <span className="muted">
              İlk {EARLY_DISCARD_LIMIT} atık düşene kadar per sorulamaz/açılamaz; çifte gidilebilir ve
              el bitirilebilir ({game.discardsMade}/{EARLY_DISCARD_LIMIT})
            </span>
          </div>
        )}

        {/* Ciftce git deklarasyonu */}
        {canDeclareCift && (
          <div className="take-bar">
            <button
              className="chip warn"
              onClick={() => socket.emit('turn:declareCiftci')}
            >
              Çifte git (deklare)
            </button>
            <span className="muted">
              Atık almadan çiftçi ol — yalnızca çift açabilirsin
            </span>
          </div>
        )}

        {/* Atigi alma secenekleri (ciftci degilse) */}
        {canDraw && discardTakeable && !meInfo.isCiftci && !isOpeningTake && !earlyPhase && (
          <div className="take-bar">
            <button
              className="chip on"
              disabled={game.discardAskable === false}
              onClick={() => takeDiscard(true)}
            >
              Sorarak al
            </button>
            {meInfo.openType !== 'per' && (
              <button className="chip warn" onClick={() => takeDiscard(false)}>
                Sormadan al (çiftçi ol)
              </button>
            )}
            {deckEmpty && game.discardTop && (
              <span className="muted">Deste bitti — son atık sorulamaz ve alınamaz.</span>
            )}
            {!deckEmpty && game.discardAskable === false && game.discardTop && (
              <span className="muted">İşlek atık sorulamaz — desteden çek.</span>
            )}
          </div>
        )}

        {isOpeningTake && discardTakeable && (
          <div className="take-bar">
            <button className="chip on" onClick={() => takeDiscard(true)}>
              {game.discardTop?.isJoker
                ? 'Açılış jokerini al (çiftçi olmaz)'
                : 'Açılış kartını al (çiftçi olmaz)'}
            </button>
          </div>
        )}

        {/* Atik istegi yanit paneli */}
        {game.pending && (
          <div className="pending-panel">
            {pendingForMe ? (
              <>
                <span>
                  {game.seats[game.pending.askerSeat].name} attığın kağıdı istiyor:
                </span>
                <CardView card={game.pending.card} small />
                <button className="primary" onClick={() => respond(true)}>
                  Ver
                </button>
                <button className="chip warn" onClick={() => respond(false)}>
                  Verme (çiftçi ol)
                </button>
              </>
            ) : iAsked ? (
              <span>Kağıt istendi, cevap bekleniyor...</span>
            ) : (
              <span>
                {game.seats[game.pending.askerSeat].name},{' '}
                {game.seats[game.pending.discarderSeat].name}'den kağıt istiyor...
              </span>
            )}
          </div>
        )}

        {seesAllDiscards && game.discardCount > 0 && (
          <details className="discard-view" open>
            <summary>
              Tüm atıklar ({game.discardCount}) — en üstteki masada, alttakiler geçmiş
            </summary>
            {game.visibleDiscards && game.visibleDiscards.length > 0 ? (
              <div className="discard-list">
                {[...game.visibleDiscards].reverse().map((c, k) => (
                  <CardView key={`${c.id}-${k}`} card={c} small />
                ))}
              </div>
            ) : (
              <p className="discard-view-hint muted">
                Çiftçi olarak tüm atıkları görmelisin; liste bir sonraki güncellemede yüklenecek.
              </p>
            )}
          </details>
        )}

        {/* Acma paneli */}
        {(canOpenPer || canOpenPairs || canLayPer || canLayPairs) && !openMode && (
          <div className="open-bar">
            {canOpenPer && (
              <button className="chip on" onClick={() => startOpen('per')}>
                Perle aç (baraj {required})
              </button>
            )}
            {canOpenPairs && (
              <button className="chip on" onClick={() => startOpen('cift')}>
                Çiftle aç ({requiredPairs} çift)
              </button>
            )}
            {canLayPer && (
              <button className="chip on" onClick={() => startOpen('lay')}>
                Per indir
              </button>
            )}
            {canLayPairs && (
              <button className="chip on" onClick={() => startOpen('layCift')}>
                Çift indir
              </button>
            )}
          </div>
        )}

        {openMode && (openKind === 'cift' || openKind === 'layCift') && (
          <div className="open-panel">
            <div className="open-row">
              <span className="sort-label">
                {openKind === 'layCift'
                  ? 'Çift indir — elinden masaya'
                  : 'Çift seç (2 kağıt): birebir aynı, ya da joker/taban ile (taban kartının aynısı da geçer).'}
              </span>
              <button className="chip" onClick={addPair} disabled={currentSel.length !== 2}>
                Çift ekle ({currentSel.length}/2)
              </button>
            </div>

            {stagedPairs.length > 0 && (
              <div className="staged">
                {stagedPairs.map((pr, idx) => (
                  <div key={idx} className="staged-meld">
                    <div className="meld-cards">
                      {pr.map((c, k) => (
                        <CardView key={k} card={c} small />
                      ))}
                    </div>
                    <button
                      className="chip mini"
                      onClick={() =>
                        setStagedPairs((prev) => prev.filter((_, x) => x !== idx))
                      }
                    >
                      sil
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="open-actions">
              {openKind === 'layCift' ? (
                <>
                  <span className={stagedPairs.length > 0 ? 'ok' : 'wait'}>
                    {stagedPairs.length} çift hazır — elde en az 1 kart kalmalı
                  </span>
                  <button
                    className="primary"
                    onClick={confirmLayPairs}
                    disabled={
                      stagedPairs.length === 0 ||
                      game.yourHand.filter((c) => !stagedIds.has(c.id)).length === 0
                    }
                  >
                    Çift indir
                  </button>
                </>
              ) : (
                <>
                  <span className={stagedPairs.length >= requiredPairs ? 'ok' : 'wait'}>
                    {stagedPairs.length} / gerekli {requiredPairs} çift
                  </span>
                  <button
                    className="primary"
                    onClick={confirmOpenPairs}
                    disabled={stagedPairs.length < requiredPairs}
                  >
                    Çift açılışını onayla
                  </button>
                </>
              )}
              <button className="chip" onClick={cancelOpen}>
                Vazgeç
              </button>
            </div>
          </div>
        )}

        {openMode && (openKind === 'per' || openKind === 'lay') && (
          <div className="open-panel">
            <div className="open-row">
              <span className="sort-label">
                {openKind === 'lay'
                  ? 'Per indir — kağıt seç, peri ekle'
                  : 'Per aç — kağıt seç, peri ekle'}
              </span>
              <button className="chip" onClick={addMeld} disabled={currentSel.length < 3}>
                Peri ekle ({currentSel.length})
              </button>
            </div>

            {staged.length > 0 && (
              <div className="staged">
                {staged.map((m, idx) => (
                  <div key={idx} className="staged-meld">
                    <div className="meld-cards">
                      {m.cards.map((c, k) => (
                        <CardView key={k} card={c} small />
                      ))}
                    </div>
                    <span className="staged-pts">{m.points}p</span>
                    <button
                      className="chip mini"
                      onClick={() => setStaged((prev) => prev.filter((_, x) => x !== idx))}
                    >
                      sil
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="open-actions">
              {openKind === 'lay' ? (
                <>
                  <span className={staged.length > 0 ? 'ok' : 'wait'}>
                    {staged.length} per hazır — elde en az 1 kart kalmalı
                  </span>
                  <button
                    className="primary"
                    onClick={confirmLayMelds}
                    disabled={
                      staged.length === 0 ||
                      game.yourHand.filter(
                        (c) => !stagedIds.has(c.id)
                      ).length === 0
                    }
                  >
                    Per indir
                  </button>
                </>
              ) : (
                <>
                  <span className={stagedTotal >= required ? 'ok' : 'wait'}>
                    Toplam {stagedTotal} / gerekli {required}
                  </span>
                  <button
                    className="primary"
                    onClick={confirmOpen}
                    disabled={stagedTotal < required}
                  >
                    Açılışı onayla
                  </button>
                </>
              )}
              <button className="chip" onClick={cancelOpen}>
                Vazgeç
              </button>
            </div>
          </div>
        )}

        {localMsg && <p className="error">{localMsg}</p>}

        <HandCards
          cards={handCardsForDisplay}
          draggable={canOrganizeHand}
          onReorder={handleReorder}
          isSelected={(c) =>
            openMode
              ? currentSel.includes(c.id)
              : processMode === 'hand'
                ? processCardIds.includes(c.id) || processStaged.some((op) => op.cardId === c.id)
                : jokerMode
                  ? jokerCardId === c.id
                  : selectedId === c.id
          }
          onCardClick={
            openMode || canDiscard || (processMode === 'hand' && myTurn) || jokerMode
              ? onCardClick
              : undefined
          }
        />
        {canOrganizeHand && (
          <p className="drag-hint">Kağıtları sürükleyerek elini dizebilirsin (sıra sende olmasa da).</p>
        )}

        {canFinishAction &&
          !openMode &&
          processMode === 'off' &&
          !jokerMode && (
          <div className="take-bar">
            <button
              className="chip on finish-btn"
              onClick={tryAutoFinish}
              title={
                game.eldenFinishAllowed
                  ? 'Elden bitiş — 71/101 barajı aranmaz'
                  : `Perden bitiş — açış en az ${required} puan olmalı`
              }
            >
              {game.eldenFinishAllowed ? 'Bitir (elden)' : 'Bitir'}
            </button>
          </div>
        )}

        {canProcess && !openMode && processMode === 'off' && !jokerMode && (
          <div className="take-bar">
            <button className="chip on" onClick={() => startProcess('hand')}>
              Elden işle
            </button>
            {discardTakeable && (
              <button className="chip on" onClick={() => startProcess('discard')}>
                Atığı işle (atana +71)
              </button>
            )}
          </div>
        )}

        {canSwapJoker && hasTableWild && !openMode && processMode === 'off' && !jokerMode && (
          <div className="take-bar">
            <button className="chip on" onClick={startJoker}>
              Joker al
            </button>
          </div>
        )}

        {processMode !== 'off' && (
          <div className="pending-panel">
            <span>
              {processMode === 'hand'
                ? processStaged.length > 0
                  ? `${processStaged.length} işleme hazır — istersen daha ekle veya İşle ile onayla.`
                  : processCardIds.length > 0
                    ? `${processCardIds.length} kağıt seçildi — işlenecek pere dokun.`
                    : 'Elinden bir veya birden fazla kağıt seç, sonra pere dokun.'
                : 'Atığı hangi pere işleyeceğini seç (atana +71).'}
            </span>
            {processMode === 'hand' && processStaged.length > 0 && (
              <button className="chip on" onClick={confirmProcess}>
                İşle ({processStaged.length})
              </button>
            )}
            <button className="chip" onClick={cancelProcess}>
              Vazgeç
            </button>
          </div>
        )}

        {jokerMode && (
          <div className="pending-panel">
            <span>
              {jokerCardId
                ? 'Kağıt seçildi — jokerli pere veya çifte dokun.'
                : 'Elinden jokerin yerine koyacağın kağıdı seç.'}
            </span>
            <button className="chip" onClick={cancelJoker}>
              Vazgeç
            </button>
          </div>
        )}

        {canDiscard && !openMode && processMode === 'off' && !jokerMode && (
          <div className="discard-bar">
            <button onClick={doDiscard} disabled={!selectedId} className="primary">
              {selectedId ? 'Seçili kağıdı at' : 'Atmak için kağıt seç'}
            </button>
          </div>
        )}
      </div>
      )}

      {handEnded && <EndHandsPanel game={game} />}

      {game.handHistory.length > 0 && (
        <details className="scoreboard-panel end-scoreboard" open={handEnded || undefined}>
          <summary>Skor tablosu — {game.handHistory.length} el</summary>
          <Scoreboard history={game.handHistory} teamScores={game.teamScores} />
        </details>
      )}

      {handEnded && game.handResult && <HandResult game={game} />}
    </div>
  );
}
