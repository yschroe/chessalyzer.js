module.exports = [
	{
		short_name: 'TILES_OCC_ALL',
		long_name: 'Occupated (Total)',
		type: 'Tile',
		scope: 'global',
		unit: '%',
		description: 'Tile X had a piece on it for Y% of all moves.',
		calc: (board, sqrCoords, loopCoords) => {
			let val =
				board.tiles[loopCoords[0]][loopCoords[1]].data.cntHasPiece
					.white +
				board.tiles[loopCoords[0]][loopCoords[1]].data.cntHasPiece
					.black;
			val = (val * 100) / board.data.cntMoves;
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
		calc: (board, sqrCoords, loopCoords) => {
			let val =
				board.tiles[loopCoords[0]][loopCoords[1]].data.cntHasPiece
					.white;
			val = (val * 100) / board.data.cntMoves;
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
		calc: (board, sqrCoords, loopCoords) => {
			let val =
				board.tiles[loopCoords[0]][loopCoords[1]].data.cntHasPiece
					.black;
			val = (val * 100) / board.data.cntMoves;
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
		calc: (board, sqrCoords, loopCoords) => {
			let val =
				board.tiles[sqrCoords[0]][sqrCoords[1]].stats[loopCoords[0]][
					loopCoords[1]
				].wasOnTile;
			val = (val * 100) / board.data.cntMoves;
			return val;
		}
	},
	{
		short_name: 'PIECE_MOVED_TO_TILE',
		long_name: 'Moved to Tile',
		type: 'Piece',
		scope: 'specific',
		unit: '%',
		description:
			'Selected piece had tile X as a move target in Y% of cases out of all moves for that piece.',
		calc: (board, sqrCoords, loopCoords) => {
			const { defaultPiece } = board.tiles[sqrCoords[0]][sqrCoords[1]];
			let val =
				defaultPiece === null
					? 0
					: defaultPiece.stats[loopCoords[0]][loopCoords[1]]
							.movedToTile;
			val =
				(val * 100) /
				(defaultPiece === null ? 1 : defaultPiece.data.cntMoved);
			return val;
		}
	},
	{
		short_name: 'PIECE_KILLED_BY',
		long_name: 'Killed by',
		type: 'Piece',
		scope: 'specific',
		unit: '%',
		description:
			'Selected piece was taken by piece X in Y% of cases this piece was taken in total.',
		calc: (board, sqrCoords, loopCoords) => {
			const { defaultPiece } = board.tiles[sqrCoords[0]][sqrCoords[1]];
			let val =
				defaultPiece === null
					? 0
					: defaultPiece.stats[loopCoords[0]][loopCoords[1]].killedBy;
			val =
				(val * 100) /
				(defaultPiece === null ? 1 : defaultPiece.data.cntWasKilled);
			return val;
		}
	},
	{
		short_name: 'PIECE_KILLED',
		long_name: 'Killed',
		type: 'Piece',
		scope: 'specific',
		unit: '%',
		description:
			'Selected piece took piece X in Y% of cases this piece took another piece in total.',
		calc: (board, sqrCoords, loopCoords) => {
			const { defaultPiece } = board.tiles[sqrCoords[0]][sqrCoords[1]];
			let val =
				defaultPiece === null
					? 0
					: defaultPiece.stats[loopCoords[0]][loopCoords[1]].killed;
			val =
				(val * 100) /
				(defaultPiece === null ? 1 : defaultPiece.data.cntHasKilled);
			return val;
		}
	},
	{
		short_name: 'PIECES_KILL_PERCENTAGE',
		long_name: 'Kill Percentage',
		type: 'Piece',
		scope: 'global',
		unit: '%',
		description: 'Piece was killed in X% of games.',
		calc: (board, sqrCoords, loopCoords) => {
			const { defaultPiece } = board.tiles[loopCoords[0]][loopCoords[1]];
			let val =
				defaultPiece === null ? 0 : defaultPiece.data.cntWasKilled;
			val = (val * 100) / board.data.cntGames;
			return val;
		}
	},
	{
		short_name: 'PIECES_KILLS_PER_GAME',
		long_name: 'Kills per Game',
		type: 'Piece',
		scope: 'global',
		unit: '',
		description: 'Piece took on average X other pieces per game.',
		calc: (board, sqrCoords, loopCoords) => {
			const { defaultPiece } = board.tiles[loopCoords[0]][loopCoords[1]];
			let val =
				defaultPiece === null ? 0 : defaultPiece.data.cntHasKilled;
			val /= board.data.cntGames;
			return val;
		}
	}
];
