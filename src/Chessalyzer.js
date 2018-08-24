import GameProcessor from './GameProcessor';

const { performance } = require('perf_hooks');

const fs = require('fs');

const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

class Chessalyzer {
	constructor() {
		this.ds = new Array(2);
		this.gp = new GameProcessor();
	}

	startBatch(path, bank = 0, refreshRate = 1000) {
		return new Promise((resolve) => {
			const t0 = performance.now();
			this.gp.processPGN(path, refreshRate).then((gameCnt) => {
				this.ds[bank] = JSON.parse(JSON.stringify(this.gp.board));
				const t1 = performance.now();
				const tdiff = Math.round(t1 - t0) / 1000;
				const mps = Math.round(this.gp.board.cntMoves / tdiff);
				console.log(
					`${
						this.gp.board.cntMoves
					} moves processed in ${tdiff}s (${mps} moves/s)`
				);
				this.gp.reset();
				resolve(gameCnt);
			});
		});
	}

	saveAnalysis(path, bank = 0) {
		fs.writeFile(path, JSON.stringify(this.ds[bank]), (err) => {
			if (err) {
				console.error(err);
				return;
			}
			console.log('File has been created');
		});
	}

	loadAnalysis(path, bank) {
		this.ds[bank] = JSON.parse(fs.readFileSync(path, 'utf8'));
		console.log(`File '${path}' has been loaded to bank ${bank}.`);
		return this.ds[bank].cntGames;
	}

	generateHeatmap(bank, square, fun) {
		const coords = GameProcessor.algebraicToCoords(square);
		const map = [];
		let max = 0;
		let min = 100000;

		for (let i = 0; i < 8; i += 1) {
			const dataRow = new Array(8);
			for (let j = 0; j < 8; j += 1) {
				dataRow[j] = fun(this.ds[bank], coords, [i, j]);
				if (dataRow[j] > max) max = dataRow[j];
				if (dataRow[j] < min) min = dataRow[j];
			}
			map.push(dataRow);
		}

		return [map, min, max];
	}

	generateComparisonHeatmap(bank1, bank2, square, fun) {
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
