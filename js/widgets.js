/* Widgets interactivos que viven dentro de la teoría */
(function () {
  'use strict';
  const { h, md, tchip, esc } = window.UI;
  const J = window.JavaEngine;
  const NUMS = ['byte', 'short', 'char', 'int', 'long', 'float', 'double'];
  const INIT = { byte: '1', short: '2', char: "'A'", int: '3', long: '4L', float: '1.5f', double: '2.5', boolean: 'true', String: '"hi"' };

  // Barras de tamaño de cada tipo
  function sizes() {
    const info = {
      byte: ['-128', '127'], short: ['-32768', '32767'], char: ["0 ('\\u0000')", "65535 ('\\uffff')"], int: ['-2147483648', '2147483647'],
      long: ['-9223372036854775808', '9223372036854775807'], float: ['±1.4E-45 (mín. positivo)', '±3.4028235E38'], double: ['±4.9E-324 (mín. positivo)', '±1.7976931348623157E308'], boolean: ['false', 'true']
    };
    const detail = h('div', { class: 'blk', style: { minHeight: '58px' } });
    const rows = Object.keys(info).map(t => {
      const bits = J.BITS[t];
      const row = h('button', { class: 'row', style: { width: '100%', background: 'none', border: 0, padding: '5px 0', gap: '12px', flexWrap: 'nowrap' }, onclick: () => pick(t, row) },
        h('span', { style: { width: '74px', textAlign: 'left' }, html: tchip(t) }),
        h('span', { style: { flex: 1, height: '22px', borderRadius: '6px', background: 'var(--line)', overflow: 'hidden', position: 'relative' } },
          h('i', { class: 't-' + t, style: { display: 'block', height: '100%', width: (t === 'boolean' ? 1.5 : bits / 64 * 100) + '%', background: 'var(--tc)', opacity: .75, borderRadius: '6px', transition: 'width .5s' } })),
        h('span', { class: 'mono muted', style: { width: '70px', textAlign: 'right', fontSize: '13px' } }, t === 'boolean' ? '1 bit*' : bits + ' bits'));
      return row;
    });
    function pick(t, row) {
      rows.forEach(r => (r.style.opacity = r === row ? 1 : .55));
      const [lo, hi] = info[t];
      detail.innerHTML = `<div class="tip"><span class="blk-label">${esc(t)}</span><p>Mínimo: <code class="inl">${esc(lo)}</code> · Máximo: <code class="inl">${esc(hi)}</code>${t === 'boolean' ? '<br><span class="muted">*El tamaño real de boolean depende de la JVM; para el examen solo importa que no es numérico.</span>' : t === 'char' ? '<br>Mismo tamaño que short, pero <b>sin signo</b>: por eso ninguno cabe en el otro.' : (t === 'float' || t === 'double') ? '<br>Formato IEEE 754: signo + exponente + mantisa. Rango enorme, pero precisión limitada.' : ''}</p></div>`;
    }
    return h('div', { class: 'card' }, h('div', { class: 'mem-title' }, '📏 Tamaño de cada caja — toca un tipo'), rows, detail);
  }

  // Tabla de verdad con interruptores
  function truth() {
    let A = true, B = false;
    const out = h('div', { class: 'tt' });
    const ta = h('button', { class: 'tog', onclick: () => { A = !A; draw(); } });
    const tb = h('button', { class: 'tog', onclick: () => { B = !B; draw(); } });
    function draw() {
      ta.className = 'tog ' + (A ? 'on' : 'off'); ta.textContent = 'A = ' + A;
      tb.className = 'tog ' + (B ? 'on' : 'off'); tb.textContent = 'B = ' + B;
      const cells = [
        ['A && B', A && B, A ? 'evaluó B' : '⚡ B NO se evaluó'],
        ['A || B', A || B, A ? '⚡ B NO se evaluó' : 'evaluó B'],
        ['A & B', A && B, 'evaluó ambos'],
        ['A | B', A || B, 'evaluó ambos'],
        ['A ^ B', A !== B, 'true si son distintos'],
        ['!A', !A, 'invierte']
      ];
      out.replaceChildren(...cells.map(([e, v, n]) => h('div', { class: 'tt-cell' }, e, h('b', { style: { color: v ? 'var(--lime)' : 'var(--red)' } }, String(v)), h('span', { class: 'muted', style: { fontSize: '11.5px', color: n.startsWith('⚡') ? 'var(--amber)' : '' } }, n))));
    }
    draw();
    return h('div', { class: 'card' }, h('div', { class: 'mem-title' }, '🔀 Tabla de verdad interactiva — cambia A y B'), h('div', { class: 'row', style: { marginBottom: '14px' } }, ta, tb), out);
  }

  // Calculadora de promoción
  function promo() {
    let ta = 'byte', tb = 'short', op = '+';
    const opsList = ['+', '-', '*', '/', '%', '<<', '&', '>', '=='];
    const res = h('div');
    const mkSel = (vals, cur, fn) => { const s = h('select', { class: 'sel', onchange: e => fn(e.target.value) }, vals.map(v => h('option', { value: v, selected: v === cur }, v))); return s; };
    const rules = [1, 2, 3, 4].map(n => h('div', { class: 'tt-cell', style: { textAlign: 'left', fontFamily: 'var(--font)', fontWeight: 500, fontSize: '13px', transition: 'all .2s' } }));
    const RT = ['', 'Distintos tipos → el menor sube al mayor', 'Entero + decimal → el entero se vuelve decimal', 'byte/short/char → int siempre', 'El resultado tiene el tipo promovido'];
    function draw() {
      const code = `${ta} a = ${INIT[ta]};\n${tb} b = ${INIT[tb]};\nvar r = a ${op} b;`;
      const r = J.typeOf(code, 'r');
      const applied = new Set();
      let expl = '';
      if (!r.ok) expl = `<span style="color:var(--red)">✗ No compila:</span> <code class="inl">${esc(r.error.split('\n')[0])}</code><br>${md(r.why || '')}`;
      else if (op === '<<') { expl = `En los desplazamientos cada operando se promueve <b>por separado</b> y el resultado es el tipo del <b>izquierdo</b> promovido: ${tchip(ta)} → ${tchip(J.up(ta))}. El tipo de b no influye.`; if (J.up(ta) !== ta) applied.add(3); }
      else {
        const pt = J.bnp(ta, tb);
        const small = ['byte', 'short', 'char'];
        if (ta !== tb) applied.add(1);
        if ((J.isIntegral(ta) && !J.isIntegral(tb)) || (!J.isIntegral(ta) && J.isIntegral(tb))) applied.add(2);
        if (small.includes(ta) || small.includes(tb)) { if (pt === 'int') applied.add(3); }
        applied.add(4);
        const conv = [ta !== pt ? `a: ${tchip(ta)} → ${tchip(pt)}` : null, tb !== pt ? `b: ${tchip(tb)} → ${tchip(pt)}` : null].filter(Boolean);
        expl = (conv.length ? 'Antes de operar: ' + conv.join(' &nbsp; ') : 'Ambos ya son ' + tchip(pt) + ': no hace falta promover.') +
          (r.type === 'boolean' ? `<br>Se comparan como ${tchip(pt)} y el resultado de la comparación es ${tchip('boolean')}.` : '');
      }
      rules.forEach((el, i) => {
        const on = applied.has(i + 1);
        el.style.borderColor = on ? 'var(--cyan)' : 'var(--line)';
        el.style.background = on ? 'rgba(34,211,238,.1)' : '';
        el.style.opacity = on ? 1 : .5;
        el.innerHTML = `<b style="display:inline;font-size:13px;color:${on ? 'var(--cyan)' : 'var(--muted)'}">Regla ${i + 1}</b> ${on ? '✓' : ''}<br>${RT[i + 1]}`;
      });
      res.innerHTML = `<div class="calc-eq">${tchip(ta)} <span style="color:var(--pink)">${esc(op)}</span> ${tchip(tb)} <span class="muted">→</span> <span class="calc-res">${r.ok ? tchip(r.type) : '<span class="t t-none">✗ no compila</span>'}</span></div><p style="margin-top:10px">${expl}</p>`;
      lab.onclick = () => window.App.openLab(code + '\nSystem.out.println(r);');
    }
    const lab = h('button', { class: 'btn sm' }, '🧪 Abrir en el Lab');
    const card = h('div', { class: 'card calc' },
      h('div', { class: 'mem-title' }, '🧮 Calculadora de promoción — elige tipos y operador'),
      h('div', { class: 'row' }, 'a:', mkSel(NUMS, ta, v => { ta = v; draw(); }), 'operador:', mkSel(opsList, op, v => { op = v; draw(); }), 'b:', mkSel(NUMS, tb, v => { tb = v; draw(); }), lab),
      res, h('div', { class: 'tt' }, rules));
    draw();
    return card;
  }

  // Mapa de ampliación (widening)
  function widen() {
    const pos = { byte: [70, 150], short: [205, 150], int: [340, 150], long: [475, 150], float: [610, 150], double: [745, 150], char: [205, 50] };
    const edges = [['byte', 'short'], ['short', 'int'], ['char', 'int'], ['int', 'long'], ['long', 'float'], ['float', 'double']];
    const lossy = [['int', 'float'], ['long', 'double']];
    const NS = 'http://www.w3.org/2000/svg';
    const S = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const svg = S('svg', { viewBox: '0 0 820 230', role: 'img', 'aria-label': 'Mapa de conversiones de ampliación' });
    const defs = S('defs', {});
    const mk = S('marker', { id: 'arr', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
    mk.append(S('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#66729c' }));
    defs.append(mk); svg.append(defs);
    const W = 96, H = 44;
    edges.forEach(([a, b]) => {
      const [x1, y1] = pos[a], [x2, y2] = pos[b];
      let l;
      if (y1 === y2) l = S('line', { x1: x1 + W / 2, y1, x2: x2 - W / 2 - 2, y2, stroke: '#66729c', 'stroke-width': 2, 'marker-end': 'url(#arr)' });
      else l = S('line', { x1: x1 + 30, y1: y1 + H / 2, x2: x2 - 20, y2: y2 - H / 2 - 2, stroke: '#66729c', 'stroke-width': 2, 'marker-end': 'url(#arr)' });
      svg.append(l);
    });
    lossy.forEach(([a, b]) => {
      const [x1] = pos[a], [x2] = pos[b];
      svg.append(S('path', { d: `M${x1} ${150 + H / 2} Q ${(x1 + x2) / 2} ${225} ${x2} ${150 + H / 2 + 2}`, fill: 'none', stroke: '#fbbf24', 'stroke-width': 1.5, 'stroke-dasharray': '5 5', 'marker-end': 'url(#arr)', opacity: .7 }));
    });
    const tcol = t => getComputedStyle(document.documentElement).getPropertyValue('--t-' + t).trim() || '#22d3ee';
    const nodes = {};
    Object.entries(pos).forEach(([t, [x, y]]) => {
      const g = S('g', { class: 'wnode', tabindex: 0 });
      const r = S('rect', { x: x - W / 2, y: y - H / 2, width: W, height: H, rx: 12, fill: '#16213f', stroke: '#31417a', 'stroke-width': 2 });
      const tx = S('text', { x, y: y + 5, 'text-anchor': 'middle', fill: '#e8ecff' });
      tx.textContent = t;
      g.append(r, tx);
      g.addEventListener('click', () => pick(t));
      g.addEventListener('keydown', e => e.key === 'Enter' && pick(t));
      svg.append(g);
      nodes[t] = { r, tx };
    });
    const info = h('div', { class: 'blk', style: { minHeight: '50px' } });
    function pick(t) {
      const ok = J.WIDEN[t];
      Object.entries(nodes).forEach(([n, { r, tx }]) => {
        const c = n === t ? tcol(n) : ok.includes(n) ? '#34d399' : '#fb7185';
        r.setAttribute('stroke', c);
        r.setAttribute('fill', n === t ? '#2a2350' : ok.includes(n) ? 'rgba(52,211,153,.15)' : 'rgba(251,113,133,.1)');
        tx.setAttribute('fill', n === t ? tcol(n) : '#e8ecff');
      });
      const need = NUMS.filter(n => n !== t && !ok.includes(n));
      info.innerHTML = `<p>Desde ${tchip(t)} → <b style="color:var(--green)">implícito</b> (sin cast): ${ok.length ? ok.map(tchip).join(' ') : '<i class="muted">ninguno</i>'}<br><b style="color:var(--red)">necesita cast</b>: ${need.length ? need.map(tchip).join(' ') : '<i class="muted">ninguno</i>'}</p>` +
        (t === 'char' ? '<p class="muted">char no puede ir a short (ni a byte) implícitamente: short no tiene espacio para 32768..65535.</p>' : '') +
        (['byte', 'short'].includes(t) ? '<p class="muted">Ojo: ' + t + ' → char necesita cast aunque char tenga 16 bits: char no admite negativos.</p>' : '') +
        (['int', 'long'].includes(t) ? '<p class="muted">Las flechas amarillas punteadas = conversiones implícitas que pueden <b>perder precisión</b>.</p>' : '');
    }
    pick('int');
    return h('div', { class: 'card wmap' }, h('div', { class: 'mem-title' }, '🗺 Mapa de ampliación — toca un tipo de origen'), svg, info);
  }

  window.Widgets = { sizes, truth, promo, widen };
})();
