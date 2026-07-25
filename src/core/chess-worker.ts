import { parentPort, workerData } from 'node:worker_threads';

import GameParser from '../parsing/game-parser';
import type { WorkerInitData, WorkerMessage, WorkerTaskData } from '../types';
import { getCachedCfg, initWorkerTrackers, resetCfg } from './worker-tracker-registry';

const initData = workerData as WorkerInitData | undefined;

/** One GameParser per worker thread, reused across batches. */
const gameParser = new GameParser();

const ready = initWorkerTrackers(initData);

/** Process one batch of games and return move/game counts (+ tracker state if attached). */
function processBatch(msg: WorkerTaskData): WorkerMessage {
    const cfg = getCachedCfg(msg.idxConfig);
    resetCfg(cfg);

    const hasTrackers = cfg.trackers.game.length > 0 || cfg.trackers.move.length > 0;

    for (const game of msg.games) {
        gameParser.processGame(game, cfg);
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
        .then(() => {
            parentPort!.postMessage(processBatch(msg));
        })
        .catch((e: Error) => {
            throw e;
        });
});

process.on('unhandledRejection', (e: Error) => {
    throw e;
});
