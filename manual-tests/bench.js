import EventEmitter from 'events';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

console.time('Events');

// init line reader
const lineReader = createInterface({
	input: createReadStream(
		'./manualTests/lichess_db_standard_rated_2013-12.pgn'
	),
	crlfDelay: Infinity
});

lineReader.on('line', (_line) => {});

await EventEmitter.once(lineReader, 'close');
console.timeEnd('Events');

console.time('Await');

// init line reader
const lineReader2 = createInterface({
	input: createReadStream(
		'./manualTests/lichess_db_standard_rated_2013-12.pgn'
	),
	crlfDelay: Infinity
});

for await (const _line of lineReader2) {
}

console.timeEnd('Await');
