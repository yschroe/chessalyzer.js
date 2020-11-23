export default BaseTracker;
declare class BaseTracker {
    constructor(type: any);
    type: any;
    cfg: {
        profilingActive: boolean;
    };
    time: number;
    t0: number;
    analyze(data: any): void;
}
