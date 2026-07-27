import { parentPort, workerData } from 'node:worker_threads';

import { getCachedCfg, initWorkerTrackers, resetCfg } from '#core/worker-tracker-registry';
import { parseGamesFromLines } from '#pgn/game-assembler';
import { decodePgnChunkBytes } from '#pgn/pgn-chunks';
import GameReplayer from '#replay/game-replayer';
import { resolveReplayPolicy } from '#replay/replay-policy';
import type { WorkerInitData, WorkerMessage, WorkerTaskData } from '#types/worker';

const initData = workerData as WorkerInitData | undefined;

/** One GameReplayer per worker thread, reused across batches. */
const gameReplayer = new GameReplayer();

const ready = initWorkerTrackers(initData);

/** Assemble games from a PGN chunk and replay/analyze them. */
function processBatch(msg: WorkerTaskData): WorkerMessage {
    const cfg = getCachedCfg(msg.idxConfig);
    resetCfg(cfg);

    const hasTrackers = cfg.trackers.game.length > 0 || cfg.trackers.move.length > 0;
    const replay = resolveReplayPolicy(cfg.trackers.move.length > 0);
    const games = parseGamesFromLines(decodePgnChunkBytes(msg.pgnChunkBytes).split('\n'), {
        readInHeader: msg.readInHeader,
    });

    for (const game of games) {
        gameReplayer.processGame(game, cfg, replay);
    }

    const result: WorkerMessage = {
        cntMoves: cfg.processedMoves,
        cntGames: cfg.processedGames,
        idxConfig: msg.idxConfig,
    };

    if (hasTrackers) {
        result.gameTrackers = cfg.trackers.game;
        result.moveTrackers = cfg.trackers.move;
    }

    return result;
}

parentPort!.on('message', (msg: WorkerTaskData) => {
    void ready
        .then(() => processBatch(msg))
        .then((result) => parentPort!.postMessage(result))
        .catch((e: unknown) => {
            // Return errors to the main thread instead of throwing — unhandled worker
            // rejections would otherwise leave the pool waiting indefinitely.
            const message = e instanceof Error ? e.message : String(e);
            parentPort!.postMessage({
                idxConfig: msg.idxConfig,
                cntMoves: 0,
                cntGames: 0,
                error: message,
            });
        });
});
