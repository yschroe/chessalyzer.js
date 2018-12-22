const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

class PieceTracker {
	constructor() {
		this.pieces = { b: {}, w: {} };

		// first layer
		pawnTemplate.forEach((val) => {
			this.pieces.w[val] = {};
			this.pieces.b[val] = {};
		});
		pieceTemplate.forEach((val) => {
			this.pieces.w[val] = {};
			this.pieces.b[val] = {};
		});

		// second layer
		Object.keys(this.pieces.w).forEach((key) => {
			pawnTemplate.forEach((val) => {
				this.pieces.w[key][val] = { took: 0 };
				this.pieces.b[key][val] = { took: 0 };
			});
			pieceTemplate.forEach((val) => {
				this.pieces.w[key][val] = { took: 0 };
				this.pieces.b[key][val] = { took: 0 };
			});
		});
	}

	track(moveData) {
		const { player } = moveData;
		const { piece } = moveData;
		const { takes } = moveData;

		if ('piece' in takes) {
			if (piece.length > 1 && takes.piece.length > 1) {
				this.processTakes(player, piece, takes.piece);
			}
		}
	}

	processTakes(player, takingPiece, takenPiece) {
		this.pieces[player][takingPiece][takenPiece].took += 1;
	}
}
export default PieceTracker;
