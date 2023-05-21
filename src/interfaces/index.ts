import type { PlayerColor } from '../types/index.js';

export interface Game {
	Result?: string;
	ECO?: string;
	moves: string[];
}

export interface Move {
	from: number[];
	to: number[];
}

export interface MoveData {
	san: string;
	player: PlayerColor;
	piece: string; // not Piece since promoted pawns can be included here
	castles: string;
	takes: { piece: string; pos: number[] };
	promotesTo: string;
	move: Move;
}

interface BaseAction {
	type: 'move' | 'capture' | 'castle' | 'promote';
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

export interface CastleAction extends BaseAction {
	type: 'castle';
}

export interface PromoteAction extends BaseAction {
	type: 'promote';
	to: string;
	on: number[];
}

export type Action = MoveAction | CaptureAction | CastleAction | PromoteAction;

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
	nThreads?: number;
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
	analyze: (arg: Game | MoveData) => void;
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
	track: (arg: Game | MoveData) => void;
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

export interface WorkerMessage {
	cntMoves: number;
	gameAnalyzers: Tracker[];
	moveAnalyzers: Tracker[];
	idxConfig: number;
}
