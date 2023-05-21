export type PieceToken = 'R' | 'N' | 'B' | 'Q' | 'K';

export type PawnToken = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type FileLetter = PawnToken;
export type Token = PieceToken | PawnToken | 'O';
export type PlayerColor = 'b' | 'w';
