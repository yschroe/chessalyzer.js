/**
 * Board replay mode for one game (string discriminant — no allocations).
 * - `skip` — no board replay (PGN parse + game trackers + counts only)
 * - `board` — SAN decode + apply on board ({@link SanApplier}); no {@link Action} objects
 * - `actions` — SAN decode + {@link Action}[] for move trackers ({@link SanDecoder})
 */
export type ReplayMode = 'skip' | 'board' | 'actions';

/**
 * When true, skip board replay if there are no move trackers.
 * Default true: count-only runs skip board replay (~10% faster on large fixtures; bench 2026-07).
 * Set to false to always replay SAN (surfaces replay errors on count-only runs).
 */
const SKIP_REPLAY_WITHOUT_MOVE_TRACKERS = true;

/**
 * Resolve replay mode from tracker presence.
 * Single call-site helper so {@link GameReplayer} does not infer mode from trackers.
 */
export function resolveReplayMode(hasMoveTrackers: boolean): ReplayMode {
    if (hasMoveTrackers) return 'actions';
    if (SKIP_REPLAY_WITHOUT_MOVE_TRACKERS) return 'skip';
    return 'board';
}
