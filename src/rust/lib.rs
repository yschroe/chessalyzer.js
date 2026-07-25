//! WASM entry point for the chess bitboard engine.
//!
//! This crate is compiled to WebAssembly and imported by the JavaScript
//! chess-board via the `#bitboard` package alias. All board state lives here;
//! JavaScript only keeps stable piece *names* for tracker statistics.
//!
//! ## How the pieces fit together
//! - `tables.rs` — precomputed attack masks (built at compile time, no runtime cost)
//! - `board.rs` — the `Board` struct: move/capture/promote + piece lookup for SAN parsing
//!
//! ## Rust ↔ JavaScript boundary
//! `#[wasm_bindgen]` on `Board` generates TypeScript-friendly bindings in `pkg/`.
//! Methods like `get_piece_at` return plain numbers instead of structs to keep
//! crossing the WASM boundary cheap.

mod board;
mod tables;

pub use board::Board;
