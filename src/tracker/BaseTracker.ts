import { performance } from 'perf_hooks';
import {
	Game,
	MoveData,
	Tracker,
	TrackerConfig
} from '../interfaces/Interface.js';

class BaseTracker implements Tracker {
	type: string;
	cfg: TrackerConfig;
	time: number;
	t0: number;
	path?: string;

	constructor(type: string) {
		this.type = type;
		this.cfg = {
			profilingActive: false
		};
		this.time = 0;
		this.t0 = 0;

		if (this.type === undefined) {
			throw new Error('Your analyzer must specify a type!');
		}
	}

	analyze(data: Game | MoveData) {
		if (this.cfg.profilingActive) this.t0 = performance.now();
		this.track(data);
		if (this.cfg.profilingActive) this.time += performance.now() - this.t0;
	}

	track(data: Game | MoveData) {
		throw new Error('Your analyzer must implement a track() method!');
	}

	finish() {
		return;
	}
	add(tracker: BaseTracker) {
		return;
	}
}

export default BaseTracker;
