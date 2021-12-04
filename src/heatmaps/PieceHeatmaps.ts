import PieceTrackerBase from '../tracker/PieceTrackerBase';
import { SquareData } from '../interfaces/Interface';

export default {
	PIECE_KILLED_BY: {
		long_name: 'Killed by',
		type: 'Piece',
		scope: 'specific',
		unit: '',
		description: 'Selected piece was taken by piece X Y times.',
		calc: (
			data: PieceTrackerBase,
			sqrData: SquareData,
			loopSqrData: SquareData
		) => {
			const sqrPiece = sqrData.piece;
			const loopPiece = loopSqrData.piece;
			let val = 0;
			if (
				sqrPiece.name !== '' &&
				loopPiece.name !== '' &&
				loopPiece.color !== sqrPiece.color
			) {
				val = data[loopPiece.color][loopPiece.name][sqrPiece.name];
			}
			return val;
		}
	},
	PIECE_KILLED: {
		long_name: 'Killed',
		type: 'Piece',
		scope: 'specific',
		unit: '',
		description: 'Selected piece took piece X Y times.',
		calc: (
			data: PieceTrackerBase,
			sqrData: SquareData,
			loopSqrData: SquareData
		) => {
			const sqrPiece = sqrData.piece;
			const loopPiece = loopSqrData.piece;
			let val = 0;
			if (
				sqrPiece.name !== '' &&
				loopPiece.name !== '' &&
				loopPiece.color !== sqrPiece.color
			) {
				val = data[sqrPiece.color][sqrPiece.name][loopPiece.name];
			}
			return val;
		}
	}
};
