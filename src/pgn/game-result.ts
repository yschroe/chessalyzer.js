import type { GameResult } from '#types/parse-pgn';

/** True when `value` is a standard PGN result token. */
export function isGameResult(value: string): value is GameResult {
    return value === '1-0' || value === '0-1' || value === '1/2-1/2' || value === '*';
}
