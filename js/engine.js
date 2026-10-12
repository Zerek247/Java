/*
 * JavaEngine — mini compilador + intérprete de Java (subconjunto) escrito en JS.
 * Fase 1 (compilar): léxico → sintaxis → chequeo de tipos con las reglas del JLS
 *   (promoción numérica, conversiones de asignación, constantes, final, var...).
 * Fase 2 (ejecutar): evalúa con la semántica exacta de la JVM (int de 32 bits con
 *   desbordamiento, long de 64 bits con BigInt, float con Math.fround, etc.)
 *   y graba una traza paso a paso explicando el porqué de cada operación.
 */
(function (root) {
  'use strict';

  // ───────────────────────── Tipos ─────────────────────────
  const NUMERIC = ['byte', 'short', 'char', 'int', 'long', 'float', 'double'];
  const INTEGRAL = ['byte', 'short', 'char', 'int', 'long'];
  const SMALL = ['byte', 'short', 'char'];
  const PRIMS = [...NUMERIC, 'boolean'];
  const isNum = t => NUMERIC.includes(t);
  const isIntegral = t => INTEGRAL.includes(t);
  const WIDEN = {
    byte: ['short', 'int', 'long', 'float', 'double'],
    short: ['int', 'long', 'float', 'double'],
    char: ['int', 'long', 'float', 'double'],
    int: ['long', 'float', 'double'],
    long: ['float', 'double'],
    float: ['double'],
    double: [], boolean: [], String: [], Object: []
  };
  const RANGE = { byte: [-128, 127], short: [-32768, 32767], char: [0, 65535], int: [-2147483648, 2147483647] };
  const BITS = { byte: 8, short: 16, char: 16, int: 32, long: 64, float: 32, double: 64, boolean: 1 };
  const up = t => (SMALL.includes(t) ? 'int' : t); // promoción unaria
  function bnp(a, b) { // promoción numérica binaria
    if (a === 'double' || b === 'double') return 'double';
    if (a === 'float' || b === 'float') return 'float';
    if (a === 'long' || b === 'long') return 'long';
    return 'int';
  }
  const fits = (v, t) => v >= RANGE[t][0] && v <= RANGE[t][1];

  class CompileError extends Error {
    constructor(msg, line, why) { super(msg); this.line = line; this.why = why || ''; }
  }
  class JavaException extends Error {
    constructor(cls, msg, why) { super(msg); this.cls = cls; this.why = why || ''; }
  }
  class JStr { constructor(s) { this.s = s; } }

  // ───────────────────── Formato estilo Java ─────────────────────
  function fmtDec(v, plain, expo) {
    const a = Math.abs(v);
    if (a >= 1e-3 && a < 1e7) { return plain.includes('.') ? plain : plain + '.0'; }
    let [m, e] = expo.split('e');
    if (!m.includes('.')) m += '.0';
    return m + 'E' + (e[0] === '+' ? e.slice(1) : e);
  }
  function special(v) {
    if (Number.isNaN(v)) return 'NaN';
    if (v === Infinity) return 'Infinity';
    if (v === -Infinity) return '-Infinity';
    if (v === 0) return Object.is(v, -0) ? '-0.0' : '0.0';
    return null;
  }
  function javaDouble(v) { return special(v) || fmtDec(v, String(v), v.toExponential()); }
  function javaFloat(v) {
    const s = special(v); if (s) return s;
    for (let p = 1; p <= 9; p++) {
      const n = Number(v.toPrecision(p));
      if (Math.fround(n) === v) return fmtDec(v, String(n), n.toExponential());
    }
    return fmtDec(v, String(v), v.toExponential());
  }
  function charLit(c) {
    const map = { 8: '\\b', 9: '\\t', 10: '\\n', 12: '\\f', 13: '\\r', 39: "\\'", 92: '\\\\' };
    if (map[c]) return "'" + map[c] + "'";
    if (c < 32 || c > 126) return "'\\u" + c.toString(16).padStart(4, '0') + "'";
    return "'" + String.fromCharCode(c) + "'";
  }
  // Convierte a String como lo haría Java (println / concatenación)
  function str(v, t) {
    switch (t) {
      case 'char': return String.fromCharCode(v);
      case 'boolean': return v ? 'true' : 'false';
      case 'float': return javaFloat(v);
      case 'double': return javaDouble(v);
      case 'String': return v === null ? 'null' : v.s;
      case 'Object': return str(v.v, v.t);
      default: return String(v);
    }
  }
  // Representación "de depuración" (para la traza)
  function show(v, t) {
    if (v === undefined) return '—';
    switch (t) {
      case 'char': return charLit(v) + ' (' + v + ')';
      case 'String': return v === null ? 'null' : JSON.stringify(v.s);
      case 'long': return v + 'L';
      case 'float': return javaFloat(v) + 'f';
      case 'double': return javaDouble(v);
      case 'boolean': return String(v);
      case 'Object': return show(v.v, v.t);
      default: return String(v);
    }
  }

  // ───────────────────── Conversiones y operaciones ─────────────────────
  function f2i(v) {
    if (Number.isNaN(v)) return 0;
    if (v >= 2147483647) return 2147483647;
    if (v <= -2147483648) return -2147483648;
    return Math.trunc(v) | 0;
  }
  function conv(v, from, to) {
    if (from === to || to === 'Object' || to === 'String' || to === 'boolean' || from === 'boolean') return v;
    if (from === 'long') {
      switch (to) {
        case 'byte': return Number(BigInt.asIntN(8, v));
        case 'short': return Number(BigInt.asIntN(16, v));
        case 'char': return Number(BigInt.asUintN(16, v));
        case 'int': return Number(BigInt.asIntN(32, v));
        case 'float': return Math.fround(Number(v));
        case 'double': return Number(v);
      }
    }
    if (from === 'float' || from === 'double') {
      switch (to) {
        case 'float': return Math.fround(v);
        case 'double': return v;
        case 'long':
          if (Number.isNaN(v)) return 0n;
          if (v >= 9223372036854775807) return 9223372036854775807n;
          if (v <= -9223372036854775808) return -9223372036854775808n;
          return BigInt(Math.trunc(v));
        default: { const i = f2i(v); return to === 'int' ? i : conv(i, 'int', to); }
      }
    }
    switch (to) { // desde byte/short/char/int
      case 'byte': return (v << 24) >> 24;
      case 'short': return (v << 16) >> 16;
      case 'char': return v & 0xFFFF;
      case 'int': return v | 0;
      case 'long': return BigInt(v);
      case 'float': return Math.fround(v);
      case 'double': return v;
    }
    return v;
  }
  const DIV0 = () => new JavaException('java.lang.ArithmeticException', '/ by zero',
    'En aritmética ENTERA (int/long) dividir o hacer % entre 0 lanza ArithmeticException en tiempo de ejecución. Compila sin problema: el compilador no lo detecta. (Con float/double daría Infinity o NaN).');
  function arith(op, a, b, T) {
    if (T === 'int') {
      switch (op) {
        case '+': return (a + b) | 0;
        case '-': return (a - b) | 0;
        case '*': return Math.imul(a, b);
        case '/': if (b === 0) throw DIV0(); return Math.trunc(a / b) | 0;
        case '%': if (b === 0) throw DIV0(); return (a % b) | 0;
        case '&': return a & b;
        case '|': return a | b;
        case '^': return a ^ b;
      }
    }
    if (T === 'long') {
      const W = x => BigInt.asIntN(64, x);
      switch (op) {
        case '+': return W(a + b);
        case '-': return W(a - b);
        case '*': return W(a * b);
        case '/': if (b === 0n) throw DIV0(); return W(a / b);
        case '%': if (b === 0n) throw DIV0(); return a % b;
        case '&': return a & b;
        case '|': return a | b;
        case '^': return a ^ b;
      }
    }
    if (T === 'boolean') {
      switch (op) { case '&': return a && b; case '|': return a || b; case '^': return a !== b; }
    }
    let r;
    switch (op) {
      case '+': r = a + b; break;
      case '-': r = a - b; break;
      case '*': r = a * b; break;
      case '/': r = a / b; break;
      case '%': r = a % b; break;
    }
    return T === 'float' ? Math.fround(r) : r;
  }
  function shiftDist(b, bt, T) {
    const raw = bt === 'long' ? Number(BigInt.asUintN(6, b)) : b;
    return raw & (T === 'long' ? 63 : 31);
  }
  function shift(op, a, b, T, bt) {
    const d = shiftDist(b, bt, T);
    if (T === 'int') {
      if (op === '<<') return a << d;
      if (op === '>>') return a >> d;
      return (a >>> d) | 0;
    }
    const D = BigInt(d);
    if (op === '<<') return BigInt.asIntN(64, a << D);
    if (op === '>>') return a >> D;
    return BigInt.asIntN(64, BigInt.asUintN(64, a) >> D);
  }
  function compare(op, a, b) {
    switch (op) {
      case '<': return a < b; case '>': return a > b;
      case '<=': return a <= b; case '>=': return a >= b;
      case '==': return a === b || (typeof a === 'number' && a == b);
      case '!=': return !(a === b || (typeof a === 'number' && a == b));
    }
  }
  function neg(v, T) {
    if (T === 'int') return (-v) | 0;
    if (T === 'long') return BigInt.asIntN(64, -v);
    if (T === 'float') return Math.fround(-v);
    return -v;
  }
  function bitsOf(v, t) { // cadena binaria con el ancho del tipo
    if (t === 'long') return BigInt.asUintN(64, v).toString(2).padStart(64, '0');
    if (t === 'float') { const b = new DataView(new ArrayBuffer(4)); b.setFloat32(0, v); return (b.getUint32(0) >>> 0).toString(2).padStart(32, '0'); }
    if (t === 'double') { const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, v); return b.getBigUint64(0).toString(2).padStart(64, '0'); }
    if (t === 'boolean') return v ? '1' : '0';
    const w = BITS[t] || 32;
    return ((v >>> 0) & (w === 32 ? 0xFFFFFFFF : (1 << w) - 1)).toString(2).padStart(w, '0').slice(-w);
  }

  // ───────────────────────── Léxico ─────────────────────────
  const KW = new Set(['byte', 'short', 'char', 'int', 'long', 'float', 'double', 'boolean', 'true', 'false', 'final', 'var', 'if', 'else', 'null', 'String']);
  const OPS = ['>>>=', '<<=', '>>=', '>>>', '<<', '>>', '++', '--', '&&', '||', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
    '+', '-', '*', '/', '%', '&', '|', '^', '!', '~', '<', '>', '=', '?', ':', ';', '(', ')', ',', '.', '{', '}', '[', ']'];
  const ESC = { b: 8, t: 9, n: 10, f: 12, r: 13, s: 32, '"': 34, "'": 39, '\\': 92 };

  function parseNumLit(raw) {
    let err = null, needsNeg = false, jt, v;
    const isHex = /^0[xX]/.test(raw), isBin = /^0[bB]/.test(raw);
    const dc = isHex ? /[0-9a-fA-F]/ : /[0-9]/;
    for (let k = 0; k < raw.length; k++) if (raw[k] === '_') {
      const p = raw[k - 1], q = raw[k + 1];
      if (!(p !== undefined && (dc.test(p) || p === '_')) || !(q !== undefined && (dc.test(q) || q === '_'))) err = 'illegal underscore';
    }
    const c = raw.replace(/_/g, '');
    const isLong = /[lL]$/.test(c);
    if (isHex || isBin || (/^0[0-9]+[lL]?$/.test(c))) {
      const digits = isHex || isBin ? c.slice(2, isLong ? -1 : undefined) : c.slice(1, isLong ? -1 : undefined);
      let big = 0n;
      if (!digits) err = err || (isHex ? 'hexadecimal numbers must contain at least one hexadecimal digit' : 'binary numbers must contain at least one binary digit');
      else if (!isHex && !isBin && /[89]/.test(digits)) err = err || 'integer number too large: ' + c;
      else big = BigInt((isHex ? '0x' : isBin ? '0b' : '0o') + digits);
      if (isLong) { jt = 'long'; if (big > 0xFFFFFFFFFFFFFFFFn) err = err || 'integer number too large'; v = BigInt.asIntN(64, big); }
      else { jt = 'int'; if (big > 0xFFFFFFFFn) err = err || 'integer number too large'; v = Number(BigInt.asIntN(32, big)); }
    } else if (/[.eE]/.test(c) || /[fFdD]$/.test(c)) {
      jt = /[fF]$/.test(c) ? 'float' : 'double';
      const num = Number(c.replace(/[fFdD]$/, ''));
      if (Number.isNaN(num)) err = err || 'malformed floating-point literal';
      v = jt === 'float' ? Math.fround(num) : num;
      if (!isFinite(v)) err = err || 'floating-point number too large';
      else if (v === 0 && num !== 0) err = err || 'floating-point number too small';
    } else {
      const digits = isLong ? c.slice(0, -1) : c;
      const big = BigInt(digits);
      if (isLong) {
        jt = 'long';
        if (big > 9223372036854775808n) err = err || 'integer number too large';
        else if (big === 9223372036854775808n) needsNeg = true;
        v = BigInt.asIntN(64, big);
      } else {
        jt = 'int';
        if (big > 2147483648n) err = err || 'integer number too large';
        else if (big === 2147483648n) needsNeg = true;
        v = Number(BigInt.asIntN(32, big));
      }
    }
    return { jt, v, err, needsNeg };
  }

  function lex(src) {
    const toks = [];
    let i = 0, line = 1;
    const n = src.length;
    const E = (m, why) => { throw new CompileError(m, line, why); };
    while (i < n) {
      const c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') {
        const j = src.indexOf('*/', i + 2);
        const end = j < 0 ? n : j + 2;
        for (let k = i; k < end; k++) if (src[k] === '\n') line++;
        i = end; continue;
      }
      const s = i;
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        const m = /^(0[xX][0-9a-fA-F_]*[lL]?|0[bB][01_]*[lL]?|[0-9_]*(?:\.[0-9_]*)?(?:[eE][+-]?[0-9_]+)?[fFdDlL]?)/.exec(src.slice(i));
        let raw = m[0];
        i += raw.length;
        if (/[A-Za-z0-9_$]/.test(src[i] || '')) E("';' expected", 'Hay letras pegadas a un número. Un literal solo admite sufijos L, F o D.');
        const r = parseNumLit(raw);
        toks.push({ t: 'num', raw, s, e: i, line, ...r });
        continue;
      }
      if (c === "'" || c === '"') {
        let j = i + 1; const chars = [];
        while (j < n && src[j] !== c) {
          if (src[j] === '\n') E(c === "'" ? 'unclosed character literal' : 'unclosed string literal');
          if (src[j] === '\\') {
            const d = src[j + 1];
            if (d === 'u') { const hx = src.slice(j + 2, j + 6); if (!/^[0-9a-fA-F]{4}$/.test(hx)) E('illegal unicode escape'); chars.push(parseInt(hx, 16)); j += 6; continue; }
            if (/[0-7]/.test(d)) { const om = /^[0-3]?[0-7]{1,2}|^[0-7]/.exec(src.slice(j + 1)); chars.push(parseInt(om[0], 8)); j += 1 + om[0].length; continue; }
            if (ESC[d] === undefined) E('illegal escape character', 'Escapes válidos: \\n \\t \\b \\r \\f \\s \\\' \\" \\\\ \\uXXXX y octales.');
            chars.push(ESC[d]); j += 2; continue;
          }
          chars.push(src.charCodeAt(j)); j++;
        }
        if (j >= n) E(c === "'" ? 'unclosed character literal' : 'unclosed string literal');
        i = j + 1;
        if (c === "'") {
          if (chars.length === 0) E('empty character literal', "Un char siempre lleva exactamente un carácter entre comillas simples: 'a'.");
          if (chars.length > 1) E('unclosed character literal', "Las comillas simples son para UN solo carácter (char). Para texto usa comillas dobles: \"...\".");
          toks.push({ t: 'char', v: chars[0], s, e: i, line });
        } else toks.push({ t: 'str', v: String.fromCharCode(...chars), s, e: i, line });
        continue;
      }
      if (/[A-Za-z_$]/.test(c)) {
        const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(src.slice(i))[0];
        i += m.length;
        toks.push({ t: KW.has(m) ? 'kw' : 'id', v: m, s, e: i, line });
        continue;
      }
      const op = OPS.find(o => src.startsWith(o, i));
      if (!op) E('illegal character: \'' + c + "'");
      i += op.length;
      toks.push({ t: 'op', v: op, s, e: i, line });
    }
    toks.push({ t: 'eof', v: '<EOF>', s: n, e: n, line });
    return toks;
  }

  // ───────────────────────── Sintaxis ─────────────────────────
  const BIN_PREC = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '>>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };
  const ASSIGN = ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>='];
  const CONSTS = {
    'Byte.MAX_VALUE': ['byte', 127], 'Byte.MIN_VALUE': ['byte', -128],
    'Short.MAX_VALUE': ['short', 32767], 'Short.MIN_VALUE': ['short', -32768],
    'Character.MAX_VALUE': ['char', 65535], 'Character.MIN_VALUE': ['char', 0],
    'Integer.MAX_VALUE': ['int', 2147483647], 'Integer.MIN_VALUE': ['int', -2147483648],
    'Long.MAX_VALUE': ['long', 9223372036854775807n], 'Long.MIN_VALUE': ['long', -9223372036854775808n],
    'Float.MAX_VALUE': ['float', Math.fround(3.4028234663852886e38)], 'Float.MIN_VALUE': ['float', Math.fround(1.401298464324817e-45)],
    'Double.MAX_VALUE': ['double', Number.MAX_VALUE], 'Double.MIN_VALUE': ['double', Number.MIN_VALUE],
    'Double.NaN': ['double', NaN], 'Float.NaN': ['float', NaN],
    'Double.POSITIVE_INFINITY': ['double', Infinity], 'Double.NEGATIVE_INFINITY': ['double', -Infinity]
  };

  function parse(toks) {
    let p = 0;
    const peek = (k = 0) => toks[Math.min(p + k, toks.length - 1)];
    const next = () => toks[p++];
    const is = (v, k = 0) => { const t = peek(k); return (t.t === 'op' || t.t === 'kw' || t.t === 'id') && t.v === v; };
    const E = (m, t, why) => { throw new CompileError(m, (t || peek()).line, why); };
    const expect = v => { if (!is(v)) E("'" + v + "' expected", peek(), v === ';' ? 'En Java cada sentencia termina con punto y coma.' : ''); return next(); };
    const isTypeKw = t => t.t === 'kw' && (PRIMS.includes(t.v) || t.v === 'String' || t.v === 'var');

    function program() {
      const body = [];
      while (peek().t !== 'eof') body.push(statement());
      return { k: 'block', body, top: true };
    }
    function statement() {
      const t = peek();
      if (is('{')) {
        next(); const body = [];
        while (!is('}')) { if (peek().t === 'eof') E("reached end of file while parsing"); body.push(statement()); }
        next(); return { k: 'block', body, line: t.line };
      }
      if (is(';')) { next(); return { k: 'empty', line: t.line }; }
      if (is('if')) {
        next(); expect('(');
        const cond = expr(); expect(')');
        const then = statement();
        let els = null;
        if (is('else')) { next(); els = statement(); }
        return { k: 'if', cond, then, els, line: t.line };
      }
      if (is('else')) E("'else' without 'if'");
      let fin = false;
      if (is('final')) { next(); fin = true; }
      if (isTypeKw(peek()) && (peek(1).t === 'id' || (peek(1).t === 'op' && peek(1).v === '['))) {
        const type = next().v;
        if (is('[')) E('Este laboratorio no soporta arrays (todavía)', peek(), 'Los arrays se ven en otro tema. Aquí trabajamos con primitivos y String.');
        const decls = [];
        do {
          const id = next();
          if (id.t !== 'id') E('<identifier> expected', id);
          let init = null;
          if (is('=')) { next(); init = expr(); }
          decls.push({ id: id.v, init, line: id.line });
        } while (is(',') && next());
        expect(';');
        return { k: 'decl', type, fin, decls, line: t.line };
      }
      if (fin) E('<identifier> expected');
      if (t.t === 'id' && t.v === 'System') {
        const s = next();
        if (!(is('.') && peek(1).v === 'out' && peek(2).v === '.')) E('Solo se soporta System.out.println / System.out.print', s);
        next(); next(); next();
        const m = next();
        if (m.v !== 'println' && m.v !== 'print') E('cannot find symbol\n  symbol: method ' + m.v, m, 'Usa System.out.println(...) o System.out.print(...).');
        expect('(');
        const e = is(')') ? null : expr();
        expect(')'); expect(';');
        return { k: 'print', ln: m.v === 'println', e, line: t.line };
      }
      const e = expr();
      expect(';');
      return { k: 'expr', e, line: t.line };
    }
    function expr() { return assign(); }
    function assign() {
      const left = ternary();
      const t = peek();
      if (t.t === 'op' && ASSIGN.includes(t.v)) {
        next(); const right = assign();
        return { k: 'assign', op: t.v, target: left, e: right, s: left.s, end: right.end, line: left.line };
      }
      return left;
    }
    function ternary() {
      const c = binary(1);
      if (is('?')) {
        next(); const a = assign(); expect(':'); const b = ternary();
        return { k: 'tern', c, a, b, s: c.s, end: b.end, line: c.line };
      }
      return c;
    }
    function binary(min) {
      let left = unary();
      for (;;) {
        const t = peek();
        if (t.t !== 'op') break;
        const pr = BIN_PREC[t.v];
        if (pr === undefined || pr < min) break;
        next();
        const right = binary(pr + 1);
        left = { k: 'bin', op: t.v, l: left, r: right, s: left.s, end: right.end, line: left.line, opS: t.s, opE: t.e };
      }
      return left;
    }
    function unary() {
      const t = peek();
      if (t.t === 'op' && ['+', '-', '!', '~'].includes(t.v)) {
        next(); const e = unary();
        if (t.v === '-' && e.k === 'lit' && e.needsNeg && !e.parens) e.needsNeg = false;
        return { k: 'un', op: t.v, e, s: t.s, end: e.end, line: t.line, opS: t.s, opE: t.e };
      }
      if (t.t === 'op' && (t.v === '++' || t.v === '--')) {
        next(); const e = unary();
        return { k: 'pre', op: t.v, e, s: t.s, end: e.end, line: t.line, opS: t.s, opE: t.e };
      }
      if (is('(') && isTypeKw(peek(1)) && peek(1).v !== 'var' && is(')', 2)) {
        next(); const to = next().v; const cp = next();
        const e = unary();
        return { k: 'cast', to, e, s: t.s, end: e.end, line: t.line, opS: t.s, opE: cp.e };
      }
      return postfix();
    }
    function postfix() {
      let e = primary();
      while (is('++') || is('--')) {
        const t = next();
        e = { k: 'post', op: t.v, e, s: e.s, end: t.e, line: e.line, opS: t.s, opE: t.e };
      }
      return e;
    }
    function primary() {
      const t = next();
      if (t.t === 'num') {
        if (t.err) throw new CompileError(t.err, t.line, numWhy(t));
        return { k: 'lit', jt: t.jt, v: t.v, needsNeg: t.needsNeg, s: t.s, end: t.e, line: t.line };
      }
      if (t.t === 'char') return { k: 'lit', jt: 'char', v: t.v, s: t.s, end: t.e, line: t.line };
      if (t.t === 'str') return { k: 'lit', jt: 'String', v: t.v, s: t.s, end: t.e, line: t.line };
      if (t.t === 'kw' && (t.v === 'true' || t.v === 'false')) return { k: 'lit', jt: 'boolean', v: t.v === 'true', s: t.s, end: t.e, line: t.line };
      if (t.t === 'id') {
        if (is('.') && peek(1).t === 'id') {
          const key = t.v + '.' + peek(1).v;
          if (CONSTS[key]) { next(); const f = next(); return { k: 'lit', jt: CONSTS[key][0], v: CONSTS[key][1], s: t.s, end: f.e, line: t.line, named: key }; }
          E('cannot find symbol\n  symbol: ' + key, t, 'Este laboratorio soporta constantes como Integer.MAX_VALUE, Byte.MIN_VALUE, Long.MAX_VALUE, Double.NaN...');
        }
        if (is('(')) E('cannot find symbol\n  symbol: method ' + t.v + '()', t, 'El laboratorio no soporta llamadas a métodos (aún). Solo expresiones y System.out.println.');
        return { k: 'name', id: t.v, s: t.s, end: t.e, line: t.line };
      }
      if (t.t === 'op' && t.v === '(') {
        const e = expr();
        const c = expect(')');
        e.parens = true; e.s = t.s; e.end = c.e;
        return e;
      }
      if (t.t === 'eof') E('reached end of file while parsing', t);
      E('illegal start of expression', t, "Hay un símbolo donde Java esperaba un valor: '" + t.v + "'.");
    }
    return program();
  }
  function numWhy(t) {
    if (t.err === 'illegal underscore') return 'Reglas del guion bajo: solo puede ir ENTRE dígitos. Nunca al inicio, al final, junto al punto decimal, junto a 0x/0b ni antes de L/F/D.';
    if (t.err.startsWith('integer number too large')) {
      if (/^0[0-9]/.test(t.raw) && /[89]/.test(t.raw)) return 'Un número que empieza por 0 es OCTAL (base 8): solo admite dígitos 0-7.';
      return 'Un literal entero sin L es int y su máximo es 2147483647. Si necesitas más grande, agrega L para que sea long: 3000000000L.';
    }
    if (t.err.startsWith('floating')) return 'El valor no cabe en el rango del tipo de punto flotante.';
    return '';
  }

  // ─────────────────── Chequeo de tipos (compilador) ───────────────────
  const opName = op => op.length > 1 && op.endsWith('=') && !['==', '!=', '<=', '>='].includes(op) ? op.slice(0, -1) : op;

  function compile(srcIn) {
    const src = extractMain(srcIn);
    const toks = lex(src);
    const ast = parse(toks);
    const strPool = new Map();
    const intern = s => { if (!strPool.has(s)) strPool.set(s, new JStr(s)); return strPool.get(s); };
    const allBindings = [];
    let uid = 0;

    class Scope {
      constructor(parent) { this.parent = parent; this.vars = new Map(); }
      lookup(id) { return this.vars.get(id) || (this.parent && this.parent.lookup(id)); }
      all() { const a = this.parent ? this.parent.all() : []; return a.concat([...this.vars.values()]); }
    }
    const E = (m, n, why) => { throw new CompileError(m, n.line, why); };
    const badBin = (op, a, b, n, why) => E(`bad operand types for binary operator '${op}'\n  first type:  ${a}\n  second type: ${b}`, n, why);

    function lossyWhy(src, target, n) {
      let w = `Quieres meter un ${src} (${BITS[src]} bits) en un ${target} (${BITS[target]} bits). Java NUNCA reduce un tipo automáticamente porque podrías perder datos. Solución: cast explícito (${target}).`;
      if (src === 'char' || target === 'char') w = `char es SIN signo (0..65535) y ${src === 'char' ? target : src} tiene signo: ningún rango contiene al otro por completo, así que se necesita cast explícito aunque tengan los mismos bits.`;
      if (['int', 'short', 'char', 'byte'].includes(src) && SMALL.includes(target)) {
        if (n && n.cv !== undefined) w += ` Ojo: es una constante, pero ${show(n.cv, src)} no cabe en el rango de ${target} [${RANGE[target][0]}, ${RANGE[target][1]}].`;
        else w += ` Si fuera una CONSTANTE de compilación (literal o variable final) dentro del rango de ${target}, sí compilaría sin cast.`;
      }
      if (src === 'double' && target === 'float') w += ' Recuerda: un literal decimal como 3.14 es double por defecto. Para float escribe 3.14f.';
      if (src === 'long' && SMALL.concat('int').includes(target)) w += ' La excepción de constantes NO aplica a long: aunque el valor quepa, long → int siempre requiere cast.';
      return w;
    }
    function assignCheck(target, srcT, srcNode) {
      if (target === srcT || target === 'Object') return null;
      if (isNum(target) && isNum(srcT)) {
        if (WIDEN[srcT].includes(target)) return null;
        const cv = srcNode.cv;
        if (SMALL.includes(target) && SMALL.concat('int').includes(srcT) && cv !== undefined && fits(cv, target)) return null;
        return [`incompatible types: possible lossy conversion from ${srcT} to ${target}`, lossyWhy(srcT, target, srcNode)];
      }
      let why = `Los tipos ${srcT} y ${target} no son compatibles: ni con cast se puede convertir uno en el otro.`;
      if (srcT === 'boolean' || target === 'boolean') why = 'boolean NO es un número en Java (a diferencia de C): true/false nunca se convierte a int ni viceversa, ni siquiera con cast.';
      if (srcT === 'String') why = 'Un String no se convierte a primitivo por asignación ni por cast. Necesitarías Integer.parseInt(...) (tema de wrappers).';
      if (target === 'String') why = 'Un primitivo no se asigna directo a String. Truco: "" + valor, o String.valueOf(valor).';
      if (srcT === 'Object') why = 'El ternario mezcla tipos incompatibles (p. ej. String y int): su tipo resultante no es ' + target + '.';
      return [`incompatible types: ${srcT} cannot be converted to ${target}`, why];
    }
    function tryConst(fn) { try { return fn(); } catch (e) { return undefined; } }

    function ex(n, sc) {
      switch (n.k) {
        case 'lit':
          if (n.needsNeg) E('integer number too large', n, '2147483648 solo es válido justo después de un signo menos (-2147483648), porque el máximo int positivo es 2147483647.');
          n.t = n.jt; n.cv = n.jt === 'String' ? intern(n.v) : n.v; return n.t;
        case 'name': {
          const b = sc.lookup(n.id);
          if (!b) E(`cannot find symbol\n  symbol:   variable ${n.id}`, n, `No existe ninguna variable "${n.id}" declarada en este punto (¿la declaraste antes? ¿está fuera de su bloque { }?).`);
          if (!b.assigned) E(`variable ${n.id} might not have been initialized`, n, 'Las variables LOCALES no tienen valor por defecto (los campos de clase sí). Debes asignarles un valor antes de leerlas.');
          n.b = b; n.t = b.type; if (b.cv !== undefined) n.cv = b.cv; return n.t;
        }
        case 'un': {
          const t = ex(n.e, sc);
          if (n.op === '!') {
            if (t !== 'boolean') E(`bad operand type ${t} for unary operator '!'`, n, '! solo funciona con boolean. Para invertir bits de un entero se usa ~.');
            n.t = 'boolean';
            if (n.e.cv !== undefined) n.cv = !n.e.cv;
            return n.t;
          }
          if (n.op === '~' ? !isIntegral(t) : !isNum(t)) E(`bad operand type ${t} for unary operator '${n.op}'`, n, n.op === '~' ? '~ (complemento a nivel de bits) solo funciona con tipos enteros.' : `El operador unario ${n.op} solo funciona con números.`);
          n.t = up(t);
          if (n.e.cv !== undefined) {
            const v = conv(n.e.cv, t, n.t);
            n.cv = n.op === '-' ? neg(v, n.t) : n.op === '~' ? (n.t === 'long' ? BigInt.asIntN(64, ~v) : ~v) : v;
          }
          return n.t;
        }
        case 'pre': case 'post': {
          const tg = n.e;
          if (tg.k !== 'name') { ex(tg, sc); E(`unexpected type\n  required: variable\n  found:    value`, n, `${n.op} necesita una VARIABLE (algo donde guardar el resultado). No se puede aplicar a un literal ni a una expresión como (a + b) ni encadenar x++ ++.`); }
          const b = sc.lookup(tg.id);
          if (!b) E(`cannot find symbol\n  symbol:   variable ${tg.id}`, n);
          if (!b.assigned) E(`variable ${tg.id} might not have been initialized`, n, `${n.op} primero LEE la variable, y ${tg.id} aún no tiene valor.`);
          if (b.fin) E(`cannot assign a value to final variable ${tg.id}`, n, 'Una variable final solo se asigna una vez. ++/-- intentan modificarla.');
          if (!isNum(b.type)) E(`bad operand type ${b.type} for unary operator '${n.op}'`, n, `${n.op} solo aplica a tipos numéricos (incluido char).`);
          tg.b = b; tg.t = b.type; n.b = b; n.t = b.type; return n.t;
        }
        case 'cast': {
          const t = ex(n.e, sc);
          const ok = (isNum(n.to) && isNum(t)) || n.to === t || (n.to === 'String' && t === 'String');
          if (!ok) E(`incompatible types: ${t} cannot be converted to ${n.to}`, n, (t === 'boolean' || n.to === 'boolean') ? 'boolean no se puede castear a número ni un número a boolean. Son mundos separados.' : `No existe conversión por cast entre ${t} y ${n.to}.`);
          n.t = n.to;
          if (n.e.cv !== undefined) n.cv = conv(n.e.cv, t, n.to);
          return n.t;
        }
        case 'bin': {
          const lt = ex(n.l, sc), rt = ex(n.r, sc), op = n.op;
          const both = n.l.cv !== undefined && n.r.cv !== undefined;
          if (op === '+' && (lt === 'String' || rt === 'String')) {
            n.t = 'String'; n.kind = 'concat';
            if (both) n.cv = intern(str(n.l.cv, lt) + str(n.r.cv, rt));
            return n.t;
          }
          if (['+', '-', '*', '/', '%'].includes(op)) {
            if (!isNum(lt) || !isNum(rt)) badBin(op, lt, rt, n, op === '+' ? '+ funciona con números (suma) o si alguno es String (concatenación). boolean no participa en aritmética.' : `${op} solo funciona con números.`);
            n.pt = n.t = bnp(lt, rt); n.kind = 'arith';
          } else if (['<<', '>>', '>>>'].includes(op)) {
            if (!isIntegral(lt) || !isIntegral(rt)) badBin(op, lt, rt, n, 'Los desplazamientos de bits solo funcionan con tipos enteros.');
            n.pt = n.t = up(lt); n.kind = 'shift';
          } else if (['<', '>', '<=', '>='].includes(op)) {
            if (!isNum(lt) || !isNum(rt)) badBin(op, lt, rt, n, `${op} compara números. Con boolean o String no está definido.`);
            n.pt = bnp(lt, rt); n.t = 'boolean'; n.kind = 'cmp';
          } else if (op === '==' || op === '!=') {
            if (isNum(lt) && isNum(rt)) n.pt = bnp(lt, rt);
            else if (lt === 'boolean' && rt === 'boolean') n.pt = 'boolean';
            else if (lt === 'String' && rt === 'String') n.pt = 'String';
            else badBin(op, lt, rt, n, `No se puede comparar ${lt} con ${rt}: deben ser ambos numéricos, ambos boolean o ambos referencias compatibles.`);
            n.t = 'boolean'; n.kind = 'cmp';
          } else if (['&', '|', '^'].includes(op)) {
            if (lt === 'boolean' && rt === 'boolean') n.pt = 'boolean';
            else if (isIntegral(lt) && isIntegral(rt)) n.pt = bnp(lt, rt);
            else badBin(op, lt, rt, n, `${op} funciona con dos boolean (lógico, SIN cortocircuito) o dos enteros (a nivel de bits). No mezcla ni acepta float/double.`);
            n.t = n.pt; n.kind = n.pt === 'boolean' ? 'logic' : 'arith';
          } else if (op === '&&' || op === '||') {
            if (lt !== 'boolean' || rt !== 'boolean') badBin(op, lt, rt, n, `${op} solo acepta boolean en ambos lados. Para enteros a nivel de bits existe ${op[0]}.`);
            n.t = 'boolean'; n.kind = 'sc';
          }
          if (both) n.cv = tryConst(() => evalPure(n, n.l.cv, n.r.cv));
          return n.t;
        }
        case 'tern': {
          const ct = ex(n.c, sc);
          if (ct !== 'boolean') E(`incompatible types: ${ct} cannot be converted to boolean`, n.c, 'La condición del ternario debe ser boolean.');
          const at = ex(n.a, sc), bt = ex(n.b, sc);
          let T;
          if (at === bt) T = at;
          else if (isNum(at) && isNum(bt)) {
            if ((at === 'byte' && bt === 'short') || (at === 'short' && bt === 'byte')) T = 'short';
            else if (SMALL.includes(at) && bt === 'int' && n.b.cv !== undefined && fits(n.b.cv, at)) T = at;
            else if (SMALL.includes(bt) && at === 'int' && n.a.cv !== undefined && fits(n.a.cv, bt)) T = bt;
            else T = bnp(at, bt);
          } else T = 'Object';
          n.t = T;
          if (T !== 'Object' && n.c.cv !== undefined && n.a.cv !== undefined && n.b.cv !== undefined)
            n.cv = n.c.cv ? conv(n.a.cv, at, T) : conv(n.b.cv, bt, T);
          return T;
        }
        case 'assign': {
          let tg = n.target;
          if (tg.k !== 'name') { ex(tg, sc); E(`unexpected type\n  required: variable\n  found:    value`, n, 'A la izquierda de = debe haber una variable.'); }
          const b = sc.lookup(tg.id);
          if (!b) E(`cannot find symbol\n  symbol:   variable ${tg.id}`, n, `No existe la variable "${tg.id}".`);
          tg.b = b; tg.t = b.type; n.b = b; n.t = b.type;
          if (n.op === '=') {
            const rt = ex(n.e, sc);
            if (b.fin && b.assigned) E(`cannot assign a value to final variable ${tg.id}`, n, 'final = se asigna UNA sola vez.');
            const err = assignCheck(b.type, rt, n.e);
            if (err) E(err[0], n, err[1]);
            b.assigned = true;
            return n.t;
          }
          const op = opName(n.op);
          if (!b.assigned) E(`variable ${tg.id} might not have been initialized`, n, `${n.op} lee primero el valor de ${tg.id}, que aún no existe.`);
          if (b.fin) E(`cannot assign a value to final variable ${tg.id}`, n);
          const rt = ex(n.e, sc), T = b.type;
          if (op === '+' && T === 'String') { n.pt = 'String'; return n.t; }
          if (['+', '-', '*', '/', '%'].includes(op) && isNum(T) && isNum(rt)) n.pt = bnp(T, rt);
          else if (['<<', '>>', '>>>'].includes(op) && isIntegral(T) && isIntegral(rt)) n.pt = up(T);
          else if (['&', '|', '^'].includes(op) && T === 'boolean' && rt === 'boolean') n.pt = 'boolean';
          else if (['&', '|', '^'].includes(op) && isIntegral(T) && isIntegral(rt)) n.pt = bnp(T, rt);
          else badBin(op, T, rt, n);
          return n.t;
        }
      }
      throw new Error('nodo desconocido ' + n.k);
    }

    function snapAssigned(sc) { return sc.all().map(b => [b, b.assigned]); }

    function st(n, sc) {
      switch (n.k) {
        case 'empty': return;
        case 'block': {
          const inner = n.top ? sc : new Scope(sc);
          n.scope = inner;
          for (const s of n.body) st(s, inner);
          return;
        }
        case 'if': {
          const ct = ex(n.cond, sc);
          if (ct !== 'boolean') E(`incompatible types: ${ct} cannot be converted to boolean`, n.cond, 'La condición de un if debe ser boolean. Trampa típica: if (x = 5) asigna en vez de comparar (==) y da int.');
          for (const br of [n.then, n.els]) if (br && br.k === 'decl') E('variable declaration not allowed here', br, 'Un if sin llaves no puede contener directamente una declaración. Usa { }.');
          const before = snapAssigned(sc);
          st(n.then, new Scope(sc));
          const afterThen = snapAssigned(sc);
          before.forEach(([b, a]) => (b.assigned = a));
          if (n.els) st(n.els, new Scope(sc));
          afterThen.forEach(([b, a]) => (b.assigned = b.assigned && a));
          return;
        }
        case 'decl': {
          if (n.type === 'var' && n.decls.length > 1) E("'var' is not allowed in a compound declaration", n, 'Con var solo se declara UNA variable por sentencia.');
          for (const d of n.decls) {
            if (sc.lookup(d.id)) E(`variable ${d.id} is already defined in method main(String[])`, d, 'No puedes declarar dos variables locales con el mismo nombre en el mismo alcance (ni en un bloque interno).');
            if (n.type === 'var' && !d.init) E(`cannot infer type for local variable ${d.id}\n  (cannot use 'var' on variable without initializer)`, d, 'var deduce el tipo del valor inicial: sin valor no hay de dónde deducirlo.');
            const b = { id: d.id, type: n.type === 'var' ? null : n.type, fin: n.fin, assigned: false, uid: uid++ };
            sc.vars.set(d.id, b); allBindings.push(b); d.b = b;
            if (d.init) {
              const rt = ex(d.init, sc);
              if (b.type === null) b.type = rt;
              const err = assignCheck(b.type, rt, d.init);
              if (err) E(err[0], d, err[1]);
              b.assigned = true;
              if (n.fin && d.init.cv !== undefined && (PRIMS.includes(b.type) || b.type === 'String')) b.cv = conv(d.init.cv, rt, b.type);
            }
          }
          return;
        }
        case 'print': {
          if (!n.e && !n.ln) E('no suitable method found for print(no arguments)', n, 'print() necesita un argumento; println() sí puede ir vacío.');
          if (n.e) ex(n.e, sc);
          return;
        }
        case 'expr': {
          const e = n.e;
          if (e.parens || !['assign', 'pre', 'post'].includes(e.k)) {
            ex(e, sc);
            E('not a statement', n, 'Una expresión suelta como "a + b;" no es una sentencia válida en Java. Solo se permiten como sentencia: asignaciones, ++/--, llamadas a métodos y new.');
          }
          ex(e, sc);
          return;
        }
      }
    }
    st(ast, new Scope(null));
    return { ast, src, bindings: allBindings, intern };
  }

  // Evaluación pura (para constantes): mismo cálculo que en ejecución, sin traza
  function evalPure(n, a, b) {
    const lt = n.l.t, rt = n.r.t;
    switch (n.kind) {
      case 'arith': return arith(n.op, conv(a, lt, n.pt), conv(b, rt, n.pt), n.pt);
      case 'shift': return shift(n.op, conv(a, lt, n.pt), conv(b, rt, up(rt)), n.pt, up(rt));
      case 'cmp': return n.pt === 'String' ? a === b : compare(n.op, conv(a, lt, n.pt), conv(b, rt, n.pt));
      case 'logic': return arith(n.op, a, b, 'boolean');
      case 'sc': return n.op === '&&' ? a && b : a || b;
    }
  }

  // Si el usuario pega una clase completa, se queda solo con el cuerpo de main
  function extractMain(src) {
    const m = /static\s+void\s+main\s*\([^)]*\)\s*(throws\s+[\w.,\s]+)?\{/.exec(src);
    if (!m) return src;
    const start = m.index + m[0].length;
    let depth = 1, i = start;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
    }
    const end = depth === 0 ? i - 1 : src.length;
    return src.split('').map((c, k) => (k >= start && k < end) || c === '\n' ? c : ' ').join('');
  }

  // ───────────────────── Ejecución con traza ─────────────────────
  const PROMO_WHY = (lt, rt, pt) => {
    if (pt === 'int') return SMALL.includes(lt) && SMALL.includes(rt) ? 'byte, short y char SIEMPRE se promueven a int en operaciones binarias, aunque ningún operando sea int' : 'el operando pequeño (byte/short/char) se promueve a int';
    if ((isIntegral(lt) || isIntegral(rt)) && (pt === 'float' || pt === 'double') && !(lt === 'float' && rt === 'double') && !(lt === 'double' && rt === 'float'))
      return `entero mezclado con punto flotante → el entero se convierte a ${pt}`;
    return `el tipo más pequeño se promueve al más grande (${pt})`;
  };

  function run(srcIn, opts = {}) {
    const res = { ok: false, out: [], steps: [], vars: [], error: null, phase: null };
    let prog;
    try { prog = compile(srcIn); }
    catch (e) {
      if (!(e instanceof CompileError)) { res.error = { msg: 'Error interno del laboratorio: ' + e.message, line: 0 }; res.phase = 'compile'; return res; }
      res.phase = 'compile'; res.error = { msg: e.message, line: e.line, why: e.why }; return res;
    }
    res.prog = prog;
    const src = prog.src;
    const vals = new Map();
    const live = [];
    let curLine = 1;
    let outBuf = '';
    const txt = n => src.slice(n.s, n.end).replace(/\s+/g, ' ');
    const snapshot = () => live.map(b => ({ id: b.id, type: b.type, value: vals.has(b) ? show(vals.get(b), b.type) : '—', raw: vals.get(b), uid: b.uid }));
    const step = (kind, code, text, notes = [], extra = {}) => {
      if (res.steps.length > 5000) throw new Error('demasiados pasos');
      res.steps.push({ kind, line: curLine, code, text, notes: notes.filter(Boolean), vars: snapshot(), out: outBuf, ...extra });
    };

    function convNote(from, to, v, r) {
      if (from === to) return null;
      if (WIDEN[from] && WIDEN[from].includes(to)) {
        if ((from === 'long' && (to === 'float' || to === 'double')) || (from === 'int' && to === 'float')) {
          if (conv(r, to, from) !== v) return `⚠ ampliación ${from} → ${to}: es implícita pero PIERDE PRECISIÓN (${show(v, from)} → ${show(r, to)})`;
        }
        return `ampliación implícita ${from} → ${to} (widening): siempre segura`;
      }
      return null;
    }

    function narrowNotes(v, from, to, r) {
      const notes = [];
      if (isIntegral(from) && isIntegral(to)) {
        if (BITS[to] < BITS[from] || to === 'char' || from === 'char') {
          notes.push(`Estrechamiento ${from} (${BITS[from]} bits) → ${to} (${BITS[to]} bits): se CONSERVAN solo los ${BITS[to]} bits más bajos y se descartan los demás.`);
          if (BITS[from] > BITS[to]) notes.push(`bits: ${bitsOf(v, from).slice(-Math.min(BITS[from], 32)).replace(new RegExp(`(.{${BITS[to]}})$`), ' [$1]')} → ${to === 'char' ? 'sin signo' : 'el bit más alto es el signo'}`);
          if (show(conv(r, to, from), from) !== show(v, from)) notes.push(`⚠ El valor no cabía en ${to}: ${show(v, from)} se convirtió en ${show(r, to)}`);
        }
      } else if ((from === 'float' || from === 'double') && isIntegral(to)) {
        notes.push('Punto flotante → entero: la parte decimal se TRUNCA hacia cero (no redondea).');
        if (Number.isNaN(v)) notes.push('NaN convertido a entero da 0.');
        else if (to === 'int' || to === 'long') { if (Math.abs(v) >= (to === 'int' ? 2147483648 : 9.2e18)) notes.push(`⚠ Fuera de rango: se SATURA al ${v > 0 ? 'MAX' : 'MIN'}_VALUE de ${to}.`); }
        else notes.push(`Para ${to}: primero se convierte a int (truncando) y luego se cortan los bits a ${BITS[to]}.`);
      } else if (from === 'double' && to === 'float') notes.push('double → float: se redondea al float más cercano (puede perder precisión o dar Infinity).');
      else if (from === 'long' && (to === 'float' || to === 'double')) notes.push('long → ' + to + ': ampliación (puede perder precisión en valores muy grandes).');
      return notes;
    }

    function ev(n) {
      if (n.t === 'String' && n.cv !== undefined && n.k !== 'lit' && n.k !== 'name') {
        step('const', txt(n), `${txt(n)} = ${show(n.cv, 'String')}`, ['Expresión CONSTANTE: el compilador la calcula en tiempo de compilación y el resultado va al String pool (por eso == con otro literal igual da true).']);
        return n.cv;
      }
      switch (n.k) {
        case 'lit': return n.cv;
        case 'name': return vals.get(n.b);
        case 'un': {
          const v = ev(n.e), T = n.t, t = n.e.t;
          if (n.op === '!') { const r = !v; if (n.e.k !== 'lit') step('op', txt(n), `!${show(v, t)} = ${r}`); return r; }
          const pv = conv(v, t, T);
          const r = n.op === '-' ? neg(pv, T) : n.op === '~' ? (T === 'long' ? BigInt.asIntN(64, ~pv) : ~pv) : pv;
          if (n.e.k !== 'lit' || t !== T) {
            const notes = [];
            if (t !== T) notes.push(`promoción unaria: ${t} → ${T} (los operadores unarios +, -, ~ también suben byte/short/char a int)`);
            if (n.op === '~') notes.push('~x invierte todos los bits. Truco: ~x == -x - 1');
            if (n.op === '-' && pv === r && (T === 'int' || T === 'long') && pv !== 0 && pv !== 0n) notes.push('⚠ -MIN_VALUE da MIN_VALUE otra vez (no existe el positivo equivalente)');
            step('op', txt(n), `${n.op}${show(pv, T)} = ${show(r, T)}  : ${T}`, notes);
          }
          return r;
        }
        case 'pre': case 'post': {
          const b = n.b, T = b.type, old = vals.get(b);
          const pt = bnp(T, 'int');
          const nv = conv(arith(n.op[0], conv(old, T, pt), conv(1, 'int', pt), pt), pt, T);
          vals.set(b, nv);
          const notes = [];
          const name = b.id;
          if (n.k === 'post') notes.push(`POST-${n.op === '++' ? 'incremento' : 'decremento'}: la expresión vale el valor ANTERIOR (${show(old, T)}) y DESPUÉS ${name} cambia a ${show(nv, T)}`);
          else notes.push(`PRE-${n.op === '++' ? 'incremento' : 'decremento'}: primero ${name} cambia a ${show(nv, T)} y la expresión vale el valor NUEVO`);
          if (SMALL.includes(T)) notes.push(`${name} es ${T}: ${n.op} incluye un cast implícito, equivale a ${name} = (${T})(${name} ${n.op[0]} 1). Por eso compila sin cast.`);
          if (isIntegral(T) && ((n.op === '++' && compare('<', nv, old)) || (n.op === '--' && compare('>', nv, old)))) notes.push(`⚠ Overflow: ${T} dio la vuelta al pasar su límite`);
          step('inc', txt(n), `${txt(n)} → expresión = ${show(n.k === 'post' ? old : nv, T)}  |  ${name}: ${show(old, T)} → ${show(nv, T)}`, notes, { changed: [b.uid] });
          return n.k === 'post' ? old : nv;
        }
        case 'cast': {
          const v = ev(n.e), from = n.e.t, to = n.to;
          const r = conv(v, from, to);
          let notes = [];
          if (from === to) notes.push('Cast al mismo tipo: no hace nada.');
          else if (WIDEN[from] && WIDEN[from].includes(to)) notes.push(`Ampliación (${from} → ${to}): no era necesario el cast, sería implícito.`);
          notes = notes.concat(narrowNotes(v, from, to, r));
          step('cast', txt(n), `(${to}) ${show(v, from)} = ${show(r, to)}`, notes);
          return r;
        }
        case 'bin': return evBin(n);
        case 'tern': {
          const c = ev(n.c);
          const br = c ? n.a : n.b;
          step('tern', txt(n), `condición = ${c} → se evalúa SOLO la rama ${c ? '"si" (después del ?)' : '"no" (después del :)'}: ${txt(br)}`, [`tipo del ternario: ${n.t}`]);
          const v = ev(br);
          if (n.t === 'Object') return { v, t: br.t };
          const r = conv(v, br.t, n.t);
          if (br.t !== n.t) step('tern', txt(n), `resultado ${show(v, br.t)} se convierte al tipo del ternario: ${show(r, n.t)}`, [`El ternario mezcla ${n.a.t} y ${n.b.t}, su tipo es ${n.t}: ¡aunque se elija una rama, el resultado tiene el tipo combinado!`]);
          return r;
        }
        case 'assign': return evAssign(n);
      }
    }

    function evBin(n) {
      const op = n.op, l = n.l, r = n.r;
      if (n.kind === 'sc') {
        const a = ev(l);
        if ((op === '&&' && !a) || (op === '||' && a)) {
          step('short', txt(n), `${txt(l)} es ${a} → ${op} hace CORTOCIRCUITO: ya se sabe que el resultado es ${a}`, [`El lado derecho (${txt(r)}) NO se evalúa. Si tenía ++, asignaciones, etc., ¡no ocurren!`]);
          return a;
        }
        const b = ev(r);
        const res2 = op === '&&' ? b : b;
        step('op', txt(n), `${a} ${op} ${b} = ${res2}`, [`El lado izquierdo fue ${a}, así que ${op} tuvo que evaluar también el derecho.`]);
        return res2;
      }
      const a = ev(l), b = ev(r);
      const lt = l.t, rt = r.t;
      if (n.kind === 'concat') {
        const s = new JStr(str(a, lt) + str(b, rt));
        const other = lt === 'String' ? rt : lt;
        const notes = [`Si uno de los operandos de + es String → CONCATENACIÓN. El ${other} se convierte a texto.`];
        if (other === 'char') notes.push('Un char se concatena como su carácter, no como su número.');
        if (l.k === 'bin' && isNum(lt)) notes.push(`Se evalúa de izquierda a derecha: ${txt(l)} se SUMÓ como número antes de encontrarse con el String.`);
        step('concat', txt(n), `${show(a, lt)} + ${show(b, rt)} = ${show(s, 'String')}`, notes);
        return s;
      }
      if (n.kind === 'logic') {
        const res2 = arith(op, a, b, 'boolean');
        step('op', txt(n), `${a} ${op} ${b} = ${res2}`, [`${op} con boolean NO hace cortocircuito: SIEMPRE evalúa ambos lados.`, op === '^' ? '^ (XOR) es true si los dos son distintos.' : null]);
        return res2;
      }
      if (n.kind === 'cmp' && n.pt === 'String') {
        const eq = a === b;
        const r2 = op === '==' ? eq : !eq;
        step('cmp', txt(n), `${show(a, lt)} ${op} ${show(b, rt)} = ${r2}`, ['Con objetos (String), == compara REFERENCIAS (¿es el mismo objeto en memoria?), no el contenido. Para contenido usa equals().', eq ? 'Son el MISMO objeto (literales/constantes van al String pool).' : (a && b && a.s === b.s ? '¡Mismo texto pero distintos objetos! Uno se creó en tiempo de ejecución.' : null)]);
        return r2;
      }
      const pt = n.pt;
      const notes = [];
      if (pt !== 'boolean' && n.kind !== 'shift' && (lt !== pt || rt !== pt)) {
        const parts = [];
        if (lt !== pt) parts.push(`izq ${lt} → ${pt}`);
        if (rt !== pt) parts.push(`der ${rt} → ${pt}`);
        notes.push(`Promoción numérica: ${parts.join(', ')}. Motivo: ${PROMO_WHY(lt, rt, pt)}.`);
      } else if (n.kind !== 'shift' && SMALL.includes(lt)) {
        notes.push(`¡Aunque ambos son ${lt}, se promueven a int!`);
      }
      const A = n.kind === 'shift' ? conv(a, lt, pt) : conv(a, lt, pt);
      const B = n.kind === 'shift' ? conv(b, rt, up(rt)) : conv(b, rt, pt);
      let out;
      try {
        if (n.kind === 'shift') {
          out = shift(op, A, B, pt, up(rt));
          if (lt !== pt) notes.push(`El operando izquierdo ${lt} se promueve a ${pt}; el tipo del resultado es el del izquierdo promovido (el derecho no influye).`);
          const d = shiftDist(B, up(rt), pt);
          if (String(d) !== String(B)) notes.push(`La distancia se toma módulo ${pt === 'long' ? 64 : 32}: ${show(B, up(rt))} → ${d}`);
          notes.push(op === '<<' ? `<< ${d} equivale a multiplicar por 2^${d} (si no desborda)` : op === '>>' ? '>> conserva el signo (rellena con el bit de signo)' : '>>> rellena con ceros: un negativo se vuelve positivo enorme');
        } else out = n.kind === 'cmp' ? compare(op, A, B) : arith(op, A, B, pt);
      } catch (e) {
        if (e instanceof JavaException) step('error', txt(n), `${show(A, pt)} ${op} ${show(B, pt)} → 💥 ${e.cls}: ${e.message}`, [e.why]);
        throw e;
      }
      if (n.kind === 'arith' && (pt === 'int' || pt === 'long') && ['+', '-', '*'].includes(op)) {
        const exact = op === '+' ? BigInt(A) + BigInt(B) : op === '-' ? BigInt(A) - BigInt(B) : BigInt(A) * BigInt(B);
        if (exact !== BigInt(out)) notes.push(`⚠ OVERFLOW: el resultado real (${exact}) no cabe en ${pt} [${pt === 'int' ? '-2147483648, 2147483647' : '±9.22e18'}]. No hay error: los bits "dan la vuelta" → ${out}`);
      }
      if (n.kind === 'arith' && op === '/' && isIntegral(pt) && arith('%', A, B, pt) != 0) notes.push(`División ENTERA (${pt}): se descarta la parte decimal, truncando hacia cero (no redondea).`);
      if (n.kind === 'arith' && op === '%' && (compare('<', A, conv(0, 'int', pt)) || compare('<', B, conv(0, 'int', pt)))) notes.push('El signo del resto (%) es SIEMPRE el del dividendo (el de la izquierda).');
      if (n.kind === 'arith' && (pt === 'float' || pt === 'double') && op === '/' && B === 0) notes.push('Punto flotante entre 0 NO lanza excepción: da Infinity, -Infinity o NaN (0.0/0).');
      if (n.kind === 'arith' && ['&', '|', '^'].includes(op)) notes.push(`Operación bit a bit sobre ${pt}: ${bitsOf(A, pt).slice(-16)} ${op} ${bitsOf(B, pt).slice(-16)} = ${bitsOf(out, pt).slice(-16)} (últimos 16 bits)`);
      if (n.kind === 'cmp' && (Number.isNaN(A) || Number.isNaN(B))) notes.push('NaN no es igual a nada, ni a sí mismo: toda comparación con NaN es false (salvo !=).');
      const tlabel = n.kind === 'cmp' ? 'boolean' : pt;
      step(n.kind === 'cmp' ? 'cmp' : 'op', txt(n), `${show(A, pt)} ${op} ${show(B, n.kind === 'shift' ? up(rt) : pt)} = ${show(out, tlabel)}  : ${tlabel}`, notes, { types: [lt, rt, tlabel] });
      return out;
    }

    function evAssign(n) {
      const b = n.b, T = b.type, name = b.id;
      if (n.op === '=') {
        const v = ev(n.e);
        const r = T === 'Object' ? { v, t: n.e.t } : conv(v, n.e.t, T);
        vals.set(b, r);
        const notes = [];
        if (n.e.t !== T) {
          const cn = convNote(n.e.t, T, v, r);
          if (cn) notes.push(cn);
          else notes.push(`${n.e.t} → ${T} sin cast: permitido porque es una CONSTANTE de compilación que cabe en el rango de ${T}.`);
        }
        step('assign', txt(n), `${name} = ${show(r, T)}`, notes, { changed: [b.uid] });
        return r;
      }
      const op = opName(n.op);
      const old = vals.get(b);
      const v = ev(n.e);
      const pt = n.pt;
      let res2, mid;
      if (pt === 'String') res2 = new JStr(str(old, T) + str(v, n.e.t));
      else {
        try {
          mid = pt === 'boolean' ? arith(op, old, v, 'boolean')
            : ['<<', '>>', '>>>'].includes(op) ? shift(op, conv(old, T, pt), conv(v, n.e.t, up(n.e.t)), pt, up(n.e.t))
              : arith(op, conv(old, T, pt), conv(v, n.e.t, pt), pt);
        } catch (e) {
          if (e instanceof JavaException) step('error', txt(n), `💥 ${e.cls}: ${e.message}`, [e.why]);
          throw e;
        }
        res2 = conv(mid, pt, T);
      }
      vals.set(b, res2);
      const notes = [`Asignación compuesta: ${name} ${n.op} expr  ≡  ${name} = (${T}) (${name} ${op} (expr)).`];
      if (pt !== T && pt !== 'String') notes.push(`La operación se hace en ${pt} = ${show(mid, pt)} y luego hay un CAST IMPLÍCITO a ${T} → ${show(res2, T)}. ¡Por eso compila aunque "${name} = ${name} ${op} ..." no compilaría!`);
      notes.push(`El valor de ${name} (${show(old, T)}) se leyó ANTES de evaluar el lado derecho.`);
      step('assign', txt(n), `${name}: ${show(old, T)} ${op} ${show(v, n.e.t)} → ${show(res2, T)}`, notes, { changed: [b.uid] });
      return res2;
    }

    function exec(n) {
      if (n.line) curLine = n.line;
      switch (n.k) {
        case 'empty': return;
        case 'block': {
          const mark = live.length;
          for (const s of n.body) exec(s);
          if (!n.top) {
            const gone = live.splice(mark);
            if (gone.length) step('scope', '}', `Fin del bloque: ${gone.map(g => g.id).join(', ')} deja(n) de existir`, ['Las variables declaradas dentro de { } solo viven dentro de ese bloque.']);
          }
          return;
        }
        case 'if': {
          const c = ev(n.cond);
          step('if', 'if (' + txt(n.cond) + ')', `condición = ${c} → ${c ? 'entra al if' : n.els ? 'va al else' : 'se salta el if'}`);
          if (c) exec(n.then); else if (n.els) exec(n.els);
          return;
        }
        case 'decl': {
          for (const d of n.decls) {
            curLine = d.line;
            live.push(d.b);
            if (!d.init) { step('decl', `${n.type} ${d.id};`, `Declara ${d.id} : ${d.b.type} (sin valor todavía)`, ['Una variable local sin inicializar no se puede leer hasta asignarle algo.'], { changed: [d.b.uid] }); continue; }
            const v = ev(d.init);
            const r = d.b.type === 'Object' ? { v, t: d.init.t } : conv(v, d.init.t, d.b.type);
            vals.set(d.b, r);
            const notes = [];
            if (n.type === 'var') notes.push(`var infiere el tipo del valor inicial → ${d.b.type}`);
            if (n.fin) notes.push('final: ya no se puede reasignar.' + (d.b.cv !== undefined ? ' Además es CONSTANTE de compilación (final + inicializada con constante).' : ''));
            if (d.init.t !== d.b.type) {
              const cn = convNote(d.init.t, d.b.type, v, r);
              notes.push(cn || `${d.init.t} → ${d.b.type} sin cast: permitido porque ${txt(d.init)} es una CONSTANTE de compilación que cabe en el rango de ${d.b.type} [${RANGE[d.b.type][0]}, ${RANGE[d.b.type][1]}].`);
            }
            step('decl', `${n.type} ${d.id} = ${txt(d.init)}`, `${d.b.type} ${d.id} = ${show(r, d.b.type)}`, notes, { changed: [d.b.uid] });
          }
          return;
        }
        case 'print': {
          const s = n.e ? str(ev(n.e), n.e.t) : '';
          outBuf += s + (n.ln ? '\n' : '');
          const notes = [];
          if (n.e && n.e.t === 'char') notes.push('println(char) imprime el CARÁCTER, no su número.');
          if (n.e && (n.e.t === 'float' || n.e.t === 'double') && !/[.EN]/.test(s.replace('Infinity', 'N'))) notes.push('');
          step('print', `System.out.${n.ln ? 'println' : 'print'}(${n.e ? txt(n.e) : ''})`, `Imprime: ${s === '' ? '(línea vacía)' : s}`, notes);
          return;
        }
        case 'expr': ev(n.e); return;
      }
    }

    try {
      exec(prog.ast);
      res.ok = true;
    } catch (e) {
      if (e instanceof JavaException) {
        outBuf += `Exception in thread "main" ${e.cls}: ${e.message}\n`;
        res.phase = 'runtime';
        res.error = { msg: `${e.cls}: ${e.message}`, line: curLine, why: e.why };
      } else { res.phase = 'runtime'; res.error = { msg: 'Error interno: ' + e.message, line: curLine }; }
    }
    res.out = outBuf;
    res.vars = prog.bindings.filter(b => b.type).map(b => ({ id: b.id, type: b.type, fin: b.fin, value: vals.has(b) ? show(vals.get(b), b.type) : '—', raw: vals.get(b), has: vals.has(b) }));
    return res;
  }

  // Tipo estático de una variable (para juegos)
  function typeOf(src, id) {
    try {
      const p = compile(src);
      const b = p.bindings.filter(x => x.id === id).pop();
      return { ok: true, type: b ? b.type : null };
    } catch (e) {
      return { ok: false, error: e.message, why: e.why, line: e.line };
    }
  }

  const API = { run, compile, typeOf, lex, conv, bitsOf, show, str, javaFloat, javaDouble, charLit, isNum, isIntegral, bnp, up, WIDEN, RANGE, BITS, NUMERIC, PRIMS, CompileError };
  root.JavaEngine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
