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
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/core/Processor.worker.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/core/ChessBoard.js":
/*!********************************!*\
  !*** ./src/core/ChessBoard.js ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (global, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var mod; }
})(this, function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
  const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

  class ChessPiece {
    constructor(name, color) {
      this.name = name;
      this.color = color;
    }

  }

  class ChessBoard {
    constructor() {
      this.tiles = new Array(8);

      for (let row = 0; row < 8; row += 1) {
        const currRow = new Array(8);

        for (let col = 0; col < 8; col += 1) {
          currRow[col] = null;
          const color = row === 0 || row === 1 ? 'b' : 'w'; // init pieces

          if (row === 0 || row === 7) {
            currRow[col] = new ChessPiece(pieceTemplate[col], color);
          } else if (row === 1 || row === 6) {
            currRow[col] = new ChessPiece(pawnTemplate[col], color);
          }
        }

        this.tiles[row] = currRow;
      }

      this.defaultTiles = this.tiles.map(arr => arr.slice());
      this.kingPos = {
        w: [7, 4],
        b: [0, 4]
      };
    }

    move(moveData) {
      const {
        from
      } = moveData;
      const {
        to
      } = moveData; // castles

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
          this.tiles[to[0]][to[1]] = new ChessPiece(moveData.promotesTo, moveData.player);
        }

        if (moveData.san.substring(0, 1) === 'K') {
          this.kingPos[moveData.player] = to;
        }
      }
    }

    castle(move, player) {
      const row = player === 'w' ? 7 : 0;
      const scrKingCol = 4;
      let tarKingCol = 6;
      let srcRookCol = 7;
      let tarRookCol = 5;

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

    reset() {
      this.tiles = this.defaultTiles.map(arr => arr.slice());
      this.kingPos = {
        w: [7, 4],
        b: [0, 4]
      };
    }
    /** Prints the current board position to the console. */


    printPosition() {
      for (let row = 0; row < 8; row += 1) {
        const rowArray = [];

        for (let col = 0; col < 8; col += 1) {
          const piece = this.tiles[row][col];

          if (piece !== null) {
            rowArray.push(piece.color + piece.name);
          } else {
            rowArray.push('...');
          }
        }

        console.log(rowArray);
      }
    }

  }

  var _default = ChessBoard;
  _exports.default = _default;
  module.exports = exports.default;
});

/***/ }),

/***/ "./src/core/Chessalyzer.js":
/*!*********************************!*\
  !*** ./src/core/Chessalyzer.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (global, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports, __webpack_require__(/*! ./GameProcessor */ "./src/core/GameProcessor.js"), __webpack_require__(/*! ../tracker/PieceTracker */ "./src/tracker/PieceTracker.js"), __webpack_require__(/*! ../tracker/TileTracker */ "./src/tracker/TileTracker.js"), __webpack_require__(/*! ../tracker/GameTracker */ "./src/tracker/GameTracker.js"), __webpack_require__(/*! ../tracker/BaseTracker */ "./src/tracker/BaseTracker.js")], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var mod; }
})(this, function (_exports, _GameProcessor, _PieceTracker, _TileTracker, _GameTracker, _BaseTracker) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _GameProcessor = _interopRequireDefault(_GameProcessor);
  _PieceTracker = _interopRequireDefault(_PieceTracker);
  _TileTracker = _interopRequireDefault(_TileTracker);
  _GameTracker = _interopRequireDefault(_GameTracker);
  _BaseTracker = _interopRequireDefault(_BaseTracker);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  const {
    performance
  } = __webpack_require__(/*! perf_hooks */ "perf_hooks");

  const fs = __webpack_require__(/*! fs */ "fs");

  const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
  const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];
  /** Main class for batch processing and generating heat maps */

  class Chessalyzer {
    /**
     * Starts the singlethreaded batch processing for the selected file
     * @param {String} path - Path to the PGN file that should be analyzed
     * @param {(Object|Object[])} analyzer - The analysis functions that shall be run
     *  during batch processing. Can be one single analyzer or an array of analyzers.
     * @param {Object} [cfg = {}]
     * @param {Function} [cfg.filter = ()=>true] - Filter function for selecting games
     * @param {Number} [cfg.cntGames = Infinite ] - Max amount of games to process
     * @param {Object} callback - Callback object
     * @param {Function} [callback.fun] - Callback function that is called every callback.rate games
     * @param {Number} [callback.rate] - Every 'rate' games the callback function is called.
     * @returns {Promise}
     */
    static async startBatch(path, analyzer, cfg = {}, callback = {
      fun: () => {},
      rate: 250
    }) {
      // check if single analyzer or array is passed
      let analyzerArray = analyzer;

      if (!Array.isArray(analyzerArray)) {
        analyzerArray = [analyzer];
      }

      const gameProcessor = new _GameProcessor.default(); // callback handler

      gameProcessor.on('status', gameCnt => {
        callback.fun(gameCnt);
      });
      const t0 = performance.now();
      const header = await gameProcessor.processPGN(path, cfg, analyzerArray, callback.rate);
      const t1 = performance.now();
      const tdiff = Math.round(t1 - t0) / 1000;
      const mps = Math.round(header.cntMoves / tdiff);
      console.log(`${header.cntGames} games (${header.cntMoves} moves) processed in ${tdiff}s (${mps} moves/s)`);
      return header;
    }
    /**
     * Starts the multithreaded batch processing for the selected file
     * @param {String} path - Path to the PGN file that should be analyzed
     * @param {(Object|Object[])} analyzer - The analysis functions that shall be run
     *  during batch processing. Can be one single analyzer or an array of analyzers.
     * @param {Numer} [nCores = -1] Numbers of threads to use. Is limited to the max. amount
     *  of threads of the running machine.
     * @param {Function} [cfg.filter = ()=>true] - Filter function for selecting games
     * @param {Number} [cfg.cntGames = Infinite ] - Max amount of games to process
     * @returns {Promise}
     */


    static async startBatchMultiCore(path, analyzer, cfg = {}, batchSize = 6000, nThreads = 2) {
      // check if single analyzer or array is passed
      let analyzerArray = analyzer;

      if (!Array.isArray(analyzerArray)) {
        analyzerArray = [analyzer];
      }

      const t0 = performance.now();
      const header = await _GameProcessor.default.processPGNMultiCore(path, cfg, analyzerArray, batchSize, nThreads);
      const t1 = performance.now();
      const tdiff = Math.round(t1 - t0) / 1000;
      const mps = Math.round(header.cntMoves / tdiff);
      console.log(`${header.cntGames} games (${header.cntMoves} moves) processed in ${tdiff}s (${mps} moves/s)`);
      return header;
    }
    /**
     * Saves a completed batch run to a JSON file
     * @param {String} path - Path the data file shall be saved to
     * @param {Object} data - The data that shall be saved
     */


    static saveData(path, data) {
      fs.writeFile(path, JSON.stringify(data), err => {
        if (err) {
          console.error(err);
          return;
        }

        console.log('File has been created.');
      });
    }
    /**
     * Loads the stats of a previous batch run (JSON) to a data bank
     * @param {String} path - Path the data file shall be loaded from
     * @returns {Object} Returns the loaded data
     */


    static loadData(path) {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      console.log(`File '${path}' has been loaded.`);
      return data;
    }
    /**
     * Generates a heatmap out of the tracked data.
     * @param {Object} data - Where the data shall be taken from
     * @param {(String|Array)} square - The square the data shall be generated for.
     * For example, if you wanted to know how often a specific piece was on a specific tile,
     * you would pass the identifier of the tile to the function, e.g. "a2" or [7,1].
     * @param {Function} fun - The evaluation function that generates the heatmap out of the
     * data.
     * See ./src/exampleHeatmapConfig for examples of such a function.
     * @param {} optData - Optional data you may need in your eval function
     * @returns {Array} Array with 3 entries:
     * <ol>
     * <li>8x8 Array containing the heat map values for each tile</li>
     * <li>The minimum value in the heatmap.</li>
     * <li>The maximum value in the heatmap.</li>
     * </ol>
     */


    static generateHeatmap(data, square, fun, optData) {
      let sqrCoords;
      let sqrAlg; // square input type 'a2'

      if (typeof square === 'string') {
        sqrCoords = _GameProcessor.default.algebraicToCoords(square);
        sqrAlg = square; // input type [6,0]
      } else {
        sqrCoords = square;
        sqrAlg = _GameProcessor.default.coordsToAlgebraic(square);
      }

      const startingPiece = Chessalyzer.getStartingPiece(sqrCoords);
      const sqrData = {
        alg: sqrAlg,
        coords: sqrCoords,
        piece: startingPiece
      };
      const map = [];
      let max = 0;
      let min = 1000000;

      for (let i = 0; i < 8; i += 1) {
        const dataRow = new Array(8);

        for (let j = 0; j < 8; j += 1) {
          const loopSqrCoords = [i, j];

          const loopSqrAlg = _GameProcessor.default.coordsToAlgebraic(loopSqrCoords);

          const loopPiece = Chessalyzer.getStartingPiece(loopSqrCoords);
          const loopSqrData = {
            alg: loopSqrAlg,
            coords: loopSqrCoords,
            piece: loopPiece
          };
          dataRow[j] = fun(data, sqrData, loopSqrData, optData);
          if (dataRow[j] > max) max = dataRow[j];
          if (dataRow[j] < min) min = dataRow[j];
        }

        map.push(dataRow);
      }

      return [map, min, max];
    }
    /**
     * Generates a comparison heatmap out of the tracked data. There needs to data in both
     * banks you pass as bank1 and bank2 params. The heatmap for both banks is calculated
     * and then the relative differences between both banks are calculated. For example,
     * if the heatmap value for "a1" of bank1 is 10 and the value of bank2 is 5, the returned
     * value for "a1" would be 100% ([[10/5] -1] *100).
     * @param {Object} data1 - Dataset 1
     * @param {Object} data2 - Dataset 2
     * @param {(String|Array)} square - The square the data shall be generated for. Notation
     * can be 'a1' or [7,0].
     * @param {Function} fun - The evaluation function that generates the heatmap out of the
     * saved data. See {@link generateHeatmap} for a more detailed description.
     * @param {} optData - Optional data you may need in your eval function
     * @returns {Array} Array with 3 entries:
     * <ol>
     * <li>8x8 Array containing the heat map values for each tile</li>
     * <li>The minimum value in the heatmap.</li>
     * <li>The maximum value in the heatmap.</li>
     * </ol>
     */


    static generateComparisonHeatmap(data1, data2, square, fun, optData) {
      const map = [];
      let max = 0;
      let min = 100000; // comparison heatmap

      const map0 = Chessalyzer.generateHeatmap(data1, square, fun, optData);
      const map1 = Chessalyzer.generateHeatmap(data2, square, fun, optData);

      for (let i = 0; i < 8; i += 1) {
        const dataRow = new Array(8);

        for (let j = 0; j < 8; j += 1) {
          const a = map0[0][i][j];
          const b = map1[0][i][j];
          if (a === 0 || b === 0) dataRow[j] = 0;else dataRow[j] = (a >= b ? a / b - 1 : -b / a + 1) * 100;
          if (dataRow[j] > max) max = dataRow[j];
          if (dataRow[j] < min) min = dataRow[j];
        }

        map.push(dataRow);
      }

      return [map, min, max];
    }

    static getStartingPiece(sqr) {
      let color = '';
      let name = '';

      if (sqr[0] === 0) {
        color = 'b';
        name = pieceTemplate[sqr[1]];
      } else if (sqr[0] === 1) {
        color = 'b';
        name = pawnTemplate[sqr[1]];
      } else if (sqr[0] === 6) {
        color = 'w';
        name = pawnTemplate[sqr[1]];
      } else if (sqr[0] === 7) {
        color = 'w';
        name = pieceTemplate[sqr[1]];
      }

      return {
        color,
        name
      };
    }

  }

  Chessalyzer.Tracker = {
    Game: _GameTracker.default,
    Piece: _PieceTracker.default,
    Tile: _TileTracker.default,
    Base: _BaseTracker.default
  };
  var _default = Chessalyzer;
  _exports.default = _default;
  module.exports = exports.default;
});

/***/ }),

/***/ "./src/core/GameProcessor.js":
/*!***********************************!*\
  !*** ./src/core/GameProcessor.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (global, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports, __webpack_require__(/*! ./ChessBoard */ "./src/core/ChessBoard.js")], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var mod; }
})(this, function (_exports, _ChessBoard) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _ChessBoard = _interopRequireDefault(_ChessBoard);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  /* eslint-disable no-inner-declarations */
  const LineByLineReader = __webpack_require__(/*! line-by-line */ "line-by-line");

  const EventEmitter = __webpack_require__(/*! events */ "events");

  const files = 'abcdefgh';

  const cluster = __webpack_require__(/*! cluster */ "cluster"); // const numCPUs = require('os').cpus().length;


  class MoveData {
    constructor() {
      this.san = '';
      this.player = '';
      this.piece = '';
      this.castles = '';
      this.takes = {};
      this.promotesTo = '';
      this.from = [-1, -1];
      this.to = [-1, -1];
    }

  }
  /**
   * Class that processes games.
   */


  class GameProcessor extends EventEmitter {
    constructor() {
      super();
      this.board = new _ChessBoard.default();
      this.currentMove = new MoveData();
      this.activePlayer = 0;
      this.cntMoves = 0;
      this.cntGames = 0;
      this.gameAnalyzers = [];
      this.moveAnalyzers = [];
    }

    static checkConfig(config) {
      const cfg = {};
      cfg.hasFilter = Object.prototype.hasOwnProperty.call(config, 'filter');
      cfg.filter = cfg.hasFilter ? config.filter : () => true;
      cfg.cntGames = Object.prototype.hasOwnProperty.call(config, 'cntGames') ? config.cntGames : Infinity;
      return cfg;
    }

    attachAnalyzers(analyzers) {
      analyzers.forEach(a => {
        if (a.type === 'move') {
          this.moveAnalyzers.push(a);
        } else if (a.type === 'game') {
          this.gameAnalyzers.push(a);
        }
      });
    }

    static processPGNMultiCore(path, config, analyzer, batchSize, nThreads) {
      return new Promise(resolve => {
        let cntGameAnalyzer = 0;
        const gameAnalyzerStore = [];
        const moveAnalyzerStore = [];
        let cntGames = 0;
        let cntMoves = 0;
        let readerFinished = false;
        cluster.setupMaster({
          exec: './lib/worker.js' // exec: './Processor.worker.js'

        });
        analyzer.forEach(a => {
          if (a.type === 'game') {
            cntGameAnalyzer += 1;
            gameAnalyzerStore.push(a);
          } else if (a.type === 'move') {
            moveAnalyzerStore.push(a);
          }
        });

        function checkAllWorkersFinished() {
          if (Object.keys(cluster.workers).length === 0 && readerFinished) {
            resolve({
              cntGames,
              cntMoves
            });
          }
        }

        function addTrackerData(gameTracker, moveTracker, nMoves) {
          for (let i = 0; i < gameAnalyzerStore.length; i += 1) {
            gameAnalyzerStore[i].add(gameTracker[i]);
          }

          for (let i = 0; i < moveAnalyzerStore.length; i += 1) {
            moveAnalyzerStore[i].add(moveTracker[i]);
          }

          cntMoves += nMoves;
        }

        function forkWorker(games) {
          const w = cluster.fork();
          w.send({
            games,
            path: 'C:/Users/yanni/Documents/GitHub/chessalyzer.js/test/CustomTracker.js'
          }); // on worker finish

          w.on('message', msg => {
            addTrackerData(msg.gameAnalyzers, msg.moveAnalyzers, msg.cntMoves);
            w.kill(); // if all workers finished, resolve promise

            checkAllWorkersFinished();
          });
        }

        const cfg = GameProcessor.checkConfig(config);
        let games = [];
        let game = {};
        const lr = new LineByLineReader(path, {
          skipEmptyLines: true
        });
        lr.on('error', err => {
          console.log(err);
        });
        lr.on('line', line => {
          lr.pause(); // data tag

          if (line.startsWith('[') && (cfg.hasFilter || cntGameAnalyzer > 0)) {
            const key = line.match(/\[(.*?)\s/)[1];
            const value = line.match(/"(.*?)"/)[1];
            game[key] = value; // moves
          } else if (line.startsWith('1')) {
            game.moves = line.replace(/\{(.*?)\}\s/g, '').replace(/\d+\.+\s/g, '').replace(' *', '').split(' ');

            if (cfg.filter(game) || !cfg.hasFilter) {
              cntGames += 1;
              games.push(game);

              if (cntGames % (batchSize * nThreads) === 0) {
                for (let i = 0; i < nThreads; i += 1) {
                  forkWorker(games.slice(i * batchSize, i * batchSize + batchSize));
                }

                games = [];
              }
            }

            game = {};
          }

          if (cntGames >= cfg.cntGames) {
            lr.close();
            lr.end();
          } else {
            lr.resume();
          }
        });
        lr.on('end', () => {
          if (games.length > 0) {
            if (games.length > batchSize) {
              const nEndForks = Math.ceil(games.length / batchSize);

              for (let i = 0; i < nEndForks; i += 1) {
                forkWorker(games.slice(i * batchSize, i * batchSize + batchSize));
              }
            } else {
              forkWorker(games);
            }
          }

          readerFinished = true;
          checkAllWorkersFinished();
        });
      });
    }

    processPGN(path, config, analyzers, refreshRate) {
      const cfg = GameProcessor.checkConfig(config);
      this.attachAnalyzers(analyzers);
      const cntGameAnalyers = this.gameAnalyzers.length;
      return new Promise((resolve, reject) => {
        const lr = new LineByLineReader(path, {
          skipEmptyLines: true
        });
        let game = {}; // process current line

        const processLine = line => {
          // data tag
          if (line.startsWith('[') && (cfg.hasFilter || cntGameAnalyers > 0)) {
            const key = line.match(/\[(.*?)\s/)[1];
            const value = line.match(/"(.*?)"/)[1];
            game[key] = value; // moves
          } else if (line.startsWith('1')) {
            game.moves = line.replace(/\{(.*?)\}\s/g, '').replace(/\d+\.+\s/g, '').replace(' *', '').split(' ');

            if (cfg.filter(game) || !cfg.hasFilter) {
              this.processGame(game);
            } // emit event


            if (this.cntGames % refreshRate === 0) {
              this.emit('status', this.cntGames);
            }

            game = {};
          }

          if (this.cntGames >= cfg.cntGames) {
            lr.close();
            lr.end();
          } else {
            lr.resume();
          }
        };

        lr.on('error', err => {
          console.log(err);
          reject();
        });
        lr.on('line', line => {
          // pause emitting of lines...
          lr.pause();
          processLine(line);
        });
        lr.on('end', () => {
          console.log('Read entire file.');
          resolve({
            cntGames: this.cntGames,
            cntMoves: this.cntMoves
          });
        });
      });
    }

    processGame(game) {
      const {
        moves
      } = game;

      for (let i = 0; i < moves.length; i += 1) {
        this.activePlayer = i % 2; // fetch move data into this.currentMove

        this.parseMove(moves[i]); // move based analyzers

        this.moveAnalyzers.forEach(a => {
          a.analyze(this.currentMove);
        });
        this.board.move(this.currentMove);
      }

      this.cntMoves += moves.length - 1; // don't count result (e.g. 1-0)

      this.cntGames += 1;
      this.board.reset(); // game based analyzers

      this.gameAnalyzers.forEach(a => {
        a.analyze(game);
      });
    }

    reset() {
      this.board.reset();
      this.activePlayer = 0;
    }
    /**
     * Parses a move in string format to board coordinates. Wrapper function for
     * the different move algorithms.
     * @param {string} rawMove The move to be parsed, e.g. 'Ne5+'.
     */


    parseMove(rawMove) {
      const token = rawMove.substring(0, 1);
      const move = GameProcessor.preProcess(rawMove);
      this.currentMove = new MoveData();
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


    pawnMove(moveSan) {
      const direction = -2 * (this.activePlayer % 2) + 1;
      const from = [];
      const to = [];
      let move = moveSan;
      let offset = 0; // takes

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
        const tarRow = 8 - parseInt(move.substring(1, 2), 10);
        const tarCol = files.indexOf(move.substring(0, 1));
        from[1] = tarCol;
        to[0] = tarRow;
        to[1] = tarCol;

        for (let i = tarRow + direction; i < 8 && i >= 0; i += direction) {
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
     */


    pieceMove(moveSan) {
      let move = moveSan;
      let takes = false;
      let coords = {
        from: [],
        to: []
      };
      const token = move.substring(0, 1); // remove token

      move = move.substring(1, move.length); // takes

      if (move.includes('x')) {
        takes = true;
        move = move.replace('x', '');
      } // e.g. Re3f5


      if (move.length === 4) {
        coords.from[0] = 8 - parseInt(move.substring(1, 2), 10);
        coords.from[1] = files.indexOf(move.substring(0, 1));
        coords.to[0] = 8 - parseInt(move.substring(3, 4), 10);
        coords.to[1] = files.indexOf(move.substring(2, 3)); // e.g. Ref3
      } else if (move.length === 3) {
        const tarRow = 8 - parseInt(move.substring(2, 3), 10);
        const tarCol = files.indexOf(move.substring(1, 2));
        let mustBeInRow = -1;
        let mustBeInCol = -1; // file is specified

        if (files.indexOf(move.substring(0, 1)) >= 0) {
          mustBeInCol = files.indexOf(move.substring(0, 1)); // rank is specified
        } else {
          mustBeInRow = 8 - parseInt(move.substring(0, 1), 10);
        }

        coords = this.findPiece(tarRow, tarCol, mustBeInRow, mustBeInCol, token); // e.g. Rf3
      } else {
        const tarRow = 8 - parseInt(move.substring(1, 2), 10);
        const tarCol = files.indexOf(move.substring(0, 1));
        coords = this.findPiece(tarRow, tarCol, -1, -1, token);
      } // set move data


      this.currentMove.from = coords.from;
      this.currentMove.to = coords.to;
      this.currentMove.piece = this.board.tiles[coords.from[0]][coords.from[1]].name;

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


    findPiece(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
      let move;

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
        console.log(`Error: no piece for move ${token} to (${tarRow},${tarCol}) found!`);
        console.log(this.cntGames);
        console.log(this.currentMove);
        this.board.printPosition();
      }

      return move;
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


    findDiag(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
      const color = this.currentMove.player;
      const from = [];
      const to = [];
      from[0] = -1;
      from[1] = -1;
      to[0] = tarRow;
      to[1] = tarCol;

      for (let i = -1; i <= 1; i += 2) {
        let obstructed1 = false;
        let obstructed2 = false;

        for (let j = 1; j < 8; j += 1) {
          const row1 = to[0] + i * j;
          const col1 = to[1] + j;
          const row2 = to[0] - i * j;
          const col2 = to[1] - j;

          if (!obstructed1 && row1 >= 0 && row1 < 8 && col1 >= 0 && col1 < 8 && this.board.tiles[row1][col1] !== null) {
            const piece = this.board.tiles[row1][col1];

            if (piece.name.includes(token) && piece.color === color && (mustBeInRow === -1 || row1 === mustBeInRow) && (mustBeInCol === -1 || col1 === mustBeInCol)) {
              if (!this.checkCheck([row1, col1], [to[0], to[1]])) {
                from[0] = row1;
                from[1] = col1;
                return {
                  from,
                  to
                };
              }
            } else {
              obstructed1 = true;
            }
          }

          if (!obstructed2 && row2 >= 0 && row2 < 8 && col2 >= 0 && col2 < 8 && this.board.tiles[row2][col2] !== null) {
            const piece = this.board.tiles[row2][col2];

            if (piece.name.includes(token) && piece.color === color && (mustBeInRow === -1 || row2 === mustBeInRow) && (mustBeInCol === -1 || col2 === mustBeInCol)) {
              if (!this.checkCheck([row2, col2], [to[0], to[1]])) {
                from[0] = row2;
                from[1] = col2;
                return {
                  from,
                  to
                };
              }
            } else {
              obstructed2 = true;
            }
          }
        }
      }

      return {
        from,
        to
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


    findLine(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
      const color = this.currentMove.player;
      const from = [];
      const to = [];
      from[0] = -1;
      from[1] = -1;
      to[0] = tarRow;
      to[1] = tarCol;

      for (let i = -1; i <= 1; i += 2) {
        let obstructed1 = false;
        let obstructed2 = false;

        for (let j = 1; j < 8; j += 1) {
          const row1 = to[0];
          const col1 = to[1] - i * j;
          const row2 = to[0] - i * j;
          const col2 = to[1];

          if (!obstructed1 && row1 >= 0 && row1 < 8 && col1 >= 0 && col1 < 8 && this.board.tiles[row1][col1] !== null) {
            const piece = this.board.tiles[row1][col1];

            if (piece.name.includes(token) && piece.color === color && (mustBeInRow === -1 || row1 === mustBeInRow) && (mustBeInCol === -1 || col1 === mustBeInCol)) {
              if (!this.checkCheck([row1, col1], [to[0], to[1]])) {
                from[0] = row1;
                from[1] = col1;
                return {
                  from,
                  to
                };
              }
            } else {
              obstructed1 = true;
            }
          }

          if (!obstructed2 && row2 >= 0 && row2 < 8 && col2 >= 0 && col2 < 8 && this.board.tiles[row2][col2] !== null) {
            const piece = this.board.tiles[row2][col2];

            if (piece.name.includes(token) && piece.color === color && (mustBeInRow === -1 || row2 === mustBeInRow) && (mustBeInCol === -1 || col2 === mustBeInCol)) {
              if (!this.checkCheck([row2, col2], [to[0], to[1]])) {
                from[0] = row2;
                from[1] = col2;
                return {
                  from,
                  to
                };
              }
            } else {
              obstructed2 = true;
            }
          }
        }
      }

      return {
        from,
        to
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


    findKnight(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
      const color = this.currentMove.player;
      const from = [];
      const to = [];
      from[0] = -1;
      from[1] = -1;
      to[0] = tarRow;
      to[1] = tarCol;

      for (let i = -2; i <= 2; i += 4) {
        for (let j = -1; j <= 1; j += 2) {
          const row1 = to[0] + i;
          const col1 = to[1] + j;
          const row2 = to[0] + j;
          const col2 = to[1] + i;

          if (row1 >= 0 && row1 < 8 && col1 >= 0 && col1 < 8 && this.board.tiles[row1][col1] !== null) {
            const piece = this.board.tiles[row1][col1];

            if (piece.name.includes(token) && piece.color === color && (mustBeInRow === -1 || row1 === mustBeInRow) && (mustBeInCol === -1 || col1 === mustBeInCol)) {
              if (!this.checkCheck([row1, col1], [to[0], to[1]])) {
                from[0] = row1;
                from[1] = col1;
                return {
                  from,
                  to
                };
              }
            }
          }

          if (row2 >= 0 && row2 < 8 && col2 >= 0 && col2 < 8 && this.board.tiles[row2][col2] !== null) {
            const piece = this.board.tiles[row2][col2];

            if (piece.name.includes(token) && piece.color === color && (mustBeInRow === -1 || row2 === mustBeInRow) && (mustBeInCol === -1 || col2 === mustBeInCol)) {
              if (!this.checkCheck([row2, col2], [to[0], to[1]])) {
                from[0] = row2;
                from[1] = col2;
                return {
                  from,
                  to
                };
              }
            }
          }
        }
      }

      return {
        from,
        to
      };
    }
    /**
     * Checks if the input move would be resulting with the king being in check.
     * @param {Number[]} from Coordinates of the source tile of the move that shall be checked.
     *  @param {Number[]} to Coordinates of the target tile of the move that shall be checked.
     * @returns {boolean} After the move, the king will be in check true/false.
     */


    checkCheck(from, to) {
      const color = this.currentMove.player;
      const opColor = this.currentMove.player === 'w' ? 'b' : 'w';
      const king = this.board.kingPos[color];
      let isInCheck = false; // if king move, no check is possible, exit function

      if (king[0] === from[0] && king[1] === from[1]) return false; // check if moving piece is on same line/diag as king, else exit

      const diff = [];
      diff[0] = from[0] - king[0];
      diff[1] = from[1] - king[1];
      const checkFor = [];

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
      const srcTilePiece = this.board.tiles[from[0]][from[1]];
      const tarTilePiece = this.board.tiles[to[0]][to[1]]; // premove and check if check

      this.board.tiles[from[0]][from[1]] = null;
      this.board.tiles[to[0]][to[1]] = srcTilePiece; // check for check

      let obstructed = false;

      for (let j = 1; j < 8 && !isInCheck && !obstructed; j += 1) {
        const row = king[0] + j * diff[0];
        const col = king[1] + j * diff[1];

        if (row >= 0 && row < 8 && col >= 0 && col < 8 && this.board.tiles[row][col] !== null) {
          const piece = this.board.tiles[row][col];

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

    static algebraicToCoords(square) {
      const coords = [];
      const temp = square.split('');
      coords.push(8 - temp[1]);
      coords.push(files.indexOf(temp[0]));
      return coords;
    }

    static coordsToAlgebraic(coords) {
      let name = files[coords[1]];
      name += 8 - coords[0];
      return name;
    }
    /**
     * Removes special characters like '#', '+', '?' and '!'
     * @param {string} move The move to be cleaned up
     * @returns {string} The input string with removed special characters
     */


    static preProcess(move) {
      return move.replace(/#|\+|\?|!/g, '');
    }

  }

  var _default = GameProcessor;
  _exports.default = _default;
  module.exports = exports.default;
});

/***/ }),

/***/ "./src/core/Processor.worker.js":
/*!**************************************!*\
  !*** ./src/core/Processor.worker.js ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (global, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! ./GameProcessor */ "./src/core/GameProcessor.js"), __webpack_require__(/*! ./Chessalyzer */ "./src/core/Chessalyzer.js")], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var mod; }
})(this, function (_GameProcessor, _Chessalyzer) {
  "use strict";

  _GameProcessor = _interopRequireDefault(_GameProcessor);
  _Chessalyzer = _interopRequireDefault(_Chessalyzer);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  /* eslint-disable global-require */

  /* eslint-disable import/no-dynamic-require */
  const {
    Tracker
  } = _Chessalyzer.default;
  const a = new Tracker.Game();
  const b = new Tracker.Piece();
  const c = new Tracker.Tile();
  process.on('message', msg => {
    const proc = new _GameProcessor.default();
    proc.attachAnalyzers([a, b, c]); // analyze each game

    msg.games.forEach(game => {
      proc.processGame(game);
    }); // send result of batch to master

    process.send({
      cntMoves: proc.cntMoves,
      gameAnalyzers: proc.gameAnalyzers,
      moveAnalyzers: proc.moveAnalyzers
    });
  });
});

/***/ }),

/***/ "./src/tracker/BaseTracker.js":
/*!************************************!*\
  !*** ./src/tracker/BaseTracker.js ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (global, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var mod; }
})(this, function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  const {
    performance
  } = __webpack_require__(/*! perf_hooks */ "perf_hooks");

  class BaseTracker {
    constructor(type) {
      this.type = type;
      this.profilingActive = false;
      this.time = 0;
      this.t0 = 0;

      if (this.track === undefined) {
        throw new Error('Your analyzer must implement a track() method!');
      }

      if (this.type === undefined) {
        throw new Error('Your analyzer must specify a type!');
      }
    }

    analyze(data) {
      if (this.profilingActive) this.t0 = performance.now();
      this.track(data);
      if (this.profilingActive) this.time += performance.now() - this.t0;
    }

  }

  var _default = BaseTracker;
  _exports.default = _default;
  module.exports = exports.default;
});

/***/ }),

/***/ "./src/tracker/GameTracker.js":
/*!************************************!*\
  !*** ./src/tracker/GameTracker.js ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (global, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports, __webpack_require__(/*! ./BaseTracker */ "./src/tracker/BaseTracker.js")], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var mod; }
})(this, function (_exports, _BaseTracker) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _BaseTracker = _interopRequireDefault(_BaseTracker);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  class GameTracker extends _BaseTracker.default {
    constructor() {
      super('game');
      this.wins = [0, 0, 0];
      this.cntGames = 0;
    }

    add(tracker) {
      this.wins[0] += tracker.wins[0];
      this.wins[1] += tracker.wins[1];
      this.wins[2] += tracker.wins[2];
      this.cntGames += tracker.cntGames;
      this.time += tracker.time;
    }

    track(game) {
      this.cntGames += 1;

      switch (game.Result) {
        case '1-0':
          this.wins[0] += 1;
          break;

        case '1/2-1/2':
          this.wins[1] += 1;
          break;

        case '0-1':
          this.wins[2] += 1;
          break;

        default:
          break;
      }
    }

  }

  var _default = GameTracker;
  _exports.default = _default;
  module.exports = exports.default;
});

/***/ }),

/***/ "./src/tracker/PieceTracker.js":
/*!*************************************!*\
  !*** ./src/tracker/PieceTracker.js ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (global, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports, __webpack_require__(/*! ./BaseTracker */ "./src/tracker/BaseTracker.js")], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var mod; }
})(this, function (_exports, _BaseTracker) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _BaseTracker = _interopRequireDefault(_BaseTracker);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
  const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

  class PieceTracker extends _BaseTracker.default {
    constructor() {
      super('move');
      this.b = {};
      this.w = {}; // first layer

      pawnTemplate.forEach(val => {
        this.w[val] = {};
        this.b[val] = {};
      });
      pieceTemplate.forEach(val => {
        this.w[val] = {};
        this.b[val] = {};
      }); // second layer

      Object.keys(this.w).forEach(key => {
        pawnTemplate.forEach(val => {
          this.w[key][val] = 0;
          this.b[key][val] = 0;
        });
        pieceTemplate.forEach(val => {
          this.w[key][val] = 0;
          this.b[key][val] = 0;
        });
      });
    }

    add(tracker) {
      this.time += tracker.time;
      pawnTemplate.forEach(pawn => {
        pieceTemplate.forEach(piece => {
          this.w[pawn][piece] += tracker.w[pawn][piece];
          this.b[pawn][piece] += tracker.b[pawn][piece];
        });
        pawnTemplate.forEach(pawn2 => {
          this.w[pawn][pawn2] += tracker.w[pawn][pawn2];
          this.b[pawn][pawn2] += tracker.b[pawn][pawn2];
        });
      });
      pieceTemplate.forEach(piece => {
        pieceTemplate.forEach(piece2 => {
          this.w[piece][piece2] += tracker.w[piece][piece2];
          this.b[piece][piece2] += tracker.b[piece][piece2];
        });
        pawnTemplate.forEach(pawn => {
          this.w[piece][pawn] += tracker.w[piece][pawn];
          this.b[piece][pawn] += tracker.b[piece][pawn];
        });
      });
    }

    track(moveData) {
      const {
        player
      } = moveData;
      const {
        piece
      } = moveData;
      const {
        takes
      } = moveData;

      if (takes.piece !== undefined) {
        if (piece.length > 1 && takes.piece.length > 1) {
          this.processTakes(player, piece, takes.piece);
        }
      }
    }

    processTakes(player, takingPiece, takenPiece) {
      this[player][takingPiece][takenPiece] += 1;
    }

  }

  var _default = PieceTracker;
  _exports.default = _default;
  module.exports = exports.default;
});

/***/ }),

/***/ "./src/tracker/TileTracker.js":
/*!************************************!*\
  !*** ./src/tracker/TileTracker.js ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (global, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports, __webpack_require__(/*! ./BaseTracker */ "./src/tracker/BaseTracker.js")], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var mod; }
})(this, function (_exports, _BaseTracker) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _BaseTracker = _interopRequireDefault(_BaseTracker);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
  const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

  class TileStats {
    constructor() {
      this.movedTo = 0;
      this.wasOn = 0;
      this.killedOn = 0;
      this.wasKilledOn = 0;
    }

  }

  class Piece {
    constructor(piece, color) {
      this.piece = piece;
      this.color = color;
      this.lastMovedOn = 0;
    }

  }

  class TileTracker extends _BaseTracker.default {
    constructor() {
      super('move');
      this.cntMovesGame = 0;
      this.cntMovesTotal = 0;
      this.tiles = new Array(8);

      for (let row = 0; row < 8; row += 1) {
        const currRow = new Array(8);

        for (let col = 0; col < 8; col += 1) {
          currRow[col] = {
            b: {},
            w: {}
          };
          currRow[col].b = new TileStats();
          currRow[col].w = new TileStats();
          pawnTemplate.forEach(val => {
            currRow[col].b[val] = new TileStats();
            currRow[col].w[val] = new TileStats();
          });
          pieceTemplate.forEach(val => {
            currRow[col].b[val] = new TileStats();
            currRow[col].w[val] = new TileStats();
          });
        }

        this.tiles[row] = currRow;
      }

      for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 8; col += 1) {
          this.resetCurrentPiece(row, col);
        }
      }
    }

    add(tracker) {
      this.time += tracker.time;

      for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 8; col += 1) {
          this.tiles[row][col].b.movedTo += tracker.tiles[row][col].b.movedTo;
          this.tiles[row][col].w.movedTo += tracker.tiles[row][col].w.movedTo;
          this.tiles[row][col].b.wasOn += tracker.tiles[row][col].b.wasOn;
          this.tiles[row][col].w.wasOn += tracker.tiles[row][col].w.wasOn;
          this.tiles[row][col].b.killedOn += tracker.tiles[row][col].b.killedOn;
          this.tiles[row][col].w.killedOn += tracker.tiles[row][col].w.killedOn;
          this.tiles[row][col].b.wasKilledOn += tracker.tiles[row][col].b.wasKilledOn;
          this.tiles[row][col].w.wasKilledOn += tracker.tiles[row][col].w.wasKilledOn;
          pawnTemplate.forEach(piece => {
            this.tiles[row][col].b[piece].movedTo += tracker.tiles[row][col].b[piece].movedTo;
            this.tiles[row][col].w[piece].movedTo += tracker.tiles[row][col].w[piece].movedTo;
            this.tiles[row][col].b[piece].wasOn += tracker.tiles[row][col].b[piece].wasOn;
            this.tiles[row][col].w[piece].wasOn += tracker.tiles[row][col].w[piece].wasOn;
            this.tiles[row][col].b[piece].killedOn += tracker.tiles[row][col].b[piece].killedOn;
            this.tiles[row][col].w[piece].killedOn += tracker.tiles[row][col].w[piece].killedOn;
            this.tiles[row][col].b[piece].wasKilledOn += tracker.tiles[row][col].b[piece].wasKilledOn;
            this.tiles[row][col].w[piece].wasKilledOn += tracker.tiles[row][col].w[piece].wasKilledOn;
          });
          pieceTemplate.forEach(piece => {
            this.tiles[row][col].b[piece].movedTo += tracker.tiles[row][col].b[piece].movedTo;
            this.tiles[row][col].w[piece].movedTo += tracker.tiles[row][col].w[piece].movedTo;
            this.tiles[row][col].b[piece].wasOn += tracker.tiles[row][col].b[piece].wasOn;
            this.tiles[row][col].w[piece].wasOn += tracker.tiles[row][col].w[piece].wasOn;
            this.tiles[row][col].b[piece].killedOn += tracker.tiles[row][col].b[piece].killedOn;
            this.tiles[row][col].w[piece].killedOn += tracker.tiles[row][col].w[piece].killedOn;
            this.tiles[row][col].b[piece].wasKilledOn += tracker.tiles[row][col].b[piece].wasKilledOn;
            this.tiles[row][col].w[piece].wasKilledOn += tracker.tiles[row][col].w[piece].wasKilledOn;
          });
        }
      }
    }

    resetCurrentPiece(row, col) {
      let color;
      let piece;
      let hasPiece = false;

      if (row === 0) {
        color = 'b';
        piece = pieceTemplate[col];
        hasPiece = true;
      } else if (row === 1) {
        color = 'b';
        piece = pawnTemplate[col];
        hasPiece = true;
      } else if (row === 6) {
        color = 'w';
        piece = pawnTemplate[col];
        hasPiece = true;
      } else if (row === 7) {
        color = 'w';
        piece = pieceTemplate[col];
        hasPiece = true;
      }

      if (hasPiece) {
        this.tiles[row][col].currentPiece = new Piece(piece, color);
      } else {
        this.tiles[row][col].currentPiece = null;
      }
    }

    track(moveData) {
      const {
        to
      } = moveData;
      const {
        from
      } = moveData;
      const {
        player
      } = moveData;
      const {
        piece
      } = moveData;
      const {
        takes
      } = moveData;
      const {
        castles
      } = moveData; // move

      if (to[0] !== -1) {
        this.cntMovesGame += 1;

        if (takes.piece !== undefined) {
          this.processTakes(takes.pos, player, piece, takes.piece);
        }

        this.processMove(from, to, player, piece); // castle
      } else if (castles !== '') {
        this.cntMovesGame += 1;
        const row = player === 'w' ? 7 : 0;
        let rook = 'Rh';
        let tarKingCol = 6;
        let tarRookCol = 5;
        let srcRookCol = 7;

        if (castles === 'O-O-O') {
          tarKingCol = 2;
          tarRookCol = 3;
          srcRookCol = 0;
          rook = 'Ra';
        }

        this.processMove([row, 4], [row, tarKingCol], player, 'Ke');
        this.processMove([row, srcRookCol], [row, tarRookCol], player, rook); // game end
      } else {
        for (let row = 0; row < 8; row += 1) {
          for (let col = 0; col < 8; col += 1) {
            const {
              currentPiece
            } = this.tiles[row][col];

            if (currentPiece !== null) {
              this.addOccupation([row, col]);
            }

            this.resetCurrentPiece(row, col);
          }
        }

        this.cntMovesTotal += this.cntMovesGame;
        this.cntMovesGame = 0;
      }
    }

    processMove(from, to, player, piece) {
      if (piece.length > 1) {
        this.addOccupation(from);
        this.tiles[to[0]][to[1]].currentPiece = this.tiles[from[0]][from[1]].currentPiece;
        this.tiles[to[0]][to[1]].currentPiece.lastMovedOn = this.cntMovesGame;
        this.tiles[from[0]][from[1]].currentPiece = null;
        this.tiles[to[0]][to[1]][player].movedTo += 1;
        this.tiles[to[0]][to[1]][player][piece].movedTo += 1;
      }
    }

    processTakes(pos, player, takingPiece, takenPiece) {
      if (takenPiece.length > 1) {
        const opPlayer = player === 'w' ? 'b' : 'w';
        this.tiles[pos[0]][pos[1]][opPlayer].wasKilledOn += 1;
        this.tiles[pos[0]][pos[1]][opPlayer][takenPiece].wasKilledOn += 1;
        this.addOccupation(pos);
        this.tiles[pos[0]][pos[1]].currentPiece = null;
      }

      if (takingPiece.length > 1) {
        this.tiles[pos[0]][pos[1]][player].killedOn += 1;
        this.tiles[pos[0]][pos[1]][player][takingPiece].killedOn += 1;
      }
    }

    addOccupation(pos) {
      const {
        currentPiece
      } = this.tiles[pos[0]][pos[1]];
      const toAdd = this.cntMovesGame - currentPiece.lastMovedOn;
      this.tiles[pos[0]][pos[1]][currentPiece.color].wasOn += toAdd;
      this.tiles[pos[0]][pos[1]][currentPiece.color][currentPiece.piece].wasOn += toAdd;
    }

  }

  var _default = TileTracker;
  _exports.default = _default;
  module.exports = exports.default;
});

/***/ }),

/***/ "cluster":
/*!**************************!*\
  !*** external "cluster" ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("cluster");

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
//# sourceMappingURL=worker.js.map