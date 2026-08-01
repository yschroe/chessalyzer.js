import { tileCellAt } from '#trackers/tile/tile-grid';
import type { TileGrid } from '#trackers/tile/tile-tracker-types';
import type { HeatmapPresetEntry } from '#types/tracker';

function isTileTrackerData(data: unknown): data is { tiles: TileGrid; movesTotal: number } {
    return typeof data === 'object' && data !== null && 'tiles' in data && 'movesTotal' in data;
}

export const TileHeatmapPresets = {
    TILE_OCC_ALL: {
        scope: 'global',
        unit: '%',
        description: 'Tile <loopSquare> had a piece on it for X% of all moves.',
        calc: ({ data, loopSquare }) => {
            if (!isTileTrackerData(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSquare.square);
            if (!cell) return 0;
            let val = cell.w.wasOn + cell.b.wasOn;
            val = (val * 100) / data.movesTotal;
            return val;
        },
    },
    TILE_OCC_WHITE: {
        scope: 'global',
        unit: '%',
        description: 'Tile <loopSquare> had a white piece on it for X% of all moves.',
        calc: ({ data, loopSquare }) => {
            if (!isTileTrackerData(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSquare.square);
            if (!cell) return 0;
            let val = cell.w.wasOn;
            val = (val * 100) / data.movesTotal;
            return val;
        },
    },
    TILE_OCC_BLACK: {
        scope: 'global',
        unit: '%',
        description: 'Tile X had a black piece on it for Y% of all moves.',
        calc: ({ data, loopSquare }) => {
            if (!isTileTrackerData(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSquare.square);
            if (!cell) return 0;
            let val = cell.b.wasOn;
            val = (val * 100) / data.movesTotal;
            return val;
        },
    },
    TILE_OCC_BY_PIECE: {
        scope: 'specific',
        unit: '%',
        description: 'Selected tile was occupated by piece X during Y% of all moves.',
        calc: ({ data, loopSquare, refSquare }) => {
            if (!isTileTrackerData(data)) return 0;
            const { piece } = loopSquare;

            let val = 0;
            const cell = tileCellAt(data.tiles, refSquare.square);
            if (piece && cell) {
                const pieceStats = cell[piece.color][piece.name];
                val = pieceStats?.wasOn ?? 0;
            }
            val = (val * 100) / data.movesTotal;
            return val;
        },
    },
    TILE_CAPTURE_COUNT: {
        scope: 'global',
        unit: '',
        description: 'Count of Pieces that were taken on each tile.',
        calc: ({ data, loopSquare }) => {
            if (!isTileTrackerData(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSquare.square);
            if (!cell) return 0;
            const val = cell.b.wasCapturedOn + cell.w.wasCapturedOn;
            return val;
        },
    },
    PIECE_MOVED_TO_TILE: {
        scope: 'specific',
        unit: '',
        description: 'Selected piece had tile X as a move target Y times.',
        calc: ({ data, loopSquare, refSquare }) => {
            if (!isTileTrackerData(data)) return 0;
            const { piece } = refSquare;
            const { square } = loopSquare;
            let val = 0;
            const cell = tileCellAt(data.tiles, square);
            if (piece && cell) {
                const pieceStats = cell[piece.color][piece.name];
                val = pieceStats?.movedTo ?? 0;
            }
            return val;
        },
    },
} as const satisfies Record<string, HeatmapPresetEntry>;

export type TileHeatmapPresetName = keyof typeof TileHeatmapPresets;
