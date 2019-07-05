# chessalyzer.js

[![npm version](https://badge.fury.io/js/chessalyzer.js.svg)](https://badge.fury.io/js/chessalyzer.js)

A JavaScript library for batch analyzing chess games.

NOTE: In Version 1.0.0 the API changed significantly! Check the examples for a description.

## Features

- Batch process PGN files
- Filter games (e.g. only analyze games where WhiteElo > 1800)
- Track statistics
- Fully modular, track only the stats you need to preserve performance
- Generate heatmaps out of the generated data
- It's fast (>1.300.000 moves/s on a Ryzen 5 2600X using all 12 threads; only PGN parsing)
- Handles big files easily

## Usage

1. Install package

```sh
npm install --save chessalyzer.js
```

2. Import the Chessalyzer object

```javascript
const Chessalyzer = require('chessalyzer.js');
```

3. Check out the examples or the [docs](https://peterpain.github.io/chessalyzer.js/Chessalyzer.html).

## Examples

### Basic Usage

Let's start with a basic example:

```javascript
// import the library
const Chessalyzer = require('chessalyzer.js');

// get the builtin trackers
const { Tracker } = Chessalyzer;

// create basic tile tracker
const tileTracker = new Tracker.Tile();

// create a analysis function that evaluates a specific stat
// in this example we want to know how often each piece moved to the tile at sqrData.coords
let fun = (data, sqrData, loopSqrData) => {
	let val = 0;
	const { coords } = sqrData;
	const { piece } = loopSqrData;
	if (piece.color !== '') {
		let val = data.tiles[coords[0]][coords[1]][piece.color][piece.name].movedTo;
	}
	return val;
};

(async () => {
	// start a batch analysis for the PGN file at <pathToPgnFile>
	// the analysis is saved directly in the 'tileTracker' object
	await Chessalyzer.startBatch('<pathToPgnFile>', tileTracker);

	// generate a heat map for the data of 'a1' based on your evaluation function
	let heatmapData = Chessalyzer.generateHeatmap(tileTracker, 'a1', fun);

	// ...use heatmapData with your favourite frontend
})();
```

### Filtering

You can also filter the PGN file for specific criteria, e.g. only evaluate games where `WhiteElo > 2000`:

```javascript
// create filter function that returns true for all games where WhiteElo > 2000
// the 'game' object passed contains every key included in the pgn file (case sensitive)
let fil = function(game) {
	return game.WhiteElo > 2000;
};

(async () => {
	await Chessalyzer.startBatch('<pathToPgnFile>', tileTracker, { filter: fil });

	// ...do something with the tileTracker data
})();
```

### Multithreaded analysis (New in 1.1.0)

Version 1.1.0 added experimental multithreading with much better processing speeds (up to 3x). To use multithreading use the function `Chessalyzer.startBatchMultiCore` instead of `Chessalyzer.startBatch`:

```javascript
// start a multithreaded batch analysis for the PGN file at <pathToPgnFile>
(async () => {
	await Chessalyzer.startBatchMultiCore(
		'<pathToPgnFile>',
		tileTracker,
		{
			cntGames: 10000
		},
		6000,
		2
	);

	// ...
})();
```

`startBatchMultiCore(...)` reads in chunks of games of size `batchSize` (fourth argument) and starts the analysis of the curent chunk while the next chunk is read-in from the .pgn file in parallel. With the fifth argument `nThreads` you can define how many threads are started in parallel to analyze the chunk. For example: `batchSize = 1000` and `nThreads = 5` will result in a chunk size of 5000 which is split in 5 threads which analyse 1000 games each.

##### Important

- A larger `nThreads` does not necessary result in a higher speed, since there is a bit of overhead from creating the new thread. You will need to tweak `batchSize` and `nThreads` to get the best results on your system.
- To use a custom tracker with your multithreaded analysis the tracker need to define an `add()` function. This function gets passed another Tracker object of the same type and is used to merge the data of the two tracker objects. For example, the add() function of the built-in GameTracker looks like this:

```javascript
add(tracker) {
		this.wins[0] += tracker.wins[0];
		this.wins[1] += tracker.wins[1];
		this.wins[2] += tracker.wins[2];
		this.cntGames += tracker.cntGames;
		this.time += tracker.time;
	}
```

### Compare Analyses

You can also generate a comparison heat map where you can compare the data of two different analyses. Let's say you wanted to compare how the white player occupates the board between a lower rated player and a higher rated player. To get comparable results 1000 games of each shall be evaluated:

```javascript
// create two filters
let fil1 = function(game) {
	return game.WhiteElo > 2000;
};
let fil2 = function(game) {
	return game.WhiteElo < 1200;
};

// create two TileTrackers
const tileT1 = new Tracker.Tile();
const tileT2 = new Tracker.Tile();

// create a evaluation function for the heat map
// (sqrData isn't used by this analysis, but needs to be an argument nevertheless)
let fun = (data, sqrData, loopSqrData) => {
	const { coords } = loopSqrData;
	let val = data.tiles[coords[0]][coords[1]].w.wasOn;
	val = (val * 100) / data.cntMovesTotal;
	return val;
};

(async () => {
	// start the first analysis
	await Chessalyzer.startBatch('<pathToPgnFile>', tileT1, {
		filter: fil1,
		cntGames: 1000
	});

	// start the second analysis
	await Chessalyzer.startBatch('<pathToPgnFile>', tileT2, {
		filter: fil2,
		cntGames: 1000
	});

	// generate the comparison heatmap
	let heatmapData = Chessalyzer.generateComparisonHeatmap(
		tileT1,
		tileT2,
		'a1', // this analysis function doesn't depent on a specific square, so pass a random square
		fun
	);

	// use heatmapData
})();
```

## Heatmap analysis functions

The function you create for heatmap generation gets passed up to four parameters (inside `generateHeatMap()`):

- `data`: The data that is the basis for the heatmap. Typically this object is an analyzer you passed into the `startBatch()` function.
- `sqrData`: Contains informations about the square you passed into the `generateHeatMap()` function. `sqrData` is an object with the following entries:

  - `alg`: The square in algebraic notation (e.g. 'a2'),
  - `coords`: The square in board coordinates (e.g. [6,0]),
  - `piece`: The piece that starts at the passed square. `piece` is an object with the properties:

    - `name`: Name of the piece (e.g. 'Pa' for the a-pawn)
    - `color`: Color of the piece ('b' or 'w').

    If no piece starts at the passed square, `name` and `color` are empty strings.

- `loopSqrData`: Contains informations about the square the current heatmap value shall be calculated for. The structure of `loopSqrData` is the same as of `sqrData`. The `generateHeatMap()` function loops over every square of the board to calculate a heat map value for each tile.
- `optData`: Optional data you may need in this function. For example, if you wanted to generate a heatmap to show the average position of a piece after X moves, you could pass that 'X' here.

## Tracked statistics

### Built-in

chessalyzer.js comes with three built-in trackers, available from the `Chessalyzer.Tracker` object:

`Tracker.Game`:

- `wins`  
  [white wins, draws, black wins]

- `cntGames`  
  Number of games processed

`Tracker.Piece`:

- `b`  
  Blacks pieces. Tracks how often a specific black piece took a specific white piece. E.g. `b.Pa.Qd` tracks how often the black a-pawn took whites queen.

- `w`  
  Same for whites pieces.

`Tracker.Tile`:

- `tiles[][]`  
  Represents the tiles of the board. Has two objects (`b`, `w`) on the first layer, and then each piece inside these objects as a second layer (`Pa`, `Ra` etc.). For each piece following stats are tracked:

  - `movedTo`: How often the piece moved to this tile
  - `wasOn`: Amount of half-moves the piece was on this tile
  - `killedOn`: How often the piece took another piece on this tile
  - `wasKilledOn`: How often the piece was taken on this tile.

  These stats are also tracked for black and white as a whole. Simply omit the piece name to get the total stats of one side for a specific tile, e.g. `tiles[0][6].b.wasOn`.

- `cntMovesTotal`: Amount of moves processed in total.

### Custom Trackers

If you want to have other stats tracked you can easily create a custom tracker. Ideally you derive your tracker from the `Tracker.Base` class, which comes with built-in performance tracking and warnings, if the structure of your tracker isn't correct.

Your tracker must have the following two properties:

- `type`:  
  The type of your tracker. Either move based (`this.type = 'move'`) or game based (`this.type = 'game'`).

- `track(data)`:  
  The main analysis function that is called during the PGN processing. Depending on your `type` the function is called after every half-move (move-typed trackers) or after every game (game-typed trackers). The `data` object contains the following properties:

  - For move-typed trackers:

    - `san`: The processed move in standard algebraic notation (e.g. `'Nxe3'`)
    - `player`: The moving player (`'b'` or `'w'`)
    - `piece`: The moving piece (e.g. `Pa` for the a-pawn)
    - `castles`: If the move is castling it's either `'O-O'` or `'O-O-O'`. Empty string else
    - `takes`: If the move contains taking another piece, takes is an object with following properties:

      - `piece`: The piece that is taken (e.g. `Pa` for the a-pawn)
      - `pos`: Board coordinates of the taken piece. Is equal to the `to` property in all cases but 'en passant'

      Is `{}` if no piece is taken

    - `promotesTo`: In case of pawn promotion contains the piece the pawn promotes to (e.g. 'Q'), empty string else
    - `from`: Start coordinates of the move (e.g. `[0,0]`). `[-1,-1]` in case the move is the result (e.g. `1-0`).
    - `to`: Target coordinates of the move (e.g. `[7,0]`). `[-1,-1]` in case the move is the result (e.g. `1-0`).

  - For game-typed trackers:  
    `data` is an object that contains `{key: value}` entries, where `key` is the property in the PGN (e.g. `'WhiteElo'`, case sensitive) and `value` is the respective value of the property. The property `data.moves` is an array that contains the moves of the game in standard algebraic notation.

- `add(tracker)`:
  Function that is only required for multithreading. This function gets passed a Tracker object of the same type. In the function you need to define how the statistics of two trackers are added together. See [Multithreaded analyses section](<#-Multithreaded-analyses-(New-in-1.1.0)>) for an example.

## Visualisation

Please note that chessalyzer.js only provides the raw data of the analyses. If you want to visualize the data you will need a separate library. The following examples were created with my fork of [chessboardjs](https://github.com/PeterPain/heatboard.js) with added heatmap functionality.

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

- 1.1.0:
  - Added Multithreading
- 1.0.1:
  - Moved the performance tracking for the Trackers into the Tracker.Base class.
  - The Promise returned by the startBatch function now contains the number of processed games and moves.
- 1.0.0:  
  Significantly changed the API to allow for more modularity. If you are already using an older version (<=0.4.0) consider changing your code to adapt to the new API.

## TODOs

- [ ] Check functionality for non-lichess PGN files
- [ ] Write Mocha tests
- [ ] Update jsdoc
- [ ] Track statistics for promoted pieces. Currently stats for those are not tracked
