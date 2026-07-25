/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { GameProcessorAnalysisConfig, WorkerInitData } from '../interfaces';
import BaseTracker from '../tracker/base-tracker';
import GameTracker from '../tracker/game-tracker-base';
import PieceTracker from '../tracker/piece-tracker-base';
import TileTracker from '../tracker/tile/tile-tracker-base';

/**
 * Worker-thread tracker registry and per-config analysis state cache.
 *
 * Initialized once from `workerData` ({@link WorkerInitData}). Custom tracker modules
 * are dynamically imported at startup; built-ins are registered by constructor name.
 * {@link cfgCache} holds reused tracker instances — {@link resetCfg} clears them each batch
 * instead of reconstructing (important for {@link TileTracker} grid cost).
 */

const TrackerList: Record<string, new () => BaseTracker> = {
    [PieceTracker.name]: PieceTracker,
    [TileTracker.name]: TileTracker,
    [GameTracker.name]: GameTracker,
};

/** Reused analysis configs indexed by `idxConfig` from incoming batch messages. */
const cfgCache: GameProcessorAnalysisConfig[] = [];

/**
 * Bootstrap tracker registry from worker init payload.
 * @param initData One-time config from main thread (tracker names, cfg, optional paths).
 * @returns Promise that resolves when custom modules are loaded and cfg cache is warm.
 */
export async function initWorkerTrackers(
    initData: WorkerInitData | undefined,
): Promise<void> {
    await loadCustomTrackers(initData);
    const configCount = initData?.configs.length ?? 1;
    for (let i = 0; i < configCount; i += 1) {
        cfgCache[i] = createAnalysisCfg(initData, i);
    }
}

/** Load custom tracker modules once at worker startup. */
async function loadCustomTrackers(initData: WorkerInitData | undefined): Promise<void> {
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

/** Construct one analysis config with fresh tracker instances for `idxConfig`. */
function createAnalysisCfg(
    initData: WorkerInitData | undefined,
    idxConfig: number,
): GameProcessorAnalysisConfig {
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

/**
 * Reset batch counters and tracker state before processing a new worker batch.
 */
export function resetCfg(cfg: GameProcessorAnalysisConfig): void {
    cfg.processedMoves = 0;
    cfg.processedGames = 0;

    for (const t of cfg.trackers.game) {
        t.resetWorkerBatch?.();
    }
    for (const t of cfg.trackers.move) {
        t.resetWorkerBatch?.();
    }
}

/** Cached config for the given analysis index (falls back to index 0). */
export function getCachedCfg(idxConfig: number): GameProcessorAnalysisConfig {
    return cfgCache[idxConfig] ?? cfgCache[0];
}
