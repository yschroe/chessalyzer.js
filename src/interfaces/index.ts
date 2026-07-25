/**
 * Public type surface for chessalyzer.js.
 * Domain-specific definitions live in sibling modules; this file re-exports all of them
 * so existing `from '../interfaces'` imports continue to work unchanged.
 */

export type { MoveAction, CaptureAction, PromoteAction, Action } from './actions';

export type {
    Game,
    Move,
    ChessPiece,
    SquareData,
} from './game';

export type {
    Tracker,
    TrackerConfig,
    HeatmapData,
    HeatmapAnalysisFunc,
} from './tracker';

export type {
    AnalysisConfig,
    MultithreadConfig,
    GameProcessorConfig,
    GameProcessorAnalysisConfig,
    GameProcessorAnalysisConfigFull,
    GameAndMoveCount,
    GameAndMoveCountFull,
} from './analysis';

export type { WorkerInitData, WorkerTaskData, WorkerMessage } from './worker';
