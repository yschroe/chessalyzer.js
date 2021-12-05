import TileTrackerBase from '../TileTrackerBase';
import { SquareData } from '../../interfaces/Interface';

export default {
	TILE_OCC_ALL: {
		scope: 'global',
		unit: '%',
		description:
			'Tile <loopSqrData> had a piece on it for X% of all moves.',
		calc: (
			data: TileTrackerBase,
			_: SquareData,
			loopSqrData: SquareData
		) => {
			const { coords } = loopSqrData;
			let val =
				data.tiles[coords[0]][coords[1]].w.wasOn +
				data.tiles[coords[0]][coords[1]].b.wasOn;
			val = (val * 100) / data.cntMovesTotal;
			return val;
		}
	},
	TILE_OCC_WHITE: {
		scope: 'global',
		unit: '%',
		description:
			'Tile <loopSqrData> had a white piece on it for X% of all moves.',
		calc: (
			data: TileTrackerBase,
			_: SquareData,
			loopSqrData: SquareData
		) => {
			const { coords } = loopSqrData;
			let val = data.tiles[coords[0]][coords[1]].w.wasOn;
			val = (val * 100) / data.cntMovesTotal;
			return val;
		}
	},
	TILE_OCC_BLACK: {
		scope: 'global',
		unit: '%',
		description: 'Tile X had a black piece on it for Y% of all moves.',
		calc: (
			data: TileTrackerBase,
			_: SquareData,
			loopSqrData: SquareData
		) => {
			const { coords } = loopSqrData;
			let val = data.tiles[coords[0]][coords[1]].b.wasOn;
			val = (val * 100) / data.cntMovesTotal;
			return val;
		}
	},
	TILE_OCC_BY_PIECE: {
		scope: 'specific',
		unit: '%',
		description:
			'Selected tile was occupated by piece X during Y% of all moves.',
		calc: (
			data: TileTrackerBase,
			sqrData: SquareData,
			loopSqrData: SquareData
		) => {
			const sqrCoords = sqrData.coords;
			const { piece } = loopSqrData;

			let val = 0;
			if (piece.color) {
				val =
					data.tiles[sqrCoords[0]][sqrCoords[1]][piece.color][
						piece.name
					].wasOn;
			}
			val = (val * 100) / data.cntMovesTotal;
			return val;
		}
	},
	TILE_KILLCOUNT: {
		scope: 'global',
		unit: '',
		description: 'Count of Pieces that were taken on each tile.',
		calc: (
			data: TileTrackerBase,
			_: SquareData,
			loopSqrData: SquareData
		) => {
			const { coords } = loopSqrData;
			const val =
				data.tiles[coords[0]][coords[1]].b.wasKilledOn +
				data.tiles[coords[0]][coords[1]].w.wasKilledOn;
			return val;
		}
	},
	PIECE_MOVED_TO_TILE: {
		scope: 'specific',
		unit: '',
		description: 'Selected piece had tile X as a move target Y times.',
		calc: (
			data: TileTrackerBase,
			sqrData: SquareData,
			loopSqrData: SquareData
		) => {
			const { piece } = sqrData;
			const { coords } = loopSqrData;
			let val = 0;
			if (piece.name) {
				val =
					data.tiles[coords[0]][coords[1]][piece.color][piece.name]
						.movedTo;
			}
			return val;
		}
	}
};
