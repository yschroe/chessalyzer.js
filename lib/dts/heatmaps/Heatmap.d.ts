declare const _default: {
    Tile: {
        TILE_OCC_ALL: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, _: any, loopSqrData: any) => number;
        };
        TILE_OCC_WHITE: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, _: any, loopSqrData: any) => number;
        };
        TILE_OCC_BLACK: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, _: any, loopSqrData: any) => number;
        };
        TILE_OCC_BY_PIECE: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, sqrData: any, loopSqrData: any) => number;
        };
        TILE_KILLCOUNT: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, _: any, loopSqrData: any) => number;
        };
        PIECE_MOVED_TO_TILE: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, sqrData: any, loopSqrData: any) => number;
        };
    };
    Piece: {
        PIECE_KILLED_BY: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/PieceTrackerBase").default, sqrData: any, loopSqrData: any) => number;
        };
        PIECE_KILLED: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/PieceTrackerBase").default, sqrData: any, loopSqrData: any) => number;
        };
    };
};
export default _default;
