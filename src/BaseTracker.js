const { performance } = require('perf_hooks');

class BaseTracker {
	constructor() {
		this.profilingActive = false;
		this.time = 0;
		this.t0 = 0;

		if (this.track === undefined) {
			throw new TypeError(
				'Your analyzer must implement a track() method!'
			);
		}
	}

	startTimer() {
		if (this.profilingActive) this.t0 = performance.now();
	}

	endTimer() {
		if (this.profilingActive) this.time += performance.now() - this.t0;
	}
}

export default BaseTracker;
