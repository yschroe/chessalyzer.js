import PieceTrackerBase from '../tracker/PieceTrackerBase';
import { SquareData } from '../interfaces/Interface';
declare const _default: {
    PIECE_KILLED_BY: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: PieceTrackerBase, sqrData: SquareData, loopSqrData: SquareData) => number;
    };
    PIECE_KILLED: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: PieceTrackerBase, sqrData: SquareData, loopSqrData: SquareData) => number;
    };
};
export default _default;
