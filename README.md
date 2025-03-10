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
    -   [Compare Analyses](#compare-analyses)
    -   [Multithreading](#multithreaded-analysis)
-   [Heatmap analysis functions](#heatmap-analysis-functions)
-   [Tracked statistics](#tracked-statistics)
    -   [Built-in](#built-in)
    -   [Custom Tracker](#custom-trackers)
-   [Heatmap presets](#heatmap-presets)
-   [Visualisation](#visualisation)

# Features

-   Batch process PGN files and track statistics of your games
-   Filter games (e.g. only analyze games where WhiteElo > 1800)
-   Fully modular, track only the stats you need to preserve performance
-   Generate heatmaps out of the generated data
-   It's fast and highly parallelized: Processes >9.300.000 moves/s on an Apple M1, >4.900.000 moves/s on a Ryzen 5 2600X (PGN parsing only)
-   Handles big files easily
-   Just one dependency (chalk)

# Installation

1. Install package

```sh
npm install chessalyzer.js
```

2. Import the Chessalyzer object (Note: since V2.0 chessalyzer is an [ES module](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c#file-esm-package-md) so you can't use the Node.js require(...) syntax).

```javascript
import { Chessalyzer } from 'chessalyzer.js';
```

3. Use the library. See next chapters for examples.

```javascript
Chessalyzer.analyzePGN('<pathToPgnFile', yourAnalysisConfig);
```

4. Check out the examples or the [docs](https://yschroe.github.io/chessalyzer.js/).

# How it works

Chessalyzer.js consists of two submodules which work hand-in-hand: The first module is the `Chessalyzer` class which handles the PGN parsing and provides you with a function for previewing heatmaps. The class by itself is static (meaning it can not be instantiated and does not store data in itself) and does not track any statistics though. For this you need a `Tracker` object which you then can pass into the parsing function of the Chessalyzer class. The Chessalyzer class recognizes the Tracker objects and passes data into it. Typically this will either be an `Action[]` containing information about e.g. which piece moved from where to where or which piece captured which other piece for each move of each game. Additionally you can also use the information from the header of the PGN file, where you can find e.g. the player names and which opening was played (ECO code).

Inside the Tracker object you can do whatever you want with the data. If you want to track some obscure stat like how often the e pawn was promoted to a rook on the a8 square you could write a Tracker for that. Chessalyzer.js ships with three different preconfigured Trackers which should cover most usecases, so if you are happy with that you don't need to code your own Tracker.

Lastly chessalyzer.js provides you with functions to convert your raw data from your Trackers into heatmaps which you then can use in your frontend of choice.

# Examples

## Basic Usage

Let's start with a basic example. Here we simply want to track the tile occupation (=how often did each tile have a piece on it) for the whole board. For this we can use the preconfigured TileTracker class from the library. Afterwards we want to create a heatmap out of the data to visualize the tile occupation. For this basic heatmap a preset is also provided:

```javascript
// Import the library and trackers.
import { Chessalyzer, TileTracker } from 'chessalyzer.js';

// Create basic tile tracker.
const tileTracker = new TileTracker();

// Start a batch analysis for the PGN file at <pathToPgnFile>.
// The data is tracked directly inside the tileTracker instance.
// See later chapters for how the data is structured inside the trackers.
await Chessalyzer.analyzePGN('<pathToPgnFile>', { trackers: [tileTracker] });

// Generate a tile occupation heatmap.
const heatmapData = tileTracker.generateHeatmap('TILE_OCC_ALL');

// Print heatmap to console for preview.
Chessalyzer.printHeatmap(heatmapData);

// ...or use heatmapData with your favourite frontend.
```

## Filtering

You can also filter the PGN file for specific criteria, e.g. only evaluate games where `WhiteElo > 2000`:

```javascript
// Create filter function that returns true for all games where WhiteElo > 2000.
// The 'game' object passed contains every header key included in the pgn file (case sensitive).
let fil = function (game) {
    return game.WhiteElo > 2000;
};

await Chessalyzer.analyzePGN('<pathToPgnFile>', {
    trackers: [tileTracker],
    config: {
        filter: fil
    }
});

// ...do something with the tileTracker data.
```

## Compare Analyses

You can also generate a comparison heat map where you can compare the data of two different analyses. Let's say you wanted to compare how the white player occupates the board between a lower rated player and a higher rated player. To get comparable results 1000 games of each shall be evaluated:

```javascript
// Create two Tile Trackers.
const tileT1 = new TileTracker();
const tileT2 = new TileTracker();

// Start the analysis.
// Instead of passing just one analysis config you can also pass an array of configs,
// tileT1 will only receive games with WhiteElo >2000, tileT2 only receives games with WhiteElo < 1200.
await Chessalyzer.analyzePGN('<pathToPgnFile>', [
    {
        trackers: [tileT1],
        config: {
            filter: (game) => game.WhiteElo > 2000,
            cntGames: 1000
        }
    },
    {
        trackers: [tileT2],
        config: {
            filter: (game) => game.WhiteElo < 1200,
            cntGames: 1000
        }
    }
]);

// Create an evaluation function for the heat map.
let func = (data, loopSqrData) => {
    const { coords } = loopSqrData;
    let val = data.tiles[coords[0]][coords[1]].w.wasOn;
    val = (val * 100) / data.cntMovesTotal;
    return val;
};

// Generate the comparison heatmap.
const heatmapData = tileT1.generateComparisonHeatmap(tileT2, func);

// Use heatmapData.
```

## Multithreaded analysis

Per default chessalyzer.js uses Node.js [Worker Threads](https://nodejs.org/api/worker_threads.html) to read-in the pgn file and analyze the data in parallel.

```javascript
// Start a multithreaded batch analysis for the PGN file at <pathToPgnFile>.

await Chessalyzer.analyzePGN(
    '<pathToPgnFile>',
    {
        trackers: [tileTracker],
        config: {
            cntGames: 10000
        }
    },
    { batchSize: 500 }
);

// ...
```

`analyzePGN(...)` in multithreaded mode reads in chunks of games of size `batchSize` and starts the analysis of this chunk in a different thread. While the other thread parses and analyzes the games, the next chunk is read-in from the PGN file in the main thread in parallel. Every time the defined count of games has been read in, chessalyzer.js checks if any of the previously started threads is ready to analyze new data. If no free thread is found a new thread is started.

### Forcing single threaded mode

To use singlethreaded mode in which the games are read in and analyzed sequentially on a single thread, simply pass `null` as the 3rd argument into analyzePGN(...).

##### Important

To use a custom tracker with your multithreaded analysis please see the important notes at the [Custom Trackers](#custom-trackers) section.

# Heatmap generation functions

The function you create for heatmap generation gets passed up to four parameters (inside `generateHeatMap(...)`):

1. `data`: The data that is the basis for the heatmap. Per default this data is the Tracker you called the `generateHeatMap(...)` function from itself.
2. `loopSqrData`: Contains informations about the square the current heatmap value shall be calculated for. The `generateHeatMap(...)` function loops over every square of the board to calculate a heat map value for each tile. `sqrData` is an object with the following entries:

    ```typescript
    interface SquareData {
        // The square in algebraic notation (e.g. 'a2').
        alg: string;

        // The square in board coordinates (e.g. [6,0]).
        coords: number[];

        // The piece that starts at the passed square. If no piece starts at the passed square, piece is null.
        piece: {
            // Name of the piece (e.g. 'Pa' for the a-pawn).
            color: string;
            // Color of the piece ('b' or 'w').
            name: string;
        };
    }
    ```

3. `sqrData`: Contains informations about the square you passed into the `generateHeatMap()` function. The structure of `sqrData` is the same as of `loopSqrData`. You'll need this for extracting the values for the square / piece you are interested in. For example if you want to generate a heatmap for white's a pawn, the square for `sqrData` would be 'a2' (= starting position of the white a pawn).

4. `optData`: Optional data you may need in this function. For example, if you wanted to generate a heatmap to show the average position of a piece after X moves, you could pass that 'X' here.

# Tracked statistics

## Built-in

chessalyzer.js comes with three built-in trackers, which can be directly imported into your script:

`GameTracker`:

-   `result`
    An object which counts the results of the tracked games. Contains the keys `white`, `draw` and `black`

-   `ECO`
    Counts the ECO keys of the processed games. `ECO` is an object that contains the different keys, for example 'A00'.

-   `cntGames`  
    Number of games processed

`PieceTracker`:

-   `b`  
    Blacks pieces. Tracks how often a specific black piece took a specific white piece. E.g. `b.Pa.Qd` tracks how often the black a-pawn took whites queen.

-   `w`  
    Same for whites pieces.

`TileTracker`:

-   `tiles[][]`  
    Represents the tiles of the board. Has two objects (`b`, `w`) on the first layer, and then each piece inside these objects as a second layer (`Pa`, `Ra` etc.). For each piece following stats are tracked:

    -   `movedTo`: How often the piece moved to this tile
    -   `wasOn`: Amount of half-moves the piece was on this tile
    -   `capturedOn`: How often the piece captured another piece on this tile
    -   `wasCapturedOn`: How often the piece was captured on this tile

    These stats are also tracked for black and white as a whole. Simply omit the piece name to get the total stats of one side for a specific tile, e.g. `tiles[0][6].b.wasOn`.

-   `cntMovesTotal`: Amount of moves processed in total.

## Custom Trackers

If you want to have other stats tracked you can easily create a custom tracker. You must derive your tracker from the `BaseTracker` class.

Your tracker also must have the following properties:

-   `type`:  
    The type of your tracker. Either move based (`this.type = 'move'`) or game based (`this.type = 'game'`).

-   `path`:
    Variable which contains the path of the file your custom tracker is defined in. You can use `this.path = import.meta.url;` for this. Your Tracker MUST be defined in a separate file and it must be the only object that is exported from that file. Background: Since the data passed to the worker thread is serialized first, you can't pass non-primitive types to the worker. So the library dynamically imports the Custom Tracker provided in the path variable into the Worker Thread. In there the Tracker will be instantiated as normal. (If you happen to know a better way for passing classes into a worker thread, let me know. The current solution is a bit hacky but it works.)

-   `track(data)`:  
     The main analysis function that is called during the PGN processing. Depending on your `type` the function is called after every half-move (move-typed trackers) or after every game (game-typed trackers). The `data` object contains the following properties:

    -   For move-typed trackers: An `Action` array with one or more entries of the following action types:

        ```typescript
        type Action = MoveAction | CaptureAction | PromoteAction;

        interface BaseAction {
            type: 'move' | 'capture' | 'promote';
            san: string; // special tokens like [?!#+] are not included here
            player: 'b' | 'w';
        }

        interface MoveAction extends BaseAction {
            type: 'move';
            piece: string;
            from: number[];
            to: number[];
        }

        interface CaptureAction extends BaseAction {
            type: 'capture';
            takingPiece: string;
            takenPiece: string;
            on: number[];
        }

        interface PromoteAction extends BaseAction {
            type: 'promote';
            to: string;
            on: number[];
        }
        ```

        If e.g. a piece captures another piece this array will contain a `CaptureAction` and a `MoveAction`

    -   For game-typed trackers:
        `data` is an object that contains `{key: value}` entries, where `key` is the property in the header of the PGN (e.g. `'WhiteElo'`, case sensitive) and `value` is the respective value of the property. The property `data.moves` is an array that contains the moves of the game in standard algebraic notation.

-   `add(tracker)`:
    Function that is only required for multithreading. This function gets passed a Tracker object of the same type. In the function you need to define how the statistics of two trackers are added together. For example the add(...) function for the built-in Game Tracker looks like this:

    ```javascript
    add(tracker) {
        this.results.white += tracker.results.white;
        this.results.black += tracker.results.black;
        this.results.draw += tracker.results.draw;
        this.cntGames += tracker.cntGames;
        this.time += tracker.time;
    }
    ```

-   `nextGame()` (opt.):
    Optional method that is called for move-type trackers after the last move of every game. You can use this to do end-of-game stuff inside your tracker, like storing and resetting statistics for the current game.

-   `finish()` (opt.):
    Optional method that is called when all games have been processed. Can be used for example to clean up or sort the data in the tracker.

-   `heatmapPresets` (opt.): If you want to predefine heatmap analysis functions for your custom tracker you can call by name instead of passing a function, `this.heatmapPresets` can be overriden with an object, in which the keys are the names of the presets.
    ```javascript
        this.heatmapPresets = {
            MY_FIRST_HEATMAP_FUNC: {
                name: 'My first Heatmap func',
                description: 'all keys beside the "calc" key are optional',
                calc: (data, loopSqrData, sqrData) => return 123
            },
            ANOTHER_HEATMAP_FUNC: {
                calc: (...)
            }
        }
    ```

# Heatmap Presets

Instead of defining your own heatmap function you can also use the heatmap presets chessalyzer.js provides you via the Tile and Piece Trackers. You can access those presets by passing the SHORT_NAMEs of the following table as your first argument in `generateHeatmap(...)`, e.g. `<yourTileTrackerInstance>.generateHeatmap('TILE_OCC_BY_PIECE', 'a2')`.

### Tile Tracker

| Short Name          | Long Name                         | Scope         | Description                                                                                                                                                                           |
| ------------------- | --------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TILE_OCC_ALL        | Tile Occupation All               | global        | Calculates how often each tile of the board had any piece on it (as a percentage of all moves)                                                                                        |
| TILE_OCC_WHITE      | Tile Occupation (White Pieces)    | global        | Calculates how often each tile of the board had a white piece on it (as a percentage of all moves)                                                                                    |
| TILE_OCC_BLACK      | Tile Occupation (Black Pieces)    | global        | Calculates how often each tile of the board had a black piece on it (as a percentage of all moves)                                                                                    |
| TILE_CAPTURE_COUNT  | Tile Capture Count                | global        | Count of Pieces that were captured on each tile.                                                                                                                                      |
| TILE_OCC_BY_PIECE   | Tile Occupation for selected Tile | Tile specific | Calculates how often the passed tile was occupated by each piece on the board. The values are shown at the starting position of each piece.                                           |
| PIECE_MOVED_TO_TILE | Target squares for selected Piece | Tile specific | Shows how often the piece that starts at the selected tile moved to each tile of the board. Only makes sense for tiles with a piece on it at the start of the game (Rank 1,2,7 and 8) |

### Piece Tracker

| Short Name        | Long Name | Scope          | Description                                                                                                                                                  |
| ----------------- | --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PIECE_CAPTURED_BY |           | Piece specific | Shows how often the piece that starts at the passed tile was captured by other pieces. The values are shown at the starting position of each opposing piece. |
| PIECE_CAPTURED    |           | Piece specific | Shows how often the piece that starts at the passed tile captured other pieces. The values are shown at the starting position of each opposing piece.        |

# Visualisation

For a quick preview you can put your heatmap data into `Chessalyzer.printHeatmap(...)` to see your heatmap in the terminal if it supports color:

<img src="https://i.imgur.com/THV7gwY.png" width="40%">

But generally chessalyzer.js only provides the raw data of the analyses (yet? :)). If you want to visualize the data you will need a separate library. The following examples were created with my fork of [chessboard.js](https://github.com/PeterPain/heatboard.js) with added heatmap functionality.

White tile occupation  
<img src="https://i.imgur.com/2naX1mg.png" width="30%">

Moves of whites e pawn  
<img src="https://i.imgur.com/ATivf7i.png" width="30%">

Difference of whites tiles occupation between a higher (green) and a lower rated (red) player  
<img src="https://i.imgur.com/tZVkPs3.png" width="30%">
