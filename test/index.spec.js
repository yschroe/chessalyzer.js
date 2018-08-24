/* global describe, it, before */

import chai from 'chai';
import { ChessBoard } from '../lib/chessalyzer';

chai.expect();

const { expect } = chai;

let b;

describe('Given an instance of my Chessalyzer library', () => {
	before(() => {
		b = new ChessBoard();
		console.log(b);
	});
	describe('when I need the name', () => {
		it('should return the name', () => {
			expect(chessalyzer.name).to.be.equal('Chessalyzer');
		});
	});
});
