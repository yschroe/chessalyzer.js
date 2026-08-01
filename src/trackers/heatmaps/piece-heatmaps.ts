import type { PieceTrackerState } from '#trackers/piece-tracker';
import { isTrackedPiece } from '#trackers/piece-types';
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
    /** Reference piece was taken by piece X Y times. Requires `square`. */
    PIECE_CAPTURED_BY: ({ data, loopSquare, refSquare }) => {
        const sqrPiece = refSquare.piece;
        const loopPiece = loopSquare.piece;
        if (!sqrPiece || !loopPiece || loopPiece.color === sqrPiece.color) return 0;
        return captureCount(data, loopPiece.color, loopPiece.name, sqrPiece.name);
    },
    /** Reference piece took piece X Y times. Requires `square`. */
    PIECE_CAPTURED: ({ data, loopSquare, refSquare }) => {
        const sqrPiece = refSquare.piece;
        const loopPiece = loopSquare.piece;
        if (!sqrPiece || !loopPiece || loopPiece.color === sqrPiece.color) return 0;
        return captureCount(data, sqrPiece.color, sqrPiece.name, loopPiece.name);
    },
} satisfies Record<string, HeatmapAnalysisFunc<PieceTrackerState>>;
