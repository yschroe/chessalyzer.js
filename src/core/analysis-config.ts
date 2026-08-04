import type { GameProcessorConfig } from '#core/analysis-runtime';
import { TrackerHost } from '#core/tracker-host';
import { resolveEffectiveReplayMode } from '#replay/replay-mode';
import { BUILTIN_TRACKER_IDS } from '#trackers/builtin-registry';
import { assertMultithreadTrackerDef, assertTrackerInstance } from '#trackers/define-tracker';
import type { AnalyzeOptions, AnalyzeRun, WorkerOptions } from '#types/analysis';
import type { TrackerInstance } from '#types/tracker';

/** Fully normalized `analyzePGN` inputs: per-run processor state plus path-selection fields. */
export interface NormalizedAnalyzeOptions {
    configs: GameProcessorConfig[];
    multithreadCfg: WorkerOptions | null;
    onError: 'abort' | 'skip-game';
    parseHeaders: boolean;
    /** All tracker instances across runs — used for in-flight busy tracking. */
    allInstances: TrackerInstance[];
}

/** Instances currently owned by an in-flight `analyzePGN` call. */
const inFlightInstances = new WeakSet<TrackerInstance>();

function resolveParseHeaders(
    explicit: boolean | 'auto' | undefined,
    needsHeaders: boolean,
): boolean {
    if (explicit === true) return true;
    if (explicit === false) {
        if (needsHeaders) {
            throw new Error(
                'headers: false cannot be used with game trackers (game trackers require tag-pair headers)',
            );
        }
        return false;
    }
    return needsHeaders;
}

/** Assert that a filter requires workers: false. */
function assertFilterRequiresSingleThreaded(
    runs: AnalyzeRun[],
    multithreadCfg: WorkerOptions | null,
): void {
    if (multithreadCfg === null) return;
    const hasFilter = runs.some((run) => run.filter !== undefined);
    if (hasFilter) {
        throw new Error(
            'A JavaScript filter requires workers: false — filter predicates run on the main thread and cannot be used with the default worker pool',
        );
    }
}

/** Assert that no conflicting run fields are set. */
function assertNoConflictingRunFields(opts: AnalyzeOptions): void {
    if (opts.trackers !== undefined) {
        throw new Error('Cannot set both runs and top-level trackers');
    }
    if (opts.filter !== undefined) {
        throw new Error('Cannot set both runs and top-level filter');
    }
    if (opts.maxGames !== undefined) {
        throw new Error('Cannot set both runs and top-level maxGames');
    }
}

/** Resolve single-run sugar into an `AnalyzeRun` compatible object. */
function resolveRuns(opts: AnalyzeOptions): AnalyzeRun[] {
    // Multi-run: `runs: […]`
    if (opts.runs) {
        assertNoConflictingRunFields(opts);
        if (opts.runs.length === 0) {
            throw new Error('runs must contain at least one entry');
        }
        return [...opts.runs];
    }

    // Single-run sugar: `trackers: […]` / `filter: …` / `maxGames: …`
    const single = opts;
    return [{ trackers: single.trackers, filter: single.filter, maxGames: single.maxGames }];
}

/** Resolve `workers` option to multithread config or `null` for single-threaded. */
function resolveMultithreadCfg(workers: AnalyzeOptions['workers']): WorkerOptions | null {
    if (workers === false) return null;
    if (typeof workers === 'number') return { count: workers };
    return workers ?? {};
}

/**
 * Convert public {@link AnalyzeOptions} into processor inputs in one pass:
 * validates, then builds per-run runtime state and path-selection fields.
 */
export function normalizeAnalyzeOptions(options: AnalyzeOptions = {}): NormalizedAnalyzeOptions {
    const multithreadCfg = resolveMultithreadCfg(options.workers);

    // Resolve runs into per-run configs, converting single-run sugar.
    const runs = resolveRuns(options);
    assertFilterRequiresSingleThreaded(runs, multithreadCfg);

    const multithreaded = multithreadCfg !== null;
    let needsHeaders = false;
    const configs: GameProcessorConfig[] = [];
    const seenInstances = new Set<TrackerInstance>();
    const allInstances: TrackerInstance[] = [];

    // Build per-run configs, tracking instances and header requirements.
    for (const run of runs) {
        const instances: TrackerInstance[] = [];

        for (const tracker of run.trackers ?? []) {
            assertTrackerInstance(tracker);
            if (seenInstances.has(tracker)) {
                throw new Error(
                    `Tracker instance "${tracker.def.id}" appears more than once in the same analyzePGN call — pass distinct instances (e.g. tileTracker() twice)`,
                );
            }
            if (inFlightInstances.has(tracker)) {
                throw new Error(
                    `Tracker instance "${tracker.def.id}" is already in use by another in-flight analyzePGN call`,
                );
            }
            seenInstances.add(tracker);
            allInstances.push(tracker);
            instances.push(tracker);
            if (tracker.def.kind === 'game') {
                needsHeaders = true;
            }
            if (multithreaded) {
                assertMultithreadTrackerDef(tracker.def, BUILTIN_TRACKER_IDS);
            }
        }

        const trackerSpecs = multithreaded
            ? instances.map((instance) => ({
                  id: instance.def.id,
                  module: instance.def.workerModule,
                  options: instance.options,
              }))
            : undefined;

        const replayMode = resolveEffectiveReplayMode(
            instances.some((instance) => instance.def.kind === 'move'),
            options.replay,
        );

        configs.push({
            trackerHost: new TrackerHost(instances),
            trackerSpecs,
            limits: {
                filter: run.filter,
                maxGames: run.maxGames ?? Infinity,
            },
            processedMoves: 0,
            processedGames: 0,
            skippedGames: 0,
            errors: [],
            isDone: false,
            replayMode,
        });
    }

    return {
        configs,
        multithreadCfg,
        onError: options.onError ?? 'abort',
        parseHeaders: resolveParseHeaders(options.headers, needsHeaders),
        allInstances,
    };
}

/** Mark instances as in-flight for the duration of an `analyzePGN` call. */
export function markInstancesInFlight(instances: readonly TrackerInstance[]): void {
    for (const instance of instances) {
        inFlightInstances.add(instance);
    }
}

/** Clear in-flight marks after an `analyzePGN` call completes (success or failure). */
export function clearInstancesInFlight(instances: readonly TrackerInstance[]): void {
    for (const instance of instances) {
        inFlightInstances.delete(instance);
    }
}
