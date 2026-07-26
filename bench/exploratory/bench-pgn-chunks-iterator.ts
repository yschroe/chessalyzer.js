/**
 * Compare async generator vs manual Symbol.asyncIterator for readPgnChunks.
 *
 * Run: bun bench/exploratory/bench-pgn-chunks-iterator.ts
 */
import {
    DEFAULT_PGN_CHUNK_BYTES,
    readPgnChunks,
    type PgnChunk,
    type PgnChunkConfig,
} from '#pgn/line-reader';

import { readPgnChunksGenerator } from '../lib/pgn-chunks-generator';
import { findLargestPgn } from '../lib/pgn-fixture';
import { getRuntimeLabel } from '../lib/report';
import { printRelativeTimingComparison, runTimedIterations } from '../lib/timing';

const RUNS = Number(process.env.BENCH_RUNS ?? 5);
const pgn = findLargestPgn();
const config: PgnChunkConfig = { targetBytes: DEFAULT_PGN_CHUNK_BYTES };

async function drain(source: AsyncIterable<PgnChunk>) {
    let chunks = 0;
    let lines = 0;
    for await (const chunk of source) {
        chunks += 1;
        lines += chunk.lineCount;
    }
    return { chunks, lines };
}

console.log('readPgnChunks iterator comparison');
console.log(`Runtime: ${getRuntimeLabel()}`);
console.log(`PGN: ${pgn.path}`);
console.log(`Runs: ${RUNS}\n`);

await drain(readPgnChunks(pgn.path, config));

const results = [
    await runTimedIterations(
        'async generator',
        RUNS,
        () => drain(readPgnChunksGenerator(pgn.path, config)),
        {
            warmup: true,
        },
    ),
    await runTimedIterations(
        'manual iterator',
        RUNS,
        () => drain(readPgnChunks(pgn.path, config)),
        {
            warmup: false,
        },
    ),
];

const { fastest } = printRelativeTimingComparison(results);

const stats = await drain(readPgnChunks(pgn.path, config));
console.log(`\nOutput: ${stats.chunks} chunks, ${stats.lines.toLocaleString()} lines`);
console.log(`Fastest: ${fastest.label}`);
