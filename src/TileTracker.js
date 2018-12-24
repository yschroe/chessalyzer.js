import BaseTracker from './BaseTracker';

const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

class TileStats {
	constructor() {
		this.movedTo = 0;
		this.wasOn = 0;
		this.killedOn = 0;
		this.wasKilledOn = 0;
	}
}

class TileTracker extends BaseTracker {
	constructor() {
		super('move');
		this.cntMoves = 0;
		this.tiles = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = { b: {}, w: {} };

				currRow[col].currentPiece = {
					color: '',
					piece: '',
					movedOn: 0
				};

				currRow[col].b = new TileStats();
				currRow[col].w = new TileStats();
				pawnTemplate.forEach((val) => {
					currRow[col].b[val] = new TileStats();
					currRow[col].w[val] = new TileStats();
				});
				pieceTemplate.forEach((val) => {
					currRow[col].b[val] = new TileStats();
					currRow[col].w[val] = new TileStats();
				});
			}
			this.tiles[row] = currRow;
		}

		for (let row = 0; row < 8; row += 1) {
			for (let col = 0; col < 8; col += 1) {
				this.resetCurrentPiece(row, col);
			}
		}
	}

	resetCurrentPiece(row, col) {
		const piece = { color: '', piece: '', movedOn: 0 };
		if (row === 0) {
			piece.color = 'b';
			piece.piece = pieceTemplate[col];
		} else if (row === 1) {
			piece.color = 'b';
			piece.piece = pawnTemplate[col];
		} else if (row === 6) {
			piece.color = 'w';
			piece.piece = pawnTemplate[col];
		} else if (row === 7) {
			piece.color = 'w';
			piece.piece = pieceTemplate[col];
		}
		this.tiles[row][col].currentPiece = piece;
	}

	track(moveData) {
		this.startTimer();

		const { to } = moveData;
		const { from } = moveData;
		const { player } = moveData;
		const { piece } = moveData;
		const { takes } = moveData;
		const { castles } = moveData;

		this.cntMoves += 1;

		// move
		if (to[0] !== -1) {
			this.processMove(from, to, player, piece);

			if (takes.piece !== undefined) {
				this.processTakes(takes.pos, player, piece, takes.piece);
			}

			// castle
		} else if (castles !== '') {
			const row = player === 'w' ? 7 : 0;
			let rook = 'Rh';
			let tarKingCol = 6;
			let tarRookCol = 5;
			let srcRookCol = 7;
			if (castles === 'O-O-O') {
				tarKingCol = 2;
				tarRookCol = 3;
				srcRookCol = 0;
				rook = 'Ra';
			}
			this.processMove([row, 4], [row, tarKingCol], player, 'Ke');
			this.processMove(
				[row, srcRookCol],
				[row, tarRookCol],
				player,
				rook
			);

			// game end
		} else {
			for (let row = 0; row < 8; row += 1) {
				for (let col = 0; col < 8; col += 1) {
					const { currentPiece } = this.tiles[row][col];
					if (currentPiece.piece !== '') {
						this.tiles[row][col][currentPiece.color][
							currentPiece.piece
						].wasOn += this.cntMoves - currentPiece.movedOn - 1;
					}
					this.resetCurrentPiece(row, col);
				}
			}
			this.cntMoves = 0;
		}
		this.endTimer();
	}

	processMove(from, to, player, piece) {
		if (piece.length > 1) {
			const { movedOn } = this.tiles[from[0]][from[1]].currentPiece;
			this.tiles[from[0]][from[1]][player].wasOn +=
				this.cntMoves - movedOn - 1;
			this.tiles[from[0]][from[1]][player][piece].wasOn +=
				this.cntMoves - movedOn - 1;
			this.tiles[from[0]][from[1]].currentPiece.color = '';
			this.tiles[from[0]][from[1]].currentPiece.piece = '';
			this.tiles[from[0]][from[1]].currentPiece.movedOn = 0;

			this.tiles[to[0]][to[1]][player].movedTo += 1;
			this.tiles[to[0]][to[1]][player][piece].movedTo += 1;

			this.tiles[to[0]][to[1]].currentPiece.color = player;
			this.tiles[to[0]][to[1]].currentPiece.piece = piece;
			this.tiles[to[0]][to[1]].currentPiece.movedOn = this.cntMoves;
		}
	}

	processTakes(pos, player, takingPiece, takenPiece) {
		if (takingPiece.length > 1 && takenPiece.length > 1) {
			const opPlayer = player === 'w' ? 'b' : 'w';
			this.tiles[pos[0]][pos[1]][player].killedOn += 1;
			this.tiles[pos[0]][pos[1]][player][takingPiece].killedOn += 1;
			this.tiles[pos[0]][pos[1]][opPlayer].wasKilledOn += 1;
			this.tiles[pos[0]][pos[1]][opPlayer][takenPiece].wasKilledOn += 1;
		}
	}
}

export default TileTracker;
