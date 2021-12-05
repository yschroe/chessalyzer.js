import { MoveData, ChessPiece } from '../interfaces/Interface';
declare class PiecePositionTable {
    posMap: unknown;
    constructor();
    takes(player: string, piece: string): void;
    moves(player: string, piece: string, to: number[]): void;
    promotes(player: string, piece: string, on: number[]): void;
}
declare class ChessBoard {
    tiles: ChessPiece[][];
    defaultTiles: ChessPiece[][];
    pieces: PiecePositionTable;
    promoteCounter: number;
    constructor();
    move(moveData: MoveData): void;
    castle(move: string, player: string): void;
    reset(): void;
    /** Prints the current board position to the console. */
    printPosition(): void;
}
export default ChessBoard;
