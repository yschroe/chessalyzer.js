import assert from 'node:assert';
import { parentPort, workerData } from 'node:worker_threads';

import {
    getCachedCfg,
    initWorkerTrackers,
    resetCfgBatchCounters,
} from '#core/worker-tracker-registry';
import type {
    WorkerBatchConfigResult,
    WorkerBatchTask,
    WorkerConfigResult,
    WorkerInitData,
    WorkerMessage,
    WorkerTaskConfigEntry,
    WorkerTaskData,
} from '#core/worker-types';
import { decodePgnChunkBytes } from '#io/pgn-chunks';
import { parseGamesFromLines } from '#pgn/game-assembler';
import GameReplayer from '#replay/game-replayer';
import type { ReplayMode } from '#replay/replay-mode';
import type { AssembledGame } from '#types/parse-pgn';

// Bind parentPort to a local variable so it is detected as non-null in the handlers as well.
const port = parentPort;
assert(port, 'Worker was initialized on main thread, aborting.');

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- workerData is untyped at worker entry; shape validated at use sites
const initData = workerData as WorkerInitData | undefined;
const onErrorPolicy: 'abort' | 'skip-game' = initData?.onError ?? 'abort';

/** One GameReplayer per worker thread, reused across batches. */
const gameReplayer = new GameReplayer();

/** Tracker config is read once from workerData; batches only carry PGN chunks. */
const ready = initWorkerTrackers(initData);

function getReplayMode(idxConfig: number): ReplayMode {
    return initData?.configs[idxConfig]?.replayMode ?? 'skip';
}

function computeParseMaxGames(configs: WorkerTaskConfigEntry[]): number {
    let max = 0;
    for (const entry of configs) {
        if (entry.remainingGames === undefined) return Infinity;
        max = Math.max(max, entry.remainingGames);
    }
    return max;
}

function processReplayConfig(
    entry: WorkerTaskConfigEntry,
    parsedGames: AssembledGame[],
): WorkerBatchConfigResult {
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

    const result: WorkerBatchConfigResult = {
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
        results.push(processReplayConfig(entry, parsedGames));
    }

    return { results };
}

/** Return accumulated tracker state for all replay configs on this worker. */
function processFlush(): WorkerMessage {
    const results: WorkerConfigResult[] = [];
    const configCount = initData?.configs.length ?? 0;

    for (let idxConfig = 0; idxConfig < configCount; idxConfig += 1) {
        const cfg = getCachedCfg(idxConfig);
        const hasTrackers =
            cfg.trackerHost.gameEntries.length > 0 || cfg.trackerHost.moveEntries.length > 0;
        if (!hasTrackers) continue;

        results.push({
            idxConfig,
            trackerSnapshots: cfg.trackerHost.snapshots(),
        });
    }

    return { results };
}

function handleTask(msg: WorkerTaskData): WorkerMessage {
    if (msg.type === 'flush') return processFlush();
    return processBatch(msg);
}

port.on('message', (msg: WorkerTaskData) => {
    void ready
        .then(() => handleTask(msg))
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Node worker_threads MessagePort has no targetOrigin
        .then((result) => port.postMessage(result))
        .catch((e: unknown) => {
            // Return errors to the main thread instead of throwing — unhandled worker
            // rejections would otherwise leave the pool waiting indefinitely.
            const message = e instanceof Error ? e.message : String(e);
            const errorResult: WorkerMessage = {
                results: [],
                error: message,
            };
            // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Node worker_threads MessagePort has no targetOrigin
            port.postMessage(errorResult);
        });
});
