import type { Card, GameView, Seat } from '../types';
import { CardView } from './CardView';

function penaltyLabel(game: GameView, seat: Seat): string | null {
  const line = game.handResult?.playerPenalties?.find((p) => p.seat === seat);
  if (!line) return null;
  if (line.isCiftci && !line.hasOpened) return `${line.penalty} — çiftçi, açmadı`;
  if (line.isCiftci) return `${line.penalty} — çiftçi`;
  if (line.hasOpened) return `${line.penalty} — açtı`;
  return `${line.penalty} — açmadı`;
}

function cardsForSeat(game: GameView, seat: Seat): { cards: Card[]; finishDiscard: boolean } {
  const snapshot = game.endSnapshot?.[seat] ?? [];
  const finisher = game.handResult?.finishInfo?.winnerSeat ?? null;
  if (snapshot.length > 0) return { cards: snapshot, finishDiscard: false };
  if (finisher === seat && game.discardTop) {
    return { cards: [game.discardTop], finishDiscard: true };
  }
  return { cards: [], finishDiscard: false };
}

export function EndHandsPanel({ game }: { game: GameView }) {
  if (game.phase !== 'ended' || !game.endSnapshot) return null;

  const finisher = game.handResult?.finishInfo?.winnerSeat ?? null;
  const reason =
    game.handResult?.reason === 'finish' && finisher != null
      ? `${game.seats[finisher].name} bitirdi`
      : 'Deste tükendi';

  return (
    <section className="end-hands-panel" aria-label="El sonu eller">
      <div className="end-hands-head">
        <h3>El {game.handNumber} — kalan eller</h3>
        <span className="end-hands-reason">{reason}</span>
      </div>
      <div className="end-hands-grid">
        {game.seats.map((p) => {
          const { cards, finishDiscard } = cardsForSeat(game, p.seat);
          const pen = penaltyLabel(game, p.seat);
          const isFinisher = finisher === p.seat;
          return (
            <div
              key={p.seat}
              className={`end-hand-slot team-${p.team} ${isFinisher ? 'finisher' : ''}`}
            >
              <div className="end-hand-slot-head">
                <span className="end-hand-name">
                  {p.name}
                  {p.seat === game.yourSeat && ' (sen)'}
                </span>
                <span className="end-hand-meta">
                  {isFinisher && <span className="end-hand-badge">bitirdi</span>}
                  {pen && <span className="end-hand-penalty">{pen}</span>}
                </span>
              </div>
              {cards.length > 0 ? (
                <div className="end-hand-cards">
                  {cards.map((c) => (
                    <CardView key={c.id} card={c} />
                  ))}
                  {finishDiscard && (
                    <span className="end-hand-finish-note">bitiş atışı</span>
                  )}
                </div>
              ) : (
                <p className="end-hand-empty">Elinde kağıt kalmadı</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
