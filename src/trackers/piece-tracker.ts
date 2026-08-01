import type { BoardCoord } from '#board/board-coords';
import { MoveTracker } from '#trackers/base-tracker';
import {
    generateComparisonHeatmap,
    generateHeatmap,
    resolveHeatmapFunc,
} from '#trackers/heatmap-utils';
import {
    PieceHeatmapPresets,
    type PieceHeatmapPresetName,
} from '#trackers/heatmaps/piece-heatmaps';
import {
    isPieceTrackerData,
    isTrackedPiece,
    pieceList,
    type Piece,
    type PieceStatsMap,
} from '#trackers/piece-types';
import type { Action } from '#types/actions';
import type { PlayerColor } from '#types/tokens';
import type { HeatmapAnalysisFunc, HeatmapData } from '#types/tracker';

class PieceTracker extends MoveTracker {
    static override readonly trackerId = 'PieceTracker';
    static override readonly workerModule = import.meta.url;
    static readonly presets = PieceHeatmapPresets;

    b: PieceStatsMap;
    w: PieceStatsMap;

    constructor() {
        super();

        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.fromEntries cannot infer PieceStats mapped type
        const emptyPieceStats = Object.fromEntries(pieceList.map((val) => [val, 0])) as {
            [piece in Piece]: number;
        };

        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.fromEntries cannot infer PieceStatsMap mapped type
        this.b = Object.fromEntries(
            pieceList.map((val) => [val, { ...emptyPieceStats }]),
        ) as PieceStatsMap;
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.fromEntries cannot infer PieceStatsMap mapped type
        this.w = Object.fromEntries(
            pieceList.map((val) => [val, { ...emptyPieceStats }]),
        ) as PieceStatsMap;
    }

    generateHeatmap(
        analysisFunc: PieceHeatmapPresetName | HeatmapAnalysisFunc<this>,
        square?: string | BoardCoord,
        optData?: unknown,
    ): HeatmapData {
        return generateHeatmap(
            this,
            resolveHeatmapFunc(PieceHeatmapPresets, analysisFunc),
            square,
            optData,
        );
    }

    generateComparisonHeatmap(
        compData: this,
        analysisFunc: PieceHeatmapPresetName | HeatmapAnalysisFunc<this>,
        square?: string | BoardCoord,
        optData?: unknown,
    ): HeatmapData {
        return generateComparisonHeatmap(
            this,
            compData,
            resolveHeatmapFunc(PieceHeatmapPresets, analysisFunc),
            square,
            optData,
        );
    }

    override merge(tracker: unknown) {
        if (!isPieceTrackerData(tracker)) return;

        for (const piece of pieceList) {
            for (const piece2 of pieceList) {
                this.w[piece][piece2] += tracker.w[piece][piece2];
                this.b[piece][piece2] += tracker.b[piece][piece2];
            }
        }
    }

    override trackMoves(data: Action[]) {
        for (const action of data) {
            if (action.type === 'capture') {
                const { takingPiece, takenPiece, player } = action;
                if (!takingPiece || !takenPiece) continue;
                if (
                    takingPiece.length > 1 &&
                    takenPiece.length > 1 &&
                    !takingPiece.match(/\d/g) &&
                    !takenPiece.match(/\d/g) &&
                    isTrackedPiece(takingPiece) &&
                    isTrackedPiece(takenPiece)
                ) {
                    this.processCapture(player, takingPiece, takenPiece);
                }
            }
        }
    }

    private processCapture(player: PlayerColor, takingPiece: Piece, takenPiece: Piece) {
        this[player][takingPiece][takenPiece] += 1;
    }
}

export { PieceTracker };
