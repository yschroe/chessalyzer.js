import { createReadStream } from 'node:fs';

const DEFAULT_QUEUE_SIZE = 1024;

/* https://github.com/nodejs/node/blob/bae03c4e30f927676203f61ff5a34fe0a0c0bbc9/lib/internal/fixed_queue.js
 * The FixedQueue is implemented as a singly-linked list of fixed-size
 * circular buffers. It looks something like this:
 *
 *  head                                                       tail
 *    |                                                          |
 *    v                                                          v
 * +-----------+ <-----\       +-----------+ <------\         +-----------+
 * |  [null]   |        \----- |   next    |         \------- |   next    |
 * +-----------+               +-----------+                  +-----------+
 * |   item    | <-- bottom    |   item    | <-- bottom       |  [empty]  |
 * |   item    |               |   item    |                  |  [empty]  |
 * |   item    |               |   item    |                  |  [empty]  |
 * |   item    |               |   item    |                  |  [empty]  |
 * |   item    |               |   item    |       bottom --> |   item    |
 * |   item    |               |   item    |                  |   item    |
 * |    ...    |               |    ...    |                  |    ...    |
 * |   item    |               |   item    |                  |   item    |
 * |   item    |               |   item    |                  |   item    |
 * |  [empty]  | <-- top       |   item    |                  |   item    |
 * |  [empty]  |               |   item    |                  |   item    |
 * |  [empty]  |               |  [empty]  | <-- top  top --> |  [empty]  |
 * +-----------+               +-----------+                  +-----------+
 *
 * Or, if there is only one circular buffer, it looks something
 * like either of these:
 *
 *  head   tail                                 head   tail
 *    |     |                                     |     |
 *    v     v                                     v     v
 * +-----------+                               +-----------+
 * |  [null]   |                               |  [null]   |
 * +-----------+                               +-----------+
 * |  [empty]  |                               |   item    |
 * |  [empty]  |                               |   item    |
 * |   item    | <-- bottom            top --> |  [empty]  |
 * |   item    |                               |  [empty]  |
 * |  [empty]  | <-- top            bottom --> |   item    |
 * |  [empty]  |                               |   item    |
 * +-----------+                               +-----------+
 *
 * Adding a value means moving `top` forward by one, removing means
 * moving `bottom` forward by one. After reaching the end, the queue
 * wraps around.
 *
 * When `top === bottom` the current queue is empty and when
 * `top + 1 === bottom` it's full. This wastes a single space of storage
 * but allows much quicker checks.
 */

class FixedCircularBuffer<T> {
    kMask: number;
    top: number;
    bottom: number;
    list: (T | undefined)[];
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

    constructor(private readonly kSize = DEFAULT_QUEUE_SIZE) {
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
export function readLinesFast(file: string): AsyncIterable<string> {
    const rs = createReadStream(file, { encoding: 'utf-8' });
    const sourceIterator: AsyncIterator<string> = rs.iterator();

    const cache: FixedQueue<string> = new FixedQueue();
    let leftover = '';

    /** Returns the next line from the file. */
    const next = async (): Promise<IteratorResult<string>> => {
        // Try to get a line from the cache.
        let line: string | null = cache.shift();

        // If the cache is empty, read the next chunk from the stream.
        while (line === null) {
            // oxlint-disable-next-line no-await-in-loop
            const result = await sourceIterator.next();

            // If the file was fully read, return the leftover line.
            if (result.done) {
                if (leftover !== '') {
                    line = leftover;
                    leftover = '';
                }
                break;
            }

            // Combine the leftover line from the previous chunk with the new chunk.
            const combined = leftover + result.value;
            leftover = '';

            // Split the combined line into parts.
            const parts = combined.split('\n');

            // If the line does not end with a newline, save the last part as the leftover.
            const endsWithNewline = result.value.charCodeAt(result.value.length - 1) === 10;
            if (!endsWithNewline) leftover = parts.pop() ?? '';

            // Add the parts to the cache.
            cache.push(...parts);

            // Try to get a line from the cache again.
            line = cache.shift();
        }

        if (line !== null) return { value: line, done: false };

        return { done: true, value: undefined };
    };

    return {
        [Symbol.asyncIterator]: () => ({ next }),
    };
}
