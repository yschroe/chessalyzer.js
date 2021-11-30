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

interface TrackerConfig {
	profilingActive: boolean;
}

interface Tracker {
	type: string;
	cfg: TrackerConfig;
	time: number;
	t0: number;
	path?: string;
	analyze: (arg: any) => void;
	track: (arg: any) => void;
	finish: () => void;
	add: (arg: this) => void;
}

export { Move, MoveData, Tracker, TrackerConfig };
