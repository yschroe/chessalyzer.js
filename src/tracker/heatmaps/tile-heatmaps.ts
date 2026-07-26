import { tileCellAt } from '#tracker/tile/tile-grid';
import TileTrackerBase from '#tracker/tile/tile-tracker-base';
import type { SquareData } from '#types/game';

function isTileTracker(data: unknown): data is TileTrackerBase {
    return typeof data === 'object' && data !== null && 'tiles' in data && 'cntMovesTotal' in data;
}

export default {
    TILE_OCC_ALL: {
        scope: 'global',
        unit: '%',
        description: 'Tile <loopSqrData> had a piece on it for X% of all moves.',
        calc: (data: unknown, loopSqrData: SquareData) => {
            if (!isTileTracker(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSqrData.coords);
            if (!cell) return 0;
            let val = cell.w.wasOn + cell.b.wasOn;
            val = (val * 100) / data.cntMovesTotal;
            return val;
        },
    },
    TILE_OCC_WHITE: {
        scope: 'global',
        unit: '%',
        description: 'Tile <loopSqrData> had a white piece on it for X% of all moves.',
        calc: (data: unknown, loopSqrData: SquareData) => {
            if (!isTileTracker(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSqrData.coords);
            if (!cell) return 0;
            let val = cell.w.wasOn;
            val = (val * 100) / data.cntMovesTotal;
            return val;
        },
    },
    TILE_OCC_BLACK: {
        scope: 'global',
        unit: '%',
        description: 'Tile X had a black piece on it for Y% of all moves.',
        calc: (data: unknown, loopSqrData: SquareData) => {
            if (!isTileTracker(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSqrData.coords);
            if (!cell) return 0;
            let val = cell.b.wasOn;
            val = (val * 100) / data.cntMovesTotal;
            return val;
        },
    },
    TILE_OCC_BY_PIECE: {
        scope: 'specific',
        unit: '%',
        description: 'Selected tile was occupated by piece X during Y% of all moves.',
        calc: (data: unknown, loopSqrData: SquareData, sqrData?: SquareData) => {
            if (!isTileTracker(data) || !sqrData) return 0;
            const { piece } = loopSqrData;

            let val = 0;
            const cell = tileCellAt(data.tiles, sqrData.coords);
            if (piece && cell) {
                const pieceStats = cell[piece.color][piece.name];
                val = pieceStats?.wasOn ?? 0;
            }
            val = (val * 100) / data.cntMovesTotal;
            return val;
        },
    },
    TILE_CAPTURE_COUNT: {
        scope: 'global',
        unit: '',
        description: 'Count of Pieces that were taken on each tile.',
        calc: (data: unknown, loopSqrData: SquareData) => {
            if (!isTileTracker(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSqrData.coords);
            if (!cell) return 0;
            const val = cell.b.wasCapturedOn + cell.w.wasCapturedOn;
            return val;
        },
    },
    PIECE_MOVED_TO_TILE: {
        scope: 'specific',
        unit: '',
        description: 'Selected piece had tile X as a move target Y times.',
        calc: (data: unknown, loopSqrData: SquareData, sqrData?: SquareData) => {
            if (!isTileTracker(data) || !sqrData) return 0;
            const { piece } = sqrData;
            const { coords } = loopSqrData;
            let val = 0;
            const cell = tileCellAt(data.tiles, coords);
            if (piece && cell) {
                const pieceStats = cell[piece.color][piece.name];
                val = pieceStats?.movedTo ?? 0;
            }
            return val;
        },
    },
};
