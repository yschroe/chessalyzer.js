import type { PieceTrackerState } from 'chessalyzer/trackers';
import type { TileTrackerState } from 'chessalyzer/trackers';

import type { CustomGameTrackerState } from '../fixtures/custom-game-tracker';

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
