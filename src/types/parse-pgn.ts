/** Standard PGN game result tokens. */
export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';

/**
 * One half-move from parsed movetext.
 * Shape is intentionally minimal; future optional fields (`nags`, `comment`, `variations`) are additive.
 */
export interface ParsedMove {
    san: string;
}

/**
 * Internal assembler / analyze hot-path game shape — mainline SAN strings without per-move object allocation.
 *
 * Public APIs use {@link ParsedGame} (`ParsedMove[]`). Convert at boundaries via {@link toParsedGame} in `#pgn/to-parsed-game`.
 * Do not replace with `ParsedMove[]` on this path: board replay regresses badly (per-move `.san` + GC);
 * see AGENTS.md Performance — settled in v4 alpha API hardening.
 */
export interface AssembledGame {
    moves: string[];
    /** Game result from movetext (and/or Result tag when headers are parsed). */
    result?: GameResult;
    /** Tag-pair headers; present only when header parsing is enabled. */
    headers?: Readonly<Record<string, string>>;
}

/** Public stage-2 game shape (object moves for extensibility). */
export interface ParsedGame {
    moves: ParsedMove[];
    result?: GameResult;
    headers?: Readonly<Record<string, string>>;
}

/** Options for {@link parsePGN} and {@link streamParsePGN}. */
export interface ParsePgnOptions {
    /**
     * Parse tag-pair headers. Default `false`.
     * (`analyzePGN` additionally accepts `'auto'`, which infers from game trackers.)
     */
    headers?: boolean;
    maxGames?: number;
}

/** Resolved standalone-parse options shared by {@link parsePGN} and {@link streamParsePGN}. */
export interface StandaloneParseOptions {
    parseHeaders: boolean;
    maxGames: number;
}
