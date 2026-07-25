//! SAN (Standard Algebraic Notation) parsing — ports `game-parser.ts` logic.
//!
//! Parses move strings and applies them to the board in one pass, avoiding
//! per-move JS↔WASM boundary crossings.

use wasm_bindgen::prelude::*;

use crate::board::Board;

const STARTING_PIECE_NAMES: [&str; 64] = [
    "Rh", "Ng", "Bf", "Ke", "Qd", "Bc", "Nb", "Ra",
    "Ph", "Pg", "Pf", "Pe", "Pd", "Pc", "Pb", "Pa",
    "", "", "", "", "", "", "", "",
    "", "", "", "", "", "", "", "",
    "", "", "", "", "", "", "", "",
    "", "", "", "", "", "", "", "",
    "Ph", "Pg", "Pf", "Pe", "Pd", "Pc", "Pb", "Pa",
    "Rh", "Ng", "Bf", "Ke", "Qd", "Bc", "Nb", "Ra",
];

#[derive(Clone)]
pub(crate) enum ParsedAction {
    Move {
        san: String,
        player: char,
        piece: String,
        from_idx: u32,
        to_idx: u32,
    },
    Capture {
        san: String,
        player: char,
        taking_piece: String,
        taken_piece: String,
        on_idx: u32,
    },
    Promote {
        san: String,
        player: char,
        to: char,
        on_idx: u32,
    },
}

impl Board {
    pub(crate) fn init_piece_names(&mut self) {
        self.piece_names = STARTING_PIECE_NAMES
            .iter()
            .map(|s| if s.is_empty() { None } else { Some((*s).to_string()) })
            .collect();
        self.promote_counter = 0;
    }

    fn piece_name_at(&self, idx: u32) -> String {
        if let Some(name) = self.piece_names.get(idx as usize).and_then(|n| n.as_ref()) {
            return name.clone();
        }
        let encoded = self.get_piece_at(idx);
        if encoded == -1 {
            return String::new();
        }
        let token = (encoded & 0xff) as u8 as char;
        format!("{}{}", token, file_from_bit_index(idx))
    }

    fn apply_parsed_action(&mut self, action: &ParsedAction) {
        match action {
            ParsedAction::Move {
                from_idx,
                to_idx,
                piece,
                player,
                ..
            } => {
                let from = *from_idx as usize;
                let to = *to_idx as usize;
                self.piece_names[to] = self.piece_names[from].take();
                let token = piece.chars().next().unwrap_or('P');
                self.move_piece(*player, token, *from_idx, *to_idx);
            }
            ParsedAction::Capture {
                on_idx,
                taken_piece,
                player,
                ..
            } => {
                self.piece_names[*on_idx as usize] = None;
                let token = taken_piece.chars().next().unwrap_or('P');
                let other = if *player == 'w' { 'b' } else { 'w' };
                self.capture_piece(other, token, *on_idx);
            }
            ParsedAction::Promote { on_idx, to, player, .. } => {
                self.piece_names[*on_idx as usize] =
                    Some(format!("{}{}", to, self.promote_counter));
                self.promote_counter += 1;
                self.promote_piece(*player, *to, *on_idx);
            }
        }
    }

    pub(crate) fn apply_san(&mut self, san: &str, player: char) {
        let actions = self.parse_san(san, player);
        for action in &actions {
            self.apply_parsed_action(action);
        }
    }

    pub(crate) fn parse_and_apply_san(&mut self, san: &str, player: char) -> Vec<ParsedAction> {
        let actions = self.parse_san(san, player);
        for action in &actions {
            self.apply_parsed_action(action);
        }
        actions
    }

    pub(crate) fn process_game_quiet_moves(&mut self, moves: &[String]) {
        self.reset();
        let mut active_player = 'w';
        for san in moves {
            self.apply_san(san, active_player);
            active_player = if active_player == 'w' { 'b' } else { 'w' };
        }
    }

    pub(crate) fn process_game_moves(&mut self, moves: &[String]) -> ProcessedGame {
        self.reset();
        let mut active_player = 'w';
        let mut game = ProcessedGame::new(moves.len());

        for san in moves {
            game.begin_move(san);
            let move_actions = self.parse_san(san, active_player);
            for action in &move_actions {
                game.push_action(action);
                self.apply_parsed_action(action);
            }
            game.end_move();
            active_player = if active_player == 'w' { 'b' } else { 'w' };
        }

        game.finalize()
    }

    fn parse_san(&self, san: &str, player: char) -> Vec<ParsedAction> {
        let first = san.chars().next().unwrap_or(' ');
        if first.is_ascii_lowercase() {
            return self.parse_pawn_move(san, player);
        }
        if first == 'O' {
            return self.parse_castle(san, player);
        }
        self.parse_piece_move(san, player)
    }

    fn parse_pawn_move(&self, san: &str, player: char) -> Vec<ParsedAction> {
        let mut actions = Vec::new();
        let mut temp = san.to_string();

        let promotes_to = if temp.len() >= 2 && temp.as_bytes()[temp.len() - 2] == b'=' {
            let ch = temp.pop().unwrap();
            temp.truncate(temp.len() - 1);
            ch
        } else {
            '\0'
        };

        let to_idx = algebraic_to_bit_index(&temp[temp.len() - 2..]);
        let mut from_idx = 0u32;
        let mut ep_offset = 0i32;

        if temp.as_bytes().get(1) == Some(&b'x') {
            let col_idx = file_number(temp.as_bytes()[0] as char);
            from_idx = self.find_pawn_from(player, to_idx, col_idx) as u32;

            if self.get_piece_at(to_idx) == -1 {
                ep_offset = if player == 'w' { 8 } else { -8 };
            }

            let taken_on_idx = (to_idx as i32 - ep_offset) as u32;
            actions.push(ParsedAction::Capture {
                san: san.to_string(),
                player,
                on_idx: taken_on_idx,
                taking_piece: self.piece_name_at(from_idx),
                taken_piece: self.piece_name_at(taken_on_idx),
            });
        } else {
            from_idx = self.find_pawn_from(player, to_idx, -1) as u32;
        }

        actions.push(ParsedAction::Move {
            san: san.to_string(),
            player,
            piece: self.piece_name_at(from_idx),
            from_idx,
            to_idx,
        });

        if promotes_to != '\0' {
            actions.push(ParsedAction::Promote {
                san: san.to_string(),
                player,
                to: promotes_to,
                on_idx: to_idx,
            });
        }

        actions
    }

    fn parse_piece_move(&self, san: &str, player: char) -> Vec<ParsedAction> {
        let mut actions = Vec::new();
        let token = san.chars().next().unwrap();
        let mut temp = san[1..].to_string();

        let capture = temp.contains('x');
        if capture {
            temp = temp.replace('x', "");
        }

        let to_idx = algebraic_to_bit_index(&temp[temp.len() - 2..]);
        let rest = &temp[..temp.len() - 2];

        let from_idx = match rest.len() {
            0 => self.find_attacker(player, token, to_idx, 0) as u32,
            1 => {
                let disambiguation = disambiguation_from_char(rest.chars().next().unwrap());
                self.find_attacker(player, token, to_idx, disambiguation) as u32
            }
            2 => algebraic_to_bit_index(rest),
            _ => 0,
        };

        let piece = self.piece_name_at(from_idx);

        if capture {
            actions.push(ParsedAction::Capture {
                san: san.to_string(),
                player,
                on_idx: to_idx,
                taking_piece: piece.clone(),
                taken_piece: self.piece_name_at(to_idx),
            });
        }

        actions.push(ParsedAction::Move {
            san: san.to_string(),
            player,
            piece,
            from_idx,
            to_idx,
        });

        actions
    }

    fn parse_castle(&self, san: &str, player: char) -> Vec<ParsedAction> {
        let row = if player == 'w' { 1 } else { 8 };
        let king_from = (8 * row - 5) as u32;
        let king_to = (8 * row - 7) as u32;

        match san {
            "O-O" => vec![
                ParsedAction::Move {
                    san: san.to_string(),
                    player,
                    piece: "Ke".to_string(),
                    from_idx: king_from,
                    to_idx: king_to,
                },
                ParsedAction::Move {
                    san: san.to_string(),
                    player,
                    piece: "Rh".to_string(),
                    from_idx: (8 * row - 8) as u32,
                    to_idx: (8 * row - 6) as u32,
                },
            ],
            "O-O-O" => vec![
                ParsedAction::Move {
                    san: san.to_string(),
                    player,
                    piece: "Ke".to_string(),
                    from_idx: king_from,
                    to_idx: (8 * row - 3) as u32,
                },
                ParsedAction::Move {
                    san: san.to_string(),
                    player,
                    piece: "Ra".to_string(),
                    from_idx: (8 * row - 1) as u32,
                    to_idx: (8 * row - 4) as u32,
                },
            ],
            _ => vec![],
        }
    }
}

const NO_PIECE: u16 = u16::MAX;

/// Compact move/action data returned in one WASM call and decoded in JS.
#[wasm_bindgen]
pub struct ProcessedGame {
    move_starts: Vec<u32>,
    action_types: Vec<u8>,
    players: Vec<u8>,
    from_idxs: Vec<u32>,
    to_idxs: Vec<u32>,
    piece_ids: Vec<u16>,
    taken_piece_ids: Vec<u16>,
    promote_tokens: Vec<u8>,
    piece_names: Vec<String>,
    sans: Vec<String>,
}

impl ProcessedGame {
    fn new(move_count: usize) -> Self {
        ProcessedGame {
            move_starts: Vec::with_capacity(move_count + 1),
            action_types: Vec::new(),
            players: Vec::new(),
            from_idxs: Vec::new(),
            to_idxs: Vec::new(),
            piece_ids: Vec::new(),
            taken_piece_ids: Vec::new(),
            promote_tokens: Vec::new(),
            piece_names: Vec::new(),
            sans: Vec::with_capacity(move_count),
        }
    }

    fn begin_move(&mut self, san: &str) {
        self.move_starts.push(self.action_types.len() as u32);
        self.sans.push(san.to_string());
    }

    fn end_move(&mut self) {}

    fn intern_name(&mut self, name: &str) -> u16 {
        if let Some(idx) = self.piece_names.iter().position(|n| n == name) {
            return idx as u16;
        }
        let idx = self.piece_names.len();
        self.piece_names.push(name.to_string());
        idx as u16
    }

    fn push_action(&mut self, action: &ParsedAction) {
        match action {
            ParsedAction::Move {
                player,
                piece,
                from_idx,
                to_idx,
                ..
            } => {
                let piece_id = self.intern_name(piece);
                self.action_types.push(0);
                self.players.push(if *player == 'w' { 0 } else { 1 });
                self.from_idxs.push(*from_idx);
                self.to_idxs.push(*to_idx);
                self.piece_ids.push(piece_id);
                self.taken_piece_ids.push(NO_PIECE);
                self.promote_tokens.push(0);
            }
            ParsedAction::Capture {
                player,
                taking_piece,
                taken_piece,
                on_idx,
                ..
            } => {
                let taking_id = self.intern_name(taking_piece);
                let taken_id = self.intern_name(taken_piece);
                self.action_types.push(1);
                self.players.push(if *player == 'w' { 0 } else { 1 });
                self.from_idxs.push(0);
                self.to_idxs.push(*on_idx);
                self.piece_ids.push(taking_id);
                self.taken_piece_ids.push(taken_id);
                self.promote_tokens.push(0);
            }
            ParsedAction::Promote { player, to, on_idx, .. } => {
                self.action_types.push(2);
                self.players.push(if *player == 'w' { 0 } else { 1 });
                self.from_idxs.push(0);
                self.to_idxs.push(*on_idx);
                self.piece_ids.push(NO_PIECE);
                self.taken_piece_ids.push(NO_PIECE);
                self.promote_tokens.push(*to as u8);
            }
        }
    }

    fn finalize(mut self) -> Self {
        self.move_starts.push(self.action_types.len() as u32);
        self
    }
}

#[wasm_bindgen]
impl ProcessedGame {
    #[wasm_bindgen(getter)]
    pub fn move_starts(&self) -> Vec<u32> {
        self.move_starts.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn action_types(&self) -> Vec<u8> {
        self.action_types.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn players(&self) -> Vec<u8> {
        self.players.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn from_idxs(&self) -> Vec<u32> {
        self.from_idxs.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn to_idxs(&self) -> Vec<u32> {
        self.to_idxs.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn piece_ids(&self) -> Vec<u16> {
        self.piece_ids.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn taken_piece_ids(&self) -> Vec<u16> {
        self.taken_piece_ids.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn promote_tokens(&self) -> Vec<u8> {
        self.promote_tokens.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn piece_names(&self) -> Vec<String> {
        self.piece_names.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn sans(&self) -> Vec<String> {
        self.sans.clone()
    }
}

fn algebraic_to_bit_index(square: &str) -> u32 {
    let bytes = square.as_bytes();
    let file_idx = 7 - (bytes[0] - b'a') as u32;
    let rank_idx = (bytes[1] - b'1') as u32;
    file_idx + 8 * rank_idx
}

fn file_number(c: char) -> i32 {
    match c {
        'a' => 7,
        'b' => 6,
        'c' => 5,
        'd' => 4,
        'e' => 3,
        'f' => 2,
        'g' => 1,
        'h' => 0,
        _ => -1,
    }
}

fn disambiguation_from_char(c: char) -> usize {
    match c {
        'a' => 16,
        'b' => 15,
        'c' => 14,
        'd' => 13,
        'e' => 12,
        'f' => 11,
        'g' => 10,
        'h' => 9,
        '1' => 1,
        '2' => 2,
        '3' => 3,
        '4' => 4,
        '5' => 5,
        '6' => 6,
        '7' => 7,
        '8' => 8,
        _ => 0,
    }
}

fn file_from_bit_index(idx: u32) -> char {
    b"abcdefgh"[(7 - idx % 8) as usize] as char
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sq(file: u32, rank: u32) -> u32 {
        (7 - file) + 8 * (rank - 1)
    }

    #[test]
    fn process_game_applies_moves() {
        let mut board = Board::new();
        let moves = vec!["e4".to_string(), "e5".to_string(), "Nf3".to_string()];
        board.process_game_quiet_moves(&moves);

        assert_eq!(board.get_piece_at(sq(4, 4)), 'P' as i32);
        assert_eq!(board.get_piece_at(sq(4, 2)), -1);
        assert_eq!(board.get_piece_at(sq(5, 3)), 'N' as i32);
    }
}
