import BaseTracker from './BaseTracker.js';

class GameTrackerBase extends BaseTracker {
	wins: number[];
	cntGames: number;
	ECO: object;

	constructor() {
		super('game');
		this.wins = [0, 0, 0];
		this.cntGames = 0;
		this.ECO = {};
	}

	add(tracker) {
		this.wins[0] += tracker.wins[0];
		this.wins[1] += tracker.wins[1];
		this.wins[2] += tracker.wins[2];
		this.cntGames += tracker.cntGames;
		this.time += tracker.time;

		Object.keys(tracker.ECO).forEach((key) => {
			if (Object.prototype.hasOwnProperty.call(this.ECO, key)) {
				this.ECO[key] += tracker.ECO[key];
			} else {
				this.ECO[key] = tracker.ECO[key];
			}
		});
	}

	track(game) {
		this.cntGames += 1;
		switch (game.Result) {
			case '1-0':
				this.wins[0] += 1;
				break;

			case '1/2-1/2':
				this.wins[1] += 1;
				break;

			case '0-1':
				this.wins[2] += 1;
				break;

			default:
				break;
		}
		if (Object.prototype.hasOwnProperty.call(this.ECO, game.ECO)) {
			this.ECO[game.ECO] += 1;
		} else {
			this.ECO[game.ECO] = 1;
		}
	}

	finish() {
		// sort keys
		this.ECO = Object.keys(this.ECO)
			.sort()
			.reduce((accumulator, currentValue) => {
				accumulator[currentValue] = this.ECO[currentValue];
				return accumulator;
			}, {});
	}
}

export default GameTrackerBase;
