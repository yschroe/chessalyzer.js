import type { ParsePgnOptions } from '#types/parse-pgn';

/** Resolved standalone-parse options shared by {@link parsePGN} and {@link streamParsePGN}. */
export interface StandaloneParseOptions {
    parseHeaders: boolean;
    maxGames: number;
}

/**
 * Resolve {@link ParsePgnOptions} for the standalone parse entry points.
 * Unlike `analyzePGN` there is no `'auto'` inference — headers are opt-in only.
 */
export function resolveStandaloneParseOptions(options?: ParsePgnOptions): StandaloneParseOptions {
    return {
        parseHeaders: options?.headers ?? false,
        maxGames: options?.maxGames ?? Infinity,
    };
}
