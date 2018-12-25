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
	}
	// {
	// 	short_name: 'TILE_KILLCOUNT',
	// 	long_name: 'Pieces Taken on',
	// 	type: 'Tile',
	// 	scope: 'global',
	// 	unit: '',
	// 	description: 'Amount of Pieces were taken on selected tile.',
	// 	calc: (board, sqrCoords, loopCoords) => {
	// 		let val =
	// 			board.tiles[loopCoords[0]][loopCoords[1]].stats.cntTakenPieces;
	// 		//val = (val * 100) / board.stats.cntMoves;
	// 		return val;
	// 	}
	// },
	// {
	// 	short_name: 'PIECE_MOVED_TO_TILE',
	// 	long_name: 'Moved to Tile',
	// 	type: 'Piece',
	// 	scope: 'specific',
	// 	unit: '%',
	// 	description:
	// 		'Selected piece had tile X as a move target in Y% of cases out of all moves for that piece.',
	// 	calc: (board, sqrCoords, loopCoords) => {
	// 		const { defaultPiece } = board.tiles[sqrCoords[0]][sqrCoords[1]];
	// 		let val =
	// 			defaultPiece === null
	// 				? 0
	// 				: defaultPiece.stats.at[loopCoords[0]][loopCoords[1]]
	// 						.movedTo;
	// 		val =
	// 			(val * 100) /
	// 			(defaultPiece === null ? 1 : defaultPiece.stats.cntMoved);
	// 		return val;
	// 	}
	// },
	// {
	// 	short_name: 'PIECE_KILLED_BY',
	// 	long_name: 'Killed by',
	// 	type: 'Piece',
	// 	scope: 'specific',
	// 	unit: '%',
	// 	description:
	// 		'Selected piece was taken by piece X in Y% of cases this piece was taken in total.',
	// 	calc: (board, sqrCoords, loopCoords) => {
	// 		const { defaultPiece } = board.tiles[sqrCoords[0]][sqrCoords[1]];
	// 		let val =
	// 			defaultPiece === null
	// 				? 0
	// 				: defaultPiece.stats.at[loopCoords[0]][loopCoords[1]]
	// 						.killedBy;
	// 		val =
	// 			(val * 100) /
	// 			(defaultPiece === null ? 1 : defaultPiece.stats.cntWasKilled);
	// 		return val;
	// 	}
	// },
	// {
	// 	short_name: 'PIECE_KILLED',
	// 	long_name: 'Killed',
	// 	type: 'Piece',
	// 	scope: 'specific',
	// 	unit: '%',
	// 	description:
	// 		'Selected piece took piece X in Y% of cases this piece took another piece in total.',
	// 	calc: (board, sqrCoords, loopCoords) => {
	// 		const { defaultPiece } = board.tiles[sqrCoords[0]][sqrCoords[1]];
	// 		let val =
	// 			defaultPiece === null
	// 				? 0
	// 				: defaultPiece.stats.at[loopCoords[0]][loopCoords[1]]
	// 						.killed;
	// 		val =
	// 			(val * 100) /
	// 			(defaultPiece === null ? 1 : defaultPiece.stats.cntHasKilled);
	// 		return val;
	// 	}
	// },
	// {
	// 	short_name: 'PIECES_KILL_PERCENTAGE',
	// 	long_name: 'Kill Percentage',
	// 	type: 'Piece',
	// 	scope: 'global',
	// 	unit: '%',
	// 	description: 'Piece was killed in X% of games.',
	// 	calc: (board, sqrCoords, loopCoords) => {
	// 		const { defaultPiece } = board.tiles[loopCoords[0]][loopCoords[1]];
	// 		let val =
	// 			defaultPiece === null ? 0 : defaultPiece.stats.cntWasKilled;
	// 		val = (val * 100) / board.stats.cntGames;
	// 		return val;
	// 	}
	// },
	// {
	// 	short_name: 'PIECES_KILLS_PER_GAME',
	// 	long_name: 'Kills per Game',
	// 	type: 'Piece',
	// 	scope: 'global',
	// 	unit: '',
	// 	description: 'Piece took on average X other pieces per game.',
	// 	calc: (board, sqrCoords, loopCoords) => {
	// 		const { defaultPiece } = board.tiles[loopCoords[0]][loopCoords[1]];
	// 		let val =
	// 			defaultPiece === null ? 0 : defaultPiece.stats.cntHasKilled;
	// 		val /= board.stats.cntGames;
	// 		return val;
	// 	}
	// },
	// {
	// 	short_name: 'PIECES_1st_MOVE',
	// 	long_name: 'First move position',
	// 	type: 'Piece',
	// 	scope: 'global',
	// 	unit: '',
	// 	description: 'tbd',
	// 	calc: (board, sqrCoords, loopCoords, optData) => {
	// 		const { history } = board.tiles[sqrCoords[0]][
	// 			sqrCoords[1]
	// 		].defaultPiece;
	// 		let val = 0;
	// 		for (let i = 0; i < history.length; i++) {
	// 			if (history[i].length > optData) {
	// 				if (
	// 					history[i][optData][0] === loopCoords[0] &&
	// 					history[i][optData][1] === loopCoords[1]
	// 				) {
	// 					val += 1;
	// 				}
	// 			}
	// 		}

	// 		return val;
	// 	}
	// },
	// {
	// 	short_name: 'ALIVE_AFTER_MOVE',
	// 	long_name: 'Alive percentage after X moves',
	// 	type: 'Piece',
	// 	scope: 'global',
	// 	unit: '',
	// 	description: 'tbd',
	// 	calc: (board, sqrCoords, loopCoords, optData) => {
	// 		const { defaultPiece } = board.tiles[loopCoords[0]][loopCoords[1]];
	// 		let val = 0;
	// 		let len = 1;
	// 		if (defaultPiece !== null) {
	// 			const { history } = defaultPiece;
	// 			len = history.length;
	// 			for (let i = 0; i < history.length; i++) {
	// 				if (history[i].length > optData) {
	// 					val += 1;
	// 				}
	// 			}
	// 		}

	// 		return val / len;
	// 	}
	// }
];
