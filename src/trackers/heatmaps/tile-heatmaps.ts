import { isTrackedPiece } from '#trackers/piece-types';
import { tileCellAt } from '#trackers/tile/tile-grid';
import type { TileTrackerState } from '#trackers/tile/tile-tracker';
import type { HeatmapAnalysisFunc } from '#types/tracker';

export const TileHeatmapPresets = {
    /** Tile had a piece on it for X% of all moves. */
    TILE_OCC_ALL: ({ data, loopSquare }) => {
        const cell = tileCellAt(data.tiles, loopSquare.square);
        if (!cell) return 0;
        return ((cell.w.total.wasOn + cell.b.total.wasOn) * 100) / data.movesTotal;
    },
    /** Tile had a white piece on it for X% of all moves. */
    TILE_OCC_WHITE: ({ data, loopSquare }) => {
        const cell = tileCellAt(data.tiles, loopSquare.square);
        if (!cell) return 0;
        return (cell.w.total.wasOn * 100) / data.movesTotal;
    },
    /** Tile had a black piece on it for X% of all moves. */
    TILE_OCC_BLACK: ({ data, loopSquare }) => {
        const cell = tileCellAt(data.tiles, loopSquare.square);
        if (!cell) return 0;
        return (cell.b.total.wasOn * 100) / data.movesTotal;
    },
    /** Reference square was occupied by piece X during Y% of all moves. Requires `square`. */
    TILE_OCC_BY_PIECE: ({ data, loopSquare, refSquare }) => {
        const { piece } = loopSquare;

        let val = 0;
        const cell = tileCellAt(data.tiles, refSquare.square);
        if (piece && cell && isTrackedPiece(piece.name)) {
            val = cell[piece.color].byPiece[piece.name].wasOn;
        }
        return (val * 100) / data.movesTotal;
    },
    /** Count of pieces that were taken on each tile. */
    TILE_CAPTURE_COUNT: ({ data, loopSquare }) => {
        const cell = tileCellAt(data.tiles, loopSquare.square);
        if (!cell) return 0;
        return cell.b.total.wasCapturedOn + cell.w.total.wasCapturedOn;
    },
    /** Reference piece had tile X as a move target Y times. Requires `square`. */
    PIECE_MOVED_TO_TILE: ({ data, loopSquare, refSquare }) => {
        const { piece } = refSquare;
        const cell = tileCellAt(data.tiles, loopSquare.square);
        if (!piece || !cell || !isTrackedPiece(piece.name)) return 0;
        return cell[piece.color].byPiece[piece.name].movedTo;
    },
} satisfies Record<string, HeatmapAnalysisFunc<TileTrackerState>>;

export type TileHeatmapPresetName = keyof typeof TileHeatmapPresets;
