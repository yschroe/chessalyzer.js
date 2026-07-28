import { openLineStream, type LineStream } from '#io/line-reader';
import { isGameResultLine, stripComments } from '#pgn/movetext';

/** Default chunk size (~4 MB) for worker-side PGN dispatch. */
const DEFAULT_PGN_CHUNK_BYTES = 4 * 1024 * 1024;

/** Configuration for reading PGN chunks. */
export interface PgnChunkConfig {
    /** Target chunk size in bytes before extending to the next game boundary. */
    targetBytes?: number;
    /** Safety cap on lines per chunk. */
    maxLines?: number;
    /** Minimum lines before a byte-target chunk may be emitted. */
    minLines?: number;
}

/** A chunk of PGN lines. */
export interface PgnChunk {
    /** Raw text of the chunk. */
    text: string;
    /** UTF-8 bytes for zero-copy transfer to workers via `postMessage` transfer list. */
    bytes: Uint8Array;
    /** Number of lines in the chunk. */
    lineCount: number;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** Encode PGN chunk text as UTF-8 bytes for worker transfer. */
function encodePgnChunkText(text: string): Uint8Array {
    return textEncoder.encode(text);
}

/** Decode UTF-8 PGN chunk bytes received from the main thread. */
export function decodePgnChunkBytes(bytes: Uint8Array): string {
    return textDecoder.decode(bytes);
}

/** Byte size of a chunk of lines. */
function chunkByteSize(lines: string[]): number {
    let size = 0;
    for (const line of lines) {
        size += line.length + 1;
    }
    return size;
}

/** Index of the last movetext line that completes a game, or -1 if none. */
function findLastCompleteGameLineIndex(lines: string[]): number {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i];
        if (line === undefined || line === '') continue;
        if (line.startsWith('[')) continue;
        if (isGameResultLine(stripComments(line))) return i;
    }
    return -1;
}

/** True when the last movetext line in the chunk completes a game. */
export function chunkEndsWithCompleteGame(lines: string[]): boolean {
    const lastResultIdx = findLastCompleteGameLineIndex(lines);
    if (lastResultIdx === -1) return false;

    for (let i = lastResultIdx + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (line === undefined || line === '') continue;
        if (line.startsWith('[')) continue;
        return false;
    }

    return true;
}

type ChunkResult = IteratorResult<PgnChunk>;

/**
 * Stream a PGN file as raw text chunks aligned to complete games.
 *
 * I/O lives in {@link openLineStream}; this module only accumulates lines, cuts on
 * game boundaries, and encodes transferable bytes. `await` happens between chunks
 * (not per line) via the returned async iterator.
 */
export function readPgnChunks(file: string, config: PgnChunkConfig = {}): AsyncIterable<PgnChunk> {
    const targetBytes = config.targetBytes ?? DEFAULT_PGN_CHUNK_BYTES;
    const maxLines = config.maxLines ?? 50_000;
    const minLines = config.minLines ?? 0;

    const accumulator: string[] = [];
    let byteSize = 0;
    /** True once the current fill has reached the byte/line target and is waiting on a game boundary. */
    let extendingToBoundary = false;

    const pending: ChunkResult[] = [];
    let waiter: ((result: ChunkResult) => void) | null = null;
    let finished = false;
    let streamError: Error | null = null;
    let lines: LineStream;

    const pushLine = (line: string) => {
        accumulator.push(line);
        byteSize += line.length + 1;
    };

    const hitAccumulationTarget = (): boolean => {
        const hitByteTarget = byteSize >= targetBytes && accumulator.length >= minLines;
        const hitLineCap = accumulator.length >= maxLines;
        return hitByteTarget || hitLineCap;
    };

    const takeCompleteChunk = (): PgnChunk | null => {
        const lastResultIdx = findLastCompleteGameLineIndex(accumulator);
        if (lastResultIdx === -1) return null;

        const completeLines = accumulator.slice(0, lastResultIdx + 1);
        const remainder = accumulator.slice(lastResultIdx + 1);

        const text = completeLines.join('\n');

        accumulator.length = 0;
        byteSize = 0;
        if (remainder.length > 0) {
            accumulator.push(...remainder);
            byteSize = chunkByteSize(accumulator);
        }

        return {
            text,
            bytes: encodePgnChunkText(text),
            lineCount: completeLines.length,
        };
    };

    const deliver = (result: ChunkResult) => {
        if (waiter) {
            const resolve = waiter;
            waiter = null;
            resolve(result);
            return;
        }
        pending.push(result);
    };

    const tryEmitChunk = (): boolean => {
        const chunk = takeCompleteChunk();
        if (!chunk) return false;
        extendingToBoundary = false;
        // Pause for backpressure while the consumer awaits the next chunk.
        lines.pause();
        deliver({ value: chunk, done: false });
        return true;
    };

    lines = openLineStream(file, {
        onLine: (line) => {
            pushLine(line);

            if (!extendingToBoundary) {
                if (!hitAccumulationTarget()) return;
                extendingToBoundary = true;
            }

            tryEmitChunk();
        },
        onClose: () => {
            finished = true;
            // Final flush without pause — the line stream is already closed.
            if (accumulator.length > 0) {
                const chunk = takeCompleteChunk();
                if (chunk) deliver({ value: chunk, done: false });
            }
            deliver({ value: undefined, done: true });
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

    const next = (): Promise<ChunkResult> => {
        if (streamError) return Promise.reject(streamError);

        const queued = pending.shift();
        if (queued !== undefined) {
            if (!queued.done && !lines.closed) lines.resume();
            return Promise.resolve(queued);
        }

        if (finished) {
            return Promise.resolve({ value: undefined, done: true });
        }

        return new Promise<ChunkResult>((resolve, reject) => {
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
            async return(): Promise<ChunkResult> {
                finished = true;
                lines.close();
                waiter = null;
                pending.length = 0;
                return { value: undefined, done: true };
            },
        }),
    };
}
