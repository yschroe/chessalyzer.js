import { createReadStream } from 'node:fs';

import { isGameResultLine, stripComments } from './pgn-line-parser';

/** Default chunk size (~4 MB) for worker-side PGN dispatch. */
export const DEFAULT_PGN_CHUNK_BYTES = 4 * 1024 * 1024;

export interface PgnChunkConfig {
    /** Target chunk size in bytes before extending to the next game boundary. */
    targetBytes?: number;
    /** Safety cap on lines per chunk. */
    maxLines?: number;
    /** Minimum lines before a byte-target chunk may be emitted. */
    minLines?: number;
}

export interface PgnChunk {
    text: string;
    lineCount: number;
}

/** Index of the last movetext line that completes a game, or -1 if none. */
export function findLastCompleteGameLineIndex(lines: string[]): number {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i];
        if (line === '') continue;
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
        if (line === '') continue;
        if (line.startsWith('[')) continue;
        return false;
    }

    return true;
}

/** Keep lines up to and including the last completed game. */
export function truncateToLastCompleteGame(lines: string[]): string[] {
    const lastResultIdx = findLastCompleteGameLineIndex(lines);
    if (lastResultIdx === -1) return [];
    return lines.slice(0, lastResultIdx + 1);
}

function chunkByteSize(lines: string[]): number {
    let size = 0;
    for (const line of lines) {
        size += line.length + 1;
    }
    return size;
}

/**
 * Stream a PGN file as raw text chunks aligned to complete games.
 * The main thread only splits lines and checks result boundaries — no move tokenization.
 */
export async function* readPgnChunks(
    file: string,
    config: PgnChunkConfig = {},
): AsyncGenerator<PgnChunk> {
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
        return result.value ?? null;
    };

    const pushLine = (line: string) => {
        accumulator.push(line);
        byteSize += line.length + 1;
    };

    while (true) {
        let line = await readLine();
        while (line !== null) {
            pushLine(line);
            const hitByteTarget = byteSize >= targetBytes && accumulator.length >= minLines;
            const hitLineCap = accumulator.length >= maxLines;
            if (hitByteTarget || hitLineCap) break;
            line = await readLine();
        }

        if (accumulator.length === 0) return;

        while (findLastCompleteGameLineIndex(accumulator) === -1) {
            const nextLine = await readLine();
            if (nextLine === null) break;
            pushLine(nextLine);
        }

        const lastResultIdx = findLastCompleteGameLineIndex(accumulator);
        if (lastResultIdx === -1) return;

        const completeLines = accumulator.slice(0, lastResultIdx + 1);
        const remainder = accumulator.slice(lastResultIdx + 1);

        yield {
            text: completeLines.join('\n'),
            lineCount: completeLines.length,
        };

        accumulator.length = 0;
        byteSize = 0;
        if (remainder.length > 0) {
            accumulator.push(...remainder);
            byteSize = chunkByteSize(accumulator);
        }

        if (inputDone && accumulator.length === 0) return;
    }
}

// https://github.com/nodejs/node/blob/bae03c4e30f927676203f61ff5a34fe0a0c0bbc9/lib/internal/fixed_queue.js
// The FixedQueue is implemented as a singly-linked list of fixed-size
// circular buffers. It looks something like this:
//
//  head                                                       tail
//    |                                                          |
//    v                                                          v
// +-----------+ <-----\       +-----------+ <------\         +-----------+
// |  [null]   |        \----- |   next    |         \------- |   next    |
// +-----------+               +-----------+                  +-----------+
// |   item    | <-- bottom    |   item    | <-- bottom       |  [empty]  |
// |   item    |               |   item    |                  |  [empty]  |
// |   item    |               |   item    |                  |  [empty]  |
// |   item    |               |   item    |                  |  [empty]  |
// |   item    |               |   item    |       bottom --> |   item    |
// |   item    |               |   item    |                  |   item    |
// |    ...    |               |    ...    |                  |    ...    |
// |   item    |               |   item    |                  |   item    |
// |   item    |               |   item    |                  |   item    |
// |  [empty]  | <-- top       |   item    |                  |   item    |
// |  [empty]  |               |   item    |                  |   item    |
// |  [empty]  |               |  [empty]  | <-- top  top --> |  [empty]  |
// +-----------+               +-----------+                  +-----------+
//
// Or, if there is only one circular buffer, it looks something
// like either of these:
//
//  head   tail                                 head   tail
//    |     |                                     |     |
//    v     v                                     v     v
// +-----------+                               +-----------+
// |  [null]   |                               |  [null]   |
// +-----------+                               +-----------+
// |  [empty]  |                               |   item    |
// |  [empty]  |                               |   item    |
// |   item    | <-- bottom            top --> |  [empty]  |
// |   item    |                               |  [empty]  |
// |  [empty]  | <-- top            bottom --> |   item    |
// |  [empty]  |                               |   item    |
// +-----------+                               +-----------+
//
// Adding a value means moving `top` forward by one, removing means
// moving `bottom` forward by one. After reaching the end, the queue
// wraps around.
//
// When `top === bottom` the current queue is empty and when
// `top + 1 === bottom` it's full. This wastes a single space of storage
// but allows much quicker checks.

class FixedCircularBuffer<T> {
    kMask: number;
    top: number;
    bottom: number;
    list: T[];
    next: FixedCircularBuffer<T> | null;

    constructor(kSize: number) {
        this.bottom = 0;
        this.top = 0;
        this.list = new Array(kSize);
        this.next = null;
        this.kMask = kSize - 1;
    }

    isEmpty() {
        return this.top === this.bottom;
    }

    isFull() {
        return ((this.top + 1) & this.kMask) === this.bottom;
    }

    push(data: T) {
        this.list[this.top] = data;
        this.top = (this.top + 1) & this.kMask;
    }

    shift() {
        const { list, bottom } = this;
        const nextItem = list[bottom];
        if (nextItem === undefined) return null;
        list[bottom] = undefined;
        this.bottom = (bottom + 1) & this.kMask;
        return nextItem;
    }
}

class FixedQueue<T> {
    head: FixedCircularBuffer<T>;
    tail: FixedCircularBuffer<T>;

    constructor(private readonly kSize: number = 1024) {
        this.head = this.tail = new FixedCircularBuffer(kSize);
    }

    isEmpty() {
        return this.head.isEmpty();
    }

    push(...data: T[]) {
        for (const item of data) {
            if (this.head.isFull()) {
                // Head is full: Creates a new queue, sets the old queue's `.next` to it,
                // and sets it as the new main queue.
                this.head = this.head.next = new FixedCircularBuffer(this.kSize);
            }
            this.head.push(item);
        }
    }

    shift() {
        const tail = this.tail;
        const next = tail.shift();
        if (tail.isEmpty() && tail.next !== null) {
            // If there is another queue, it forms the new tail.
            this.tail = tail.next;
            tail.next = null;
        }
        return next;
    }
}

/**
 * Custom line reader that reads lines faster than the native readline module.
 * @param file - The file to read.
 * @returns An async iterator that yields lines from the file.
 * @see https://github.com/oven-sh/bun/issues/5136#issuecomment-3503523219
 */
export function readLinesFast(file: string) {
    const rs = createReadStream(file, { encoding: 'utf-8' });
    const iterator: AsyncIterator<string, string> = rs[Symbol.asyncIterator]();

    const cache: FixedQueue<string> = new FixedQueue();
    let lineBreak = false;

    /** Returns the next line from the file. */
    const next = async () => {
        // Try to get a line from the cache
        let line = cache.shift();

        // If the cache is now empty, read in more lines
        if (cache.isEmpty()) {
            // Read in next chunk of size highWaterMark (default: 64 * 1024 bytes)
            const { value, done } = await iterator.next();

            // If the iterator is not done, split the chunk into lines
            if (!done) {
                const lines = value.replace(/\r/g, '').split('\n');

                // If the cache is not empty and the line break flag is not set,
                // it means the last line of the previous chunk was not a full line.
                // Append the first line of the new chunk to complete the line.
                if (line !== null && !lineBreak) line += lines.shift();
                // On first iteration, the cache is empty, so we need to get the
                // first line from the new chunk.
                if (line === null) line = lines.shift();
                cache.push(...lines);

                // Check if chunk ended with a line break
                lineBreak = value.at(-1) === '\n';
            }
        }

        // If the cache has data, return the first line
        if (line !== null) return { value: line, done: false };

        return { done: true };
    };

    return {
        [Symbol.asyncIterator]: () => ({
            next,
        }),
    };
}
