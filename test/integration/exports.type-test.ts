/**
 * Compile-only package export contract — enforced by `bun run typecheck`.
 */
/* oxlint-disable eslint/no-unused-vars -- negative export checks use unused type aliases */

import type {
    AnalyzeOptions,
    AnalyzeRun,
    AnalyzeRunResult,
    GameFilter,
    ReplayMode,
    WorkerOptions,
} from 'chessalyzer';
import type { Square } from 'chessalyzer/board';
import type { Action } from 'chessalyzer/replay';
import type {
    HeatmapData,
    HeatmapFn,
    HeatmapPieceRef,
    TrackerInstance,
} from 'chessalyzer/trackers';

type ReplayOption = NonNullable<AnalyzeOptions['replay']>;
const replayBoard: ReplayOption = 'board';
const replayMode: ReplayMode = 'actions';

const square: Square = 'e4';
const action: Action = {
    type: 'move',
    san: 'e4',
    player: 'w',
    piece: 'Pe',
    from: 'e2',
    to: 'e4',
};
const heatmap: HeatmapData = { map: [[0]], min: 0, max: 0 };
const heatmapFn: HeatmapFn = (args) => args.square.length + (args.startingPiece ? 1 : 0);
const heatmapPiece: HeatmapPieceRef = { color: 'w', name: 'Qd' };
const runResult: AnalyzeRunResult = { gameCount: 0, moveCount: 0 };
const workerOpts: WorkerOptions = { count: 4 };
const run: AnalyzeRun = { trackers: [] };
const filter: GameFilter = () => true;
const instance: TrackerInstance = { def: {} as never, state: {} };

// @ts-expect-error HeatmapData is not exported from the root entry
type RootHeatmapData = import('chessalyzer').HeatmapData;

// @ts-expect-error board types are not re-exported from replay
type ReplaySquare = import('chessalyzer/replay').Square;

// @ts-expect-error HeatmapSquare was flattened into the HeatmapFn argument object
type RemovedHeatmapSquare = import('chessalyzer/trackers').HeatmapSquare;

void replayBoard;
void replayMode;
void square;
void action;
void heatmap;
void heatmapFn;
void heatmapPiece;
void runResult;
void workerOpts;
void run;
void filter;
void instance;
