const defaultTiles = new Int8Array(64);
for (let rank = 0; rank < 8; rank += 1) {
	for (let file = 0; file < 8; file += 1) {
		const mult = rank > 5 ? 1 : -1;
		if (rank < 2 || rank > 5)
			defaultTiles[rank * 8 + file] =
				(((rank * 8 + file) % 16) + 1) * mult;
	}
}
console.log(defaultTiles);
console.log(
	new Int8Array([
		-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -14, -15, -16,
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 12, 13, 14, 15, 16, 1, 2, 3, 4, 5, 6,
		7, 8
	])
);

function isBitOn(number, index) {
	return (number >>> index) & 1;
}

console.log(isBitOn(1, 0));
