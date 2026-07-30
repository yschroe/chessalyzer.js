/** Stage-2 output: mainline SAN strings + optional result and tag-pair headers. */
export interface ParsedGame {
    moves: string[];
    /** Game result from movetext (and/or Result tag when headers are parsed). */
    result?: string;
    /** Tag-pair headers; present only when header parsing is enabled. */
    headers?: Readonly<Record<string, string>>;
}

/** Options for {@link parsePGN}. */
export interface ParsePgnOptions {
    /** Parse tag-pair headers. Default: false for parsePGN; inferred on analyzePGN when omitted. */
    headers?: boolean;
    maxGames?: number;
}
