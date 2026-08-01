import {
    BOARD_INDICES,
    isBoardIndex,
    squareCol,
    squareRow,
    type BoardIndex,
    type Square,
} from '#board/board-coords';
import { getStartingPiece } from '#board/piece-names';
import { pieceList } from '#trackers/piece-types';
import {
    createColorBucket,
    TilePiece,
    type StatsField,
    type TileGrid,
    type TileRow,
    type TileStats,
} from '#trackers/tile/tile-tracker-types';

function addTileStats(dst: TileStats, src: TileStats): void {
    dst.movedTo += src.movedTo;
    dst.wasOn += src.wasOn;
    dst.capturedOn += src.capturedOn;
    dst.wasCapturedOn += src.wasCapturedOn;
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
    return {
        b: createColorBucket(),
        w: createColorBucket(),
        currentPiece: null,
    };
}

/**
 * Place the standard starting virtual piece on `(row, col)`, or clear the cell.
 * Board coords: row 0 = rank 8, row 7 = rank 1.
 */
export function setStartingPiece(tiles: TileGrid, row: BoardIndex, col: BoardIndex): void {
    const piece = getStartingPiece([row, col]);
    tiles[row][col].currentPiece = piece ? new TilePiece(piece.name, piece.color) : null;
}

/**
 * Add `src` cell stats into `dst` (multithread merge).
 * Used when combining worker batch results on the main thread.
 */
export function mergeCellStats(dst: StatsField, src: StatsField): void {
    addTileStats(dst.b.total, src.b.total);
    addTileStats(dst.w.total, src.w.total);

    for (const name of pieceList) {
        addTileStats(dst.b.byPiece[name], src.b.byPiece[name]);
        addTileStats(dst.w.byPiece[name], src.w.byPiece[name]);
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
