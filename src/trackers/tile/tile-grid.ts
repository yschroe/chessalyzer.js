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
    createTileColorStats,
    createTilePiece,
    type RuntimeTileGrid,
    type RuntimeTileRow,
    type StatsField,
    type TileCell,
    type TileGrid,
    type TileStats,
} from '#trackers/tile/tile-tracker-types';

function addTileStats(dst: TileStats, src: TileStats): void {
    dst.movedTo += src.movedTo;
    dst.occupiedFor += src.occupiedFor;
    dst.captures += src.captures;
    dst.losses += src.losses;
}

/**
 * Grid lifecycle helpers for the tile tracker: allocation, reset, merge.
 *
 * The runtime grid is an 8×8 array of cells holding aggregate stats for black/white
 * plus per-piece-name {@link TileStats} objects, alongside the live occupant.
 * These helpers keep init / track / onGameEnd DRY.
 */

/** Allocate a fresh 8×8 grid with zeroed stats and starting-position virtual pieces. */
export function createTileGrid(): RuntimeTileGrid {
    function makeRow(): RuntimeTileRow {
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

    const tiles: RuntimeTileGrid = [
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
        b: createTileColorStats(),
        w: createTileColorStats(),
        currentPiece: null,
    };
}

/**
 * Place the standard starting virtual piece on `(row, col)`, or clear the cell.
 * Board coords: row 0 = rank 8, row 7 = rank 1.
 */
export function setStartingPiece(tiles: RuntimeTileGrid, row: BoardIndex, col: BoardIndex): void {
    const piece = getStartingPiece([row, col]);
    tiles[row][col].currentPiece = piece ? createTilePiece(piece.name, piece.color) : null;
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

/**
 * Look up the tile cell for an algebraic {@link Square}.
 *
 * Prefer this over `tiles[row][col]` — it avoids `noUncheckedIndexedAccess` issues and
 * matches how heatmap presets access the grid.
 */
export function tileAt(tiles: TileGrid, square: Square): TileCell | undefined {
    const row = squareRow(square);
    const col = squareCol(square);
    if (!isBoardIndex(row) || !isBoardIndex(col)) {
        return undefined;
    }
    return tiles[row][col];
}

/**
 * Internal counterpart of {@link tileAt} that keeps the live occupant on the returned cell.
 * Kept separate so `RuntimeTileGrid` / `StatsField` stay out of the public type surface.
 */
export function runtimeTileAt(tiles: RuntimeTileGrid, square: Square): StatsField | undefined {
    const row = squareRow(square);
    const col = squareCol(square);
    if (!isBoardIndex(row) || !isBoardIndex(col)) {
        return undefined;
    }
    return tiles[row][col];
}
