import BaseTracker from '#tracker/base-tracker';
import HeatmapPresets from '#tracker/heatmaps/piece-heatmaps';
import type { Action } from '#types/actions';
import type { Game } from '#types/game';
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

class PieceTrackerBase extends BaseTracker {
    b: PieceStatsMap;
    w: PieceStatsMap;
    constructor() {
        super('move');
        this.heatmapPresets = HeatmapPresets;

        const emptyPieceStats = Object.fromEntries(pieceList.map((val) => [val, 0])) as PieceStats;

        this.b = Object.fromEntries(
            pieceList.map((val) => [val, { ...emptyPieceStats }]),
        ) as PieceStatsMap;
        this.w = Object.fromEntries(
            pieceList.map((val) => [val, { ...emptyPieceStats }]),
        ) as PieceStatsMap;
    }

    override add(tracker: Tracker) {
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

    override track(data: Game | Action[]) {
        if (!Array.isArray(data)) return;
        for (const action of data) {
            if (action.type === 'capture') {
                const { takingPiece, takenPiece, player } = action;
                if (!takingPiece || !takenPiece) continue;
                // exlude promoted pawns from tracking
                if (
                    takingPiece.length > 1 &&
                    takenPiece.length > 1 &&
                    !takingPiece.match(/\d/g) &&
                    !takenPiece.match(/\d/g)
                ) {
                    this.processCapture(player, takingPiece as Piece, takenPiece as Piece);
                }
            }
        }
    }

    processCapture(player: PlayerColor, takingPiece: Piece, takenPiece: Piece) {
        this[player][takingPiece][takenPiece] += 1;
    }
}

function isPieceTracker(tracker: Tracker): tracker is PieceTrackerBase {
    return 'b' in tracker && 'w' in tracker;
}

export default PieceTrackerBase;
