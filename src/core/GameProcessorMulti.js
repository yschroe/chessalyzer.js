import GameProcessor from './GameProcessor';

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

/**
 * Class that processes games.
 */

const processMulti = (path, cfg, analyzer, nCoresTar) => {
	console.log();
	return new Promise(resolve => {
		// Master
		if (cluster.isMaster) {
			// Parse games first
			let cntGameAnalyzer = 0;
			const analyzerStore = analyzer;
			const nCores =
				nCoresTar === -1 || nCoresTar > numCPUs ? numCPUs : nCoresTar;

			analyzer.forEach(a => {
				if (a.type === 'game') cntGameAnalyzer += 1;
			});

			const config = GameProcessor.checkConfig(cfg);

			GameProcessor.parseGames(path, config, cntGameAnalyzer).then(
				games => {
					const workers = [];
					const workersFinished = [];
					// const data = [];
					const batchSize = games.length / nCores;

					const allWorkersFinished = () => {
						let status = true;
						workersFinished.forEach(stat => {
							if (stat === false) {
								status = false;
							}
						});
						return status;
					};

					const addTrackerData = tracker => {
						analyzerStore[0].add(tracker[0]);
					};

					// split to different threads
					for (let i = 0; i < nCores; i += 1) {
						workers.push(cluster.fork());
						workersFinished.push(false);

						console.log(
							`Sending Batch of size ${batchSize} to Child ${i}!`
						);

						// send batch to worker
						workers[i].send(
							games.slice(
								i * batchSize,
								i * batchSize + batchSize
							)
						);

						// on worker finish
						workers[i].on('message', msg => {
							console.log(`Child ${i} is done`);
							workersFinished[i] = true;
							addTrackerData(msg.gameAnalyzers);
							workers[i].kill();

							// if all workers finished, resolve promise
							if (allWorkersFinished()) {
								resolve();
							}
						});
					}
				}
			);

			// Worker
		} else {
			process.on('message', msg => {
				const proc = new GameProcessor();
				proc.attachAnalyzers(analyzer);

				msg.forEach(game => {
					proc.processGame(game);
				});
				//
				process.send(proc);
			});
		}
	});
};

export default processMulti;
