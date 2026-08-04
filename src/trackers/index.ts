// Runtime
export { defineGameTracker, defineMoveTracker } from '#trackers/define-tracker';
export { gameTracker } from '#trackers/game-tracker';
export { pieceTracker } from '#trackers/piece-tracker';
export { tileTracker } from '#trackers/tile/tile-tracker';
export { tileAt } from '#trackers/tile/tile-grid';

export { generateComparisonHeatmap, generateHeatmap } from '#trackers/heatmap-utils';
export { heatmapToString, printHeatmap } from '#trackers/print-heatmap';
export { PieceHeatmapPresets } from '#trackers/heatmaps/piece-heatmaps';
export { TileHeatmapPresets } from '#trackers/heatmaps/tile-heatmaps';
export { isPromotedPieceName, isStartingPieceName } from '#trackers/piece-types';

// Types — built-in state shapes, heatmap authors, piece refs for scoped presets
export type {
    HeatmapPieceRef,
    PieceName,
    PromotedPieceName,
    StartingPieceName,
} from '#trackers/piece-types';
export type { GameTrackerState } from '#trackers/game-tracker';
export type { PieceTrackerState } from '#trackers/piece-tracker';
export type { TileTrackerState } from '#trackers/tile/tile-tracker';
export type { HeatmapData, HeatmapFn } from '#trackers/heatmap-types';
export type { Action, CaptureAction, MoveAction, PromoteAction } from '#types/actions';
export type { TrackerInstance } from '#types/tracker';
export type {
    TileCell,
    TileColorStats,
    TileGrid,
    TileStats,
} from '#trackers/tile/tile-tracker-types';
export type { PieceStatsMap } from '#trackers/piece-types';
