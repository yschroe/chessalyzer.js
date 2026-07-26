import { performance } from 'node:perf_hooks';

import chalk from 'chalk';

import GameProcessor from '#core/game-processor';
import { DEFAULT_PGN_CHUNK_BYTES } from '#pgn/line-reader';
import type { AnalysisConfig, GameAndMoveCountFull, MultithreadConfig } from '#types/analysis';
import type { HeatmapData } from '#types/tracker';

export default class Chessalyzer {
    /**
     * Main function for analyzing PGN files.
     * @param pathToPgn Path to the .pgn file which should be parsed and analyzed.
     * @param configs Configuration for the analysis. Via this config the games can be filtered and trackers can be attached.
     * @param multithreadCfg Configuration for multithreaded analysis. Here the size per batch that shall be analyzed on a separate thread can be set.
     * @returns Meta information about the analysis like the amount of processed games/moves and the time it took.
     */
    static analyzePGN(
        pathToPgn: string,
        configs?: AnalysisConfig,
        multithreadCfg?: MultithreadConfig | null,
    ): Promise<GameAndMoveCountFull>;
    static analyzePGN(
        pathToPgn: string,
        configs: AnalysisConfig[],
        multithreadCfg?: MultithreadConfig | null,
    ): Promise<GameAndMoveCountFull[]>;
    static async analyzePGN(
        pathToPgn: string,
        configs?: AnalysisConfig | AnalysisConfig[],
        multithreadCfg: MultithreadConfig | null = { targetBytes: DEFAULT_PGN_CHUNK_BYTES },
    ): Promise<GameAndMoveCountFull[] | GameAndMoveCountFull> {
        // handler for single config or array of configs
        const configArray: AnalysisConfig[] = Array.isArray(configs)
            ? configs
            : [configs ?? { trackers: [] }];

        const gameProcessor = new GameProcessor(configArray, multithreadCfg);

        const t0 = performance.now();

        try {
            const header = await gameProcessor.processPGN(pathToPgn);

            const t1 = performance.now();
            const tdiff = Math.round(t1 - t0) / 1000;

            const returnVals: GameAndMoveCountFull[] = [];
            for (const h of header) returnVals.push({ ...h, mps: Math.round(h.cntMoves / tdiff) });

            const first = returnVals[0];
            if (first === undefined) {
                return Array.isArray(configs) ? returnVals : { cntGames: 0, cntMoves: 0, mps: 0 };
            }
            return Array.isArray(configs) ? returnVals : first;
        } catch (err) {
            console.error(
                'Error occurred during processing. This is probably a bug in the library or you are using an unkown PGN format. Aborting...',
            );
            console.error(err);
            throw err;
        }
    }

    /**
     * Prints HeatmapData to the console.
     * @param data Data for the heatmap.
     */
    static printHeatmap(data: HeatmapData) {
        const color1 = [255, 128, 0];
        const color2 = [0, 128, 255];
        const bgColor = [255, 255, 255];
        const largestVal = Math.max(data.max, Math.abs(data.min));

        for (const row of data.map) {
            for (let cnt = 0; cnt < 2; cnt += 1) {
                for (const cellVal of row) {
                    let val = cellVal;
                    let color = color1;

                    // if negative value, use different color
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
}
