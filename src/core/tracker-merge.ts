import { collectError } from '#core/analyze-errors';
import GameReplayer from '#replay/game-replayer';
import type { GameAndMoveCount } from '#types/analysis-runtime';
import type { GameProcessorAnalysisConfigFull } from '#types/analysis-runtime';
import type { AssembledGame } from '#types/parse-pgn';
import { toParsedGame } from '#types/parse-pgn';
import type { WorkerConfigResult, WorkerMessage } from '#types/worker';

/**
 * Merge one worker batch into the matching main-thread config (trackers + counters).
 * Callers must already have rejected batch-level `result.error` / transport errors when aborting.
 */
function mergeWorkerResult(
    configs: GameProcessorAnalysisConfigFull[],
    result: WorkerConfigResult,
): void {
    const { idxConfig, trackerSnapshots, moves, games, skippedGames, errors } = result;

    const cfg = configs[idxConfig];
    if (!cfg || cfg.isDone) return;

    if (trackerSnapshots) {
        cfg.trackerHost.mergeSnapshots(trackerSnapshots);
    }

    cfg.processedMoves += moves;
    cfg.processedGames += games;
    cfg.skippedGames += skippedGames ?? 0;

    if (errors) {
        for (const err of errors) {
            collectError(cfg.errors, err);
        }
    }

    if (cfg.processedGames >= cfg.config.maxGames) {
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
        const cfg = configs[configResult.idxConfig];
        if (!cfg) continue;

        if (configResult.trackerSnapshots) {
            cfg.trackerHost.mergeSnapshots(configResult.trackerSnapshots);
        }
    }
}

/** Reserved for worker-safe filters: apply JS filter + replay on main after worker parse. */
function mergeParsedGamesOnMain(
    cfg: GameProcessorAnalysisConfigFull,
    parsedGames: AssembledGame[],
    gameReplayer: GameReplayer,
    onError: 'abort' | 'skip-game',
): void {
    if (cfg.isDone) return;

    const replayMode = cfg.replayMode;

    for (const game of parsedGames) {
        if (cfg.isDone) break;
        if (cfg.config.hasFilter && !cfg.config.filter(toParsedGame(game))) continue;

        cfg.readGames += 1;
        gameReplayer.processGame(
            game,
            cfg,
            replayMode,
            cfg.processedGames + cfg.skippedGames,
            onError,
        );

        if (cfg.readGames === cfg.config.maxGames) {
            cfg.isDone = true;
        }
    }
}

export interface WorkerResultHandlerOptions {
    gameReplayer?: GameReplayer;
    onError?: 'abort' | 'skip-game';
}

function mergeWorkerMessage(
    configs: GameProcessorAnalysisConfigFull[],
    result: WorkerMessage,
    options?: WorkerResultHandlerOptions,
): void {
    for (const configResult of result.results) {
        if (configResult.parsedGames) {
            const cfg = configs[configResult.idxConfig];
            if (!cfg || !options?.gameReplayer) {
                throw new Error('Missing main-thread replayer for filtered worker batch');
            }
            mergeParsedGamesOnMain(
                cfg,
                configResult.parsedGames,
                options.gameReplayer,
                options.onError ?? 'abort',
            );
            continue;
        }

        mergeWorkerResult(configs, configResult);
    }
}

/**
 * Callback for {@link WorkerPool.runTask}: routes transport/batch errors to `onFatal`,
 * otherwise merges a successful result into `configs`.
 */
export function createWorkerResultHandler(
    configs: GameProcessorAnalysisConfigFull[],
    onFatal: (err: Error) => void,
    options?: WorkerResultHandlerOptions,
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

        try {
            mergeWorkerMessage(configs, result, options);
        } catch (e: unknown) {
            fatal = true;
            onFatal(e instanceof Error ? e : new Error(String(e)));
        }
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
