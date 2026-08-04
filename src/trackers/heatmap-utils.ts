import { squareAt, type BoardCoord } from '#board/board-coords';
import { getStartingPiece, isStartingPieceName } from '#board/piece-names';
import type { HeatmapFn, HeatmapData } from '#trackers/heatmap-types';
import type { HeatmapPieceRef } from '#trackers/piece-types';

function startingPieceAt(row: number, col: number): HeatmapPieceRef | null {
    const coords: BoardCoord = [row, col];
    const starting = getStartingPiece(coords);
    if (!starting || !isStartingPieceName(starting.name)) return null;
    return { color: starting.color, name: starting.name };
}

/** Evaluate `fun` at every square and collect min/max for normalization. */
function renderHeatmap<T>(data: T, fun: HeatmapFn<T>): HeatmapData {
    const map: number[][] = [];
    let max = -Infinity;
    let min = Infinity;

    for (let i = 0; i < 8; i += 1) {
        const dataRow: number[] = [];
        for (let j = 0; j < 8; j += 1) {
            const heatVal = fun({
                data,
                square: squareAt(i, j),
                startingPiece: startingPieceAt(i, j),
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
 * Generate an 8×8 heatmap from tracker state.
 *
 * Pass a built-in preset (e.g. `TileHeatmapPresets.TILE_OCC_ALL`) or a custom {@link HeatmapFn}.
 * Scoped presets are factories — call them first, e.g.
 * `TileHeatmapPresets.PIECE_MOVED_TO_TILE({ color: 'w', name: 'Qd' })`.
 *
 * @example
 * ```ts
 * import { generateHeatmap, tileTracker, TileHeatmapPresets } from 'chessalyzer/trackers';
 *
 * const tiles = tileTracker();
 * // await analyzePGN(..., { trackers: [tiles] });
 * const heat = generateHeatmap(tiles.state, TileHeatmapPresets.TILE_OCC_ALL);
 * ```
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
