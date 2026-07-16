import type { GameView, PlayerPenaltyLine } from '../types';
import { socket } from '../socket';

const FINISH_LABELS = { elden: 'Elden', per: 'Perden', cift: 'Çiftten' } as const;

function deltaLabel(n: number): string {
  if (n <= 0) return '—';
  return `+${n}`;
}

function penaltyTag(p: PlayerPenaltyLine): string {
  if (p.isCiftci && !p.hasOpened) return 'çiftçi, açmadı';
  if (p.isCiftci) return 'çiftçi, açtı';
  if (p.hasOpened) return 'açtı';
  return 'açmadı';
}
export function HandResult({ game }: { game: GameView }) {
  const r = game.handResult;
  if (!r) return null;

  const isGameOver = game.handNumber >= 13;
  const winner =
    game.teamScores[0] === game.teamScores[1]
      ? 'Berabere'
      : game.teamScores[0] < game.teamScores[1]
        ? 'Takım 1'
        : 'Takım 2';

  const [raw0, raw1] = r.rawTotals;
  const [d0, d1] = r.teamDelta;
  const finishInfo = r.finishInfo;
  const deckWinnerTeam =
    r.reason === 'deck_empty' && raw0 !== raw1 ? ((raw0 < raw1 ? 0 : 1) as 0 | 1) : null;
  const deckWinnerKafa =
    deckWinnerTeam != null ? (r.breakdown?.[deckWinnerTeam]?.kafa ?? 0) : 0;
  const loserBreakdown =
    finishInfo && r.breakdown
      ? r.breakdown[(1 - (finishInfo.winnerSeat % 2)) as 0 | 1]
      : null;
  const winnerBreakdown =
    finishInfo && r.breakdown
      ? r.breakdown[(finishInfo.winnerSeat % 2) as 0 | 1]
      : null;

  return (
    <div className="hand-result-overlay">
      <div className="hand-result-card">
        <h2>El {game.handNumber} bitti</h2>
        <p className="hand-result-reason">
          {r.reason === 'finish' && finishInfo
            ? `${game.seats[finishInfo.winnerSeat].name} bitirdi (${FINISH_LABELS[finishInfo.finishType]}${finishInfo.jokerDiscard ? ', joker atışı' : ''})`
            : 'Deste tükendi'}
        </p>

        {r.reason === 'finish' && finishInfo && !finishInfo.eldenFinish && (
          <p className="hand-result-note muted">
            Masada daha önce açık olduğu için <strong>elden bitiş</strong> sayılmaz (×2 çarpanı yok).
          </p>
        )}

        <p className="hand-result-penalty">
          Bu el yazılan — Takım 1: <strong>{deltaLabel(d0)}</strong> · Takım 2:{' '}
          <strong>{deltaLabel(d1)}</strong>
        </p>

        {r.reason === 'finish' && loserBreakdown && (
          <p className="hand-result-raw">
            {finishInfo?.eldenFinish ? (
              <>
                Kaybeden ham ceza: taban {loserBreakdown.base}
                {loserBreakdown.multiplier > 1 && ` × ${loserBreakdown.multiplier}`}
                {loserBreakdown.kafa > 0 && ` + kafa ${loserBreakdown.kafa}`}
                {loserBreakdown.islek > 0 && ` + işlek ${loserBreakdown.islek}`}
                {' '}= {loserBreakdown.total}
                {r.penaltyAmount > 0 && ` → yazılan ${r.penaltyAmount}`}
              </>
            ) : (
              <>
                Ham ceza — kaybeden: taban {loserBreakdown.base}
                {loserBreakdown.multiplier > 1 && ` × ${loserBreakdown.multiplier}`}
                {loserBreakdown.kafa > 0 && ` + kafa ${loserBreakdown.kafa}`}
                {loserBreakdown.islek > 0 && ` + işlek ${loserBreakdown.islek}`}
                {' '}= {loserBreakdown.total}
                {winnerBreakdown && ` · biten takım: ${winnerBreakdown.total}`}
                {r.penaltyAmount > 0 && ` → yazılan ${r.penaltyAmount}`}
              </>
            )}
          </p>
        )}

        {(raw0 > 0 || raw1 > 0) && r.reason !== 'finish' && (
          <p className="hand-result-raw">
            Ham ceza: Takım 1 {raw0}
            {r.breakdown?.[0].islek ? ` (işlek ${r.breakdown[0].islek})` : ''} — Takım 2{' '}
            {raw1}
            {r.breakdown?.[1].islek ? ` (işlek ${r.breakdown[1].islek})` : ''}
            {deckWinnerKafa > 0 && ` + kafa ${deckWinnerKafa}`}
            {r.penaltyAmount > 0 && ` → yazılan ${r.penaltyAmount}`}
          </p>
        )}

        {r.playerPenalties && r.playerPenalties.length > 0 && (
          <ul className="hand-result-players muted">
            {r.playerPenalties.map((p) => (
              <li key={p.seat}>
                {p.name} (T{p.team + 1}): {p.penalty} — {penaltyTag(p)}
              </li>
            ))}
          </ul>
        )}

        {r.noScoringReason === 'no_open_no_ciftci' && (
          <p className="hand-result-note muted">
            Kimse açmadı ve masada çiftçi yok — bu elde skora <strong>0</strong> yazılır.
            Çiftçi olmak için <strong>sormadan atık al</strong>malısın (açılış kartı sayılmaz).
          </p>
        )}

        {r.noScoringReason === 'equal_totals' && (
          <p className="hand-result-note muted">
            İki takımın ham cezası eşit ({raw0} = {raw1}) — fark yazılmadı.
            {r.playerPenalties?.some((p) => p.isCiftci) &&
              ' Her iki takımda da çiftçi varsa veya çiftçi çift açtıysa bu normal olabilir.'}
          </p>
        )}
        <div className="hand-result-totals">
          <span className="hand-result-totals-label">Toplam skor (kümülatif)</span>
          <span>Takım 1: {game.teamScores[0]}</span>
          <span>Takım 2: {game.teamScores[1]}</span>
        </div>

        {!isGameOver && game.handContinue && (
          <div className="hand-result-ready">
            <p className="hand-result-ready-label">
              Sonraki el için hazır olanlar ({game.handContinue.players.filter((p) => p.ready).length}/4)
            </p>
            <ul className="hand-result-ready-list">
              {game.handContinue.players.map((p) => (
                <li key={p.seat}>
                  {p.name}
                  {p.isBot && ' (bot)'}
                  {' — '}
                  <span className={p.ready ? 'ok' : 'wait'}>
                    {p.ready ? 'hazır' : 'bekliyor'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isGameOver ? (
          <>
            <p className="hand-result-winner">Oyun bitti — {winner} kazandı!</p>
            <button className="primary" onClick={() => socket.emit('room:playAgain')}>
              Lobiye dön — yeni oyun
            </button>
          </>
        ) : (
          <button
            className={`primary ${game.handContinue?.yourReady ? 'ready' : ''}`}
            onClick={() =>
              socket.emit('room:ready', { ready: !game.handContinue?.yourReady })
            }
          >
            {game.handContinue?.yourReady
              ? 'Hazır (iptal)'
              : `Sonraki ele hazırım (${game.handNumber + 1}/13)`}
          </button>
        )}
      </div>
    </div>
  );
}
