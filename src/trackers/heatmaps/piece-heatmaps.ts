import type { HeatmapFn } from '#trackers/heatmap-types';
import type { PieceTrackerState } from '#trackers/piece-tracker';
import { isStartingPieceName, type HeatmapPieceRef } from '#trackers/piece-types';

function captureCount(
    data: PieceTrackerState,
    takerColor: 'b' | 'w',
    takerName: string,
    takenName: string,
): number {
    if (!isStartingPieceName(takerName) || !isStartingPieceName(takenName)) return 0;
    return data[takerColor][takerName][takenName];
}

export const PieceHeatmapPresets = {
    /** How often `piece` was captured by each opposing starting piece. */
    PIECE_CAPTURED_BY:
        (piece: HeatmapPieceRef): HeatmapFn<PieceTrackerState> =>
        ({ data, square }) => {
            const squarePiece = square.piece;
            if (!squarePiece || squarePiece.color === piece.color) return 0;
            return captureCount(data, squarePiece.color, squarePiece.name, piece.name);
        },

    /** How often `piece` captured each opposing starting piece. */
    PIECE_CAPTURED:
        (piece: HeatmapPieceRef): HeatmapFn<PieceTrackerState> =>
        ({ data, square }) => {
            const squarePiece = square.piece;
            if (!squarePiece || squarePiece.color === piece.color) return 0;
            return captureCount(data, piece.color, piece.name, squarePiece.name);
        },
};
