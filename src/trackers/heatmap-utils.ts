import {
    algebraicToCoords,
    coordsToSquare,
    squareCol,
    squareRow,
    type BoardCoord,
    type Square,
} from '#board/board-coords';
import { getStartingPiece } from '#board/piece-names';
import type { SquareData } from '#types/game';
import type { PlayerColor } from '#types/tokens';
import type { HeatmapAnalysisFunc, HeatmapData } from '#types/tracker';

const EMPTY_SQUARE_PIECE = { color: 'w' as PlayerColor, name: '' };

function squareData(row: number, col: number): SquareData {
    const square = coordsToSquare(row, col);
    const loopSqrCoords: BoardCoord = [row, col];
    return {
        alg: square,
        square,
        piece: getStartingPiece(loopSqrCoords) ?? EMPTY_SQUARE_PIECE,
    };
}

/**
 * Build 8×8 heatmap grids from tracker data and analysis functions.
 *
 * Each cell calls the provided `fun` with:
 * - `data` — tracker instance (or comparison baseline)
 * - `loopSqrData` — the square being evaluated
 * - `sqrData` — optional reference square (for relative presets)
 * - `optData` — caller-provided extra context
 */

/**
 * Evaluate `fun` at every square and collect min/max for normalization.
 * @param square Optional reference square as `'e4'` or `[row, col]` coords.
 */
export function generateHeatmap(
    data: unknown,
    fun: HeatmapAnalysisFunc,
    square?: string | BoardCoord,
    optData?: unknown,
): HeatmapData {
    let refSquare: Square = 'a1';

    if (typeof square === 'string') {
        const resolved = algebraicToCoords(square);
        if (resolved) {
            refSquare = coordsToSquare(resolved[0], resolved[1]);
        }
    } else if (square !== undefined) {
        refSquare = coordsToSquare(square[0], square[1]);
    }

    const refRow = squareRow(refSquare);
    const refCol = squareCol(refSquare);
    const sqrData: SquareData = {
        alg: refSquare,
        square: refSquare,
        piece: getStartingPiece([refRow, refCol]) ?? EMPTY_SQUARE_PIECE,
    };

    const map: number[][] = [];
    let max = -Infinity;
    let min = Infinity;

    for (let i = 0; i < 8; i += 1) {
        const dataRow: number[] = [];
        for (let j = 0; j < 8; j += 1) {
            const loopSqrData = squareData(i, j);
            const heatVal = fun(data, loopSqrData, sqrData, optData);
            dataRow.push(heatVal);
            max = Math.max(max, heatVal);
            min = Math.min(min, heatVal);
        }
        map.push(dataRow);
    }

    return { map, min, max };
}

/**
 * Percentage-difference heatmap between two datasets.
 * Positive = `data1` higher; negative = `data2` higher; zero when either cell is 0.
 */
export function generateComparisonHeatmap(
    data1: unknown,
    data2: unknown,
    fun: HeatmapAnalysisFunc,
    square?: string | BoardCoord,
    optData?: unknown,
): HeatmapData {
    const map: number[][] = [];
    let max = -Infinity;
    let min = Infinity;

    const map0 = generateHeatmap(data1, fun, square, optData);
    const map1 = generateHeatmap(data2, fun, square, optData);

    for (let i = 0; i < 8; i += 1) {
        const dataRow: number[] = [];
        const row0 = map0.map[i];
        const row1 = map1.map[i];
        if (!row0 || !row1) continue;
        for (let j = 0; j < 8; j += 1) {
            const a = row0[j];
            const b = row1[j];
            if (a === undefined || b === undefined) continue;

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
