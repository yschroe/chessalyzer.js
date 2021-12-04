import BaseTracker from './BaseTracker.js';
import { Game } from '../interfaces/Interface.js';
declare class GameTrackerBase extends BaseTracker {
    wins: number[];
    cntGames: number;
    ECO: object;
    constructor();
    add(tracker: GameTrackerBase): void;
    track(game: Game): void;
    finish(): void;
}
export default GameTrackerBase;
