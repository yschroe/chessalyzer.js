import { performance } from 'node:perf_hooks';

import { generateComparisonHeatmap, generateHeatmap } from '#trackers/heatmap-utils';
import type { Action } from '#types/actions';
import type { Game } from '#types/game';
import type {
    HeatmapAnalysisFunc,
    HeatmapData,
    HeatmapPresetEntry,
    Tracker,
    TrackerConfig,
} from '#types/tracker';

class BaseTracker implements Tracker {
    readonly type: 'move' | 'game';
    cfg: TrackerConfig;
    time: number;
    t0: number;
    heatmapPresets: Record<string, HeatmapPresetEntry> | null;

    /** Stable ID for worker-side tracker lookup (minification-safe). */
    static trackerId?: string;

    /** Module URL for worker-side dynamic import of custom trackers. */
    static workerModule?: string;

    constructor(type: 'move' | 'game') {
        this.type = type;
        this.cfg = {
            profilingActive: false,
        };
        this.time = 0;
        this.t0 = 0;
        this.heatmapPresets = {};
    }

    analyze(data: Game | Action[]) {
        if (this.cfg.profilingActive) this.t0 = performance.now();
        this.track(data);
        if (this.cfg.profilingActive) this.time += performance.now() - this.t0;
    }

    track(_data: Game | Action[]) {
        throw new Error('Your tracker must implement a track(...) method!');
    }

    merge(_data: Tracker) {
        throw new Error(
            'Your tracker must implement merge(...) when using multithreaded analysis!',
        );
    }

    private resolveHeatmapFunc(analysisFunc: string | HeatmapAnalysisFunc): HeatmapAnalysisFunc {
        if (typeof analysisFunc !== 'string') return analysisFunc;

        if (!this.heatmapPresets || Object.keys(this.heatmapPresets).length === 0) {
            throw new Error('Your tracker does not define any heatmap presets!');
        }
        const preset = this.heatmapPresets[analysisFunc];
        if (!preset) throw new Error(`Heatmap preset '${analysisFunc}' not found!`);
        return preset.calc;
    }

    generateHeatmap(
        analysisFunc: string | HeatmapAnalysisFunc,
        square?: string | number[],
        optData?: unknown,
    ): HeatmapData {
        return generateHeatmap(this, this.resolveHeatmapFunc(analysisFunc), square, optData);
    }

    generateComparisonHeatmap(
        compData: Tracker,
        analysisFunc: string | HeatmapAnalysisFunc,
        square?: string | number[],
        optData?: unknown,
    ): HeatmapData {
        return generateComparisonHeatmap(
            this,
            compData,
            this.resolveHeatmapFunc(analysisFunc),
            square,
            optData,
        );
    }
}

/** Abstract base for move-level trackers (receive {@link Action}[] per half-move). */
export abstract class MoveTracker extends BaseTracker {
    override readonly type = 'move' as const;

    constructor() {
        super('move');
    }

    override track(data: Game | Action[]): void {
        if (Array.isArray(data)) this.trackMoves(data);
    }

    abstract trackMoves(actions: Action[]): void;
    abstract override merge(other: Tracker): void;
}

/** Abstract base for game-level trackers (receive {@link Game} after each game). */
export abstract class GameTrackerBase extends BaseTracker {
    override readonly type = 'game' as const;

    constructor() {
        super('game');
    }

    override track(data: Game | Action[]): void {
        if (!Array.isArray(data)) this.trackGame(data);
    }

    abstract trackGame(game: Game): void;
    abstract override merge(other: Tracker): void;
}

export { BaseTracker };
