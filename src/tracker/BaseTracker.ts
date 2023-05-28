import { performance } from 'node:perf_hooks';
import Utils from '../core/Utils.js';
import type {
	Game,
	Action,
	Tracker,
	TrackerConfig,
	HeatmapAnalysisFunc,
	HeatmapData
} from '../interfaces/index.js';

class BaseTracker implements Tracker {
	type: 'move' | 'game';
	cfg: TrackerConfig;
	time: number;
	t0: number;
	heatmapPresets: { [name: string]: { calc: HeatmapAnalysisFunc } };

	constructor(type: 'move' | 'game') {
		this.type = type;
		this.cfg = {
			profilingActive: false
		};
		this.time = 0;
		this.t0 = 0;
		this.heatmapPresets = {};

		if (this.type === undefined) {
			throw new Error('Your analyzer must specify a type!');
		}
	}

	analyze(data: Game | Action[]) {
		if (this.cfg.profilingActive) this.t0 = performance.now();
		this.track(data);
		if (this.cfg.profilingActive) this.time += performance.now() - this.t0;
	}

	track(_data: Game | Action[]) {
		throw new Error('Your analyzer must implement a track(...) method!');
	}

	add(_data: this) {
		throw new Error(
			'Your analyzer must implement an add(...) method if you are using multihread mode!'
		);
	}

	generateHeatmap(
		analysisFunc: string | HeatmapAnalysisFunc,
		square?: string | number[],
		optData?: unknown
	): HeatmapData {
		let heatmapFunction: HeatmapAnalysisFunc;

		if (typeof analysisFunc === 'string') {
			if (Object.keys(this.heatmapPresets).length === 0)
				throw new Error(
					'Your analyzer does not define any heatmap presets!'
				);
			heatmapFunction = this.heatmapPresets[analysisFunc]?.calc;
			if (!heatmapFunction)
				throw new Error(`Heatmap preset '${analysisFunc}' not found!`);
		} else {
			heatmapFunction = analysisFunc;
		}

		return Utils.generateHeatmap(this, heatmapFunction, square, optData);
	}

	generateComparisonHeatmap(
		compData: this,
		analysisFunc: string | HeatmapAnalysisFunc,
		square?: string | number[],
		optData?: unknown
	): HeatmapData {
		let heatmapFunction: HeatmapAnalysisFunc;

		if (typeof analysisFunc === 'string') {
			if (Object.keys(this.heatmapPresets).length === 0)
				throw new Error(
					'Your analyzer does not define any heatmap presets!'
				);
			heatmapFunction = this.heatmapPresets[analysisFunc]?.calc;
			if (!heatmapFunction)
				throw new Error(`Heatmap preset '${analysisFunc}' not found!`);
		} else {
			heatmapFunction = analysisFunc;
		}

		return Utils.generateComparisonHeatmap(
			this,
			compData,
			heatmapFunction,
			square,
			optData
		);
	}
}

export default BaseTracker;
