/**
 * Data model for {@link TileTrackerBase}: per-square stats and virtual piece tracking.
 *
 * Piece name templates are shared with board replay and heatmaps via {@link PAWN_TEMPLATE}
 * and {@link PIECE_TEMPLATE} from `board/piece-names`.
 */

export { PAWN_TEMPLATE, PIECE_TEMPLATE } from '#board/piece-names';

/** Counters for one color on one square (aggregate or per-piece-name). */
export class TileStats {
    movedTo: number;
    wasOn: number;
    capturedOn: number;
    wasCapturedOn: number;

    constructor() {
        this.movedTo = 0;
        this.wasOn = 0;
        this.capturedOn = 0;
        this.wasCapturedOn = 0;
    }
}

/**
 * Per-color bucket on a square: aggregate counters plus named sub-buckets per piece type.
 * Both `cell.b.movedTo` and `cell.b.Nb.movedTo` are valid access patterns.
 */
export type ColorBucket = TileStats & Record<string, TileStats>;

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
