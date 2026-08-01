import { isPieceTrackerData, isTrackedPiece } from '#trackers/piece-types';
import type { PieceStatsMap } from '#trackers/piece-types';
import type { HeatmapPresetEntry } from '#types/tracker';

function captureCount(
    data: { b: PieceStatsMap; w: PieceStatsMap },
    takerColor: 'b' | 'w',
    takerName: string,
    takenName: string,
): number {
    if (!isTrackedPiece(takerName) || !isTrackedPiece(takenName)) return 0;
    return data[takerColor][takerName][takenName];
}

export const PieceHeatmapPresets = {
    PIECE_CAPTURED_BY: {
        scope: 'specific',
        unit: '',
        description: 'Selected piece was taken by piece X Y times.',
        calc: ({ data, loopSquare, refSquare }) => {
            if (!isPieceTrackerData(data)) return 0;
            const sqrPiece = refSquare.piece;
            const loopPiece = loopSquare.piece;
            if (!sqrPiece || !loopPiece || loopPiece.color === sqrPiece.color) return 0;
            return captureCount(data, loopPiece.color, loopPiece.name, sqrPiece.name);
        },
    },
    PIECE_CAPTURED: {
        scope: 'specific',
        unit: '',
        description: 'Selected piece took piece X Y times.',
        calc: ({ data, loopSquare, refSquare }) => {
            if (!isPieceTrackerData(data)) return 0;
            const sqrPiece = refSquare.piece;
            const loopPiece = loopSquare.piece;
            if (!sqrPiece || !loopPiece || loopPiece.color === sqrPiece.color) return 0;
            return captureCount(data, sqrPiece.color, sqrPiece.name, loopPiece.name);
        },
    },
} as const satisfies Record<string, HeatmapPresetEntry>;

export type PieceHeatmapPresetName = keyof typeof PieceHeatmapPresets;
