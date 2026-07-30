import { openLineStream, type LineStream } from '#io/line-reader';
import { GameAssembler } from '#pgn/game-assembler';
import type { ParsePgnOptions, ParsedGame } from '#types/parse-pgn';
import { toParsedGame } from '#types/parse-pgn';

function resolveStandaloneParseHeaders(headers?: boolean | 'auto'): boolean {
    return headers === true;
}

type StreamGameResult = { value: ParsedGame; done: false } | { value: undefined; done: true };

/**
 * Stream a PGN file as {@link ParsedGame} objects (stage 2 only — no board replay).
 *
 * Yields one completed game at a time with backpressure via {@link openLineStream}
 * pause/resume. Prefer {@link parsePGN} when you need all games in memory.
 */
export function streamParsePGN(path: string, options?: ParsePgnOptions): AsyncIterable<ParsedGame> {
    const parseHeaders = resolveStandaloneParseHeaders(options?.headers);
    const maxGames = options?.maxGames ?? Infinity;
    const assembler = new GameAssembler({ parseHeaders, maxGames });

    const pending: StreamGameResult[] = [];
    let waiter: ((result: StreamGameResult) => void) | null = null;
    let finished = false;
    let streamError: Error | null = null;
    let gamesDelivered = 0;
    let lines: LineStream;

    const deliver = (result: StreamGameResult): void => {
        if (waiter) {
            const resolve = waiter;
            waiter = null;
            resolve(result);
            return;
        }
        pending.push(result);
    };

    const finish = (): void => {
        if (finished) return;
        finished = true;
        deliver({ value: undefined, done: true });
    };

    lines = openLineStream(path, {
        onLine: (line) => {
            const game = assembler.processLine(line);
            if (!game) return;

            gamesDelivered++;
            lines.pause();
            deliver({ value: toParsedGame(game), done: false });

            if (gamesDelivered >= maxGames) {
                lines.close();
                finish();
            }
        },
        onClose: () => {
            finish();
        },
        onError: (err) => {
            if (streamError) return;
            streamError = err;
            finished = true;
            if (waiter) {
                const rejectWaiter = waiter;
                waiter = null;
                rejectWaiter({ value: undefined, done: true });
            }
            lines.close();
        },
    });

    const next = (): Promise<IteratorResult<ParsedGame>> => {
        if (streamError) return Promise.reject(streamError);

        const queued = pending.shift();
        if (queued !== undefined) {
            if (!queued.done && !lines.closed) lines.resume();
            return Promise.resolve(
                queued.done
                    ? { value: undefined, done: true as const }
                    : { value: queued.value, done: false as const },
            );
        }

        if (finished) {
            return Promise.resolve({ value: undefined, done: true });
        }

        return new Promise<IteratorResult<ParsedGame>>((resolve, reject) => {
            waiter = (result) => {
                if (streamError) {
                    reject(streamError);
                    return;
                }
                resolve(
                    result.done
                        ? { value: undefined, done: true as const }
                        : { value: result.value, done: false as const },
                );
            };
            lines.resume();
        });
    };

    return {
        [Symbol.asyncIterator]: () => ({
            next,
            async return(): Promise<IteratorResult<ParsedGame>> {
                finished = true;
                lines.close();
                waiter = null;
                pending.length = 0;
                return { value: undefined, done: true };
            },
        }),
    };
}
