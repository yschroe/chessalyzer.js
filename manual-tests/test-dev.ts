import Chessalyzer from '#core/chessalyzer';

console.time('Time elapsed');
const header = await Chessalyzer.analyzePGN('./pgn/lichess_db_standard_rated_2013-12.pgn');
console.log(header);
console.timeEnd('Time elapsed');
