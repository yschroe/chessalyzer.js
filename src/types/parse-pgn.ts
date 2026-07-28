import type { Game } from '#types/game';

/** Options for {@link parsePGN}. */
export interface ParsePgnOptions {
    /** Parse tag-pair headers. Default: false for parsePGN; inferred on analyzePGN when omitted. */
    headers?: boolean;
    maxGames?: number;
}

/** Stage-2 output: mainline SAN strings + optional tag-pair fields. */
export type ParsedGame = Game;
