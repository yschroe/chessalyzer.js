/**
 * Data model for {@link tileTracker}: per-square stats and virtual piece tracking.
 *
 * Piece names use the canonical starting-position templates (`Pa`…`Ph`, `Ra`…`Rh`).
 * Tracker state is plain data so it can be merged across worker threads.
 */

import type { Square } from '#board/board-coords';
import { pieceList, type StartingPieceName } from '#trackers/piece-types';

/** Board square pair used in tile move tracking. */
export interface MoveCoords {
    from: Square;
    to: Square;
}

/** Counters for one color on one square (aggregate or per starting piece). */
export interface TileStats {
    /** Times a piece moved onto this square. */
    movedTo: number;
    /** Half-moves pieces spent occupying this square (summed across arrivals). */
    occupiedFor: number;
    /** Captures made on this square by this color. */
    captures: number;
    /** Pieces of this color lost on this square. */
    losses: number;
}

function createTileStats(): TileStats {
    return { movedTo: 0, occupiedFor: 0, captures: 0, losses: 0 };
}

/**
 * Per-color stats on a square: aggregate counters plus one slot per starting piece.
 * Access via `cell.w.total.occupiedFor` (aggregate) or `cell.w.byPiece.Nb.occupiedFor` (per piece).
 */
export interface TileColorStats {
    /** Totals across all starting pieces of this color on the square. */
    total: TileStats;
    /** Per starting-piece-name counters (`Pa`, `Nb`, `Qd`, …). */
    byPiece: Record<StartingPieceName, TileStats>;
}

export function createTileColorStats(): TileColorStats {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- filled for every StartingPieceName in the loop below
    const byPiece = {} as Record<StartingPieceName, TileStats>;
    for (const name of pieceList) {
        byPiece[name] = createTileStats();
    }
    return { total: createTileStats(), byPiece };
}

/** Public per-square counters (what callers see on {@link TileTrackerState.tiles}). */
export interface TileCell {
    b: TileColorStats;
    w: TileColorStats;
}

/** Internal runtime cell — includes live occupant for occupation tracking (stripped after analysis). */
export interface TilePiece {
    piece: string;
    color: 'b' | 'w';
    lastMovedOn: number;
}

export function createTilePiece(piece: string, color: 'b' | 'w'): TilePiece {
    return { piece, color, lastMovedOn: 0 };
}

/** Runtime cell: public counters plus live occupant for occupation tracking. */
export interface StatsField extends TileCell {
    currentPiece: TilePiece | null;
}

type TileRow = [TileCell, TileCell, TileCell, TileCell, TileCell, TileCell, TileCell, TileCell];

/**
 * 8×8 tile grid indexed by internal board coordinates.
 * Row 0 is rank 8; column 0 is the a-file. Prefer {@link tileAt} for square-based access.
 */
export type TileGrid = [TileRow, TileRow, TileRow, TileRow, TileRow, TileRow, TileRow, TileRow];

export type RuntimeTileRow = [
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
];

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
