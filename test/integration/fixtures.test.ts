import { describe, it, beforeAll, afterAll, expect } from 'bun:test';

import { analyzePGN } from 'chessalyzer';
import type { AnalyzeResult } from 'chessalyzer';
import type { ParsedGame } from 'chessalyzer/pgn';
import {
    gameTracker,
    generateHeatmap,
    pieceTracker,
    TileHeatmapPresets,
    tileTracker,
} from 'chessalyzer/trackers';

import {
    allFixtureIds,
    cleanupTmpPgns,
    fixtureExpected,
    fixturePath,
    getFixtureEntry,
    repeatPgn,
} from '~/test/helpers/fixtures';

// Integration tests against small committed PGN fixtures (test/fixtures/).
describe('Fixtures', () => {
    afterAll(async () => {
        await cleanupTmpPgns();
    });

    for (const id of allFixtureIds) {
        describe(id, () => {
            let data: AnalyzeResult;

            beforeAll(async () => {
                const entry = getFixtureEntry(id);
                data = await analyzePGN(fixturePath(id), {
                    workers: false,
                    ...entry.analyzeOptions,
                });
            });

            it('parses the expected number of games and moves', () => {
                const expected = getFixtureEntry(id).expected;
                expect(data.gameCount).toBe(expected.games);
                expect(data.moveCount).toBe(expected.moves);
                if (expected.skippedGames !== undefined) {
                    expect(data.skippedGames).toBe(expected.skippedGames);
                }
            });
        });
    }

    describe('corrupt fixture', () => {
        it('drops the incomplete trailing game', async () => {
            const data = await analyzePGN(fixturePath('corrupt'), { workers: false });
            expect(data.gameCount).toBe(1);
        });
    });

    describe('results-mix filtering', () => {
        it('limits by maxGames (single-threaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 3,
                workers: false,
            });
            expect(data.gameCount).toBe(3);
        });

        it('limits by maxGames (multithreaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 3,
            });
            expect(data.gameCount).toBe(3);
        });

        it('filters by result (single-threaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                filter: (game: ParsedGame) => game.result === '1-0',
                workers: false,
            });
            expect(data.gameCount).toBe(3);
        });

        it('rejects filter without workers: false', () => {
            return expect(
                analyzePGN(fixturePath('results-mix'), {
                    filter: (game: ParsedGame) => game.result === '1-0',
                } as unknown as import('chessalyzer').AnalyzeOptions),
            ).rejects.toThrow('filter requires workers: false');
        });

        it('combines filter and count (single-threaded)', async () => {
            const data = await analyzePGN(fixturePath('results-mix'), {
                maxGames: 2,
                filter: (game: ParsedGame) => game.result === '0-1',
                workers: false,
            });
            expect(data.gameCount).toBe(2);
        });
    });

    describe('volume via repeated fixtures', () => {
        it('processes many games from a repeated small fixture', async () => {
            const path = await repeatPgn('results-mix', 20);
            const data = await analyzePGN(path, { workers: false });
            expect(data.gameCount).toBe(fixtureExpected('results-mix').games * 20);
        });

        it('keeps tracker counts consistent at scale', async () => {
            const path = await repeatPgn('results-mix', 50);
            const games = gameTracker();
            const data = await analyzePGN(path, { trackers: [games], workers: false });
            expect(data.gameCount).toBe(games.state.games);
            const resultsSum = Object.values(games.state.results).reduce((a, c) => a + c, 0);
            expect(resultsSum).toBe(data.gameCount);
        });
    });

    describe('worker-parse multi-run', () => {
        it('processes all runs without sharing detached chunk buffers', async () => {
            const expected = fixtureExpected('results-mix');
            const a = gameTracker();
            const b = gameTracker();

            const data = await analyzePGN(fixturePath('results-mix'), {
                runs: [{ trackers: [a] }, { trackers: [b] }],
            });

            expect(data.runs[0]?.gameCount).toBe(expected.games);
            expect(data.runs[1]?.gameCount).toBe(expected.games);
            expect(a.state.games).toBe(expected.games);
            expect(b.state.games).toBe(expected.games);
        });

        it('handles mixed filter and unfiltered runs in one pass', async () => {
            const all = gameTracker();
            const whiteWins = gameTracker();
            const data = await analyzePGN(fixturePath('results-mix'), {
                workers: false,
                runs: [
                    { trackers: [all] },
                    {
                        trackers: [whiteWins],
                        filter: (game: ParsedGame) => game.result === '1-0',
                    },
                ],
            });

            expect(data.runs[0]?.gameCount).toBe(fixtureExpected('results-mix').games);
            expect(data.runs[1]?.gameCount).toBe(3);
            expect(all.state.games).toBe(fixtureExpected('results-mix').games);
            expect(whiteWins.state.games).toBe(3);
        });

        it('respects per-run maxGames in multi-run', async () => {
            const capped = gameTracker();
            const full = gameTracker();
            const data = await analyzePGN(fixturePath('results-mix'), {
                runs: [{ trackers: [capped], maxGames: 2 }, { trackers: [full] }],
            });

            expect(data.runs[0]?.gameCount).toBe(2);
            expect(data.runs[1]?.gameCount).toBe(fixtureExpected('results-mix').games);
            expect(capped.state.games).toBe(2);
            expect(full.state.games).toBe(fixtureExpected('results-mix').games);
        });
    });

    describe('trackers on fixtures', () => {
        it('runs GameTracker on lichess-headers', async () => {
            const games = gameTracker();
            const data = await analyzePGN(fixturePath('lichess-headers'), {
                trackers: [games],
            });
            expect(data.gameCount).toBe(1);
            expect(games.state.games).toBe(1);
        });

        it('runs PieceTracker on promotion', async () => {
            const data = await analyzePGN(fixturePath('promotion'), {
                trackers: [pieceTracker()],
            });
            expect(data.gameCount).toBe(1);
            expect(data.moveCount).toBeGreaterThan(0);
        });
    });

    describe('TileTracker golden (en-passant)', () => {
        const golden = getFixtureEntry('en-passant').golden?.tileTracker;
        if (!golden) throw new Error('en-passant fixture missing TileTracker golden values');

        for (const [mode, workers] of [
            ['single-threaded', false],
            ['multithreaded', undefined],
        ] as const) {
            it(`matches golden values (${mode})`, async () => {
                const tiles = tileTracker();
                const data = await analyzePGN(fixturePath('en-passant'), {
                    trackers: [tiles],
                    ...(workers === false ? { workers: false } : {}),
                });

                expect(data.gameCount).toBe(1);
                expect(tiles.state.movesTotal).toBe(golden.movesTotal);
                const heat = generateHeatmap(tiles.state, TileHeatmapPresets.TILE_OCC_ALL);
                expect(heat.map[4]?.[4]).toBe(golden.e4TileOccAll);
            });
        }

        it('counts castling as one move (rook leg excluded from move counter)', async () => {
            const tiles = tileTracker();
            await analyzePGN(fixturePath('en-passant'), {
                trackers: [tiles],
                workers: false,
            });

            expect(tiles.state.movesTotal).toBe(golden.movesTotal);
            expect(tiles.state.movesTotal).toBe(fixtureExpected('en-passant').moves);
        });
    });
});
