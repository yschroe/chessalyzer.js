# Changelog

## [Unreleased]

-   Nothing.

## [3.0.4] - 2023-07-01

### Fixed

-   Fixed comments like `{ (0.00 → -0.67) Inaccuracy. h5 was best. }` in the PGN file breaking the parser.

## [3.0.3] - 2023-07-01

### Changed

-   Optimized PGN parsing Regexes. Results in another 15% performance boost.

## [3.0.2] - 2023-06-25

### Changed

-   Removed unused files from the package.

## [3.0.1] - 2023-06-25

### Changed

-   Made package importable in non-ESM environments. Running processPGN(...) still requires ESM.

## [3.0.0] - 2023-05-31

### Changed

-   Restructured the return value of the move parser. Now an array of different `Action` types is returned to easier differentiate between actions like 'Move' or 'Capture'. Previously all possible actions were included in the single `MoveData` object. Your custom move trackers will need to be adapted.
-   Built-in trackers must now be imported separately (`TileTracker`, `PieceTracker`, `GameTracker`) instead of importing just the `Tracker` object.
-   Switched from the `Cluster` to the `Worker Thread` module for multithreading which results in a big performance boost.
-   Streamlined naming schema of variables. Variables which contained `kill` or `takes` before, are now called `capture`.
-   Various other performance improvements and code simplifications.

## [2.2.0] - 2022-05-29

### Changed

-   (Build-process only: Removed rollup as a bundler. Code is split up into multiple files and uses import/export statements. Results in a smaller bundle size since the Processor.worker.js does not need to include the whole library anymore.)

## [2.1.0] - 2022-05-28

### Changed

-   The count of additional needed threads in multithreaded mode is now determined dynamically. Instead of starting a new thread every time new games have been read in, chessalyzer.js now tries to reuse already started threads. This removes the overhead of needing to create a new worker thread every time, which results in a huge performance boost (around +25%).

### Removed

-   As a result `nThreads` in the multithread config argument of `Chessalyzer.analyzePGN(...)` is now deprecated and is no longer used.

## [2.0.0] - 2021-12-20

### Added

-   Added support for PGN files in which the game moves are listed in multiple lines instead of one single line
-   You can now run different filters in parallel. For example you could configure chessalyzer.js in a way that Tracker1 tracks only PlayerA's games and Tracker2 tracks only PlayerB's games during the same run of analyzePGN(...). Before you needed to start two separate analyses with the different Trackers and filter settings.

### Changed

-   Chessalyzer.js is now an ES module (ESM). See [this guide](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c#file-esm-package-md) for how to use this package.
-   runBatch(...) and runBatchMulticore(...) were merged into the single function analyzePGN(...). Per default the function will run in multithreaded mode, but you can override the config to force singlethreaded mode if it is needed in your environment.
-   The heatmap generation functions have been moved into the Tracker objects.
-   Changed the data structure of the move data passed into the analyzers.
-   Ported code base to TypeScript.
