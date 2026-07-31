<img src="https://i.imgur.com/X7Q2xIx.png" style="height: 150px">

A JavaScript library for batch analyzing chess games.

[![npm version](https://badge.fury.io/js/chessalyzer.js.svg)](https://badge.fury.io/js/chessalyzer.js)

# Index

- [Features](#features)
- [Installation](#installation)
- [How it works](#how-it-works)
- [Pipeline](#pipeline)
- [Examples](#examples)
    - [Basic Usage](#basic-usage)
    - [Filtering](#filtering)
    - [Compare Analyses](#compare-analyses)
    - [Multithreading](#multithreaded-analysis)
    - [Error handling](#error-handling)
- [Heatmap analysis functions](#heatmap-analysis-functions)
- [Tracked statistics](#tracked-statistics)
    - [Built-in](#built-in)
    - [Custom Tracker](#custom-trackers)
- [Heatmap presets](#heatmap-presets)
- [Visualisation](#visualisation)

# Features

- Batch process PGN files and track statistics of your games
- Filter games (e.g. only analyze games where WhiteElo > 1800)
- Fully modular, track only the stats you need to preserve performance
- Generate heatmaps out of the generated data
- It's fast and highly parallelized: Processes ~20M moves/s on an Apple M1 (PGN parse only; no board replay or validation)
- Handles big files easily
- Zero production dependencies

# Installation

1. Install package

```sh
npm install chessalyzer.js
```

2. Import the library:

```javascript
import { analyzePGN, printHeatmap } from 'chessalyzer.js';
import { TileTracker } from 'chessalyzer.js/trackers';
```

3. Use the library. See next chapters for examples.

```javascript
const result = await analyzePGN('<pathToPgnFile>', { trackers: [new TileTracker()] });
console.log(result.gameCount, result.moveCount, result.movesPerSecond);
```

4. Check out the examples or the [docs](https://yschroe.github.io/chessalyzer.js/).

# How it works

Give chessalyzer.js a PGN file and it takes care of the boring parts: reading the file, understanding each game, and replaying every move on an internal board. Along the way, your trackers collect exactly the statistics you asked for — nothing more, which is what keeps it fast. When the run finishes, the results are right where you left them: on the tracker instances you passed in.

The main entry points are `analyzePGN` (batch analysis) and `printHeatmap` (a quick terminal preview). Move trackers receive per-move data; game trackers receive header fields like player names and ratings. See [Pipeline](#pipeline) if you want to dig into the stages.

# Pipeline

Every PGN file goes through four steps:

1. **I/O** — read the file from disk (as lines, or as byte-sized chunks in multithreaded mode).
2. **PGN parse** — extract headers, mainline move strings (SAN), and game results. No board involved yet — this is the fastest step if you just want the raw game data.
3. **Replay** — decode each SAN string and play it on an internal board. Needed whenever your trackers care about _where_ pieces are, not just _what_ was played.
4. **Analyze** — run your trackers and accumulate statistics.

When people say "PGN parser," they usually mean step 2 only. Turning a file into actual legal moves takes **PGN parse + replay**.

```mermaid
flowchart TB
    subgraph io ["1. I/O"]
        A[Read file]
    end
    subgraph pgn ["2. PGN parse"]
        B[Headers + SAN strings + result]
    end
    subgraph replay ["3. Replay"]
        E[Decode moves and play on board]
    end
    subgraph analyze ["4. Analyze"]
        G[Your trackers]
    end
    A --> B --> E --> G
```

You can stop after PGN parse if you do not need board replay, or run the full pipeline with `analyzePGN`:

```javascript
import { analyzePGN } from 'chessalyzer.js';
import { parsePGN, streamParsePGN } from 'chessalyzer.js/pgn';
import { GameTracker } from 'chessalyzer.js/trackers';

// Just the games — no board replay
const games = await parsePGN('<pathToPgnFile>', { headers: true, maxGames: 100 });
// games[0].moves — mainline {@link ParsedMove} objects (`move.san` is the SAN token)

// Same, but one game at a time (easier on memory for huge files)
for await (const game of streamParsePGN('<pathToPgnFile>', { headers: true })) {
    // game.moves[i].san — mainline SAN strings
}

// Full pipeline
await analyzePGN('<pathToPgnFile>', {
    trackers: [new GameTracker()],
    headers: true,
    replay: 'board', // 'skip' | 'board' | 'actions' — move trackers need 'actions'
    validation: 'trust',
});
```

Set `headers: true` when your filter reads tag pairs like `WhiteElo`. By default, headers are parsed automatically when you use a game tracker (`'auto'`).

If you want to wire up individual stages yourself, subpath imports have you covered:

```javascript
import { readLines, readPgnChunks } from 'chessalyzer.js/io';
import { parsePGN, streamParsePGN } from 'chessalyzer.js/pgn';
import { TileTracker, BaseGameTracker } from 'chessalyzer.js/trackers';
```

Count-only runs (no move trackers) skip board replay by default, which makes them noticeably faster. Benchmark scripts live in `bench/` if you want to measure things yourself.

# Examples

## Basic Usage

Let's start with a basic example. Here we simply want to track the tile occupation (=how often did each tile have a piece on it) for the whole board. For this we can use the preconfigured TileTracker class from the library. Afterwards we want to create a heatmap out of the data to visualize the tile occupation. For this basic heatmap a preset is also provided:

```javascript
import { analyzePGN, printHeatmap } from 'chessalyzer.js';
import { TileTracker } from 'chessalyzer.js/trackers';

const tileTracker = new TileTracker();

const result = await analyzePGN('<pathToPgnFile>', { trackers: [tileTracker] });

const heatmapData = tileTracker.generateHeatmap('TILE_OCC_ALL');

printHeatmap(heatmapData);
```

## Filtering

You can filter games with a plain JavaScript function — for example, only analyze games where `WhiteElo > 2000` (set `headers: true` when your filter reads tag pairs):

```javascript
await analyzePGN('<pathToPgnFile>', {
    workers: false,
    trackers: [tileTracker],
    headers: true,
    filter: (game) => Number(game.headers?.WhiteElo) > 2000,
});
```

Filters are regular JS callbacks, so they need to run on the main thread. Pass `workers: false` when you use a filter — the library will let you know if you forget.

## Compare Analyses

You can also generate a comparison heat map where you can compare the data of two different analyses. Let's say you wanted to compare how the white player occupates the board between a lower rated player and a higher rated player. To get comparable results 1000 games of each shall be evaluated:

```javascript
const tileT1 = new TileTracker();
const tileT2 = new TileTracker();

await analyzePGN('<pathToPgnFile>', {
    workers: false,
    headers: true,
    runs: [
        {
            trackers: [tileT1],
            filter: (game) => Number(game.headers?.WhiteElo) > 2000,
            maxGames: 1000,
        },
        {
            trackers: [tileT2],
            filter: (game) => Number(game.headers?.WhiteElo) < 1200,
            maxGames: 1000,
        },
    ],
});

let func = (data, loopSqrData, _sqrData) => {
    const { square } = loopSqrData;
    const row = 7 - (square.charCodeAt(1) - 49);
    const col = square.charCodeAt(0) - 97;
    let val = data.tiles[row][col].w.wasOn;
    val = (val * 100) / data.movesTotal;
    return val;
};

// Generate the comparison heatmap.
const heatmapData = tileT1.generateComparisonHeatmap(tileT2, func);

// Use heatmapData.
```

## Multithreaded analysis

By default, chessalyzer.js uses Node.js [Worker Threads](https://nodejs.org/api/worker_threads.html) to read and analyze your PGN in parallel. You do not need to configure anything — it just works:

```javascript
await analyzePGN('<pathToPgnFile>', {
    trackers: [tileTracker],
    maxGames: 10000,
    workers: { targetBytes: 4 * 1024 * 1024 },
});
```

The `workers` option lets you tune chunk size if you want; the defaults are fine for most files.

### Single-threaded mode

If you need everything on the main thread (for example when using a `filter`), pass `workers: false`:

```javascript
await analyzePGN('<pathToPgnFile>', { workers: false });
```

## Error handling

What happens when a game in your file has a broken or illegal move? You have two choices.

**Stop immediately** (the default) — great while developing or on small, trusted files. The run throws on the first replay failure, and you can inspect exactly which game and move caused it:

```javascript
import { analyzePGN, getAnalyzeError, isReplayError } from 'chessalyzer.js';

try {
    await analyzePGN('<pathToPgnFile>');
} catch (err) {
    const analyzeError = getAnalyzeError(err);
    if (isReplayError(analyzeError)) {
        console.error(
            `Game ${analyzeError.gameIndex}, move ${analyzeError.moveIndex}: ${analyzeError.san}`,
        );
    }
    throw err;
}
```

**Skip bad games and keep going** — better for large batch runs over mostly good data (like Lichess database dumps):

```javascript
const result = await analyzePGN('<pathToPgnFile>', { onError: 'skip-game' });
console.log(result.gameCount, result.skippedGames, result.errors, result.errorsTruncated);
```

`result.errors` holds up to 100 typed replay errors (`gameIndex`, `moveIndex`, `san`, `reason`). If more than 100 games fail, `result.errorsTruncated` is `true`. The library never logs to the console for you — you decide what to do with the errors.

Replay assumes trustworthy PGN by default (`validation: 'trust'`).

##### Important

To use a custom tracker with your multithreaded analysis please see the important notes at the [Custom Trackers](#custom-trackers) section.

# Heatmap generation functions

The function you create for heatmap generation gets passed up to four parameters (inside `generateHeatmap(...)`):

1. `data`: The data that is the basis for the heatmap. Per default this data is the Tracker you called the `generateHeatmap(...)` function from itself.
2. `loopSqrData`: Information about the square the current heatmap value is calculated for. The `generateHeatmap(...)` function loops over every square of the board. `loopSqrData` has this shape:

    ```typescript
    import type { Square, SquareData } from 'chessalyzer.js/trackers';

    interface SquareData {
        // Interned algebraic square (e.g. 'a2').
        square: Square;

        // Starting piece on this square, or null when the square is empty initially.
        piece: {
            name: string; // e.g. 'Pa' for the a-pawn
            color: 'b' | 'w';
        } | null;
    }
    ```

3. `sqrData`: Contains informations about the square you passed into the `generateHeatmap()` function. The structure of `sqrData` is the same as of `loopSqrData`. You'll need this for extracting the values for the square / piece you are interested in. For example if you want to generate a heatmap for white's a pawn, the square for `sqrData` would be 'a2' (= starting position of the white a pawn).

4. `optData`: Optional data you may need in this function. For example, if you wanted to generate a heatmap to show the average position of a piece after X moves, you could pass that 'X' here.

# Tracked statistics

## Built-in

chessalyzer.js comes with three built-in trackers, which can be directly imported into your script:

`GameTracker`:

- `results`
  An object which counts the results of the tracked games. Contains the keys `white`, `draw` and `black`

- `ECO`
  Counts the ECO keys of the processed games. `ECO` is an object that contains the different keys, for example 'A00'.

- `games`  
  Number of games processed

`PieceTracker`:

- `b`  
  Blacks pieces. Tracks how often a specific black piece took a specific white piece. E.g. `b.Pa.Qd` tracks how often the black a-pawn took whites queen.

- `w`  
  Same for whites pieces.

`TileTracker`:

- `tiles[][]`  
  Represents the tiles of the board. Has two objects (`b`, `w`) on the first layer, and then each piece inside these objects as a second layer (`Pa`, `Ra` etc.). For each piece following stats are tracked:
    - `movedTo`: How often the piece moved to this tile
    - `wasOn`: Amount of half-moves the piece was on this tile
    - `capturedOn`: How often the piece captured another piece on this tile
    - `wasCapturedOn`: How often the piece was captured on this tile

    These stats are also tracked for black and white as a whole. Simply omit the piece name to get the total stats of one side for a specific tile, e.g. `tiles[0][6].b.wasOn`.

- `movesTotal`: Amount of moves processed in total.

## Custom Trackers

Want to track something the built-ins do not cover? Create your own tracker by extending `MoveTracker` (per-move stats) or `BaseGameTracker` (per-game stats like results or ECO codes).

For single-threaded analysis, implement `trackMoves` or `trackGame` and you are done. For multithreading, you need three small extras:

1. Put the tracker in its **own module** with a **default export** (zero-arg constructor).
2. Add **`static trackerId = 'YourUniqueId'`** and **`static workerModule = import.meta.url`** so workers can find and load your class.
3. Implement **`merge(tracker)`** to add the worker's batch stats into yours. The argument is a plain object after structured clone — duck-type it (`unknown`); do **not** use `instanceof`. Framework-owned fields such as `time` are merged centrally — your `merge` only needs to combine your own stats.

**Multithreaded environments:** `static workerModule = import.meta.url` requires an unbundled Node ≥ 22 or Bun runtime (bundlers may rewrite `import.meta.url`).

**Move trackers:** `SanDecoder` returns a reused `Action[]` buffer each half-move. Copy fields you need to retain across moves; scalar fields (`san`, `piece`, …) are overwritten on the next decode. Override **`onGameEnd()`** for per-game flush hooks (called after each game, including skipped games).

See [`manual-tests/custom-game-tracker.ts`](manual-tests/custom-game-tracker.ts) for a minimal working example.

Heads-up on castling: it produces two move actions (king leg, then rook leg) in one batch. The rook leg carries the same `castle` flag. `TileTracker` counts castling as one move for `movesTotal`; your move tracker can skip rook legs via `action.castle` on the second leg.

Example skeleton:

```javascript
export default class MyTracker extends BaseGameTracker {
    static trackerId = 'MyTracker';
    static workerModule = import.meta.url;

    merge(tracker) {
        /* add tracker.games, tracker.results, etc. into this */
    }
    trackGame(game) {
        /* called once per game */
    }
}
```

Import bases and types from their canonical subpaths (each symbol has one export home):

```javascript
import type { GameFilter } from 'chessalyzer.js';
import type { ParsedGame, ParsedMove } from 'chessalyzer.js/pgn';
import type {
    Action,
    BaseAction,
    CaptureAction,
    MoveAction,
    PlayerColor,
    PromoteAction,
    Square,
} from 'chessalyzer.js/replay';
import {
    BaseGameTracker,
    MoveTracker,
    type HeatmapAnalysisFunc,
    type HeatmapPresetEntry,
    type MoveCoords,
    type SquareData,
    type Tracker,
    type TrackerConfig,
} from 'chessalyzer.js/trackers';
```

Here is how the built-in `GameTracker` merges worker results:

```javascript
merge(tracker) {
    this.results.white += tracker.results.white;
    this.results.black += tracker.results.black;
    this.results.draw += tracker.results.draw;
    this.games += tracker.games;
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

For a quick preview you can put your heatmap data into `printHeatmap(...)` to see your heatmap in the terminal if it supports color:

<img src="https://i.imgur.com/THV7gwY.png" width="40%">

But generally chessalyzer.js only provides the raw data of the analyses (yet? :)). If you want to visualize the data you will need a separate library. The following examples were created with my fork of [chessboard.js](https://github.com/PeterPain/heatboard.js) with added heatmap functionality.

White tile occupation  
<img src="https://i.imgur.com/2naX1mg.png" width="30%">

Moves of whites e pawn  
<img src="https://i.imgur.com/ATivf7i.png" width="30%">

Difference of whites tiles occupation between a higher (green) and a lower rated (red) player  
<img src="https://i.imgur.com/tZVkPs3.png" width="30%">
