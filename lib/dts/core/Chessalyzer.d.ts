import { Tracker } from '../interfaces/Interface.js';
export default class Chessalyzer {
    static startBatch(path: string, analyzer: Tracker | Tracker[], cfg?: {}, multithreadCfg?: {
        batchSize: number;
        nThreads: number;
    }): Promise<{
        cntGames: number;
        cntMoves: number;
    }>;
    static generateHeatmap(data: any, square: string | number[], fun: (data: any, sqrData: any, loopSqrData: any, optData: any) => number, optData?: {}): {
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
