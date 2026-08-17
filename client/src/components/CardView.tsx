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
  represents,
}: {
  card: Card;
  small?: boolean;
  selected?: boolean;
  onClick?: () => void;
  animateIn?: boolean;
  represents?: { suit: Suit; rank: string } | null;
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
    const jokerName = card.back === 'red' ? 'Kırmızı joker' : 'Mavi joker';
    const jokerShort = card.back === 'red' ? 'K-JOKER' : 'M-JOKER';
    if (represents?.suit && represents.rank) {
      const red = isRed(represents.suit);
      return (
        <div
          className={`${cls} joker joker-${card.back} joker-as ${red ? 'suit-red' : 'suit-black'}`}
          onClick={onClick}
          title={`${jokerName} = ${represents.rank} ${SUIT_SYMBOL[represents.suit]}`}
        >
          <span className="joker-star">&#9733;</span>
          <span className="card-rank">{represents.rank}</span>
          <span className="card-suit">{SUIT_SYMBOL[represents.suit]}</span>
        </div>
      );
    }
    return (
      <div className={`${cls} joker joker-${card.back}`} onClick={onClick} title={jokerName}>
        <span className="joker-star">&#9733;</span>
        <span className="joker-label">{jokerShort}</span>
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
