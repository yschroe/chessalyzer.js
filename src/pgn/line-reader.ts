import { createReadStream, type ReadStream } from 'node:fs';
import { createInterface, type Interface } from 'node:readline';

/**
 * Sync line handler. Return `false` to stop reading early (closes the stream).
 * Keep work synchronous — awaiting here would reintroduce per-line async overhead.
 */
export type LineHandler = (line: string) => void | false;

/** Handlers for {@link openLineStream}. Attach at open time so no lines are missed. */
export interface LineStreamHandlers {
    onLine: (line: string) => void;
    onClose?: () => void;
    onError?: (err: Error) => void;
}

/**
 * Controllable UTF-8 line stream over a file.
 * Sole owner of `fs` / `readline` I/O in the PGN pipeline.
 */
export interface LineStream {
    /** Pause the underlying read stream (backpressure). No-op if already closed. */
    pause(): void;
    /** Resume after {@link pause}. No-op if already closed. */
    resume(): void;
    /** Close the readline interface and destroy the file stream. */
    close(): void;
    readonly closed: boolean;
}

/**
 * Open a file for line-oriented reading via readline `'line'` events.
 *
 * **Performance:** Event-mode is intentional. Sync `'line'` handlers beat
 * `for await` / async-iterator pull by a wide margin on large PGNs (see
 * `bench/exploratory/line-reader-readline.ts` and Node's readline docs). Do not
 * wrap this in per-line `await` — that reintroduces the slow path. Keep handler
 * work synchronous; use {@link LineStream.pause} / {@link LineStream.resume} for
 * chunk-level backpressure instead.
 *
 * Callers that need backpressure (e.g. chunking) should use pause/resume.
 * Prefer {@link readLines} for simple full-file scans.
 */
export function openLineStream(file: string, handlers: LineStreamHandlers): LineStream {
    const input: ReadStream = createReadStream(file, { encoding: 'utf8' });
    const rl: Interface = createInterface({ input, crlfDelay: Infinity });

    let closed = false;

    const stream: LineStream = {
        get closed() {
            return closed;
        },
        pause() {
            if (!closed) rl.pause();
        },
        resume() {
            if (!closed) rl.resume();
        },
        close() {
            if (closed) return;
            closed = true;
            rl.close();
            input.destroy();
        },
    };

    rl.on('line', (line) => {
        if (closed) return;
        handlers.onLine(line);
    });

    rl.once('close', () => {
        closed = true;
        handlers.onClose?.();
    });

    const fail = (err: Error) => {
        if (closed) return;
        handlers.onError?.(err);
        stream.close();
    };

    rl.once('error', fail);
    input.once('error', fail);

    return stream;
}

/**
 * Read a file line-by-line via readline `'line'` events.
 *
 * Processing stays on the sync event path (see {@link openLineStream} for why);
 * the returned promise resolves when the stream closes (EOF, early stop, or error).
 */
export async function readLines(file: string, onLine: LineHandler): Promise<void> {
    let handlerError: unknown;

    await new Promise<void>((resolve, reject) => {
        const stream = openLineStream(file, {
            onLine: (line) => {
                try {
                    if (onLine(line) === false) {
                        stream.close();
                    }
                } catch (err) {
                    handlerError = err;
                    stream.close();
                }
            },
            onClose: () => {
                resolve();
            },
            onError: (err) => {
                reject(err);
            },
        });
    });

    if (handlerError !== undefined) throw handlerError;
}
