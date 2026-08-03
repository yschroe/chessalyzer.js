import { analyzePGN, printHeatmap } from 'chessalyzer';
import {
    generateComparisonHeatmap,
    generateHeatmap,
    TileHeatmapPresets,
    tileTracker,
} from 'chessalyzer/trackers';

const blackWins = tileTracker();
const whiteWins = tileTracker();

const data = await analyzePGN('./pgn/asorted-games.pgn', {
    workers: false,
    runs: [
        {
            trackers: [blackWins],
            maxGames: 2000,
            filter: (game) => game.result === '0-1',
        },
        {
            trackers: [whiteWins],
            maxGames: 2000,
            filter: (game) => game.result === '1-0',
        },
    ],
});
console.log(data);

const queenMoves = TileHeatmapPresets.PIECE_MOVED_TO_TILE({ color: 'w', name: 'Qd' });
printHeatmap(generateHeatmap(blackWins.state, queenMoves));
printHeatmap(generateHeatmap(whiteWins.state, queenMoves));
printHeatmap(generateComparisonHeatmap(blackWins.state, whiteWins.state, queenMoves));
