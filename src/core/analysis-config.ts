import { resolveEffectiveReplayMode } from '#replay/replay-mode';
import type { ReplayMode } from '#replay/replay-mode';
import type { AnalyzeOptions, AnalyzeRun, WorkerOptions } from '#types/analysis';
import type { GameProcessorAnalysisConfigFull, GameProcessorConfig } from '#types/analysis-runtime';
import type { Game } from '#types/game';
import type { Tracker } from '#types/tracker';

/** Normalized analysis run: per-config runtime state plus path-selection flags. */
export interface NormalizedAnalysisRun {
    configs: GameProcessorAnalysisConfigFull[];
    parseHeaders: boolean;
}

/** Options threaded from public {@link AnalyzeOptions} into processor normalization. */
export interface NormalizeAnalysisOptions {
    headers?: boolean;
    replay?: ReplayMode;
}

function resolveParseHeaders(explicit: boolean | undefined, inferred: boolean): boolean {
    if (explicit !== undefined) return explicit || inferred;
    return inferred;
}

function resolveWorkerModule(tracker: { constructor: unknown }): string {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- static workerModule lives on constructor, not Tracker instance type
    const ctor = tracker.constructor as { workerModule?: string };
    return ctor.workerModule ?? '';
}

function resolveTrackerId(tracker: Tracker): string {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- static trackerId lives on constructor, not Tracker instance type
    const id = (tracker.constructor as { trackerId?: string }).trackerId;
    if (!id) {
        throw new Error(
            'Tracker is missing static trackerId (required for multithreaded analysis)',
        );
    }
    return id;
}

function normalizeProcessorConfig(
    filter: ((game: Game) => boolean) | undefined,
    maxGames: number | undefined,
): {
    config: GameProcessorConfig;
    needsHeader: boolean;
} {
    const hasFilter = filter !== undefined;

    return {
        needsHeader: hasFilter,
        config: {
            hasFilter,
            filter: hasFilter ? filter : () => true,
            maxGames: maxGames ?? Infinity,
        },
    };
}

/**
 * Convert public {@link AnalyzeOptions} into processor inputs.
 */
export function normalizeAnalyzeOptions(options?: AnalyzeOptions): {
    runs: AnalyzeRun[];
    multithreadCfg: WorkerOptions | null;
    onError: 'abort' | 'skip-game';
    headers?: boolean;
    replay?: ReplayMode;
} {
    const opts = options ?? {};

    const multithreadCfg: WorkerOptions | null =
        opts.workers === false ? null : (opts.workers ?? {});

    const onError = opts.onError ?? 'abort';
    const { headers, replay } = opts;

    if (opts.runs && opts.runs.length > 0) {
        return {
            multithreadCfg,
            onError,
            headers,
            replay,
            runs: opts.runs,
        };
    }

    return {
        multithreadCfg,
        onError,
        headers,
        replay,
        runs: [{ trackers: opts.trackers, filter: opts.filter, maxGames: opts.maxGames }],
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
    let inferredHeaders = false;
    const normalized: GameProcessorAnalysisConfigFull[] = [];

    for (const run of runs) {
        const { config, needsHeader } = normalizeProcessorConfig(run.filter, run.maxGames);
        if (needsHeader) inferredHeaders = true;

        const tempCfg: GameProcessorAnalysisConfigFull = {
            trackers: { move: [], game: [] },
            trackerData: [],
            config,
            processedMoves: 0,
            processedGames: 0,
            skippedGames: 0,
            errors: [],
            readGames: 0,
            isDone: false,
            replayMode: 'skip',
        };

        if (run.trackers) {
            for (const tracker of run.trackers) {
                if (tracker.type === 'move') {
                    tempCfg.trackers.move.push(tracker);
                } else if (tracker.type === 'game') {
                    tempCfg.trackers.game.push(tracker);
                    inferredHeaders = true;
                }

                tempCfg.trackerData.push({
                    id: resolveTrackerId(tracker),
                    cfg: tracker.cfg,
                    path: resolveWorkerModule(tracker),
                });
            }
        }

        tempCfg.replayMode = resolveEffectiveReplayMode(
            tempCfg.trackers.move.length > 0,
            options?.replay,
        );

        normalized.push(tempCfg);
    }

    return {
        configs: normalized,
        parseHeaders: resolveParseHeaders(options?.headers, inferredHeaders),
    };
}
