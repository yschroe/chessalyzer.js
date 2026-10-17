/**
 * PGN movetext helpers for structural parse (SAN extraction, comments, results).
 *
 * Used by {@link GameAssembler} and chunk boundary detection while streaming a PGN
 * file. Each physical line may contain headers, movetext, comments, or a game result;
 * these helpers isolate that logic from batching and worker dispatch.
 *
 * Note: `MOVE_REGEX` is tuned for V8's regex engine; a hand-rolled extractor was
 * tested and regressed multi-thread throughput because PGN parse runs on the main thread.
 */

/** Matches `[Key "Value"]` header tags. */
const HEADER_REGEX = /\[(.*?)\s"(.*?)"\]/;

/** Matches `{brace}` and `(paren)` comments (non-greedy). */
const COMMENT_REGEX = /\{.*?\}|\(.*?\)/g;

/**
 * Matches one SAN move token. Starts with a piece letter or pawn file (a–h),
 * then non-whitespace excluding move suffixes `?`, `!`, `#`, `+`.
 */
const MOVE_REGEX = /[RNBQKOa-h][^\s?!#+]+/g;

/**
 * Parse a PGN header tag line into `[key, value]`, or null if not a valid tag.
 * @param line Raw line from the PGN file (expected to start with `[`).
 */
export function parseHeaderTag(line: string): [string, string] | null {
    const match = HEADER_REGEX.exec(line);
    if (!match) return null;
    const key = match[1];
    const value = match[2];
    if (key === undefined || value === undefined) return null;
    return [key, value];
}

/**
 * Strip `{...}` and `(...)` comments from a movetext line.
 * Fast-path: skip regex when the line has no comment markers (common in bulk dumps).
 */
export function stripComments(line: string): string {
    if (!line.includes('{') && !line.includes('(')) return line;
    return line.replaceAll(COMMENT_REGEX, '');
}

/** Extract SAN tokens from one movetext line. Returns null when no moves are present. */
export function extractMoves(line: string): string[] | null {
    return line.match(MOVE_REGEX);
}

/**
 * Extract the game-result terminator from a cleaned movetext line, or null when the
 * line does not end a game. Doubles as the game-boundary test for assembly and
 * chunking, so both agree on what completes a game.
 */
export function extractGameResult(line: string): string | null {
    // trimEnd preserves the regex's \s* semantics, including Unicode whitespace.
    // No leading token boundary is required: historically even "prefix1-0" matches.
    const trimmed = line.trimEnd();
    if (trimmed.endsWith('1-0')) return '1-0';
    if (trimmed.endsWith('0-1')) return '0-1';
    if (trimmed.endsWith('1/2-1/2')) return '1/2-1/2';
    if (trimmed.endsWith('*')) return '*';
    return null;
}
