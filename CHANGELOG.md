# Changelog

## [Unreleased]

### Ideas

-   Do not create numThreads workers on init of the workerpool, but dynamically if needed.
-   Send tracker config only once on init of the worker pool
-   Do not send result back to main thread every time a chunk was processed, but only once at the end.

## [3.0.6] - 2024-03-17

### Changes

-   Internal: Switched to typed arrays for storing the board state. Boosts performance by around 5-10%.

## [3.0.5] - 2023-07-02

### Fixed

-   Further optimized PGN parsing.

## [3.0.4] - 2023-07-01

### Fixed

-   Fixed comments like `{ (0.00 → -0.67) Inaccuracy. h5 was best. }` in the PGN file breaking the parser.

## [3.0.3] - 2023-07-01

### Fixed

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

-   Build-process only: Removed rollup as a bundler. Code is split up into multiple files and uses import/export statements. Results in a smaller bundle size since the Processor.worker.js does not need to include the whole library anymore.

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
-   Changed the data structure of the move data passed into the trackers.
-   Ported code base to TypeScript.

## [1.6.4] - xxxx-xx-xx

### Fixed

-   Fix d.ts for Tracker constructors.

## [1.6.3] - xxxx-xx-xx

### Added

-   Added d.ts files.

## [1.6.2] - xxxx-xx-xx

### Changed

-   Shipping the minified versions in the bundle.

## [1.6.1] - xxxx-xx-xx

### Fixed

-   Fixed `generateComparisonHeatmap(...)`.

## [1.6.0] - xxxx-xx-xx

### Changed

-   Switched from line-by-line package to node.js native readline module. Makes read-in even faster now.
-   Changed import scheme from `const Chessalyzer = require('chessalyzer.js');` to `const { Chessalyzer, Tracker} = require('chessalyzer.js');`.

## [1.5.1] - xxxx-xx-xx

### Fixed

-   Fixed bug in PGN Parser.

## [1.5.0] - xxxx-xx-xx

### Added

-   Added `printHeatmap(...)` function to print a heatmap to the console.
-   Interaction with promoted pawns is now tracked.
-   Trackers can now have a cfg attribute which is passed to the workers in multicore mode. profilingActive is now cfg.profilingActive for the trackers.

### Changed

-   `generateHeatmap(...)` and `generateComparisonHeatmap(...)` now return an object instead of an array.
-   Simplified the internal SAN parsing logic by tracking the piece positions at all times. Results in a slight speed increase.

### Fixed

-   Fixed Trackers not tracking time in multicore mode.

## [1.4.1] - xxxx-xx-xx

### Changed

-   Updated dependencies.

## [1.4.0] - xxxx-xx-xx

### Added

-   Added ECO key tracking to the GameTrackerBase class.
-   Added optional finish() method that is called on the trackers after all games have been processed.

## [1.3.2] - xxxx-xx-xx

-   Fixed bug in the `Tracker.Tile` class. The `cntMovesTotal` property wasn't incremented correctly when using multithreading.

## [1.3.1] - xxxx-xx-xx

### Changed

-   Removed unnecessary files from the npm package (like docs, test, etc.).

## [1.3.0] - xxxx-xx-xx

### Changed

-   Moved the worker-thread logic into a separate file instead of cloning the entire process for multi threading. This should make it easier to include chessalyzer.js in other projects, for example a REST server. Prior this change with active multithreading every time a new worker thread was created the whole server was cloned.

### Fixed

-   Fixed the minified (chessalyzer.min.js) version to not throw unjustified errors, that the Trackers need to include a track() function.

## [1.2.1] - xxxx-xx-xx

### Fixed

-   Fixed bug with multithreading and fully read files. The last chunk wasn't processed before.

## [1.2.0] - xxxx-xx-xx

### Changed

-   Significantly increased performance for multithreading.

## [1.1.0] - xxxx-xx-xx

### Added

-   Added Multithreading.

## [1.0.1] - xxxx-xx-xx

### Added

-   The Promise returned by the startBatch function now contains the number of processed games and moves.

### Changed

-   Moved the performance tracking for the Trackers into the Tracker.Base class.

## [1.0.0] - xxxx-xx-xx

### Added

-   Significantly changed the API to allow for more modularity. If you are already using an older version (<=0.4.0) consider changing your code to adapt to the new API.
