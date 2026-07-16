import type { GameFinalResult } from '../types';
import { Scoreboard } from './Scoreboard';
import { socket } from '../socket';

export function GameOver({ result }: { result: GameFinalResult }) {
  const winner =
    result.winnerTeam == null
      ? 'Berabere'
      : `Takım ${result.winnerTeam + 1}`;

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <h2>13 el bitti!</h2>
        <p className="game-over-winner">
          {result.winnerTeam == null
            ? 'Oyun berabere bitti.'
            : (
              <>
                <strong>{winner}</strong> kazandı
              </>
            )}
        </p>
        <div className="game-over-finals">
          <span>Takım 1: {result.teamScores[0]}</span>
          <span>Takım 2: {result.teamScores[1]}</span>
        </div>
        <p className="game-over-hint muted">En düşük ceza puanı kazanır.</p>
        <Scoreboard history={result.handHistory} teamScores={result.teamScores} />
        <button className="primary" onClick={() => socket.emit('room:playAgain')}>
          Lobiye dön — yeni oyun
        </button>
      </div>
    </div>
  );
}
