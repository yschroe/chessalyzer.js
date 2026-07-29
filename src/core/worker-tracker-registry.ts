import assert from 'node:assert';

import { BaseTracker } from '#trackers/base-tracker';
import { GameTracker } from '#trackers/game-tracker';
import { PieceTracker } from '#trackers/piece-tracker';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { GameProcessorAnalysisConfig } from '#types/analysis-runtime';
import type { WorkerInitData } from '#types/worker';

/**
 * Worker-thread tracker registry and per-config analysis state cache.
 *
 * Initialized once from `workerData` ({@link WorkerInitData}). Custom tracker modules
 * are dynamically imported at startup; built-ins are registered by stable {@link trackerId}.
 * {@link cfgCache} holds reused tracker instances — {@link resetCfg} clears them each batch
 * instead of reconstructing (important for {@link TileTracker} grid cost).
 */

const BUILTIN_TRACKERS = [PieceTracker, TileTracker, GameTracker] as const;

const TrackerList: Record<string, new () => BaseTracker> = Object.fromEntries(
    BUILTIN_TRACKERS.map((T) => [T.trackerId, T]),
);

/** Reused analysis configs indexed by `idxConfig` from incoming batch messages. */
const cfgCache: GameProcessorAnalysisConfig[] = [];

/** Check if a dynamic import resolved to a module with a default export. */
function hasDefaultExport(module: unknown): module is { default: unknown } {
    return typeof module === 'object' && module !== null && 'default' in module;
}

/** Check if a value is a constructable tracker class. */
function isTrackerClass(value: unknown): value is new () => BaseTracker {
    return typeof value === 'function';
}

/**
 * Bootstrap tracker registry from worker init payload.
 * @param initData One-time config from main thread (tracker ids, cfg, optional paths).
 * @returns Promise that resolves when custom modules are loaded and cfg cache is warm.
 */
export async function initWorkerTrackers(initData: WorkerInitData | undefined): Promise<void> {
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
            if (tracker.path && !(tracker.id in TrackerList)) {
                let customTracker: unknown;
                try {
                    // oxlint-disable-next-line eslint/no-await-in-loop -- sequential imports: fail-fast with clear module path
                    customTracker = await import(tracker.path);
                } catch (cause) {
                    throw new Error(
                        `Failed to import custom tracker "${tracker.id}" from ${tracker.path}`,
                        { cause },
                    );
                }

                if (!hasDefaultExport(customTracker)) {
                    throw new Error(
                        `Custom tracker "${tracker.id}" module must default-export a tracker class`,
                    );
                }

                const TrackerClass = customTracker.default;
                if (!isTrackerClass(TrackerClass)) {
                    throw new Error(
                        `Custom tracker "${tracker.id}" module default export must be a tracker class`,
                    );
                }
                TrackerList[tracker.id] = TrackerClass;
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
        skippedGames: 0,
        errors: [],
    };

    const trackerData = initData?.configs[idxConfig]?.trackerData;
    if (!trackerData) return cfg;

    for (const tracker of trackerData) {
        const TrackerClass = TrackerList[tracker.id];
        assert(TrackerClass, `Unknown tracker "${tracker.id}"`);

        const instance: BaseTracker = new TrackerClass();
        instance.cfg = tracker.cfg;
        // Avoid DataCloneError when posting tracker state back to the main thread.
        instance.heatmapPresets = null;
        cfg.trackers[instance.type].push(instance);
    }

    return cfg;
}

/** Reset per-batch counters only; tracker state accumulates until pool flush. */
export function resetCfgBatchCounters(cfg: GameProcessorAnalysisConfig): void {
    cfg.processedMoves = 0;
    cfg.processedGames = 0;
    cfg.skippedGames = 0;
    cfg.errors = [];
}

/** Cached config for the given analysis index. */
export function getCachedCfg(idxConfig: number): GameProcessorAnalysisConfig {
    const cfg = cfgCache[idxConfig];
    assert(cfg, `Invalid analysis config index: ${idxConfig}`);

    return cfg;
}
