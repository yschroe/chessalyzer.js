export const HEADER_REGEX = /\[(.*?)\s"(.*?)"\]/;
export const COMMENT_REGEX = /\{.*?\}|\(.*?\)/g;
export const MOVE_REGEX = /[RNBQKOa-h][^\s?!#+]+/g;
export const RESULT_REGEX = /-(1\/2|0|1)$/;

/** Parse a PGN header tag line into `[key, value]`, or null if not a valid tag. */
export function parseHeaderTag(line: string): [string, string] | null {
    const match = HEADER_REGEX.exec(line);
    if (!match) return null;
    return [match[1], match[2]];
}

/** Strip `{...}` and `(...)` comments from a movetext line. */
export function stripComments(line: string): string {
    if (!line.includes('{') && !line.includes('(')) return line;
    return line.replaceAll(COMMENT_REGEX, '');
}

/** Extract SAN move tokens from a movetext line. */
export function extractMoves(line: string): string[] | null {
    return line.match(MOVE_REGEX);
}

/** True when the line ends with a game result (e.g. `1-0`, `0-1`, `1/2-1/2`). */
export function isGameResultLine(line: string): boolean {
    return RESULT_REGEX.test(line);
}
