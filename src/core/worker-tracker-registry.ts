import assert from 'node:assert';

import type { GameProcessorAnalysisConfig } from '#core/analysis-runtime';
import { TrackerHost } from '#core/tracker-host';
import { BUILTIN_TRACKER_FACTORIES } from '#trackers/builtin-registry';
import { assertTrackerFactory } from '#trackers/define-tracker';
import type { TrackerFactory, TrackerInstance } from '#types/tracker';
import type { WorkerInitData } from '#types/worker';

/**
 * Worker-thread tracker registry and per-config analysis state cache.
 *
 * Initialized once from `workerData` ({@link WorkerInitData}). Custom tracker modules
 * are dynamically imported at startup; built-ins are registered by stable id.
 * {@link cfgCache} holds reused tracker hosts — batch counters reset each dispatch
 * instead of reconstructing (important for {@link tileTracker} grid cost).
 */

const TrackerFactories: Record<string, TrackerFactory> = { ...BUILTIN_TRACKER_FACTORIES };

/** Reused analysis configs indexed by `idxConfig` from incoming batch messages. */
const cfgCache: GameProcessorAnalysisConfig[] = [];

/** Check if a dynamic import resolved to a module with a default export. */
function hasDefaultExport(module: unknown): module is { default: unknown } {
    return typeof module === 'object' && module !== null && 'default' in module;
}

/** Normalize a default export into a tracker factory. */
function normalizeDefaultExport(value: unknown): TrackerFactory {
    assertTrackerFactory(value);
    return value;
}

function createTrackerInstance(id: string, options: unknown): TrackerInstance {
    const factory = TrackerFactories[id];
    assert(factory, `Unknown tracker "${id}"`);

    const instance = factory(options);
    if (instance.def.id !== id) {
        throw new Error(
            `Tracker factory for "${id}" returned definition with id "${instance.def.id}"`,
        );
    }

    return instance;
}

/**
 * Bootstrap tracker registry from worker init payload.
 * @param initData One-time config from main thread (tracker ids, options, optional paths).
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
            if (tracker.module && !(tracker.id in TrackerFactories)) {
                let customTracker: unknown;
                try {
                    // oxlint-disable-next-line eslint/no-await-in-loop -- sequential imports: fail-fast with clear module path
                    customTracker = await import(tracker.module);
                } catch (cause) {
                    throw new Error(
                        `Failed to import custom tracker "${tracker.id}" from ${tracker.module}`,
                        { cause },
                    );
                }

                if (!hasDefaultExport(customTracker)) {
                    throw new Error(
                        `Custom tracker "${tracker.id}" module must default-export a tracker factory`,
                    );
                }

                const factory = normalizeDefaultExport(customTracker.default);
                if (factory.def.id !== tracker.id) {
                    throw new Error(
                        `Custom tracker "${tracker.id}" default export has mismatched id "${factory.def.id}"`,
                    );
                }
                TrackerFactories[tracker.id] = factory;
            }
        }
    }
}

/** Construct one analysis config with fresh tracker host for `idxConfig`. */
function createAnalysisCfg(
    initData: WorkerInitData | undefined,
    idxConfig: number,
): GameProcessorAnalysisConfig {
    const trackerData = initData?.configs[idxConfig]?.trackerData;
    if (!trackerData || trackerData.length === 0) {
        return {
            trackerHost: new TrackerHost([]),
            processedMoves: 0,
            processedGames: 0,
            skippedGames: 0,
            errors: [],
        };
    }

    const instances = trackerData.map((tracker) =>
        createTrackerInstance(tracker.id, tracker.options),
    );

    return {
        trackerHost: new TrackerHost(instances),
        processedMoves: 0,
        processedGames: 0,
        skippedGames: 0,
        errors: [],
    };
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
