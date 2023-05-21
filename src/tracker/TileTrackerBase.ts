import BaseTracker from './BaseTracker.js';
import type { Move, Action } from '../interfaces/index.js';
import HeatmapPresets from './heatmaps/TileHeatmaps.js';

const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

interface StatsField {
	b: TileStats;
	w: TileStats;
	currentPiece: Piece;
}

class TileStats {
	movedTo: number;
	wasOn: number;
	killedOn: number;
	wasKilledOn: number;

	constructor() {
		this.movedTo = 0;
		this.wasOn = 0;
		this.killedOn = 0;
		this.wasKilledOn = 0;
	}
}

class Piece {
	piece: string;
	color: 'b' | 'w';
	lastMovedOn: number;

	constructor(piece: string, color: 'b' | 'w') {
		this.piece = piece;
		this.color = color;
		this.lastMovedOn = 0;
	}
}

class TileTrackerBase extends BaseTracker {
	cntMovesGame: number;
	cntMovesTotal: number;
	tiles: StatsField[][];

	constructor() {
		super('move');
		this.heatmapPresets = HeatmapPresets;
		this.cntMovesGame = 0;
		this.cntMovesTotal = 0;
		this.tiles = [];

		for (let row = 0; row < 8; row += 1) {
			const currRow: StatsField[] = [];

			for (let col = 0; col < 8; col += 1) {
				const tempData = {
					b: new TileStats(),
					w: new TileStats(),
					currentPiece: null
				};

				pawnTemplate.forEach((val) => {
					tempData.b[val] = new TileStats();
					tempData.w[val] = new TileStats();
				});
				pieceTemplate.forEach((val) => {
					tempData.b[val] = new TileStats();
					tempData.w[val] = new TileStats();
				});
				currRow.push(tempData);
			}
			this.tiles.push(currRow);
		}

		for (let row = 0; row < 8; row += 1) {
			for (let col = 0; col < 8; col += 1) {
				this.resetCurrentPiece(row, col);
			}
		}
	}

	add(tracker: TileTrackerBase) {
		this.time += tracker.time;
		this.cntMovesGame += tracker.cntMovesGame;
		this.cntMovesTotal += tracker.cntMovesTotal;

		for (let row = 0; row < 8; row += 1) {
			for (let col = 0; col < 8; col += 1) {
				this.tiles[row][col].b.movedTo +=
					tracker.tiles[row][col].b.movedTo;
				this.tiles[row][col].w.movedTo +=
					tracker.tiles[row][col].w.movedTo;

				this.tiles[row][col].b.wasOn += tracker.tiles[row][col].b.wasOn;
				this.tiles[row][col].w.wasOn += tracker.tiles[row][col].w.wasOn;

				this.tiles[row][col].b.killedOn +=
					tracker.tiles[row][col].b.killedOn;
				this.tiles[row][col].w.killedOn +=
					tracker.tiles[row][col].w.killedOn;

				this.tiles[row][col].b.wasKilledOn +=
					tracker.tiles[row][col].b.wasKilledOn;
				this.tiles[row][col].w.wasKilledOn +=
					tracker.tiles[row][col].w.wasKilledOn;

				pawnTemplate.forEach((piece) => {
					this.tiles[row][col].b[piece].movedTo +=
						tracker.tiles[row][col].b[piece].movedTo;
					this.tiles[row][col].w[piece].movedTo +=
						tracker.tiles[row][col].w[piece].movedTo;

					this.tiles[row][col].b[piece].wasOn +=
						tracker.tiles[row][col].b[piece].wasOn;
					this.tiles[row][col].w[piece].wasOn +=
						tracker.tiles[row][col].w[piece].wasOn;

					this.tiles[row][col].b[piece].killedOn +=
						tracker.tiles[row][col].b[piece].killedOn;
					this.tiles[row][col].w[piece].killedOn +=
						tracker.tiles[row][col].w[piece].killedOn;

					this.tiles[row][col].b[piece].wasKilledOn +=
						tracker.tiles[row][col].b[piece].wasKilledOn;
					this.tiles[row][col].w[piece].wasKilledOn +=
						tracker.tiles[row][col].w[piece].wasKilledOn;
				});

				pieceTemplate.forEach((piece) => {
					this.tiles[row][col].b[piece].movedTo +=
						tracker.tiles[row][col].b[piece].movedTo;
					this.tiles[row][col].w[piece].movedTo +=
						tracker.tiles[row][col].w[piece].movedTo;

					this.tiles[row][col].b[piece].wasOn +=
						tracker.tiles[row][col].b[piece].wasOn;
					this.tiles[row][col].w[piece].wasOn +=
						tracker.tiles[row][col].w[piece].wasOn;

					this.tiles[row][col].b[piece].killedOn +=
						tracker.tiles[row][col].b[piece].killedOn;
					this.tiles[row][col].w[piece].killedOn +=
						tracker.tiles[row][col].w[piece].killedOn;

					this.tiles[row][col].b[piece].wasKilledOn +=
						tracker.tiles[row][col].b[piece].wasKilledOn;
					this.tiles[row][col].w[piece].wasKilledOn +=
						tracker.tiles[row][col].w[piece].wasKilledOn;
				});
			}
		}
	}

	resetCurrentPiece(row: number, col: number) {
		let color: 'b' | 'w';
		let piece: string;
		let hasPiece = false;

		if (row === 0) {
			color = 'b';
			piece = pieceTemplate[col];
			hasPiece = true;
		} else if (row === 1) {
			color = 'b';
			piece = pawnTemplate[col];
			hasPiece = true;
		} else if (row === 6) {
			color = 'w';
			piece = pawnTemplate[col];
			hasPiece = true;
		} else if (row === 7) {
			color = 'w';
			piece = pieceTemplate[col];
			hasPiece = true;
		}

		if (hasPiece) {
			this.tiles[row][col].currentPiece = new Piece(piece, color);
		} else {
			this.tiles[row][col].currentPiece = null;
		}
	}

	track(moveData: Action) {
		// const { move } = moveData;
		// const { player } = moveData;
		// const { piece } = moveData;
		// const { takes } = moveData;
		// const { castles } = moveData;
		// // move
		// if (move) {
		// 	this.cntMovesGame += 1;
		// 	if (takes) {
		// 		this.processTakes(takes.pos, player, piece, takes.piece);
		// 	}
		// 	this.processMove(move, player, piece);
		// 	// castle
		// } else if (castles) {
		// 	this.cntMovesGame += 1;
		// 	const row = player === 'w' ? 7 : 0;
		// 	let rook = 'Rh';
		// 	let tarKingCol = 6;
		// 	let tarRookCol = 5;
		// 	let srcRookCol = 7;
		// 	if (castles === 'O-O-O') {
		// 		rook = 'Ra';
		// 		tarKingCol = 2;
		// 		tarRookCol = 3;
		// 		srcRookCol = 0;
		// 	}
		// 	this.processMove(
		// 		{ from: [row, 4], to: [row, tarKingCol] },
		// 		player,
		// 		'Ke'
		// 	);
		// 	this.processMove(
		// 		{ from: [row, srcRookCol], to: [row, tarRookCol] },
		// 		player,
		// 		rook
		// 	);
		// }
	}

	nextGame() {
		for (let row = 0; row < 8; row += 1) {
			for (let col = 0; col < 8; col += 1) {
				const { currentPiece } = this.tiles[row][col];
				if (currentPiece !== null) {
					this.addOccupation([row, col]);
				}
				this.resetCurrentPiece(row, col);
			}
		}
		this.cntMovesTotal += this.cntMovesGame;
		this.cntMovesGame = 0;
	}

	processMove(move: Move, player: string, piece: string) {
		if (piece.length > 1 && !piece.match(/\d/g)) {
			this.addOccupation(move.from);

			this.tiles[move.to[0]][move.to[1]].currentPiece =
				this.tiles[move.from[0]][move.from[1]].currentPiece;
			this.tiles[move.to[0]][move.to[1]].currentPiece.lastMovedOn =
				this.cntMovesGame;

			this.tiles[move.from[0]][move.from[1]].currentPiece = null;

			this.tiles[move.to[0]][move.to[1]][player].movedTo += 1;
			this.tiles[move.to[0]][move.to[1]][player][piece].movedTo += 1;
		}
	}

	processTakes(
		pos: number[],
		player: string,
		takingPiece: string,
		takenPiece: string
	): void {
		if (takenPiece.length > 1 && !takenPiece.match(/\d/g)) {
			const opPlayer = player === 'w' ? 'b' : 'w';
			this.tiles[pos[0]][pos[1]][opPlayer].wasKilledOn += 1;
			this.tiles[pos[0]][pos[1]][opPlayer][takenPiece].wasKilledOn += 1;

			this.addOccupation(pos);
			this.tiles[pos[0]][pos[1]].currentPiece = null;
		}

		if (takingPiece.length > 1 && !takingPiece.match(/\d/g)) {
			this.tiles[pos[0]][pos[1]][player].killedOn += 1;
			this.tiles[pos[0]][pos[1]][player][takingPiece].killedOn += 1;
		}
	}

	addOccupation(pos: number[]): void {
		const { currentPiece } = this.tiles[pos[0]][pos[1]];
		const toAdd = this.cntMovesGame - currentPiece.lastMovedOn;
		this.tiles[pos[0]][pos[1]][currentPiece.color].wasOn += toAdd;
		this.tiles[pos[0]][pos[1]][currentPiece.color][
			currentPiece.piece
		].wasOn += toAdd;
	}
}

export default TileTrackerBase;
