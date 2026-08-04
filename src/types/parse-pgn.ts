/** Standard PGN game result tokens. */
export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';

/** One half-move from parsed movetext (SAN only today; optional fields may be added later). */
export interface ParsedMove {
    /** Standard Algebraic Notation of the half-move. */
    san: string;
}

/**
 * Internal assembler / analyze hot-path game shape — mainline SAN strings without per-move object allocation.
 *
 * Public APIs use {@link ParsedGame} (`ParsedMove[]`). Do not replace with `ParsedMove[]` on this path:
 * board replay regresses badly (per-move `.san` + GC); see AGENTS.md Performance.
 */
export interface AssembledGame {
    moves: string[];
    /** Game result from movetext (and/or Result tag when headers are parsed). */
    result?: GameResult;
    /** Tag-pair headers; present only when header parsing is enabled. */
    headers?: Readonly<Record<string, string>>;
}

/** Parsed game returned by {@link parsePGN} and {@link streamParsePGN}. */
export interface ParsedGame {
    /** Mainline half-moves in SAN. */
    moves: ParsedMove[];
    /** Game result from movetext and/or the `Result` tag when headers are parsed. */
    result?: GameResult;
    /** Tag-pair headers when `headers: true` was passed to the parse call. */
    headers?: Readonly<Record<string, string>>;
}

/** Options for {@link parsePGN} and {@link streamParsePGN}. */
export interface ParsePGNOptions {
    /**
     * Parse tag-pair headers. Default `false`.
     * (`analyzePGN` additionally accepts `'auto'`, which infers from game trackers and filters.)
     */
    headers?: boolean;
    /** Stop after this many games. Default: no limit. */
    maxGames?: number;
}
