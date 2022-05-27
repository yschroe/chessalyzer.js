export type Rook = 'Ra' | 'Rh';
export type Knight = 'Nb' | 'Ng';
export type Bishop = 'Bc' | 'Bf';
export type Queen = 'Qd';
export type King = 'Ke';
export type Piece = Rook | Knight | Bishop | Queen | King;

export type PieceTokenWithoutKing = 'R' | 'N' | 'B' | 'Q';
export type PieceToken = 'R' | 'N' | 'B' | 'Q' | 'K';

export type PawnToken = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Token = PieceToken | PawnToken | 'O';
export type PlayerColor = 'b' | 'w';
