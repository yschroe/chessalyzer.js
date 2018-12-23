const { performance } = require('perf_hooks');

class BaseTracker {
	constructor(type) {
		this.type = type;
		this.profilingActive = false;
		this.time = 0;
		this.t0 = 0;

		if (this.track === undefined) {
			throw new TypeError(
				'Your analyzer must implement a track() method!'
			);
		}
		if (this.type === undefined) {
			throw new TypeError('Your analyzer must specify a type!');
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
