import type { ParsePgnOptions, StandaloneParseOptions } from '#types/parse-pgn';

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
