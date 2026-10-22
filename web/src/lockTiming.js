export const LOCK_MS = 350;
export const SETTLE_MS = 80;
// Wall-clock time, independent of how often picking is throttled.
export function lockProgress(now, candidateSince, lastMove) {
  return Math.min(1, Math.max(0, (now - Math.max(candidateSince, lastMove + SETTLE_MS)) / LOCK_MS));
}
