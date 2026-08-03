/**
 * Benchmark single-threaded multi-run filtering — the path that used to call
 * `toParsedGame` once per run per game.
 *
 * Run:
 *   bun bench/exploratory/bench-filter-materialize.ts
 *
 * Env: same as bench:perf (BENCH_RUNS, BENCH_WARMUP, BENCH_PGN_REPEATS).
 */
import { analyzePGN } from '#core/analyze';
import { gameTracker } from '#trackers/game-tracker';
import type { ParsedGame } from '#types/parse-pgn';
import { resolvePerfPgn } from '~/bench/lib/pgn-fixture';
import { formatSeconds, runTimed } from '~/bench/lib/timing';

const RUNS = Number(process.env.BENCH_RUNS ?? 3);
const WARMUP = process.env.BENCH_WARMUP !== '0';

async function main(): Promise<void> {
    const { path } = await resolvePerfPgn();
    console.log(`PGN: ${path}`);
    console.log(`Runs per timed iteration: ${RUNS} (warmup ${WARMUP ? 'on' : 'off'})\n`);

    const white = gameTracker();
    const black = gameTracker();
    const draws = gameTracker();
    const unknown = gameTracker();

    const timed = await runTimed(
        'multi-run filter (ST, game trackers)',
        async () => {
            const result = await analyzePGN(path, {
                workers: false,
                runs: [
                    { trackers: [white], filter: (g: ParsedGame) => g.result === '1-0' },
                    { trackers: [black], filter: (g: ParsedGame) => g.result === '0-1' },
                    { trackers: [draws], filter: (g: ParsedGame) => g.result === '1/2-1/2' },
                    { trackers: [unknown], filter: (g: ParsedGame) => g.result === '*' },
                ],
            });
            return { games: result.gameCount, moves: result.moveCount };
        },
        { runs: RUNS, warmup: WARMUP },
    );

    const sample = timed.samples[0]?.value;
    console.log(
        `mean ${formatSeconds(timed.meanMs)}s  min ${formatSeconds(timed.minMs)}s  CV ${timed.cvPct.toFixed(1)}%`,
    );
    if (sample) {
        console.log(`Processed ${sample.games} games, ${sample.moves} half-moves`);
    }
}

void main();
