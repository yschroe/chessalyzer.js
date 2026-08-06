import { analyzePGN } from 'chessalyzer';
import { tileTracker } from 'chessalyzer/trackers';

/*
 * Basic example of analyzing a PGN file. In the most simple form (no filters, no trackers),
 * it will only return a summary of the games in the PGN file.
 */

const result = await analyzePGN('pgn/asorted-games.pgn');
console.log(result);

const result2 = await analyzePGN('pgn/asorted-games.pgn', {
    filter: (game) => Number(game.headers?.WhiteElo ?? 0) > 1500,
});
console.log(result2);

const tiles = tileTracker();
const result3 = await analyzePGN('pgn/asorted-games.pgn', {
    filter: (game) => Number(game.headers?.WhiteElo ?? 0) > 1500,
    trackers: [tiles],
});
console.log(result3);
console.log(tiles.state);
