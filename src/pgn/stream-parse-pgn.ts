import { lineStreamIterable } from '#io/line-iterable';
import { GameAssembler } from '#pgn/game-assembler';
import { resolveStandaloneParseOptions } from '#pgn/parse-options';
import { toParsedGame } from '#pgn/to-parsed-game';
import type { ParsePgnOptions, ParsedGame } from '#types/parse-pgn';

/**
 * Stream a PGN file as {@link ParsedGame} objects (stage 2 only — no board replay).
 *
 * Yields one completed game at a time with backpressure via {@link lineStreamIterable}
 * pause/resume. Prefer {@link parsePGN} when you need all games in memory.
 */
export function streamParsePGN(path: string, options?: ParsePgnOptions): AsyncIterable<ParsedGame> {
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
