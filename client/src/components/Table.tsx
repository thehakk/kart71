import type { RoomView, Seat } from '../types';

const POSITIONS = ['bottom', 'left', 'top', 'right'] as const;

export function Table({
  room,
  mySeat,
  onPickSeat,
}: {
  room: RoomView;
  mySeat: Seat | null;
  onPickSeat: (seat: Seat) => void;
}) {
  // Kendi koltugumuz her zaman altta gorunsun diye donduruyoruz.
  const base = mySeat ?? 0;
  return (
    <div className="table">
      <div className="table-felt">
        <span className="table-label">Masa</span>
      </div>
      {room.players.map((_, i) => {
        const seat = ((base + i) % 4) as Seat;
        const p = room.players[seat];
        const pos = POSITIONS[i];
        const isMe = seat === mySeat;
        const isEmpty = !p.connected && !p.isBot;
        const canMoveHere = isEmpty && room.status === 'lobby';

        return (
          <div
            key={seat}
            className={`seat seat-${pos} team-${p.team} ${isMe ? 'me' : ''} ${
              isEmpty ? 'empty' : ''
            } ${canMoveHere ? 'clickable' : ''}`}
            onClick={canMoveHere ? () => onPickSeat(seat) : undefined}
            title={canMoveHere ? 'Bu koltuğa geç' : undefined}
          >
            <div className="seat-name">
              {isEmpty ? '(boş koltuk)' : p.name}
              {p.isBot && <span className="tag">bot</span>}
              {isMe && <span className="tag you">sen</span>}
            </div>
            <div className="seat-meta">
              <span>Takım {p.team + 1}</span>
              {!isEmpty && (
                <span className={p.ready ? 'ok' : 'wait'}>
                  {p.ready ? 'hazır' : 'bekliyor'}
                </span>
              )}
              {canMoveHere && <span className="join-hint">tıkla &raquo;</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
