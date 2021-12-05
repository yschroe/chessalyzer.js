import BaseTracker from './BaseTracker.js';
import { Game } from '../interfaces/Interface.js';

class GameTrackerBase extends BaseTracker {
	results: { white: number; black: number; draw: number };
	cntGames: number;
	ECO: object;

	constructor() {
		super('game');
		this.results = { white: 0, black: 0, draw: 0 };
		this.cntGames = 0;
		this.ECO = {};
	}

	add(tracker: GameTrackerBase) {
		this.results.white += tracker.results.white;
		this.results.black += tracker.results.black;
		this.results.draw += tracker.results.draw;
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

	track(game: Game) {
		this.cntGames += 1;
		switch (game.Result) {
			case '1-0':
				this.results.white += 1;
				break;

			case '1/2-1/2':
				this.results.draw += 1;
				break;

			case '0-1':
				this.results.black += 1;
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
