import {
	ChessPiece,
	HeatmapAnalysisFunc,
	HeatmapData,
	SquareData
} from '../interfaces';
import { PlayerColor } from '../types';

const files = 'abcdefgh';
const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

export default class Utils {
	static algebraicToCoords(square: string): number[] {
		const coords: number[] = [];
		const temp = square.split('');
		coords.push(8 - Number(temp[1]));
		coords.push(Utils.getFileNumber(temp[0]));

		return coords;
	}

	static coordsToAlgebraic(coords: number[]): string {
		let name = files[coords[1]];
		name += 8 - coords[0];
		return name;
	}

	static getFileNumber(file: string): number {
		return files.indexOf(file);
	}

	static getStartingPiece(sqr: number[]): ChessPiece {
		if (sqr !== null) {
			const row = sqr[0];
			const col = sqr[1];

			let color: PlayerColor;
			let name: string = null;
			if (row === 0) {
				color = 'b';
				name = pieceTemplate[col];
				return { color, name };
			} else if (row === 1) {
				color = 'b';
				name = pawnTemplate[col];
				return { color, name };
			} else if (row === 6) {
				color = 'w';
				name = pawnTemplate[col];
				return { color, name };
			} else if (row === 7) {
				color = 'w';
				name = pieceTemplate[col];
				return { color, name };
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
		let sqrCoords: number[] = null;
		let sqrAlg: string = null;

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
}