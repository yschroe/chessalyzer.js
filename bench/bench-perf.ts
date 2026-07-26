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
 * Env:
 *   BENCH_RUNS=3           Number of timed iterations per scenario (default 3)
 *   BENCH_WARMUP=0         Skip the warmup run
 *   BENCH_PGN_REPEATS=2    Concatenate the largest manual-tests PGN this many times
 */
import { performance } from 'node:perf_hooks';

import Chessalyzer from '#core/chessalyzer';

import { resolvePerfPgn } from './lib/pgn-fixture';
import { getRuntimeLabel } from './lib/report';

const RUNS = Number(process.env.BENCH_RUNS ?? 3);
const WARMUP = process.env.BENCH_WARMUP !== '0';

interface ScenarioResult {
    label: string;
    meanMs: number;
    stddevMs: number;
    minMs: number;
    cvPct: number;
    games: number;
    moves: number;
    meanMps: number;
}

const isSingleThreaded = process.argv.includes('single-threaded');

async function runScenario(
    label: string,
    path: string,
    singlethreaded: boolean,
): Promise<ScenarioResult> {
    const analyze = async () => {
        const t0 = performance.now();
        const header = await Chessalyzer.analyzePGN(
            path,
            undefined,
            singlethreaded ? null : undefined,
        );
        const ms = performance.now() - t0;
        return {
            ms,
            games: header.cntGames,
            moves: header.cntMoves,
            mps: Math.round(header.cntMoves / (ms / 1000)),
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

    const meanMs = times.reduce((sum, ms) => sum + ms, 0) / times.length;
    const variance =
        times.reduce((sum, ms) => sum + (ms - meanMs) ** 2, 0) / Math.max(times.length - 1, 1);
    const stddevMs = Math.sqrt(variance);
    const minMs = Math.min(...times);

    return {
        label,
        meanMs,
        stddevMs,
        minMs,
        cvPct: meanMs === 0 ? 0 : (stddevMs / meanMs) * 100,
        games,
        moves,
        meanMps: Math.round(mpsTotal / RUNS),
    };
}

function formatMs(ms: number): string {
    return (ms / 1000).toFixed(3);
}

function printResults(results: ScenarioResult[]): void {
    const nameWidth = Math.max(...results.map((result) => result.label.length), 6);

    console.log(
        `\n${'Scenario'.padEnd(nameWidth)}  ${'mean (s)'.padStart(9)}  ${'± (s)'.padStart(9)}  ${'min (s)'.padStart(9)}  ${'CV %'.padStart(7)}  ${'moves/s'.padStart(12)}`,
    );
    console.log(`${'-'.repeat(nameWidth + 55)}`);

    for (const result of results) {
        console.log(
            `${result.label.padEnd(nameWidth)}  ${formatMs(result.meanMs).padStart(9)}  ${formatMs(result.stddevMs).padStart(9)}  ${formatMs(result.minMs).padStart(9)}  ${result.cvPct.toFixed(1).padStart(7)}  ${result.meanMps.toLocaleString().padStart(12)}`,
        );
    }
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

printResults(results);

const sample = results[0]!;
console.log(
    `\nOutput: ${sample.games.toLocaleString()} games, ${sample.moves.toLocaleString()} moves`,
);
