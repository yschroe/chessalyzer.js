import { isTrackedPiece, type PieceTracker } from '#trackers/piece-tracker';
import type { SquareData } from '#types/game';

function isPieceTracker(data: unknown): data is PieceTracker {
    return typeof data === 'object' && data !== null && 'b' in data && 'w' in data;
}

function captureCount(
    data: PieceTracker,
    takerColor: 'b' | 'w',
    takerName: string,
    takenName: string,
): number {
    if (!isTrackedPiece(takerName) || !isTrackedPiece(takenName)) return 0;
    return data[takerColor][takerName][takenName];
}

export default {
    PIECE_CAPTURED_BY: {
        scope: 'specific',
        unit: '',
        description: 'Selected piece was taken by piece X Y times.',
        calc: (data: unknown, loopSqrData: SquareData, sqrData?: SquareData) => {
            if (!isPieceTracker(data) || !sqrData) return 0;
            const sqrPiece = sqrData.piece;
            const loopPiece = loopSqrData.piece;
            if (!sqrPiece || !loopPiece || loopPiece.color === sqrPiece.color) return 0;
            return captureCount(data, loopPiece.color, loopPiece.name, sqrPiece.name);
        },
    },
    PIECE_CAPTURED: {
        scope: 'specific',
        unit: '',
        description: 'Selected piece took piece X Y times.',
        calc: (data: unknown, loopSqrData: SquareData, sqrData?: SquareData) => {
            if (!isPieceTracker(data) || !sqrData) return 0;
            const sqrPiece = sqrData.piece;
            const loopPiece = loopSqrData.piece;
            if (!sqrPiece || !loopPiece || loopPiece.color === sqrPiece.color) return 0;
            return captureCount(data, sqrPiece.color, sqrPiece.name, loopPiece.name);
        },
    },
};
