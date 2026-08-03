import { readLines } from '#io/line-reader';
import { GameAssembler } from '#pgn/game-assembler';
import { resolveStandaloneParseOptions } from '#pgn/parse-options';
import { toParsedGame } from '#pgn/to-parsed-game';
import type { ParsePgnOptions, ParsedGame } from '#types/parse-pgn';

/**
 * Parse a PGN file into {@link ParsedGame} objects (stage 2 only — no board replay).
 *
 * Uses single-threaded line I/O and {@link GameAssembler}. For large files with trackers,
 * prefer {@link analyzePGN} which streams via worker chunks.
 */
export async function parsePGN(path: string, options?: ParsePgnOptions): Promise<ParsedGame[]> {
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
