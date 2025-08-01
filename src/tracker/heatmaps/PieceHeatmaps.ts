import PieceTrackerBase from '../PieceTrackerBase';
import type { SquareData } from '../../interfaces/index';

export default {
	PIECE_CAPTURED_BY: {
		scope: 'specific',
		unit: '',
		description: 'Selected piece was taken by piece X Y times.',
		calc: (
			data: PieceTrackerBase,
			loopSqrData: SquareData,
			sqrData: SquareData
		) => {
			const sqrPiece = sqrData.piece;
			const loopPiece = loopSqrData.piece;
			let val = 0;
			if (sqrPiece && loopPiece && loopPiece.color !== sqrPiece.color) {
				val = data[loopPiece.color][loopPiece.name][sqrPiece.name];
			}
			return val;
		}
	},
	PIECE_CAPTURED: {
		scope: 'specific',
		unit: '',
		description: 'Selected piece took piece X Y times.',
		calc: (
			data: PieceTrackerBase,
			loopSqrData: SquareData,
			sqrData: SquareData
		) => {
			const sqrPiece = sqrData.piece;
			const loopPiece = loopSqrData.piece;
			let val = 0;
			if (sqrPiece && loopPiece && loopPiece.color !== sqrPiece.color) {
				val = data[sqrPiece.color][sqrPiece.name][loopPiece.name];
			}
			return val;
		}
	}
};
