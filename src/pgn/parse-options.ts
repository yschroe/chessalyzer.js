import type { ParsePGNOptions } from '#types/parse-pgn';

export interface StandaloneParseOptions {
    parseHeaders: boolean;
    maxGames: number;
}

/**
 * Resolve {@link ParsePGNOptions} for the standalone parse entry points.
 */
export function resolveStandaloneParseOptions(options?: ParsePGNOptions): StandaloneParseOptions {
    return {
        parseHeaders: options?.headers ?? false,
        maxGames: options?.maxGames ?? Infinity,
    };
}
