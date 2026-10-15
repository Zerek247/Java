/* Pestaña "Bits": convertidor decimal/binario/hex/octal por tipo Java, con bits clicables y calculadora de bits */
(function () {
  'use strict';
  const { h, md, esc, tchip, highlight } = window.UI;
  const J = window.JavaEngine;
  const INT_T = ['byte', 'short', 'char', 'int', 'long'];
  const ALL_T = [...INT_T, 'float', 'double'];
  const W = t => J.BITS[t];
  const signed = t => t !== 'char';
  const toSigned = (u, t) => (signed(t) ? BigInt.asIntN(W(t), u) : BigInt.asUintN(W(t), u));
  const group = (s, n = 4) => s.replace(new RegExp(`(.{${n}})(?=.)`, 'g'), '$1 ');
  const sup = n => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d] || d).join('');

  function BitsTool(root, opts = {}) {
    // Estado: tipo + bits sin signo (BigInt) para enteros; para float/double, el valor numérico
    let st = { t: 'byte', u: 200n, f: 3.14 };
    const view = h('div');

    // ── Campos de entrada ──
    const field = (label, ph, prefix) => {
      const inp = h('input', { class: 'answer-input mono', placeholder: ph, spellcheck: 'false', autocomplete: 'off' });
      const err = h('div', { class: 'bit-err' });
      return { inp, err, el: h('label', { class: 'bit-field' }, h('span', { class: 'mem-title' }, label), h('div', { class: 'bit-inp' }, prefix ? h('span', { class: 'bit-prefix' }, prefix) : null, inp), err) };
    };
    const fDec = field('Decimal', 'ej. -56', null), fBin = field('Binario', 'ej. 11001000', '0b'), fHex = field('Hexadecimal', 'ej. C8', '0x'), fOct = field('Octal', 'ej. 310', '0');
    const fFloat = field('Valor decimal', 'ej. 3.14', null);
    const typeBtns = h('div', { class: 'type-btns' });
    const fields = h('div', { class: 'bit-fields' });

    function parseInto(kind, raw) {
      const t = st.t;
      raw = raw.trim().replace(/_/g, '');
      if (!raw) return 'Escribe un número';
      try {
        if (kind === 'dec') {
          if (!/^[-+]?\d+$/.test(raw)) return 'Solo dígitos (y un signo -)';
          const v = BigInt(raw);
          const lo = signed(t) ? -(1n << BigInt(W(t) - 1)) : 0n, hi = signed(t) ? (1n << BigInt(W(t) - 1)) - 1n : (1n << 16n) - 1n;
          st.u = BigInt.asUintN(W(t), v);
          st.overflow = v < lo || v > hi ? { v, lo, hi } : null;
          return null;
        }
        const re = { bin: /^[01]+$/, hex: /^[0-9a-fA-F]+$/, oct: /^[0-7]+$/ }[kind];
        if (!re.test(raw)) return { bin: 'Solo 0 y 1', hex: 'Solo 0-9 y A-F', oct: 'Solo dígitos 0-7' }[kind];
        const v = BigInt({ bin: '0b', hex: '0x', oct: '0o' }[kind] + raw);
        st.overflow = v >= 1n << BigInt(W(t)) ? { cut: true, v } : null;
        st.u = BigInt.asUintN(W(t), v);
        return null;
      } catch (e) { return 'Número no válido'; }
    }
    function bindInt(f, kind) {
      f.inp.addEventListener('input', () => {
        const e = parseInto(kind, f.inp.value);
        f.err.textContent = e || '';
        if (!e) draw(f.inp);
      });
    }
    bindInt(fDec, 'dec'); bindInt(fBin, 'bin'); bindInt(fHex, 'hex'); bindInt(fOct, 'oct');
    fFloat.inp.addEventListener('input', () => {
      const raw = fFloat.inp.value.trim().replace(/_/g, '').replace(/[fFdD]$/, '');
      const n = raw === 'NaN' ? NaN : /^-?Infinity$/.test(raw) ? Number(raw) : Number(raw);
      if (raw === '' || (Number.isNaN(n) && raw !== 'NaN')) { fFloat.err.textContent = 'Escribe un número (ej. 0.1, -2.5, 1e10, NaN, Infinity)'; return; }
      fFloat.err.textContent = '';
      st.f = st.t === 'float' ? Math.fround(n) : n;
      draw(fFloat.inp);
    });

    // ── Bits de float/double ──
    function floatBits(t, v) { return J.bitsOf(v, t); }
    function floatFromBits(t, bits) {
      const dv = new DataView(new ArrayBuffer(8));
      if (t === 'float') { dv.setUint32(0, parseInt(bits, 2)); return dv.getFloat32(0); }
      dv.setBigUint64(0, BigInt('0b' + bits)); return dv.getFloat64(0);
    }

    function grid(bits, t, onFlip) {
      const n = bits.length, isF = t === 'float' || t === 'double', e = t === 'float' ? 8 : 11;
      const g = h('div', { class: 'bitgrid bitgrid-lg' });
      [...bits].forEach((b, idx) => {
        const pos = n - idx - 1;
        let cls = 'bit click' + (b === '1' ? ' one' : '');
        if (isF) cls += idx === 0 ? ' sign' : idx <= e ? ' exp' : ' man';
        else if (idx === 0 && signed(t)) cls += ' sign';
        if (pos % 8 === 0 && pos !== 0) cls += ' nib';
        const weight = isF ? '' : n <= 8 ? (idx === 0 && signed(t) ? '-' : '') + (1n << BigInt(pos)) : (idx === 0 && signed(t) ? `-2${sup(pos)}` : `2${sup(pos)}`);
        const c = h('div', { class: 'bit-col' }, h('div', { class: cls, title: `bit ${pos}` + (isF ? '' : ` · vale ${idx === 0 && signed(t) ? '-' : ''}${(1n << BigInt(pos)).toString()}`), onclick: () => onFlip(idx) }, b), n <= 16 && !isF ? h('div', { class: 'bit-w' }, weight) : null);
        g.append(c);
      });
      return g;
    }

    function draw(src) {
      const t = st.t;
      typeBtns.replaceChildren(...ALL_T.map(x => h('button', { class: 'type-btn t-' + x + (x === t ? ' active' : ''), onclick: () => switchType(x) }, x)));
      const isF = t === 'float' || t === 'double';
      fields.replaceChildren(...(isF ? [fFloat.el] : [fDec.el, fBin.el, fHex.el, fOct.el]));
      if (isF) return drawFloat(src);

      const u = st.u, v = toSigned(u, t), w = W(t);
      const bits = u.toString(2).padStart(w, '0');
      if (src !== fDec.inp) fDec.inp.value = v.toString();
      if (src !== fBin.inp) fBin.inp.value = bits;
      if (src !== fHex.inp) fHex.inp.value = u.toString(16).toUpperCase();
      if (src !== fOct.inp) fOct.inp.value = u.toString(8);
      [fDec, fBin, fHex, fOct].forEach(f => f !== null && src !== f.inp && (f.err.textContent = ''));

      const flip = idx => { const b = bits.split(''); b[idx] = b[idx] === '1' ? '0' : '1'; st.u = BigInt('0b' + b.join('')); st.overflow = null; draw(); };
      // Explicación por suma de pesos
      const terms = [];
      [...bits].forEach((b, idx) => { if (b === '1') { const pos = w - idx - 1; const val = 1n << BigInt(pos); terms.push(idx === 0 && signed(t) ? '-' + val : val.toString()); } });
      const sumTxt = terms.length ? terms.join(' + ').replace(/\+ -/g, '- ') + ' = ' + v : 'todos los bits en 0 = 0';
      const notes = [];
      if (st.overflow) {
        if (st.overflow.cut) notes.push(`⚠ Ese número necesita más de ${w} bits. Un ${t} solo guarda los <b>${w} bits más bajos</b>, así que el resto se descarta.`);
        else notes.push(`⚠ <b>${st.overflow.v}</b> no cabe en ${tchip(t)} [${st.overflow.lo}, ${st.overflow.hi}]. Se muestra lo que daría <code class="inl">(${t}) ${st.overflow.v}</code>: se conservan los ${w} bits bajos → <b>${v}</b>.`);
      }
      // Complemento a dos
      let twos = null;
      if (signed(t) && v < 0n) {
        const abs = -v;
        const absBits = BigInt.asUintN(w, abs).toString(2).padStart(w, '0');
        const inv = absBits.split('').map(c => (c === '1' ? '0' : '1')).join('');
        twos = h('div', { class: 'deep blk' }, h('span', { class: 'blk-label' }, '🔬 Complemento a dos: así se guarda un negativo'),
          h('div', { class: 'twos' },
            h('div', null, h('span', { class: 'muted' }, `1. ${abs} en binario`), h('code', null, group(absBits))),
            h('div', null, h('span', { class: 'muted' }, '2. Invierte todos los bits (~)'), h('code', null, group(inv))),
            h('div', null, h('span', { class: 'muted' }, `3. Súmale 1 → ${v}`), h('code', { class: 'hl' }, group(bits)))),
          h('p', { style: { marginTop: '8px' }, html: md('Por eso el bit más alto en 1 significa negativo, y por eso `~x == -x - 1`.') }));
      }
      // Casts a otros tipos
      const casts = h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, h('th', null, 'Si lo casteas a…'), h('th', null, 'Resultado'), h('th', null, 'Bits'), h('th', null, ''))),
        h('tbody', null, INT_T.map(x => {
          const r = toSigned(BigInt.asUintN(W(x), v), x);
          const same = r === v;
          return h('tr', null, h('td', { html: `<code class="inl">(${x})</code> ${tchip(x)}` }),
            h('td', { class: 'mono', style: { fontWeight: 700, color: same ? 'var(--text)' : 'var(--amber)' } }, x === 'char' ? `${r} ${J.charLit(Number(r))}` : r.toString() + (x === 'long' ? 'L' : '')),
            h('td', { class: 'mono muted', style: { fontSize: '12px' } }, group(BigInt.asUintN(W(x), v).toString(2).padStart(W(x), '0'), 8)),
            h('td', { style: { fontSize: '12px', color: same ? 'var(--green)' : 'var(--amber)' } }, x === t ? 'mismo tipo' : same ? '✓ cabe' : (W(x) < w ? '✂ corta bits' : '⚠ cambia el valor')));
        }))));
      // Literal Java
      const L = t === 'long' ? 'L' : '';
      const needCast = (t === 'byte' || t === 'short' || t === 'char');
      const fits = !needCast || (u < (1n << BigInt(w - (signed(t) ? 1 : 0))));
      const lits = [`${t} x = ${t === 'char' ? J.charLit(Number(v)) : v + L};`, `${t} x = ${needCast && !fits ? `(${t}) ` : ''}0b${group(bits, 4).replace(/ /g, '_')}${L};`, `${t} x = ${needCast && !fits ? `(${t}) ` : ''}0x${u.toString(16).toUpperCase()}${L};`];
      if (t === 'int' && v < 0n) lits.push(`// 0x${u.toString(16).toUpperCase()} es un literal int válido aunque "parezca" positivo`);
      if (needCast && !fits) lits.push(`// en ${t} hace falta el cast: 0x${u.toString(16).toUpperCase()} = ${u} como int no cabe`);

      view.replaceChildren(
        h('div', { class: 'card' },
          h('div', { class: 'row', style: { alignItems: 'baseline', marginBottom: '6px' } }, h('span', { class: 'mem-title', style: { margin: 0 } }, `🧬 ${w} bits de ${t} — toca un bit para cambiarlo`), h('span', { class: 'spacer' }),
            h('button', { class: 'btn sm ghost', onclick: () => { st.u = 0n; st.overflow = null; draw(); } }, '0'),
            h('button', { class: 'btn sm ghost', onclick: () => { st.u = (1n << BigInt(w)) - 1n; st.overflow = null; draw(); } }, 'todo a 1'),
            signed(t) ? h('button', { class: 'btn sm ghost', onclick: () => { st.u = (1n << BigInt(w - 1)) - 1n; st.overflow = null; draw(); } }, 'MAX') : h('button', { class: 'btn sm ghost', onclick: () => { st.u = (1n << BigInt(w)) - 1n; st.overflow = null; draw(); } }, 'MAX'),
            signed(t) ? h('button', { class: 'btn sm ghost', onclick: () => { st.u = 1n << BigInt(w - 1); st.overflow = null; draw(); } }, 'MIN') : null,
            h('button', { class: 'btn sm ghost', title: 'complemento ~x', onclick: () => { st.u = BigInt.asUintN(w, ~st.u); st.overflow = null; draw(); } }, '~ invertir'),
            h('button', { class: 'btn sm ghost', onclick: () => { st.u = BigInt.asUintN(w, st.u << 1n); st.overflow = null; draw(); } }, '<< 1'),
            h('button', { class: 'btn sm ghost', onclick: () => { st.u = BigInt.asUintN(w, signed(t) ? BigInt.asIntN(w, st.u) >> 1n : st.u >> 1n); st.overflow = null; draw(); } }, '>> 1')),
          grid(bits, t, flip),
          h('div', { class: 'row', style: { marginTop: '14px', alignItems: 'baseline', gap: '16px' } },
            h('span', { class: 'bigval grad-text' }, v.toString() + (t === 'char' ? ' ' + J.charLit(Number(v)) : '')),
            h('span', { html: tchip(t) }),
            signed(t) && v < 0n ? h('span', { class: 'muted mono', style: { fontSize: '13px' } }, `sin signo sería ${u}`) : null),
          h('div', { class: 'bit-sum mono' }, sumTxt),
          notes.map(n => h('div', { class: 'trap blk', html: n })),
          signed(t) ? h('p', { class: 'muted', style: { fontSize: '13px', margin: '6px 0 0' }, html: 'El <b style="color:var(--pink)">bit de signo</b> (el de la izquierda) vale <b>negativo</b>: −2' + sup(w - 1) + '. Los demás suman su potencia de 2.' }) : h('p', { class: 'muted', style: { fontSize: '13px', margin: '6px 0 0' } }, 'char no tiene signo: los 16 bits suman en positivo (0 … 65535).')),
        twos,
        h('div', { class: 'grid2', style: { marginTop: '16px' } },
          h('div', { class: 'card' }, h('div', { class: 'mem-title' }, '🔁 ¿Qué pasa si lo casteo?'), casts),
          h('div', { class: 'card' }, h('div', { class: 'mem-title' }, '✍️ Cómo se escribe en Java'), h('div', { class: 'code-blk' }, h('pre', { html: highlight(lits.join('\n')) })),
            opts.popup ? null : h('button', { class: 'btn sm', style: { marginTop: '10px' }, onclick: () => window.App.openLab(`${t} x = ${needCast && !fits ? `(${t}) ` : ''}0b${group(bits, 4).replace(/ /g, '_')}${L};\nSystem.out.println(x);\nSystem.out.println(${t === 'char' ? '(int) x' : '~x'});`) }, '🧪 Probarlo en el Lab'))));
    }

    function drawFloat(src) {
      const t = st.t, v = st.f, bits = floatBits(t, v), e = t === 'float' ? 8 : 11, bias = t === 'float' ? 127 : 1023;
      if (src !== fFloat.inp) fFloat.inp.value = t === 'float' ? J.javaFloat(v) : J.javaDouble(v);
      const s = bits[0], ex = bits.slice(1, 1 + e), m = bits.slice(1 + e);
      const E = parseInt(ex, 2);
      const flip = idx => { const b = bits.split(''); b[idx] = b[idx] === '1' ? '0' : '1'; st.f = floatFromBits(t, b.join('')); draw(); };
      let formula;
      if (E === 0 && !/1/.test(m)) formula = `exponente y mantisa en 0 → ${s === '1' ? '-' : ''}0.0`;
      else if (E === (1 << e) - 1) formula = /1/.test(m) ? 'exponente todo a 1 y mantisa ≠ 0 → NaN' : `exponente todo a 1 y mantisa 0 → ${s === '1' ? '-' : ''}Infinity`;
      else if (E === 0) formula = `subnormal: (-1)^${s} × 0.mantisa × 2^${1 - bias}`;
      else formula = `(-1)^${s} × 1.${m.replace(/0+$/, '') || '0'}₂ × 2^(${E} − ${bias}) = ${s === '1' ? '-' : ''}1.${m.replace(/0+$/, '') || '0'}₂ × 2^${E - bias}`;
      const exact = t === 'float' ? Math.fround(v) : v;
      view.replaceChildren(h('div', { class: 'card' },
        h('div', { class: 'mem-title' }, `🧬 ${bits.length} bits IEEE 754 de ${t} — toca un bit`),
        grid(bits, t, flip),
        h('div', { class: 'row muted', style: { fontSize: '12.5px', marginTop: '8px', gap: '14px' } },
          h('span', { html: '<span class="bit sign" style="display:inline-grid;width:16px;height:16px;font-size:9px">s</span> signo (1 bit)' }),
          h('span', { html: `<span class="bit exp" style="display:inline-grid;width:16px;height:16px;font-size:9px">e</span> exponente (${e} bits, sesgo ${bias})` }),
          h('span', { html: `<span class="bit man" style="display:inline-grid;width:16px;height:16px;font-size:9px">m</span> mantisa (${bits.length - 1 - e} bits)` })),
        h('div', { class: 'row', style: { marginTop: '14px', alignItems: 'baseline', gap: '16px' } }, h('span', { class: 'bigval grad-text' }, t === 'float' ? J.javaFloat(v) : J.javaDouble(v)), h('span', { html: tchip(t) })),
        h('div', { class: 'bit-sum mono' }, formula),
        Number.isFinite(exact) && exact !== 0 && Math.abs(exact) < 1e21 ? h('p', { class: 'muted', style: { fontSize: '13px', marginTop: '8px' }, html: `Valor <b>exacto</b> guardado en memoria: <code class="inl">${esc(exactDecimal(exact))}</code>${(t === 'float' ? J.javaFloat(v) : J.javaDouble(v)).replace(/E.*/, '') !== exactDecimal(exact) ? ' — Java imprime la versión corta, pero en binario casi ningún decimal es exacto (por eso 0.1 + 0.2 ≠ 0.3).' : ''}` }) : null),
        h('div', { class: 'tip blk' }, h('span', { class: 'blk-label' }, '💡 Para probar'), h('p', { html: md('Escribe `0.1` y mira que la mantisa nunca termina: no es exacto. Prueba `1`, `2`, `0.5`, `-0`, `NaN` e `Infinity`, o enciende todo el exponente a 1.') })));
    }
    function exactDecimal(x) {
      // decimal exacto del double (todos los binarios finitos tienen expansión decimal finita)
      let s = x.toFixed(Math.min(100, Math.max(0, 52 - Math.floor(Math.log2(Math.abs(x))))));
      if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '.0');
      return s.length > 60 ? s.slice(0, 60) + '…' : s;
    }
    function switchType(x) {
      if (x === st.t) return;
      const wasF = st.t === 'float' || st.t === 'double', isF = x === 'float' || x === 'double';
      if (!wasF && isF) st.f = Number(toSigned(st.u, st.t));
      else if (wasF && !isF) st.u = BigInt.asUintN(W(x), BigInt(Math.trunc(Number.isFinite(st.f) ? st.f : 0)));
      else if (!wasF) st.u = BigInt.asUintN(W(x), toSigned(st.u, st.t));
      else if (isF) st.f = x === 'float' ? Math.fround(st.f) : st.f;
      st.t = x; st.overflow = null;
      draw();
    }

    // ── Calculadora de bits (con el motor de Java) ──
    const calc = (() => {
      let ct = 'int', op = '&';
      const a = h('input', { class: 'answer-input mono', value: '12' }), b = h('input', { class: 'answer-input mono', value: '10' });
      const out = h('div');
      const tsel = h('div', { class: 'type-btns' }), osel = h('div', { class: 'type-btns' });
      const OPS = ['&', '|', '^', '~', '<<', '>>', '>>>'];
      function run() {
        tsel.replaceChildren(...['int', 'long'].map(x => h('button', { class: 'type-btn t-' + x + (x === ct ? ' active' : ''), onclick: () => { ct = x; run(); } }, x)));
        osel.replaceChildren(...OPS.map(x => h('button', { class: 'type-btn' + (x === op ? ' active' : ''), style: { '--tc': 'var(--pink)' }, onclick: () => { op = x; run(); } }, x)));
        b.disabled = op === '~';
        const L = ct === 'long' ? 'L' : '';
        const code = `${ct} a = ${a.value.trim() || 0}${L && !/[lL]$/.test(a.value.trim()) ? L : ''};\n${ct} b = ${b.value.trim() || 0}${L && !/[lL]$/.test(b.value.trim()) ? L : ''};\nvar r = ${op === '~' ? '~a' : 'a ' + op + ' b'};\nSystem.out.println(r);`;
        const res = J.run(code);
        if (res.phase === 'compile') { out.replaceChildren(h('div', { class: 'trap blk' }, h('p', null, 'Revisa los números: ', h('code', { class: 'inl' }, res.error.msg.split('\n')[0])))); return; }
        const va = res.vars.find(x => x.id === 'a'), vb = res.vars.find(x => x.id === 'b'), vr = res.vars.find(x => x.id === 'r');
        const row = (lbl, v, cls) => h('div', { class: 'calc-row ' + (cls || '') }, h('span', { class: 'mono calc-lbl' }, lbl), h('span', { class: 'mono calc-bits' }, group(J.bitsOf(v.raw, v.type), 8)), h('span', { class: 'mono calc-val' }, v.value));
        const step = res.steps.find(s => s.kind === 'op');
        out.replaceChildren(
          row('a', va), op !== '~' ? row('b' + (['<<', '>>', '>>>'].includes(op) ? ' (distancia)' : ''), vb) : null,
          h('div', { class: 'calc-row sep' }, h('span', { class: 'mono calc-lbl', style: { color: 'var(--pink)' } }, op === '~' ? '~a' : 'a ' + op + ' b')),
          row('=', vr, 'res'),
          step && step.notes.length ? h('ul', { class: 'stp-notes', style: { marginTop: '10px' } }, step.notes.map(n => h('li', { html: md(n) }))) : null,
          opts.popup ? null : h('button', { class: 'btn sm', style: { marginTop: '10px' }, onclick: () => window.App.openLab(code) }, '🧪 Ver paso a paso en el Lab'));
      }
      a.addEventListener('input', run); b.addEventListener('input', run);
      run();
      return h('div', { class: 'card', style: { marginTop: '16px' } },
        h('div', { class: 'mem-title' }, '🧮 Calculadora de bits — así lo calcula Java'),
        h('div', { class: 'row', style: { alignItems: 'flex-end', gap: '14px' } },
          h('label', { class: 'bit-field' }, h('span', { class: 'mem-title' }, 'a'), a),
          h('label', { class: 'bit-field' }, h('span', { class: 'mem-title' }, 'b'), b),
          h('div', null, h('div', { class: 'mem-title' }, 'tipo'), tsel),
          h('div', null, h('div', { class: 'mem-title' }, 'operador'), osel)),
        h('div', { class: 'calc-out' }, out));
    })();

    root.replaceChildren(
      h('div', { class: 'tip', style: { marginBottom: '16px' } }, h('span', { class: 'blk-label' }, '🔢 Cómo usarlo'), h('p', { html: md('Escribe en **cualquier** campo (decimal, binario, hex u octal) y los demás se actualizan. Toca los bits para encenderlos o apagarlos y mira cómo cambia el número. Escribe un número que **no cabe** (ej. `300` en byte) para ver qué haría un cast.') })),
      h('div', { class: 'card', style: { marginBottom: '16px' } },
        h('div', { class: 'mem-title' }, 'Tipo'), typeBtns,
        h('div', { style: { marginTop: '14px' } }, fields)),
      view, calc);
    draw();
  }

  // ── Panel flotante: se crea una vez y conserva su estado entre aperturas ──
  let pop = null, fab = null;
  function ensure() {
    if (pop) return pop;
    const body = h('div', { class: 'bits-pop-body' });
    pop = h('aside', { class: 'bits-pop', role: 'dialog', 'aria-label': 'Convertidor de bits' },
      h('div', { class: 'bits-pop-head' },
        h('div', null, h('b', null, '🔢 Convertidor de bits'), h('div', { class: 'muted', style: { fontSize: '12px' } }, 'Tu ejercicio sigue ahí detrás · Esc para cerrar')),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn sm ghost', 'aria-label': 'Cerrar', onclick: () => close() }, '✕')),
      body);
    document.body.append(pop);
    BitsTool(body, { popup: true });
    return pop;
  }
  function open() { ensure().classList.add('open'); document.body.classList.add('bits-open'); }
  function close() { if (pop) pop.classList.remove('open'); document.body.classList.remove('bits-open'); }
  function toggle() { pop && pop.classList.contains('open') ? close() : open(); }
  fab = h('button', { class: 'bits-fab', title: 'Convertidor de bits (tecla B)', onclick: toggle }, '🔢', h('span', null, 'Bits'));
  document.body.append(fab);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('bits-open')) close();
    const tag = (e.target.tagName || '').toLowerCase();
    if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'input' && tag !== 'textarea' && tag !== 'select' && document.body.classList.contains('in-ops')) toggle();
  });

  window.BitsTool = BitsTool;
  window.BitsPopup = { open, close, toggle };
})();
