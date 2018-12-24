# chessalyzer.js

A JavaScript library for batch analyzing chess games.

NOTE: In Version 0.1.0 the API changed dramatically. Following description is not up to date!

## Features

-   Batch process PGN files
-   Filter games (e.g. only analyze games where WhiteElo > 1800)
-   Track statistics for each piece and tile
-   Fully modular, track only the stats you need to preserve performance
-   Generate heatmaps out of the generated data
-   It's fast (>800.000 moves/s on a i5-7200U; only PGN parsing)

## Usage

1. Install package

```sh
npm install --save chessalyzer.js
```

2. Import the Chessalyzer object

```javascript
const Chessalyzer = require('chessalyzer.js');
```

3. Check out the examples or the [docs](https://peterpain.github.io/chessalyzer.js/Chessalyzer.html) for a full functional description.

## Examples

Let's start with a basic example:

```javascript
// import the library
const Chessalyzer = require('chessalyzer.js');

// create basic tile tracker
const tileTracker = new Chessalyzer.TileTracker();

// start a batch analysis for the PGN file at <pathToPgnFile>
Chessalyzer.startBatch('<pathToPgnFile>', [tileTracker]).then(() => {
	// create a analysis function that evaluates a specific stat
	// in this example we want to know how often each piece moved to the tile at sqrCoords
	let fun = (data, sqrData, loopSqrData) => {
		let val = 0;
		const { coords } = sqrData;
		const { piece } = loopSqrData;
		if (piece.color !== undefined) {
			let val =
				data.tiles[coords[0]][coords[1]][piece.color][piece.name]
					.movedTo;
		}
		return val;
	};

	// generate a heat map for the data of 'a1' based on your evaluation function
	let heatmapData = Chessalyzer.generateHeatmap(tileTracker, 'a1', fun);

	// use heatmapData with your favourite frontend
});
```

You can also filter the PGN file for specific criteria, e.g. only evaluate games where `WhiteElo > 2000`:

```javascript
// create filter function that returns true for all games where WhiteElo > 2000
// the 'game' object passed contains every key included in the pgn file (case sensitive)
let fil = function(game) {
	return game.WhiteElo > 2000;
};

chessalyzer.startBatch('<pathToPgnFile>', [], { filter: fil }).then(() => {
	// do something
});
```

You can also generate a comparison heat map where you can compare the data of two different analyses. Let's say you wanted to compare how the white player occupates the board between a lower rated player and a higher rated player. To get comparable results 1000 games of each shall be evaluated:

```javascript
// create two filters
let fil1 = function(game) {
	return game.WhiteElo > 2000;
};
let fil2 = function(game) {
	return game.WhiteElo < 1200;
};

// create a evaluation function for the heat map
// (sqrCoords isn't used by this analysis, but needs to be an argument nevertheless)
let fun = (board, sqrCoords, loopCoords) => {
	let val = board.tiles[loopCoords[0]][loopCoords[1]].stats.cntHasPiece.white;
	val = (val * 100) / board.stats.cntMoves;
	return val;
};

// start the first analysis and save the results to bank 0
chessalyzer
	.startBatch('<pathToPgnFile>', { filter: fil1, cntGames: 1000 }, 0)
	.then(() => {
		// start the second analysis and save the results to bank 1
		chessalyzer
			.startBatch('<pathToPgnFile>', { filter: fil2, cntGames: 1000 }, 1)
			.then(() => {
				// generate the comparison heatmap
				let heatmapData = chessalyzer.generateComparisonHeatmap(
					'a1', // this analysis function doesn't depent on a specific square, so pass a random square
					fun,
					0, // first bank
					1 // second bank
				);

				// use heatmapData
			});
	});
```

## Heatmap analysis functions

The function you create for heatmap generation gets passed up to four parameters inside `genereateHeatMap()`: `board, sqrCoords, loopCoords, optData`:

-   `board`: Includes a `stats` object for general board stats and a 8x8 array of ChessTiles. Each ChessTile represents a tile on the chess board. You can get the data of one specific tile by accessing the array `board.tiles`. The ChessTile at the indices `[0][0]` represents the A8 square, the ChessTile at `[7][7]` is the H1 square. If you are interested in the data of one specific tile, you can just access it by `board.tiles[row][col]`. The ChessTiles themself contain various data described at [Tracked statistics](#tracked-statistics). Moreover the Tiles contain a `defaultPiece` class member of Type `ChessPiece`. Because the tiles from row 2 to 5 (0-based) contain no pieces at the start of the game, the `defaultPiece` for these rows is `null`.
-   `sqrCoords`: Contain the coordinates of the square you passed into the `genereateHeatMap()` function
-   `loopCoords`: Contains the coordinates of the square the current heatmap value is calculated for. The `genereateHeatMap()` function loops over every square of the board to calculate a heat map value for each tile.
-   `optData`: Optional data you may need in this function. For example, if you wanted to generate a heatmap to show the average position of a piece after X moves, you could pass that 'X' here.

## Tracked statistics

Currently the following stats are generated:

General:

-   `ChessBoard.stats.cntGames`  
    Number of games processed

-   `ChessBoard.stats.cntMoves`  
    Number of moves processed

Tile:

-   `ChessTile.stats.at[x][y].wasOnTile` (Option: cfg.stats.logTileOccupation)  
    How often was the piece thats starts at `[x][y]` on this tile

-   `ChessTile.stats.cntHasPiece[color]` (Option: cfg.stats.logTileOccupation)  
    How often did a piece of which color occupate this tile

-   `ChessTile.stats.cntTakenPieces`  
    How often was a piece taken on this tile

Piece:

-   `ChessPiece.stats.at[row][col].movedTo`  
    How often did this piece move to the tile at `[row][col]`

-   `ChessPiece.stats.at[row][col].killedBy`  
    How often was this piece taken by the piece that starts at `[row][col]`

-   `ChessPiece.stats.at[row][col].killed`  
    How often did this piece take the piece that starts at `[row][col]`

-   `ChessPiece.stats.cntMoved`  
    How often did this piece move

-   `ChessPiece.stats.cntWasKilled`  
    How often was this piece taken

-   `ChessPiece.stats.cntKilled`  
    How often did this piece take another piece

-   `ChessPiece.history` (Option: cfg.stats.logPieceHistory)  
    The complete position history of this piece in an array (x axis: game nr; y axis: move nr).

If you need another stat tracked, let me know or create a pull request.

## Visualisation

Please note that chessalyzer.js only provides the raw data of the analyses. If you want to visualize the data you will need a separate library. The following examples were created with my my fork of [chessboardjs](https://github.com/PeterPain/heatboard.js) with added heatmap functionality.

White tile occupation  
<img src="https://i.imgur.com/2naX1mg.png" width="30%">

Moves of whites e pawn  
<img src="https://i.imgur.com/ATivf7i.png" width="30%">

Difference of whites tiles occupation between a higher (green) and a lower rated (red) player  
<img src="https://i.imgur.com/tZVkPs3.png" width="30%">

## Contribute

1. Download the project

2. `npm install`

3. Make changes

4. Build via `npm run build` or `npm run dev`

## Changelog

0.1.0: Significantly changed the API to allow for more modularity. If you are already using an older version (<=0.4.0) consider changing your code to adapt to the new API.

## TODOs

-   [ ] Check functionality for non-lichess PGN files
-   [ ] Write Mocha tests
-   [ ] Update jsdoc
-   [ ] Track statistics for promoted pieces and en passant moves. Currently stats for those are not tracked
-   [ ] Provide function for parsing notation from algebraic (e4 e5) to long algebraic (e2-e4 e7-e5). Internally already available, but no API yet.

## Related

Check out my standalone electron project [Chessalyzer](https://github.com/PeterPain/chessalyzer-nuxt) which uses chessalyzer.js and heatboard.js for visualizing game data. It's still work in progress though.
