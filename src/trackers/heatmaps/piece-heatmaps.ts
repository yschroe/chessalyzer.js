import type { PieceTrackerState } from '#trackers/piece-tracker';
import { isTrackedPiece, type HeatmapPieceRef } from '#trackers/piece-types';
import type { HeatmapAnalysisFunc } from '#types/tracker';

function captureCount(
    data: PieceTrackerState,
    takerColor: 'b' | 'w',
    takerName: string,
    takenName: string,
): number {
    if (!isTrackedPiece(takerName) || !isTrackedPiece(takenName)) return 0;
    return data[takerColor][takerName][takenName];
}

export const PieceHeatmapPresets = {
    /** How often `piece` was captured by each opposing starting piece. */
    PIECE_CAPTURED_BY:
        (piece: HeatmapPieceRef): HeatmapAnalysisFunc<PieceTrackerState> =>
        ({ data, loopSquare }) => {
            const loopPiece = loopSquare.piece;
            if (!loopPiece || loopPiece.color === piece.color) return 0;
            return captureCount(data, loopPiece.color, loopPiece.name, piece.name);
        },

    /** How often `piece` captured each opposing starting piece. */
    PIECE_CAPTURED:
        (piece: HeatmapPieceRef): HeatmapAnalysisFunc<PieceTrackerState> =>
        ({ data, loopSquare }) => {
            const loopPiece = loopSquare.piece;
            if (!loopPiece || loopPiece.color === piece.color) return 0;
            return captureCount(data, piece.color, piece.name, loopPiece.name);
        },
};
