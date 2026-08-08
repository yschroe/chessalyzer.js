/**
 * Data model for {@link tileTracker}: per-square stats and virtual piece tracking.
 *
 * Piece names use the canonical starting-position templates (`Pa`…`Ph`, `Ra`…`Rh`).
 * Tracker state is plain data so it can be merged across worker threads.
 */

import { pieceList, type StartingPieceName } from '#trackers/piece-types';

/** Counters for one color on one square (aggregate or per starting piece). */
export interface SquareCounters {
    /** Times a piece moved onto this square. */
    movedTo: number;
    /** Half-moves pieces spent occupying this square (summed across arrivals). */
    occupiedFor: number;
    /** Captures made on this square by this color. */
    captures: number;
    /** Pieces of this color lost on this square. */
    losses: number;
}

function createSquareCounters(): SquareCounters {
    return { movedTo: 0, occupiedFor: 0, captures: 0, losses: 0 };
}

/**
 * Per-color stats on a square: aggregate counters plus one slot per starting piece.
 * Access via `cell.w.total.occupiedFor` (aggregate) or `cell.w.byPiece.Nb.occupiedFor` (per piece).
 */
export interface PlayerSquareStats {
    /** Totals across all starting pieces of this color on the square. */
    total: SquareCounters;
    /** Per starting-piece-name counters (`Pa`, `Nb`, `Qd`, …). */
    byPiece: Record<StartingPieceName, SquareCounters>;
}

export function createPlayerSquareStats(): PlayerSquareStats {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- filled for every StartingPieceName in the loop below
    const byPiece = {} as Record<StartingPieceName, SquareCounters>;
    for (const name of pieceList) {
        byPiece[name] = createSquareCounters();
    }
    return { total: createSquareCounters(), byPiece };
}

/** Public per-square counters (what callers see on {@link TileTrackerState.squares}). */
export interface SquareStats {
    b: PlayerSquareStats;
    w: PlayerSquareStats;
}

/**
 * Virtual occupant tracked per square while replaying — distinct from a board piece.
 * `lastMovedOn` holds the move index at which this piece arrived on its square.
 */
export interface TilePiece {
    piece: string;
    color: 'b' | 'w';
    lastMovedOn: number;
}

export function createTilePiece(piece: string, color: 'b' | 'w'): TilePiece {
    return { piece, color, lastMovedOn: 0 };
}

/** Runtime cell: public counters plus live occupant for occupation tracking. */
export interface StatsField extends SquareStats {
    currentPiece: TilePiece | null;
}

type RuntimeTileRow = [
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
];

export type { RuntimeTileRow };

export type RuntimeTileGrid = [
    RuntimeTileRow,
    RuntimeTileRow,
    RuntimeTileRow,
    RuntimeTileRow,
    RuntimeTileRow,
    RuntimeTileRow,
    RuntimeTileRow,
    RuntimeTileRow,
];
