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
npm install --savbe chessalyzer
```

2. Import the Chessalyzer object and create a new instance

```javascript
const Chessalyzer = require('chessalyzer');
const chessalyzer = new Chessalyzer();
```

## Examples

```javascript
const Chessalyzer = require('chessalyzer');
const chessalyzer = new Chessalyzer();
chessalyzer.startBatch('<pathToPgnFile>').then(() => {
	console.log('Finished');
});
```

Or you can check out my standalone project [Chessalyzer](https://github.com/PeterPain/chessalyzer-nuxt).

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
