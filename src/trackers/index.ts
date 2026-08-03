// Runtime
export { defineGameTracker, defineMoveTracker } from '#trackers/define-tracker';
export { gameTracker, type GameTrackerState } from '#trackers/game-tracker';
export { pieceTracker, type PieceTrackerState } from '#trackers/piece-tracker';
export { tileTracker, type TileTrackerState } from '#trackers/tile/tile-tracker';
export { generateComparisonHeatmap, generateHeatmap } from '#trackers/heatmap-utils';
export { PieceHeatmapPresets } from '#trackers/heatmaps/piece-heatmaps';
export { TileHeatmapPresets } from '#trackers/heatmaps/tile-heatmaps';
export { isTrackedPiece } from '#trackers/piece-types';

// Types
export type { HeatmapPieceRef, Piece } from '#trackers/piece-types';
export type { SquareData } from '#types/game';
export type {
    GameTrackerDef,
    HeatmapAnalysisArgs,
    HeatmapAnalysisFunc,
    HeatmapData,
    MoveTrackerDef,
    StateOf,
    TrackerDef,
    TrackerFactory,
    TrackerInstance,
} from '#types/tracker';
