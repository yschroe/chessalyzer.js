/**
 * End-to-end performance benchmark for regression checks.
 *
 * Mirrors manual-tests/test-release.ts (multithreaded) and
 * manual-tests/test-release-singlethreaded.ts (single-threaded), but uses a
 * larger cached PGN fixture so startup overhead is a smaller share of runtime.
 *
 * Scenarios (no trackers):
 *   - skip  — PGN parse + counts only (default analyzePGN path)
 *   - board — same plus internal board replay (`replay: 'board'`)
 *
 * Run:
 *   bun run bench:perf [skip,board,actions] (--single-threaded (optional))
 *   bun run bench:perf:bun [skip,board,actions] (--single-threaded (optional))
 *
 * Pass `single-threaded` to benchmark only the single-threaded path.
 *
 * Env:
 *   BENCH_RUNS=2           Number of timed iterations (default 2)
 *   BENCH_WARMUP=0         Skip the warmup run
 *   BENCH_PGN_REPEATS=2    Concatenate the largest pgn/*.pgn this many times
 */
import { analyzePGN } from '#core/analyze';
import type { ReplayMode } from '#replay/replay-mode';
import { resolvePerfPgn } from '~/bench/lib/pgn-fixture';
import { getRuntimeLabel } from '~/bench/lib/report';
import {
    formatSeconds,
    printTimedResults,
    runTimed,
    type TimedRunResult,
} from '~/bench/lib/timing';

const RUNS = Number(process.env.BENCH_RUNS ?? 2);
const WARMUP = process.env.BENCH_WARMUP !== '0';
const isSingleThreaded = process.argv.includes('--single-threaded');
const allowedReplayModes = ['skip', 'board', 'actions'];
const replayModes = process.argv.slice(2).filter((arg) => allowedReplayModes.includes(arg));

if (replayModes.length === 0) {
    console.error('Error: No replay modes provided');
    console.error('Usage: bun run bench:perf [skip|board]...');
    process.exit(1);
}
const SCENARIOS = replayModes as readonly ReplayMode[];

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
    replay: (typeof SCENARIOS)[number],
): Promise<ScenarioResult> {
    const config = {
        replay,
        ...(singlethreaded ? ({ workers: false } as const) : {}),
    };
    const timed = await runTimed<AnalyzeSample>(
        label,
        async () => {
            const result = await analyzePGN(path, config);
            return {
                games: result.gameCount,
                moves: result.moveCount,
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
const threading = isSingleThreaded ? 'single-threaded' : 'multithreaded';

console.log('Chessalyzer end-to-end performance');
console.log(`Runtime: ${getRuntimeLabel()}`);
console.log(`PGN: ${fixture.path}`);
console.log(
    `Source: ${fixture.source}${fixture.repeats > 1 ? ` (${fixture.repeats}x concatenated)` : ''}`,
);
console.log(`Size: ${(fixture.bytes / (1024 * 1024)).toFixed(1)} MiB`);
console.log(`Runs: ${RUNS}${WARMUP ? ' (+ warmup)' : ''}`);
console.log(`Path: ${threading}`);

const results: ScenarioResult[] = [];
for (const replay of SCENARIOS) {
    results.push(
        await runAnalyzeScenario(
            `${threading} · replay mode: ${replay}`,
            fixture.path,
            isSingleThreaded,
            replay,
        ),
    );
}

printTimedResults(results, { stddev: true, cv: true, movesPerSec: results.map((r) => r.meanMps) });

console.log('');
for (const sample of results) {
    console.log(
        `${sample.label}: ${sample.games.toLocaleString()} games, ${sample.moves.toLocaleString()} moves (${formatSeconds(sample.meanMs)}s mean)`,
    );
}
