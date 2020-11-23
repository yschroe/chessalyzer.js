export default GameProcessor;
/**
 * Class that processes games.
 */
declare class GameProcessor {
    static checkConfig(config: any): {
        hasFilter: any;
        filter: any;
        cntGames: any;
    };
    /**
     * Main analysis function for multithreading. Replays every game in the file and tracks statistics
     * @param {string} path Path to the PGN file.
     * @param {Function} config.filter - Filter function for selecting games
     * @param {Number} config.cntGames - Max amount of games to process
     * @param {Array<object>} analyzer An array of tracker objects. The data in the
     *  analyzers is processed by reference.
     * @param {number} batchSize Amount of games every worker shall process.
     * @param {number} nThreads Amount of parallel threads that are started, when
     * batchSize * nThreads games have been read in.
     * @returns {Promise}
     */
    static processPGNMultiCore(path: string, config: any, analyzer: Array<object>, batchSize: number, nThreads: number): Promise<any>;
    static algebraicToCoords(square: any): number[];
    static coordsToAlgebraic(coords: any): string;
    /**
     * Removes special characters like '#', '+', '?' and '!'
     * @param {string} move The move to be cleaned up
     * @returns {string} The input string with removed special characters
     */
    static preProcess(move: string): string;
    board: ChessBoard;
    currentMove: MoveData;
    activePlayer: number;
    cntMoves: number;
    cntGames: number;
    gameAnalyzers: any[];
    moveAnalyzers: any[];
    attachAnalyzers(analyzers: any): void;
    processPGN(path: any, config: any, analyzers: any, refreshRate: any): Promise<{
        cntGames: number;
        cntMoves: number;
    }>;
    processGame(game: any): void;
    reset(): void;
    /**
     * Parses a move in string format to board coordinates. Wrapper function for
     * the different move algorithms.
     * @param {string} rawMove The move to be parsed, e.g. 'Ne5+'.
     */
    parseMove(rawMove: string): void;
    /**
     * Returns the board coordinates for the move if it is a pawn move.
     * @param {string} moveSan The move to be parsed, e.g. 'e5'.
     */
    pawnMove(moveSan: string): void;
    /**
     * Returns the board coordinates for a piece (!= pawn) move.
     * @param {string} moveSan The move to be parsed, e.g. 'Be3'.
     */
    pieceMove(moveSan: string): void;
    /**
     * Search algorithm to find a piece.
     * @param {number} tarRow Target row for piece move.
     * @param {number} tarCol Target column for piece move.
     * @param {number} mustBeInRow Moving piece must be in this row. '-1' if unknown.
     * @param {number} mustBeInCol Moving piece must be in this column. '-1' if unknown.
     * @param {string} token Moving piece must be of this type, e.g 'R'.
     * @returns {Object}
     */
    findPiece(tarRow: number, tarCol: number, mustBeInRow: number, mustBeInCol: number, token: string): any;
    /**
     * Checks if the input move would be resulting with the king being in check.
     * @param {Number[]} from Coordinates of the source tile of the move that shall be checked.
     *  @param {Number[]} to Coordinates of the target tile of the move that shall be checked.
     * @returns {boolean} After the move, the king will be in check true/false.
     */
    checkCheck(from: number[], to: number[]): boolean;
}
import ChessBoard from "./ChessBoard";
declare class MoveData {
    san: string;
    player: string;
    piece: string;
    castles: string;
    takes: {};
    promotesTo: string;
    from: number[];
    to: number[];
}
