import { Game, MoveData, Tracker, TrackerConfig } from '../interfaces/Interface.js';
declare class BaseTracker implements Tracker {
    type: string;
    cfg: TrackerConfig;
    time: number;
    t0: number;
    path?: string;
    constructor(type: string);
    analyze(data: Game | MoveData): void;
    track(data: Game | MoveData): void;
}
export default BaseTracker;
