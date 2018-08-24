# chessalyzer.js

A JavaScript library for batch analyzing chess games.

## Features

-   Batch process PGN files
-   Track statistics for each piece and tile
-   Generate heat maps out of the generated data
-   It's fast (500.000 moves/s on a typical machine)

## Usage

1. Install package

```sh
npm install --save chessalyzer
```

2. Import the Chessalyzer object and create a new instance

```javascript
const Chessalyzer = require('chessalyzer');
const chessalyzer = new Chessalyzer();
```

3. See the [docs](https://peterpain.github.io/chessalyzer.js/Chessalyzer.html) for a full API description.

## Examples

```javascript
const Chessalyzer = require('chessalyzer');
const chessalyzer = new Chessalyzer();
chessalyzer.startBatch('<pathToPgnFile>').then(() => {
	let fun = (board, moCoords, loopCoords) => {
		let val =
			board.tiles[loopCoords[0]][loopCoords[1]].cntHasPiece[0] +
			board.tiles[loopCoords[0]][loopCoords[1]].cntHasPiece[1];
		val = (val * 100) / board.cntMoves;
		return val;
	};
	let heatmapData = chessalyzer.generateHeatmap(0, 'a1', fun);
});
```

Then you can use `heatmapData` with a chessboard frontend, for example my fork of [chessboardjs](https://github.com/PeterPain/chessboardjs) with added heatmap functionality.

Or you can check out my standalone electron project [Chessalyzer](https://github.com/PeterPain/chessalyzer-nuxt).

![heatmap1](https://imgur.com/xH3XETp)

## Contribute

1. Download the project

2. `npm install`

3. Make changes

4. Build via `npm run dev` or `npm run build`

## TODOs

-   [ ] Check functionality for non-lichess PGN files
-   [ ] Write Mocha tests
-   [ ] Update jsdoc
-   [ ] Optimize speed further. An earlier version used just an array as input for the Chessboard.move() function as opposed to the moveData object that is used now. The array version was around 10% faster and I can't figure out why.
