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
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../types';
import { CardView } from './CardView';

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
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    touchAction: 'none',
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
  onReorder,
  isSelected,
  onCardClick,
}: {
  cards: Card[];
  draggable: boolean;
  onReorder: (newIds: string[]) => void;
  isSelected: (c: Card) => boolean;
  onCardClick?: (c: Card) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  );

  if (!draggable) {
    return (
      <div className="hand-cards">
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        <div className="hand-cards">
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
    </DndContext>
  );
}
