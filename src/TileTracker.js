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
		this.tiles = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = { b: {}, w: {} };
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
	}

	track(moveData) {
		this.startTimer();

		const { to } = moveData;
		const { player } = moveData;
		const { piece } = moveData;
		const { takes } = moveData;
		const { castles } = moveData;

		// move
		if (to[0] !== -1) {
			this.processMove(to, player, piece);

			if (takes.piece !== undefined) {
				this.processTakes(takes.pos, player, piece, takes.piece);
			}

			// castle
		} else if (castles !== '') {
			const row = player === 'w' ? 7 : 0;
			let rook = 'Rh';
			let tarKingCol = 6;
			let tarRookCol = 5;
			if (castles === 'O-O-O') {
				tarKingCol = 2;
				tarRookCol = 3;
				rook = 'Ra';
			}
			this.processMove([row, tarKingCol], player, 'Ke');
			this.processMove([row, tarRookCol], player, rook);

			// game end
		} else {
			//
		}
		this.endTimer();
	}

	processMove(to, player, piece) {
		if (piece.length > 1) {
			this.tiles[to[0]][to[1]][player].movedTo += 1;
			this.tiles[to[0]][to[1]][player][piece].movedTo += 1;
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
