# chessalyzer.js

A JavaScript library for batch analyzing chess games.

## Features

-   Batch process PGN files
-   Replay each game and track statistics for each piece and tile
-   Generate heat maps out of the generated data
-   It's fast (500.000 moves/s on a i5-2500k)

## Usage

1. Install package

```sh
npm install --save PeterPain/chessalyzer.js
```

2. Import the Chessalyzer object and create a new instance

```javascript
const Chessalyzer = require('chessalyzer');
const chessalyzer = new Chessalyzer();
```

3. Check out the examples or the [docs](https://peterpain.github.io/chessalyzer.js/Chessalyzer.html) for a full API description.

## Examples

Lets start with a basic example:

```javascript
// import the library
const Chessalyzer = require('chessalyzer');
const chessalyzer = new Chessalyzer();

// start a batch analysis for the PGN file at <pathToPgnFile>
chessalyzer.startBatch('<pathToPgnFile>').then(() => {
	// create a analysis function that evaluates a specific stat
	// in this example we want to know how often each piece was on a specific tile
	let fun = (board, sqrCoords, loopCoords) => {
		let val =
			board.tiles[sqrCoords[0]][sqrCoords[1]].stats[loopCoords[0]][
				loopCoords[1]
			].wasOnTile;
		return val;
	};

	// generate a heat map for the data of 'a1' based on your evaluation function
	let heatmapData = chessalyzer.generateHeatmap(0, 'a1', fun);

	// use heatmapData with your favourite frontend
});
```

You can also filter the PGN file for specific criteria, e.g. only evaluate games where `WhiteElo > 2000`:

```javascript
// create filter function that returns true for all games where WhiteElo > 2000
// the 'game' object passed contains every key included in the pgn file
let fil = function(game) {
	return game.WhiteElo > 2000;
};

chessalyzer.startBatch('<pathToPgnFile>', { filter: fil }).then(() => {
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
	let val = board.tiles[loopCoords[0]][loopCoords[1]].cntHasPiece.white;
	val = (val * 100) / board.cntMoves;
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
					'a1', // note that this heatmap doesn't depent on a specific square, so pass a random square
					fun,
					0, // first bank
					1 // second bank
				);

				// use heatmapData
			});
	});
```

## Tracked statistics

Currently the following stats are generated:

General:

-   Number of games processed:  
    `ChessBoard.data.cntMoves`
-   Number of moves processed:  
    `ChessBoard.data.cntMoves`

Tile:

-   How often was each piece on this tile:  
    `ChessTile.stats[x][y].wasOnTile`
-   How often did a piece of which color occupate this tile:  
    `ChessTile.cntHasPiece[color]`

Piece:

-   How often did this piece move to the tile at `[row][col]`:  
    `ChessPiece.stats[row][col].movedToTile`
-   How often was this piece taken by the piece that starts at `[row][col]`:  
    `ChessPiece.stats[row][col].killedBy`
-   How often did this piece take the piece that starts at `[row][col]`:  
    `ChessPiece.stats[row][col].killed`
-   How often did this piece move:  
    `ChessPiece.data.cntMoved`
-   How often was this piece taken:  
    `ChessPiece.data.cntWasKilled`
-   How often did this piece take another piece:  
    `ChessPiece.data.cntKilled`

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

## Related

Check out my standalone electron project [Chessalyzer](https://github.com/PeterPain/chessalyzer-nuxt) which uses chessalyzer.js and heatboard.js for visualizing game data.

## TODOs

-   [ ] Check functionality for non-lichess PGN files
-   [ ] Write Mocha tests
-   [ ] Update jsdoc
-   [ ] Track statistics for promoted pieces and en passant moves
