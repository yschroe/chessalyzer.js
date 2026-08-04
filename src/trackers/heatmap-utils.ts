import { squareAt, type BoardCoord } from '#board/board-coords';
import { getStartingPiece, isStartingPieceName } from '#board/piece-names';
import type { HeatmapFn, HeatmapData, HeatmapSquare } from '#trackers/heatmap-types';

function heatmapSquare(row: number, col: number): HeatmapSquare {
    const square = squareAt(row, col);
    const loopSqrCoords: BoardCoord = [row, col];
    const starting = getStartingPiece(loopSqrCoords);
    return {
        square,
        piece:
            starting && isStartingPieceName(starting.name)
                ? { color: starting.color, name: starting.name }
                : null,
    };
}

/** Evaluate `fun` at every square and collect min/max for normalization. */
function renderHeatmap<T>(data: T, fun: HeatmapFn<T>): HeatmapData {
    const map: number[][] = [];
    let max = -Infinity;
    let min = Infinity;

    for (let i = 0; i < 8; i += 1) {
        const dataRow: number[] = [];
        for (let j = 0; j < 8; j += 1) {
            const square = heatmapSquare(i, j);
            const heatVal = fun({ data, square });
            dataRow.push(heatVal);
            max = Math.max(max, heatVal);
            min = Math.min(min, heatVal);
        }
        map.push(dataRow);
    }

    return { map, min, max };
}

/**
 * Generate an 8×8 heatmap from tracker state.
 * `analysis` is a preset function (e.g. `TileHeatmapPresets.TILE_OCC_ALL`) or a custom function.
 * Scoped presets are factories — call them first, e.g. `TileHeatmapPresets.PIECE_MOVED_TO_TILE({ color: 'w', name: 'Qd' })`.
 */
export function generateHeatmap<T>(state: T, analysis: HeatmapFn<T>): HeatmapData {
    return renderHeatmap(state, analysis);
}

/**
 * Percentage-difference heatmap between two datasets.
 * Positive = `state` higher; negative = `compState` higher; zero when either cell is 0.
 */
export function generateComparisonHeatmap<T>(
    state: T,
    compState: T,
    analysis: HeatmapFn<T>,
): HeatmapData {
    const map: number[][] = [];
    let max = -Infinity;
    let min = Infinity;

    const map0 = renderHeatmap(state, analysis);
    const map1 = renderHeatmap(compState, analysis);

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
