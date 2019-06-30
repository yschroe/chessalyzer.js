import GameProcessor from './GameProcessor';

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

/**
 * Class that processes games.
 */

const processMulti = (path, cfg, analyzer) => {
	console.log(`Doing Shit with ${numCPUs} CPUs`);
	return new Promise(resolve => {
		// Master
		if (cluster.isMaster) {
			// Parse games first
			let cntGameAnalyzer = 0;
			analyzer.forEach(a => {
				if (a.type === 'game') cntGameAnalyzer += 1;
			});

			const config = GameProcessor.checkConfig(cfg);

			GameProcessor.parseGames(path, config, cntGameAnalyzer).then(
				games => {
					const workers = [];
					const workersFinished = [];
					// const data = [];
					const batchSize = games.length / numCPUs;

					const allWorkersFinished = () => {
						let status = true;
						workersFinished.forEach(stat => {
							if (stat === false) {
								status = false;
							}
						});
						return status;
					};

					// split data
					// for (let i = 0; i < numCPUs; i += 1) {
					// 	data.push(
					// 		games.slice(
					// 			i * batchSize,
					// 			i * batchSize + batchSize
					// 		)
					// 	);
					// }

					// split to different threads
					for (let i = 0; i < numCPUs; i += 1) {
						workers.push(cluster.fork());
						workersFinished.push(false);

						console.log(
							`Sending Batch of size ${batchSize} to Child ${i}!`
						);
						workers[i].send(
							games.slice(
								i * batchSize,
								i * batchSize + batchSize
							)
						);

						workers[i].on('message', msg => {
							console.log(`Child ${i} is done`);
							console.log(msg);
							workersFinished[i] = true;
							workers[i].kill();

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
				process.send(proc);
			});
		}
	});
};

export default processMulti;
