import BaseTracker from './BaseTracker';

class GameTracker extends BaseTracker {
	constructor() {
		super('game');
		this.wins = [0, 0, 0];
		this.cntGames = 0;
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

export default GameTracker;
