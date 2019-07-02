import GameProcessor from './GameProcessor';

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

/**
 * Class that processes games.
 */

function processMulti(path, cfg, analyzer, nCoresTar) {
	return new Promise(resolve => {
		// Master
		if (cluster.isMaster) {
			let cntGameAnalyzer = 0;
			const gameAnalyzerStore = [];
			const moveAnalyzerStore = [];
			let cntGames = 0;
			let cntMoves = 0;

			const nCores =
				nCoresTar === -1 || nCoresTar > numCPUs ? numCPUs : nCoresTar;

			analyzer.forEach(a => {
				if (a.type === 'game') {
					cntGameAnalyzer += 1;
					gameAnalyzerStore.push(a);
				} else if (a.type === 'move') {
					moveAnalyzerStore.push(a);
				}
			});

			const config = GameProcessor.checkConfig(cfg);

			// Parse games first
			GameProcessor.parseGames(path, config, cntGameAnalyzer).then(
				games => {
					const batchSize = games.length / nCores;

					function checkAllWorkersFinished() {
						if (Object.keys(cluster.workers).length === 0) {
							resolve({
								cntGames,
								cntMoves
							});
						}
					}

					function addTrackerData(
						gameTracker,
						moveTracker,
						nGames,
						nMoves
					) {
						for (let i = 0; i < gameAnalyzerStore.length; i += 1) {
							gameAnalyzerStore[i].add(gameTracker[i]);
						}
						for (let i = 0; i < moveAnalyzerStore.length; i += 1) {
							moveAnalyzerStore[i].add(moveTracker[i]);
						}
						cntGames += nGames;
						cntMoves += nMoves;
					}

					// split to different threads
					for (let i = 0; i < nCores; i += 1) {
						const w = cluster.fork();

						// send batch to worker
						w.send(
							games.slice(
								i * batchSize,
								i * batchSize + batchSize
							)
						);

						// on worker finish
						w.on('message', msg => {
							addTrackerData(
								msg.gameAnalyzers,
								msg.moveAnalyzers,
								msg.cntGames,
								msg.cntMoves
							);

							w.kill();

							// if all workers finished, resolve promise
							checkAllWorkersFinished();
						});
					}
				}
			);

			// Worker
		} else {
			// process data sent by master
			process.on('message', msg => {
				// create new GameProcessor object and attach analyzers
				const proc = new GameProcessor();
				proc.attachAnalyzers(analyzer);

				// analyze each game
				msg.forEach(game => {
					proc.processGame(game);
				});

				// send result of batch to master
				process.send({
					cntMoves: proc.cntMoves,
					cntGames: proc.cntGames,
					gameAnalyzers: proc.gameAnalyzers,
					moveAnalyzers: proc.moveAnalyzers
				});
			});
		}
	});
}

export default processMulti;
