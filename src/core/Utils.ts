import type {
	ChessPiece,
	HeatmapAnalysisFunc,
	HeatmapData,
	SquareData
} from '../interfaces/index.js';

// const files = 'abcdefgh';
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = [1, 2, 3, 4, 5, 6, 7, 8];

const algebraicToCoordsMap = new Map<string, number[]>();
for (const [fileIdx, file] of files.entries()) {
	for (const rank of ranks) {
		algebraicToCoordsMap.set(`${file}${rank}`, [8 - rank, fileIdx]);
	}
}

const fileToNumberMap = new Map([
	['a', 0],
	['b', 1],
	['c', 2],
	['d', 3],
	['e', 4],
	['f', 5],
	['g', 6],
	['h', 7]
]);
const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

export default class Utils {
	static algebraicToCoords(square: string): number[] | undefined {
		return algebraicToCoordsMap.get(square);
	}

	static coordsToAlgebraic(coords: number[]): string {
		return `${files[coords[1]]}${8 - coords[0]}`;
	}

	static getFileNumber(file: string): number | null {
		return fileToNumberMap.get(file) ?? null;
	}

	static getStartingPiece(sqr: number[]): ChessPiece | null {
		if (sqr !== null) {
			const row = sqr[0];
			const col = sqr[1];

			if (row === 0) {
				return { color: 'b', name: pieceTemplate[col] };
			} else if (row === 1) {
				return { color: 'b', name: pawnTemplate[col] };
			} else if (row === 6) {
				return { color: 'w', name: pawnTemplate[col] };
			} else if (row === 7) {
				return { color: 'w', name: pieceTemplate[col] };
			}
		}

		return null;
	}

	static generateHeatmap(
		data: unknown,
		fun: HeatmapAnalysisFunc,
		square?: string | number[],
		optData?: unknown
	): HeatmapData {
		let sqrCoords: number[] = [];
		let sqrAlg = '';

		// square input type 'a2'
		if (typeof square === 'string') {
			sqrCoords = Utils.algebraicToCoords(square);
			sqrAlg = square;

			// input type [6,0]
		} else if (Array.isArray(square)) {
			sqrCoords = square;
			sqrAlg = Utils.coordsToAlgebraic(square);
		}

		const sqrData: SquareData = {
			alg: sqrAlg,
			coords: sqrCoords,
			piece: Utils.getStartingPiece(sqrCoords)
		};

		const map: number[][] = [];
		let max = -Infinity;
		let min = Infinity;

		for (let i = 0; i < 8; i += 1) {
			const dataRow: number[] = [];
			for (let j = 0; j < 8; j += 1) {
				const loopSqrCoords = [i, j];

				const loopSqrData: SquareData = {
					alg: Utils.coordsToAlgebraic(loopSqrCoords),
					coords: loopSqrCoords,
					piece: Utils.getStartingPiece(loopSqrCoords)
				};
				const heatVal = fun(data, loopSqrData, sqrData, optData);
				dataRow.push(heatVal);
				max = Math.max(max, heatVal);
				min = Math.min(min, heatVal);
			}
			map.push(dataRow);
		}

		return { map, min, max };
	}

	static generateComparisonHeatmap(
		data1: unknown,
		data2: unknown,
		fun: HeatmapAnalysisFunc,
		square?: string | number[],
		optData?: unknown
	): HeatmapData {
		const map: number[][] = [];
		let max = -Infinity;
		let min = Infinity;

		// comparison heatmap
		const map0 = Utils.generateHeatmap(data1, fun, square, optData);
		const map1 = Utils.generateHeatmap(data2, fun, square, optData);

		for (let i = 0; i < 8; i += 1) {
			const dataRow: number[] = [];
			for (let j = 0; j < 8; j += 1) {
				const a = map0.map[i][j];
				const b = map1.map[i][j];

				let heatVal = (a >= b ? a / b - 1 : -b / a + 1) * 100;
				if (a === 0 || b === 0) heatVal = 0;

				max = Math.max(max, heatVal);
				min = Math.min(min, heatVal);

				dataRow.push(heatVal);
			}
			map.push(dataRow);
		}

		return { map, min, max };
	}

	static isBitOn(number: number, index: number) {
		(number >>> index) & 1;
	}
}
