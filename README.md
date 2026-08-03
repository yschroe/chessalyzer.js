# ♟️ Chessalyzer

A JavaScript library for batch-analyzing chess PGN files — parse games, replay moves, and collect statistics with modular trackers.

> **Previously published as [`chessalyzer.js`](https://www.npmjs.com/package/chessalyzer.js)** through v3. From v4 onward the package name is `chessalyzer`.

[![npm version](https://badge.fury.io/js/chessalyzer.svg)](https://badge.fury.io/js/chessalyzer)

## Documentation

Guides for installation, basic usage, the analysis pipeline, built-in and custom trackers, heatmaps, filtering, multithreading, error handling, and more can be found in the **[Documentation](https://yschroe.github.io/chessalyzer/)**.

## Installation

```sh
npm install chessalyzer
```

Requires Node ≥ 22 or Bun.

## Getting started

```javascript
import { analyzePGN, printHeatmap } from 'chessalyzer';
import { tileTracker, generateHeatmap, TileHeatmapPresets } from 'chessalyzer/trackers';

const tiles = tileTracker();

await analyzePGN('<pathToPgnFile>', { trackers: [tiles] });

const heatmap = generateHeatmap(tiles.state, TileHeatmapPresets.TILE_OCC_ALL);

printHeatmap(heatmap);
```

For filtering, comparison runs, custom trackers, and everything else, see the [documentation](https://yschroe.github.io/chessalyzer/).
