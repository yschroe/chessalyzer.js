import BaseTracker from './BaseTracker.js';
import type { MoveData } from '../interfaces/index.js';
import HeatmapPresets from './heatmaps/PieceHeatmaps.js';
import { PlayerColor } from '../types/index.js';

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

	track(moveData: MoveData) {
		const { player, piece, takes } = moveData;

		if (takes) {
			// exlude promoted pawns from tracking
			if (
				piece.length > 1 &&
				takes.piece.length > 1 &&
				!piece.match(/\d/g) &&
				!takes.piece.match(/\d/g)
			) {
				this.processTakes(player, piece as Piece, takes.piece as Piece);
			}
		}
	}

	processTakes(player: PlayerColor, takingPiece: Piece, takenPiece: Piece) {
		this[player][takingPiece][takenPiece] += 1;
	}
}
export default PieceTrackerBase;
