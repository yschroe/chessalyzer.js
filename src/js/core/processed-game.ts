import type { Action, CaptureAction, MoveAction, PromoteAction } from '../interfaces';
import type { PlayerColor } from '../types';

export interface ProcessedGameData {
    move_starts: ArrayLike<number>;
    action_types: ArrayLike<number>;
    players: ArrayLike<number>;
    from_idxs: ArrayLike<number>;
    to_idxs: ArrayLike<number>;
    piece_ids: ArrayLike<number>;
    taken_piece_ids: ArrayLike<number>;
    promote_tokens: ArrayLike<number>;
    piece_names: string[];
    sans: string[];
}

/** Decodes compact WASM action data into the Action[][] shape trackers expect. */
export function decodeProcessedGame(raw: ProcessedGameData): Action[][] {
    const moveStarts = raw.move_starts;
    const actionTypes = raw.action_types;
    const players = raw.players;
    const fromIdxs = raw.from_idxs;
    const toIdxs = raw.to_idxs;
    const pieceIds = raw.piece_ids;
    const takenPieceIds = raw.taken_piece_ids;
    const promoteTokens = raw.promote_tokens;
    const pieceNames = raw.piece_names;
    const sans = raw.sans;

    const moveCount = sans.length;
    const result: Action[][] = new Array(moveCount);

    for (let m = 0; m < moveCount; m += 1) {
        const san = sans[m];
        const start = moveStarts[m];
        const end = moveStarts[m + 1];
        const actions: Action[] = new Array(end - start);

        for (let i = start; i < end; i += 1) {
            const offset = i - start;
            const player = (players[i] === 0 ? 'w' : 'b') as PlayerColor;
            switch (actionTypes[i]) {
                case 0:
                    actions[offset] = {
                        type: 'move',
                        san,
                        player,
                        piece: pieceNames[pieceIds[i]],
                        fromIdx: fromIdxs[i],
                        toIdx: toIdxs[i],
                    } satisfies MoveAction;
                    break;
                case 1:
                    actions[offset] = {
                        type: 'capture',
                        san,
                        player,
                        takingPiece: pieceNames[pieceIds[i]],
                        takenPiece: pieceNames[takenPieceIds[i]],
                        onIdx: toIdxs[i],
                    } satisfies CaptureAction;
                    break;
                case 2:
                    actions[offset] = {
                        type: 'promote',
                        san,
                        player,
                        to: String.fromCharCode(promoteTokens[i]),
                        onIdx: toIdxs[i],
                    } satisfies PromoteAction;
                    break;
            }
        }

        result[m] = actions;
    }

    return result;
}
