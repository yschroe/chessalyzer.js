import type { AnalysisConfig, AnalyzeOptions, MultithreadConfig } from '#types/analysis';
import type { GameProcessorAnalysisConfigFull, GameProcessorConfig } from '#types/analysis-runtime';
import type { Tracker } from '#types/tracker';

/** Normalized analysis run: per-config runtime state plus path-selection flags. */
export interface NormalizedAnalysisRun {
    configs: GameProcessorAnalysisConfigFull[];
    readInHeader: boolean;
}

function resolveWorkerModule(tracker: { constructor: unknown }): string {
    const ctor = tracker.constructor as { workerModule?: string };
    return ctor.workerModule ?? '';
}

function resolveTrackerId(tracker: Tracker): string {
    const id = (tracker.constructor as { trackerId?: string }).trackerId;
    if (!id) {
        throw new Error(
            'Tracker is missing static trackerId (required for multithreaded analysis)',
        );
    }
    return id;
}

function normalizeProcessorConfig(
    filter: ((game: import('#types/game').Game) => boolean) | undefined,
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
            cntGames: maxGames ?? Infinity,
        },
    };
}

function toAnalysisConfig(
    trackers: AnalysisConfig['trackers'],
    filter: ((game: import('#types/game').Game) => boolean) | undefined,
    maxGames: number | undefined,
): AnalysisConfig {
    return {
        trackers,
        config: {
            filter,
            cntGames: maxGames,
        },
    };
}

/**
 * Convert public {@link AnalyzeOptions} into processor inputs.
 */
export function normalizeAnalyzeOptions(options?: AnalyzeOptions): {
    configs: AnalysisConfig[];
    multithreadCfg: MultithreadConfig | null;
    onError: 'abort' | 'skip-game';
} {
    const opts = options ?? {};

    const multithreadCfg: MultithreadConfig | null =
        opts.workers === false ? null : (opts.workers ?? {});

    const onError = opts.onError ?? 'abort';

    if (opts.runs && opts.runs.length > 0) {
        return {
            multithreadCfg,
            onError,
            configs: opts.runs.map((run) =>
                toAnalysisConfig(run.trackers, run.filter, run.maxGames),
            ),
        };
    }

    return {
        multithreadCfg,
        onError,
        configs: [toAnalysisConfig(opts.trackers, opts.filter, opts.maxGames)],
    };
}

/**
 * Convert user {@link AnalysisConfig}s into processor runtime state and path flags.
 * Side-effect free: callers assign the returned fields onto {@link GameProcessor}.
 */
export function normalizeAnalysisConfigs(
    configs: AnalysisConfig[],
    _multithreadCfg: MultithreadConfig | null,
): NormalizedAnalysisRun {
    let readInHeader = false;
    const normalized: GameProcessorAnalysisConfigFull[] = [];

    for (const cfg of configs) {
        const { config, needsHeader } = normalizeProcessorConfig(
            cfg.config?.filter,
            cfg.config?.cntGames,
        );
        if (needsHeader) readInHeader = true;

        const tempCfg: GameProcessorAnalysisConfigFull = {
            trackers: { move: [], game: [] },
            trackerData: [],
            config,
            processedMoves: 0,
            processedGames: 0,
            skippedGames: 0,
            errors: [],
            cntReadGames: 0,
            isDone: false,
        };

        if (cfg.trackers) {
            for (const tracker of cfg.trackers) {
                if (tracker.type === 'move') {
                    tempCfg.trackers.move.push(tracker);
                } else if (tracker.type === 'game') {
                    tempCfg.trackers.game.push(tracker);
                    readInHeader = true;
                }

                tempCfg.trackerData.push({
                    id: resolveTrackerId(tracker),
                    cfg: tracker.cfg,
                    path: resolveWorkerModule(tracker),
                });
            }
        }

        normalized.push(tempCfg);
    }

    return { configs: normalized, readInHeader };
}
