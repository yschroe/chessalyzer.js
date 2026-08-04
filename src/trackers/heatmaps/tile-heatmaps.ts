import type { Square } from '#board/board-coords';
import type { HeatmapFn } from '#trackers/heatmap-types';
import type { HeatmapPieceRef } from '#trackers/piece-types';
import { tileAt } from '#trackers/tile/tile-grid';
import type { TileTrackerState } from '#trackers/tile/tile-tracker';

export const TileHeatmapPresets = {
    /** Tile had a piece on it for X% of all moves. */
    TILE_OCC_ALL: (({ data, square }) => {
        const cell = tileAt(data.tiles, square);
        if (!cell) return 0;
        return ((cell.w.total.occupiedFor + cell.b.total.occupiedFor) * 100) / data.movesTotal;
    }) satisfies HeatmapFn<TileTrackerState>,

    /** Tile had a white piece on it for X% of all moves. */
    TILE_OCC_WHITE: (({ data, square }) => {
        const cell = tileAt(data.tiles, square);
        if (!cell) return 0;
        return (cell.w.total.occupiedFor * 100) / data.movesTotal;
    }) satisfies HeatmapFn<TileTrackerState>,

    /** Tile had a black piece on it for X% of all moves. */
    TILE_OCC_BLACK: (({ data, square }) => {
        const cell = tileAt(data.tiles, square);
        if (!cell) return 0;
        return (cell.b.total.occupiedFor * 100) / data.movesTotal;
    }) satisfies HeatmapFn<TileTrackerState>,

    /** Count of pieces that were taken on each tile. */
    TILE_CAPTURE_COUNT: (({ data, square }) => {
        const cell = tileAt(data.tiles, square);
        if (!cell) return 0;
        return cell.b.total.losses + cell.w.total.losses;
    }) satisfies HeatmapFn<TileTrackerState>,

    /**
     * How often each starting piece occupied `square` (% of all moves).
     * Heatmap cells correspond to starting pieces (via `startingPiece`).
     */
    TILE_OCC_BY_PIECE:
        (target: Square): HeatmapFn<TileTrackerState> =>
        ({ data, startingPiece }) => {
            let val = 0;
            const cell = tileAt(data.tiles, target);
            if (startingPiece && cell) {
                val = cell[startingPiece.color].byPiece[startingPiece.name].occupiedFor;
            }
            return (val * 100) / data.movesTotal;
        },

    /** Where `piece` moved to (move-target counts per tile). */
    PIECE_MOVED_TO_TILE:
        (piece: HeatmapPieceRef): HeatmapFn<TileTrackerState> =>
        ({ data, square }) => {
            const cell = tileAt(data.tiles, square);
            if (!cell) return 0;
            return cell[piece.color].byPiece[piece.name].movedTo;
        },
};
