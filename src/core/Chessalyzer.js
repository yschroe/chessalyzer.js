import { performance } from 'perf_hooks';
import { readFileSync, writeFile } from 'fs';
import chalk from 'chalk';
import GameProcessor from './GameProcessor.js';

const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

/** Main class for batch processing and generating heat maps */
export default class Chessalyzer {
	/**
	 * Starts the singlethreaded batch processing for the selected file
	 * @param {string} path - Path to the PGN file that should be analyzed
	 * @param {(Object|Object[])} analyzer - The analysis functions that shall be run
	 *  during batch processing. Can be one single analyzer or an array of analyzers.
	 * @param {Object} [cfg = {}]
	 * @param {Function} [cfg.filter = ()=>true] - Filter function for selecting games
	 * @param {number} [cfg.cntGames = Infinite ] - Max amount of games to process
	 * @param {Object} callback - Callback object
	 * @param {Function} [callback.fun] - Callback function that is called every callback.rate games
	 * @param {number} [callback.rate] - Every 'rate' games the callback function is called.
	 * @returns {Promise}
	 */
	static async startBatch(
		path,
		analyzer,
		cfg = {},
		callback = { fun: () => {}, rate: 250 }
	) {
		// check if single analyzer or array is passed
		let analyzerArray = analyzer;
		if (!Array.isArray(analyzerArray)) {
			analyzerArray = [analyzer];
		}

		const gameProcessor = new GameProcessor();

		// callback handler
		gameProcessor.on('status', (gameCnt) => {
			callback.fun(gameCnt);
		});

		const t0 = performance.now();

		const header = await gameProcessor.processPGN(
			path,
			cfg,
			analyzerArray,
			callback.rate
		);

		const t1 = performance.now();
		const tdiff = Math.round(t1 - t0) / 1000;
		const mps = Math.round(header.cntMoves / tdiff);

		console.log(
			`${header.cntGames} games (${header.cntMoves} moves) processed in ${tdiff}s (${mps} moves/s)`
		);
		return header;
	}

	/**
	 * Starts the multithreaded batch processing for the selected file
	 * @param {string} path - Path to the PGN file that should be analyzed
	 * @param {(Object|Object[])} analyzer - The analysis functions that shall be run
	 *  during batch processing. Can be one single analyzer or an array of analyzers.
	 * @param {Function} [cfg.filter = ()=>true] - Filter function for selecting games
	 * @param {number} [cfg.cntGames = Infinite ] - Max amount of games to process
	 * @param {number} [batchSize = 8000] Amount of games per thread.
	 * @param {number} [nThreads = 1] numbers of additional threads to use.
	 * @returns {Promise}
	 */
	static async startBatchMultiCore(
		path,
		analyzer,
		cfg = {},
		batchSize = 8000,
		nThreads = 1
	) {
		// check if single analyzer or array is passed
		let analyzerArray = analyzer;
		if (!Array.isArray(analyzerArray)) {
			analyzerArray = [analyzer];
		}
		const t0 = performance.now();

		const header = await GameProcessor.processPGNMultiCore(
			path,
			cfg,
			analyzerArray,
			batchSize,
			nThreads
		);
		const t1 = performance.now();
		const tdiff = Math.round(t1 - t0) / 1000;
		const mps = Math.round(header.cntMoves / tdiff);

		console.log(
			`${header.cntGames} games (${header.cntMoves} moves) processed in ${tdiff}s (${mps} moves/s)`
		);
		header.mps = mps;
		return header;
	}

	/**
	 * Saves a completed batch run to a JSON file
	 * @param {string} path - Path the data file shall be saved to
	 * @param {Object} data - The data that shall be saved
	 */
	static saveData(path, data) {
		writeFile(path, JSON.stringify(data), (err) => {
			if (err) {
				console.error(err);
				return;
			}
			console.log('File has been created.');
		});
	}

	/**
	 * Loads the stats of a previous batch run (JSON) to a data bank
	 * @param {string} path - Path the data file shall be loaded from
	 * @returns {Object} Returns the loaded data
	 */
	static loadData(path) {
		const data = JSON.parse(readFileSync(path, 'utf8'));
		console.log(`File '${path}' has been loaded.`);
		return data;
	}

	/**
	 * Generates a heatmap out of the tracked data.
	 * @param {Object} data - Where the data shall be taken from
	 * @param {(string|number[])} square - The square the data shall be generated for.
	 * For example, if you wanted to know how often a specific piece was on a specific tile,
	 * you would pass the identifier of the tile to the function, e.g. "a2" or [7,1].
	 * @param {Function} fun - The evaluation function that generates the heatmap out of the
	 * data.
	 * See ./src/exampleHeatmapConfig for examples of such a function.
	 * @param {*} [optData = {}] - Optional data you may need in your eval function
	 * @returns {Object} Array with 3 entries:
	 * <ol>
	 * <li>map: 8x8 Array containing the heat map values for each tile</li>
	 * <li>min: The minimum value in the heatmap.</li>
	 * <li>max: The maximum value in the heatmap.</li>
	 * </ol>
	 */
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

	/**
	 * Generates a comparison heatmap out of the tracked data. There needs to data in both
	 * banks you pass as bank1 and bank2 params. The heatmap for both banks is calculated
	 * and then the relative differences between both banks are calculated. For example,
	 * if the heatmap value for "a1" of bank1 is 10 and the value of bank2 is 5, the returned
	 * value for "a1" would be 100% ([[10/5] -1] *100).
	 * @param {Object} data1 - Dataset 1
	 * @param {Object} data2 - Dataset 2
	 * @param {(string|number[])} square - The square the data shall be generated for. Notation
	 * can be 'a1' or [7,0].
	 * @param {Function} fun - The evaluation function that generates the heatmap out of the
	 * saved data. See {@link generateHeatmap} for a more detailed description.
	 * @param {*} [optData = {}] - Optional data you may need in your eval function
	 * @returns {Object} Object with 3 entries:
	 * <ol>
	 * <li>map: 8x8 Array containing the heat map values for each tile</li>
	 * <li>min: The minimum value in the heatmap.</li>
	 * <li>max: The maximum value in the heatmap.</li>
	 * </ol>
	 */
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

	/**
	 * Prints a heatmap to the terminal
	 * @param {number[][]} map - The heatmap data. An (8x8) Array containing values.
	 * @param {number} min - The minimum value in map.
	 * @param {number} max - The maximum value in map.
	 */
	static printHeatmap(map, min, max) {
		const color = [255, 128, 0];
		const bgColor = [255, 255, 255];
		for (let i = 0; i < map.length; i += 1) {
			for (let cnt = 0; cnt < 2; cnt += 1) {
				for (let j = 0; j < map[i].length; j += 1) {
					const alpha =
						max === 0 ? 0 : Math.sqrt(map[i][j] / max).toFixed(2);
					// const value = map[i][j].toFixed(2);
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
