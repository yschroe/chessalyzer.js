interface Game {
	Result?: string;
	ECO?: string;
	moves: string[];
}

interface Move {
	from: number[];
	to: number[];
}

interface MoveData {
	san: string;
	player: string;
	piece: string;
	castles: string;
	takes: { piece: string; pos: number[] };
	promotesTo: string;
	move: Move;
}

interface SquareData {
	alg: string;
	coords: number[];
	piece: { color: string; name: string };
}

interface ChessPiece {
	name: string;
	color: string;
}

interface TrackerConfig {
	profilingActive: boolean;
}

interface HeatmapData {
	map: number[][];
	min: number;
	max: number;
}

interface HeatmapAnalysisFunc {
	(
		data: unknown,
		loopSqrData: SquareData,
		sqrData?: SquareData,
		optData?: unknown
	): number;
}

interface Tracker {
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

export {
	Game,
	Move,
	MoveData,
	ChessPiece,
	Tracker,
	SquareData,
	TrackerConfig,
	HeatmapData,
	HeatmapAnalysisFunc
};
