import { defineMoveTracker } from '#trackers/define-tracker';
import {
    isStartingPieceName,
    pieceList,
    type StartingPieceName,
    type PieceStatsMap,
} from '#trackers/piece-types';

/** Accumulated state from {@link pieceTracker} after `analyzePGN` completes. */
export interface PieceTrackerState {
    /** Capture matrix for black starting pieces. */
    b: PieceStatsMap;
    /** Capture matrix for white starting pieces. */
    w: PieceStatsMap;
}

function createEmptyPieceStatsMap(): PieceStatsMap {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.fromEntries cannot infer PieceStats mapped type
    const emptyPieceStats = Object.fromEntries(pieceList.map((val) => [val, 0])) as {
        [piece in StartingPieceName]: number;
    };

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.fromEntries cannot infer PieceStatsMap mapped type
    return Object.fromEntries(
        pieceList.map((val) => [val, { ...emptyPieceStats }]),
    ) as PieceStatsMap;
}

function createInitialState(): PieceTrackerState {
    return {
        b: createEmptyPieceStatsMap(),
        w: createEmptyPieceStatsMap(),
    };
}

/** Built-in move tracker: which starting piece captured which, per color. */
const pieceTrackerFactory = defineMoveTracker<PieceTrackerState>({
    id: 'PieceTracker',

    init: createInitialState,

    track(state, data) {
        for (const action of data) {
            if (action.type !== 'capture') continue;
            const { takingPiece, takenPiece, player } = action;
            if (isStartingPieceName(takingPiece) && isStartingPieceName(takenPiece)) {
                state[player][takingPiece][takenPiece] += 1;
            }
        }
    },

    merge(state, other) {
        for (const piece of pieceList) {
            for (const piece2 of pieceList) {
                state.w[piece][piece2] += other.w[piece][piece2];
                state.b[piece][piece2] += other.b[piece][piece2];
            }
        }
    },
});

/** Built-in piece tracker factory — pass `pieceTracker()` to {@link analyzePGN}. */
export const pieceTracker = pieceTrackerFactory;
