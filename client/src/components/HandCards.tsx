import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import type { Card } from '../types';
import { CardView } from './CardView';

export const HAND_ROWS = 3;
export const HAND_MIN_COLS = 5;
export const HAND_SLOT_PREFIX = 'hand-slot-';

/** Hedef slota kart koy; doluysa alttakini ayni satirda saga kaydir. */
export function insertCardIntoGrid(
  slots: (string | null)[],
  cardId: string,
  targetIndex: number,
  rows = HAND_ROWS
): { slots: (string | null)[]; cols: number } {
  const next = [...slots];

  const ensureLen = (min: number) => {
    while (next.length < min) next.push(null);
  };

  const placeWithCascade = (index: number, id: string): void => {
    ensureLen(index + 1);
    if (next[index] === null || next[index] === id) {
      next[index] = id;
      return;
    }
    const bumped = next[index]!;
    next[index] = id;
    placeWithCascade(index + rows, bumped);
  };

  const oldIdx = next.indexOf(cardId);
  if (oldIdx !== -1) next[oldIdx] = null;

  placeWithCascade(targetIndex, cardId);

  const cols = Math.max(HAND_MIN_COLS, Math.ceil(next.length / rows));
  return { slots: next, cols };
}

export function resolveHandDropSlot(
  overId: string,
  slots: (string | null)[]
): number | null {
  if (overId.startsWith(HAND_SLOT_PREFIX)) {
    const index = Number.parseInt(overId.slice(HAND_SLOT_PREFIX.length), 10);
    return Number.isNaN(index) ? null : index;
  }
  const index = slots.indexOf(overId);
  return index === -1 ? null : index;
}

function DraggableCard({
  card,
  selected,
  onClick,
}: {
  card: Card;
  selected: boolean;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
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

function HandSlot({
  slotIndex,
  card,
  selected,
  onClick,
}: {
  slotIndex: number;
  card: Card | null;
  selected: boolean;
  onClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${HAND_SLOT_PREFIX}${slotIndex}` });
  return (
    <div
      ref={setNodeRef}
      className={`hand-slot ${isOver ? 'over' : ''} ${card ? 'filled' : 'empty'}`}
    >
      {card ? (
        <DraggableCard card={card} selected={selected} onClick={onClick} />
      ) : (
        <div className="hand-slot-placeholder" aria-hidden />
      )}
    </div>
  );
}

export function HandGrid({
  slots,
  cols,
  rows = HAND_ROWS,
  cardById,
  pendingCard,
  draggable,
  externalDnd,
  onMoveCard,
  isSelected,
  onCardClick,
}: {
  slots: (string | null)[];
  cols: number;
  rows?: number;
  cardById: (id: string) => Card | undefined;
  pendingCard: Card | null;
  draggable: boolean;
  externalDnd?: boolean;
  onMoveCard: (cardId: string, slotIndex: number) => void;
  isSelected: (c: Card) => boolean;
  onCardClick?: (c: Card) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 8 } })
  );

  const gridStyle = {
    ['--hand-cols' as string]: String(cols),
    ['--hand-rows' as string]: String(rows),
  } as CSSProperties;

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith(HAND_SLOT_PREFIX)) return;
    const slotIndex = resolveHandDropSlot(overId, slots);
    if (slotIndex === null) return;
    onMoveCard(String(active.id), slotIndex);
  };

  const grid = (
    <div className="hand-layout">
      <div className="hand-cards hand-cards-grid" style={gridStyle}>
        {Array.from({ length: cols * rows }, (_, slotIndex) => {
          const id = slots[slotIndex] ?? null;
          const card = id ? cardById(id) ?? null : null;
          return (
            <HandSlot
              key={slotIndex}
              slotIndex={slotIndex}
              card={draggable && card ? card : card}
              selected={card ? isSelected(card) : false}
              onClick={card && onCardClick ? () => onCardClick(card) : undefined}
            />
          );
        })}
      </div>
      {pendingCard && (
        <div className="hand-pending-draw">
          <span className="hand-pending-label">Çekilen</span>
          {draggable ? (
            <DraggableCard
              card={pendingCard}
              selected={isSelected(pendingCard)}
              onClick={onCardClick ? () => onCardClick(pendingCard) : undefined}
            />
          ) : (
            <CardView
              card={pendingCard}
              selected={isSelected(pendingCard)}
              onClick={onCardClick ? () => onCardClick(pendingCard) : undefined}
            />
          )}
        </div>
      )}
    </div>
  );

  if (!draggable) {
    return (
      <div className="hand-layout">
        <div className="hand-cards hand-cards-grid" style={gridStyle}>
          {Array.from({ length: cols * rows }, (_, slotIndex) => {
            const id = slots[slotIndex] ?? null;
            const card = id ? cardById(id) ?? null : null;
            if (!card) return <div key={slotIndex} className="hand-slot empty" />;
            return (
              <div key={slotIndex} className="hand-slot filled">
                <CardView
                  card={card}
                  selected={isSelected(card)}
                  onClick={onCardClick ? () => onCardClick(card) : undefined}
                />
              </div>
            );
          })}
        </div>
        {pendingCard && (
          <div className="hand-pending-draw">
            <span className="hand-pending-label">Çekilen</span>
            <CardView
              card={pendingCard}
              selected={isSelected(pendingCard)}
              onClick={onCardClick ? () => onCardClick(pendingCard) : undefined}
            />
          </div>
        )}
      </div>
    );
  }

  if (externalDnd) return grid;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {grid}
    </DndContext>
  );
}

/** @deprecated HandGrid kullan */
export function HandCards(props: {
  cards: Card[];
  draggable: boolean;
  externalDnd?: boolean;
  onReorder: (newIds: string[]) => void;
  isSelected: (c: Card) => boolean;
  onCardClick?: (c: Card) => void;
}) {
  const slots = props.cards.map((c) => c.id);
  const cols = Math.max(HAND_MIN_COLS, Math.ceil(slots.length / HAND_ROWS));
  const padded = Array(cols * HAND_ROWS).fill(null) as (string | null)[];
  slots.forEach((id, i) => {
    padded[i] = id;
  });
  return (
    <HandGrid
      slots={padded}
      cols={cols}
      cardById={(id) => props.cards.find((c) => c.id === id)}
      pendingCard={null}
      draggable={props.draggable}
      externalDnd={props.externalDnd}
      onMoveCard={(cardId, slotIndex) => {
        const ids = props.cards.map((c) => c.id);
        const oldI = ids.indexOf(cardId);
        if (oldI === -1) return;
        const next = [...ids];
        next.splice(oldI, 1);
        const targetId = padded[slotIndex];
        if (targetId) {
          const targetI = next.indexOf(targetId);
          if (targetI !== -1) {
            next.splice(targetI, 0, cardId);
          } else {
            next.splice(Math.min(slotIndex, next.length), 0, cardId);
          }
        } else {
          next.splice(Math.min(slotIndex, next.length), 0, cardId);
        }
        props.onReorder(next);
      }}
      isSelected={props.isSelected}
      onCardClick={props.onCardClick}
    />
  );
}
