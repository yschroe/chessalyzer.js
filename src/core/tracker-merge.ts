import { collectError } from '#core/analyze-errors';
import type { GameAndMoveCount } from '#types/analysis-runtime';
import type { GameProcessorAnalysisConfigFull } from '#types/analysis-runtime';
import type { WorkerBatchConfigResult, WorkerMessage } from '#types/worker';

/**
 * Merge one worker batch into the matching main-thread config (counters only).
 * Callers must already have rejected batch-level `result.error` / transport errors when aborting.
 */
function mergeWorkerResult(
    configs: GameProcessorAnalysisConfigFull[],
    result: WorkerBatchConfigResult,
): void {
    const { idxConfig, moves, games, skippedGames, errors } = result;

    const cfg = configs[idxConfig];
    if (!cfg || cfg.isDone) return;

    cfg.processedMoves += moves;
    cfg.processedGames += games;
    cfg.skippedGames += skippedGames ?? 0;

    if (errors) {
        for (const err of errors) {
            collectError(cfg.errors, err);
        }
    }

    // maxGames caps attempts (accepted games), so skipped games count toward it.
    if (cfg.processedGames + cfg.skippedGames >= cfg.config.maxGames) {
        cfg.isDone = true;
    }
}

/** Merge tracker state from a pool flush (counters were merged per batch). */
export function mergeWorkerTrackerFlush(
    configs: GameProcessorAnalysisConfigFull[],
    result: WorkerMessage,
): void {
    if (result.error) throw new Error(result.error);

    for (const configResult of result.results) {
        if (!('trackerSnapshots' in configResult)) continue;
        const cfg = configs[configResult.idxConfig];
        if (!cfg) continue;
        cfg.trackerHost.mergeSnapshots(configResult.trackerSnapshots);
    }
}

function mergeWorkerMessage(
    configs: GameProcessorAnalysisConfigFull[],
    result: WorkerMessage,
): void {
    for (const configResult of result.results) {
        // Flush payloads carry tracker state and are merged at pool drain, never per batch.
        if ('trackerSnapshots' in configResult) continue;
        mergeWorkerResult(configs, configResult);
    }
}

/**
 * Promise handlers for {@link WorkerPool.runTask}: `onResult` merges a successful batch
 * into `configs`; `onError` (or a merge failure) routes to `onFatal`. Only the first
 * failure is forwarded — late results after a fatal error are discarded.
 */
export function createWorkerResultHandler(
    configs: GameProcessorAnalysisConfigFull[],
    onFatal: (err: Error) => void,
): { onResult: (result: WorkerMessage) => void; onError: (err: unknown) => void } {
    let fatal = false;
    const fail = (err: unknown) => {
        if (fatal) return;
        fatal = true;
        onFatal(err instanceof Error ? err : new Error(String(err)));
    };

    return {
        onResult: (result) => {
            if (fatal) return;
            try {
                mergeWorkerMessage(configs, result);
            } catch (e: unknown) {
                fail(e);
            }
        },
        onError: fail,
    };
}

/** Invoke tracker finish hooks and return aggregate game/move counts. */
export function finishTrackers(configs: GameProcessorAnalysisConfigFull[]): GameAndMoveCount[] {
    for (const { trackerHost } of configs) {
        trackerHost.onFinish();
    }

    return configs.map((cfg) => ({
        games: cfg.processedGames,
        moves: cfg.processedMoves,
        skippedGames: cfg.skippedGames,
        errors: cfg.errors.length > 0 ? cfg.errors : undefined,
    }));
}
