let imports = {};
imports['__wbindgen_placeholder__'] = module.exports;
let wasm;
const { TextDecoder } = require(`util`);

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function _assertChar(c) {
    if (typeof(c) === 'number' && (c >= 0x110000 || (c >= 0xD800 && c < 0xE000))) throw new Error(`expected a valid Unicode scalar value, found ${c}`);
}

const BitBoardFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_bitboard_free(ptr >>> 0));
/**
*/
class BitBoard {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BitBoard.prototype);
        obj.__wbg_ptr = ptr;
        BitBoardFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BitBoardFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bitboard_free(ptr);
    }
    /**
    * @param {bigint} state
    */
    constructor(state) {
        const ret = wasm.bitboard_new(state);
        this.__wbg_ptr = ret >>> 0;
        return this;
    }
    /**
    * @param {number} target_idx
    * @param {string} piece_type
    * @param {number} must_be_in_row
    * @param {number} must_be_in_col
    * @returns {BitBoard}
    */
    get_legal_pieces(target_idx, piece_type, must_be_in_row, must_be_in_col) {
        const char0 = piece_type.codePointAt(0);
        _assertChar(char0);
        const ret = wasm.bitboard_get_legal_pieces(this.__wbg_ptr, target_idx, char0, must_be_in_row, must_be_in_col);
        return BitBoard.__wrap(ret);
    }
    /**
    * @param {number} bit_idx
    */
    invert_bit(bit_idx) {
        wasm.bitboard_invert_bit(this.__wbg_ptr, bit_idx);
    }
    /**
    * @returns {number}
    */
    get_highest_bit_idx() {
        const ret = wasm.bitboard_get_highest_bit_idx(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
    */
    print_board() {
        wasm.bitboard_print_board(this.__wbg_ptr);
    }
}
module.exports.BitBoard = BitBoard;

module.exports.__wbg_log_f72c1b7438b77065 = function(arg0, arg1) {
    console.log(getStringFromWasm0(arg0, arg1));
};

module.exports.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

const path = require('path').join(__dirname, 'bitboard_bg.wasm');
const bytes = require('fs').readFileSync(path);

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
module.exports.__wasm = wasm;

