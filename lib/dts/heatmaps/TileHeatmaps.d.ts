import TileTrackerBase from '../tracker/TileTrackerBase';
declare const _default: {
    TILE_OCC_ALL: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, _: any, loopSqrData: any) => number;
    };
    TILE_OCC_WHITE: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, _: any, loopSqrData: any) => number;
    };
    TILE_OCC_BLACK: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, _: any, loopSqrData: any) => number;
    };
    TILE_OCC_BY_PIECE: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, sqrData: any, loopSqrData: any) => number;
    };
    TILE_KILLCOUNT: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, _: any, loopSqrData: any) => number;
    };
    PIECE_MOVED_TO_TILE: {
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: TileTrackerBase, sqrData: any, loopSqrData: any) => number;
    };
};
export default _default;
