import {
    BOARD_INDICES,
    PAWN_TEMPLATE,
    PIECE_TEMPLATE,
    TileStats,
    TilePiece,
    type BoardIndex,
    type ColorBucket,
    type StatsField,
    type TileGrid,
    type TileRow,
} from './tile-tracker-types';

function namedStats(cell: StatsField, color: 'b' | 'w', name: string): TileStats {
    const bucket = cell[color][name];
    if (bucket) return bucket;
    const created = new TileStats();
    cell[color][name] = created;
    return created;
}

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
 * These helpers keep constructor / `add` / `resetWorkerBatch` / `nextGame` DRY.
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
        const bStats = namedStats(cell, 'b', name);
        const wStats = namedStats(cell, 'w', name);
        bStats.movedTo = 0;
        bStats.wasOn = 0;
        bStats.capturedOn = 0;
        bStats.wasCapturedOn = 0;
        wStats.movedTo = 0;
        wStats.wasOn = 0;
        wStats.capturedOn = 0;
        wStats.wasCapturedOn = 0;
    }
    for (const name of PIECE_TEMPLATE) {
        const bStats = namedStats(cell, 'b', name);
        const wStats = namedStats(cell, 'w', name);
        bStats.movedTo = 0;
        bStats.wasOn = 0;
        bStats.capturedOn = 0;
        bStats.wasCapturedOn = 0;
        wStats.movedTo = 0;
        wStats.wasOn = 0;
        wStats.capturedOn = 0;
        wStats.wasCapturedOn = 0;
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

/** Zero every cell and restore starting virtual pieces (worker batch reuse). */
export function resetTileGrid(tiles: TileGrid): void {
    for (const row of BOARD_INDICES) {
        for (const col of BOARD_INDICES) {
            zeroCellStats(tiles[row][col]);
            setStartingPiece(tiles, row, col);
        }
    }
}

/** Resolve dynamic board coords to a grid cell when indices are in range. */
export function tileCellAt(tiles: TileGrid, coords: number[]): StatsField | undefined {
    const row = coords[0];
    const col = coords[1];
    if (row === undefined || col === undefined || !isBoardIndex(row) || !isBoardIndex(col)) {
        return undefined;
    }
    return tiles[row][col];
}

function isBoardIndex(n: number): n is BoardIndex {
    return (n | 0) === n && n >= 0 && n <= 7;
}
