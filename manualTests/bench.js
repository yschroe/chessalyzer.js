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
	lineCount += 1;
	const isHeaderTag = line.startsWith('[');
	if (isHeaderTag) {
		const [_, key, value] = /\[(.*?)\s"(.*?)"\]/g.exec(line);
	} else if (line !== '') {
		// console.log(/\d+\.{1,3} (.*?) /g.exec(line));
		// line.match(/\d+\.{1,3} (.*?) /g);
		line.replaceAll(/\{.*?\}/g, '').match(
			/([RNBQKa-h][a-hx1-8]{1,5}(=[RNBQK])?[?!+#]?)|O(-O){1,2}|1\/2-1\/2|1-0|0-1/g
		);
		// line.trim()
		// 	.replace(/(\d+\.{1,3}\s)|(\s?\{(.*?)\})/g, '')
		// 	.split(' ');
	}
});

// =================

await EventEmitter.once(lineReader, 'close');
const t1 = performance.now();
const tdiff = Math.round(t1 - t0) / 1000;
console.log(lineCount, tdiff);
