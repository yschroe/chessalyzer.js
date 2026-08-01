/**
 * Compare readline event mode vs async iteration on a large PGN file.
 *
 * Run: bun bench/exploratory/line-reader-readline.ts
 */
import EventEmitter from 'node:events';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

import { readLines } from '#io/line-reader';
import { readPgnChunks } from '#io/pgn-chunks';
import { findLargestPgn } from '~/bench/lib/pgn-fixture';
import { getRuntimeLabel } from '~/bench/lib/report';

const pgn = findLargestPgn();

console.log(`Line reader comparison (${getRuntimeLabel()})`);
console.log(`PGN: ${pgn.path}\n`);

console.time('readline events (empty)');
{
    const lineReader = createInterface({
        input: createReadStream(pgn.path),
        crlfDelay: Infinity,
    });
    lineReader.on('line', () => {});
    await EventEmitter.once(lineReader, 'close');
}
console.timeEnd('readline events (empty)');

console.time('readLines (count)');
{
    let lines = 0;
    await readLines(pgn.path, () => {
        lines += 1;
    });
    void lines;
}
console.timeEnd('readLines (count)');

console.time('readline for-await');
{
    const lineReader = createInterface({
        input: createReadStream(pgn.path),
        crlfDelay: Infinity,
    });
    for await (const _line of lineReader) {
    }
}
console.timeEnd('readline for-await');

console.time('readPgnChunks (await at chunk)');
{
    let chunks = 0;
    let lines = 0;
    for await (const chunk of readPgnChunks(pgn.path)) {
        chunks += 1;
        lines += chunk.lineCount;
    }
    void chunks;
    void lines;
}
console.timeEnd('readPgnChunks (await at chunk)');
