import { parentPort, workerData } from 'node:worker_threads';

import {
    getCachedCfg,
    initWorkerTrackers,
    resetCfgBatchCounters,
} from '#core/worker-tracker-registry';
import { decodePgnChunkBytes } from '#io/pgn-chunks';
import { parseGamesFromLines } from '#pgn/game-assembler';
import GameReplayer from '#replay/game-replayer';
import type {
    WorkerBatchTask,
    WorkerConfigResult,
    WorkerInitData,
    WorkerMessage,
    WorkerTaskConfigEntry,
    WorkerTaskData,
} from '#types/worker';
import { isWorkerFlushTask } from '#types/worker';

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- workerData is untyped at worker entry; shape validated at use sites
const initData = workerData as WorkerInitData | undefined;
const onErrorPolicy: 'abort' | 'skip-game' = initData?.onError ?? 'abort';

/** One GameReplayer per worker thread, reused across batches. */
const gameReplayer = new GameReplayer();

/** Tracker config is read once from workerData; batches only carry PGN chunks. */
const ready = initWorkerTrackers(initData);

function isPgnParseOnly(idxConfig: number): boolean {
    return initData?.configs[idxConfig]?.pgnParseOnly ?? false;
}

function getReplayMode(idxConfig: number): import('#replay/replay-mode').ReplayMode {
    return initData?.configs[idxConfig]?.replayMode ?? 'skip';
}

function computeParseMaxGames(configs: WorkerTaskConfigEntry[]): number {
    const hasFilter = configs.some((c) => isPgnParseOnly(c.idxConfig));
    if (hasFilter) return Infinity;

    let max = 0;
    for (const entry of configs) {
        if (entry.remainingGames === undefined) return Infinity;
        max = Math.max(max, entry.remainingGames);
    }
    return max;
}

function processReplayConfig(
    entry: WorkerTaskConfigEntry,
    parsedGames: ReturnType<typeof parseGamesFromLines>,
): WorkerConfigResult {
    const cfg = getCachedCfg(entry.idxConfig);
    resetCfgBatchCounters(cfg);

    const replayMode = getReplayMode(entry.idxConfig);
    const remaining = entry.remainingGames ?? Infinity;
    let gamesProcessed = 0;

    for (const game of parsedGames) {
        if (gamesProcessed >= remaining) break;
        gameReplayer.processGame(
            game,
            cfg,
            replayMode,
            cfg.processedGames + cfg.skippedGames,
            onErrorPolicy,
        );
        gamesProcessed += 1;
    }

    const result: WorkerConfigResult = {
        moves: cfg.processedMoves,
        games: cfg.processedGames,
        idxConfig: entry.idxConfig,
        skippedGames: cfg.skippedGames,
    };

    if (cfg.errors.length > 0) {
        result.errors = cfg.errors;
    }

    return result;
}

/** Assemble games from a PGN chunk once, then replay/analyze per config. */
function processBatch(msg: WorkerBatchTask): WorkerMessage {
    const lines = decodePgnChunkBytes(msg.pgnChunkBytes).split('\n');
    const parseHeaders = msg.configs.some((c) => c.parseHeaders);
    const maxGames = computeParseMaxGames(msg.configs);
    const parsedGames = parseGamesFromLines(lines, { parseHeaders, maxGames });

    const results: WorkerConfigResult[] = [];

    for (const entry of msg.configs) {
        if (isPgnParseOnly(entry.idxConfig)) {
            results.push({
                parsedGames,
                idxConfig: entry.idxConfig,
                games: 0,
                moves: 0,
            });
        } else {
            results.push(processReplayConfig(entry, parsedGames));
        }
    }

    return { results };
}

/** Return accumulated tracker state for all replay configs on this worker. */
function processFlush(): WorkerMessage {
    const results: WorkerConfigResult[] = [];
    const configCount = initData?.configs.length ?? 0;

    for (let idxConfig = 0; idxConfig < configCount; idxConfig += 1) {
        if (isPgnParseOnly(idxConfig)) continue;

        const cfg = getCachedCfg(idxConfig);
        const hasTrackers = cfg.trackers.game.length > 0 || cfg.trackers.move.length > 0;
        if (!hasTrackers) continue;

        results.push({
            idxConfig,
            games: 0,
            moves: 0,
            gameTrackers: cfg.trackers.game,
            moveTrackers: cfg.trackers.move,
        });
    }

    return { results };
}

function handleTask(msg: WorkerTaskData): WorkerMessage {
    if (isWorkerFlushTask(msg)) return processFlush();
    return processBatch(msg);
}

parentPort!.on('message', (msg: WorkerTaskData) => {
    void ready
        .then(() => handleTask(msg))
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Node worker_threads MessagePort has no targetOrigin
        .then((result) => parentPort!.postMessage(result))
        .catch((e: unknown) => {
            // Return errors to the main thread instead of throwing — unhandled worker
            // rejections would otherwise leave the pool waiting indefinitely.
            const message = e instanceof Error ? e.message : String(e);
            const errorResult: WorkerMessage = {
                results: [],
                error: message,
            };
            // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Node worker_threads MessagePort has no targetOrigin
            parentPort!.postMessage(errorResult);
        });
});
