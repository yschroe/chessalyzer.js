import { parentPort, workerData } from 'node:worker_threads';

import { getCachedCfg, initWorkerTrackers, resetCfg } from '#core/worker-tracker-registry';
import { decodePgnChunkBytes } from '#io/pgn-chunks';
import { parseGamesFromLines } from '#pgn/game-assembler';
import GameReplayer from '#replay/game-replayer';
import type { WorkerInitData, WorkerMessage, WorkerTaskData } from '#types/worker';

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

/** Assemble games from a PGN chunk and replay/analyze them. */
function processBatch(msg: WorkerTaskData): WorkerMessage {
    const lines = decodePgnChunkBytes(msg.pgnChunkBytes).split('\n');

    if (isPgnParseOnly(msg.idxConfig)) {
        return {
            parsedGames: parseGamesFromLines(lines, { parseHeaders: true }),
            idxConfig: msg.idxConfig,
            games: 0,
            moves: 0,
        };
    }

    const cfg = getCachedCfg(msg.idxConfig);
    resetCfg(cfg);

    const hasTrackers = cfg.trackers.game.length > 0 || cfg.trackers.move.length > 0;
    const replayMode = getReplayMode(msg.idxConfig);
    const maxGames = msg.remainingGames ?? Infinity;
    const games = parseGamesFromLines(lines, {
        parseHeaders: msg.parseHeaders,
        maxGames,
    });

    for (const game of games) {
        gameReplayer.processGame(
            game,
            cfg,
            replayMode,
            cfg.processedGames + cfg.skippedGames,
            onErrorPolicy,
        );
    }

    const result: WorkerMessage = {
        moves: cfg.processedMoves,
        games: cfg.processedGames,
        idxConfig: msg.idxConfig,
        skippedGames: cfg.skippedGames,
    };

    if (cfg.errors.length > 0) {
        result.errors = cfg.errors;
    }

    if (hasTrackers) {
        result.gameTrackers = cfg.trackers.game;
        result.moveTrackers = cfg.trackers.move;
    }

    return result;
}

parentPort!.on('message', (msg: WorkerTaskData) => {
    void ready
        .then(() => processBatch(msg))
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Node worker_threads MessagePort has no targetOrigin
        .then((result) => parentPort!.postMessage(result))
        .catch((e: unknown) => {
            // Return errors to the main thread instead of throwing — unhandled worker
            // rejections would otherwise leave the pool waiting indefinitely.
            const message = e instanceof Error ? e.message : String(e);
            const errorResult: WorkerMessage = {
                idxConfig: msg.idxConfig,
                moves: 0,
                games: 0,
                error: message,
            };
            // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Node worker_threads MessagePort has no targetOrigin
            parentPort!.postMessage(errorResult);
        });
});
