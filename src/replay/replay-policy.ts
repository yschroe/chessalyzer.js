/**
 * Board-replay policy for one game (string discriminant — no allocations).
 * - `skip` — no board replay (assemble + game trackers + counts only)
 * - `none` — mutate the board only ({@link SanApplier}); no {@link Action} objects
 * - `actions` — build {@link Action}[] for move trackers ({@link SanToActions})
 */
export type ReplayPolicy = 'skip' | 'none' | 'actions';

/**
 * When true, skip board replay if there are no move trackers.
 * Default true: count-only runs skip board replay (~10% faster on large fixtures; bench 2026-07).
 * Set to false to always replay SAN (surfaces replay errors on count-only runs).
 */
const SKIP_REPLAY_WITHOUT_MOVE_TRACKERS = true;

/**
 * Resolve replay policy from tracker presence.
 * Single call-site helper so {@link GameReplayer} does not infer mode from trackers.
 */
export function resolveReplayPolicy(hasMoveTrackers: boolean): ReplayPolicy {
    if (hasMoveTrackers) return 'actions';
    if (SKIP_REPLAY_WITHOUT_MOVE_TRACKERS) return 'skip';
    return 'none';
}
