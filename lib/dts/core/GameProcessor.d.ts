import { Game, Move, MoveData, Tracker } from '../interfaces/Interface.js';
import ChessBoard from './ChessBoard.js';
interface GameProcessorConfig {
    hasFilter: boolean;
    filter: (game: object) => boolean;
    cntGames: number;
}
interface MultithreadConfig {
    batchSize: number;
    nThreads: number;
}
declare class ParsedMove implements MoveData {
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
    constructor();
}
/**
 * Class that processes games.
 */
declare class GameProcessor {
    board: ChessBoard;
    activePlayer: number;
    cntMoves: number;
    cntGames: number;
    gameAnalyzers: Tracker[];
    moveAnalyzers: Tracker[];
    analyzerNames: string[];
    analyzerConfigs: object[];
    constructor();
    static checkConfig(config: any): GameProcessorConfig;
    attachAnalyzers(analyzers: Tracker[]): void;
    processPGN(path: string, analyzer: Tracker[], config: any, multiThreadCfg: MultithreadConfig): Promise<{
        cntGames: number;
        cntMoves: number;
    }>;
    processGame(game: Game): void;
    reset(): void;
    parseMove(rawMove: string): ParsedMove;
    pawnMove(san: string): ParsedMove;
    pieceMove(san: string): ParsedMove;
    castle(san: string): ParsedMove;
    findPiece(tarRow: number, tarCol: number, mustBeInRow: number, mustBeInCol: number, token: string, player: string): Move;
    checkCheck(move: Move, player: string): boolean;
    static algebraicToCoords(square: string): number[];
    static coordsToAlgebraic(coords: number[]): string;
    static preProcess(move: string): string;
}
export default GameProcessor;
