// Runtime
export { defineGameTracker, defineMoveTracker } from '#trackers/define-tracker';
export { GameTracker, type GameTrackerState } from '#trackers/game-tracker';
export { PieceTracker, type PieceTrackerState } from '#trackers/piece-tracker';
export { TileTracker, type TileTrackerState } from '#trackers/tile/tile-tracker';
export { generateComparisonHeatmap, generateHeatmap } from '#trackers/heatmap-utils';
export { PieceHeatmapPresets } from '#trackers/heatmaps/piece-heatmaps';
export { TileHeatmapPresets } from '#trackers/heatmaps/tile-heatmaps';
export { isTrackedPiece } from '#trackers/piece-types';

// Types
export type { Piece } from '#trackers/piece-types';
export type { SquareData } from '#types/game';
export type {
    AnalyzeTrackerResult,
    GameTrackerDef,
    GenerateHeatmapOptions,
    HeatmapAnalysisArgs,
    HeatmapAnalysisFunc,
    HeatmapData,
    MoveTrackerDef,
    StateOf,
    TrackerDef,
} from '#types/tracker';
