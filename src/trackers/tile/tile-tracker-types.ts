/**
 * Data model for {@link TileTrackerBase}: per-square stats and virtual piece tracking.
 *
 * Piece names come from the canonical starting-position templates (via `piece-list`).
 * All tracker state is plain data (no class instances) so it survives structured
 * clone across the worker boundary.
 */

import { pieceList, type Piece } from '#trackers/piece-types';

/** Counters for one color on one square (aggregate or per-piece-name). */
export interface TileStats {
    movedTo: number;
    wasOn: number;
    capturedOn: number;
    wasCapturedOn: number;
}

function createTileStats(): TileStats {
    return { movedTo: 0, wasOn: 0, capturedOn: 0, wasCapturedOn: 0 };
}

/**
 * Per-color bucket on a square: aggregate counters plus one slot per starting piece.
 * Access via `cell.w.total.wasOn` (aggregate) or `cell.w.byPiece.Nb.wasOn` (per piece).
 */
export interface ColorBucket {
    total: TileStats;
    byPiece: Record<Piece, TileStats>;
}

export function createColorBucket(): ColorBucket {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- filled for every Piece in the loop below
    const byPiece = {} as Record<Piece, TileStats>;
    for (const name of pieceList) {
        byPiece[name] = createTileStats();
    }
    return { total: createTileStats(), byPiece };
}

/**
 * Virtual piece used for occupation tracking — not the same as board {@link ChessPiece}.
 * `lastMovedOn` stores the move index when this piece last arrived on its square.
 */
export class TilePiece {
    piece: string;
    color: 'b' | 'w';
    lastMovedOn: number;

    constructor(piece: string, color: 'b' | 'w') {
        this.piece = piece;
        this.color = color;
        this.lastMovedOn = 0;
    }
}

/** One cell of the 8×8 tile grid: color aggregates, per-piece stats, and current occupant. */
export interface StatsField {
    b: ColorBucket;
    w: ColorBucket;
    currentPiece: TilePiece | null;
}

export type TileRow = [
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
    StatsField,
];

export type TileGrid = [TileRow, TileRow, TileRow, TileRow, TileRow, TileRow, TileRow, TileRow];
