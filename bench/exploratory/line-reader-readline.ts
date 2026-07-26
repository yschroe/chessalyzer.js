/**
 * Compare readline event mode vs async iteration on a large PGN file.
 *
 * Run: bun bench/exploratory/line-reader-readline.ts
 */
import EventEmitter from 'node:events';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

import { readLinesFast } from '#pgn/line-reader';

import { findLargestPgn } from '../lib/pgn-fixture';
import { getRuntimeLabel } from '../lib/report';

const pgn = findLargestPgn();

console.log(`Line reader comparison (${getRuntimeLabel()})`);
console.log(`PGN: ${pgn.path}\n`);

console.time('readline events');
const lineReader = createInterface({
    input: createReadStream(pgn.path),
    crlfDelay: Infinity,
});
lineReader.on('line', () => {});
await EventEmitter.once(lineReader, 'close');
console.timeEnd('readline events');

console.time('readline for-await');
const lineReader2 = createInterface({
    input: createReadStream(pgn.path),
    crlfDelay: Infinity,
});
for await (const _line of lineReader2) {
}
console.timeEnd('readline for-await');

console.time('readLinesFast');
for await (const _line of readLinesFast(pgn.path)) {
}
console.timeEnd('readLinesFast');
