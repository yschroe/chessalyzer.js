import { performance } from 'perf_hooks';
import chalk from 'chalk';
import GameProcessor from './GameProcessor.js';
import Utils from './Utils.js';
import {
	Tracker,
	SquareData,
	HeatmapData,
	HeatmapAnalysisFunc
} from '../interfaces/Interface.js';

export default class Chessalyzer {
	static async analyzePGN(
		pathToPgn: string,
		analyzer: Tracker | Tracker[],
		cfg: { cntGames?: number; filter?: (data: unknown) => boolean } = {},
		multithreadCfg = { batchSize: 8000, nThreads: 1 }
	): Promise<{ cntGames: number; cntMoves: number; mps: number }> {
		// handler for single analyzer or array of analyzers
		let analyzerArray: Tracker[] = [];
		analyzerArray = analyzerArray.concat(analyzer);

		const gameProcessor = new GameProcessor();

		const t0 = performance.now();

		const header = await gameProcessor.processPGN(
			pathToPgn,
			analyzerArray,
			cfg,
			multithreadCfg
		);

		const t1 = performance.now();
		const tdiff = Math.round(t1 - t0) / 1000;
		const mps = Math.round(header.cntMoves / tdiff);

		return { ...header, mps };
	}

	static printHeatmap(data: HeatmapData) {
		const color = [255, 128, 0];
		const bgColor = [255, 255, 255];
		for (let i = 0; i < data.map.length; i += 1) {
			for (let cnt = 0; cnt < 2; cnt += 1) {
				for (let j = 0; j < data.map[i].length; j += 1) {
					const alpha: number =
						data.max === 0
							? 0
							: Math.sqrt(data.map[i][j] / data.max);
					const colorOut = [
						Math.round(color[0] * alpha + (1 - alpha) * bgColor[0]),
						Math.round(color[1] * alpha + (1 - alpha) * bgColor[1]),
						Math.round(color[2] * alpha + (1 - alpha) * bgColor[2])
					];

					process.stdout.write(
						chalk.bgRgb(
							colorOut[0],
							colorOut[1],
							colorOut[2]
						)('    ')
					);
				}
				process.stdout.write('\n');
			}
		}
	}
}
