/**
 * Board replay mode for one game.
 * - `skip` — no board replay (PGN parse + game trackers + counts only)
 * - `board` — SAN decode + apply on board; no {@link Action} objects
 * - `actions` — SAN decode + {@link Action}[] for move trackers
 */
export type ReplayMode = 'skip' | 'board' | 'actions';

/**
 * Resolve replay mode from tracker presence.
 * Count-only runs skip board replay (~10% faster on large fixtures; bench 2026-07).
 * Single call-site helper so {@link GameReplayer} does not infer mode from trackers.
 */
export function resolveReplayMode(hasMoveTrackers: boolean): ReplayMode {
    return hasMoveTrackers ? 'actions' : 'skip';
}

/**
 * Apply an optional user {@link ReplayMode} override from {@link AnalyzeOptions.replay}.
 * Move trackers require `'actions'`; omitting `userReplay` defers to {@link resolveReplayMode}.
 */
export function resolveEffectiveReplayMode(
    hasMoveTrackers: boolean,
    userReplay?: ReplayMode,
): ReplayMode {
    if (userReplay === undefined) return resolveReplayMode(hasMoveTrackers);
    if (hasMoveTrackers && userReplay !== 'actions') {
        throw new Error('Move trackers require replay: "actions"');
    }
    return userReplay;
}
