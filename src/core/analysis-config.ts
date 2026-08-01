import { TrackerHost } from '#core/tracker-host';
import { resolveEffectiveReplayMode } from '#replay/replay-mode';
import type { ReplayMode } from '#replay/replay-mode';
import { BUILTIN_TRACKER_IDS } from '#trackers/builtin-registry';
import { assertMultithreadTrackerDef, assertTrackerDef } from '#trackers/define-tracker';
import type {
    AnalyzeMultiRunOptions,
    AnalyzeOptions,
    AnalyzeRun,
    ReplayValidation,
    WorkerOptions,
} from '#types/analysis';
import type { GameProcessorAnalysisConfigFull, GameProcessorConfig } from '#types/analysis-runtime';
import type { ParsedGame } from '#types/parse-pgn';
import type { TrackerDef } from '#types/tracker';

/** Normalized analysis run: per-config runtime state plus path-selection flags. */
export interface NormalizedAnalysisRun {
    configs: GameProcessorAnalysisConfigFull[];
    parseHeaders: boolean;
}

/** Options threaded from public {@link AnalyzeOptions} into processor normalization. */
export interface NormalizeAnalysisOptions {
    headers?: boolean | 'auto';
    replay?: ReplayMode;
    /** When true, custom trackers must provide id, merge, and workerModule. */
    multithreaded?: boolean;
}

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

function normalizeProcessorConfig(
    filter: ((game: ParsedGame) => boolean) | undefined,
    maxGames: number | undefined,
): GameProcessorConfig {
    const hasFilter = filter !== undefined;

    return {
        hasFilter,
        filter: hasFilter ? filter : () => true,
        maxGames: maxGames ?? Infinity,
    };
}

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

function assertNoConflictingSingleRunFields(opts: AnalyzeMultiRunOptions): void {
    const extra = opts as AnalyzeMultiRunOptions & {
        trackers?: unknown;
        filter?: unknown;
        maxGames?: unknown;
    };
    if (extra.trackers !== undefined) {
        throw new Error('Cannot set both runs and top-level trackers');
    }
    if (extra.filter !== undefined) {
        throw new Error('Cannot set both runs and top-level filter');
    }
    if (extra.maxGames !== undefined) {
        throw new Error('Cannot set both runs and top-level maxGames');
    }
}

function assertValidationSupported(validation: ReplayValidation | undefined): void {
    if ((validation as string | undefined) === 'validate') {
        throw new Error('validation: "validate" is not yet implemented');
    }
}

/**
 * Convert public {@link AnalyzeOptions} into processor inputs.
 */
export function normalizeAnalyzeOptions(options?: AnalyzeOptions): {
    runs: AnalyzeRun[];
    multithreadCfg: WorkerOptions | null;
    onError: 'abort' | 'skip-game';
    headers?: boolean | 'auto';
    replay?: ReplayMode;
    /** True when the caller passed `runs` (multi-run options form). */
    multiRun: boolean;
} {
    const opts = options ?? {};

    assertValidationSupported(opts.validation);

    const multithreadCfg: WorkerOptions | null =
        opts.workers === false ? null : (opts.workers ?? {});

    const onError = opts.onError ?? 'abort';
    const { headers, replay } = opts;

    if (opts.runs !== undefined) {
        assertNoConflictingSingleRunFields(opts);
        if (opts.runs.length === 0) {
            throw new Error('runs must contain at least one entry');
        }
        assertFilterRequiresSingleThreaded(opts.runs, multithreadCfg);
        return {
            multithreadCfg,
            onError,
            headers,
            replay,
            runs: opts.runs,
            multiRun: true,
        };
    }

    const runs: AnalyzeRun[] = [
        { trackers: opts.trackers, filter: opts.filter, maxGames: opts.maxGames },
    ];
    assertFilterRequiresSingleThreaded(runs, multithreadCfg);
    return {
        multithreadCfg,
        onError,
        headers,
        replay,
        runs,
        multiRun: false,
    };
}

/**
 * Convert {@link AnalyzeRun}s into processor runtime state and path flags.
 * Side-effect free: callers assign the returned fields onto {@link GameProcessor}.
 */
export function normalizeAnalysisConfigs(
    runs: AnalyzeRun[],
    options?: NormalizeAnalysisOptions,
): NormalizedAnalysisRun {
    let needsHeaders = false;
    const multithreaded = options?.multithreaded ?? false;
    const normalized: GameProcessorAnalysisConfigFull[] = [];

    for (const run of runs) {
        const config = normalizeProcessorConfig(run.filter, run.maxGames);
        const defs: TrackerDef[] = [];

        if (run.trackers) {
            for (const tracker of run.trackers) {
                assertTrackerDef(tracker);
                defs.push(tracker);
                if (tracker.kind === 'game') {
                    needsHeaders = true;
                }
                if (multithreaded) {
                    assertMultithreadTrackerDef(tracker, BUILTIN_TRACKER_IDS);
                }
            }
        }

        const trackerHost = new TrackerHost(defs);
        const trackerData = multithreaded
            ? defs.map((tracker) => ({
                  id: tracker.id,
                  module: tracker.workerModule,
                  options: tracker.options,
              }))
            : [];

        const tempCfg: GameProcessorAnalysisConfigFull = {
            trackerHost,
            trackerData,
            config,
            processedMoves: 0,
            processedGames: 0,
            skippedGames: 0,
            errors: [],
            readGames: 0,
            isDone: false,
            replayMode: resolveEffectiveReplayMode(
                defs.some((def) => def.kind === 'move'),
                options?.replay,
            ),
        };

        normalized.push(tempCfg);
    }

    return {
        configs: normalized,
        parseHeaders: resolveParseHeaders(options?.headers, needsHeaders),
    };
}
