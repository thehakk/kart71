import type { Seat } from '../shared/types.js';

/** Sira ve atis yonu: saat yonunun tersi (CCW). */
export function nextTurnSeat(seat: Seat): Seat {
  return ((seat + 3) % 4) as Seat;
}

/** Bir onceki oyuncu (CCW sira). */
export function prevTurnSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

/** Sonraki el dağıtan (CCW). */
export function nextDealerSeat(dealer: Seat): Seat {
  return ((dealer + 3) % 4) as Seat;
}

export const EARLY_DISCARD_LIMIT = 4;

/** Ilk 4 atik dusene kadar per sorulmaz/acilmaz; cift acilmaz. */
export function isEarlyDiscardPhase(discardsMade: number): boolean {
  return discardsMade < EARLY_DISCARD_LIMIT;
}
