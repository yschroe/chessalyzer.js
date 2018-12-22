import BaseTracker from './BaseTracker';

const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

class PieceTracker extends BaseTracker {
	constructor() {
		super();
		this.b = {};
		this.w = {};

		// first layer
		pawnTemplate.forEach((val) => {
			this.w[val] = {};
			this.b[val] = {};
		});
		pieceTemplate.forEach((val) => {
			this.w[val] = {};
			this.b[val] = {};
		});

		// second layer
		Object.keys(this.w).forEach((key) => {
			pawnTemplate.forEach((val) => {
				this.w[key][val] = 0;
				this.b[key][val] = 0;
			});
			pieceTemplate.forEach((val) => {
				this.w[key][val] = 0;
				this.b[key][val] = 0;
			});
		});
	}

	track(moveData) {
		this.startTimer();
		const { player } = moveData;
		const { piece } = moveData;
		const { takes } = moveData;

		if (takes.piece !== undefined) {
			if (piece.length > 1 && takes.piece.length > 1) {
				this.processTakes(player, piece, takes.piece);
			}
		}
		this.endTimer();
	}

	processTakes(player, takingPiece, takenPiece) {
		this[player][takingPiece][takenPiece] += 1;
	}
}
export default PieceTracker;
