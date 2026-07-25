/**
 * Data model for {@link TileTrackerBase}: per-square stats and virtual piece tracking.
 *
 * Each board square holds aggregate stats for black/white (`TileStats`) plus per-piece-name
 * breakdowns keyed by strings like `Pa`, `Nb`, `Ke`. The `currentPiece` field tracks which
 * (virtual) piece occupies the square between moves for occupation-time statistics.
 */

/** Standard starting pawn names by file (a–h). Index matches board column. */
export const PAWN_TEMPLATE = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];

/** Standard starting piece names by file on back rank (a–h). */
export const PIECE_TEMPLATE = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

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
