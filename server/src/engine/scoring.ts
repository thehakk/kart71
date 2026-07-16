import { cardPoints } from './deck.js';
import type { Card } from '../shared/types.js';
import type { GameState } from './state.js';
import type {
  FinishInfo,
  HandScoreResult,
  Seat,
  Team,
  TeamHandBreakdown,
} from '../shared/types.js';

export type { FinishInfo, HandScoreResult } from '../shared/types.js';

function teamOf(seat: Seat): Team {
  return (seat % 2) as Team;
}

function playerHasOpened(p: GameState['players'][number], state: GameState): boolean {
  return (
    p.hasOpened ||
    p.pairs.length > 0 ||
    state.melds.some((m) => m.ownerSeat === p.seat)
  );
}

function playerHandPenalty(p: GameState['players'][number], state: GameState): number {
  const handPts = p.hand.reduce((s, c) => s + cardPoints(c), 0);
  const opened = playerHasOpened(p, state);
  // Ciftci ama hala acmadi: 100 × 2 = 200
  if (p.isCiftci && !opened) return 200;
  // Ciftci ve acti: elde kalan × 2
  if (p.isCiftci) return handPts * 2;
  if (opened) return handPts;
  return 100;
}

function teamHasOpener(state: GameState, team: Team): boolean {
  return state.players.some((p) => p.team === team && playerHasOpened(p, state));
}

/** Bitis cezasi: kaybeden takimda ciftci acti + ciftten bitis → elde kalan × 4. */
function playerFinishHandPenalty(
  p: GameState['players'][number],
  state: GameState,
  finish: FinishInfo,
  onLoserTeam: boolean
): number {
  const handPts = p.hand.reduce((s, c) => s + cardPoints(c), 0);
  const opened = playerHasOpened(p, state);
  if (!onLoserTeam) return playerHandPenalty(p, state);
  if (p.isCiftci && !opened) return 200;
  if (p.isCiftci && opened) {
    let pen = handPts * 2;
    if (finish.ciftFinish) pen *= 2;
    return pen;
  }
  if (opened) return handPts;
  return 100;
}

function finishTeamBase(
  state: GameState,
  team: Team,
  finish: FinishInfo,
  isLoserTeam: boolean
): number {
  let total = 0;
  for (const p of state.players) {
    if (p.team !== team) continue;
    total += playerFinishHandPenalty(p, state, finish, isLoserTeam);
  }
  return total;
}

function handValue(state: GameState, team: Team): number {
  let total = 0;
  for (const p of state.players) {
    if (p.team !== team) continue;
    total += playerHandPenalty(p, state);
  }
  return total;
}

export function buildPlayerPenalties(state: GameState) {
  return state.players.map((p) => ({
    seat: p.seat,
    team: p.team,
    name: p.name,
    isCiftci: p.isCiftci,
    hasOpened: playerHasOpened(p, state),
    penalty: playerHandPenalty(p, state),
  }));
}

/** Takimdaki acan oyuncularin en yuksek kafa bonusu. */
function bestKafaOnTeam(state: GameState, team: Team): number {
  let best = 0;
  for (const p of state.players) {
    if (p.team !== team) continue;
    if (!playerHasOpened(p, state)) continue;
    const k =
      p.openType === 'cift' || p.pairs.length > 0
        ? kafaBonus(0, p.pairs.length)
        : kafaBonus(p.openedValue, 0);
    best = Math.max(best, k);
  }
  return best;
}

export function kafaBonus(openValue: number, pairCount: number): number {
  if (pairCount >= 7) return 200;
  if (pairCount >= 6) return 100;
  if (openValue >= 141) return 400;
  if (openValue >= 131) return 300;
  if (openValue >= 121) return 200;
  if (openValue >= 111) return 100;
  return 0;
}

function finishMultiplier(info: FinishInfo): number {
  let m = 1;
  if (info.eldenFinish) m *= 2;
  if (info.ciftFinish) m *= 2;
  if (info.jokerDiscard) m *= 2;
  return m;
}

// Ham el cezalarindan farki hesapla: yalnizca yuksek olan takima fark yazilir.
function applyDifference(
  breakdown: [TeamHandBreakdown, TeamHandBreakdown],
  winnerTeam: Team | null
): Pick<HandScoreResult, 'teamDelta' | 'rawTotals' | 'penaltyTeam' | 'penaltyAmount' | 'winnerTeam'> {
  const rawTotals: [number, number] = [breakdown[0].total, breakdown[1].total];
  const [r0, r1] = rawTotals;

  if (r0 === r1) {
    return {
      winnerTeam,
      teamDelta: [0, 0],
      rawTotals,
      penaltyTeam: null,
      penaltyAmount: 0,
    };
  }

  const penaltyTeam = (r0 > r1 ? 0 : 1) as Team;
  const penaltyAmount = Math.abs(r0 - r1);
  const teamDelta: [number, number] =
    penaltyTeam === 0 ? [penaltyAmount, 0] : [0, penaltyAmount];

  const handWinner = (r0 < r1 ? 0 : 1) as Team;
  return {
    winnerTeam: winnerTeam ?? handWinner,
    teamDelta,
    rawTotals,
    penaltyTeam,
    penaltyAmount,
  };
}

/** İşlek cezası ham toplamlar eşitken (fark 0) yine skora yazilsin. */
function applyIslekToDelta(
  diff: Pick<HandScoreResult, 'teamDelta' | 'penaltyTeam' | 'penaltyAmount'>,
  islek: [number, number]
): Pick<HandScoreResult, 'teamDelta' | 'penaltyTeam' | 'penaltyAmount'> {
  if (diff.penaltyAmount !== 0) return diff;
  if (islek[0] === islek[1]) return diff;

  const t = (islek[0] > islek[1] ? 0 : 1) as Team;
  const amt = Math.abs(islek[0] - islek[1]);
  const teamDelta: [number, number] = [...diff.teamDelta];
  teamDelta[t] += amt;
  return { teamDelta, penaltyTeam: t, penaltyAmount: amt };
}

export function scoreHand(
  state: GameState,
  finish: FinishInfo | null
): HandScoreResult {
  const islek: [number, number] = [...state.islekPenalty];

  if (finish) {
    const finisherTeam = teamOf(finish.winnerSeat);
    const loserTeam = (1 - finisherTeam) as Team;
    const mult = finishMultiplier(finish);
    const loserBase = finishTeamBase(state, loserTeam, finish, true);
    // Perden bitiste biten takim 0; ciftten bitiste ortagin el cezasi dusulur (§8.4).
    const winnerBase = finish.ciftFinish
      ? finishTeamBase(state, finisherTeam, finish, false)
      : 0;
    // Kafa yalnizca elden bitiste; perden/çiftten bitiste masada zaten acilis vardir.
    const kafa =
      finish.eldenFinish && !teamHasOpener(state, loserTeam)
        ? kafaBonus(finish.finisherOpenValue, finish.finisherPairCount)
        : 0;
    const loserRaw = loserBase * mult + kafa + islek[loserTeam];
    const winnerRaw = winnerBase + islek[finisherTeam];

    const breakdown: [TeamHandBreakdown, TeamHandBreakdown] = [
      {
        team: 0,
        base: finisherTeam === 0 ? winnerBase : loserBase,
        multiplier: finisherTeam === 0 ? 1 : mult,
        kafa: finisherTeam === 0 ? 0 : kafa,
        islek: islek[0],
        total: finisherTeam === 0 ? winnerRaw : loserRaw,
      },
      {
        team: 1,
        base: finisherTeam === 1 ? winnerBase : loserBase,
        multiplier: finisherTeam === 1 ? 1 : mult,
        kafa: finisherTeam === 1 ? 0 : kafa,
        islek: islek[1],
        total: finisherTeam === 1 ? winnerRaw : loserRaw,
      },
    ];

    const rawTotals: [number, number] = [breakdown[0].total, breakdown[1].total];
    let penaltyTeam: Team;
    let penaltyAmount: number;
    let teamDelta: [number, number];

    // Elden bitiste biten takim 0 sayilir — kaybedenin tam ham cezasi yazilir.
    if (finish.eldenFinish) {
      penaltyTeam = loserTeam;
      penaltyAmount = loserRaw;
      teamDelta = loserTeam === 0 ? [penaltyAmount, 0] : [0, penaltyAmount];
    } else {
      const diff = applyDifference(breakdown, finisherTeam);
      penaltyTeam = diff.penaltyTeam!;
      penaltyAmount = diff.penaltyAmount;
      teamDelta = diff.teamDelta;
    }

    const withIslek = applyIslekToDelta({ teamDelta, penaltyTeam, penaltyAmount }, islek);
    return {
      reason: 'finish',
      ...withIslek,
      winnerTeam: finisherTeam,
      rawTotals,
      breakdown,
      finishInfo: finish,
    };
  }

  // Ciftci veya acilis varsa puan hesaplanir (ciftci acmadan da ceza yazar).
  const handHasScoring =
    state.players.some((p) => p.hasOpened || p.isCiftci) ||
    state.melds.length > 0 ||
    state.players.some((p) => p.pairs.length > 0);

  const playerPenalties = buildPlayerPenalties(state);

  if (!handHasScoring) {
    const zero: TeamHandBreakdown = {
      team: 0,
      base: 0,
      multiplier: 1,
      kafa: 0,
      islek: 0,
      total: 0,
    };
    return {
      reason: 'deck_empty',
      winnerTeam: null,
      teamDelta: [0, 0],
      rawTotals: [0, 0],
      penaltyTeam: null,
      penaltyAmount: 0,
      breakdown: [
        { ...zero, team: 0 },
        { ...zero, team: 1 },
      ],
      playerPenalties,
      noScoringReason: 'no_open_no_ciftci',
    };
  }

  const breakdown: [TeamHandBreakdown, TeamHandBreakdown] = [0, 1].map((t) => {
    const base = handValue(state, t as Team);
    const kafa = bestKafaOnTeam(state, t as Team);
    return {
      team: t as Team,
      base,
      multiplier: 1,
      kafa,
      islek: islek[t as Team],
      total: base + islek[t as Team],
    };
  }) as [TeamHandBreakdown, TeamHandBreakdown];

  const [raw0, raw1] = breakdown.map((b) => b.base) as [number, number];
  const rawTotals: [number, number] = [raw0, raw1];

  let winnerTeam: Team | null = null;
  if (raw0 < raw1) winnerTeam = 0;
  else if (raw1 < raw0) winnerTeam = 1;

  let penaltyTeam: Team | null = null;
  let penaltyAmount = 0;
  const teamDelta: [number, number] = [0, 0];

  if (winnerTeam != null) {
    const loserTeam = (1 - winnerTeam) as Team;
    const winnerKafa = breakdown[winnerTeam].kafa;
    const loserRaw = rawTotals[loserTeam];
    const winnerRaw = rawTotals[winnerTeam];
    penaltyAmount = loserRaw + winnerKafa - winnerRaw;
    if (penaltyAmount > 0) {
      penaltyTeam = loserTeam;
      teamDelta[penaltyTeam] = penaltyAmount;
      breakdown[loserTeam] = {
        ...breakdown[loserTeam],
        kafa: winnerKafa,
        total: loserRaw + winnerKafa + breakdown[loserTeam].islek,
      };
    }
  }

  const diff = {
    winnerTeam,
    teamDelta,
    rawTotals,
    penaltyTeam,
    penaltyAmount,
  };
  const withIslek = applyIslekToDelta(diff, islek);
  const noScoringReason =
    withIslek.teamDelta[0] === 0 &&
    withIslek.teamDelta[1] === 0 &&
    diff.rawTotals[0] > 0
      ? ('equal_totals' as const)
      : undefined;

  return {
    reason: 'deck_empty',
    ...withIslek,
    winnerTeam: diff.winnerTeam,
    rawTotals: diff.rawTotals,
    breakdown,
    playerPenalties,
    noScoringReason,
  };
}

export function applyHandScore(state: GameState, result: HandScoreResult): void {
  state.teamScores[0] += result.teamDelta[0];
  state.teamScores[1] += result.teamDelta[1];
  state.handHistory.push({
    handNumber: state.handNumber,
    reason: result.reason,
    teamDelta: [...result.teamDelta],
    rawTotals: [...result.rawTotals],
    penaltyTeam: result.penaltyTeam,
    penaltyAmount: result.penaltyAmount,
    teamScoresAfter: [...state.teamScores],
  });
  state.handResult = result;
  const hands = state.players.map((p) => [...p.hand]) as [Card[], Card[], Card[], Card[]];
  const finisher = result.finishInfo?.winnerSeat;
  if (finisher != null && hands[finisher].length === 0) {
    const top = state.discardPile[state.discardPile.length - 1];
    if (top) hands[finisher] = [top];
  }
  state.endSnapshot = hands;
  state.phase = 'ended';
}

export function winnerFromScores(scores: [number, number]): Team | null {
  if (scores[0] === scores[1]) return null;
  return (scores[0] < scores[1] ? 0 : 1) as Team;
}
