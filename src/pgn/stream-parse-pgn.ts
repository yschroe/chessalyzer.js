import { lineStreamIterable } from '#io/line-iterable';
import { GameAssembler } from '#pgn/game-assembler';
import { resolveStandaloneParseOptions } from '#pgn/parse-options';
import { toParsedGame } from '#pgn/to-parsed-game';
import type { ParsePGNOptions, ParsedGame } from '#types/parse-pgn';

/**
 * Stream a PGN file as {@link ParsedGame} objects one game at a time (structural parse only — no board replay).
 *
 * Uses backpressure-friendly line I/O — suitable when you process games incrementally without loading
 * the whole file into memory. Use {@link parsePGN} when you need all games in an array.
 *
 * @example
 * ```ts
 * import { streamParsePGN } from 'chessalyzer/pgn';
 *
 * for await (const game of streamParsePGN('games.pgn', { headers: true })) {
 *   console.log(game.moves.length, game.result);
 * }
 * ```
 */
export function streamParsePGN(path: string, options?: ParsePGNOptions): AsyncIterable<ParsedGame> {
    const { parseHeaders, maxGames } = resolveStandaloneParseOptions(options);
    const assembler = new GameAssembler({ parseHeaders });
    let gamesDelivered = 0;

    return lineStreamIterable<ParsedGame>(path, {
        onLine: (line, sink) => {
            const game = assembler.processLine(line);
            if (!game) return;

            gamesDelivered++;
            sink.emit(toParsedGame(game));

            if (gamesDelivered >= maxGames) {
                sink.closeLines();
                sink.finish();
            }
        },
        onClose: (sink) => {
            sink.finish();
        },
    });
}
