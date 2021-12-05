import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { EventEmitter } from 'events';
import cluster from 'cluster';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var pawnTemplate$2 = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
var pieceTemplate$2 = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];
var PiecePositionTable = /** @class */ (function () {
    function PiecePositionTable() {
        this.posMap = {
            w: {
                R: {
                    Ra: [7, 0],
                    Rh: [7, 7]
                },
                N: {
                    Nb: [7, 1],
                    Ng: [7, 6]
                },
                B: {
                    Bc: [7, 2],
                    Bf: [7, 5]
                },
                Q: {
                    Qd: [7, 3]
                },
                K: {
                    Ke: [7, 4]
                }
            },
            b: {
                R: {
                    Ra: [0, 0],
                    Rh: [0, 7]
                },
                N: {
                    Nb: [0, 1],
                    Ng: [0, 6]
                },
                B: {
                    Bc: [0, 2],
                    Bf: [0, 5]
                },
                Q: {
                    Qd: [0, 3]
                },
                K: {
                    Ke: [0, 4]
                }
            }
        };
    }
    PiecePositionTable.prototype.takes = function (player, piece) {
        if (!piece.includes('P')) {
            delete this.posMap[player][piece.substring(0, 1)][piece];
        }
    };
    PiecePositionTable.prototype.moves = function (player, piece, to) {
        if (!piece.includes('P')) {
            this.posMap[player][piece.substring(0, 1)][piece] = to;
        }
    };
    PiecePositionTable.prototype.promotes = function (player, piece, on) {
        if (!piece.includes('P')) {
            this.posMap[player][piece.substring(0, 1)][piece] = on;
        }
    };
    return PiecePositionTable;
}());
var ChessBoard = /** @class */ (function () {
    function ChessBoard() {
        this.tiles = new Array(8);
        for (var row = 0; row < 8; row += 1) {
            var currRow = new Array(8);
            for (var col = 0; col < 8; col += 1) {
                currRow[col] = null;
                var color = row === 0 || row === 1 ? 'b' : 'w';
                // init pieces
                if (row === 0 || row === 7) {
                    currRow[col] = { name: pieceTemplate$2[col], color: color };
                }
                else if (row === 1 || row === 6) {
                    currRow[col] = { name: pawnTemplate$2[col], color: color };
                }
            }
            this.tiles[row] = currRow;
        }
        this.defaultTiles = this.tiles.map(function (arr) { return arr.slice(); });
        this.pieces = new PiecePositionTable();
        this.promoteCounter = 0;
    }
    ChessBoard.prototype.move = function (moveData) {
        // === castles ===
        if (moveData.castles) {
            this.castle(moveData.castles, moveData.player);
            // moves/takes
        }
        else if (moveData.move !== null) {
            var from = moveData.move.from;
            var to = moveData.move.to;
            // === takes ===
            if (moveData.takes) {
                // update piece map
                this.pieces.takes(moveData.player === 'w' ? 'b' : 'w', moveData.takes.piece);
                // update board
                this.tiles[moveData.takes.pos[0]][moveData.takes.pos[1]] = null;
            }
            // === moves ===
            // update piece map
            this.pieces.moves(moveData.player, moveData.piece, to);
            // update board
            this.tiles[to[0]][to[1]] = this.tiles[from[0]][from[1]];
            this.tiles[from[0]][from[1]] = null;
            if (moveData.promotesTo) {
                var pieceName = "".concat(moveData.promotesTo).concat(this.promoteCounter);
                this.tiles[to[0]][to[1]] = {
                    name: pieceName,
                    color: moveData.player
                };
                this.pieces.promotes(moveData.player, pieceName, to);
                this.promoteCounter += 1;
            }
        }
    };
    ChessBoard.prototype.castle = function (move, player) {
        var row = player === 'w' ? 7 : 0;
        var scrKingCol = 4;
        var tarKingCol = 6;
        var srcRookCol = 7;
        var tarRookCol = 5;
        if (move === 'O-O-O') {
            tarKingCol = 2;
            tarRookCol = 3;
            srcRookCol = 0;
        }
        // move king
        this.pieces.moves(player, 'Ke', [row, tarKingCol]);
        this.tiles[row][tarKingCol] = this.tiles[row][scrKingCol];
        this.tiles[row][scrKingCol] = null;
        // move rook
        this.pieces.moves(player, this.tiles[row][srcRookCol].name, [
            row,
            tarRookCol
        ]);
        this.tiles[row][tarRookCol] = this.tiles[row][srcRookCol];
        this.tiles[row][srcRookCol] = null;
    };
    ChessBoard.prototype.reset = function () {
        this.tiles = this.defaultTiles.map(function (arr) { return arr.slice(); });
        this.pieces = new PiecePositionTable();
        this.promoteCounter = 0;
    };
    /** Prints the current board position to the console. */
    ChessBoard.prototype.printPosition = function () {
        for (var row = 0; row < 8; row += 1) {
            for (var col = 0; col < 8; col += 1) {
                var piece = this.tiles[row][col];
                if (piece !== null) {
                    process.stdout.write("|".concat(piece.color).concat(piece.name, "|"));
                }
                else {
                    process.stdout.write('|...|');
                }
            }
            process.stdout.write('\n');
        }
    };
    return ChessBoard;
}());

var __dirname = dirname(fileURLToPath(import.meta.url));
var files = 'abcdefgh';
var MoveNotFoundException = /** @class */ (function (_super) {
    __extends(MoveNotFoundException, _super);
    function MoveNotFoundException(token, tarRow, tarCol) {
        var _this = _super.call(this, "No piece for move ".concat(token, " to (").concat(tarRow, ",").concat(tarCol, ") found!")) || this;
        _this.name = 'MoveNotFoundError';
        return _this;
    }
    return MoveNotFoundException;
}(Error));
var ParsedMove = /** @class */ (function () {
    function ParsedMove() {
        this.san = null;
        this.player = null;
        this.piece = null;
        this.castles = null;
        this.takes = null;
        this.promotesTo = null;
        this.move = null;
    }
    return ParsedMove;
}());
/**
 * Class that processes games.
 */
var GameProcessor = /** @class */ (function () {
    function GameProcessor() {
        this.board = new ChessBoard();
        this.activePlayer = 'w';
        this.cntMoves = 0;
        this.cntGames = 0;
        this.gameAnalyzers = [];
        this.moveAnalyzers = [];
        this.analyzerNames = [];
        this.analyzerConfigs = [];
    }
    GameProcessor.checkConfig = function (config) {
        var hasFilter = Object.prototype.hasOwnProperty.call(config, 'filter');
        var cfg = {
            hasFilter: hasFilter,
            filter: hasFilter ? config.filter : function () { return true; },
            cntGames: Object.prototype.hasOwnProperty.call(config, 'cntGames')
                ? config.cntGames
                : Infinity
        };
        return cfg;
    };
    GameProcessor.prototype.attachAnalyzers = function (analyzers) {
        var _this = this;
        analyzers.forEach(function (a) {
            if (a.type === 'move') {
                _this.moveAnalyzers.push(a);
            }
            else if (a.type === 'game') {
                _this.gameAnalyzers.push(a);
            }
            _this.analyzerNames.push(a.constructor.name);
            _this.analyzerConfigs.push(a.cfg);
        });
    };
    GameProcessor.prototype.processPGN = function (path, analyzer, config, multiThreadCfg) {
        return __awaiter(this, void 0, void 0, function () {
            var readerFinished_1, customPath_1, isMultithreaded_1, status_1, cfg_1, forkWorker_1, games_1, game_1, lr_1, nEndForks, i, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        readerFinished_1 = false;
                        customPath_1 = '';
                        isMultithreaded_1 = multiThreadCfg !== null;
                        status_1 = new EventEmitter();
                        cluster.setupPrimary({
                            exec: "".concat(__dirname, "/Processor.worker.js")
                        });
                        cfg_1 = GameProcessor.checkConfig(config);
                        this.attachAnalyzers(analyzer);
                        forkWorker_1 = function (games) {
                            var w = cluster.fork();
                            // on worker finish
                            w.on('message', function (msg) {
                                // normally we could use w.send(...) outside of this listener
                                // there is a bug in node though, which sometimes sends the data too early
                                // --> wait until the worker sends a custom ready message
                                // see: https://github.com/nodejs/node/issues/39854
                                if (msg === 'readyForData') {
                                    w.send({
                                        games: games,
                                        customPath: customPath_1,
                                        analyzerNames: _this.analyzerNames,
                                        analyzerConfigs: _this.analyzerConfigs
                                    });
                                }
                                else {
                                    // add tracker data from this worker
                                    for (var i = 0; i < _this.gameAnalyzers.length; i += 1) {
                                        _this.gameAnalyzers[i].add(msg.gameAnalyzers[i]);
                                    }
                                    for (var i = 0; i < _this.moveAnalyzers.length; i += 1) {
                                        _this.moveAnalyzers[i].add(msg.moveAnalyzers[i]);
                                    }
                                    _this.cntMoves += msg.cntMoves;
                                    w.kill();
                                    // if this worker was the last one, emit 'finished' event
                                    if (Object.keys(cluster.workers).length === 0 &&
                                        readerFinished_1) {
                                        status_1.emit('finished');
                                    }
                                }
                            });
                        };
                        games_1 = [];
                        game_1 = { moves: [] };
                        lr_1 = createInterface({
                            input: createReadStream(path),
                            crlfDelay: Infinity
                        });
                        // on new line
                        lr_1.on('line', function (line) {
                            // data tag
                            if (line.startsWith('[') &&
                                (cfg_1.hasFilter || _this.gameAnalyzers.length > 0)) {
                                var key = line.match(/\[(.*?)\s/)[1];
                                var value = line.match(/"(.*?)"/)[1];
                                game_1[key] = value;
                                // moves
                            }
                            else if (line.match(/^\d/)) {
                                // add current move line
                                game_1.moves = game_1.moves.concat(line
                                    .replace(/(\d+\.{1,3}\s)|(\s?\{(.*?)\})/g, '')
                                    .split(' '));
                                // only if the result marker is in the line, all moves have been read -> start anaylyzing
                                if (line.match(/((1-0)|(0-1)|(1\/2-1\/2)|(\*))$/)) {
                                    // remove the result from the moves array
                                    game_1.moves.pop();
                                    if (!cfg_1.hasFilter || cfg_1.filter(game_1)) {
                                        _this.cntGames += 1;
                                        if (isMultithreaded_1) {
                                            games_1.push(game_1);
                                            // if enough games have been read in, start worker threads and let them analyze
                                            if (_this.cntGames %
                                                (multiThreadCfg.batchSize *
                                                    multiThreadCfg.nThreads) ===
                                                0) {
                                                for (var i = 0; i < multiThreadCfg.nThreads; i += 1) {
                                                    forkWorker_1(games_1.slice(i * multiThreadCfg.batchSize, i * multiThreadCfg.batchSize +
                                                        multiThreadCfg.batchSize));
                                                }
                                                games_1 = [];
                                            }
                                        }
                                        else {
                                            _this.processGame(game_1);
                                        }
                                    }
                                    game_1 = { moves: [] };
                                }
                            }
                            if (_this.cntGames >= cfg_1.cntGames) {
                                lr_1.close();
                                lr_1.removeAllListeners();
                            }
                        });
                        return [4 /*yield*/, EventEmitter.once(lr_1, 'close')];
                    case 1:
                        _a.sent();
                        // if on end there are still unprocessed games, start a last worker batch
                        if (games_1.length > 0) {
                            if (games_1.length > multiThreadCfg.batchSize) {
                                nEndForks = Math.ceil(games_1.length / multiThreadCfg.batchSize);
                                for (i = 0; i < nEndForks; i += 1) {
                                    forkWorker_1(games_1.slice(i * multiThreadCfg.batchSize, i * multiThreadCfg.batchSize +
                                        multiThreadCfg.batchSize));
                                }
                            }
                            else {
                                forkWorker_1(games_1);
                            }
                        }
                        readerFinished_1 = true;
                        if (!isMultithreaded_1) return [3 /*break*/, 3];
                        return [4 /*yield*/, EventEmitter.once(status_1, 'finished')];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        // console.log('Read entire file.');
                        analyzer.forEach(function (a) {
                            var _a;
                            (_a = a.finish) === null || _a === void 0 ? void 0 : _a.call(a);
                        });
                        return [2 /*return*/, {
                                cntGames: this.cntGames,
                                cntMoves: this.cntMoves
                            }];
                    case 4:
                        err_1 = _a.sent();
                        console.log(err_1);
                        return [2 /*return*/, { cntGames: -1, cntMoves: -1 }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    GameProcessor.prototype.processGame = function (game) {
        var moves = game.moves;
        try {
            var _loop_1 = function (i) {
                this_1.activePlayer = i % 2 === 0 ? 'w' : 'b';
                // fetch move data into currentMove
                var currentMove = this_1.parseMove(moves[i]);
                // move based analyzers
                this_1.moveAnalyzers.forEach(function (a) {
                    a.analyze(currentMove);
                });
                this_1.board.move(currentMove);
            };
            var this_1 = this;
            for (var i = 0; i < moves.length; i += 1) {
                _loop_1(i);
            }
        }
        catch (err) {
            console.log(err, game);
        }
        // notify move analyzers that the current game is done
        this.moveAnalyzers.forEach(function (a) {
            var _a;
            (_a = a.nextGame) === null || _a === void 0 ? void 0 : _a.call(a);
        });
        this.cntMoves += moves.length;
        this.board.reset();
        // game based analyzers
        this.gameAnalyzers.forEach(function (a) {
            a.analyze(game);
        });
    };
    GameProcessor.prototype.reset = function () {
        this.board.reset();
        this.activePlayer = 'w';
    };
    GameProcessor.prototype.parseMove = function (rawMove) {
        var token = rawMove.substring(0, 1);
        var currentMove;
        var san = GameProcessor.preProcess(rawMove);
        if (token.toLowerCase() === token) {
            currentMove = this.pawnMove(san);
        }
        else if (token !== 'O') {
            currentMove = this.pieceMove(san);
        }
        else {
            currentMove = this.castle(san);
        }
        return currentMove;
    };
    GameProcessor.prototype.pawnMove = function (san) {
        var moveData = new ParsedMove();
        moveData.san = san;
        moveData.player = this.activePlayer;
        var direction = this.activePlayer === 'w' ? 1 : -1;
        var offset = 0;
        var coords = { from: [], to: [] };
        // takes
        if (moveData.san.includes('x')) {
            moveData.san = moveData.san.replace('x', '');
            coords.to[0] = 8 - parseInt(moveData.san.substring(2, 3), 10);
            coords.to[1] = files.indexOf(moveData.san.substring(1, 2));
            coords.from[0] = coords.to[0] + direction;
            coords.from[1] = files.indexOf(moveData.san.substring(0, 1));
            // en passant
            if (this.board.tiles[coords.to[0]][coords.to[1]] === null) {
                offset = moveData.player === 'w' ? 1 : -1;
            }
            moveData.takes = {
                piece: this.board.tiles[coords.to[0] + offset][coords.to[1]]
                    .name,
                pos: [coords.to[0] + offset, coords.to[1]]
            };
            // moves
        }
        else {
            var tarRow = 8 - parseInt(moveData.san.substring(1, 2), 10);
            var tarCol = files.indexOf(moveData.san.substring(0, 1));
            coords.from[1] = tarCol;
            coords.to[0] = tarRow;
            coords.to[1] = tarCol;
            for (var i = tarRow + direction; i < 8 && i >= 0; i += direction) {
                if (this.board.tiles[i][tarCol] !== null) {
                    if (this.board.tiles[i][tarCol].name.includes('P')) {
                        coords.from[0] = i;
                        break;
                    }
                }
            }
        }
        moveData.piece = this.board.tiles[coords.from[0]][coords.from[1]].name;
        moveData.move = coords;
        // promotes
        if (moveData.san.includes('=')) {
            moveData.promotesTo = moveData.san.substring(moveData.san.length - 1, moveData.san.length);
        }
        return moveData;
    };
    GameProcessor.prototype.pieceMove = function (san) {
        var moveData = new ParsedMove();
        moveData.san = san;
        moveData.player = this.activePlayer;
        var takes = false;
        var coords = { from: [], to: [] };
        var token = moveData.san.substring(0, 1);
        // remove token
        moveData.san = moveData.san.substring(1, moveData.san.length);
        // takes
        if (moveData.san.includes('x')) {
            takes = true;
            moveData.san = moveData.san.replace('x', '');
        }
        // e.g. Re3f5
        if (moveData.san.length === 4) {
            coords.from[0] = 8 - parseInt(moveData.san.substring(1, 2), 10);
            coords.from[1] = files.indexOf(moveData.san.substring(0, 1));
            coords.to[0] = 8 - parseInt(moveData.san.substring(3, 4), 10);
            coords.to[1] = files.indexOf(moveData.san.substring(2, 3));
            // e.g. Ref3
        }
        else if (moveData.san.length === 3) {
            var tarRow = 8 - parseInt(moveData.san.substring(2, 3), 10);
            var tarCol = files.indexOf(moveData.san.substring(1, 2));
            var mustBeInRow = null;
            var mustBeInCol = null;
            // file is specified
            if (files.indexOf(moveData.san.substring(0, 1)) >= 0) {
                mustBeInCol = files.indexOf(moveData.san.substring(0, 1));
                // rank is specified
            }
            else {
                mustBeInRow = 8 - parseInt(moveData.san.substring(0, 1), 10);
            }
            coords = this.findPiece(tarRow, tarCol, mustBeInRow, mustBeInCol, token, moveData.player);
            // e.g. Rf3
        }
        else {
            var tarRow = 8 - parseInt(moveData.san.substring(1, 2), 10);
            var tarCol = files.indexOf(moveData.san.substring(0, 1));
            coords = this.findPiece(tarRow, tarCol, null, null, token, moveData.player);
        }
        // set move data
        moveData.move = coords;
        moveData.piece = this.board.tiles[coords.from[0]][coords.from[1]].name;
        if (takes) {
            moveData.takes = {
                piece: this.board.tiles[moveData.move.to[0]][moveData.move.to[1]].name,
                pos: moveData.move.to
            };
        }
        return moveData;
    };
    GameProcessor.prototype.castle = function (san) {
        var currentMove = new ParsedMove();
        currentMove.san = san;
        currentMove.player = this.activePlayer;
        currentMove.castles = currentMove.san;
        return currentMove;
    };
    GameProcessor.prototype.findPiece = function (tarRow, tarCol, mustBeInRow, mustBeInCol, token, player) {
        var color = player;
        var to = [tarRow, tarCol];
        var moveCfg = {
            Q: {
                line: true,
                diag: true
            },
            R: {
                line: true,
                diag: false
            },
            B: {
                line: false,
                diag: true
            },
            N: {
                line: false,
                diag: false
            }
        };
        // get array of positions of pieces of type <token>
        var validPieces = Object.values(this.board.pieces.posMap[color][token]);
        // filter pieces that can reach target square
        if (validPieces.length > 1) {
            validPieces = validPieces.filter(function (val) {
                var mustBeInFulfilled = (mustBeInRow === null || val[0] === mustBeInRow) &&
                    (mustBeInCol === null || val[1] === mustBeInCol);
                return (((moveCfg[token].line &&
                    (val[0] === tarRow || val[1] === tarCol)) ||
                    (moveCfg[token].diag &&
                        Math.abs(val[0] - tarRow) ===
                            Math.abs(val[1] - tarCol)) ||
                    (token === 'N' &&
                        ((Math.abs(val[0] - tarRow) === 2 &&
                            Math.abs(val[1] - tarCol) === 1) ||
                            (Math.abs(val[0] - tarRow) === 1 &&
                                Math.abs(val[1] - tarCol) === 2)))) &&
                    mustBeInFulfilled);
            });
        }
        // if only one piece is left, move is found
        if (validPieces.length === 1) {
            return {
                from: validPieces[0],
                to: to
            };
        }
        if (validPieces.length > 1) {
            for (var idx = 0; idx < validPieces.length - 1; idx += 1) {
                var piece = validPieces[idx];
                var obstructed = false;
                if (token !== 'N') {
                    var diff = [tarRow - piece[0], tarCol - piece[1]];
                    var steps = Math.max.apply(null, diff.map(Math.abs));
                    var dir = [Math.sign(diff[0]), Math.sign(diff[1])];
                    for (var i = 1; i < steps && !obstructed; i += 1) {
                        if (this.board.tiles[piece[0] + i * dir[0]][piece[1] + i * dir[1]]) {
                            obstructed = true;
                        }
                    }
                }
                if (!obstructed &&
                    !this.checkCheck({ from: piece, to: to }, player)) {
                    return {
                        from: piece,
                        to: to
                    };
                }
            }
            return {
                from: validPieces[validPieces.length - 1],
                to: to
            };
        }
        throw new MoveNotFoundException(token, tarRow, tarCol);
    };
    GameProcessor.prototype.checkCheck = function (move, player) {
        var from = move.from;
        var to = move.to;
        var color = player;
        var opColor = player === 'w' ? 'b' : 'w';
        var king = this.board.pieces.posMap[color].K.Ke;
        var isInCheck = false;
        // if king move, no check is possible, exit function
        if (king[0] === from[0] && king[1] === from[1])
            return false;
        // check if moving piece is on same line/diag as king, else exit
        var diff = [];
        diff[0] = from[0] - king[0];
        diff[1] = from[1] - king[1];
        var checkFor = [];
        if (diff[0] === 0 || diff[1] === 0) {
            checkFor[0] = 'Q';
            checkFor[1] = 'R';
        }
        else if (Math.abs(diff[0]) === Math.abs(diff[1])) {
            checkFor[0] = 'Q';
            checkFor[1] = 'B';
        }
        else {
            return false;
        }
        if (diff[0] !== 0)
            diff[0] = Math.sign(diff[0]);
        if (diff[1] !== 0)
            diff[1] = Math.sign(diff[1]);
        var srcTilePiece = this.board.tiles[from[0]][from[1]];
        var tarTilePiece = this.board.tiles[to[0]][to[1]];
        // premove and check if check
        this.board.tiles[from[0]][from[1]] = null;
        this.board.tiles[to[0]][to[1]] = srcTilePiece;
        // check for check
        var obstructed = false;
        for (var j = 1; j < 8 && !isInCheck && !obstructed; j += 1) {
            var row = king[0] + j * diff[0];
            var col = king[1] + j * diff[1];
            if (row >= 0 &&
                row < 8 &&
                col >= 0 &&
                col < 8 &&
                this.board.tiles[row][col] !== null) {
                var piece = this.board.tiles[row][col];
                if ((piece.name.includes(checkFor[0]) ||
                    piece.name.includes(checkFor[1])) &&
                    piece.color === opColor) {
                    isInCheck = true;
                }
                else {
                    obstructed = true;
                }
            }
        }
        this.board.tiles[from[0]][from[1]] = srcTilePiece;
        this.board.tiles[to[0]][to[1]] = tarTilePiece;
        return isInCheck;
    };
    GameProcessor.algebraicToCoords = function (square) {
        var coords = [];
        var temp = square.split('');
        coords.push(8 - Number(temp[1]));
        coords.push(files.indexOf(temp[0]));
        return coords;
    };
    GameProcessor.coordsToAlgebraic = function (coords) {
        var name = files[coords[1]];
        name += 8 - coords[0];
        return name;
    };
    GameProcessor.preProcess = function (move) {
        return move.replace(/#|\+|\?|!/g, '');
    };
    return GameProcessor;
}());

var BaseTracker = /** @class */ (function () {
    function BaseTracker(type) {
        this.type = type;
        this.cfg = {
            profilingActive: false
        };
        this.time = 0;
        this.t0 = 0;
        if (this.type === undefined) {
            throw new Error('Your analyzer must specify a type!');
        }
    }
    BaseTracker.prototype.analyze = function (data) {
        if (this.cfg.profilingActive)
            this.t0 = performance.now();
        this.track(data);
        if (this.cfg.profilingActive)
            this.time += performance.now() - this.t0;
    };
    BaseTracker.prototype.track = function (data) {
        throw new Error('Your analyzer must implement a track() method!');
    };
    return BaseTracker;
}());

var pawnTemplate$1 = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
var pieceTemplate$1 = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];
var PieceTrackerBase = /** @class */ (function (_super) {
    __extends(PieceTrackerBase, _super);
    function PieceTrackerBase() {
        var _this = _super.call(this, 'move') || this;
        _this.b = {};
        _this.w = {};
        // first layer
        pawnTemplate$1.forEach(function (val) {
            _this.w[val] = {};
            _this.b[val] = {};
        });
        pieceTemplate$1.forEach(function (val) {
            _this.w[val] = {};
            _this.b[val] = {};
        });
        // second layer
        Object.keys(_this.w).forEach(function (key) {
            pawnTemplate$1.forEach(function (val) {
                _this.w[key][val] = 0;
                _this.b[key][val] = 0;
            });
            pieceTemplate$1.forEach(function (val) {
                _this.w[key][val] = 0;
                _this.b[key][val] = 0;
            });
        });
        return _this;
    }
    PieceTrackerBase.prototype.add = function (tracker) {
        var _this = this;
        this.time += tracker.time;
        pawnTemplate$1.forEach(function (pawn) {
            pieceTemplate$1.forEach(function (piece) {
                _this.w[pawn][piece] += tracker.w[pawn][piece];
                _this.b[pawn][piece] += tracker.b[pawn][piece];
            });
            pawnTemplate$1.forEach(function (pawn2) {
                _this.w[pawn][pawn2] += tracker.w[pawn][pawn2];
                _this.b[pawn][pawn2] += tracker.b[pawn][pawn2];
            });
        });
        pieceTemplate$1.forEach(function (piece) {
            pieceTemplate$1.forEach(function (piece2) {
                _this.w[piece][piece2] += tracker.w[piece][piece2];
                _this.b[piece][piece2] += tracker.b[piece][piece2];
            });
            pawnTemplate$1.forEach(function (pawn) {
                _this.w[piece][pawn] += tracker.w[piece][pawn];
                _this.b[piece][pawn] += tracker.b[piece][pawn];
            });
        });
    };
    PieceTrackerBase.prototype.track = function (moveData) {
        var player = moveData.player;
        var piece = moveData.piece;
        var takes = moveData.takes;
        if (takes) {
            if (piece.length > 1 &&
                takes.piece.length > 1 &&
                !piece.match(/\d/g) &&
                !takes.piece.match(/\d/g)) {
                this.processTakes(player, piece, takes.piece);
            }
        }
    };
    PieceTrackerBase.prototype.processTakes = function (player, takingPiece, takenPiece) {
        this[player][takingPiece][takenPiece] += 1;
    };
    return PieceTrackerBase;
}(BaseTracker));

var pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
var pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];
var TileStats = /** @class */ (function () {
    function TileStats() {
        this.movedTo = 0;
        this.wasOn = 0;
        this.killedOn = 0;
        this.wasKilledOn = 0;
    }
    return TileStats;
}());
var Piece = /** @class */ (function () {
    function Piece(piece, color) {
        this.piece = piece;
        this.color = color;
        this.lastMovedOn = 0;
    }
    return Piece;
}());
var TileTrackerBase = /** @class */ (function (_super) {
    __extends(TileTrackerBase, _super);
    function TileTrackerBase() {
        var _this = _super.call(this, 'move') || this;
        _this.cntMovesGame = 0;
        _this.cntMovesTotal = 0;
        _this.tiles = new Array(8);
        var _loop_1 = function (row) {
            var currRow = new Array(8);
            var _loop_2 = function (col) {
                currRow[col] = {
                    b: new TileStats(),
                    w: new TileStats(),
                    currentPiece: null
                };
                pawnTemplate.forEach(function (val) {
                    currRow[col].b[val] = new TileStats();
                    currRow[col].w[val] = new TileStats();
                });
                pieceTemplate.forEach(function (val) {
                    currRow[col].b[val] = new TileStats();
                    currRow[col].w[val] = new TileStats();
                });
            };
            for (var col = 0; col < 8; col += 1) {
                _loop_2(col);
            }
            this_1.tiles[row] = currRow;
        };
        var this_1 = this;
        for (var row = 0; row < 8; row += 1) {
            _loop_1(row);
        }
        for (var row = 0; row < 8; row += 1) {
            for (var col = 0; col < 8; col += 1) {
                _this.resetCurrentPiece(row, col);
            }
        }
        return _this;
    }
    TileTrackerBase.prototype.add = function (tracker) {
        var _this = this;
        this.time += tracker.time;
        this.cntMovesGame += tracker.cntMovesGame;
        this.cntMovesTotal += tracker.cntMovesTotal;
        var _loop_3 = function (row) {
            var _loop_4 = function (col) {
                this_2.tiles[row][col].b.movedTo +=
                    tracker.tiles[row][col].b.movedTo;
                this_2.tiles[row][col].w.movedTo +=
                    tracker.tiles[row][col].w.movedTo;
                this_2.tiles[row][col].b.wasOn += tracker.tiles[row][col].b.wasOn;
                this_2.tiles[row][col].w.wasOn += tracker.tiles[row][col].w.wasOn;
                this_2.tiles[row][col].b.killedOn +=
                    tracker.tiles[row][col].b.killedOn;
                this_2.tiles[row][col].w.killedOn +=
                    tracker.tiles[row][col].w.killedOn;
                this_2.tiles[row][col].b.wasKilledOn +=
                    tracker.tiles[row][col].b.wasKilledOn;
                this_2.tiles[row][col].w.wasKilledOn +=
                    tracker.tiles[row][col].w.wasKilledOn;
                pawnTemplate.forEach(function (piece) {
                    _this.tiles[row][col].b[piece].movedTo +=
                        tracker.tiles[row][col].b[piece].movedTo;
                    _this.tiles[row][col].w[piece].movedTo +=
                        tracker.tiles[row][col].w[piece].movedTo;
                    _this.tiles[row][col].b[piece].wasOn +=
                        tracker.tiles[row][col].b[piece].wasOn;
                    _this.tiles[row][col].w[piece].wasOn +=
                        tracker.tiles[row][col].w[piece].wasOn;
                    _this.tiles[row][col].b[piece].killedOn +=
                        tracker.tiles[row][col].b[piece].killedOn;
                    _this.tiles[row][col].w[piece].killedOn +=
                        tracker.tiles[row][col].w[piece].killedOn;
                    _this.tiles[row][col].b[piece].wasKilledOn +=
                        tracker.tiles[row][col].b[piece].wasKilledOn;
                    _this.tiles[row][col].w[piece].wasKilledOn +=
                        tracker.tiles[row][col].w[piece].wasKilledOn;
                });
                pieceTemplate.forEach(function (piece) {
                    _this.tiles[row][col].b[piece].movedTo +=
                        tracker.tiles[row][col].b[piece].movedTo;
                    _this.tiles[row][col].w[piece].movedTo +=
                        tracker.tiles[row][col].w[piece].movedTo;
                    _this.tiles[row][col].b[piece].wasOn +=
                        tracker.tiles[row][col].b[piece].wasOn;
                    _this.tiles[row][col].w[piece].wasOn +=
                        tracker.tiles[row][col].w[piece].wasOn;
                    _this.tiles[row][col].b[piece].killedOn +=
                        tracker.tiles[row][col].b[piece].killedOn;
                    _this.tiles[row][col].w[piece].killedOn +=
                        tracker.tiles[row][col].w[piece].killedOn;
                    _this.tiles[row][col].b[piece].wasKilledOn +=
                        tracker.tiles[row][col].b[piece].wasKilledOn;
                    _this.tiles[row][col].w[piece].wasKilledOn +=
                        tracker.tiles[row][col].w[piece].wasKilledOn;
                });
            };
            for (var col = 0; col < 8; col += 1) {
                _loop_4(col);
            }
        };
        var this_2 = this;
        for (var row = 0; row < 8; row += 1) {
            _loop_3(row);
        }
    };
    TileTrackerBase.prototype.resetCurrentPiece = function (row, col) {
        var color;
        var piece;
        var hasPiece = false;
        if (row === 0) {
            color = 'b';
            piece = pieceTemplate[col];
            hasPiece = true;
        }
        else if (row === 1) {
            color = 'b';
            piece = pawnTemplate[col];
            hasPiece = true;
        }
        else if (row === 6) {
            color = 'w';
            piece = pawnTemplate[col];
            hasPiece = true;
        }
        else if (row === 7) {
            color = 'w';
            piece = pieceTemplate[col];
            hasPiece = true;
        }
        if (hasPiece) {
            this.tiles[row][col].currentPiece = new Piece(piece, color);
        }
        else {
            this.tiles[row][col].currentPiece = null;
        }
    };
    TileTrackerBase.prototype.track = function (moveData) {
        var move = moveData.move;
        var player = moveData.player;
        var piece = moveData.piece;
        var takes = moveData.takes;
        var castles = moveData.castles;
        // move
        if (move) {
            this.cntMovesGame += 1;
            if (takes) {
                this.processTakes(takes.pos, player, piece, takes.piece);
            }
            this.processMove(move, player, piece);
            // castle
        }
        else if (castles) {
            this.cntMovesGame += 1;
            var row = player === 'w' ? 7 : 0;
            var rook = 'Rh';
            var tarKingCol = 6;
            var tarRookCol = 5;
            var srcRookCol = 7;
            if (castles === 'O-O-O') {
                rook = 'Ra';
                tarKingCol = 2;
                tarRookCol = 3;
                srcRookCol = 0;
            }
            this.processMove({ from: [row, 4], to: [row, tarKingCol] }, player, 'Ke');
            this.processMove({ from: [row, srcRookCol], to: [row, tarRookCol] }, player, rook);
        }
    };
    TileTrackerBase.prototype.nextGame = function () {
        for (var row = 0; row < 8; row += 1) {
            for (var col = 0; col < 8; col += 1) {
                var currentPiece = this.tiles[row][col].currentPiece;
                if (currentPiece !== null) {
                    this.addOccupation([row, col]);
                }
                this.resetCurrentPiece(row, col);
            }
        }
        this.cntMovesTotal += this.cntMovesGame;
        this.cntMovesGame = 0;
    };
    TileTrackerBase.prototype.processMove = function (move, player, piece) {
        if (piece.length > 1 && !piece.match(/\d/g)) {
            this.addOccupation(move.from);
            this.tiles[move.to[0]][move.to[1]].currentPiece =
                this.tiles[move.from[0]][move.from[1]].currentPiece;
            this.tiles[move.to[0]][move.to[1]].currentPiece.lastMovedOn =
                this.cntMovesGame;
            this.tiles[move.from[0]][move.from[1]].currentPiece = null;
            this.tiles[move.to[0]][move.to[1]][player].movedTo += 1;
            this.tiles[move.to[0]][move.to[1]][player][piece].movedTo += 1;
        }
    };
    TileTrackerBase.prototype.processTakes = function (pos, player, takingPiece, takenPiece) {
        if (takenPiece.length > 1 && !takenPiece.match(/\d/g)) {
            var opPlayer = player === 'w' ? 'b' : 'w';
            this.tiles[pos[0]][pos[1]][opPlayer].wasKilledOn += 1;
            this.tiles[pos[0]][pos[1]][opPlayer][takenPiece].wasKilledOn += 1;
            this.addOccupation(pos);
            this.tiles[pos[0]][pos[1]].currentPiece = null;
        }
        if (takingPiece.length > 1 && !takingPiece.match(/\d/g)) {
            this.tiles[pos[0]][pos[1]][player].killedOn += 1;
            this.tiles[pos[0]][pos[1]][player][takingPiece].killedOn += 1;
        }
    };
    TileTrackerBase.prototype.addOccupation = function (pos) {
        var currentPiece = this.tiles[pos[0]][pos[1]].currentPiece;
        var toAdd = this.cntMovesGame - currentPiece.lastMovedOn;
        this.tiles[pos[0]][pos[1]][currentPiece.color].wasOn += toAdd;
        this.tiles[pos[0]][pos[1]][currentPiece.color][currentPiece.piece].wasOn += toAdd;
    };
    return TileTrackerBase;
}(BaseTracker));

var GameTrackerBase = /** @class */ (function (_super) {
    __extends(GameTrackerBase, _super);
    function GameTrackerBase() {
        var _this = _super.call(this, 'game') || this;
        _this.results = { white: 0, black: 0, draw: 0 };
        _this.cntGames = 0;
        _this.ECO = {};
        return _this;
    }
    GameTrackerBase.prototype.add = function (tracker) {
        var _this = this;
        this.results.white += tracker.results.white;
        this.results.black += tracker.results.black;
        this.results.draw += tracker.results.draw;
        this.cntGames += tracker.cntGames;
        this.time += tracker.time;
        Object.keys(tracker.ECO).forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(_this.ECO, key)) {
                _this.ECO[key] += tracker.ECO[key];
            }
            else {
                _this.ECO[key] = tracker.ECO[key];
            }
        });
    };
    GameTrackerBase.prototype.track = function (game) {
        this.cntGames += 1;
        switch (game.Result) {
            case '1-0':
                this.results.white += 1;
                break;
            case '1/2-1/2':
                this.results.draw += 1;
                break;
            case '0-1':
                this.results.black += 1;
                break;
        }
        if (Object.prototype.hasOwnProperty.call(this.ECO, game.ECO)) {
            this.ECO[game.ECO] += 1;
        }
        else {
            this.ECO[game.ECO] = 1;
        }
    };
    GameTrackerBase.prototype.finish = function () {
        var _this = this;
        // sort keys
        this.ECO = Object.keys(this.ECO)
            .sort()
            .reduce(function (accumulator, currentValue) {
            accumulator[currentValue] = _this.ECO[currentValue];
            return accumulator;
        }, {});
    };
    return GameTrackerBase;
}(BaseTracker));

var Tracker = {
    Game: GameTrackerBase,
    Piece: PieceTrackerBase,
    Tile: TileTrackerBase,
    Base: BaseTracker
};

process.on('message', function (msg) {
    var TrackerList = {};
    var proc = new GameProcessor();
    Object.keys(Tracker).forEach(function (key) {
        TrackerList[Tracker[key].name] = Tracker[key];
    });
    // merge available Trackers
    if (msg.customPath) {
        var TrackerListCustom_1 = msg.customPath;
        Object.keys(TrackerListCustom_1).forEach(function (key) {
            TrackerList[TrackerListCustom_1[key].name] = TrackerListCustom_1[key];
        });
    }
    // select needed analyzers
    var analyzer = [];
    msg.analyzerNames.forEach(function (name) {
        analyzer.push(new TrackerList[name]());
    });
    for (var i = 0; i < analyzer.length; i += 1) {
        analyzer[i].cfg = msg.analyzerConfigs[i];
    }
    proc.attachAnalyzers(analyzer);
    // analyze each game
    msg.games.forEach(function (game) {
        proc.processGame(game);
    });
    // send result of batch to master
    process.send({
        cntMoves: proc.cntMoves,
        gameAnalyzers: proc.gameAnalyzers,
        moveAnalyzers: proc.moveAnalyzers
    });
});
// only needed for workaround for https://github.com/nodejs/node/issues/39854
process.send('readyForData');
