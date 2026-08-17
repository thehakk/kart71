import type { Meld, RunEnd, SeatPublic } from '../types';
import { CardView } from './CardView';
import { resolveJokerInRun, runEndTargetRanks } from '../meldBuild';

export function MeldsArea({
  melds,
  seats,
  onMeldClick,
  clickable,
  jokerOnly,
  attachMode,
}: {
  melds: Meld[];
  seats: SeatPublic[];
  onMeldClick?: (meldId: string, end?: RunEnd) => void;
  clickable?: boolean;
  jokerOnly?: boolean;
  attachMode?: boolean;
}) {
  if (melds.length === 0) return null;
  return (
    <div className="melds-area">
      <div className="melds-title">
        Masadaki perler
        {clickable && jokerOnly
          ? ' — joker almak için pere dokun'
          : clickable && attachMode
            ? ' — sıralı perde sol/sağ ucu seç (joker nereye işlenecek)'
            : clickable
              ? ' — işlemek için pere dokun (birden fazla kağıt seçilebilir)'
              : ''}
      </div>
      <div className="melds-list">
        {melds.map((m) => {
          const owner = seats[m.ownerSeat];
          const hasJoker = m.cards.some((c) => c.isJoker);
          const isClickable = clickable && (!jokerOnly || hasJoker);
          const showEnds = Boolean(attachMode && isClickable && m.type === 'run');
          const ends = showEnds ? runEndTargetRanks(m.cards) : null;
          return (
            <div
              key={m.id}
              className={`meld team-${owner?.team ?? 0} ${isClickable ? 'clickable' : ''}`}
              onClick={
                isClickable && !showEnds
                  ? () => onMeldClick?.(m.id)
                  : isClickable && showEnds
                    ? () => onMeldClick?.(m.id)
                    : undefined
              }
            >
              <div className="meld-cards">
                {showEnds && (
                  <button
                    type="button"
                    className={`meld-end ${ends?.low ? '' : 'disabled'}`}
                    disabled={!ends?.low}
                    title={ends?.low ? `Alta işle (${ends.low})` : 'Alta işlenemez'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ends?.low) onMeldClick?.(m.id, 'low');
                    }}
                  >
                    +{ends?.low ?? '—'}
                  </button>
                )}
                {m.cards.map((c, i) => (
                  <CardView
                    key={`${m.id}-${i}`}
                    card={c}
                    small
                    represents={
                      c.isJoker && m.type === 'run' ? resolveJokerInRun(m.cards, i) : null
                    }
                  />
                ))}
                {showEnds && (
                  <button
                    type="button"
                    className={`meld-end ${ends?.high ? '' : 'disabled'}`}
                    disabled={!ends?.high}
                    title={ends?.high ? `Üste işle (${ends.high})` : 'Üste işlenemez'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ends?.high) onMeldClick?.(m.id, 'high');
                    }}
                  >
                    +{ends?.high ?? '—'}
                  </button>
                )}
              </div>
              <div className="meld-meta">
                {owner?.name} · {m.points}p
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
