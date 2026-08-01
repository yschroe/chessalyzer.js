import { describe, it, expect } from 'bun:test';

import { TrackerHost } from '#core/tracker-host';
import { createWorkerResultHandler, mergeWorkerTrackerFlush } from '#core/tracker-merge';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { GameProcessorAnalysisConfigFull } from '#types/analysis-runtime';
import type { WorkerMessage } from '#types/worker';
import CustomGameTracker from '~/test/fixtures/custom-game-tracker';
import { isCustomGameTrackerState, isTileTrackerState } from '~/test/helpers/tracker-state';

function baseConfig(
    overrides?: Partial<GameProcessorAnalysisConfigFull>,
): GameProcessorAnalysisConfigFull {
    return {
        config: {
            hasFilter: false,
            filter: () => true,
            maxGames: Infinity,
        },
        trackerData: [],
        readGames: 0,
        isDone: false,
        trackerHost: new TrackerHost([]),
        processedMoves: 0,
        processedGames: 0,
        skippedGames: 0,
        errors: [],
        replayMode: 'skip',
        ...overrides,
    };
}

describe('tracker merge', () => {
    describe('TileTracker.merge', () => {
        it('sums counters and tile stats from a partial batch', () => {
            const tileTracker = new TileTracker();
            const mainHost = new TrackerHost([tileTracker]);
            const batchHost = new TrackerHost([tileTracker]);

            const mainState = mainHost.moveEntries[0]?.state;
            const batchState = batchHost.moveEntries[0]?.state;
            if (!isTileTrackerState(mainState) || !isTileTrackerState(batchState)) {
                throw new Error('expected tile tracker state');
            }

            mainState.movesTotal = 10;
            batchState.movesTotal = 7;
            mainState.tiles[4][4].w.movedTo = 3;
            batchState.tiles[4][4].w.movedTo = 2;

            mainHost.mergeSnapshots(batchHost.snapshots());

            expect(mainState.movesTotal).toBe(17);
            expect(mainState.tiles[4][4].w.movedTo).toBe(5);
        });
    });

    describe('CustomGameTracker.merge', () => {
        it('sums wins and game counts from a partial batch', () => {
            const customTracker = new CustomGameTracker();
            const mainHost = new TrackerHost([customTracker]);
            const batchHost = new TrackerHost([customTracker]);

            const mainState = mainHost.gameEntries[0]?.state;
            const batchState = batchHost.gameEntries[0]?.state;
            if (!isCustomGameTrackerState(mainState) || !isCustomGameTrackerState(batchState)) {
                throw new Error('expected custom game tracker state');
            }

            mainState.wins = [2, 1, 3];
            mainState.games = 6;
            batchState.wins = [1, 0, 2];
            batchState.games = 3;

            mainHost.mergeSnapshots(batchHost.snapshots());

            expect(mainState.wins).toEqual([3, 1, 5]);
            expect(mainState.games).toBe(9);
        });
    });

    describe('createWorkerResultHandler', () => {
        it('routes result.error to onFatal', () => {
            const cfg = baseConfig();
            let fatal: Error | undefined;

            const handler = createWorkerResultHandler([cfg], (err) => {
                fatal = err;
            });

            const result: WorkerMessage = {
                results: [],
                error: 'Unknown tracker "DoesNotExist"',
            };

            handler(null, result);

            expect(fatal).toBeInstanceOf(Error);
            expect(fatal?.message).toBe('Unknown tracker "DoesNotExist"');
        });

        it('merges worker batch counters without tracker state', () => {
            const customTracker = new CustomGameTracker();
            const cfg = baseConfig({
                trackerHost: new TrackerHost([customTracker]),
                config: { hasFilter: false, filter: () => true, maxGames: 10 },
            });

            const handler = createWorkerResultHandler([cfg], () => {
                throw new Error('onFatal should not run');
            });

            handler(null, {
                results: [
                    {
                        idxConfig: 0,
                        games: 2,
                        moves: 40,
                    },
                ],
            });

            expect(cfg.processedGames).toBe(2);
            expect(cfg.processedMoves).toBe(40);
            const state = cfg.trackerHost.gameEntries[0]?.state;
            if (!isCustomGameTrackerState(state)) {
                throw new Error('expected custom game tracker state');
            }
            expect(state.games).toBe(0);
        });

        it('merges multi-config batch results', () => {
            const trackerA = new CustomGameTracker();
            const trackerB = new CustomGameTracker();

            const cfgA = baseConfig({
                trackerHost: new TrackerHost([trackerA]),
            });
            const cfgB = baseConfig({
                trackerHost: new TrackerHost([trackerB]),
            });

            const handler = createWorkerResultHandler([cfgA, cfgB], () => {
                throw new Error('onFatal should not run');
            });

            handler(null, {
                results: [
                    { idxConfig: 0, games: 1, moves: 10 },
                    { idxConfig: 1, games: 2, moves: 20 },
                ],
            });

            expect(cfgA.processedGames).toBe(1);
            expect(cfgB.processedGames).toBe(2);
        });
    });

    describe('mergeWorkerTrackerFlush', () => {
        it('merges tracker state without touching counters', () => {
            const tileTracker = new TileTracker();
            const workerTracker = new TileTracker();
            const mainHost = new TrackerHost([tileTracker]);
            const workerHost = new TrackerHost([workerTracker]);

            const workerState = workerHost.moveEntries[0]?.state;
            if (!isTileTrackerState(workerState)) {
                throw new Error('expected tile tracker state');
            }
            workerState.movesTotal = 12;
            workerState.tiles[0][0].w.movedTo = 4;

            const cfg = baseConfig({
                trackerHost: mainHost,
                processedGames: 50,
                processedMoves: 500,
            });

            mergeWorkerTrackerFlush([cfg], {
                results: [
                    {
                        idxConfig: 0,
                        games: 0,
                        moves: 0,
                        trackerSnapshots: workerHost.snapshots(),
                    },
                ],
            });

            const mainState = mainHost.moveEntries[0]?.state;
            if (!isTileTrackerState(mainState)) {
                throw new Error('expected tile tracker state');
            }
            expect(cfg.processedGames).toBe(50);
            expect(cfg.processedMoves).toBe(500);
            expect(mainState.movesTotal).toBe(12);
            expect(mainState.tiles[0][0].w.movedTo).toBe(4);
        });
    });
});
