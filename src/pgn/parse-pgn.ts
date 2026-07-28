import { GameAssembler } from '#pgn/game-assembler';
import { readLines } from '#pgn/line-reader';
import type { ParsedGame, ParsePgnOptions } from '#types/parse-pgn';

/**
 * Parse a PGN file into {@link ParsedGame} objects (stage 2 only — no board replay).
 *
 * Uses single-threaded line I/O and {@link GameAssembler}. For large files with trackers,
 * prefer {@link analyzePGN} which streams via worker chunks.
 */
export async function parsePGN(path: string, options?: ParsePgnOptions): Promise<ParsedGame[]> {
    const parseHeaders = options?.headers ?? false;
    const maxGames = options?.maxGames ?? Infinity;
    const games: ParsedGame[] = [];
    const assembler = new GameAssembler({ parseHeaders, maxGames });

    await readLines(path, (line): void | false => {
        const game = assembler.processLine(line);
        if (!game) return;

        games.push(game);
        if (games.length >= maxGames) return false;
    });

    return games;
}
