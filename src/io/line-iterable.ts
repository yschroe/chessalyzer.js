import { openLineStream, type LineStream } from '#io/line-reader';

/**
 * Producer-facing controls for {@link lineStreamIterable}.
 * Passed to `onLine` / `onClose` callbacks — never constructed by callers.
 */
interface LineIterableSink<T> {
    /** Deliver a value to the consumer; pauses the line stream until the next pull (backpressure). */
    emit(value: T): void;
    /** Signal completion (idempotent). */
    finish(): void;
    /** Close the underlying line stream (e.g. early stop on `maxGames`). */
    closeLines(): void;
}

/** Handlers for {@link lineStreamIterable}. `onClose` runs on EOF and after `closeLines()`. */
export interface LineIterableHandlers<T> {
    onLine: (line: string, sink: LineIterableSink<T>) => void;
    onClose?: (sink: LineIterableSink<T>) => void;
}

/**
 * Bridge a push-based line stream to a pull-based `AsyncIterable`.
 *
 * Shared machinery for `readPgnChunks` and `streamParsePGN`: producers emit values
 * from sync `'line'` handlers; the consumer pulls one value at a time. The line
 * stream is paused on every emit and resumed when the consumer asks for more, so
 * `await` happens per value, never per line (see `line-reader.ts` for why).
 *
 * Stream errors fail the iterator: a pending pull completes as `done`, the next
 * pull rejects with the error.
 */
export function lineStreamIterable<T>(
    file: string,
    handlers: LineIterableHandlers<T>,
): AsyncIterable<T> {
    const pending: IteratorResult<T>[] = [];
    let waiter: ((result: IteratorResult<T>) => void) | null = null;
    let finished = false;
    let streamError: Error | null = null;
    let lines: LineStream;

    const deliver = (result: IteratorResult<T>): void => {
        if (waiter) {
            const resolve = waiter;
            waiter = null;
            resolve(result);
            return;
        }
        pending.push(result);
    };

    const sink: LineIterableSink<T> = {
        emit(value) {
            lines.pause();
            deliver({ value, done: false });
        },
        finish() {
            if (finished) return;
            finished = true;
            deliver({ value: undefined, done: true });
        },
        closeLines() {
            lines.close();
        },
    };

    lines = openLineStream(file, {
        onLine: (line) => handlers.onLine(line, sink),
        onClose: () => handlers.onClose?.(sink),
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

    const next = (): Promise<IteratorResult<T>> => {
        if (streamError) return Promise.reject(streamError);

        const queued = pending.shift();
        if (queued !== undefined) {
            if (!queued.done && !lines.closed) lines.resume();
            return Promise.resolve(queued);
        }

        if (finished) {
            return Promise.resolve({ value: undefined, done: true });
        }

        return new Promise<IteratorResult<T>>((resolve, reject) => {
            waiter = (result) => {
                if (streamError) {
                    reject(streamError);
                    return;
                }
                resolve(result);
            };
            lines.resume();
        });
    };

    return {
        [Symbol.asyncIterator]: () => ({
            next,
            async return(): Promise<IteratorResult<T>> {
                finished = true;
                lines.close();
                waiter = null;
                pending.length = 0;
                return { value: undefined, done: true };
            },
        }),
    };
}
