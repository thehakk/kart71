import type { Card, Suit } from '../types';

const SUIT_SYMBOL: Record<Suit, string> = {
  H: '\u2665', // kupa
  D: '\u2666', // karo
  C: '\u2663', // sinek
  S: '\u2660', // maca
};

function isRed(suit: Suit): boolean {
  return suit === 'H' || suit === 'D';
}

export function CardView({
  card,
  small,
  selected,
  onClick,
  animateIn = false,
}: {
  card: Card;
  small?: boolean;
  selected?: boolean;
  onClick?: () => void;
  animateIn?: boolean;
}) {
  const cls = [
    'card',
    small ? 'card-sm' : '',
    `back-${card.back}`,
    selected ? 'selected' : '',
    onClick ? 'clickable' : '',
    animateIn && !small ? 'card-animate-in' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (card.isJoker) {
    return (
      <div className={`${cls} joker`} onClick={onClick} title={`Joker (${card.back})`}>
        <span className="joker-star">&#9733;</span>
        <span className="joker-label">JOKER</span>
      </div>
    );
  }

  const red = card.suit ? isRed(card.suit) : false;
  return (
    <div
      className={`${cls} ${red ? 'suit-red' : 'suit-black'}`}
      onClick={onClick}
      title={`${card.rank} ${card.suit} (${card.back})`}
    >
      <span className="card-rank">{card.rank}</span>
      <span className="card-suit">{card.suit ? SUIT_SYMBOL[card.suit] : ''}</span>
    </div>
  );
}

// Kapali kart (rakip eli / deste).
export function CardBack({ back, small }: { back: 'red' | 'blue'; small?: boolean }) {
  return <div className={`card card-facedown back-${back} ${small ? 'card-sm' : ''}`} />;
}
