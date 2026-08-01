import assert from 'node:assert';

import { TrackerHost } from '#core/tracker-host';
import { BUILTIN_TRACKER_FACTORIES } from '#trackers/builtin-registry';
import { assertTrackerDef } from '#trackers/define-tracker';
import type { GameProcessorAnalysisConfig } from '#types/analysis-runtime';
import type { TrackerDef } from '#types/tracker';
import type { WorkerInitData } from '#types/worker';

/**
 * Worker-thread tracker registry and per-config analysis state cache.
 *
 * Initialized once from `workerData` ({@link WorkerInitData}). Custom tracker modules
 * are dynamically imported at startup; built-ins are registered by stable id.
 * {@link cfgCache} holds reused tracker hosts — batch counters reset each dispatch
 * instead of reconstructing (important for {@link TileTracker} grid cost).
 */

const TrackerFactories: Record<string, () => TrackerDef> = { ...BUILTIN_TRACKER_FACTORIES };

/** Reused analysis configs indexed by `idxConfig` from incoming batch messages. */
const cfgCache: GameProcessorAnalysisConfig[] = [];

/** Check if a dynamic import resolved to a module with a default export. */
function hasDefaultExport(module: unknown): module is { default: unknown } {
    return typeof module === 'object' && module !== null && 'default' in module;
}

/** Normalize a default export (class or def object) into a tracker definition. */
function normalizeDefaultExport(value: unknown): TrackerDef {
    if (typeof value === 'function') {
        const TrackerClass = value as new () => TrackerDef;
        const instance = new TrackerClass();
        assertTrackerDef(instance);
        return instance;
    }
    assertTrackerDef(value);
    return value;
}

function createTrackerDef(
    id: string,
    modulePath: string | undefined,
    options: unknown,
): TrackerDef {
    const factory = TrackerFactories[id];
    assert(factory, `Unknown tracker "${id}"`);

    const def = factory();
    if (def.id !== id) {
        throw new Error(`Tracker factory for "${id}" returned definition with id "${def.id}"`);
    }

    if (options !== undefined) {
        Object.assign(def, { options });
    }

    return def;
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
                        `Custom tracker "${tracker.id}" module must default-export a tracker definition or class`,
                    );
                }

                const def = normalizeDefaultExport(customTracker.default);
                if (def.id !== tracker.id) {
                    throw new Error(
                        `Custom tracker "${tracker.id}" default export has mismatched id "${def.id}"`,
                    );
                }
                TrackerFactories[tracker.id] = () => normalizeDefaultExport(customTracker.default);
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

    const defs = trackerData.map((tracker) =>
        createTrackerDef(tracker.id, tracker.module, tracker.options),
    );

    return {
        trackerHost: new TrackerHost(defs),
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
