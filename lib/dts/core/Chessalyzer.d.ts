import { Tracker } from '../interfaces/Interface.js';
/** Main class for batch processing and generating heat maps */
export default class Chessalyzer {
    static startBatch(path: string, analyzer: Tracker | Tracker[], cfg?: {}, multithreadCfg?: {
        batchSize: number;
        nThreads: number;
    }): Promise<{
        cntGames: number;
        cntMoves: number;
    }>;
    static generateHeatmap(data: any, square: any, fun: any, optData?: {}): {
        map: any[];
        min: number;
        max: number;
    };
    static generateComparisonHeatmap(data1: any, data2: any, square: any, fun: any, optData?: {}): {
        map: any[];
        min: number;
        max: number;
    };
    static printHeatmap(map: any, min: any, max: any): void;
    static getStartingPiece(sqr: any): {
        color: string;
        name: string;
    };
}
