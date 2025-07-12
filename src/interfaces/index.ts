import type { PlayerColor } from '../types/index';

export interface GameProcessorConfig {
	hasFilter: boolean;
	filter: (game: object) => boolean;
	cntGames: number;
}

export interface GameProcessorAnalysisConfig {
	trackers: { move: Tracker[]; game: Tracker[] };
	processedMoves: number;
	processedGames: number;
}

export interface GameProcessorAnalysisConfigFull
	extends GameProcessorAnalysisConfig {
	config: GameProcessorConfig;
	trackerData: { name: string; cfg: TrackerConfig; path: string }[];
	cntReadGames: number;
	isDone: boolean;
}

export interface Game {
	Result?: string;
	ECO?: string;
	moves: string[];
}

export interface Move {
	from: number[];
	to: number[];
}

interface BaseAction {
	type: 'move' | 'capture' | 'promote';
	san: string;
	player: PlayerColor;
}

export interface MoveAction extends BaseAction {
	type: 'move';
	piece: string;
	from: number[];
	to: number[];
}

export interface CaptureAction extends BaseAction {
	type: 'capture';
	takingPiece: string;
	takenPiece: string;
	on: number[];
}

export interface PromoteAction extends BaseAction {
	type: 'promote';
	to: string;
	on: number[];
}

export type Action = MoveAction | CaptureAction | PromoteAction;

export interface SquareData {
	alg: string;
	coords: number[];
	piece: { color: PlayerColor; name: string };
}

export interface ChessPiece {
	name: string; // not Piece since promoted pawns can be included here
	color: PlayerColor;
}

export interface TrackerConfig {
	profilingActive: boolean;
}

export interface MultithreadConfig {
	batchSize: number;
}

export interface AnalysisConfig {
	trackers?: Tracker[];
	config?: {
		cntGames?: number;
		filter?: (data: unknown) => boolean;
	};
}

export interface HeatmapData {
	map: number[][];
	min: number;
	max: number;
}

export interface HeatmapAnalysisFunc {
	(
		data: unknown,
		loopSqrData: SquareData,
		sqrData?: SquareData,
		optData?: unknown
	): number;
}

export interface Tracker {
	type: string;
	cfg: TrackerConfig;
	time: number;
	t0: number;
	path?: string;
	analyze: (arg: Game | Action[]) => void;
	generateHeatmap: (
		fun: string | HeatmapAnalysisFunc,
		square?: string | number[],
		optData?: unknown
	) => HeatmapData;
	generateComparisonHeatmap: (
		compData: this,
		fun: string | HeatmapAnalysisFunc,
		square?: string | number[],
		optData?: unknown
	) => HeatmapData;
	track: (arg: Game | Action[]) => void;
	nextGame?: () => void;
	finish?: () => void;
	add?: (arg: this) => void;
}

export interface GameAndMoveCount {
	cntGames: number;
	cntMoves: number;
}

export interface GameAndMoveCountFull extends GameAndMoveCount {
	mps: number;
}

export interface WorkerTaskData {
	games: Game[];
	trackerData: { name: string; cfg: TrackerConfig; path?: string }[];
	idxConfig: number;
}

export interface WorkerMessage {
	cntMoves: number;
	cntGames: number;
	gameTrackers: Tracker[];
	moveTrackers: Tracker[];
	idxConfig: number;
}
