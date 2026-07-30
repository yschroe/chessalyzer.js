import { describe, it, expect } from 'bun:test';

import { createWorkerResultHandler, mergeWorkerTrackerFlush } from '#core/tracker-merge';
import type { BaseTracker } from '#trackers/base-tracker';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { GameProcessorAnalysisConfigFull } from '#types/analysis-runtime';
import type { WorkerMessage } from '#types/worker';

import CustomGameTracker from '../../../test/fixtures/custom-game-tracker';

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
        trackers: { move: [], game: [] },
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
            const main = new TileTracker();
            const batch = new TileTracker();

            main.movesTotal = 10;
            batch.movesTotal = 7;
            main.tiles[4][4].w.movedTo = 3;
            batch.tiles[4][4].w.movedTo = 2;

            main.merge(batch);

            expect(main.movesTotal).toBe(17);
            expect(main.tiles[4][4].w.movedTo).toBe(5);
        });
    });

    describe('CustomGameTracker.merge', () => {
        it('sums wins and game counts from a partial batch', () => {
            const main = new CustomGameTracker();
            const batch = new CustomGameTracker();

            main.wins = [2, 1, 3];
            main.games = 6;
            batch.wins = [1, 0, 2];
            batch.games = 3;

            main.merge(batch);

            expect(main.wins).toEqual([3, 1, 5]);
            expect(main.games).toBe(9);
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

        it('merges worker batch counters and tracker state', () => {
            const mainTracker = new CustomGameTracker();
            const batchTracker = new CustomGameTracker();
            batchTracker.wins = [1, 0, 1];
            batchTracker.games = 2;

            const cfg = baseConfig({
                trackers: {
                    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fixture uses built-package BaseGameTracker
                    game: [mainTracker as unknown as BaseTracker],
                    move: [],
                },
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
                        gameTrackers: [batchTracker],
                    },
                ],
            });

            expect(cfg.processedGames).toBe(2);
            expect(cfg.processedMoves).toBe(40);
            expect(mainTracker.games).toBe(2);
            expect(mainTracker.wins).toEqual([1, 0, 1]);
        });

        it('merges multi-config batch results', () => {
            const trackerA = new CustomGameTracker();
            const trackerB = new CustomGameTracker();
            const batchA = new CustomGameTracker();
            const batchB = new CustomGameTracker();
            batchA.games = 1;
            batchB.games = 2;

            const cfgA = baseConfig({
                trackers: {
                    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fixture uses built-package BaseGameTracker
                    game: [trackerA as unknown as BaseTracker],
                    move: [],
                },
            });
            const cfgB = baseConfig({
                trackers: {
                    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fixture uses built-package BaseGameTracker
                    game: [trackerB as unknown as BaseTracker],
                    move: [],
                },
            });

            const handler = createWorkerResultHandler([cfgA, cfgB], () => {
                throw new Error('onFatal should not run');
            });

            handler(null, {
                results: [
                    { idxConfig: 0, games: 1, moves: 10, gameTrackers: [batchA] },
                    { idxConfig: 1, games: 2, moves: 20, gameTrackers: [batchB] },
                ],
            });

            expect(cfgA.processedGames).toBe(1);
            expect(cfgB.processedGames).toBe(2);
            expect(trackerA.games).toBe(1);
            expect(trackerB.games).toBe(2);
        });
    });

    describe('mergeWorkerTrackerFlush', () => {
        it('merges tracker state without touching counters', () => {
            const mainTracker = new TileTracker();
            const workerTracker = new TileTracker();
            workerTracker.movesTotal = 12;
            workerTracker.tiles[0][0].w.movedTo = 4;

            const cfg = baseConfig({
                trackers: { game: [], move: [mainTracker] },
                processedGames: 50,
                processedMoves: 500,
            });

            mergeWorkerTrackerFlush([cfg], {
                results: [
                    {
                        idxConfig: 0,
                        games: 0,
                        moves: 0,
                        moveTrackers: [workerTracker],
                    },
                ],
            });

            expect(cfg.processedGames).toBe(50);
            expect(cfg.processedMoves).toBe(500);
            expect(mainTracker.movesTotal).toBe(12);
            expect(mainTracker.tiles[0][0].w.movedTo).toBe(4);
        });
    });
});
