/**
 * Benchmark parse throughput at different chunk sizes and worker counts.
 */
import { availableParallelism } from 'node:os';
import { performance } from 'node:perf_hooks';

import { Chessalyzer } from '../lib/index.js';

const PGN = new URL('../pgn/lichess_db_standard_rated_2013-12.pgn', import.meta.url).pathname;
const MB = 1024 * 1024;
const chunkSizes = [2 * MB, 4 * MB, 8 * MB, 16 * MB];
const workerCounts = [Math.max(1, availableParallelism() - 1), availableParallelism()];

async function bench(label, multithreadCfg) {
    const t0 = performance.now();
    const result = await Chessalyzer.analyzePGN(PGN, { trackers: [] }, multithreadCfg);
    const ms = performance.now() - t0;
    const mps = Math.round(result.cntMoves / (ms / 1000)).toLocaleString();
    console.log(`${label.padEnd(28)} ${(ms / 1000).toFixed(3)}s  ${mps} moves/s`);
    return result.cntMoves / ms;
}

console.log(`CPUs: ${availableParallelism()}`);
console.log(`PGN: ${PGN}\n`);

let best = { label: '', mps: 0 };
for (const targetBytes of chunkSizes) {
    for (const workerCount of workerCounts) {
        const label = `${targetBytes / MB}MB / ${workerCount}w`;
        const mps = await bench(label, { targetBytes, workerCount });
        if (mps > best.mps) best = { label, mps };
    }
}

console.log(`\nBest: ${best.label}`);
