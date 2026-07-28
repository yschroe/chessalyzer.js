/**
 * End-to-end performance benchmark for regression checks.
 *
 * Mirrors manual-tests/test-release.ts (multithreaded) and
 * manual-tests/test-release-singlethreaded.ts (single-threaded), but uses a
 * larger cached PGN fixture so startup overhead is a smaller share of runtime.
 *
 * Run:
 *   npm run bench:perf
 *   npm run bench:perf:bun
 *
 * Pass `single-threaded` to benchmark only the single-threaded path.
 *
 * Env:
 *   BENCH_RUNS=2           Number of timed iterations (default 2)
 *   BENCH_WARMUP=0         Skip the warmup run
 *   BENCH_PGN_REPEATS=2    Concatenate the largest pgn/*.pgn this many times
 */
import { performance } from 'node:perf_hooks';

import { analyzePGN } from '#core/analyze';

import { resolvePerfPgn } from './lib/pgn-fixture';
import { getRuntimeLabel } from './lib/report';
import {
    computeTimingStats,
    formatSeconds,
    printTimedResults,
    type TimedRunResult,
} from './lib/timing';

const RUNS = Number(process.env.BENCH_RUNS ?? 2);
const WARMUP = process.env.BENCH_WARMUP !== '0';
const isSingleThreaded = process.argv.includes('single-threaded');

interface ScenarioResult extends TimedRunResult {
    games: number;
    moves: number;
    meanMps: number;
}

async function runScenario(
    label: string,
    path: string,
    singlethreaded: boolean,
): Promise<ScenarioResult> {
    const analyze = async () => {
        const t0 = performance.now();
        const result = await analyzePGN(path, singlethreaded ? { workers: false } : undefined);
        const ms = performance.now() - t0;
        return {
            ms,
            games: result.games,
            moves: result.moves,
            mps: Math.round(result.moves / (ms / 1000)),
        };
    };

    if (WARMUP) await analyze();

    const times: number[] = [];
    let games = 0;
    let moves = 0;
    let mpsTotal = 0;

    for (let i = 0; i < RUNS; i += 1) {
        console.log(`Running ${label}... (${i + 1} of ${RUNS})`);
        const result = await analyze();
        times.push(result.ms);
        games = result.games;
        moves = result.moves;
        mpsTotal += result.mps;
    }

    return {
        label,
        ...computeTimingStats(times),
        games,
        moves,
        meanMps: Math.round(mpsTotal / RUNS),
    };
}

const fixture = await resolvePerfPgn();

console.log('Chessalyzer end-to-end performance');
console.log(`Runtime: ${getRuntimeLabel()}`);
console.log(`PGN: ${fixture.path}`);
console.log(
    `Source: ${fixture.source}${fixture.repeats > 1 ? ` (${fixture.repeats}x concatenated)` : ''}`,
);
console.log(`Size: ${(fixture.bytes / (1024 * 1024)).toFixed(1)} MiB`);
console.log(`Runs: ${RUNS}${WARMUP ? ' (+ warmup)' : ''}`);

const results = [
    await runScenario(
        isSingleThreaded ? 'single-threaded' : 'multithreaded',
        fixture.path,
        isSingleThreaded,
    ),
];

printTimedResults(results, { stddev: true, cv: true, movesPerSec: results.map((r) => r.meanMps) });

const sample = results[0]!;
console.log(
    `\nOutput: ${sample.games.toLocaleString()} games, ${sample.moves.toLocaleString()} moves (${formatSeconds(sample.meanMs)}s mean)`,
);
