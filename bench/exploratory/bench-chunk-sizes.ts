/**
 * Benchmark parse throughput at different chunk sizes and worker counts.
 *
 * Run: bun bench/exploratory/bench-chunk-sizes.ts
 */
import { availableParallelism } from 'node:os';
import { performance } from 'node:perf_hooks';

import Chessalyzer from '#core/chessalyzer';

import { findLargestPgn } from '../lib/pgn-fixture';
import { getRuntimeLabel } from '../lib/report';
import { formatSeconds } from '../lib/timing';

const pgn = findLargestPgn();
const MB = 1024 * 1024;
const chunkSizes = [2 * MB, 4 * MB, 8 * MB, 16 * MB];
const workerCounts = [Math.max(1, availableParallelism() - 1), availableParallelism()];

async function bench(label: string, multithreadCfg: { targetBytes: number; workerCount: number }) {
    const t0 = performance.now();
    const raw = await Chessalyzer.analyzePGN(pgn.path, { trackers: [] }, multithreadCfg);
    const result = Array.isArray(raw) ? raw[0]! : raw;
    const ms = performance.now() - t0;
    const mps = Math.round(result.cntMoves / (ms / 1000)).toLocaleString();
    console.log(`${label.padEnd(28)} ${formatSeconds(ms).padStart(9)}s  ${mps} moves/s`);
    return result.cntMoves / ms;
}

console.log(`Chunk size sweep (${getRuntimeLabel()})`);
console.log(`CPUs: ${availableParallelism()}`);
console.log(`PGN: ${pgn.path}\n`);

let best = { label: '', mps: 0 };
for (const targetBytes of chunkSizes) {
    for (const workerCount of workerCounts) {
        const label = `${targetBytes / MB}MB / ${workerCount}w`;
        const mps = await bench(label, { targetBytes, workerCount });
        if (mps > best.mps) best = { label, mps };
    }
}

console.log(`\nBest: ${best.label}`);
