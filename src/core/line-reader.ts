import { createReadStream } from 'node:fs';

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
	kSize: number;
	kMask: number;
	top: number;
	bottom: number;
	list: T[];
	next: FixedCircularBuffer<T> | null;

	constructor(kSize: number = 1024) {
		this.bottom = 0;
		this.top = 0;
		this.list = new Array<T>(kSize);
		this.next = null;
		this.kSize = kSize;
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

	constructor(kSize: number = 1024) {
		this.head = this.tail = new FixedCircularBuffer(kSize);
	}

	isEmpty() {
		return this.head.isEmpty();
	}

	push(data: T) {
		if (this.head.isFull()) {
			// Head is full: Creates a new queue, sets the old queue's `.next` to it,
			// and sets it as the new main queue.
			this.head = this.head.next = new FixedCircularBuffer();
		}
		this.head.push(data);
	}

	pushMany(data: T[]) {
		for (const item of data) this.push(item);
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

/** Custom line reader that reads lines faster than the native readline module. */
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
				cache.pushMany(lines);

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
			next
		})
	};
}
