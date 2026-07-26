/**
 * Algebraic ↔ internal board coordinate conversion.
 *
 * Internal coords: `[row, col]` where row 0 = rank 8, row 7 = rank 1, col 0 = a-file.
 * Lookup tables precompute all 64 squares so hot SAN parsing avoids allocations.
 */

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export type BoardIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Indexed by `file * 8 + rankIndex` (rank `'1'`…`'8'` → 0…7). Values are shared — do not mutate. */
const algebraicToCoordsTable: number[][] = Array.from({ length: 64 }, (_, i) => {
    const file = (i / 8) | 0;
    const rank = i % 8;
    return [7 - rank, file];
});

function isBoardIndex(n: number): n is BoardIndex {
    return (n | 0) === n && n >= 0 && n <= 7;
}

/**
 * Convert algebraic square (e.g. `'e4'`) to board coords.
 * @returns Shared `[row, col]` array, or `undefined` if out of range.
 */
export function algebraicToCoords(square: string): number[] | undefined {
    const file = square.charCodeAt(0) - 97; // 'a' → 0
    const rank = square.charCodeAt(1) - 49; // '1' → 0
    if ((file | rank) >>> 3) return undefined;
    return algebraicToCoordsTable[file * 8 + rank];
}

/**
 * Read an algebraic square from `san` ending at `end` (exclusive), without slicing.
 * Used by SAN parsers where the target square is always the last two characters.
 */
export function algebraicToCoordsAt(san: string, end: number): number[] {
    const file = san.charCodeAt(end - 2) - 97;
    const rank = san.charCodeAt(end - 1) - 49;
    return algebraicToCoordsTable[file * 8 + rank] as number[];
}

/** Convert internal `[row, col]` to algebraic notation (e.g. `[6, 4]` → `'e2'`). */
export function coordsToAlgebraic(coords: number[]): string {
    const col = coords[1];
    const row = coords[0];
    if (col === undefined || row === undefined || !isBoardIndex(col)) return '';
    return `${FILES[col]}${8 - row}`;
}

/** Dense tile index for an on-board square. */
export function tileOffset(row: number, col: number): number {
    return row * 8 + col;
}

/** Parse row/col into fixed board indices, or null when out of range. */
export function parseBoardCoords(
    row: number | undefined,
    col: number | undefined,
): [BoardIndex, BoardIndex] | null {
    if (row === undefined || col === undefined || !isBoardIndex(row) || !isBoardIndex(col)) {
        return null;
    }
    return [row, col];
}

export function isOnBoard(row: number | undefined, col: number | undefined): boolean {
    return parseBoardCoords(row, col) !== null;
}

/** Copy lookup-table coords into a reusable mutable buffer. */
export function copyCoordsTo(target: number[], coords: readonly [number, number]): void {
    target[0] = coords[0];
    target[1] = coords[1];
}
