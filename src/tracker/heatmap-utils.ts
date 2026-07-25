import { algebraicToCoords, coordsToAlgebraic } from '#board/board-coords';
import { getStartingPiece } from '#board/piece-names';
import type { SquareData } from '#types/game';
import type { HeatmapAnalysisFunc, HeatmapData } from '#types/tracker';

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
    square?: string | number[],
    optData?: unknown,
): HeatmapData {
    let sqrCoords: number[] = [];
    let sqrAlg = '';

    if (typeof square === 'string') {
        sqrCoords = algebraicToCoords(square) ?? [];
        sqrAlg = square;
    } else if (Array.isArray(square)) {
        sqrCoords = square;
        sqrAlg = coordsToAlgebraic(square);
    }

    const sqrData: SquareData = {
        alg: sqrAlg,
        coords: sqrCoords,
        piece: getStartingPiece(sqrCoords)!,
    };

    const map: number[][] = [];
    let max = -Infinity;
    let min = Infinity;

    for (let i = 0; i < 8; i += 1) {
        const dataRow: number[] = [];
        for (let j = 0; j < 8; j += 1) {
            const loopSqrCoords = [i, j];

            const loopSqrData: SquareData = {
                alg: coordsToAlgebraic(loopSqrCoords),
                coords: loopSqrCoords,
                piece: getStartingPiece(loopSqrCoords)!,
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

/**
 * Percentage-difference heatmap between two datasets.
 * Positive = `data1` higher; negative = `data2` higher; zero when either cell is 0.
 */
export function generateComparisonHeatmap(
    data1: unknown,
    data2: unknown,
    fun: HeatmapAnalysisFunc,
    square?: string | number[],
    optData?: unknown,
): HeatmapData {
    const map: number[][] = [];
    let max = -Infinity;
    let min = Infinity;

    const map0 = generateHeatmap(data1, fun, square, optData);
    const map1 = generateHeatmap(data2, fun, square, optData);

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
