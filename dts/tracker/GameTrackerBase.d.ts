export default GameTrackerBase;
declare class GameTrackerBase extends BaseTracker {
	constructor();
	wins: number[];
	cntGames: number;
	ECO: {};
	add(tracker: any): void;
	track(game: any): void;
	finish(): void;
}
import BaseTracker from './BaseTracker';
