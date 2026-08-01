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
import type { HeatmapAnalysisFunc, HeatmapData, HeatmapPresetEntry } from '#types/tracker';

/**
 * Resolve a preset name or pass through a custom analysis function.
 */
export function resolveHeatmapFunc<T>(
    presets: Record<string, HeatmapPresetEntry>,
    analysis: string | HeatmapAnalysisFunc<T>,
): HeatmapAnalysisFunc<T> {
    if (typeof analysis !== 'string') return analysis;

    const preset = presets[analysis];
    if (!preset) throw new Error(`Heatmap preset '${analysis}' not found!`);
    return preset.calc;
}

function squareData(row: number, col: number): SquareData {
    const square = coordsToSquare(row, col);
    const loopSqrCoords: BoardCoord = [row, col];
    return {
        square,
        piece: getStartingPiece(loopSqrCoords),
    };
}

function resolveRefSquare(square?: Square | BoardCoord): Square {
    if (square === undefined) return 'a1';

    if (typeof square === 'string') {
        const resolved = algebraicToCoords(square);
        if (resolved) {
            return coordsToSquare(resolved[0], resolved[1]);
        }
        return square;
    }

    return coordsToSquare(square[0], square[1]);
}

/**
 * Evaluate `fun` at every square and collect min/max for normalization.
 */
export function generateHeatmap<T>(
    data: T,
    fun: HeatmapAnalysisFunc<T>,
    square?: Square | BoardCoord,
    optData?: unknown,
): HeatmapData {
    const refSquare = resolveRefSquare(square);
    const refRow = squareRow(refSquare);
    const refCol = squareCol(refSquare);
    const refSquareData: SquareData = {
        square: refSquare,
        piece: getStartingPiece([refRow, refCol]),
    };

    const map: number[][] = [];
    let max = -Infinity;
    let min = Infinity;

    for (let i = 0; i < 8; i += 1) {
        const dataRow: number[] = [];
        for (let j = 0; j < 8; j += 1) {
            const loopSquare = squareData(i, j);
            const heatVal = fun({
                data,
                loopSquare,
                refSquare: refSquareData,
                optData,
            });
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
export function generateComparisonHeatmap<T>(
    data1: T,
    data2: T,
    fun: HeatmapAnalysisFunc<T>,
    square?: Square | BoardCoord,
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
