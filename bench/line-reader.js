/**
 * Compare readline event mode vs async iteration on a large PGN file.
 */
import EventEmitter from 'events';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const PGN = new URL('../manual-tests/lichess_db_standard_rated_2013-12.pgn', import.meta.url)
    .pathname;

console.time('Events');

const lineReader = createInterface({
    input: createReadStream(PGN),
    crlfDelay: Infinity,
});

lineReader.on('line', (_line) => {});

await EventEmitter.once(lineReader, 'close');
console.timeEnd('Events');

console.time('Await');

const lineReader2 = createInterface({
    input: createReadStream(PGN),
    crlfDelay: Infinity,
});

for await (const _line of lineReader2) {
}

console.timeEnd('Await');
