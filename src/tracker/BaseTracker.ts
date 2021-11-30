import { performance } from 'perf_hooks';
import { Tracker, TrackerConfig } from '../interfaces/Interface.js';

class BaseTracker implements Tracker {
	type: string;
	cfg: TrackerConfig;
	time: number;
	t0: number;
	path?: string;

	constructor(type) {
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

	analyze(data) {
		if (this.cfg.profilingActive) this.t0 = performance.now();
		this.track(data);
		if (this.cfg.profilingActive) this.time += performance.now() - this.t0;
	}

	track(_) {
		throw new Error('Your analyzer must implement a track() method!');
	}

	finish() {}
	add(tracker: BaseTracker) {}
}

export default BaseTracker;
