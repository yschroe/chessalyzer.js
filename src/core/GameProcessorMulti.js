import GameProcessor from './GameProcessor';

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

/**
 * Class that processes games.
 */

const processMulti = (path, cfg, analyzer, nCoresTar) =>
	new Promise(resolve => {
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
					const workers = [];
					const workersFinished = [];
					// const data = [];
					const batchSize = games.length / nCores;

					const checkAllWorkersFinished = () => {
						let status = true;
						workersFinished.forEach(stat => {
							if (stat === false) {
								status = false;
							}
						});
						if (status) {
							resolve({
								cntGames,
								cntMoves
							});
						}
					};

					const addTrackerData = (
						gameTracker,
						moveTracker,
						nGames,
						nMoves
					) => {
						for (let i = 0; i < gameAnalyzerStore.length; i += 1) {
							gameAnalyzerStore[i].add(gameTracker[i]);
						}
						for (let i = 0; i < moveAnalyzerStore.length; i += 1) {
							moveAnalyzerStore[i].add(moveTracker[i]);
						}
						cntGames += nGames;
						cntMoves += nMoves;
					};

					// split to different threads
					for (let i = 0; i < nCores; i += 1) {
						workers.push(cluster.fork());
						workersFinished.push(false);

						// console.log(
						// 	`Sending Batch of size ${batchSize} to Child ${i}!`
						// );

						// send batch to worker
						workers[i].send(
							games.slice(
								i * batchSize,
								i * batchSize + batchSize
							)
						);

						// on worker finish
						workers[i].on('message', msg => {
							// console.log(`Child ${i} is done`);
							workersFinished[i] = true;

							addTrackerData(
								msg.gameAnalyzers,
								msg.moveAnalyzers,
								msg.cntGames,
								msg.cntMoves
							);

							workers[i].kill();

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
				// console.log(msg.length);
				const proc = new GameProcessor();
				proc.attachAnalyzers(analyzer);

				msg.forEach(game => {
					proc.processGame(game);
				});
				process.send(proc);
			});
		}
	});

export default processMulti;
