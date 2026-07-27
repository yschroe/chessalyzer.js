import type { GameAndMoveCount, GameProcessorAnalysisConfigFull } from '#types/analysis';
import type { WorkerMessage } from '#types/worker';

/**
 * Merge one worker batch into the matching main-thread config (trackers + counters).
 * Callers must already have rejected batch-level `result.error` / transport errors.
 */
function mergeWorkerResult(
    configs: GameProcessorAnalysisConfigFull[],
    result: WorkerMessage,
): void {
    if (result.error) throw new Error(result.error);

    const { idxConfig, gameTrackers, moveTrackers, cntMoves, cntGames } = result;

    const cfg = configs[idxConfig];
    if (!cfg) return;

    if (gameTrackers) {
        for (let i = 0; i < gameTrackers.length; i += 1) {
            const tracker = cfg.trackers.game[i];
            const data = gameTrackers[i];
            if (tracker && data) tracker.add?.(data);
        }
    }
    if (moveTrackers) {
        for (let i = 0; i < moveTrackers.length; i += 1) {
            const tracker = cfg.trackers.move[i];
            const data = moveTrackers[i];
            if (tracker && data) tracker.add?.(data);
        }
    }
    cfg.processedMoves += cntMoves;
    cfg.processedGames += cntGames;

    if (cfg.processedGames >= cfg.config.cntGames) {
        cfg.isDone = true;
    }
}

/**
 * Callback for {@link WorkerPool.runTask}: routes transport/batch errors to `onFatal`,
 * otherwise merges a successful result into `configs`.
 */
export function createWorkerResultHandler(
    configs: GameProcessorAnalysisConfigFull[],
    onFatal: (err: Error) => void,
): (err: Error | null, result: WorkerMessage | null) => void {
    let fatal = false;
    return (err, result) => {
        if (fatal) return;

        if (err) {
            fatal = true;
            onFatal(err);
            return;
        }

        if (!result) return;

        if (result.error) {
            fatal = true;
            onFatal(new Error(result.error));
            return;
        }

        mergeWorkerResult(configs, result);
    };
}

/** Invoke tracker `finish` hooks and return aggregate game/move counts. */
export function finishTrackers(configs: GameProcessorAnalysisConfigFull[]): GameAndMoveCount[] {
    for (const { trackers } of configs) {
        for (const tracker of trackers.game) tracker.finish?.();
        for (const tracker of trackers.move) tracker.finish?.();
    }

    return configs.map((cfg) => ({
        cntGames: cfg.processedGames,
        cntMoves: cfg.processedMoves,
    }));
}
