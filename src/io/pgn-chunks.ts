import { open, type FileHandle } from 'node:fs/promises';

import { extractGameResult, stripComments } from '#pgn/movetext';

/**
 * Default chunk size for worker-side PGN dispatch.
 */
const DEFAULT_PGN_CHUNK_BYTES = 3.5 * 1024 * 1024;

/** Smallest file read; keeps tiny byte targets from degrading into many small reads. */
const MIN_READ_BYTES = 64 * 1024;

/** Read size while extending a chunk past its target to the next game boundary. */
const EXTEND_READ_BYTES = 1024 * 1024;

const LF = 10;

/** Configuration for reading PGN chunks. */
export interface PgnChunkConfig {
    /** Target chunk size in UTF-8 bytes before extending to the next game boundary. */
    targetBytes?: number;
    /** Optional cap on lines per chunk. Setting it enables line counting (slower). */
    maxLines?: number;
    /** Minimum lines before a byte-target chunk may be emitted. Setting it enables line counting (slower). */
    minLines?: number;
}

/** A chunk of PGN text aligned to complete games. */
export interface PgnChunk {
    /** UTF-8 bytes owning their whole `ArrayBuffer`, for zero-copy transfer to workers. */
    bytes: Uint8Array;
}

const textDecoder = new TextDecoder();
/** Keeps a leading BOM so {@link lineCompletesGame} strips it only where a worker would. */
const lineDecoder = new TextDecoder('utf-8', { ignoreBOM: true });

/** Splits on the same terminators as readline (`\r\n`, lone `\r`, `\n`). */
const LINE_TERMINATOR_REGEX = /\r\n|\r|\n/;

/**
 * Decode UTF-8 PGN chunk bytes received from the main thread into lines.
 * Chunks are raw file bytes, so line terminators are split here the way readline would.
 */
export function decodePgnChunkLines(bytes: Uint8Array): string[] {
    const text = textDecoder.decode(bytes);
    return text.includes('\r') ? text.split(LINE_TERMINATOR_REGEX) : text.split('\n');
}

/**
 * True when the physical line `[start, end)` (excluding its `\n`) completes a game,
 * using the same test as {@link GameAssembler}. A lone `\r` splits lines in readline,
 * so only the text after the last `\r` is the line directly before the cut. Offset 0
 * is the start of the next chunk, where the worker's decoder drops a BOM.
 */
function lineCompletesGame(buf: Buffer, start: number, end: number): boolean {
    if (end === start) return false;
    let line = lineDecoder.decode(buf.subarray(start, end));
    if (start === 0 && line.startsWith('\uFEFF')) line = line.slice(1);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    const cr = line.lastIndexOf('\r');
    if (cr !== -1) line = line.slice(cr + 1);
    if (line === '' || line.startsWith('[')) return false;
    return extractGameResult(stripComments(line)) !== null;
}

/**
 * Offset just past the `\n` of the last game-completing line whose `\n` lies in
 * `[floor, end)`, or -1 when there is none.
 */
function findLastCut(buf: Buffer, floor: number, end: number): number {
    let lineEnd = end > 0 ? buf.lastIndexOf(LF, end - 1) : -1;
    while (lineEnd >= floor && lineEnd !== -1) {
        const prev = lineEnd === 0 ? -1 : buf.lastIndexOf(LF, lineEnd - 1);
        if (lineCompletesGame(buf, prev + 1, lineEnd)) return lineEnd + 1;
        lineEnd = prev;
    }
    return -1;
}

/**
 * Stream a PGN file as raw UTF-8 chunks aligned to complete games.
 *
 * The main thread never decodes the file: it reads bytes, then decodes only the few
 * lines it inspects backward from the chunk target to find the last line that
 * completes a game. Workers decode and split the chunk (see {@link decodePgnChunkLines}).
 * A chunk extends past its target until a game completes. Reads happen per pulled
 * chunk, so the consumer provides backpressure.
 */
export function readPgnChunks(file: string, config: PgnChunkConfig = {}): AsyncIterable<PgnChunk> {
    const targetBytes = Math.max(1, config.targetBytes ?? DEFAULT_PGN_CHUNK_BYTES);
    const maxLines = config.maxLines ?? Infinity;
    const minLines = config.minLines ?? 0;
    // Counting newlines costs more than the rest of chunking; only pay it when asked.
    const countLines = config.maxLines !== undefined || config.minLines !== undefined;

    let handle: FileHandle | undefined;
    let buf = Buffer.allocUnsafeSlow(Math.max(targetBytes, MIN_READ_BYTES));
    let filled = 0;
    let eof = false;
    let done = false;
    /** True once the chunk reached its target without a cut; only new lines are scanned. */
    let extending = false;
    /** Lines whose `\n` lies below this offset were already scanned without finding a cut. */
    let scanFloor = 0;
    /** Line counting state (only when {@link countLines}). */
    let countedTo = 0;
    let lineCount = 0;
    /** Offset just past the `maxLines`-th `\n`, once reached. */
    let lineCapEnd = -1;

    const close = async (): Promise<void> => {
        done = true;
        const h = handle;
        handle = undefined;
        await h?.close();
    };

    const countNewLines = (): void => {
        let i = buf.indexOf(LF, countedTo);
        while (i !== -1 && i < filled) {
            lineCount += 1;
            if (lineCount === maxLines && lineCapEnd === -1) lineCapEnd = i + 1;
            i = buf.indexOf(LF, i + 1);
        }
        countedTo = filled;
    };

    /** End of the region the next cut search may use, or -1 while below target. */
    const searchEnd = (): number => {
        if (extending) return filled;
        if (!countLines) return filled >= targetBytes ? filled : -1;
        countNewLines();
        if (lineCapEnd !== -1) return lineCapEnd;
        return filled >= targetBytes && lineCount >= minLines ? filled : -1;
    };

    /** Emit `[0, cut)` as an owned buffer; keep the remainder for the next chunk. */
    const emit = (cut: number): IteratorResult<PgnChunk> => {
        const bytes = new Uint8Array(cut);
        bytes.set(buf.subarray(0, cut));
        buf.copyWithin(0, cut, filled);
        filled -= cut;
        extending = false;
        scanFloor = 0;
        countedTo = 0;
        lineCount = 0;
        lineCapEnd = -1;
        return { value: { bytes }, done: false };
    };

    const readMore = async (): Promise<void> => {
        handle ??= await open(file, 'r');
        const want =
            !extending && filled < targetBytes
                ? Math.max(targetBytes - filled, MIN_READ_BYTES)
                : EXTEND_READ_BYTES;
        if (filled + want > buf.length) {
            const grown = Buffer.allocUnsafeSlow(Math.max(filled + want, buf.length * 2));
            buf.copy(grown, 0, 0, filled);
            buf = grown;
        }
        const { bytesRead } = await handle.read(buf, filled, want, null);
        if (bytesRead === 0) eof = true;
        filled += bytesRead;
    };

    /** At EOF: emit through the last completed game; an incomplete trailing game is dropped. */
    const finish = async (): Promise<IteratorResult<PgnChunk>> => {
        await close();
        if (filled === 0) return { value: undefined, done: true };
        // The final line may lack a trailing newline; readline still emits it as a line.
        const lastLf = buf.lastIndexOf(LF, filled - 1);
        let cut = lineCompletesGame(buf, lastLf + 1, filled) ? filled : -1;
        if (cut === -1) cut = findLastCut(buf, 0, filled);
        if (cut <= 0) {
            filled = 0;
            return { value: undefined, done: true };
        }
        const result = emit(cut);
        filled = 0;
        return result;
    };

    const next = async (): Promise<IteratorResult<PgnChunk>> => {
        if (done) return { value: undefined, done: true };
        try {
            for (;;) {
                const end = searchEnd();
                if (end !== -1) {
                    const cut = findLastCut(buf, scanFloor, end);
                    if (cut !== -1) return emit(cut);
                    // Linear extension: only lines appended from here on are scanned next.
                    extending = true;
                    scanFloor = end;
                }
                // oxlint-disable-next-line eslint/no-await-in-loop -- sequential file reads; one chunk per pull
                if (eof) return await finish();
                // oxlint-disable-next-line eslint/no-await-in-loop -- each read depends on the previous fill
                await readMore();
            }
        } catch (err) {
            await close();
            throw err;
        }
    };

    return {
        [Symbol.asyncIterator]: () => ({
            next,
            async return(): Promise<IteratorResult<PgnChunk>> {
                await close();
                return { value: undefined, done: true };
            },
        }),
    };
}
