import { BaseMoveTracker } from '#trackers/define-tracker';
import {
    generateComparisonHeatmap,
    generateHeatmap,
    resolveHeatmapFunc,
} from '#trackers/heatmap-utils';
import { PieceHeatmapPresets } from '#trackers/heatmaps/piece-heatmaps';
import { isTrackedPiece, pieceList, type Piece, type PieceStatsMap } from '#trackers/piece-types';
import type { Action } from '#types/actions';
import type { PlayerColor } from '#types/tokens';
import type { GenerateHeatmapOptions, HeatmapData } from '#types/tracker';

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

class PieceTracker extends BaseMoveTracker<PieceTrackerState> {
    override readonly id = 'PieceTracker';
    override readonly workerModule = import.meta.url;
    static readonly presets = PieceHeatmapPresets;

    init(): PieceTrackerState {
        return createInitialState();
    }

    generateHeatmap(
        state: PieceTrackerState,
        options: GenerateHeatmapOptions<PieceTrackerState>,
    ): HeatmapData {
        return generateHeatmap(
            state,
            resolveHeatmapFunc(PieceHeatmapPresets, options.analysis),
            options.square,
            options.optData,
        );
    }

    generateComparisonHeatmap(
        state: PieceTrackerState,
        compState: PieceTrackerState,
        options: GenerateHeatmapOptions<PieceTrackerState>,
    ): HeatmapData {
        return generateComparisonHeatmap(
            state,
            compState,
            resolveHeatmapFunc(PieceHeatmapPresets, options.analysis),
            options.square,
            options.optData,
        );
    }

    merge(state: PieceTrackerState, other: PieceTrackerState): void {
        for (const piece of pieceList) {
            for (const piece2 of pieceList) {
                state.w[piece][piece2] += other.w[piece][piece2];
                state.b[piece][piece2] += other.b[piece][piece2];
            }
        }
    }

    track(state: PieceTrackerState, data: Action[]): void {
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
                    this.processCapture(state, player, takingPiece, takenPiece);
                }
            }
        }
    }

    private processCapture(
        state: PieceTrackerState,
        player: PlayerColor,
        takingPiece: Piece,
        takenPiece: Piece,
    ): void {
        state[player][takingPiece][takenPiece] += 1;
    }
}

export { PieceTracker };
