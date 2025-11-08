import BaseTracker from './base-tracker';
import type { Action } from '../interfaces';
import HeatmapPresets from './heatmaps/piece-heatmaps';
import { PlayerColor } from '../types';

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
	'Rh'
];

class PieceTrackerBase extends BaseTracker {
	b: PieceStatsMap;
	w: PieceStatsMap;
	constructor() {
		super('move');
		this.heatmapPresets = HeatmapPresets;

		const emptyPieceStats = Object.fromEntries(
			pieceList.map((val) => [val, 0])
		) as PieceStats;

		this.b = Object.fromEntries(
			pieceList.map((val) => [val, { ...emptyPieceStats }])
		) as PieceStatsMap;
		this.w = Object.fromEntries(
			pieceList.map((val) => [val, { ...emptyPieceStats }])
		) as PieceStatsMap;
	}

	add(tracker: PieceTrackerBase) {
		this.time += tracker.time;

		for (const piece of pieceList) {
			for (const piece2 of pieceList) {
				this.w[piece][piece2] += tracker.w[piece][piece2];
				this.b[piece][piece2] += tracker.b[piece][piece2];
			}
		}
	}

	track(actions: Action[]) {
		for (const action of actions) {
			if (action.type === 'capture') {
				const { takingPiece, takenPiece, player } = action;
				// exlude promoted pawns from tracking
				if (
					takingPiece.length > 1 &&
					takenPiece.length > 1 &&
					!takingPiece.match(/\d/g) &&
					!takenPiece.match(/\d/g)
				) {
					this.processCapture(
						player,
						takingPiece as Piece,
						takenPiece as Piece
					);
				}
			}
		}
	}

	processCapture(player: PlayerColor, takingPiece: Piece, takenPiece: Piece) {
		this[player][takingPiece][takenPiece] += 1;
	}
}
export default PieceTrackerBase;
