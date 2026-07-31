import { analyzePGN } from 'chessalyzer';

console.time('Time elapsed');
const header = await analyzePGN('./pgn/lichess_db_standard_rated_2013-12.pgn', {
    workers: false,
});
console.log(header);
console.timeEnd('Time elapsed');
