import type { Meld, SeatPublic } from '../types';
import { CardView } from './CardView';

export function MeldsArea({
  melds,
  seats,
  onMeldClick,
  clickable,
  jokerOnly,
}: {
  melds: Meld[];
  seats: SeatPublic[];
  onMeldClick?: (meldId: string) => void;
  clickable?: boolean;
  jokerOnly?: boolean;
}) {
  if (melds.length === 0) return null;
  return (
    <div className="melds-area">
      <div className="melds-title">
        Masadaki perler
        {clickable && jokerOnly
          ? ' — joker almak için pere dokun'
          : clickable
            ? ' — işlemek için pere dokun (birden fazla kağıt seçilebilir)'
            : ''}
      </div>
      <div className="melds-list">
        {melds.map((m) => {
          const owner = seats[m.ownerSeat];
          const hasJoker = m.cards.some((c) => c.isJoker);
          const isClickable = clickable && (!jokerOnly || hasJoker);
          return (
            <div
              key={m.id}
              className={`meld team-${owner?.team ?? 0} ${isClickable ? 'clickable' : ''}`}
              onClick={isClickable ? () => onMeldClick?.(m.id) : undefined}
            >
              <div className="meld-cards">
                {m.cards.map((c, i) => (
                  <CardView key={`${m.id}-${i}`} card={c} small />
                ))}
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
