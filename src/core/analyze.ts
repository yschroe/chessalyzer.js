import { performance } from 'node:perf_hooks';

import {
    clearInstancesInFlight,
    markInstancesInFlight,
    normalizeAnalyzeOptions,
} from '#core/analysis-config';
import { collectError, MAX_COLLECTED_ERRORS } from '#core/analyze-errors';
import GameProcessor from '#core/game-processor';
import type {
    AnalyzeOptions,
    AnalyzeResult,
    AnalyzeRun,
    AnalyzeRunResult,
    MultiRunOptions,
    MultiRunOptionsMT,
    SingleRunOptions,
} from '#types/analysis';
import type { AnalyzeError } from '#types/errors';
import type { TrackerInstance } from '#types/tracker';

function buildResultBase(
    counts: {
        games: number;
        moves: number;
        skippedGames?: number;
        errors?: AnalyzeError[];
    }[],
    durationMs: number,
): Omit<AnalyzeResult, 'runs'> {
    const gameCount = counts.reduce((sum, c) => sum + c.games, 0);
    const moveCount = counts.reduce((sum, c) => sum + c.moves, 0);
    const skippedGames = counts.reduce((sum, c) => sum + (c.skippedGames ?? 0), 0);

    const errors: AnalyzeError[] = [];
    let totalErrorCount = 0;
    for (const c of counts) {
        if (c.errors) {
            for (const err of c.errors) {
                totalErrorCount += 1;
                collectError(errors, err);
            }
        }
    }

    const result: Omit<AnalyzeResult, 'runs'> = {
        durationMs,
        gameCount,
        moveCount,
        movesPerSecond: durationMs > 0 ? Math.round(moveCount / (durationMs / 1000)) : 0,
    };

    if (skippedGames > 0) {
        result.skippedGames = skippedGames;
    }
    if (errors.length > 0) {
        result.errors = errors;
    }
    if (totalErrorCount > MAX_COLLECTED_ERRORS) {
        result.errorsTruncated = true;
    }

    return result;
}

/** Build {@link AnalyzeResult} from raw counts and duration. @internal Exported for unit tests. */
export function buildAnalyzeResult(
    counts: {
        games: number;
        moves: number;
        skippedGames?: number;
        errors?: AnalyzeError[];
    }[],
    durationMs: number,
): AnalyzeResult {
    const runs: AnalyzeRunResult[] = counts.map(({ games, moves, skippedGames, errors }) => {
        const run: AnalyzeRunResult = { gameCount: games, moveCount: moves };
        if (skippedGames !== undefined && skippedGames > 0) {
            run.skippedGames = skippedGames;
        }
        if (errors !== undefined && errors.length > 0) {
            run.errors = errors;
        }
        return run;
    });

    return { ...buildResultBase(counts, durationMs), runs };
}

type TrackerList = readonly TrackerInstance[];
type AnalyzeRunNoFilter = Omit<AnalyzeRun, 'filter'> & { filter?: never };

/**
 * Analyze a PGN file with optional trackers, filters, and worker configuration.
 *
 * Pass tracker instances from factory calls (e.g. `tileTracker()`). Accumulated
 * state is available on the same instances after the call returns (`tiles.state`).
 * The returned {@link AnalyzeResult} holds throughput and per-run counts only.
 *
 * @example
 * ```ts
 * import { analyzePGN } from 'chessalyzer';
 * import { tileTracker } from 'chessalyzer/trackers';
 *
 * const tiles = tileTracker();
 * const result = await analyzePGN('games.pgn', { trackers: [tiles] });
 * console.log(result.gameCount, tiles.state.movesTotal);
 * ```
 */
export function analyzePGN<const T extends TrackerList>(
    path: string,
    options?: SingleRunOptions<T>,
): Promise<AnalyzeResult>;
export function analyzePGN<const R extends readonly [AnalyzeRun, ...AnalyzeRun[]]>(
    path: string,
    options: MultiRunOptions<R>,
): Promise<AnalyzeResult>;
export function analyzePGN<const R extends readonly [AnalyzeRunNoFilter, ...AnalyzeRunNoFilter[]]>(
    path: string,
    options: MultiRunOptionsMT<R>,
): Promise<AnalyzeResult>;
export function analyzePGN(path: string, options?: AnalyzeOptions): Promise<AnalyzeResult>;
export async function analyzePGN(path: string, options?: AnalyzeOptions): Promise<AnalyzeResult> {
    const normalized = normalizeAnalyzeOptions(options);
    markInstancesInFlight(normalized.allInstances);
    try {
        const gameProcessor = new GameProcessor(normalized);

        const t0 = performance.now();
        const counts = await gameProcessor.processPGN(path);
        const durationMs = performance.now() - t0;
        return buildAnalyzeResult(counts, durationMs);
    } finally {
        clearInstancesInFlight(normalized.allInstances);
    }
}
