import { readLines } from '#io/line-reader';
import { GameAssembler } from '#pgn/game-assembler';
import { resolveStandaloneParseOptions } from '#pgn/parse-options';
import { toParsedGame } from '#pgn/to-parsed-game';
import type { ParsePGNOptions, ParsedGame } from '#types/parse-pgn';

/**
 * Parse a PGN file into an array of {@link ParsedGame} objects (structural parse only — no board replay).
 *
 * For large files or tracker accumulation, prefer {@link analyzePGN} from `chessalyzer`, which streams
 * via worker chunks and can replay movetext.
 *
 * @example
 * ```ts
 * import { parsePGN } from 'chessalyzer/pgn';
 *
 * const games = await parsePGN('games.pgn', { headers: true, maxGames: 100 });
 * console.log(games[0]?.headers?.White, games[0]?.moves.length);
 * ```
 */
export async function parsePGN(path: string, options?: ParsePGNOptions): Promise<ParsedGame[]> {
    const { parseHeaders, maxGames } = resolveStandaloneParseOptions(options);
    const games: ParsedGame[] = [];
    const assembler = new GameAssembler({ parseHeaders });

    await readLines(path, (line): void | false => {
        const game = assembler.processLine(line);
        if (!game) return;

        games.push(toParsedGame(game));
        if (games.length >= maxGames) return false;
    });

    return games;
}
