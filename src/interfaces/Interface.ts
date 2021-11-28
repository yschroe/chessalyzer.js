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

export { IMoveData };
