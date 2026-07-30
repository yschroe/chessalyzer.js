import { tileCellAt } from '#trackers/tile/tile-grid';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { SquareData } from '#types/game';

function isTileTracker(data: unknown): data is TileTracker {
    return typeof data === 'object' && data !== null && 'tiles' in data && 'movesTotal' in data;
}

export default {
    TILE_OCC_ALL: {
        scope: 'global',
        unit: '%',
        description: 'Tile <loopSqrData> had a piece on it for X% of all moves.',
        calc: (data: unknown, loopSqrData: SquareData, _sqrData: SquareData) => {
            if (!isTileTracker(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSqrData.square);
            if (!cell) return 0;
            let val = cell.w.wasOn + cell.b.wasOn;
            val = (val * 100) / data.movesTotal;
            return val;
        },
    },
    TILE_OCC_WHITE: {
        scope: 'global',
        unit: '%',
        description: 'Tile <loopSqrData> had a white piece on it for X% of all moves.',
        calc: (data: unknown, loopSqrData: SquareData, _sqrData: SquareData) => {
            if (!isTileTracker(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSqrData.square);
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
        calc: (data: unknown, loopSqrData: SquareData, _sqrData: SquareData) => {
            if (!isTileTracker(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSqrData.square);
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
        calc: (data: unknown, loopSqrData: SquareData, sqrData: SquareData) => {
            if (!isTileTracker(data)) return 0;
            const { piece } = loopSqrData;

            let val = 0;
            const cell = tileCellAt(data.tiles, sqrData.square);
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
        calc: (data: unknown, loopSqrData: SquareData, _sqrData: SquareData) => {
            if (!isTileTracker(data)) return 0;
            const cell = tileCellAt(data.tiles, loopSqrData.square);
            if (!cell) return 0;
            const val = cell.b.wasCapturedOn + cell.w.wasCapturedOn;
            return val;
        },
    },
    PIECE_MOVED_TO_TILE: {
        scope: 'specific',
        unit: '',
        description: 'Selected piece had tile X as a move target Y times.',
        calc: (data: unknown, loopSqrData: SquareData, sqrData: SquareData) => {
            if (!isTileTracker(data)) return 0;
            const { piece } = sqrData;
            const { square } = loopSqrData;
            let val = 0;
            const cell = tileCellAt(data.tiles, square);
            if (piece && cell) {
                const pieceStats = cell[piece.color][piece.name];
                val = pieceStats?.movedTo ?? 0;
            }
            return val;
        },
    },
};
