/**
 * Structural type guards for tracker state in tests.
 *
 * Types come from `#` (source) so unit tests stay build-free. Integration tests
 * may still use these helpers; they assert shapes, not the package export graph.
 */
import type { PieceTrackerState } from '#trackers/piece-tracker';
import type { RuntimeTileGrid } from '#trackers/tile/tile-tracker-types';

/** Shared shape for custom / merge game-tracker stubs (wins + games). */
export interface GameWinsTrackerState {
    wins: [number, number, number];
    games: number;
}

/** Runtime tile tracker state before `onFinish` (internal 8×8 grid). */
export interface TileTrackerRuntimeState {
    tiles: RuntimeTileGrid;
    movesTotal: number;
    movesGame?: number;
}

export function isTileTrackerRuntimeState(value: unknown): value is TileTrackerRuntimeState {
    return typeof value === 'object' && value !== null && 'movesTotal' in value && 'tiles' in value;
}

export function isPieceTrackerState(value: unknown): value is PieceTrackerState {
    return typeof value === 'object' && value !== null && 'b' in value && 'w' in value;
}

export function isGameWinsTrackerState(value: unknown): value is GameWinsTrackerState {
    if (typeof value !== 'object' || value === null) return false;
    const wins = Reflect.get(value, 'wins');
    return 'games' in value && Array.isArray(wins);
}
