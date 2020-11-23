export default ChessBoard;
declare class ChessBoard {
    tiles: any[];
    defaultTiles: any[];
    pieces: PiecePositionTable;
    promoteCounter: number;
    move(moveData: any): void;
    castle(move: any, player: any): void;
    reset(): void;
    /** Prints the current board position to the console. */
    printPosition(): void;
}
declare class PiecePositionTable {
    posMap: {
        w: {
            R: {
                Ra: number[];
                Rh: number[];
            };
            N: {
                Nb: number[];
                Ng: number[];
            };
            B: {
                Bc: number[];
                Bf: number[];
            };
            Q: {
                Qd: number[];
            };
            K: {
                Ke: number[];
            };
        };
        b: {
            R: {
                Ra: number[];
                Rh: number[];
            };
            N: {
                Nb: number[];
                Ng: number[];
            };
            B: {
                Bc: number[];
                Bf: number[];
            };
            Q: {
                Qd: number[];
            };
            K: {
                Ke: number[];
            };
        };
    };
    takes(player: any, piece: any): void;
    moves(player: any, piece: any, to: any): void;
    promotes(player: any, piece: any, on: any): void;
}
