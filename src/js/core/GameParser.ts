import {
	Action,
	Game,
	GameProcessorAnalysisConfig,
	// Move,
	MoveAction
} from '../interfaces/index.js';
import { PieceToken, PlayerColor, Token } from '../types/index.js';
import ChessBoard from './ChessBoard.js';
import Utils from './Utils.js';

// const moveCfg = {
// 	Q: {
// 		line: true,
// 		diag: true
// 	},
// 	R: {
// 		line: true,
// 		diag: false
// 	},
// 	B: {
// 		line: false,
// 		diag: true
// 	},
// 	N: {
// 		line: false,
// 		diag: false
// 	}
// };

// class MoveNotFoundException extends Error {
// 	constructor(
// 		token: string,
// 		player: PlayerColor,
// 		tarRow: number,
// 		tarCol: number
// 	) {
// 		super(
// 			`${player}: No piece for move ${token} to (${tarRow},${tarCol}) found!`
// 		);
// 		this.name = 'MoveNotFoundError';
// 	}
// }

class GameParser {
	board: ChessBoard;
	activePlayer: PlayerColor;

	constructor() {
		this.board = new ChessBoard();
		this.activePlayer = 'w';
	}

	/**
	 * Main function for parsing a read-in PGN game. In here the moves are transformed from algebraic notation
	 * to a list of different Actions like `MoveAction` or `CaptureAction`. This parsed data is the passed
	 * into the Trackers for generating the stats.
	 * @param game A game read-in by the GameProcessor class.
	 * @param analysisCfg Trackers into which the parsed data should be passed.
	 */
	processGame(game: Game, analysisCfg: GameProcessorAnalysisConfig): void {
		// game based trackers
		for (const tracker of analysisCfg.trackers.game) {
			tracker.analyze(game);
		}

		const { moves } = game;

		this.activePlayer = 'w';
		try {
			for (const move of moves) {
				// parse move from san to coordinates (and meta info)
				const currentMoveActions = this.parseMove(move);

				// move based trackers
				for (const tracker of analysisCfg.trackers.move) {
					tracker.analyze(currentMoveActions);
				}

				this.board.applyActions(currentMoveActions);
				this.activePlayer = this.activePlayer === 'w' ? 'b' : 'w';
			}
		} catch (err) {
			console.log(game);
			this.board.printPosition();
			throw err;
		}

		// notify move trackers that the current game is done
		for (const tracker of analysisCfg.trackers.move) {
			tracker.nextGame?.();
		}

		analysisCfg.processedMoves += moves.length;
		analysisCfg.processedGames += 1;
		this.board.reset();
	}

	/**
	 * Resets the board so a new game can be started.
	 */
	reset(): void {
		this.board.reset();
		this.activePlayer = 'w';
	}

	/**
	 * Main function to parse a single move from algebraic notation to a list of `Action`s.
	 * @param rawMove The move in standard algebraic notation.
	 * @returns A list of `Action`s to perform on the board.
	 */
	private parseMove(san: string): Action[] {
		const token = san.at(0) as Token;

		if (token.toLowerCase() === token) return this.pawnMove(san);
		if (token === 'O') return this.castle(san);
		return this.pieceMove(san);
	}

	/**
	 * Parses a single pawn move from algebraic notation to a list of `Action`s.
	 * @param san The move in standard algebraic notation.
	 * @returns A list of `Action`s to perform on the board.
	 */
	private pawnMove(san: string): Action[] {
		const actions: Action[] = [];

		const player = this.activePlayer;

		const direction = player === 'w' ? 1 : -1;
		let offset = 0;
		// const coords: Move = { from: [], to: [] };

		// Create temp copy of SAN so we can remove some characters.
		let tempSan = san.slice();

		// Check for promotion.
		let promotesTo = '';
		if (tempSan.at(-2) === '=') {
			promotesTo = tempSan.at(-1);
			tempSan = tempSan.slice(0, -2);
		}

		// Target square is always last two characters of SAN.
		const toIdx = Utils.algebraicToBitIndex(tempSan.slice(-2));
		let fromIdx = 0;

		// Capture
		if (tempSan.at(1) == 'x') {
			const colIdx = Utils.getFileNumber(tempSan.at(0));
			fromIdx = toIdx - 8 * direction + (colIdx - (toIdx % 8));

			// en passant
			if (this.board.getPieceOnBitIdx(toIdx) === null) {
				offset = player === 'w' ? 8 : -8;
			}

			const takenOnIdx = toIdx - offset;
			const takingPiece = this.board.getPieceOnBitIdx(fromIdx)?.name;
			const takenPiece = this.board.getPieceOnBitIdx(takenOnIdx)?.name;
			// if (!takingPiece || !takenPiece) throw new Error();

			actions.push({
				type: 'capture',
				san,
				player,
				onIdx: takenOnIdx,
				takingPiece,
				takenPiece
			});
		}
		// Moves
		else {
			for (let i = 1; i <= 2; i += 1) {
				const idx = toIdx - 8 * i * direction;
				if (this.board.getPieceOnBitIdx(idx)?.name.startsWith('P')) {
					fromIdx = idx;
					break;
				}
			}
		}

		const piece = this.board.getPieceOnBitIdx(fromIdx)?.name;
		// if (!piece) throw new Error();

		// move action must always come after capture action
		actions.push({
			type: 'move',
			san,
			player,
			piece,
			fromIdx,
			toIdx
		});

		// promotes
		if (promotesTo) {
			actions.push({
				type: 'promote',
				san,
				player,
				onIdx: toIdx,
				to: promotesTo
			});
		}

		return actions;
	}

	/**
	 * Parses a single piece move (KQBNR) from algebraic notation to a list of `Action`s.
	 * @param san The move in standard algebraic notation.
	 * @returns A list of `Action`s to perform on the board.
	 */
	private pieceMove(san: string): Action[] {
		const actions: Action[] = [];
		const player = this.activePlayer;

		let capture = false;
		const token = san.at(0) as PieceToken;

		// create copy of san to be able to remove characters without altering the original san
		// remove token
		let tempSan = san.slice(1);

		// capture
		if (tempSan.includes('x')) {
			capture = true;
			tempSan = tempSan.replace('x', '');
		}

		// Target square is always last two characters of SAN.
		const toIdx = Utils.algebraicToBitIndex(tempSan.slice(-2));
		let fromIdx = 0;

		// Get rest of string, removing the last two characters.
		const rest = tempSan.slice(0, -2);

		switch (rest.length) {
			// E.g. 'Rf3' -> rest is ''
			case 0:
				fromIdx = this.findPiece(toIdx, [null, null], token, player);
				break;

			// E.g. 'Ref3' -> rest is 'e'
			case 1:
				fromIdx = this.findPiece(
					toIdx,
					Utils.getTargetRowCol(rest),
					token,
					player
				);
				break;

			// E.g. 'Re3f5' -> rest is 'e3'
			case 2:
				fromIdx = Utils.algebraicToBitIndex(tempSan.slice(0, 2));
				break;
		}

		const piece = this.board.getPieceOnBitIdx(fromIdx)?.name;
		// if (!piece) throw new Error();

		if (capture) {
			const takenPiece = this.board.getPieceOnBitIdx(toIdx)?.name;
			// if (!takenPiece) throw new Error();
			actions.push({
				type: 'capture',
				san,
				player,
				onIdx: toIdx,
				takingPiece: piece,
				takenPiece
			});
		}

		// Move action must always come after capture action
		actions.push({
			type: 'move',
			san,
			player,
			piece,
			fromIdx,
			toIdx
		});

		return actions;
	}

	/**
	 * Parses a castle move ('O-O' or 'O-O-O') from algebraic notation to a list of `MoveAction`s.
	 * @param san The move in standard algebraic notation.
	 * @returns A list of `MoveAction`s to perform on the board.
	 */
	private castle(san: string): MoveAction[] {
		const actions: MoveAction[] = [];

		const player = this.activePlayer;
		const row = player === 'w' ? 1 : 8;

		switch (san) {
			case 'O-O': {
				actions.push({
					type: 'move',
					san,
					player,
					piece: 'Ke',
					fromIdx: 8 * row - 5,
					toIdx: 8 * row - 7
				});
				actions.push({
					type: 'move',
					san,
					player,
					piece: 'Rh',
					fromIdx: 8 * row - 8,
					toIdx: 8 * row - 6
				});
				break;
			}

			case 'O-O-O':
				actions.push({
					type: 'move',
					san,
					player,
					piece: 'Ke',
					fromIdx: 8 * row - 5,
					toIdx: 8 * row - 3
				});
				actions.push({
					type: 'move',
					san,
					player,
					piece: 'Ra',
					fromIdx: 8 * row - 1,
					toIdx: 8 * row - 4
				});
				break;
			default:
				console.log(
					'Castle action called without a castle SAN. This is probably a bug.'
				);
				break;
		}

		return actions;
	}

	/**
	 * Search the current position for a piece that could perform the move.
	 * @param toPosition Coordinates of the square the piece should move to.
	 * @param knownFromParts Parts of the starting position that are known via the SAN.
	 * @param token Type of piece that is looked for.
	 * @param player The moving player
	 * @returns The position of the piece which will fulfill all criteria.
	 */
	private findPiece(
		toIdx: number,
		knownFromParts: (number | null)[],
		token: PieceToken,
		player: PlayerColor
	) {
		// const [tarRow, tarCol] = toPosition;
		const [mustBeInRow, mustBeInCol] = knownFromParts;

		// Get array of positions of pieces of type <token>
		return this.board.getPiecesThatCanMoveToSquare(
			player,
			token,
			toIdx,
			mustBeInRow,
			mustBeInCol
		);
		// if (validPieces.length === 1) return validPieces[0];

		// const allowedDirections = moveCfg[token as Exclude<PieceToken, 'K'>];

		// pieceLoop: for (const piecePosition of validPieces) {
		// 	const [row, col] = piecePosition;

		// 	if (mustBeInRow !== null && row !== mustBeInRow) continue;
		// 	if (mustBeInCol !== null && col !== mustBeInCol) continue;

		// 	const rowDiff = Math.abs(row - tarRow);
		// 	const colDiff = Math.abs(col - tarCol);

		// 	switch (token) {
		// 		case 'N':
		// 			if (
		// 				!(
		// 					(rowDiff === 2 && colDiff === 1) ||
		// 					(rowDiff === 1 && colDiff === 2)
		// 				)
		// 			)
		// 				continue;

		// 			break;

		// 		default: {
		// 			if (
		// 				!(
		// 					(allowedDirections.line &&
		// 						(rowDiff === 0 || colDiff === 0)) ||
		// 					(allowedDirections.diag && rowDiff === colDiff)
		// 				)
		// 			)
		// 				continue;

		// 			const diff = [tarRow - row, tarCol - col];
		// 			const steps = Math.max(...diff.map((val) => Math.abs(val)));
		// 			const dir = [Math.sign(diff[0]), Math.sign(diff[1])];
		// 			for (let i = 1; i < steps; i += 1) {
		// 				if (
		// 					this.board.getPieceOnCoords([
		// 						row + i * dir[0],
		// 						col + i * dir[1]
		// 					])
		// 				) {
		// 					continue pieceLoop;
		// 				}
		// 			}
		// 			break;
		// 		}
		// 	}

		// 	if (
		// 		!this.checkCheck(
		// 			{ from: piecePosition, to: toPosition },
		// 			player
		// 		)
		// 	) {
		// 		return piecePosition;
		// 	}
		// }

		// throw new MoveNotFoundException(token, player, tarRow, tarCol);
	}

	/**
	 * Checks if performing the move would result in the king being in check.
	 *
	 * @param move The move to be checked.
	 * @param player The moving player.
	 * @returns King would be in check true/false
	 */
	// private checkCheck(move: Move, player: PlayerColor): boolean {
	// 	const { from, to } = move;
	// 	const opColor = player === 'w' ? 'b' : 'w';
	// 	const king = this.board.getKing(player);

	// 	// check if moving piece is on same line/diag as king, else exit
	// 	const diff = [from[0] - king[0], from[1] - king[1]];
	// 	const checkFor: string[] = [];
	// 	if (diff[0] === 0 || diff[1] === 0) {
	// 		checkFor[0] = 'Q';
	// 		checkFor[1] = 'R';
	// 	} else if (Math.abs(diff[0]) === Math.abs(diff[1])) {
	// 		checkFor[0] = 'Q';
	// 		checkFor[1] = 'B';
	// 	} else {
	// 		return false;
	// 	}
	// 	const vertDir = Math.sign(diff[0]);
	// 	const horzDir = Math.sign(diff[1]);

	// 	// calculate distance from king to edge of board in direction of the moving piece
	// 	let distanceHorizontal = 8;
	// 	if (horzDir !== 0) {
	// 		distanceHorizontal = horzDir === -1 ? king[1] : 8 - 1 - king[1];
	// 	}
	// 	let distanceVertical = 8;
	// 	if (vertDir !== 0) {
	// 		distanceVertical = vertDir === -1 ? king[0] : 8 - 1 - king[0];
	// 	}
	// 	const distanceToEdge = Math.min(distanceHorizontal, distanceVertical);
	// 	if (distanceToEdge < 2) return false;

	// 	// check for check
	// 	let isInCheck = false;
	// 	for (let i = 1; i <= distanceToEdge; i += 1) {
	// 		const row = king[0] + i * vertDir;
	// 		const col = king[1] + i * horzDir;

	// 		// If move target -> Break since moving piece blocks checks.
	// 		if (row === to[0] && col === to[1]) break;

	// 		if (!(row === from[0] && col === from[1])) {
	// 			const piece = this.board.getPieceOnCoords([row, col]);
	// 			if (piece) {
	// 				// way is obstructed
	// 				isInCheck =
	// 					piece.color === opColor &&
	// 					checkFor.some((token) => piece.name.startsWith(token));
	// 				break;
	// 			}
	// 		}
	// 	}

	// 	return isInCheck;
	// }
}

export default GameParser;
