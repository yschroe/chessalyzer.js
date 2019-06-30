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

class Piece {
	constructor(piece, color) {
		this.piece = piece;
		this.color = color;
		this.lastMovedOn = 0;
	}
}

class TileTracker extends BaseTracker {
	constructor() {
		super('move');
		this.cntMovesGame = 0;
		this.cntMovesTotal = 0;
		this.tiles = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = { b: {}, w: {} };

				currRow[col].b = new TileStats();
				currRow[col].w = new TileStats();
				pawnTemplate.forEach(val => {
					currRow[col].b[val] = new TileStats();
					currRow[col].w[val] = new TileStats();
				});
				pieceTemplate.forEach(val => {
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
		let color;
		let piece;
		let hasPiece = false;

		if (row === 0) {
			color = 'b';
			piece = pieceTemplate[col];
			hasPiece = true;
		} else if (row === 1) {
			color = 'b';
			piece = pawnTemplate[col];
			hasPiece = true;
		} else if (row === 6) {
			color = 'w';
			piece = pawnTemplate[col];
			hasPiece = true;
		} else if (row === 7) {
			color = 'w';
			piece = pieceTemplate[col];
			hasPiece = true;
		}

		if (hasPiece) {
			this.tiles[row][col].currentPiece = new Piece(piece, color);
		} else {
			this.tiles[row][col].currentPiece = null;
		}
	}

	track(moveData) {
		const { to } = moveData;
		const { from } = moveData;
		const { player } = moveData;
		const { piece } = moveData;
		const { takes } = moveData;
		const { castles } = moveData;

		// move
		if (to[0] !== -1) {
			this.cntMovesGame += 1;

			if (takes.piece !== undefined) {
				this.processTakes(takes.pos, player, piece, takes.piece);
			}

			this.processMove(from, to, player, piece);

			// castle
		} else if (castles !== '') {
			this.cntMovesGame += 1;

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
					if (currentPiece !== null) {
						this.addOccupation([row, col]);
					}
					this.resetCurrentPiece(row, col);
				}
			}
			this.cntMovesTotal += this.cntMovesGame;
			this.cntMovesGame = 0;
		}
	}

	processMove(from, to, player, piece) {
		if (piece.length > 1) {
			this.addOccupation(from);

			this.tiles[to[0]][to[1]].currentPiece = this.tiles[from[0]][
				from[1]
			].currentPiece;
			this.tiles[to[0]][
				to[1]
			].currentPiece.lastMovedOn = this.cntMovesGame;

			this.tiles[from[0]][from[1]].currentPiece = null;

			this.tiles[to[0]][to[1]][player].movedTo += 1;
			this.tiles[to[0]][to[1]][player][piece].movedTo += 1;
		}
	}

	processTakes(pos, player, takingPiece, takenPiece) {
		if (takenPiece.length > 1) {
			const opPlayer = player === 'w' ? 'b' : 'w';
			this.tiles[pos[0]][pos[1]][opPlayer].wasKilledOn += 1;
			this.tiles[pos[0]][pos[1]][opPlayer][takenPiece].wasKilledOn += 1;

			this.addOccupation(pos);
			this.tiles[pos[0]][pos[1]].currentPiece = null;
		}

		if (takingPiece.length > 1) {
			this.tiles[pos[0]][pos[1]][player].killedOn += 1;
			this.tiles[pos[0]][pos[1]][player][takingPiece].killedOn += 1;
		}
	}

	addOccupation(pos) {
		const { currentPiece } = this.tiles[pos[0]][pos[1]];
		const toAdd = this.cntMovesGame - currentPiece.lastMovedOn;
		this.tiles[pos[0]][pos[1]][currentPiece.color].wasOn += toAdd;
		this.tiles[pos[0]][pos[1]][currentPiece.color][
			currentPiece.piece
		].wasOn += toAdd;
	}
}

export default TileTracker;
