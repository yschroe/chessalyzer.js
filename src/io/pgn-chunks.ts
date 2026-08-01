import { lineStreamIterable } from '#io/line-iterable';
import { extractGameResult, stripComments } from '#pgn/movetext';

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
    /** UTF-8 bytes for zero-copy transfer to workers via `postMessage` transfer list. */
    bytes: Uint8Array;
    /** Number of lines in the chunk. */
    lineCount: number;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

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
        if (extractGameResult(stripComments(line)) !== null) return i;
    }
    return -1;
}

/**
 * Stream a PGN file as raw text chunks aligned to complete games.
 *
 * I/O lives in {@link lineStreamIterable}; this module only accumulates lines, cuts on
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
            bytes: textEncoder.encode(text),
            lineCount: completeLines.length,
        };
    };

    return lineStreamIterable<PgnChunk>(file, {
        onLine: (line, sink) => {
            pushLine(line);

            if (!extendingToBoundary) {
                if (!hitAccumulationTarget()) return;
                extendingToBoundary = true;
            }

            const chunk = takeCompleteChunk();
            if (chunk) {
                extendingToBoundary = false;
                sink.emit(chunk);
            }
        },
        onClose: (sink) => {
            // Final flush — the line stream is already closed, so emit's pause is a no-op.
            if (accumulator.length > 0) {
                const chunk = takeCompleteChunk();
                if (chunk) sink.emit(chunk);
            }
            sink.finish();
        },
    });
}
