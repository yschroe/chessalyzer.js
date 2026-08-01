import { getTrackerState } from 'chessalyzer';
import type { AnalyzeResult } from 'chessalyzer';
import type { PieceTrackerState } from 'chessalyzer/trackers';
import type { TileTrackerState } from 'chessalyzer/trackers';
import type { StateOf, TrackerDef } from 'chessalyzer/trackers';

import type { CustomGameTrackerState } from '../fixtures/custom-game-tracker';

/** @deprecated Use public {@link getTrackerState} from `chessalyzer`. */
export function trackerStateAt<D extends TrackerDef>(
    result: AnalyzeResult,
    def: D,
    runIndex = 0,
): StateOf<D> {
    return getTrackerState(result, def, runIndex);
}

export function isTileTrackerState(value: unknown): value is TileTrackerState {
    return (
        typeof value === 'object' &&
        value !== null &&
        'movesTotal' in value &&
        'movesGame' in value &&
        'tiles' in value
    );
}

export function isPieceTrackerState(value: unknown): value is PieceTrackerState {
    return typeof value === 'object' && value !== null && 'b' in value && 'w' in value;
}

export function isCustomGameTrackerState(value: unknown): value is CustomGameTrackerState {
    if (typeof value !== 'object' || value === null) return false;
    const wins = Reflect.get(value, 'wins');
    return 'games' in value && Array.isArray(wins);
}
