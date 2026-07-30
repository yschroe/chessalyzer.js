/**
 * Algebraic ↔ internal board coordinate conversion.
 *
 * Internal coords: `[row, col]` where row 0 = rank 8, row 7 = rank 1, col 0 = a-file.
 * Public APIs use interned {@link Square} strings (`'a1'`…`'h8'`) for ergonomics;
 * hot paths index {@link SQUARES} by internal row/col without allocating.
 */

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export type BoardIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// oxfmt-ignore
/** Interned algebraic square (`'a1'`…`'h8'`). */
export type Square =
    | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8'
    | 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8'
    | 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c7' | 'c8'
    | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8'
    | 'e1' | 'e2' | 'e3' | 'e4' | 'e5' | 'e6' | 'e7' | 'e8'
    | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8'
    | 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'g7' | 'g8'
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'h7' | 'h8';

/** Mutable `[row, col]` for in-place updates (piece lists, pooled replay buffers). Internal only. */
export type MutableBoardCoord = [row: number, col: number];

/** Read-only board square — internal APIs and coord conversion. */
export type BoardCoord = readonly [row: number, col: number];

/** Fixed row/column indices for the 8×8 board. */
export const BOARD_INDICES: readonly BoardIndex[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** Indexed by `file * 8 + rankIndex` (rank `'1'`…`'8'` → 0…7). Values are shared — do not mutate. */
const algebraicToCoordsTable: BoardCoord[] = Array.from({ length: 64 }, (_, i) => {
    const file = (i / 8) | 0;
    const rank = i % 8;
    return [7 - rank, file];
});

// oxfmt-ignore
/** Interned squares indexed by internal `row * 8 + col` (row 0 = rank 8). */
const SQUARES: readonly Square[] = [
    'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
    'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
    'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
    'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
    'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
    'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
    'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
    'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
];

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

/** Convert internal `[row, col]` to interned {@link Square}. */
export function coordsToSquare(row: number, col: number): Square {
    return SQUARES[row * 8 + col]!;
}

/** Convert internal coords to interned {@link Square}. */
export function coordsToSquareFromCoord(coords: BoardCoord): Square {
    const [row, col] = coords;
    return SQUARES[row * 8 + col]!;
}

/** Convert interned {@link Square} to internal `[row, col]`. */
export function squareToCoords(square: Square): BoardCoord {
    return algebraicToCoords(square)!;
}

/** Convert internal `[row, col]` to algebraic notation (e.g. `[6, 4]` → `'e2'`). */
export function coordsToAlgebraic(coords: BoardCoord): string {
    const [row, col] = coords;
    if (row === undefined || !isBoardIndex(col)) return '';
    return `${FILES[col]}${8 - row}`;
}

/** Grid row index from an interned {@link Square} (0 = rank 8). */
export function squareRow(square: Square): number {
    return 7 - (square.charCodeAt(1) - 49);
}

/** Grid column index from an interned {@link Square} (0 = a-file). */
export function squareCol(square: Square): number {
    return square.charCodeAt(0) - 97;
}
