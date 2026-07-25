import type { ChessPiece, HeatmapAnalysisFunc, HeatmapData, SquareData } from '../interfaces';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// Indexed by file*8 + rankIndex (rank '1'..'8' -> 0..7). Values are shared immutable coords.
const algebraicToCoordsTable: number[][] = Array.from({ length: 64 });
for (let file = 0; file < 8; file += 1) {
    for (let rank = 0; rank < 8; rank += 1) {
        algebraicToCoordsTable[file * 8 + rank] = [7 - rank, file];
    }
}

const rowColNone: (number | null)[] = [null, null];
const rowColByFile: (number | null)[][] = [];
const rowColByRank: (number | null)[][] = [];
for (let i = 0; i < 8; i += 1) {
    rowColByFile[i] = [null, i];
    rowColByRank[i] = [7 - i, null];
}

const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

export default class Utils {
    /**
     * Convert algebraic square (e.g. 'e4') to board coords.
     * Returns a shared array — do not mutate.
     */
    static algebraicToCoords(square: string): number[] | undefined {
        const file = square.charCodeAt(0) - 97; // 'a' -> 0
        const rank = square.charCodeAt(1) - 49; // '1' -> 0
        if ((file | rank) >>> 3) return undefined;
        return algebraicToCoordsTable[file * 8 + rank];
    }

    /**
     * Read an algebraic square from `san` ending at `end` (exclusive), without slicing.
     * Returns a shared array — do not mutate.
     */
    static algebraicToCoordsAt(san: string, end: number): number[] {
        const file = san.charCodeAt(end - 2) - 97;
        const rank = san.charCodeAt(end - 1) - 49;
        return algebraicToCoordsTable[file * 8 + rank];
    }

    static coordsToAlgebraic(coords: number[]): string {
        return `${files[coords[1]]}${8 - coords[0]}`;
    }

    static getRowCol(file: string): (number | null)[] {
        if (file.length === 0) return rowColNone;
        const c = file.charCodeAt(0);
        if (c >= 97 && c <= 104) return rowColByFile[c - 97];
        if (c >= 49 && c <= 56) return rowColByRank[c - 49];
        return rowColNone;
    }

    static getFileNumber(file: string): number | null {
        const n = file.charCodeAt(0) - 97;
        return n >= 0 && n < 8 ? n : null;
    }

    static getStartingPiece(sqr: number[]): ChessPiece | null {
        if (sqr !== null) {
            const row = sqr[0];
            const col = sqr[1];

            switch (row) {
                case 0:
                    return { color: 'b', name: pieceTemplate[col] };
                case 1:
                    return { color: 'b', name: pawnTemplate[col] };
                case 6:
                    return { color: 'w', name: pawnTemplate[col] };
                case 7:
                    return { color: 'w', name: pieceTemplate[col] };
                default:
                    return null;
            }
        }
        return null;
    }

    static generateHeatmap(
        data: unknown,
        fun: HeatmapAnalysisFunc,
        square?: string | number[],
        optData?: unknown,
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
            piece: Utils.getStartingPiece(sqrCoords),
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
                    piece: Utils.getStartingPiece(loopSqrCoords),
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
        optData?: unknown,
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
