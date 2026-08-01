/**
 * Benchmark parse throughput at different chunk sizes and worker counts.
 *
 * Run: bun bench/exploratory/bench-chunk-sizes.ts
 */
import { availableParallelism } from 'node:os';

import { analyzePGN } from '#core/analyze';
import { findLargestPgn } from '~/bench/lib/pgn-fixture';
import { getRuntimeLabel } from '~/bench/lib/report';
import { formatSeconds, timeAsync } from '~/bench/lib/timing';

const pgn = findLargestPgn();
const MB = 1024 * 1024;
const chunkSizes = [2 * MB, 4 * MB, 8 * MB, 16 * MB];
const workerCounts = [Math.max(1, availableParallelism() - 1), availableParallelism()];

async function bench(label: string, multithreadCfg: { targetBytes: number; workerCount: number }) {
    const { ms, result } = await timeAsync(() =>
        analyzePGN(pgn.path, {
            trackers: [],
            workers: {
                targetBytes: multithreadCfg.targetBytes,
                workerCount: multithreadCfg.workerCount,
            },
        }),
    );
    const mps = Math.round(result.moveCount / (ms / 1000)).toLocaleString();
    console.log(`${label.padEnd(28)} ${formatSeconds(ms).padStart(9)}s  ${mps} moves/s`);
    return result.moveCount / ms;
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
