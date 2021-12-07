<img src="https://i.imgur.com/X7Q2xIx.png" style="height: 150px">

A JavaScript library for batch analyzing chess games.

[![npm version](https://badge.fury.io/js/chessalyzer.js.svg)](https://badge.fury.io/js/chessalyzer.js)

# Index

-   [Features](#features)
-   [Installation](#installation)
-   [How it works](#how-it-works)
-   [Examples](#examples)
    -   [Basic Usage](#basic-usage)
    -   [Filtering](#filtering)
    -   [Multithreading](#multithreaded-analysis)
    -   [Compare Analyses](#compare-analyses)
-   [Heatmap analysis functions](#heatmap-analysis-functions)
-   [Tracked statistics](#tracked-statistics)
    -   [Built-in](#built-in)
    -   [Custom Tracker](#custom-trackers)
-   [Visualisation](#visualisation)
-   [Contribute](#contribute)
-   [Changelog](#changelog)
-   [TODOs](#todos)

# Features

-   Batch process PGN files and track statistics of your games
-   Filter games (e.g. only analyze games where WhiteElo > 1800)
-   Fully modular, track only the stats you need to preserve performance
-   Generate heatmaps out of the generated data
-   It's fast: >4.400.000 moves/s on a Apple M1, >2.900.000 moves/s on a Ryzen 5 2600X (PGN parsing only)
-   Handles big files easily

# Installation

1. Install package

```sh
npm install chessalyzer.js
```

2. Import the Chessalyzer object (Note: since V2.0 chessalyzer is an ES module so you can't use the Node.js require(...) syntax).

```javascript
import { Chessalyzer } from 'chessalyzer.js';
```

3. Check out the examples or the [docs](https://yschroe.github.io/chessalyzer.js/).

# How it works

Chessalyzer.js consists of two submodules which work hand-in-hand: The first module is the `Chessalyzer` class which handles the PGN parsing and provides you with functions for generating and displaying heatmaps. The class by itself is static (meaning it can not be instantiated and does not store data in itself) and does not track any statistics though. For this you need a `Tracker` object which you then can pass into the parsing function of the Chessalyzer class. The Chessalzyer class recognizes the Tracker objects and passes data into it. Typically this will either be `MoveData` containing information about e.g. which piece moved from where to where or which piece took which other piece for each move of each game. Additionally you can also use the information from the header of the PGN file, where you can find e.g. the player names and which opening was played (ECO code).

Inside the Tracker object you can do whatever you want with the data. If you want to track some obscure stat like how often the e pawn was promoted to a rook on the a8 square you could write a Tracker for that. Chessalyzer.js ships with three different preconfigured Trackers which should cover most usecases, so if you are happy with that you don't need to code your own Tracker.

Lastly chessalyzer.js provides you with functions to convert your raw data from your Trackes into heatmaps which you then can use in your frontend of choice.

# Examples

## Basic Usage

Let's start with a basic example. Here we simply want to track the tile occupation (=how often did each tile have a piece on it) for the whole board. For this we can use the preconfigured TileTracker class from the library. Afterwards we want to create a heatmap out of the data to visualize the tile occupation. For this basic heatmap a preset is also provided:

```javascript
// import the library and trackers and the preconfigured heatmap functions
import { Chessalyzer, Tracker, Heatmap } from 'chessalyzer.js';

// create basic tile tracker
const tileTracker = new Tracker.Tile();

// chessalyzer returns a Promise so we need to encapsulate everything into an async function
// you should be able to use the Promise.then(...) syntax as well
(async () => {
    // start a batch analysis for the PGN file at <pathToPgnFile>
    // the data is tracked directly inside the tileTracker instance
    // see later chapters for how the data is structured inside the trackers
    await Chessalyzer.startBatch('<pathToPgnFile>', tileTracker);

    // generate a tile occupation heatmap
    const heatmapData = Chessalyzer.generateHeatmap(
        tileTracker, // data source for heatmap
        Heatmap.Tile.TILE_OCC_ALL.calc // heatmap generation function
    );

    // print heatmap to console for preview
    Chessalyzer.printHeatmap(heatmapData.map, heatmapData.min, heatmapData.max);

    // ...or use heatmapData with your favourite frontend
})();
```

## Filtering

You can also filter the PGN file for specific criteria, e.g. only evaluate games where `WhiteElo > 2000`:

```javascript
// create filter function that returns true for all games where WhiteElo > 2000
// the 'game' object passed contains every key included in the pgn file (case sensitive)
let fil = function (game) {
    return game.WhiteElo > 2000;
};

(async () => {
    await Chessalyzer.startBatch('<pathToPgnFile>', tileTracker, {
        filter: fil
    });

    // ...do something with the tileTracker data
})();
```

## Multithreaded analysis

Per default chessalyzer.js uses the Node.js cluster module to read-in the pgn file and analyze the data in parallel.

```javascript
// start a multithreaded batch analysis for the PGN file at <pathToPgnFile>
(async () => {
    await Chessalyzer.startBatch(
        '<pathToPgnFile>',
        tileTracker,
        {
            cntGames: 10000
        },
        { batchSize: 8000, nThreads: 1 }
    );

    // ...
})();
```

`startBatch(...)` in multithreaded mode reads in chunks of games of size `batchSize` times `nThreads` and starts the analysis of the curent chunk while the next chunk is read-in from the PGN file in parallel. With the `nThreads` argument you can define how many threads are started in parallel to analyze the chunk. For example: `batchSize = 1000` and `nThreads = 5` will result in a chunk size of 5000 which is split in 5 threads which analyse 1000 games each.

### Forcing single threaded mode

To use singlethreaded mode in which the games are read in and analyzed sequentially on a single thread, simply pass `null` as the 4th argument into startBatch(...).

##### Important

-   A larger `nThreads` does not necessarily result in a higher speed, since there is a bit of overhead from creating the new thread. You will need to tweak `batchSize` and `nThreads` to get the best results on your system. On my systems I achieved the best results with `nThreads = 1` and `batchSize = 8000` and that is also the default setting. Note that `nThreads = 1` doesn't mean that the analysis is single-threaded but that 1 _additional_ thread in addition to the thread that parses the PGN file is spawned.
-   To use a custom tracker with your multithreaded analysis your tracker needs to have two additional class members:
    -   A `path` variable which contains the path of the file your custom tracker is defined in. You can use `this.path = import.meta.url;` for this. You can check out the `CustomTracker.js` file in the `/test` subfolder, which is basically a copy of the base GameTracker built as a custom tracker. You can only use one custom Tracker for multithreaded analyses at the moment.
    -   An `add()` function. This function gets passed another Tracker object of the same type and is used to merge the data of the two tracker objects. For example, the add() function of the built-in GameTracker looks like this:

```javascript
add(tracker) {
    this.results.white += tracker.results.white;
    this.results.black += tracker.results.black;
    this.results.draw += tracker.results.draw;
    this.cntGames += tracker.cntGames;
    this.time += tracker.time;
}
```

## Compare Analyses

You can also generate a comparison heat map where you can compare the data of two different analyses. Let's say you wanted to compare how the white player occupates the board between a lower rated player and a higher rated player. To get comparable results 1000 games of each shall be evaluated:

```javascript
// create two filters
let fil1 = function (game) {
    return game.WhiteElo > 2000;
};
let fil2 = function (game) {
    return game.WhiteElo < 1200;
};

// create two TileTrackers
const tileT1 = new Tracker.Tile();
const tileT2 = new Tracker.Tile();

// create a evaluation function for the heat map
let fun = (data, _, loopSqrData) => {
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
    const heatmapData = Chessalyzer.generateComparisonHeatmap(
        tileT1,
        tileT2,
        fun
    );

    // use heatmapData
})();
```

# Heatmap analysis functions

The function you create for heatmap generation gets passed up to four parameters (inside `generateHeatMap()`):

-   `data`: The data that is the basis for the heatmap. Typically this object is an analyzer you passed into the `startBatch()` function.
-   `sqrData`: Contains informations about the square you passed into the `generateHeatMap()` function. `sqrData` is an object with the following entries:

    -   `alg`: The square in algebraic notation (e.g. 'a2'),
    -   `coords`: The square in board coordinates (e.g. [6,0]),
    -   `piece`: The piece that starts at the passed square. `piece` is an object with the properties:

        -   `name`: Name of the piece (e.g. 'Pa' for the a-pawn)
        -   `color`: Color of the piece ('b' or 'w').

        If no piece starts at the passed square, `name` and `color` are empty strings.

-   `loopSqrData`: Contains informations about the square the current heatmap value shall be calculated for. The structure of `loopSqrData` is the same as of `sqrData`. The `generateHeatMap()` function loops over every square of the board to calculate a heat map value for each tile.
-   `optData`: Optional data you may need in this function. For example, if you wanted to generate a heatmap to show the average position of a piece after X moves, you could pass that 'X' here.

# Tracked statistics

## Built-in

chessalyzer.js comes with three built-in trackers, available from the `Chessalyzer.Tracker` object:

`Tracker.Game`:

-   `wins`  
    [white wins, draws, black wins]

-   `ECO`
    Counts the ECO keys of the processed games. `ECO` is an object that contains the different keys, for example 'A00'.

-   `cntGames`  
    Number of games processed

`Tracker.Piece`:

-   `b`  
    Blacks pieces. Tracks how often a specific black piece took a specific white piece. E.g. `b.Pa.Qd` tracks how often the black a-pawn took whites queen.

-   `w`  
    Same for whites pieces.

`Tracker.Tile`:

-   `tiles[][]`  
    Represents the tiles of the board. Has two objects (`b`, `w`) on the first layer, and then each piece inside these objects as a second layer (`Pa`, `Ra` etc.). For each piece following stats are tracked:

    -   `movedTo`: How often the piece moved to this tile
    -   `wasOn`: Amount of half-moves the piece was on this tile
    -   `killedOn`: How often the piece took another piece on this tile
    -   `wasKilledOn`: How often the piece was taken on this tile.

    These stats are also tracked for black and white as a whole. Simply omit the piece name to get the total stats of one side for a specific tile, e.g. `tiles[0][6].b.wasOn`.

-   `cntMovesTotal`: Amount of moves processed in total.

## Custom Trackers

If you want to have other stats tracked you can easily create a custom tracker. Ideally you derive your tracker from the `Tracker.Base` class, which comes with built-in performance tracking and warnings, if the structure of your tracker isn't correct.

Your tracker must have the following two properties:

-   `type`:  
    The type of your tracker. Either move based (`this.type = 'move'`) or game based (`this.type = 'game'`).

-   `track(data)`:  
    The main analysis function that is called during the PGN processing. Depending on your `type` the function is called after every half-move (move-typed trackers) or after every game (game-typed trackers). The `data` object contains the following properties:

    -   For move-typed trackers:

        -   `san`: The processed move in standard algebraic notation (e.g. `'Nxe3'`)
        -   `player`: The moving player (`'b'` or `'w'`)
        -   `piece`: The moving piece (e.g. `Pa` for the a-pawn)
        -   `castles`: If the move is castling it's either `'O-O'` or `'O-O-O'`. Empty string else
        -   `takes`: If the move contains taking another piece, takes is an object with following properties:

            -   `piece`: The piece that is taken (e.g. `Pa` for the a-pawn)
            -   `pos`: Board coordinates of the taken piece. Is equal to the `to` property in all cases but 'en passant'

            Is `{}` if no piece is taken

        -   `promotesTo`: In case of pawn promotion contains the piece the pawn promotes to (e.g. 'Q'), empty string else
        -   `from`: Start coordinates of the move (e.g. `[0,0]`). `[-1,-1]` in case the move is the result (e.g. `1-0`).
        -   `to`: Target coordinates of the move (e.g. `[7,0]`). `[-1,-1]` in case the move is the result (e.g. `1-0`).

    -   For game-typed trackers:  
        `data` is an object that contains `{key: value}` entries, where `key` is the property in the PGN (e.g. `'WhiteElo'`, case sensitive) and `value` is the respective value of the property. The property `data.moves` is an array that contains the moves of the game in standard algebraic notation.

-   `add(tracker)`:
    Function that is only required for multithreading. This function gets passed a Tracker object of the same type. In the function you need to define how the statistics of two trackers are added together. See [Multithreaded analyses section](#multithreaded-analysis) for an example.

-   `finish()`:
    Optional method that is called when all games have been processed. Can be used for example to clean up or sort the data of the tracker.

# Visualisation

For a quick preview you can put your heatmap data into `Chessalyzer.printHeatmap(...)` to see your heatmap in the terminal if it supports color:

<img src="https://i.imgur.com/THV7gwY.png" width="40%">

But generally chessalyzer.js only provides the raw data of the analyses (yet? :)). If you want to visualize the data you will need a separate library. The following examples were created with my fork of [chessboardjs](https://github.com/PeterPain/heatboard.js) with added heatmap functionality.

White tile occupation  
<img src="https://i.imgur.com/2naX1mg.png" width="30%">

Moves of whites e pawn  
<img src="https://i.imgur.com/ATivf7i.png" width="30%">

Difference of whites tiles occupation between a higher (green) and a lower rated (red) player  
<img src="https://i.imgur.com/tZVkPs3.png" width="30%">

# Changelog

-   2.0.0:
    -   Chessalyzer.js is now a ES module (ESM) and will no longer work inside a browser. You need Node.js to run the library.
    -   runBatch(...) and runBatchMulticore(...) were merged into the single function runBatch(...). Per default the function will run in multithreaded mode, but you can override the config to force singlethreaded mode if it is needed in your environment.
    -   Added support for PGN files in which the game moves are listed in multiple lines instead of one single line
    -   Exports a new Heatmap object with heatmap presets for the built-in Tile and Piece tracker.
    -   Changed the data structure of the move data passed into the analyzers.
    -   Ported code base to TypeScript.
    -   (Since I have no idea if someone actually uses the library, I won't write a migration guide. If you need help, just leave me an issue.)
