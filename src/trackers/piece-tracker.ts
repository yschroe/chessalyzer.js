import { MoveTracker } from '#trackers/base-tracker';
import HeatmapPresets from '#trackers/heatmaps/piece-heatmaps';
import type { Action } from '#types/actions';
import type { PlayerColor } from '#types/tokens';
import type { Tracker } from '#types/tracker';

type Piece =
    | 'Pa'
    | 'Pb'
    | 'Pc'
    | 'Pd'
    | 'Pe'
    | 'Pf'
    | 'Pg'
    | 'Ph'
    | 'Ra'
    | 'Nb'
    | 'Bc'
    | 'Qd'
    | 'Ke'
    | 'Bf'
    | 'Ng'
    | 'Rh';

type PieceStats = { [piece in Piece]: number };
type PieceStatsMap = { [piece in Piece]: PieceStats };

const pieceList: Piece[] = [
    'Pa',
    'Pb',
    'Pc',
    'Pd',
    'Pe',
    'Pf',
    'Pg',
    'Ph',
    'Ra',
    'Nb',
    'Bc',
    'Qd',
    'Ke',
    'Bf',
    'Ng',
    'Rh',
];

const trackedPieceSet = new Set<string>(pieceList);

export function isTrackedPiece(name: string): name is Piece {
    return trackedPieceSet.has(name);
}

class PieceTracker extends MoveTracker {
    static override trackerId = 'PieceTracker';
    static override workerModule = import.meta.url;

    b: PieceStatsMap;
    w: PieceStatsMap;
    constructor() {
        super();
        this.heatmapPresets = HeatmapPresets;

        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.fromEntries cannot infer PieceStats mapped type
        const emptyPieceStats = Object.fromEntries(pieceList.map((val) => [val, 0])) as PieceStats;

        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.fromEntries cannot infer PieceStatsMap mapped type
        this.b = Object.fromEntries(
            pieceList.map((val) => [val, { ...emptyPieceStats }]),
        ) as PieceStatsMap;
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.fromEntries cannot infer PieceStatsMap mapped type
        this.w = Object.fromEntries(
            pieceList.map((val) => [val, { ...emptyPieceStats }]),
        ) as PieceStatsMap;
    }

    override merge(tracker: Tracker) {
        if (!isPieceTracker(tracker)) return;

        this.time += tracker.time;

        for (const piece of pieceList) {
            for (const piece2 of pieceList) {
                this.w[piece][piece2] += tracker.w[piece][piece2];
                this.b[piece][piece2] += tracker.b[piece][piece2];
            }
        }
    }

    resetWorkerBatch() {
        this.time = 0;

        for (const piece of pieceList) {
            for (const piece2 of pieceList) {
                this.w[piece][piece2] = 0;
                this.b[piece][piece2] = 0;
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

    processCapture(player: PlayerColor, takingPiece: Piece, takenPiece: Piece) {
        this[player][takingPiece][takenPiece] += 1;
    }
}

function isPieceTracker(tracker: Tracker): tracker is PieceTracker {
    return 'b' in tracker && 'w' in tracker;
}

export { PieceTracker };
