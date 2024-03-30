import EventEmitter from 'events';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const HEADER_REGEX = /\[(.*?)\s"(.*?)"\]/;
const COMMENT_REGEX = /\{.*?\}|\(.*?\)/g;
const MOVE_REGEX = /[RNBQKOa-h][^\s?!#+]+/g;
// const MOVE_REGEX = /[^.]+/g;
const RESULT_REGEX = /-(1\/2|0|1)$/;

// init line reader 0
const lineReader0 = createInterface({
	input: createReadStream(
		'./manualTests/lichess_db_standard_rated_2013-12.pgn'
	),
	crlfDelay: Infinity
});

console.time('READING ONLY');
lineReader0.on('line', (_line) => {});

await EventEmitter.once(lineReader0, 'close');
console.timeEnd('READING ONLY');

// init line reader
const lineReader = createInterface({
	input: createReadStream(
		'./manualTests/lichess_db_standard_rated_2013-12.pgn'
	),
	crlfDelay: Infinity
});

console.time('All Regexes');
lineReader.on('line', (line) => {
	const isHeaderTag = line.startsWith('[');
	if (!isHeaderTag) {
		// extract move SANs
		// const cleanedLine = line
		// 	.replaceAll(COMMENT_REGEX, '')
		// 	.replaceAll(/\d+\.{1,3}|\s+|[+!#?]/g, '.');
		const matchedMoves = line.match(MOVE_REGEX) ?? [];

		// only if the result marker is found, all moves have been read -> start analyzing
		RESULT_REGEX.test(line);
	}
});

await EventEmitter.once(lineReader, 'close');
console.timeEnd('All Regexes');

// // init line reader 2
// const lineReader2 = createInterface({
// 	input: createReadStream(
// 		'./manualTests/lichess_db_standard_rated_2013-12.pgn'
// 	),
// 	crlfDelay: Infinity
// });

// console.time('COMMENT_REGEX');
// lineReader2.on('line', (line) => {
// 	const cleanedLine = line.replaceAll(COMMENT_REGEX, '');
// });

// await EventEmitter.once(lineReader2, 'close');
// console.timeEnd('COMMENT_REGEX');

// // init line reader 3
// const lineReader3 = createInterface({
// 	input: createReadStream(
// 		'./manualTests/lichess_db_standard_rated_2013-12.pgn'
// 	),
// 	crlfDelay: Infinity
// });

// console.time('MOVE_REGEX');
// lineReader3.on('line', (line) => {
// 	const matchedMoves = line.match(MOVE_REGEX) ?? [];
// });

// await EventEmitter.once(lineReader3, 'close');
// console.timeEnd('MOVE_REGEX');
