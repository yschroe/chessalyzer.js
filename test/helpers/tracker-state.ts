import type { AnalyzeResult } from 'chessalyzer';
import type { GameTrackerState } from 'chessalyzer/trackers';
import type { PieceTrackerState } from 'chessalyzer/trackers';
import type { TileTrackerState } from 'chessalyzer/trackers';
import type { StateOf, TrackerDef } from 'chessalyzer/trackers';

import type { CustomGameTrackerState } from '../fixtures/custom-game-tracker';

/** Resolve accumulated state for a tracker definition in an analyze result. */
export function trackerStateAt<D extends TrackerDef>(
    result: AnalyzeResult,
    def: D,
    runIndex = 0,
): StateOf<D> {
    const entry = result.runs[runIndex]?.trackers.find((t) => t.tracker === def);
    if (!entry) {
        throw new Error(`Tracker "${def.id}" not found in run ${runIndex}`);
    }
    if (!isStateForDef(entry.state, def)) {
        throw new Error(`Tracker "${def.id}" state missing in run ${runIndex}`);
    }
    return entry.state;
}

function isStateForDef<D extends TrackerDef>(state: unknown, _def: D): state is StateOf<D> {
    return state !== undefined;
}

export function isGameTrackerState(value: unknown): value is GameTrackerState {
    return (
        typeof value === 'object' &&
        value !== null &&
        'games' in value &&
        'results' in value &&
        'ECO' in value
    );
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
