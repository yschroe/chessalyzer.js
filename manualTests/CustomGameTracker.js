import { Tracker } from '../lib/chessalyzer.js';

export default class CustomGameTracker extends Tracker.Base {
	constructor() {
		super('game');
		this.path = __filename;
		this.wins = [0, 0, 0];
		this.cntGames = 0;
	}

	add(tracker) {
		this.wins[0] += tracker.wins[0];
		this.wins[1] += tracker.wins[1];
		this.wins[2] += tracker.wins[2];
		this.cntGames += tracker.cntGames;
		this.time += tracker.time;
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
	}
}
