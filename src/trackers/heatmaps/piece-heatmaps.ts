import type { HeatmapFn } from '#trackers/heatmap-types';
import type { PieceTrackerState } from '#trackers/piece-tracker';
import type { HeatmapPieceRef, StartingPieceName } from '#trackers/piece-types';

function captureCount(
    data: PieceTrackerState,
    takerColor: 'b' | 'w',
    takerName: StartingPieceName,
    takenName: StartingPieceName,
): number {
    return data[takerColor][takerName][takenName];
}

export const PieceHeatmapPresets = {
    /** How often `piece` was captured by each opposing starting piece. */
    PIECE_CAPTURED_BY:
        (piece: HeatmapPieceRef): HeatmapFn<PieceTrackerState> =>
        ({ data, startingPiece }) => {
            if (!startingPiece || startingPiece.color === piece.color) return 0;
            return captureCount(data, startingPiece.color, startingPiece.name, piece.name);
        },

    /** How often `piece` captured each opposing starting piece. */
    PIECE_CAPTURED:
        (piece: HeatmapPieceRef): HeatmapFn<PieceTrackerState> =>
        ({ data, startingPiece }) => {
            if (!startingPiece || startingPiece.color === piece.color) return 0;
            return captureCount(data, piece.color, piece.name, startingPiece.name);
        },
};
