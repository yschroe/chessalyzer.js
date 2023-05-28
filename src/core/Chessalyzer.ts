import { performance } from 'node:perf_hooks';
import chalk from 'chalk';
import GameProcessor from './GameProcessor.js';
import type {
	AnalysisConfig,
	GameAndMoveCountFull,
	HeatmapData,
	MultithreadConfig
} from '../interfaces/index.js';
import { error } from 'node:console';

export default class Chessalyzer {
	static async analyzePGN(
		pathToPgn: string,
		configs: AnalysisConfig | AnalysisConfig[] = { trackers: [] },
		multithreadCfg: MultithreadConfig | null = { batchSize: 1000 }
	): Promise<GameAndMoveCountFull[] | GameAndMoveCountFull> {
		// handler for single analyzer or array of analyzers
		let configArray: AnalysisConfig[] = [];
		configArray = configArray.concat(configs);

		const gameProcessor = new GameProcessor();

		const t0 = performance.now();

		try {
			const header = await gameProcessor.processPGN(
				pathToPgn,
				configArray,
				multithreadCfg
			);

			const t1 = performance.now();
			const tdiff = Math.round(t1 - t0) / 1000;

			const returnVals: GameAndMoveCountFull[] = [];
			for (const h of header)
				returnVals.push({ ...h, mps: Math.round(h.cntMoves / tdiff) });

			return Array.isArray(configs) && configs.length > 1
				? returnVals
				: returnVals[0];
		} catch (err) {
			console.error(
				'Error occurred during processing. This is probably a bug in the library or you are using an unkown PGN format. Aborting...'
			);
			console.error(err);
			return [];
		}
	}

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

					const alpha =
						data.max === 0 ? 0 : Math.sqrt(val / largestVal);
					const colorOut = [
						Math.round(color[0] * alpha + (1 - alpha) * bgColor[0]),
						Math.round(color[1] * alpha + (1 - alpha) * bgColor[1]),
						Math.round(color[2] * alpha + (1 - alpha) * bgColor[2])
					];

					process.stdout.write(
						chalk.black.bgRgb(
							colorOut[0],
							colorOut[1],
							colorOut[2]
						)(`    `)
					);
				}

				process.stdout.write('\n');
			}
		}
	}
}
