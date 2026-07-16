import type { HandHistoryEntry } from '../types';

export function Scoreboard({
  history,
  teamScores,
  compact = false,
}: {
  history: HandHistoryEntry[];
  teamScores: [number, number];
  compact?: boolean;
}) {
  if (history.length === 0 && compact) return null;

  return (
    <div className={`scoreboard ${compact ? 'scoreboard-compact' : ''}`}>
      <div className="scoreboard-head">
        <span className="scoreboard-title">Skor tablosu</span>
        <span className="scoreboard-totals">
          Toplam — T1: {teamScores[0]} · T2: {teamScores[1]}
        </span>
      </div>
      {history.length > 0 ? (
        <table className="scoreboard-table">
          <thead>
            <tr>
              <th>El</th>
              <th>T1</th>
              <th>T2</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.handNumber}>
                <td>{h.handNumber}</td>
                <td>{h.teamScoresAfter[0]}</td>
                <td>{h.teamScoresAfter[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="scoreboard-empty muted">Henüz tamamlanan el yok.</p>
      )}
    </div>
  );
}
