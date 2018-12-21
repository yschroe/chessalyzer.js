(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("chessalyzer", [], factory);
	else if(typeof exports === 'object')
		exports["chessalyzer"] = factory();
	else
		root["chessalyzer"] = factory();
})(global, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/ChessBoard.js":
/*!***************************!*\
  !*** ./src/ChessBoard.js ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ChessPiece = _interopRequireDefault(__webpack_require__(/*! ./ChessPiece */ "./src/ChessPiece.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
var pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

var ChessBoard =
/*#__PURE__*/
function () {
  function ChessBoard() {
    _classCallCheck(this, ChessBoard);

    this.tiles = new Array(8);

    for (var row = 0; row < 8; row += 1) {
      var currRow = new Array(8);

      for (var col = 0; col < 8; col += 1) {
        currRow[col] = null;
        var color = row === 0 || row === 1 ? 'b' : 'w'; // init pieces

        if (row === 0 || row === 7) {
          currRow[col] = new _ChessPiece.default(pieceTemplate[col], color);
        } else if (row === 1 || row === 6) {
          currRow[col] = new _ChessPiece.default(pawnTemplate[col], color);
        }
      }

      this.tiles[row] = currRow;
    }

    this.defaultTiles = this.tiles.map(function (arr) {
      return arr.slice();
    });
    this.kingPos = {
      w: [7, 4],
      b: [0, 4]
    };
  }

  _createClass(ChessBoard, [{
    key: "move",
    value: function move(moveData) {
      var from = moveData.from;
      var to = moveData.to; // castles

      if (moveData.castles !== '') {
        this.castle(moveData.castles, moveData.player); // moves/takes
      } else if (from[0] !== -1) {
        // takes
        if ('pos' in moveData.takes) {
          this.tiles[moveData.takes.pos[0]][moveData.takes.pos[1]] = null;
        } // moves


        this.tiles[to[0]][to[1]] = this.tiles[from[0]][from[1]];
        this.tiles[from[0]][from[1]] = null;

        if (moveData.promotesTo !== '') {
          this.tiles[to[0]][to[1]] = new _ChessPiece.default(moveData.promotesTo, moveData.player);
        }

        if (moveData.san.substring(0, 1) === 'K') {
          this.kingPos[moveData.player] = to;
        }
      }
    }
  }, {
    key: "castle",
    value: function castle(move, player) {
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

      this.tiles[row][tarKingCol] = this.tiles[row][scrKingCol];
      this.tiles[row][tarRookCol] = this.tiles[row][srcRookCol];
      this.tiles[row][scrKingCol] = null;
      this.tiles[row][srcRookCol] = null;
      this.kingPos[player] = [row, tarKingCol];
    }
  }, {
    key: "reset",
    value: function reset() {
      this.tiles = this.defaultTiles.map(function (arr) {
        return arr.slice();
      });
      this.kingPos = {
        w: [7, 4],
        b: [0, 4]
      };
    }
    /** Prints the current board position to the console. */

  }, {
    key: "printPosition",
    value: function printPosition() {
      for (var row = 0; row < 8; row += 1) {
        var rowArray = [];

        for (var col = 0; col < 8; col += 1) {
          var piece = this.tiles[row][col];

          if (piece !== null) {
            rowArray.push(piece.color + piece.name);
          } else {
            rowArray.push('...');
          }
        }

        console.log(rowArray);
      }
    }
  }]);

  return ChessBoard;
}();

var _default = ChessBoard;
exports.default = _default;
module.exports = exports["default"];

/***/ }),

/***/ "./src/ChessPiece.js":
/*!***************************!*\
  !*** ./src/ChessPiece.js ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ChessPiece = function ChessPiece(name, color) {
  _classCallCheck(this, ChessPiece);

  this.name = name;
  this.color = color;
};

var _default = ChessPiece;
exports.default = _default;
module.exports = exports["default"];

/***/ }),

/***/ "./src/Chessalyzer.js":
/*!****************************!*\
  !*** ./src/Chessalyzer.js ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _GameProcessor = _interopRequireDefault(__webpack_require__(/*! ./GameProcessor */ "./src/GameProcessor.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _require = __webpack_require__(/*! perf_hooks */ "perf_hooks"),
    performance = _require.performance;

var fs = __webpack_require__(/*! fs */ "fs");

var pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
var pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];
/**
 * @typedef {Object} cfg
 * @property {Function} filter - Descr
 * @property {Number} cntGames - Descr
 * @property {Boolean} split - Descr
 */

/** Main class for batch processing and generating heat maps */

var Chessalyzer =
/*#__PURE__*/
function () {
  function Chessalyzer() {
    _classCallCheck(this, Chessalyzer);

    /**
     * Contains the tracked data of the processed PGN files. Has two different banks for
     * heat map comparison. Each object contains the following keys:
     * <ul>
     * <li>data: {cntMoves, cntGames}. Information about the count of processed moves and games</li>
     * <li>tiles: 8x8 array of {@link ChessTile}s.</li>
     * </ul>
     * @member {Object[]}
     */
    this.dataStore = new Array(2);
    /**
     * Does the analysis part
     * @private
     * @member {GameProcessor}
     */

    this.gameProcessor = new _GameProcessor.default();
  }
  /**
   * Starts the batch processing for the selected file
   * @param {String} path - Path to the PGN file that should be analyzed
   * @param {Object} [cfg = {}]
   * @param {Function} [cfg.filter = ()=>true] - Filter function for selecting games
   * @param {Number} [cfg.cntGames = Infinite ] - Max amount of games to process
   * @param {Object} cfg.stats - Configuration for data aquisition
   * @param {Boolean} [cfg.stats.logPieceHistory = false] - Option for logging the position
   * of every piece.
   * @param {Boolean} [cfg.stats.logTileOccupation = true] - Option for logging the piece
   * on every tile after every move.
   * @param {Number} [bank = 0] - The data bank the results shall be saved to
   * @param {Number} [refreshRate = 250] - Defines how often the current status of the
   *  analysis shall be exposed. Every number of processed games an event is emitted
   *  containing the current number of processed games. The event can be handled via
   *  "chessalyzer.gameProcessor.on('status', function(gameCnt) {// do handling here});",
   *  e.g. to update an UI.
   * @returns {Promise} Promise that contains the number of processed games when finished
   */


  _createClass(Chessalyzer, [{
    key: "startBatch",
    value: function startBatch(path) {
      var _this = this;

      var cfg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var refreshRate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 250;
      return new Promise(function (resolve) {
        var t0 = performance.now();

        _this.gameProcessor.processPGN(path, cfg, refreshRate).then(function () {
          var t1 = performance.now();
          var tdiff = Math.round(t1 - t0) / 1000;
          var mps = Math.round(_this.gameProcessor.cntMoves / tdiff);
          console.log("".concat(_this.gameProcessor.cntGames, " games (").concat(_this.gameProcessor.cntMoves, " moves) processed in ").concat(tdiff, "s (").concat(mps, " moves/s)"));

          _this.gameProcessor.reset();

          resolve();
        });
      });
    }
    /**
     * Saves a completed batch run to a JSON file
     * @param {String} path - Path the data file shall be saved to
     * @param {Number} [bank = 0] - The data bank the data shall be taken from
     */

  }, {
    key: "saveData",
    value: function saveData(path) {
      var bank = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      fs.writeFile(path, JSON.stringify(this.dataStore[bank]), function (err) {
        if (err) {
          console.error(err);
          return;
        }

        console.log('File has been created');
      });
    }
    /**
     * Loads the stats of a previous batch run (JSON) to a data bank
     * @param {String} path - Path the data file shall be loaded from
     * @param {Number} [bank = 0] - The data bank the data shall be loaded to.
     * @returns {Number} Count of loaded games
     */

  }, {
    key: "loadData",
    value: function loadData(path, bank) {
      this.dataStore[bank] = JSON.parse(fs.readFileSync(path, 'utf8'));
      console.log("File '".concat(path, "' has been loaded to bank ").concat(bank, "."));
      return this.dataStore[bank].cntGames;
    }
    /**
     * Generates a heatmap out of the tracked data.
     * @param {Number} bank - The data bank the data shall be taken from
     * @param {String} square - The square the data shall be generated for. For example, if you
     * wanted to know how often a specific piece was on a specific tile, you would pass the
     * identifier of the tile to the function, e.g. "a2"
     * @param {Function} fun - The evaluation function that generates the heatmap out of the
     * saved data. This function gets passed the following arguments:
     * <ol>
     * <li>The complete data stored in the chosen bank. See the member description of the dataStore
     * member to see which data is available.</li>
     * <li>The coords of the tile passed as the 'square' argument.</li>
     * <li>The current coordinates of the tile the data should be generated for.
     * The function must return a Number with the heat map value for the square passed as the
     * third argument.</li>
     * <li>An optional data field, you passed for 'optData'</li>
     * </ol>
     * See ./src/exampleHeatmapConfig for examples of such a function.
     * @param {} optData - Optional data you may need in your eval function
     * @returns {Array} Array with 3 entries:
     * <ol>
     * <li>8x8 Array containing the heat map values for each tile</li>
     * <li>The minimum value in the heatmap.</li>
     * <li>The maximum value in the heatmap.</li>
     * </ol>
     */

  }, {
    key: "generateHeatmap",
    value: function generateHeatmap(bank, square, fun, optData) {
      var coords = _GameProcessor.default.algebraicToCoords(square);

      var map = [];
      var max = 0;
      var min = 1000000;

      for (var i = 0; i < 8; i += 1) {
        var dataRow = new Array(8);

        for (var j = 0; j < 8; j += 1) {
          dataRow[j] = fun(this.dataStore[bank], coords, [i, j], optData);
          if (dataRow[j] > max) max = dataRow[j];
          if (dataRow[j] < min) min = dataRow[j];
        }

        map.push(dataRow);
      }

      return [map, min, max];
    }
    /**
     * Generates a comparison heatmap out of the tracked data. There needs to data in both
     * banks you pass as bank1 and bank2 params. The heatmap for both banks are calculated
     * and then the relative differences between both banks are calculated. For example,
     * if the heatmap value for "a1" of bank1 is 10 and the value of bank2 is 5, the returned
     * value for "a1" would be 100% ([[10/5] -1] *100).
     * @param {String} square - The square the data shall be generated for.
     * @param {Function} fun - The evaluation function that generates the heatmap out of the
     * saved data. See {@link Chessalyzer#generateHeatmap} for a more detailed description.
     * @param {Number} [bank1 = 0] - Bank number of dataset 1
     * @param {Number} [bank2 = 1] - Bank number of dataset 2
     * @param {} optData - Optional data you may need in your eval function
     * @returns {Array} Array with 3 entries:
     * <ol>
     * <li>8x8 Array containing the heat map values for each tile</li>
     * <li>The minimum value in the heatmap.</li>
     * <li>The maximum value in the heatmap.</li>
     * </ol>
     */

  }, {
    key: "generateComparisonHeatmap",
    value: function generateComparisonHeatmap(square, fun) {
      var bank1 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      var bank2 = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;
      var optData = arguments[4];
      var map = [];
      var max = 0;
      var min = 100000; // comparison heatmap

      var data0 = this.generateHeatmap(bank1, square, fun, optData);
      var data1 = this.generateHeatmap(bank2, square, fun, optData);

      for (var i = 0; i < 8; i += 1) {
        var dataRow = new Array(8);

        for (var j = 0; j < 8; j += 1) {
          var a = data0[0][i][j];
          var b = data1[0][i][j];
          if (a === 0 || b === 0) dataRow[j] = 0;else dataRow[j] = (a >= b ? a / b - 1 : -b / a + 1) * 100;
          if (dataRow[j] > max) max = dataRow[j];
          if (dataRow[j] < min) min = dataRow[j];
        }

        map.push(dataRow);
      }

      return [map, min, max];
    }
  }], [{
    key: "generateList",
    value: function generateList(map) {
      var list = [];

      for (var i = 0; i < 8; i += 1) {
        for (var j = 0; j < 8; j += 1) {
          var val = map[i][j];
          val = val.toFixed(2);

          if (Math.abs(val) > 0.001) {
            if (i === 0) list.push(["b".concat(pieceTemplate[j]), val]);else if (i === 1) list.push(["b".concat(pawnTemplate[j]), val]);else if (i === 6) list.push(["w".concat(pawnTemplate[j]), val]);else if (i === 7) list.push(["w".concat(pieceTemplate[j]), val]);
          }
        }
      }

      list.sort(function (a, b) {
        return b[1] - a[1];
      });
      return list;
    }
  }]);

  return Chessalyzer;
}();

var _default = Chessalyzer;
exports.default = _default;
module.exports = exports["default"];

/***/ }),

/***/ "./src/GameProcessor.js":
/*!******************************!*\
  !*** ./src/GameProcessor.js ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ChessBoard = _interopRequireDefault(__webpack_require__(/*! ./ChessBoard */ "./src/ChessBoard.js"));

var _MoveData = _interopRequireDefault(__webpack_require__(/*! ./MoveData */ "./src/MoveData.js"));

var _PieceTracker = _interopRequireDefault(__webpack_require__(/*! ./PieceTracker */ "./src/PieceTracker.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var LineByLineReader = __webpack_require__(/*! line-by-line */ "line-by-line");

var EventEmitter = __webpack_require__(/*! events */ "events");

var files = 'abcdefgh';
/**
 * Class that processes games.
 */

var GameProcessor =
/*#__PURE__*/
function (_EventEmitter) {
  _inherits(GameProcessor, _EventEmitter);

  function GameProcessor() {
    var _this;

    _classCallCheck(this, GameProcessor);

    _this = _possibleConstructorReturn(this, (GameProcessor.__proto__ || Object.getPrototypeOf(GameProcessor)).call(this));
    _this.board = new _ChessBoard.default();
    _this.currentMove = new _MoveData.default();
    _this.pieceTracker = new _PieceTracker.default();
    _this.activePlayer = 0;
    _this.cntMoves = 0;
    _this.cntGames = 0;
    return _this;
  }

  _createClass(GameProcessor, [{
    key: "processPGN",
    value: function processPGN(path, config, refreshRate) {
      var _this2 = this;

      var cfg = GameProcessor.checkConfig(config);
      return new Promise(function (resolve, reject) {
        var lr = new LineByLineReader(path, {
          skipEmptyLines: true
        });
        var game = {}; // process current line

        var processLine = function processLine(line) {
          // data tag
          if (line.startsWith('[') && cfg.hasFilter) {
            var key = line.match(/\[(.*?)\s/)[1];
            var value = line.match(/"(.*?)"/)[1];
            game[key] = value; // moves
          } else if (line.startsWith('1')) {
            game.moves = line.replace(/\{(.*?)\}\s/g, '').replace(/\d+\.+\s/g, '').replace(' *', '').split(' ');

            if (cfg.filter(game) || !cfg.hasFilter) {
              _this2.processGame(game);
            } // emit event


            if (_this2.cntGames % refreshRate === 0) {
              _this2.emit('status', _this2.cntGames);
            }

            game = {};
          }

          if (_this2.cntGames >= cfg.cntGames) {
            lr.close();
            lr.end();
          } else {
            lr.resume();
          }
        };

        lr.on('error', function (err) {
          console.log(err);
          reject();
        });
        lr.on('line', function (line) {
          // pause emitting of lines...
          lr.pause();
          processLine(line);
        });
        lr.on('end', function () {
          console.log('Read entire file.');
          console.log(_this2.pieceTracker.pieces.w.Pe);
          resolve();
        });
      });
    }
  }, {
    key: "processGame",
    value: function processGame(game) {
      var moves = game.moves;

      for (var i = 0; i < moves.length; i += 1) {
        this.activePlayer = i % 2; // fetch move data into this.currentMove

        this.parseMove(moves[i]); // ___ PLACE ANALYZERS HERE ___

        this.pieceTracker.track(this.currentMove); // ___ END

        this.board.move(this.currentMove);
      }

      this.cntMoves += moves.length - 1; // don't count result (e.g. 1-0)

      this.cntGames += 1;
      this.board.reset();
    }
  }, {
    key: "reset",
    value: function reset() {
      this.board.reset();
      this.activePlayer = 0;
    }
    /**
     * Parses a move in string format to board coordinates. Wrapper function for
     *  the different move algorithms.
     * @param {string} rawMove The move to be parsed, e.g. 'Ne5+'.
     */

  }, {
    key: "parseMove",
    value: function parseMove(rawMove) {
      var token = rawMove.substring(0, 1);
      var move = GameProcessor.preProcess(rawMove);
      this.currentMove.reset();
      this.currentMove.san = rawMove;
      this.currentMove.player = this.activePlayer === 0 ? 'w' : 'b'; // game end on '1-0', '0-1' or '1/2-1/2' (check for digit as first char)

      if (token.match(/\d/) === null) {
        if (token.toLowerCase() === token) {
          this.pawnMove(move);
        } else if (token !== 'O') {
          this.pieceMove(move);
        } else {
          this.currentMove.castles = move;
        }
      }
    }
    /**
     * Returns the board coordinates for the move if it is a pawn move.
     * @param {string} moveSan The move to be parsed, e.g. 'e5'.
     */

  }, {
    key: "pawnMove",
    value: function pawnMove(moveSan) {
      var direction = -2 * (this.activePlayer % 2) + 1;
      var from = [];
      var to = [];
      var move = moveSan;
      var offset = 0; // takes

      if (move.includes('x')) {
        move = move.replace('x', '');
        to[0] = 8 - parseInt(move.substring(2, 3), 10);
        to[1] = files.indexOf(move.substring(1, 2));
        from[0] = to[0] + direction;
        from[1] = files.indexOf(move.substring(0, 1)); // en passant

        if (this.board.tiles[to[0]][to[1]] === null) {
          offset = this.currentMove.player === 'w' ? 1 : -1;
        }

        this.currentMove.takes.piece = this.board.tiles[to[0] + offset][to[1]].name;
        this.currentMove.takes.pos = [to[0] + offset, to[1]]; // moves
      } else {
        var tarRow = 8 - parseInt(move.substring(1, 2), 10);
        var tarCol = files.indexOf(move.substring(0, 1));
        from[1] = tarCol;
        to[0] = tarRow;
        to[1] = tarCol;

        for (var i = tarRow + direction; i < 8 && i >= 0; i += direction) {
          if (this.board.tiles[i][tarCol] !== null) {
            if (this.board.tiles[i][tarCol].name.includes('P')) {
              from[0] = i;
              break;
            }
          }
        }
      }

      this.currentMove.to = to;
      this.currentMove.from = from;
      this.currentMove.piece = this.board.tiles[from[0]][from[1]].name; // promotes

      if (move.includes('=')) {
        this.currentMove.promotesTo = move.substring(move.length - 1, move.length);
      }
    }
    /**
     * Returns the board coordinates for a piece (!= pawn) move.
     * @param {string} moveSan The move to be parsed, e.g. 'Be3'.
     * @returns {MoveData}
     */

  }, {
    key: "pieceMove",
    value: function pieceMove(moveSan) {
      var move = moveSan;
      var takes = false;
      var token = move.substring(0, 1); // remove token

      move = move.substring(1, move.length); // takes

      if (move.includes('x')) {
        takes = true;
        move = move.replace('x', '');
      } // e.g. Re3f5


      if (move.length === 4) {
        this.currentMove.from[0] = 8 - parseInt(move.substring(1, 2), 10);
        this.currentMove.from[1] = files.indexOf(move.substring(0, 1));
        this.currentMove.to[0] = 8 - parseInt(move.substring(3, 4), 10);
        this.currentMove.to[1] = files.indexOf(move.substring(2, 3)); // e.g. Ref3
      } else if (move.length === 3) {
        var tarRow = 8 - parseInt(move.substring(2, 3), 10);
        var tarCol = files.indexOf(move.substring(1, 2));
        var mustBeInRow = -1;
        var mustBeInCol = -1; // file is specified

        if (files.indexOf(move.substring(0, 1)) >= 0) {
          mustBeInCol = files.indexOf(move.substring(0, 1)); // rank is specified
        } else {
          mustBeInRow = 8 - parseInt(move.substring(0, 1), 10);
        }

        this.findPiece(tarRow, tarCol, mustBeInRow, mustBeInCol, token); // e.g. Rf3
      } else {
        var _tarRow = 8 - parseInt(move.substring(1, 2), 10);

        var _tarCol = files.indexOf(move.substring(0, 1));

        this.findPiece(_tarRow, _tarCol, -1, -1, token);
      }

      if (takes) {
        this.currentMove.takes.piece = this.board.tiles[this.currentMove.to[0]][this.currentMove.to[1]].name;
        this.currentMove.takes.pos = this.currentMove.to;
      }
    }
    /**
     * Wrapper function for different piece search algorithms.
     * @param {number} tarRow Target row for piece move.
     * @param {number} tarCol Target column for piece move.
     * @param {number} mustBeInRow Moving piece must be in this row. '-1' if unknown.
     * @param {number} mustBeInCol Moving piece must be in this column. '-1' if unknown.
     * @param {string} token Moving piece must be of this type, e.g 'R'.
     * @returns {Object}
     */

  }, {
    key: "findPiece",
    value: function findPiece(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
      var move;

      if (token === 'R') {
        move = this.findLine(tarRow, tarCol, mustBeInRow, mustBeInCol, token);
      } else if (token === 'B') {
        move = this.findDiag(tarRow, tarCol, mustBeInRow, mustBeInCol, token);
      } else if (token === 'Q' || token === 'K') {
        move = this.findDiag(tarRow, tarCol, mustBeInRow, mustBeInCol, token);

        if (move.from[0] === -1) {
          move = this.findLine(tarRow, tarCol, mustBeInRow, mustBeInCol, token);
        }
      } else if (token === 'N') {
        move = this.findKnight(tarRow, tarCol, mustBeInRow, mustBeInCol, token);
      }

      if (move.from[0] === -1) {
        console.log("Error: no piece for move ".concat(token, " to (").concat(tarRow, ",").concat(tarCol, ") found!"));
        console.log(this.cntGames);
        console.log(this.currentMove);
        this.board.printPosition();
      }

      this.currentMove.from = move.from;
      this.currentMove.to = move.to;
      this.currentMove.piece = this.board.tiles[move.from[0]][move.from[1]].name;
    }
    /**
     * Search algorithm to find a piece that can move diagonally.
     * @param {number} tarRow Target row for piece move.
     * @param {number} tarCol Target column for piece move.
     * @param {number} mustBeInRow Moving piece must be in this row. '-1' if unknown.
     * @param {number} mustBeInCol Moving piece must be in this column. '-1' if unknown.
     * @param {string} token Moving piece must be of this type, e.g 'R'.
     * @returns {Object}
     */

  }, {
    key: "findDiag",
    value: function findDiag(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
      var color = this.currentMove.player;
      var from = [];
      var to = [];
      from[0] = -1;
      from[1] = -1;
      to[0] = tarRow;
      to[1] = tarCol;

      for (var i = -1; i <= 1; i += 2) {
        var obstructed1 = false;
        var obstructed2 = false;

        for (var j = 1; j < 8; j += 1) {
          var row1 = to[0] + i * j;
          var col1 = to[1] + j;
          var row2 = to[0] - i * j;
          var col2 = to[1] - j;

          if (row1 >= 0 && row1 < 8 && col1 >= 0 && col1 < 8 && !obstructed1 && this.board.tiles[row1][col1] !== null) {
            var piece = this.board.tiles[row1][col1];

            if (piece.name.includes(token) && piece.color === color && (mustBeInRow === -1 || row1 === mustBeInRow) && (mustBeInCol === -1 || col1 === mustBeInCol)) {
              if (!this.checkCheck([row1, col1], [to[0], to[1]])) {
                from[0] = row1;
                from[1] = col1;
                return {
                  from: from,
                  to: to
                };
              }
            } else {
              obstructed1 = true;
            }
          }

          if (row2 >= 0 && row2 < 8 && col2 >= 0 && col2 < 8 && !obstructed2 && this.board.tiles[row2][col2] !== null) {
            var _piece = this.board.tiles[row2][col2];

            if (_piece.name.includes(token) && _piece.color === color && (mustBeInRow === -1 || row2 === mustBeInRow) && (mustBeInCol === -1 || col2 === mustBeInCol)) {
              if (!this.checkCheck([row2, col2], [to[0], to[1]])) {
                from[0] = row2;
                from[1] = col2;
                return {
                  from: from,
                  to: to
                };
              }
            } else {
              obstructed2 = true;
            }
          }
        }
      }

      return {
        from: from,
        to: to
      };
    }
    /**
     * Search algorithm to find a piece that can move vertically/horizontally.
     * @param {number} tarRow Target row for piece move.
     * @param {number} tarCol Target column for piece move.
     * @param {number} mustBeInRow Moving piece must be in this row. '-1' if unknown.
     * @param {number} mustBeInCol Moving piece must be in this column. '-1' if unknown.
     * @param {string} token Moving piece must be of this type, e.g 'R'.
     * @returns {Object}
     */

  }, {
    key: "findLine",
    value: function findLine(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
      var color = this.currentMove.player;
      var from = [];
      var to = [];
      from[0] = -1;
      from[1] = -1;
      to[0] = tarRow;
      to[1] = tarCol;

      for (var i = -1; i <= 1; i += 2) {
        var obstructed1 = false;
        var obstructed2 = false;

        for (var j = 1; j < 8; j += 1) {
          var row1 = to[0];
          var col1 = to[1] - i * j;
          var row2 = to[0] - i * j;
          var col2 = to[1];

          if (row1 >= 0 && row1 < 8 && col1 >= 0 && col1 < 8 && !obstructed1 && this.board.tiles[row1][col1] !== null) {
            var piece = this.board.tiles[row1][col1];

            if (piece.name.includes(token) && piece.color === color && (mustBeInRow === -1 || row1 === mustBeInRow) && (mustBeInCol === -1 || col1 === mustBeInCol)) {
              if (!this.checkCheck([row1, col1], [to[0], to[1]])) {
                from[0] = row1;
                from[1] = col1;
                return {
                  from: from,
                  to: to
                };
              }
            } else {
              obstructed1 = true;
            }
          }

          if (row2 >= 0 && row2 < 8 && col2 >= 0 && col2 < 8 && !obstructed2 && this.board.tiles[row2][col2] !== null) {
            var _piece2 = this.board.tiles[row2][col2];

            if (_piece2.name.includes(token) && _piece2.color === color && (mustBeInRow === -1 || row2 === mustBeInRow) && (mustBeInCol === -1 || col2 === mustBeInCol)) {
              if (!this.checkCheck([row2, col2], [to[0], to[1]])) {
                from[0] = row2;
                from[1] = col2;
                return {
                  from: from,
                  to: to
                };
              }
            } else {
              obstructed2 = true;
            }
          }
        }
      }

      return {
        from: from,
        to: to
      };
    }
    /**
     * Search algorithm to find a matching knight.
     * @param {number} tarRow Target row for piece move.
     * @param {number} tarCol Target column for piece move.
     * @param {number} mustBeInRow Moving piece must be in this row. '-1' if unknown.
     * @param {number} mustBeInCol Moving piece must be in this column. '-1' if unknown.
     * @param {string} token Moving piece must be of this type, e.g 'R'.
     * @returns {Object}
     */

  }, {
    key: "findKnight",
    value: function findKnight(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
      var color = this.currentMove.player;
      var from = [];
      var to = [];
      from[0] = -1;
      from[1] = -1;
      to[0] = tarRow;
      to[1] = tarCol;

      for (var i = -2; i <= 2; i += 4) {
        for (var j = -1; j <= 1; j += 2) {
          var row1 = to[0] + i;
          var col1 = to[1] + j;
          var row2 = to[0] + j;
          var col2 = to[1] + i;

          if (row1 >= 0 && row1 < 8 && col1 >= 0 && col1 < 8 && this.board.tiles[row1][col1] !== null) {
            var piece = this.board.tiles[row1][col1];

            if (piece.name.includes(token) && piece.color === color && (mustBeInRow === -1 || row1 === mustBeInRow) && (mustBeInCol === -1 || col1 === mustBeInCol)) {
              if (!this.checkCheck([row1, col1], [to[0], to[1]])) {
                from[0] = row1;
                from[1] = col1;
                return {
                  from: from,
                  to: to
                };
              }
            }
          }

          if (row2 >= 0 && row2 < 8 && col2 >= 0 && col2 < 8 && this.board.tiles[row2][col2] !== null) {
            var _piece3 = this.board.tiles[row2][col2];

            if (_piece3.name.includes(token) && _piece3.color === color && (mustBeInRow === -1 || row2 === mustBeInRow) && (mustBeInCol === -1 || col2 === mustBeInCol)) {
              if (!this.checkCheck([row2, col2], [to[0], to[1]])) {
                from[0] = row2;
                from[1] = col2;
                return {
                  from: from,
                  to: to
                };
              }
            }
          }
        }
      }

      return {
        from: from,
        to: to
      };
    }
    /**
     * Checks if the input move would be resulting with the king being in check.
     * @param {Number[]} from Coordinates of the source tile of the move that shall be checked.
     *  @param {Number[]} to Coordinates of the target tile of the move that shall be checked.
     * @returns {boolean} After the move, the king will be in check true/false.
     */

  }, {
    key: "checkCheck",
    value: function checkCheck(from, to) {
      var color = this.currentMove.player;
      var opColor = this.currentMove.player === 'w' ? 'b' : 'w';
      var king = this.board.kingPos[color];
      var isInCheck = false; // if king move, no check is possible, exit function

      if (king[0] === from[0] && king[1] === from[1]) return false; // check if moving piece is on same line/diag as king, else exit

      var diff = [];
      diff[0] = from[0] - king[0];
      diff[1] = from[1] - king[1];
      var checkFor = [];

      if (diff[0] === 0 || diff[1] === 0) {
        checkFor[0] = 'Q';
        checkFor[1] = 'R';
      } else if (Math.abs(diff[0]) === Math.abs(diff[1])) {
        checkFor[0] = 'Q';
        checkFor[1] = 'B';
      } else {
        return false;
      }

      if (diff[0] !== 0) diff[0] /= Math.abs(diff[0]);
      if (diff[1] !== 0) diff[1] /= Math.abs(diff[1]);
      var srcTilePiece = this.board.tiles[from[0]][from[1]];
      var tarTilePiece = this.board.tiles[to[0]][to[1]]; // premove and check if check

      this.board.tiles[from[0]][from[1]] = null;
      this.board.tiles[to[0]][to[1]] = srcTilePiece; // check for check

      var obstructed = false;

      for (var j = 1; j < 8 && !isInCheck && !obstructed; j += 1) {
        var row = king[0] + j * diff[0];
        var col = king[1] + j * diff[1];

        if (row >= 0 && row < 8 && col >= 0 && col < 8 && this.board.tiles[row][col] !== null) {
          var piece = this.board.tiles[row][col];

          if ((piece.name.includes(checkFor[0]) || piece.name.includes(checkFor[1])) && piece.color === opColor) {
            isInCheck = true;
          } else {
            obstructed = true;
          }
        }
      }

      this.board.tiles[from[0]][from[1]] = srcTilePiece;
      this.board.tiles[to[0]][to[1]] = tarTilePiece;
      return isInCheck;
    }
  }], [{
    key: "checkConfig",
    value: function checkConfig(config) {
      var cfg = {};
      cfg.hasFilter = Object.prototype.hasOwnProperty.call(config, 'filter');
      cfg.filter = cfg.hasFilter ? config.filter : function () {
        return true;
      };
      cfg.cntGames = Object.prototype.hasOwnProperty.call(config, 'cntGames') ? config.cntGames : Infinity;
      cfg.stats = Object.prototype.hasOwnProperty.call(config, 'stats') ? config.stats : {}; // TODO: currently without function

      cfg.split = Object.prototype.hasOwnProperty.call(config, 'split') ? config.split : false;
      return cfg;
    }
  }, {
    key: "algebraicToCoords",
    value: function algebraicToCoords(square) {
      var coords = [];
      var temp = square.split('');
      coords.push(8 - temp[1]);
      coords.push(files.indexOf(temp[0]));
      return coords;
    }
  }, {
    key: "coordsToAlgebraic",
    value: function coordsToAlgebraic(coords) {
      var name = files[coords[1]];
      name += 8 - coords[0];
      return name;
    }
    /**
     * Removes special characters like '#', '+', '?' and '!'
     * @param {string} move The move to be cleaned up
     * @returns {string} The input string with removed special characters
     */

  }, {
    key: "preProcess",
    value: function preProcess(move) {
      return move.replace(/#|\+|\?|!/g, '');
    }
  }]);

  return GameProcessor;
}(EventEmitter);

var _default = GameProcessor;
exports.default = _default;
module.exports = exports["default"];

/***/ }),

/***/ "./src/MoveData.js":
/*!*************************!*\
  !*** ./src/MoveData.js ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var MoveData =
/*#__PURE__*/
function () {
  function MoveData() {
    _classCallCheck(this, MoveData);

    this.san = '';
    this.player = '';
    this.piece = '';
    this.castles = '';
    this.takes = {};
    this.promotesTo = '';
    this.from = [-1, -1];
    this.to = [-1, -1];
  }

  _createClass(MoveData, [{
    key: "reset",
    value: function reset() {
      this.san = '';
      this.player = '';
      this.piece = '';
      this.castles = '';
      this.takes = {};
      this.promotesTo = '';
      this.from = [-1, -1];
      this.to = [-1, -1];
    }
  }]);

  return MoveData;
}();

var _default = MoveData;
exports.default = _default;
module.exports = exports["default"];

/***/ }),

/***/ "./src/PieceTracker.js":
/*!*****************************!*\
  !*** ./src/PieceTracker.js ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
var pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

var PieceTracker =
/*#__PURE__*/
function () {
  function PieceTracker() {
    _classCallCheck(this, PieceTracker);

    this.pieces = {
      b: {},
      w: {}
    };

    for (var i = 0; i < 8; i += 1) {
      this.pieces.b[pawnTemplate[i]] = {};
      this.pieces.b[pieceTemplate[i]] = {};
      this.pieces.w[pawnTemplate[i]] = {};
      this.pieces.w[pieceTemplate[i]] = {};

      for (var j = 0; j < 8; j += 1) {
        this.pieces.w[pawnTemplate[i]][pawnTemplate[j]] = {
          took: 0
        };
        this.pieces.w[pawnTemplate[i]][pieceTemplate[j]] = {
          took: 0
        };
        this.pieces.w[pieceTemplate[i]][pawnTemplate[j]] = {
          took: 0
        };
        this.pieces.w[pieceTemplate[i]][pieceTemplate[j]] = {
          took: 0
        };
        this.pieces.b[pawnTemplate[i]][pawnTemplate[j]] = {
          took: 0
        };
        this.pieces.b[pawnTemplate[i]][pieceTemplate[j]] = {
          took: 0
        };
        this.pieces.b[pieceTemplate[i]][pawnTemplate[j]] = {
          took: 0
        };
        this.pieces.b[pieceTemplate[i]][pieceTemplate[j]] = {
          took: 0
        };
      }
    }
  }

  _createClass(PieceTracker, [{
    key: "track",
    value: function track(moveData) {
      var player = moveData.player;
      var piece = moveData.piece;
      var takes = moveData.takes;

      if ('piece' in takes) {
        if (piece.length > 1 && takes.piece.length > 1) {
          this.pieces[player][piece][takes.piece].took += 1;
        }
      }
    }
  }]);

  return PieceTracker;
}();

var _default = PieceTracker;
exports.default = _default;
module.exports = exports["default"];

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _Chessalyzer = _interopRequireDefault(__webpack_require__(/*! ./Chessalyzer */ "./src/Chessalyzer.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable */
var _default = _Chessalyzer.default;
exports.default = _default;
module.exports = exports["default"];

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),

/***/ "line-by-line":
/*!*******************************!*\
  !*** external "line-by-line" ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("line-by-line");

/***/ }),

/***/ "perf_hooks":
/*!*****************************!*\
  !*** external "perf_hooks" ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("perf_hooks");

/***/ })

/******/ });
});
//# sourceMappingURL=chessalyzer.js.map