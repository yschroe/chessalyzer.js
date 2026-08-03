// Runtime
export { defineGameTracker, defineMoveTracker } from '#trackers/define-tracker';
export { gameTracker, type GameTrackerState } from '#trackers/game-tracker';
export { pieceTracker, type PieceTrackerState } from '#trackers/piece-tracker';
export { tileTracker, type TileTrackerState } from '#trackers/tile/tile-tracker';
export type { ColorBucket, TileCell, TileGrid, TileStats } from '#trackers/tile/tile-tracker-types';
export type { PieceStatsMap } from '#trackers/piece-types';
export { generateComparisonHeatmap, generateHeatmap } from '#trackers/heatmap-utils';
export { PieceHeatmapPresets } from '#trackers/heatmaps/piece-heatmaps';
export { TileHeatmapPresets } from '#trackers/heatmaps/tile-heatmaps';
export { isPromotedPieceName, isTrackedPiece } from '#trackers/piece-types';

// Types — built-in state shapes, heatmap authors, piece refs for scoped presets
export type {
    BoardPieceName,
    HeatmapPieceRef,
    Piece,
    PromotedPieceName,
} from '#trackers/piece-types';
export type { HeatmapAnalysisFunc, HeatmapData } from '#types/tracker';
