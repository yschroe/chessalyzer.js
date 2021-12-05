interface Game {
    Result?: string;
    ECO?: string;
    moves: string[];
}
interface Move {
    from: number[];
    to: number[];
}
interface MoveData {
    san: string;
    player: string;
    piece: string;
    castles: string;
    takes: {
        piece: string;
        pos: number[];
    };
    promotesTo: string;
    move: Move;
}
interface SquareData {
    alg: string;
    coords: number[];
    piece: {
        color: string;
        name: string;
    };
}
interface TrackerConfig {
    profilingActive: boolean;
}
interface Tracker {
    type: string;
    cfg: TrackerConfig;
    time: number;
    t0: number;
    path?: string;
    analyze: (arg: Game | MoveData) => void;
    track: (arg: Game | MoveData) => void;
    nextGame?: () => void;
    finish?: () => void;
    add?: (arg: this) => void;
}

declare class Chessalyzer {
    static startBatch(path: string, analyzer: Tracker | Tracker[], cfg?: {}, multithreadCfg?: {
        batchSize: number;
        nThreads: number;
    }): Promise<{
        cntGames: number;
        cntMoves: number;
    }>;
    static generateHeatmap(data: any, square: string | number[], fun: (data: any, sqrData: SquareData, loopSqrData: SquareData, optData: any) => number, optData?: {}): {
        map: any[];
        min: number;
        max: number;
    };
    static generateComparisonHeatmap(data1: any, data2: any, square: any, fun: any, optData?: {}): {
        map: any[];
        min: number;
        max: number;
    };
    static printHeatmap(map: number[][], min: any, max: number): void;
    static getStartingPiece(sqr: number[]): {
        color: string;
        name: string;
    };
}

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

declare class PieceTrackerBase extends BaseTracker {
    b: object;
    w: object;
    constructor();
    add(tracker: PieceTrackerBase): void;
    track(moveData: MoveData): void;
    processTakes(player: string, takingPiece: string, takenPiece: string): void;
}

interface StatsField {
    b: TileStats;
    w: TileStats;
    currentPiece: Piece;
}
declare class TileStats {
    movedTo: number;
    wasOn: number;
    killedOn: number;
    wasKilledOn: number;
    constructor();
}
declare class Piece {
    piece: string;
    color: string;
    lastMovedOn: number;
    constructor(piece: string, color: string);
}
declare class TileTrackerBase extends BaseTracker {
    cntMovesGame: number;
    cntMovesTotal: number;
    tiles: StatsField[][];
    constructor();
    add(tracker: TileTrackerBase): void;
    resetCurrentPiece(row: number, col: number): void;
    track(moveData: MoveData): void;
    nextGame(): void;
    processMove(move: Move, player: string, piece: string): void;
    processTakes(pos: number[], player: string, takingPiece: string, takenPiece: string): void;
    addOccupation(pos: number[]): void;
}

declare class GameTrackerBase extends BaseTracker {
    wins: number[];
    cntGames: number;
    ECO: object;
    constructor();
    add(tracker: GameTrackerBase): void;
    track(game: Game): void;
    finish(): void;
}

declare const _default$1: {
    Game: typeof GameTrackerBase;
    Piece: typeof PieceTrackerBase;
    Tile: typeof TileTrackerBase;
    Base: typeof BaseTracker;
};

declare const _default: {
    Tile: {
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
    Piece: {
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
};

export { Chessalyzer, _default as Heatmap, _default$1 as Tracker };
