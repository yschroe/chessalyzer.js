/**
 * Compile-only API contract tests — enforced by `bun run typecheck`.
 * Positive paths and `@ts-expect-error` guards for illegal analyzePGN options.
 */
import { analyzePGN } from '#core/analyze';
import { defineGameTracker } from '#trackers/define-tracker';
import { gameTracker } from '#trackers/game-tracker';
import { tileTracker } from '#trackers/tile/tile-tracker';

async function validSingleRun() {
    const tiles = tileTracker();
    await analyzePGN('x', { trackers: [tiles] });
    const n: number = tiles.state.movesTotal;
    return n;
}

async function validFilteredRun() {
    const tiles = tileTracker();
    await analyzePGN('x', {
        workers: false,
        trackers: [tiles],
        filter: (game) => game.result === '1-0',
    });
}

async function validMultiRun() {
    const blackWins = tileTracker();
    const whiteWins = tileTracker();
    await analyzePGN('x', {
        workers: false,
        runs: [
            { trackers: [blackWins], filter: (game) => game.result === '0-1' },
            { trackers: [whiteWins], filter: (game) => game.result === '1-0' },
        ],
    });
}

async function invalidConfigs() {
    const tiles = tileTracker();
    const games = gameTracker();

    // @ts-expect-error filter requires workers: false
    await analyzePGN('x', { trackers: [games], filter: () => true });

    // @ts-expect-error cannot set both runs and top-level trackers
    await analyzePGN('x', { runs: [{ trackers: [tiles] }], trackers: [games] });

    // @ts-expect-error runs must be non-empty
    await analyzePGN('x', { runs: [] });

    // @ts-expect-error filter in multi-run requires workers: false
    await analyzePGN('x', { runs: [{ filter: () => true, trackers: [tiles] }] });

    const noMerge = defineGameTracker({
        id: 'no-merge',
        workerModule: import.meta.url,
        init: () => ({ n: 0 }),
        track: (s) => {
            s.n += 1;
        },
        merge: () => {},
    });
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- strip merge to test MT runtime guard shape
    delete (noMerge.def as { merge?: unknown }).merge;
    // MT without merge is a runtime throw only (merge is required on the type for defineGameTracker)
    await analyzePGN('x', { trackers: [noMerge()] });
}

void validSingleRun();
void validFilteredRun();
void validMultiRun();
void invalidConfigs();
