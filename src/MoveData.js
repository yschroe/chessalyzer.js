class MoveData {
	constructor() {
		this.san = '';
		this.player = '';
		this.castles = '';
		this.takes = {};
		this.promotesTo = '';
		this.from = [-1, -1];
		this.to = [-1, -1];
	}

	reset() {
		this.san = '';
		this.player = '';
		this.castles = '';
		this.takes = {};
		this.promotesTo = '';
		this.from = [-1, -1];
		this.to = [-1, -1];
	}
}

export default MoveData;
