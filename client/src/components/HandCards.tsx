import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import type { Card } from '../types';
import { CardView } from './CardView';

const HAND_ROWS_MOBILE = 3;

function SortableCard({
  card,
  selected,
  onClick,
}: {
  card: Card;
  selected: boolean;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    touchAction: 'none',
    zIndex: isDragging ? 2 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardView card={card} selected={selected} onClick={onClick} />
    </div>
  );
}

export function HandCards({
  cards,
  draggable,
  externalDnd,
  onReorder,
  isSelected,
  onCardClick,
}: {
  cards: Card[];
  draggable: boolean;
  /** Ust bileşen DndContext sagliyorsa true (bitis slotu vb.). */
  externalDnd?: boolean;
  onReorder: (newIds: string[]) => void;
  isSelected: (c: Card) => boolean;
  onCardClick?: (c: Card) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 8 } })
  );

  const gridColsMobile = Math.max(1, Math.ceil(cards.length / HAND_ROWS_MOBILE));
  const gridColsDesktop = Math.max(1, Math.ceil(cards.length / 2));
  const gridStyle = {
    ['--hand-cols-mobile' as string]: String(gridColsMobile),
    ['--hand-cols-desktop' as string]: String(gridColsDesktop),
  } as CSSProperties;

  if (!draggable) {
    return (
      <div className="hand-cards hand-cards-grid" style={gridStyle}>
        {cards.map((c) => (
          <CardView
            key={c.id}
            card={c}
            selected={isSelected(c)}
            onClick={onCardClick ? () => onCardClick(c) : undefined}
          />
        ))}
      </div>
    );
  }

  const ids = cards.map((c) => c.id);
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldI = ids.indexOf(String(active.id));
      const newI = ids.indexOf(String(over.id));
      if (oldI !== -1 && newI !== -1) onReorder(arrayMove(ids, oldI, newI));
    }
  };

  const grid = (
    <SortableContext items={ids} strategy={rectSortingStrategy}>
      <div className="hand-cards hand-cards-grid" style={gridStyle}>
        {cards.map((c) => (
          <SortableCard
            key={c.id}
            card={c}
            selected={isSelected(c)}
            onClick={onCardClick ? () => onCardClick(c) : undefined}
          />
        ))}
      </div>
    </SortableContext>
  );

  if (externalDnd) return grid;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {grid}
    </DndContext>
  );
}
