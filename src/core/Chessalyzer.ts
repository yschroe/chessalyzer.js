import { performance } from 'perf_hooks';
import chalk from 'chalk';
import GameProcessor from './GameProcessor.js';
import { IBaseTracker } from '../interfaces/Interface.js';

const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

/** Main class for batch processing and generating heat maps */
export default class Chessalyzer {
	static async startBatch(
		path: string,
		analyzer: IBaseTracker | IBaseTracker[],
		cfg = {},
		batchSize = 8000,
		nThreads = 1
	) {
		// handler for single analyzer or array of analyzers
		let analyzerArray: IBaseTracker[] = [];
		analyzerArray = analyzerArray.concat(analyzer);

		const gameProcessor = new GameProcessor();

		const t0 = performance.now();

		const header = await gameProcessor.processPGN(
			path,
			analyzerArray,
			cfg,
			batchSize,
			nThreads
		);

		const t1 = performance.now();
		const tdiff = Math.round(t1 - t0) / 1000;
		const mps = Math.round(header.cntMoves / tdiff);

		console.log(
			`${header.cntGames} games (${header.cntMoves} moves) processed in ${tdiff}s (${mps} moves/s)`
		);
		return header;
	}

	static async startBatchSingleThreaded(path, analyzer, cfg = {}) {
		// handler for single analyzer or array of analyzers
		let analyzerArray: IBaseTracker[] = [];
		analyzerArray = analyzerArray.concat(analyzer);

		const gameProcessor = new GameProcessor();
		const t0 = performance.now();

		const header = await gameProcessor.processPGNSingleThreaded(
			path,
			cfg,
			analyzerArray
		);
		const t1 = performance.now();
		const tdiff = Math.round(t1 - t0) / 1000;
		const mps = Math.round(header.cntMoves / tdiff);

		console.log(
			`${header.cntGames} games (${header.cntMoves} moves) processed in ${tdiff}s (${mps} moves/s)`
		);
		return header;
	}
	static generateHeatmap(data, square, fun, optData = {}) {
		let sqrCoords;
		let sqrAlg;

		// square input type 'a2'
		if (typeof square === 'string') {
			sqrCoords = GameProcessor.algebraicToCoords(square);
			sqrAlg = square;

			// input type [6,0]
		} else {
			sqrCoords = square;
			sqrAlg = GameProcessor.coordsToAlgebraic(square);
		}

		const startingPiece = Chessalyzer.getStartingPiece(sqrCoords);
		const sqrData = {
			alg: sqrAlg,
			coords: sqrCoords,
			piece: startingPiece
		};
		const map = [];
		let max = 0;
		let min = 1000000;

		for (let i = 0; i < 8; i += 1) {
			const dataRow = new Array(8);
			for (let j = 0; j < 8; j += 1) {
				const loopSqrCoords = [i, j];
				const loopSqrAlg =
					GameProcessor.coordsToAlgebraic(loopSqrCoords);
				const loopPiece = Chessalyzer.getStartingPiece(loopSqrCoords);
				const loopSqrData = {
					alg: loopSqrAlg,
					coords: loopSqrCoords,
					piece: loopPiece
				};

				dataRow[j] = fun(data, sqrData, loopSqrData, optData);
				if (dataRow[j] > max) max = dataRow[j];
				if (dataRow[j] < min) min = dataRow[j];
			}
			map.push(dataRow);
		}

		return { map, min, max };
	}

	static generateComparisonHeatmap(data1, data2, square, fun, optData = {}) {
		const map = [];
		let max = 0;
		let min = 100000;

		// comparison heatmap
		const map0 = Chessalyzer.generateHeatmap(data1, square, fun, optData);
		const map1 = Chessalyzer.generateHeatmap(data2, square, fun, optData);

		for (let i = 0; i < 8; i += 1) {
			const dataRow = new Array(8);
			for (let j = 0; j < 8; j += 1) {
				const a = map0.map[i][j];
				const b = map1.map[i][j];
				if (a === 0 || b === 0) dataRow[j] = 0;
				else dataRow[j] = (a >= b ? a / b - 1 : -b / a + 1) * 100;

				if (dataRow[j] > max) max = dataRow[j];
				if (dataRow[j] < min) min = dataRow[j];
			}
			map.push(dataRow);
		}

		return { map, min, max };
	}

	static printHeatmap(map, min, max) {
		const color = [255, 128, 0];
		const bgColor = [255, 255, 255];
		for (let i = 0; i < map.length; i += 1) {
			for (let cnt = 0; cnt < 2; cnt += 1) {
				for (let j = 0; j < map[i].length; j += 1) {
					const alpha: number =
						max === 0 ? 0 : Math.sqrt(map[i][j] / max);
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

	static getStartingPiece(sqr) {
		let color = '';
		let name = '';
		if (sqr[0] === 0) {
			color = 'b';
			name = pieceTemplate[sqr[1]];
		} else if (sqr[0] === 1) {
			color = 'b';
			name = pawnTemplate[sqr[1]];
		} else if (sqr[0] === 6) {
			color = 'w';
			name = pawnTemplate[sqr[1]];
		} else if (sqr[0] === 7) {
			color = 'w';
			name = pieceTemplate[sqr[1]];
		}

		return { color, name };
	}
}
