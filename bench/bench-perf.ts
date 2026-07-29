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
import { analyzePGN } from '#core/analyze';

import { resolvePerfPgn } from './lib/pgn-fixture';
import { getRuntimeLabel } from './lib/report';
import { formatSeconds, printTimedResults, runTimed, type TimedRunResult } from './lib/timing';

const RUNS = Number(process.env.BENCH_RUNS ?? 2);
const WARMUP = process.env.BENCH_WARMUP !== '0';
const isSingleThreaded = process.argv.includes('single-threaded');

interface AnalyzeSample {
    games: number;
    moves: number;
}

interface ScenarioResult extends TimedRunResult {
    games: number;
    moves: number;
    meanMps: number;
}

async function runAnalyzeScenario(
    label: string,
    path: string,
    singlethreaded: boolean,
): Promise<ScenarioResult> {
    const config = singlethreaded ? ({ workers: false } as const) : undefined;
    const timed = await runTimed<AnalyzeSample>(
        label,
        async () => {
            const result = await analyzePGN(path, config);
            return {
                games: result.games,
                moves: result.moves,
            };
        },
        { runs: RUNS, warmup: WARMUP },
    );

    const mpsTotal = timed.samples.reduce(
        (sum, sample) => sum + Math.round(sample.value.moves / (sample.ms / 1000)),
        0,
    );

    const last = timed.samples.at(-1)!.value;
    return {
        label: timed.label,
        meanMs: timed.meanMs,
        stddevMs: timed.stddevMs,
        minMs: timed.minMs,
        cvPct: timed.cvPct,
        games: last.games,
        moves: last.moves,
        meanMps: Math.round(mpsTotal / timed.samples.length),
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
    await runAnalyzeScenario(
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
