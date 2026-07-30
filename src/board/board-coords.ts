/**
 * Algebraic ↔ internal board coordinate conversion.
 *
 * Internal coords: `[row, col]` where row 0 = rank 8, row 7 = rank 1, col 0 = a-file.
 * Lookup tables precompute all 64 squares so hot SAN parsing avoids allocations.
 */

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export type BoardIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Mutable `[row, col]` for in-place updates (piece lists, pooled replay buffers). Internal only. */
export type MutableBoardCoord = [row: number, col: number];

/** Read-only board square — public APIs and {@link Action} coord fields. */
export type BoardCoord = readonly [row: number, col: number];

/** Write into a reusable coord buffer (internal replay / piece lists). */
export function writeBoardCoord(coord: MutableBoardCoord, row: number, col: number): void {
    coord[0] = row;
    coord[1] = col;
}

/** Fixed row/column indices for the 8×8 board. */
export const BOARD_INDICES: readonly BoardIndex[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** Indexed by `file * 8 + rankIndex` (rank `'1'`…`'8'` → 0…7). Values are shared — do not mutate. */
const algebraicToCoordsTable: BoardCoord[] = Array.from({ length: 64 }, (_, i) => {
    const file = (i / 8) | 0;
    const rank = i % 8;
    return [7 - rank, file];
});

/** True if `n` is an integer board index in `0…7`. */
export function isBoardIndex(n: number | undefined): n is BoardIndex {
    return n !== undefined && (n | 0) === n && n >= 0 && n <= 7;
}

/**
 * Convert algebraic square (e.g. `'e4'`) to board coords.
 * @returns Shared `[row, col]` array, or `undefined` if out of range.
 */
export function algebraicToCoords(square: string): BoardCoord | undefined {
    const file = square.charCodeAt(0) - 97; // 'a' → 0
    const rank = square.charCodeAt(1) - 49; // '1' → 0
    if ((file | rank) >>> 3) return undefined;
    return algebraicToCoordsTable[file * 8 + rank];
}

/**
 * Read an algebraic square from `san` ending at `end` (exclusive), without slicing.
 * Used by SAN parsers where the target square is always the last two characters.
 */
export function algebraicToCoordsAt(san: string, end: number): BoardCoord {
    const file = san.charCodeAt(end - 2) - 97;
    const rank = san.charCodeAt(end - 1) - 49;
    // Caller guarantees a valid square in the trailing SAN characters (table always covers 0..63).
    return algebraicToCoordsTable[file * 8 + rank]!;
}

/** Convert internal `[row, col]` to algebraic notation (e.g. `[6, 4]` → `'e2'`). */
export function coordsToAlgebraic(coords: BoardCoord): string {
    const [row, col] = coords;
    if (row === undefined || !isBoardIndex(col)) return '';
    return `${FILES[col]}${8 - row}`;
}
