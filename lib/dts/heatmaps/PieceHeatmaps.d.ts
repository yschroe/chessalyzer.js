import PieceTrackerBase from '../tracker/PieceTrackerBase';
declare const _default: {
    PIECE_KILLED_BY: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: PieceTrackerBase, sqrData: any, loopSqrData: any) => number;
    };
    PIECE_KILLED: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: PieceTrackerBase, sqrData: any, loopSqrData: any) => number;
    };
};
export default _default;
