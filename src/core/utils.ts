/**
 * Backward-compatible facade for coordinate and heatmap helpers.
 *
 * New code should import directly from:
 * - `board/board-coords` — algebraic conversion
 * - `board/piece-names` — starting piece names
 * - `tracker/heatmap-utils` — heatmap grid generation
 */
import {
    algebraicToCoords,
    algebraicToCoordsAt,
    coordsToAlgebraic,
    getFileNumber,
    getRowCol,
} from '../board/board-coords';
import { getStartingPiece } from '../board/piece-names';
import { generateComparisonHeatmap, generateHeatmap } from '../tracker/heatmap-utils';

export default class Utils {
    static algebraicToCoords = algebraicToCoords;
    static algebraicToCoordsAt = algebraicToCoordsAt;
    static coordsToAlgebraic = coordsToAlgebraic;
    static getRowCol = getRowCol;
    static getFileNumber = getFileNumber;
    static getStartingPiece = getStartingPiece;
    static generateHeatmap = generateHeatmap;
    static generateComparisonHeatmap = generateComparisonHeatmap;
}
