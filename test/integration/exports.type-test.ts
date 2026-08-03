/**
 * Compile-only package export contract — enforced by `bun run typecheck`.
 */
/* oxlint-disable eslint/no-unused-vars -- negative export checks use unused type aliases */

import type { AnalyzeOptions } from 'chessalyzer';
import type { Square } from 'chessalyzer/board';
import type { Action } from 'chessalyzer/replay';
import type { HeatmapData } from 'chessalyzer/trackers';

type ReplayOption = NonNullable<AnalyzeOptions['replay']>;
const replayBoard: ReplayOption = 'board';

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

// @ts-expect-error HeatmapData is not exported from the root entry
type RootHeatmapData = import('chessalyzer').HeatmapData;

// @ts-expect-error ReplayMode is not a public export
type PublicReplayMode = import('chessalyzer').ReplayMode;

// @ts-expect-error board types are not re-exported from replay
type ReplaySquare = import('chessalyzer/replay').Square;

void replayBoard;
void square;
void action;
void heatmap;
