import chai from 'chai';
import ChessPiece from '../src/ChessPiece';

//chai.expect();

const { expect, assert } = chai;
let piece;

describe('ChessPiece', function() {
	const pieces = [[0, 1], [1, 0], [3, 0]];
	pieces.forEach(val => {
		piece = new ChessPiece('', val);
		it('Row' + val[0], function() {
			assert(piece.name === 'black');
		});
	});
	describe('after creation', () => {
		it('should have a data array with size 8x8', () => {
			expect(piece.stats.length).to.be.equal(8);
			expect(piece.stats[0].length).to.be.equal(8);
		});
		it('should have a name', () => {
			expect(piece.name).to.be.equal('Pa');
		});
		it('should have the right color', () => {
			expect(piece.color).to.be.equal('black');
		});
	});
});
