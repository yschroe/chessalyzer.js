import { performance } from 'perf_hooks';
import Utils from '../core/Utils.js';
import {
	Game,
	MoveData,
	Tracker,
	TrackerConfig,
	HeatmapAnalysisFunc,
	HeatmapData
} from '../interfaces/Interface.js';

class BaseTracker implements Tracker {
	type: string;
	cfg: TrackerConfig;
	time: number;
	t0: number;
	heatmapPresets: unknown;

	constructor(type: string) {
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

	analyze(data: Game | MoveData) {
		if (this.cfg.profilingActive) this.t0 = performance.now();
		this.track(data);
		if (this.cfg.profilingActive) this.time += performance.now() - this.t0;
	}

	track(_data: Game | MoveData) {
		throw new Error('Your analyzer must implement a track(...) method!');
	}

	add(_data: this) {
		throw new Error(
			'Your analyzer must implement an add(...) method if you are using multihread mode!'
		);
	}

	generateHeatmap(
		fun: string | HeatmapAnalysisFunc,
		square?: string | number[],
		optData?: unknown
	): HeatmapData {
		let heatmapFunction: HeatmapAnalysisFunc;

		if (typeof fun === 'string') {
			heatmapFunction = this.heatmapPresets[fun].calc;
		} else {
			heatmapFunction = fun;
		}

		return Utils.generateHeatmap(this, heatmapFunction, square, optData);
	}

	generateComparisonHeatmap(
		compData: this,
		fun: string | HeatmapAnalysisFunc,
		square?: string | number[],
		optData?: unknown
	): HeatmapData {
		let heatmapFunction: HeatmapAnalysisFunc;

		if (typeof fun === 'string') {
			if (Object.keys(this.heatmapPresets).length === 0)
				throw new Error(
					'Your analyzer does not define any heatmap presets!'
				);
			heatmapFunction =
				this.heatmapPresets[fun] && this.heatmapPresets[fun].calc;
			if (!heatmapFunction)
				throw new Error(`Heatmap preset '${fun}' not found!`);
		} else {
			heatmapFunction = fun;
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
