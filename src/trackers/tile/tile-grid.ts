import {
    BOARD_INDICES,
    isBoardIndex,
    squareCol,
    squareRow,
    type BoardIndex,
    type Square,
} from '#board/board-coords';
import {
    PAWN_TEMPLATE,
    PIECE_TEMPLATE,
    TileStats,
    TilePiece,
    type ColorBucket,
    type StatsField,
    type TileGrid,
    type TileRow,
} from '#trackers/tile/tile-tracker-types';

function addNamedStats(dst: StatsField, src: StatsField, color: 'b' | 'w', name: string): void {
    const srcStats = src[color][name];
    const dstStats = dst[color][name];
    if (!srcStats || !dstStats) return;
    dstStats.movedTo += srcStats.movedTo;
    dstStats.wasOn += srcStats.wasOn;
    dstStats.capturedOn += srcStats.capturedOn;
    dstStats.wasCapturedOn += srcStats.wasCapturedOn;
}

/**
 * Grid lifecycle helpers for {@link TileTrackerBase}: allocation, reset, merge.
 *
 * The tile grid is an 8×8 array of {@link StatsField} cells. Each cell contains
 * aggregate stats for black/white plus per-piece-name {@link TileStats} objects.
 * These helpers keep constructor / `add` / `onGameEnd` DRY.
 */

/** Allocate a fresh 8×8 grid with zeroed stats and starting-position virtual pieces. */
export function createTileGrid(): TileGrid {
    function makeRow(): TileRow {
        return [
            createEmptyCell(),
            createEmptyCell(),
            createEmptyCell(),
            createEmptyCell(),
            createEmptyCell(),
            createEmptyCell(),
            createEmptyCell(),
            createEmptyCell(),
        ];
    }

    const tiles: TileGrid = [
        makeRow(),
        makeRow(),
        makeRow(),
        makeRow(),
        makeRow(),
        makeRow(),
        makeRow(),
        makeRow(),
    ];

    for (const row of BOARD_INDICES) {
        for (const col of BOARD_INDICES) {
            setStartingPiece(tiles, row, col);
        }
    }

    return tiles;
}

/** Build one empty cell with aggregate + per-piece stat slots (all zero). */
function createEmptyCell(): StatsField {
    const cell: StatsField = {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- ColorBucket built incrementally; aggregate TileStats then per-piece slots
        b: new TileStats() as ColorBucket,
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- ColorBucket built incrementally; aggregate TileStats then per-piece slots
        w: new TileStats() as ColorBucket,
        currentPiece: null,
    };

    for (const name of PAWN_TEMPLATE) {
        cell.b[name] = new TileStats();
        cell.w[name] = new TileStats();
    }
    for (const name of PIECE_TEMPLATE) {
        cell.b[name] = new TileStats();
        cell.w[name] = new TileStats();
    }

    return cell;
}

/**
 * Place the standard starting virtual piece on `(row, col)`, or clear the cell.
 * Board coords: row 0 = rank 8, row 7 = rank 1.
 */
export function setStartingPiece(tiles: TileGrid, row: BoardIndex, col: BoardIndex): void {
    let color: 'b' | 'w' | undefined;
    let piece: string | undefined;

    if (row === 0) {
        color = 'b';
        piece = PIECE_TEMPLATE[col];
    } else if (row === 1) {
        color = 'b';
        piece = PAWN_TEMPLATE[col];
    } else if (row === 6) {
        color = 'w';
        piece = PAWN_TEMPLATE[col];
    } else if (row === 7) {
        color = 'w';
        piece = PIECE_TEMPLATE[col];
    }

    if (color !== undefined && piece !== undefined) {
        tiles[row][col].currentPiece = new TilePiece(piece, color);
    } else {
        tiles[row][col].currentPiece = null;
    }
}

/**
 * Add `src` cell stats into `dst` (multithread merge).
 * Used when combining worker batch results on the main thread.
 */
export function mergeCellStats(dst: StatsField, src: StatsField): void {
    dst.b.movedTo += src.b.movedTo;
    dst.w.movedTo += src.w.movedTo;
    dst.b.wasOn += src.b.wasOn;
    dst.w.wasOn += src.w.wasOn;
    dst.b.capturedOn += src.b.capturedOn;
    dst.w.capturedOn += src.w.capturedOn;
    dst.b.wasCapturedOn += src.b.wasCapturedOn;
    dst.w.wasCapturedOn += src.w.wasCapturedOn;

    for (const name of PAWN_TEMPLATE) {
        addNamedStats(dst, src, 'b', name);
        addNamedStats(dst, src, 'w', name);
    }
    for (const name of PIECE_TEMPLATE) {
        addNamedStats(dst, src, 'b', name);
        addNamedStats(dst, src, 'w', name);
    }
}

/** Resolve an interned {@link Square} to a grid cell when indices are in range. */
export function tileCellAt(tiles: TileGrid, square: Square): StatsField | undefined {
    const row = squareRow(square);
    const col = squareCol(square);
    if (!isBoardIndex(row) || !isBoardIndex(col)) {
        return undefined;
    }
    return tiles[row][col];
}
