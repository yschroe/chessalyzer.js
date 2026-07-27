import { performance } from 'node:perf_hooks';

import chalk from 'chalk';

import { normalizeAnalyzeOptions } from '#core/analysis-config';
import GameProcessor from '#core/game-processor';
import type { AnalyzeOptions, AnalyzeResult, AnalyzeRunResult } from '#types/analysis';
import type { HeatmapData } from '#types/tracker';

function buildAnalyzeResult(
    counts: { cntGames: number; cntMoves: number }[],
    durationMs: number,
): AnalyzeResult {
    const runs: AnalyzeRunResult[] = counts.map(({ cntGames, cntMoves }) => ({
        games: cntGames,
        moves: cntMoves,
        movesPerSecond: durationMs > 0 ? Math.round(cntMoves / (durationMs / 1000)) : 0,
    }));

    const games = runs.reduce((sum, run) => sum + run.games, 0);
    const moves = runs.reduce((sum, run) => sum + run.moves, 0);

    return {
        durationMs,
        games,
        moves,
        movesPerSecond: durationMs > 0 ? Math.round(moves / (durationMs / 1000)) : 0,
        runs,
    };
}

/**
 * Analyze a PGN file with optional trackers, filters, and worker configuration.
 */
export async function analyzePGN(
    pathToPgn: string,
    options?: AnalyzeOptions,
): Promise<AnalyzeResult> {
    const { configs, multithreadCfg } = normalizeAnalyzeOptions(options);
    const gameProcessor = new GameProcessor(configs, multithreadCfg);

    const t0 = performance.now();

    try {
        const counts = await gameProcessor.processPGN(pathToPgn);
        const durationMs = performance.now() - t0;
        return buildAnalyzeResult(counts, durationMs);
    } catch (err) {
        console.error(
            'Error occurred during processing. This is probably a bug in the library or you are using an unkown PGN format. Aborting...',
        );
        console.error(err);
        throw err;
    }
}

/** Print {@link HeatmapData} to the terminal. */
export function printHeatmap(data: HeatmapData): void {
    const color1 = [255, 128, 0];
    const color2 = [0, 128, 255];
    const bgColor = [255, 255, 255];
    const largestVal = Math.max(data.max, Math.abs(data.min));

    for (const row of data.map) {
        for (let cnt = 0; cnt < 2; cnt += 1) {
            for (const cellVal of row) {
                let val = cellVal;
                let color = color1;

                if (val < 0) {
                    val = Math.abs(val);
                    color = color2;
                }

                const alpha = data.max === 0 ? 0 : Math.sqrt(val / largestVal);
                const c0 = color[0] ?? 0;
                const c1 = color[1] ?? 0;
                const c2 = color[2] ?? 0;
                const bg0 = bgColor[0] ?? 255;
                const bg1 = bgColor[1] ?? 255;
                const bg2 = bgColor[2] ?? 255;
                const colorOut = [
                    Math.round(c0 * alpha + (1 - alpha) * bg0),
                    Math.round(c1 * alpha + (1 - alpha) * bg1),
                    Math.round(c2 * alpha + (1 - alpha) * bg2),
                ];

                const [outR = 0, outG = 0, outB = 0] = colorOut;
                process.stdout.write(chalk.black.bgRgb(outR, outG, outB)(`    `));
            }

            process.stdout.write('\n');
        }
    }
}
