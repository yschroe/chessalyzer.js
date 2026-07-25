/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { parentPort, workerData } from 'node:worker_threads';

import type {
    GameProcessorAnalysisConfig,
    WorkerInitData,
    WorkerMessage,
    WorkerTaskData,
} from '../interfaces';
import BaseTracker from '../tracker/base-tracker';
import GameTracker from '../tracker/game-tracker-base';
import PieceTracker from '../tracker/piece-tracker-base';
import TileTracker from '../tracker/tile-tracker-base';
import GameParser from '../parsing/game-parser';

const initData = workerData as WorkerInitData | undefined;

// One GameParser per worker thread, reused across batches.
const gameParser = new GameParser();

const TrackerList: Record<string, new () => BaseTracker> = {
    [PieceTracker.name]: PieceTracker,
    [TileTracker.name]: TileTracker,
    [GameTracker.name]: GameTracker,
};

/** Load custom tracker modules once at worker startup. */
async function loadCustomTrackers(): Promise<void> {
    if (!initData) return;
    for (const cfg of initData.configs) {
        for (const tracker of cfg.trackerData) {
            if (tracker.path && !(tracker.name in TrackerList)) {
                const customTracker = await import(tracker.path);
                TrackerList[tracker.name] = customTracker.default
                    ? customTracker.default
                    : customTracker;
            }
        }
    }
}

function createAnalysisCfg(idxConfig: number): GameProcessorAnalysisConfig {
    const cfg: GameProcessorAnalysisConfig = {
        trackers: { move: [], game: [] },
        processedMoves: 0,
        processedGames: 0,
    };

    const trackerData = initData?.configs[idxConfig]?.trackerData;
    if (!trackerData) return cfg;

    for (const tracker of trackerData) {
        const TrackerClass = TrackerList[tracker.name];
        if (!TrackerClass) continue;

        const instance: BaseTracker = new TrackerClass();
        instance.cfg = tracker.cfg;
        // Avoid DataCloneError when posting tracker state back to the main thread.
        instance.heatmapPresets = null;
        cfg.trackers[instance.type].push(instance);
    }

    return cfg;
}

/** Reused analysis configs per idxConfig — trackers reset each batch instead of recreated. */
const cfgCache: GameProcessorAnalysisConfig[] = [];

async function initCfgCache(): Promise<void> {
    await loadCustomTrackers();
    const configCount = initData?.configs.length ?? 1;
    for (let i = 0; i < configCount; i += 1) {
        cfgCache[i] = createAnalysisCfg(i);
    }
}

function resetCfg(cfg: GameProcessorAnalysisConfig): void {
    cfg.processedMoves = 0;
    cfg.processedGames = 0;

    for (const t of cfg.trackers.game) {
        t.resetWorkerBatch?.();
    }
    for (const t of cfg.trackers.move) {
        t.resetWorkerBatch?.();
    }
}

const ready = initCfgCache();

function processBatch(msg: WorkerTaskData): WorkerMessage {
    const cfg = cfgCache[msg.idxConfig] ?? cfgCache[0];
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

parentPort.on('message', (msg: WorkerTaskData) => {
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
