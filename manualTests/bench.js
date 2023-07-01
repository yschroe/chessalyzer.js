import EventEmitter from 'events';
import { createReadStream } from 'fs';
import { performance } from 'perf_hooks';
import { createInterface } from 'readline';

let lineCount = 0;

const t0 = performance.now();

// // init line reader
const lineReader = createInterface({
	input: createReadStream('./test/lichess_db_standard_rated_2013-12.pgn'),
	crlfDelay: Infinity
});

// ==============================
// lineReader.on('line', (_) => (lineCount += 1));

lineReader.on('line', (line) => {
	if (line.startsWith('[')) {
		const [_, key, value] = /\[(.*?)\s"(.*?)"\]/g.exec(line);
	}
	if (line === '') console.log('empty');
	else console.log(line);
});

// =================

await EventEmitter.once(lineReader, 'close');
const t1 = performance.now();
const tdiff = Math.round(t1 - t0) / 1000;
console.log(lineCount, tdiff);
