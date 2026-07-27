import type { AnalysisConfig, MultithreadConfig } from '#types/analysis';
import type {
    GameProcessorAnalysisConfigFull,
    GameProcessorConfig,
} from '#types/analysis-runtime';

/** Normalized analysis run: per-config runtime state plus path-selection flags. */
export interface NormalizedAnalysisRun {
    configs: GameProcessorAnalysisConfigFull[];
    readInHeader: boolean;
    /** Prefer worker-side assemble when multithreaded and no filter / game limit. */
    useWorkerParse: boolean;
}

function normalizeProcessorConfig(config: AnalysisConfig['config'] | undefined): {
    config: GameProcessorConfig;
    needsHeader: boolean;
} {
    const c = config ?? {};
    const filterFn = c.filter;
    const hasFilter = filterFn !== undefined;

    return {
        needsHeader: hasFilter,
        config: {
            hasFilter,
            filter: hasFilter ? filterFn : () => true,
            cntGames: c.cntGames ?? Infinity,
        },
    };
}

/**
 * Convert user {@link AnalysisConfig}s into processor runtime state and path flags.
 * Side-effect free: callers assign the returned fields onto {@link GameProcessor}.
 */
export function normalizeAnalysisConfigs(
    configs: AnalysisConfig[],
    multithreadCfg: MultithreadConfig | null,
): NormalizedAnalysisRun {
    let readInHeader = false;
    let useWorkerParse = multithreadCfg !== null;
    const normalized: GameProcessorAnalysisConfigFull[] = [];

    for (const cfg of configs) {
        const { config, needsHeader } = normalizeProcessorConfig(cfg.config);
        if (needsHeader) readInHeader = true;

        const tempCfg: GameProcessorAnalysisConfigFull = {
            trackers: { move: [], game: [] },
            trackerData: [],
            config,
            processedMoves: 0,
            processedGames: 0,
            cntReadGames: 0,
            isDone: false,
        };

        if (cfg.trackers) {
            for (const tracker of cfg.trackers) {
                if (tracker.type === 'move') {
                    tempCfg.trackers.move.push(tracker);
                } else if (tracker.type === 'game') {
                    tempCfg.trackers.game.push(tracker);
                    // Game trackers need header tags (Result, ECO, …).
                    readInHeader = true;
                }

                tempCfg.trackerData.push({
                    name: tracker.constructor.name,
                    cfg: tracker.cfg,
                    path: tracker.path ?? '',
                });
            }
        }

        if (tempCfg.config.hasFilter || tempCfg.config.cntGames !== Infinity) {
            useWorkerParse = false;
        }

        normalized.push(tempCfg);
    }

    return { configs: normalized, readInHeader, useWorkerParse };
}
