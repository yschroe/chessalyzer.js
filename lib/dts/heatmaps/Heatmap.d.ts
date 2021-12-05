declare const _default: {
    Tile: {
        TILE_OCC_ALL: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, _: import("../interfaces/Interface").SquareData, loopSqrData: import("../interfaces/Interface").SquareData) => number;
        };
        TILE_OCC_WHITE: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, _: import("../interfaces/Interface").SquareData, loopSqrData: import("../interfaces/Interface").SquareData) => number;
        };
        TILE_OCC_BLACK: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, _: import("../interfaces/Interface").SquareData, loopSqrData: import("../interfaces/Interface").SquareData) => number;
        };
        TILE_OCC_BY_PIECE: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, sqrData: import("../interfaces/Interface").SquareData, loopSqrData: import("../interfaces/Interface").SquareData) => number;
        };
        TILE_KILLCOUNT: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, _: import("../interfaces/Interface").SquareData, loopSqrData: import("../interfaces/Interface").SquareData) => number;
        };
        PIECE_MOVED_TO_TILE: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/TileTrackerBase").default, sqrData: import("../interfaces/Interface").SquareData, loopSqrData: import("../interfaces/Interface").SquareData) => number;
        };
    };
    Piece: {
        PIECE_KILLED_BY: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/PieceTrackerBase").default, sqrData: import("../interfaces/Interface").SquareData, loopSqrData: import("../interfaces/Interface").SquareData) => number;
        };
        PIECE_KILLED: {
            long_name: string;
            type: string;
            scope: string;
            unit: string;
            description: string;
            calc: (data: import("../tracker/PieceTrackerBase").default, sqrData: import("../interfaces/Interface").SquareData, loopSqrData: import("../interfaces/Interface").SquareData) => number;
        };
    };
};
export default _default;
