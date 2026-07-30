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
 * Internal assembler output — mainline SAN strings without per-move object allocation.
 * Convert to {@link ParsedGame} at public API boundaries via {@link toParsedGame}.
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

/** Options for {@link parsePGN}. */
export interface ParsePgnOptions {
    /**
     * Parse tag-pair headers. Default: `false` for parsePGN; `'auto'` infers from game trackers on analyzePGN.
     */
    headers?: boolean | 'auto';
    maxGames?: number;
}

/** Create a {@link ParsedMove} at the single monomorphic construction site. */
export function createParsedMove(san: string): ParsedMove {
    return { san };
}

/** Materialize public {@link ParsedGame} from a hot-path {@link AssembledGame}. */
export function toParsedGame(game: AssembledGame): ParsedGame {
    const moves = new Array<ParsedMove>(game.moves.length);
    for (let i = 0; i < game.moves.length; i++) {
        moves[i] = createParsedMove(game.moves[i]!);
    }
    return {
        moves,
        result: game.result,
        headers: game.headers,
    };
}
