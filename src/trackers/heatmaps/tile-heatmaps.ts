import type { Square } from '#board/board-coords';
import { isTrackedPiece, type HeatmapPieceRef } from '#trackers/piece-types';
import { tileCellAt } from '#trackers/tile/tile-grid';
import type { TileTrackerState } from '#trackers/tile/tile-tracker';
import type { HeatmapAnalysisFunc } from '#types/tracker';

export const TileHeatmapPresets = {
    /** Tile had a piece on it for X% of all moves. */
    TILE_OCC_ALL: (({ data, loopSquare }) => {
        const cell = tileCellAt(data.tiles, loopSquare.square);
        if (!cell) return 0;
        return ((cell.w.total.wasOn + cell.b.total.wasOn) * 100) / data.movesTotal;
    }) satisfies HeatmapAnalysisFunc<TileTrackerState>,

    /** Tile had a white piece on it for X% of all moves. */
    TILE_OCC_WHITE: (({ data, loopSquare }) => {
        const cell = tileCellAt(data.tiles, loopSquare.square);
        if (!cell) return 0;
        return (cell.w.total.wasOn * 100) / data.movesTotal;
    }) satisfies HeatmapAnalysisFunc<TileTrackerState>,

    /** Tile had a black piece on it for X% of all moves. */
    TILE_OCC_BLACK: (({ data, loopSquare }) => {
        const cell = tileCellAt(data.tiles, loopSquare.square);
        if (!cell) return 0;
        return (cell.b.total.wasOn * 100) / data.movesTotal;
    }) satisfies HeatmapAnalysisFunc<TileTrackerState>,

    /** Count of pieces that were taken on each tile. */
    TILE_CAPTURE_COUNT: (({ data, loopSquare }) => {
        const cell = tileCellAt(data.tiles, loopSquare.square);
        if (!cell) return 0;
        return cell.b.total.wasCapturedOn + cell.w.total.wasCapturedOn;
    }) satisfies HeatmapAnalysisFunc<TileTrackerState>,

    /**
     * How often each starting piece occupied `square` (% of all moves).
     * Heatmap cells correspond to starting pieces (via `loopSquare.piece`).
     */
    TILE_OCC_BY_PIECE:
        (square: Square): HeatmapAnalysisFunc<TileTrackerState> =>
        ({ data, loopSquare }) => {
            const { piece } = loopSquare;

            let val = 0;
            const cell = tileCellAt(data.tiles, square);
            if (piece && cell && isTrackedPiece(piece.name)) {
                val = cell[piece.color].byPiece[piece.name].wasOn;
            }
            return (val * 100) / data.movesTotal;
        },

    /** Where `piece` moved to (move-target counts per tile). */
    PIECE_MOVED_TO_TILE:
        (piece: HeatmapPieceRef): HeatmapAnalysisFunc<TileTrackerState> =>
        ({ data, loopSquare }) => {
            const cell = tileCellAt(data.tiles, loopSquare.square);
            if (!cell || !isTrackedPiece(piece.name)) return 0;
            return cell[piece.color].byPiece[piece.name].movedTo;
        },
};
