/*eslint-disable*/
module.exports = [
	{
		short_name: 'TILES_OCC_ALL',
		long_name: 'Occupated (Total)',
		type: 'Tile',
		scope: 'global',
		unit: '%',
		description: 'Tile X had a piece on it for Y% of all moves.',
		calc: (data, sqrData, loopSqrData) => {
			const { coords } = loopSqrData;
			let val =
				data.tiles[coords[0]][coords[1]].w.wasOn +
				data.tiles[coords[0]][coords[1]].b.wasOn;
			val = (val * 100) / data.cntMovesTotal;
			return val;
		}
	},
	{
		short_name: 'TILES_OCC_WHITE',
		long_name: 'Occupated (White)',
		type: 'Tile',
		scope: 'global',
		unit: '%',
		description: 'Tile X had a white piece on it for Y% of all moves.',
		calc: (data, sqrData, loopSqrData) => {
			const { coords } = loopSqrData;
			let val = data.tiles[coords[0]][coords[1]].w.wasOn;
			val = (val * 100) / data.cntMovesTotal;
			return val;
		}
	},
	{
		short_name: 'TILES_OCC_BLACK',
		long_name: 'Occupated (Black)',
		type: 'Tile',
		scope: 'global',
		unit: '%',
		description: 'Tile X had a black piece on it for Y% of all moves.',
		calc: (data, sqrData, loopSqrData) => {
			const { coords } = loopSqrData;
			let val = data.tiles[coords[0]][coords[1]].b.wasOn;
			val = (val * 100) / data.cntMovesTotal;
			return val;
		}
	},
	{
		short_name: 'TILE_OCC_BY_PIECE',
		long_name: 'Occupated (by Piece)',
		type: 'Tile',
		scope: 'specific',
		unit: '%',
		description:
			'Selected tile was occupated by piece X during Y% of all moves.',
		calc: (data, sqrData, loopSqrData) => {
			const sqrCoords = sqrData.coords;
			const { piece } = loopSqrData;

			let val = 0;
			if (piece.color !== '') {
				val =
					data.tiles[sqrCoords[0]][sqrCoords[1]][piece.color][
						piece.name
					].wasOn;
			}
			val = (val * 100) / data.cntMovesTotal;
			return val;
		}
	},
	{
		short_name: 'TILE_KILLCOUNT',
		long_name: 'Pieces Taken on',
		type: 'Tile',
		scope: 'global',
		unit: '',
		description: 'Amount of Pieces that were taken on each tile.',
		calc: (data, sqrData, loopSqrData) => {
			const { coords } = loopSqrData;
			let val =
				data.tiles[coords[0]][coords[1]].b.wasKilledOn +
				data.tiles[coords[0]][coords[1]].w.wasKilledOn;
			return val;
		}
	},
	{
		short_name: 'PIECE_MOVED_TO_TILE',
		long_name: 'Moved to Tile',
		type: 'Tile',
		scope: 'specific',
		unit: '',
		description: 'Selected piece had tile X as a move target Y times.',
		calc: (data, sqrData, loopSqrData) => {
			const { piece } = sqrData;
			const { coords } = loopSqrData;
			let val = 0;
			if (piece.name !== '') {
				val =
					data.tiles[coords[0]][coords[1]][piece.color][piece.name]
						.movedTo;
			}
			return val;
		}
	},
	{
		short_name: 'PIECE_KILLED_BY',
		long_name: 'Killed by',
		type: 'Piece',
		scope: 'specific',
		unit: '',
		description: 'Selected piece was taken by piece X Y times.',
		calc: (data, sqrData, loopSqrData) => {
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
	{
		short_name: 'PIECE_KILLED',
		long_name: 'Killed',
		type: 'Piece',
		scope: 'specific',
		unit: '',
		description: 'Selected piece took piece X Y times.',
		calc: (data, sqrData, loopSqrData) => {
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
];
