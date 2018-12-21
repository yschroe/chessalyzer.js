const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

class PieceTracker {
	constructor() {
		this.pieces = { b: {}, w: {} };
		for (let i = 0; i < 8; i += 1) {
			this.pieces.b[pawnTemplate[i]] = {};
			this.pieces.b[pieceTemplate[i]] = {};
			this.pieces.w[pawnTemplate[i]] = {};
			this.pieces.w[pieceTemplate[i]] = {};
			for (let j = 0; j < 8; j += 1) {
				this.pieces.w[pawnTemplate[i]][pawnTemplate[j]] = { took: 0 };
				this.pieces.w[pawnTemplate[i]][pieceTemplate[j]] = { took: 0 };
				this.pieces.w[pieceTemplate[i]][pawnTemplate[j]] = { took: 0 };
				this.pieces.w[pieceTemplate[i]][pieceTemplate[j]] = { took: 0 };
				this.pieces.b[pawnTemplate[i]][pawnTemplate[j]] = { took: 0 };
				this.pieces.b[pawnTemplate[i]][pieceTemplate[j]] = { took: 0 };
				this.pieces.b[pieceTemplate[i]][pawnTemplate[j]] = { took: 0 };
				this.pieces.b[pieceTemplate[i]][pieceTemplate[j]] = { took: 0 };
			}
		}
	}

	track(moveData) {
		const { player } = moveData;
		const { piece } = moveData;
		const { takes } = moveData;

		if ('piece' in takes) {
			if (piece.length > 1 && takes.piece.length > 1) {
				this.pieces[player][piece][takes.piece].took += 1;
			}
		}
	}
}
export default PieceTracker;
