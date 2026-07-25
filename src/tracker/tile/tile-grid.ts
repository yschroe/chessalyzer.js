import {
    PAWN_TEMPLATE,
    PIECE_TEMPLATE,
    TileStats,
    TilePiece,
    type ColorBucket,
    type StatsField,
} from './tile-tracker-types';

/**
 * Grid lifecycle helpers for {@link TileTrackerBase}: allocation, reset, merge.
 *
 * The tile grid is an 8×8 array of {@link StatsField} cells. Each cell contains
 * aggregate stats for black/white plus per-piece-name {@link TileStats} objects.
 * These helpers keep constructor / `add` / `resetWorkerBatch` / `nextGame` DRY.
 */

/** Allocate a fresh 8×8 grid with zeroed stats and starting-position virtual pieces. */
export function createTileGrid(): StatsField[][] {
    const tiles: StatsField[][] = [];

    for (let row = 0; row < 8; row += 1) {
        const currRow: StatsField[] = [];

        for (let col = 0; col < 8; col += 1) {
            currRow.push(createEmptyCell());
        }
        tiles.push(currRow);
    }

    for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 8; col += 1) {
            setStartingPiece(tiles, row, col);
        }
    }

    return tiles;
}

/** Build one empty cell with aggregate + per-piece stat slots (all zero). */
function createEmptyCell(): StatsField {
    const cell: StatsField = {
        b: new TileStats() as ColorBucket,
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
export function setStartingPiece(tiles: StatsField[][], row: number, col: number): void {
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

/** Zero all counters on one cell (aggregate + per-piece). Does not touch `currentPiece`. */
function zeroCellStats(cell: StatsField): void {
    cell.b.movedTo = 0;
    cell.b.wasOn = 0;
    cell.b.capturedOn = 0;
    cell.b.wasCapturedOn = 0;
    cell.w.movedTo = 0;
    cell.w.wasOn = 0;
    cell.w.capturedOn = 0;
    cell.w.wasCapturedOn = 0;

    for (const name of PAWN_TEMPLATE) {
        cell.b[name].movedTo = 0;
        cell.b[name].wasOn = 0;
        cell.b[name].capturedOn = 0;
        cell.b[name].wasCapturedOn = 0;
        cell.w[name].movedTo = 0;
        cell.w[name].wasOn = 0;
        cell.w[name].capturedOn = 0;
        cell.w[name].wasCapturedOn = 0;
    }
    for (const name of PIECE_TEMPLATE) {
        cell.b[name].movedTo = 0;
        cell.b[name].wasOn = 0;
        cell.b[name].capturedOn = 0;
        cell.b[name].wasCapturedOn = 0;
        cell.w[name].movedTo = 0;
        cell.w[name].wasOn = 0;
        cell.w[name].capturedOn = 0;
        cell.w[name].wasCapturedOn = 0;
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
        dst.b[name].movedTo += src.b[name].movedTo;
        dst.w[name].movedTo += src.w[name].movedTo;
        dst.b[name].wasOn += src.b[name].wasOn;
        dst.w[name].wasOn += src.w[name].wasOn;
        dst.b[name].capturedOn += src.b[name].capturedOn;
        dst.w[name].capturedOn += src.w[name].capturedOn;
        dst.b[name].wasCapturedOn += src.b[name].wasCapturedOn;
        dst.w[name].wasCapturedOn += src.w[name].wasCapturedOn;
    }
    for (const name of PIECE_TEMPLATE) {
        dst.b[name].movedTo += src.b[name].movedTo;
        dst.w[name].movedTo += src.w[name].movedTo;
        dst.b[name].wasOn += src.b[name].wasOn;
        dst.w[name].wasOn += src.w[name].wasOn;
        dst.b[name].capturedOn += src.b[name].capturedOn;
        dst.w[name].capturedOn += src.w[name].capturedOn;
        dst.b[name].wasCapturedOn += src.b[name].wasCapturedOn;
        dst.w[name].wasCapturedOn += src.w[name].wasCapturedOn;
    }
}

/** Zero every cell and restore starting virtual pieces (worker batch reuse). */
export function resetTileGrid(tiles: StatsField[][]): void {
    for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 8; col += 1) {
            zeroCellStats(tiles[row][col]);
            setStartingPiece(tiles, row, col);
        }
    }
}
