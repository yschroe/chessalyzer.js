import { performance } from 'node:perf_hooks';

import chalk from 'chalk';

import { normalizeAnalyzeOptions } from '#core/analysis-config';
import { collectError, MAX_COLLECTED_ERRORS } from '#core/analyze-errors';
import GameProcessor from '#core/game-processor';
import type { AnalyzeOptions, AnalyzeResult, AnalyzeRunResult } from '#types/analysis';
import type { AnalyzeError } from '#types/errors';
import type { HeatmapData } from '#types/tracker';

/** Build {@link AnalyzeResult} from raw counts and duration. */
function buildAnalyzeResult(
    counts: {
        games: number;
        moves: number;
        skippedGames?: number;
        errors?: AnalyzeError[];
    }[],
    durationMs: number,
): AnalyzeResult {
    const runs: AnalyzeRunResult[] = counts.map(({ games, moves }) => ({
        games,
        moves,
        movesPerSecond: durationMs > 0 ? Math.round(moves / (durationMs / 1000)) : 0,
    }));

    const games = runs.reduce((sum, run) => sum + run.games, 0);
    const moves = runs.reduce((sum, run) => sum + run.moves, 0);
    const skippedGames = counts.reduce((sum, c) => sum + (c.skippedGames ?? 0), 0);

    const errors: AnalyzeError[] = [];
    for (const c of counts) {
        if (c.errors) {
            for (const err of c.errors) {
                collectError(errors, err);
            }
        }
    }

    const result: AnalyzeResult = {
        durationMs,
        games,
        moves,
        movesPerSecond: durationMs > 0 ? Math.round(moves / (durationMs / 1000)) : 0,
        runs,
    };

    if (skippedGames > 0) {
        result.skippedGames = skippedGames;
    }
    if (errors.length > 0) {
        result.errors = errors.slice(0, MAX_COLLECTED_ERRORS);
    }

    return result;
}

/**
 * Analyze a PGN file with optional trackers, filters, and worker configuration.
 */
export async function analyzePGN(
    pathToPgn: string,
    options?: AnalyzeOptions,
): Promise<AnalyzeResult> {
    const { runs, multithreadCfg, onError, headers, replay } = normalizeAnalyzeOptions(options);
    const gameProcessor = new GameProcessor(runs, multithreadCfg, onError, { headers, replay });

    const t0 = performance.now();
    const counts = await gameProcessor.processPGN(pathToPgn);
    const durationMs = performance.now() - t0;
    return buildAnalyzeResult(counts, durationMs);
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
