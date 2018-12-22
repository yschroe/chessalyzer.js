const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

class TileTracker {
	constructor() {
		this.tiles = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = { b: {}, w: {} };
				pawnTemplate.forEach((val) => {
					currRow[col].b[val] = {
						movedTo: 0,
						wasOn: 0,
						killedOn: 0,
						wasKilledOn: 0
					};
					currRow[col].w[val] = {
						movedTo: 0,
						wasOn: 0,
						killedOn: 0,
						wasKilledOn: 0
					};
				});
				pieceTemplate.forEach((val) => {
					currRow[col].b[val] = {
						movedTo: 0,
						wasOn: 0,
						killedOn: 0,
						wasKilledOn: 0
					};
					currRow[col].w[val] = {
						movedTo: 0,
						wasOn: 0,
						killedOn: 0,
						wasKilledOn: 0
					};
				});
				currRow[col].b.wasOn = 0;
				currRow[col].w.wasOn = 0;
				currRow[col].b.movedTo = 0;
				currRow[col].w.movedTo = 0;
			}
			this.tiles[row] = currRow;
		}
	}

	track(moveData) {
		const { to } = moveData;
		const { player } = moveData;
		const { piece } = moveData;
		const { takes } = moveData;
		if (to[0] !== -1) {
			// console.log(moveData);
			this.tiles[to[0]][to[1]][player].movedTo += 1;
			if (piece.length > 1) {
				this.tiles[to[0]][to[1]][player][piece].movedTo += 1;
			}

			if ('piece' in takes) {
				if (piece.length > 1) {
					this.tiles[takes.pos[0]][takes.pos[1]][player][
						piece
					].killedOn += 1;
				}
				if (takes.piece.length > 1) {
					const opPlayer = player === 'w' ? 'b' : 'w';
					this.tiles[takes.pos[0]][takes.pos[1]][opPlayer][
						takes.piece
					].waskilledOn += 1;
				}
			}
		}
	}
}

export default TileTracker;
