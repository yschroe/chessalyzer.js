import { readLinesFast } from '#pgn/line-reader';
import { isGameResultLine, stripComments } from '#pgn/movetext-tokenizer';

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
export function encodePgnChunkText(text: string): Uint8Array {
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
        return isGameResultLine(stripComments(line)) ? i : -1;
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

/**
 * Stream a PGN file as raw text chunks aligned to complete games.
 * The main thread only splits lines and checks result boundaries — no move tokenization.
 */
export function readPgnChunks(file: string, config: PgnChunkConfig = {}) {
    const targetBytes = config.targetBytes ?? DEFAULT_PGN_CHUNK_BYTES;
    const maxLines = config.maxLines ?? 50_000;
    const minLines = config.minLines ?? 0;

    const iter = readLinesFast(file)[Symbol.asyncIterator]();
    const accumulator: string[] = [];
    let byteSize = 0;
    let inputDone = false;

    const readLine = async (): Promise<string | null> => {
        if (inputDone) return null;
        const result = await iter.next();
        if (result.done) {
            inputDone = true;
            return null;
        }
        return result.value;
    };

    const pushLine = (line: string) => {
        accumulator.push(line);
        byteSize += line.length + 1;
    };

    const next = async (): Promise<IteratorResult<PgnChunk>> => {
        let line = await readLine();
        while (line !== null) {
            pushLine(line);
            const hitByteTarget = byteSize >= targetBytes && accumulator.length >= minLines;
            const hitLineCap = accumulator.length >= maxLines;
            if (hitByteTarget || hitLineCap) break;
            // oxlint-disable-next-line no-await-in-loop
            line = await readLine();
        }

        if (accumulator.length === 0) return { done: true, value: undefined };

        while (findLastCompleteGameLineIndex(accumulator) === -1) {
            // oxlint-disable-next-line no-await-in-loop
            const nextLine = await readLine();
            if (nextLine === null) break;
            pushLine(nextLine);
        }

        const lastResultIdx = findLastCompleteGameLineIndex(accumulator);
        if (lastResultIdx === -1) return { done: true, value: undefined };

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
            value: {
                text,
                bytes: encodePgnChunkText(text),
                lineCount: completeLines.length,
            },
            done: false,
        };
    };

    return {
        [Symbol.asyncIterator]: () => ({ next }),
    };
}
