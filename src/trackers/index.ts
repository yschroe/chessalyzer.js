// Runtime
export {
    BaseGameTracker,
    BaseMoveTracker,
    defineGameTracker,
    defineMoveTracker,
} from '#trackers/define-tracker';
export { GameTracker, type GameTrackerState } from '#trackers/game-tracker';
export { PieceTracker, type PieceTrackerState } from '#trackers/piece-tracker';
export { TileTracker, type TileTrackerState } from '#trackers/tile/tile-tracker';

export {
    PieceHeatmapPresets,
    type PieceHeatmapPresetName,
} from '#trackers/heatmaps/piece-heatmaps';
export { TileHeatmapPresets, type TileHeatmapPresetName } from '#trackers/heatmaps/tile-heatmaps';

export type { Piece } from '#trackers/piece-types';
export { isTrackedPiece } from '#trackers/piece-types';

// Types
export type { MoveCoords, SquareData } from '#types/game';
export type {
    AnalyzeTrackerResult,
    GameTrackerDef,
    GenerateHeatmapOptions,
    HeatmapAnalysisArgs,
    HeatmapAnalysisFunc,
    HeatmapData,
    HeatmapPresetEntry,
    MoveTrackerDef,
    StateOf,
    TrackerDef,
    TrackerSnapshot,
} from '#types/tracker';
