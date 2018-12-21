class TileTracker {
	constructor() {
		this.tiles = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = { b: 0, w: 0 };
			}
			this.tiles[row] = currRow;
		}
	}

	track(moveData) {
		const { to } = moveData;
		const { player } = moveData;
		if (to[0] !== -1) {
			this.tiles[to[0]][to[1]][player] += 1;
		}
	}
}

export default TileTracker;
