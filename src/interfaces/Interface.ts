interface IMoveData {
	san: string;
	player: string;
	piece: string;
	castles: string;
	takes: { piece: string; pos: number[] };
	promotesTo: string;
	from: number[];
	to: number[];
}

interface ITrackerConfig {
	profilingActive: boolean;
}

interface IBaseTracker {
	type: string;
	cfg: ITrackerConfig;
	time: number;
	t0: number;
	path?: string;
	analyze: (arg: any) => void;
	track: (arg: any) => void;
	finish: () => void;
	add: (arg: this) => void;
}

export { IMoveData, IBaseTracker, ITrackerConfig };
