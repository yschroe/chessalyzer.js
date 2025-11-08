import { createReadStream } from 'fs';
import { createInterface } from 'readline';
const HEADER_REGEX = /\[(.*?)\s"(.*?)"\]/;
const COMMENT_REGEX = /\{.*?\}|\(.*?\)/g;
const MOVE_REGEX = /[RNBQKOa-h][^\s?!#+]+/g;
const RESULT_REGEX = /-(1\/2|0|1)$/;

// https://github.com/nodejs/node/blob/bae03c4e30f927676203f61ff5a34fe0a0c0bbc9/lib/internal/fixed_queue.js

// Currently optimal queue size, tested on V8 6.0 - 6.6. Must be power of two.
const kSize = 2048;
const kMask = kSize - 1;

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

class FixedCircularBuffer {
	top;
	bottom;
	list;
	next;

	constructor() {
		this.bottom = 0;
		this.top = 0;
		this.list = new Array(kSize);
		this.next = null;
	}

	isEmpty() {
		return this.top === this.bottom;
	}

	isFull() {
		return ((this.top + 1) & kMask) === this.bottom;
	}

	push(data) {
		this.list[this.top] = data;
		this.top = (this.top + 1) & kMask;
	}

	shift() {
		const { list, bottom } = this;
		const nextItem = list[bottom];
		if (nextItem === undefined) return null;
		list[bottom] = undefined;
		this.bottom = (bottom + 1) & kMask;
		return nextItem;
	}
}

class FixedQueue {
	head;
	tail;

	constructor() {
		this.head = this.tail = new FixedCircularBuffer();
	}

	isEmpty() {
		return this.head.isEmpty();
	}

	push(data) {
		if (this.head.isFull()) {
			// Head is full: Creates a new queue, sets the old queue's `.next` to it,
			// and sets it as the new main queue.
			this.head = this.head.next = new FixedCircularBuffer();
		}
		this.head.push(data);
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

function getYielder() {
	// init line reader
	const lineReader = createInterface({
		input: createReadStream(
			'./manualTests/lichess_db_standard_rated_2013-12.pgn'
		),
		crlfDelay: Infinity
	});

	const unconsumedPromises = new FixedQueue();
	const unconsumedGames = new FixedQueue();
	let done = false;

	let game = { moves: [] };
	// on new line
	lineReader.on('line', (line) => {
		if (line === '') return;

		const isHeaderTag = line.startsWith('[');
		// header tag
		if (isHeaderTag) {
			const [_, key, value] = HEADER_REGEX.exec(line);
			game[key] = value;

			// moves
		} else if (!isHeaderTag) {
			// extract move SANs
			const cleanedLine = line.replaceAll(COMMENT_REGEX, '');
			const matchedMoves = cleanedLine.match(MOVE_REGEX) ?? [];

			// For performance reasons, do not use spread operator if it's not necessary
			// -> PGNs which use a single line for all moves only use one assignment instead of spreading
			if (game.moves.length === 0) game.moves = matchedMoves;
			else game.moves.push(...matchedMoves);

			// only if the result marker is found, all moves have been read -> start analyzing
			if (RESULT_REGEX.test(cleanedLine)) {
				if (!unconsumedPromises.isEmpty()) {
					const { resolver } = unconsumedPromises.shift();
					resolver(game);
					game = { moves: [] };
					return;
				}
				// Else: Add event value to queue so it can be consumed by a future Promise.
				unconsumedGames.push(game);
			}
		}
	});
	lineReader.on('close', () => {
		done = true;
		if (!unconsumedPromises.isEmpty()) {
			const { resolver } = unconsumedPromises.shift();
			resolver('END');
			return;
		}
	});

	// Create AsyncGeneratorFunction which handles the Iterator logic
	const iterator = async function* () {
		while (!done || !unconsumedGames.isEmpty()) {
			if (!unconsumedGames.isEmpty()) {
				yield Promise.resolve(unconsumedGames.shift());
			} else {
				let resolver = null;
				const promise = new Promise((resolve) => {
					resolver = resolve;
				});
				unconsumedPromises.push({ resolver });

				yield promise;
			}
		}
	};

	// Return AsyncGenerator
	return iterator();
}

const myYielder = getYielder();
console.time('a');
for await (const game of myYielder) {
}
console.timeEnd('a');
