import { defineMoveTracker } from '#trackers/define-tracker';
import { isTrackedPiece, pieceList, type Piece, type PieceStatsMap } from '#trackers/piece-types';

export interface PieceTrackerState {
    b: PieceStatsMap;
    w: PieceStatsMap;
}

function createEmptyPieceStatsMap(): PieceStatsMap {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.fromEntries cannot infer PieceStats mapped type
    const emptyPieceStats = Object.fromEntries(pieceList.map((val) => [val, 0])) as {
        [piece in Piece]: number;
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

/** Built-in move-level tracker: capture matrix — which starting piece took which, per color. */
export const pieceTracker = defineMoveTracker<PieceTrackerState>({
    id: 'PieceTracker',

    init: createInitialState,

    track(state, data) {
        for (const action of data) {
            if (action.type !== 'capture') continue;
            const { takingPiece, takenPiece, player } = action;
            if (!takingPiece || !takenPiece) continue;
            if (isTrackedPiece(takingPiece) && isTrackedPiece(takenPiece)) {
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
