/**
 * Algebraic ↔ internal board coordinate conversion.
 *
 * Internal coords: `[row, col]` where row 0 = rank 8, row 7 = rank 1, col 0 = a-file.
 * Lookup tables precompute all 64 squares so hot SAN parsing avoids allocations.
 */

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** Indexed by `file * 8 + rankIndex` (rank `'1'`…`'8'` → 0…7). Values are shared — do not mutate. */
const algebraicToCoordsTable: number[][] = Array.from({ length: 64 });
for (let file = 0; file < 8; file += 1) {
    for (let rank = 0; rank < 8; rank += 1) {
        algebraicToCoordsTable[file * 8 + rank] = [7 - rank, file];
    }
}

/** Sentinel returned by {@link getRowCol} when disambiguator char is invalid. */
const rowColNone: (number | null)[] = [null, null];

/** `[null, col]` for file letters `'a'`…`'h'`. */
const rowColByFile: (number | null)[][] = [];
/** `[row, null]` for rank digits `'1'`…`'8'`. */
const rowColByRank: (number | null)[][] = [];
for (let i = 0; i < 8; i += 1) {
    rowColByFile[i] = [null, i];
    rowColByRank[i] = [7 - i, null];
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
    return algebraicToCoordsTable[file * 8 + rank];
}

/** Convert internal `[row, col]` to algebraic notation (e.g. `[6, 4]` → `'e2'`). */
export function coordsToAlgebraic(coords: number[]): string {
    return `${FILES[coords[1]]}${8 - coords[0]}`;
}

/**
 * Parse a one-char SAN disambiguator into `[row, col]` partial coords.
 * File letter → `[null, col]`; rank digit → `[row, null]`; invalid → `[null, null]`.
 */
export function getRowCol(file: string): (number | null)[] {
    if (file.length === 0) return rowColNone;
    const c = file.charCodeAt(0);
    if (c >= 97 && c <= 104) return rowColByFile[c - 97];
    if (c >= 49 && c <= 56) return rowColByRank[c - 49];
    return rowColNone;
}

/** Map file letter `'a'`…`'h'` to column index 0…7, or null if invalid. */
export function getFileNumber(file: string): number | null {
    const n = file.charCodeAt(0) - 97;
    return n >= 0 && n < 8 ? n : null;
}
