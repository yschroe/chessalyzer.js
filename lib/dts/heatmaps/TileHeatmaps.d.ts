import TileTrackerBase from '../tracker/TileTrackerBase';
import { SquareData } from '../interfaces/Interface';
declare const _default: {
    TILE_OCC_ALL: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, _: SquareData, loopSqrData: SquareData) => number;
    };
    TILE_OCC_WHITE: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, _: SquareData, loopSqrData: SquareData) => number;
    };
    TILE_OCC_BLACK: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, _: SquareData, loopSqrData: SquareData) => number;
    };
    TILE_OCC_BY_PIECE: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, sqrData: SquareData, loopSqrData: SquareData) => number;
    };
    TILE_KILLCOUNT: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, _: SquareData, loopSqrData: SquareData) => number;
    };
    PIECE_MOVED_TO_TILE: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, sqrData: SquareData, loopSqrData: SquareData) => number;
    };
};
export default _default;
