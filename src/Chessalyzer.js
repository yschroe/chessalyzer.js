import GameProcessor from './GameProcessor';

const { performance } = require('perf_hooks');

const fs = require('fs');

const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

/** Main class for batch processing and generating heat maps */
class Chessalyzer {
	constructor() {
		/**
		 * Contains the tracked data of the processed PGN files. Has two different banks for
		 * heat map comparison. Each object contains the following keys:
		 * <ul>
		 * <li>data: {cntMoves, cntGames}. Information about the count of processed moves and games</li>
		 * <li>tiles: 8x8 array of {@link ChessTile}s.</li>
		 * </ul>
		 * @member {Object[]}
		 */
		this.dataStore = new Array(2);
		/**
		 * Does the analysis part
		 * @member {GameProcessor}
		 */
		this.gameProcessor = new GameProcessor();
	}

	/**
	 * Starts the batch processing for the selected file
	 * @param {String} path - Path to the PGN file that should be analyzed
	 * @param {Number} [bank = 0] - The data bank the results shall be saved to
	 * @param {Number} [refreshRate = 250] - Defines how often the current status of the
	 *  analysis shall be exposed. Every number of processed games an event is emitted
	 * containing the current number of processed games. The event can be handled via
	 *  "chessalyzer.gameProcessor.on('status', function(gameCnt) {// do handling here});",
	 *  e.g. to update an UI.
	 * @returns {Promise} Promise that contains the number of processed games when finished
	 */
	startBatch(path, bank = 0, refreshRate = 250) {
		return new Promise((resolve) => {
			const t0 = performance.now();
			this.gameProcessor.processPGN(path, refreshRate).then((board) => {
				const dataset = {};
				dataset.data = board.data;
				dataset.tiles = board.tiles;
				this.dataStore[bank] = JSON.parse(JSON.stringify(dataset));
				const t1 = performance.now();
				const tdiff = Math.round(t1 - t0) / 1000;
				const mps = Math.round(dataset.data.cntMoves / tdiff);
				console.log(
					`${
						dataset.data.cntMoves
					} moves processed in ${tdiff}s (${mps} moves/s)`
				);
				this.gameProcessor.reset();
				resolve(this.dataStore[bank].data.cntGames);
			});
		});
	}

	/**
	 * Saves a completed analysis to a JSON file
	 * @param {String} path - Path the analysis file shall be saved to
	 * @param {Number} [bank = 0] - The data bank the data shall be taken from
	 */
	saveAnalysis(path, bank = 0) {
		fs.writeFile(path, JSON.stringify(this.dataStore[bank]), (err) => {
			if (err) {
				console.error(err);
				return;
			}
			console.log('File has been created');
		});
	}

	/**
	 * Loads a analysis file (JSON) to a data bank
	 * @param {String} path - Path the analysis file shall be loaded from
	 * @param {Number} [bank = 0] - The data bank the data shall be loaded to.
	 * @returns {Number} Count of loaded games
	 */
	loadAnalysis(path, bank) {
		this.dataStore[bank] = JSON.parse(fs.readFileSync(path, 'utf8'));
		console.log(`File '${path}' has been loaded to bank ${bank}.`);
		return this.dataStore[bank].cntGames;
	}

	/**
	 * Generates a heatmap out of the tracked data.
	 * @param {Number} bank - Path the analysis file shall be loaded from
	 * @param {String} square - The square the data shall be generated for. For example, if you
	 * wanted to know how often a specific piece was on a specific tile, you would pass the
	 * identifiert of the tile to the function, e.g. "a2"
	 * @param {Function} fun - The evaluation function that generates the heatmap out of the
	 * saved data. This function gets passed the following arguments:
	 * <ol>
	 * <li>The complete data stored in the chosen bank. See the member description of the dataStore
	 * member to see which data is available.</li>
	 * <li>The coords of the tile passed as the square argument.</li>
	 * <li>The current coordinates of the tile the data should be generated for.
	 * The function must return a Number with the heat map value for the square passed as the
	 * third argument.</li>
	 * </ol>
	 * See ./src/exampleHeatmapConfig for examples of such a function.
	 * @returns {Array} Array with 3 entries:
	 * <ol>
	 * <li>8x8 Array containing the heat map values for each tile</li>
	 * <li>The minimum value in the heatmap.</li>
	 * <li>The maximum value in the heatmap.</li>
	 * </ol>
	 */
	generateHeatmap(bank, square, fun) {
		const coords = GameProcessor.algebraicToCoords(square);
		const map = [];
		let max = 0;
		let min = 100000;

		for (let i = 0; i < 8; i += 1) {
			const dataRow = new Array(8);
			for (let j = 0; j < 8; j += 1) {
				dataRow[j] = fun(this.dataStore[bank], coords, [i, j]);
				if (dataRow[j] > max) max = dataRow[j];
				if (dataRow[j] < min) min = dataRow[j];
			}
			map.push(dataRow);
		}

		return [map, min, max];
	}

	/**
	 * Generates a comparison heatmap out of the tracked data. There needs to data in both
	 * banks you pass as bank1 and bank2 params. The heatmap for both banks are calculated
	 * and then the relative differences between both banks are calculated. For example,
	 * if the heatmap value for "a1" of bank1 is 10 and the value of bank2 is 5, the returned
	 * value for "a1" would be 100% ([[10/5] -1] *100).
	 * @param {String} square - The square the data shall be generated for.
	 * @param {Function} fun - The evaluation function that generates the heatmap out of the
	 * saved data. See {@link Chessalyzer#generateHeatmap} for a more detailed description.
	 * @param {Number} [bank1 = 0] - Bank number of dataset 1
	 * @param {Number} [bank2 = 1] - Bank number of dataset 2
	 * @returns {Array} Array with 3 entries:
	 * <ol>
	 * <li>8x8 Array containing the heat map values for each tile</li>
	 * <li>The minimum value in the heatmap.</li>
	 * <li>The maximum value in the heatmap.</li>
	 * </ol>
	 */
	generateComparisonHeatmap(square, fun, bank1 = 0, bank2 = 1) {
		const map = [];
		let max = 0;
		let min = 100000;

		// comparison heatmap
		const data0 = this.generateHeatmap(bank1, square, fun);
		const data1 = this.generateHeatmap(bank2, square, fun);

		for (let i = 0; i < 8; i += 1) {
			const dataRow = new Array(8);
			for (let j = 0; j < 8; j += 1) {
				const a = data0[0][i][j];
				const b = data1[0][i][j];
				if (a === 0 || b === 0) dataRow[j] = 0;
				else dataRow[j] = (a >= b ? a / b - 1 : -b / a + 1) * 100;

				if (dataRow[j] > max) max = dataRow[j];
				if (dataRow[j] < min) min = dataRow[j];
			}
			map.push(dataRow);
		}

		return [map, min, max];
	}

	static generateList(map) {
		const list = [];
		for (let i = 0; i < 8; i += 1) {
			for (let j = 0; j < 8; j += 1) {
				let val = map[i][j];
				val = val.toFixed(2);
				if (Math.abs(val) > 0.001) {
					if (i === 0) list.push([`b${pieceTemplate[j]}`, val]);
					else if (i === 1) list.push([`b${pawnTemplate[j]}`, val]);
					else if (i === 6) list.push([`w${pawnTemplate[j]}`, val]);
					else if (i === 7) list.push([`w${pieceTemplate[j]}`, val]);
				}
			}
		}
		list.sort((a, b) => b[1] - a[1]);
		return list;
	}
}

export default Chessalyzer;
