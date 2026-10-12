/* UI: utilidades de DOM, resaltado de sintaxis, editor, consola, depurador paso a paso y árbol de tipos */
(function () {
  'use strict';
  const J = window.JavaEngine;

  // ───────── DOM ─────────
  // replaceChildren/append aceptan arrays anidados e ignoran null/false (más cómodo para construir vistas)
  for (const m of ['replaceChildren', 'append']) {
    const orig = Element.prototype[m];
    Element.prototype[m] = function (...kids) { return orig.apply(this, kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false)); };
  }
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat(Infinity)) {
      if (k === null || k === undefined || k === false) continue;
      el.append(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return el;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tchip = t => `<span class="t t-${esc(t || 'none')}">${esc(t || '?')}</span>`;
  // Convierte `código` y [tipo] en HTML dentro de textos de contenido
  function md(s) {
    return String(s)
      .replace(/`([^`]+)`/g, (_, c) => `<code class="inl">${esc(c)}</code>`)
      .replace(/\[\[(byte|short|char|int|long|float|double|boolean|String|Object)\]\]/g, (_, t) => tchip(t))
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  // ───────── Resaltado de sintaxis ─────────
  const KW = new Set(['final', 'var', 'if', 'else', 'true', 'false', 'null', 'new', 'return', 'class', 'public', 'static', 'void', 'private', 'protected', 'instanceof', 'for', 'while', 'do', 'switch', 'case', 'break', 'default']);
  const TYPES = new Set(['byte', 'short', 'char', 'int', 'long', 'float', 'double', 'boolean', 'String']);
  const RX = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:\\.|[^"\\\n])*"?)|('(?:\\.|[^'\\\n])*'?)|((?:\b0[xX][0-9a-fA-F_]+|\b0[bB][01_]+|\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?|\.\d[\d_]*(?:[eE][+-]?\d+)?)[lLfFdD]?)|([A-Za-z_$][\w$]*)|([+\-*/%=&|^!~<>?:]+)|(\s+|.)/g;
  function hlTokens(code) {
    const toks = [];
    let m;
    RX.lastIndex = 0;
    while ((m = RX.exec(code))) {
      let cls = null;
      if (m[1]) cls = 'com'; else if (m[2]) cls = 'str'; else if (m[3]) cls = 'chr'; else if (m[4]) cls = 'num';
      else if (m[5]) cls = TYPES.has(m[5]) ? 'type' : KW.has(m[5]) ? 'kw' : /^[A-Z]/.test(m[5]) ? 'cls' : 'id';
      else if (m[6]) cls = 'op';
      toks.push([cls, m[0]]);
    }
    return toks;
  }
  function highlightLines(code) {
    const lines = [''];
    for (const [cls, text] of hlTokens(code)) {
      text.split('\n').forEach((part, i) => {
        if (i > 0) lines.push('');
        if (part) lines[lines.length - 1] += cls ? `<span class="hl-${cls}">${esc(part)}</span>` : esc(part);
      });
    }
    return lines;
  }
  const highlight = code => highlightLines(code).join('\n');

  // ───────── Editor ─────────
  function Editor(code, opts = {}) {
    const ta = h('textarea', { spellcheck: 'false', wrap: 'off', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Editor de código Java' });
    const pre = h('pre', { 'aria-hidden': 'true' });
    const gutter = h('div', { class: 'gutter' });
    const inner = h('div', { class: 'editor-inner' }, gutter, h('div', { class: 'ed-area' }, pre, ta));
    const el = h('div', { class: 'editor' }, opts.bar || null, inner);
    let active = 0, err = 0;
    ta.value = code;
    function render() {
      const lines = highlightLines(ta.value);
      pre.innerHTML = lines.map((l, i) => {
        const n = i + 1;
        const c = n === err ? 'ed-line err' : n === active ? 'ed-line active' : '';
        return c ? `<span class="${c}">${l || ' '}</span>` : l;
      }).join('\n') + '\n';
      gutter.innerHTML = lines.map((_, i) => `<div class="${i + 1 === err ? 'err' : i + 1 === active ? 'active' : ''}">${i + 1}</div>`).join('');
      ta.style.height = 'auto'; ta.style.width = 'auto';
      ta.style.height = Math.max(ta.scrollHeight, 300) + 'px';
      ta.style.width = Math.max(ta.scrollWidth, inner.clientWidth - 46) + 'px';
    }
    ta.addEventListener('input', () => { err = 0; active = 0; render(); opts.onChange && opts.onChange(ta.value); });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); opts.onRun && opts.onRun(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart;
        ta.setRangeText('    ', s, ta.selectionEnd, 'end');
        render();
      }
      if (e.key === 'Enter') { // auto-indentación
        const s = ta.selectionStart;
        const lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
        const indent = /^\s*/.exec(ta.value.slice(lineStart, s))[0] + (ta.value[s - 1] === '{' ? '    ' : '');
        e.preventDefault();
        ta.setRangeText('\n' + indent, s, ta.selectionEnd, 'end');
        render();
      }
    });
    requestAnimationFrame(render);
    return {
      el, ta,
      get value() { return ta.value; },
      set value(v) { ta.value = v; err = active = 0; render(); },
      setActive(n) { active = n; render(); },
      setError(n) { err = n; render(); },
      render
    };
  }

  // ───────── Bloques de salida ─────────
  function consoleBox(res) {
    const box = h('div', { class: 'console' });
    if (res.phase === 'compile') {
      box.innerHTML = `<span class="err">Main.java:${res.error.line}: error: ${esc(res.error.msg)}</span>\n<span class="err">1 error</span>\n<span style="color:var(--dim)">(no compila → no se ejecuta nada)</span>`;
    } else {
      let html = esc(res.out || '');
      if (res.phase === 'runtime') html = html.replace(/(Exception in thread[^\n]*)/, '<span class="err">$1</span>');
      if (!res.out) html = '<span style="color:var(--dim)">(el programa no imprimió nada)</span>';
      box.innerHTML = html;
    }
    return box;
  }
  function whyBox(res) {
    if (!res.error || !res.error.why) return null;
    return h('div', { class: (res.phase === 'compile' ? 'trap' : 'deep') + ' why' },
      h('span', { class: 'blk-label' }, res.phase === 'compile' ? '💡 Por qué no compila' : '💥 Qué pasó en ejecución'),
      h('p', { html: md(res.error.why) }));
  }
  const KIND_LABEL = { op: 'operación', cmp: 'compara', inc: '++ / --', cast: 'cast', assign: 'asigna', decl: 'declara', short: 'cortocircuito', print: 'imprime', error: 'excepción', concat: 'concat', tern: 'ternario', if: 'if', scope: 'bloque', const: 'constante' };
  function stepEl(s, i) {
    return h('div', { class: 'stp k-' + s.kind },
      h('div', { class: 'stp-top' }, h('span', { class: 'stp-kind' }, KIND_LABEL[s.kind] || s.kind), h('span', null, `#${i + 1} · línea ${s.line}`), h('span', { class: 'stp-code' }, s.code)),
      h('div', { class: 'stp-text' }, s.text),
      s.notes.length ? h('ul', { class: 'stp-notes' }, s.notes.map(n => h('li', { class: /^⚠/.test(n) ? 'warn' : '', html: md(n) }))) : null);
  }
  function stepsList(steps) {
    if (!steps.length) return h('div', { class: 'empty' }, 'No hay pasos que mostrar.');
    return h('div', { class: 'steps' }, steps.map(stepEl));
  }

  function bitsHtml(raw, type) {
    if (raw === undefined || type === 'String' || type === 'Object') return '';
    let b = J.bitsOf(raw, type);
    if (type === 'boolean') return '—';
    const groups = b.replace(/(.{8})(?=.)/g, '$1 ');
    return `<span class="sign">${groups[0]}</span>${groups.slice(1)}`;
  }
  function varsTable(vars) {
    if (!vars.length) return h('div', { class: 'empty' }, 'No hay variables.');
    return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl vars-tbl' },
      h('thead', null, h('tr', null, h('th', null, 'Variable'), h('th', null, 'Tipo'), h('th', null, 'Valor'), h('th', null, 'Bits en memoria'))),
      h('tbody', null, vars.map(v => h('tr', null,
        h('td', { class: 'mono' }, (v.fin ? 'final ' : '') + v.id),
        h('td', { html: tchip(v.type) + ` <span class="muted" style="font-size:11px">${J.BITS[v.type] ? J.BITS[v.type] + ' bits' : 'referencia'}</span>` }),
        h('td', { class: 'mono' }, v.value),
        h('td', { class: 'bits', html: v.has ? bitsHtml(v.raw, v.type) : '' }))))));
  }

  // ───────── Árbol de tipos ─────────
  function exprRoots(ast) {
    const roots = [];
    (function walk(n) {
      if (!n) return;
      switch (n.k) {
        case 'block': n.body.forEach(walk); break;
        case 'if': roots.push({ line: n.line, label: 'if (…)', e: n.cond }); walk(n.then); walk(n.els); break;
        case 'decl': n.decls.forEach(d => d.init && roots.push({ line: d.line, label: `${d.b.type} ${d.id} =`, e: d.init })); break;
        case 'print': n.e && roots.push({ line: n.line, label: 'println(…)', e: n.e }); break;
        case 'expr': roots.push({ line: n.line, label: 'sentencia', e: n.e }); break;
      }
    })(ast);
    return roots;
  }
  function treeNode(n, src) {
    const box = (kids, t, extra) => h('span', { class: 'tn t-' + t }, h('span', { class: 'tn-row' }, kids), h('span', { class: 'tn-type' }, t + (extra || '')));
    const op = o => h('span', { class: 'tn-op' }, o);
    const child = (c, target) => {
      const el = treeNode(c, src);
      if (target && target !== c.t && J.isNum(target) && J.isNum(c.t)) {
        el.append(h('span', { class: 'tn-promo' }, '↑ ' + target));
      }
      return el;
    };
    switch (n.k) {
      case 'lit': return box([h('span', { class: 'tn-leaf' }, n.named || src.slice(n.s, n.end))], n.t, n.cv !== undefined && n.parens ? '' : '');
      case 'name': return box([h('span', { class: 'tn-leaf' }, n.id)], n.t);
      case 'bin': {
        const tgt = n.kind === 'shift' ? null : n.pt;
        return box([child(n.l, n.kind === 'shift' ? n.pt : tgt), op(n.op), child(n.r, n.kind === 'shift' ? J.up(n.r.t) : tgt)], n.t);
      }
      case 'un': return box([op(n.op), child(n.e, n.op === '!' ? null : n.t)], n.t);
      case 'pre': return box([op(n.op), child(n.e)], n.t);
      case 'post': return box([child(n.e), op(n.op)], n.t);
      case 'cast': return box([op('(' + n.to + ')'), child(n.e)], n.t);
      case 'tern': return box([child(n.c), op('?'), child(n.a, n.t), op(':'), child(n.b, n.t)], n.t);
      case 'assign': return box([child(n.target), op(n.op), child(n.e)], n.t);
    }
    return h('span', null, '?');
  }
  function typeTree(res) {
    if (!res.prog) return h('div', { class: 'empty' }, 'Corrige el error de compilación para ver el árbol.');
    const roots = exprRoots(res.prog.ast);
    if (!roots.length) return h('div', { class: 'empty' }, 'No hay expresiones.');
    return h('div', null,
      h('p', { class: 'muted', style: { fontSize: '13px' }, html: 'Así ve el compilador cada expresión: cada caja es una sub-expresión con su <b>tipo</b> debajo. <span style="color:var(--amber)">↑ tipo</span> = ese operando se <b>promueve</b> antes de operar.' }),
      roots.map(r => h('div', { class: 'tree-stmt' }, h('div', { class: 'lbl' }, `línea ${r.line} · ${r.label}`), h('div', { class: 'tree-wrap' }, treeNode(r.e, res.prog.src)))));
  }

  // ───────── Depurador paso a paso ─────────
  function Stepper(res, opts = {}) {
    const steps = res.steps;
    let i = 0, timer = null;
    const main = h('div', { class: 'stepper-main' });
    const mem = h('div');
    const out = h('div');
    const count = h('span', { class: 'count' });
    const btn = (label, fn, title) => h('button', { class: 'btn sm', onclick: fn, title }, label);
    const play = btn('▶ Auto', () => toggle(), 'Reproducir automáticamente');
    function go(k) { i = Math.max(0, Math.min(steps.length - 1, k)); draw(); }
    function toggle() {
      if (timer) { clearInterval(timer); timer = null; play.textContent = '▶ Auto'; return; }
      if (i >= steps.length - 1) i = -1;
      play.textContent = '⏸ Pausa';
      timer = setInterval(() => { if (i >= steps.length - 1) return toggle(); go(i + 1); }, opts.speed || 1400);
    }
    function draw() {
      const s = steps[i];
      count.textContent = `paso ${i + 1} / ${steps.length}`;
      main.replaceChildren(stepEl(s, i).children[0], h('div', { class: 'stp-text' }, s.text),
        s.notes.length ? h('ul', { class: 'stp-notes' }, s.notes.map(n => h('li', { class: /^⚠/.test(n) ? 'warn' : '', html: md(n) }))) : null);
      const changed = new Set(s.changed || []);
      mem.replaceChildren(h('div', { class: 'mem-title' }, '🧠 Memoria (variables)'),
        s.vars.length ? h('div', { class: 'mem' }, s.vars.map(v => h('div', { class: 'mem-box' + (changed.has(v.uid) ? ' changed' : '') },
          h('div', { class: 'nm', html: `${esc(v.id)} ${tchip(v.type)}` }), h('div', { class: 'vl' }, v.value)))) : h('div', { class: 'muted' }, '(vacía)'));
      out.replaceChildren(h('div', { class: 'mem-title' }, '🖥 Consola hasta aquí'), h('div', { class: 'console' }, s.out || ''));
      opts.onLine && opts.onLine(s.line);
    }
    const el = h('div', { class: 'stepper' },
      h('div', { class: 'stepper-ctrl' }, btn('⏮', () => go(0), 'Inicio'), btn('◀ Anterior', () => go(i - 1)), btn('Siguiente ▶', () => go(i + 1)), btn('⏭', () => go(steps.length - 1), 'Final'), play, count),
      main, mem, out);
    el.tabIndex = 0;
    el.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); });
    if (steps.length) draw(); else el.replaceChildren(h('div', { class: 'empty' }, res.phase === 'compile' ? 'No compila: no hay ejecución que recorrer.' : 'No hay pasos.'));
    el.stop = () => timer && toggle();
    return el;
  }

  // ───────── Panel de resultados (Lab) ─────────
  function ResultPanel(opts = {}) {
    const tabs = [['out', '🖥 Salida'], ['steps', '🔬 Paso a paso'], ['list', '📜 Traza completa'], ['vars', '🧠 Variables y bits'], ['tree', '🌳 Árbol de tipos']];
    let cur = 'out', res = null, stepper = null;
    const body = h('div', { class: 'out-body' });
    const bar = h('div', { class: 'out-tabs' }, tabs.map(([k, l]) => h('button', { 'data-k': k, onclick: () => { cur = k; draw(); } }, l)));
    const el = h('div', { class: 'out-panel' }, bar, body);
    function draw() {
      bar.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.k === cur));
      if (stepper) stepper.stop();
      if (cur !== 'steps') opts.onLine && opts.onLine(0);
      if (!res) { body.replaceChildren(h('div', { class: 'empty', html: 'Pulsa <b>▶ Ejecutar</b> (o <kbd>Ctrl</kbd>+<kbd>Enter</kbd>) para compilar y ejecutar.' })); return; }
      switch (cur) {
        case 'out': {
          const head = h('div', { class: 'row', style: { marginBottom: '10px' } },
            res.phase === 'compile' ? h('span', { class: 'pill', style: { background: 'rgba(251,113,133,.15)', color: 'var(--red)', borderColor: 'rgba(251,113,133,.4)' } }, '✗ Error de compilación')
              : res.phase === 'runtime' ? h('span', { class: 'pill', style: { background: 'rgba(251,191,36,.15)', color: 'var(--amber)', borderColor: 'rgba(251,191,36,.4)' } }, '💥 Compila, pero falla al ejecutar')
                : h('span', { class: 'pill', style: { background: 'rgba(52,211,153,.15)', color: 'var(--green)', borderColor: 'rgba(52,211,153,.4)' } }, '✓ Compila y ejecuta'),
            res.steps.length ? h('span', { class: 'muted', style: { fontSize: '13px' } }, `${res.steps.length} pasos registrados → mira "Paso a paso"`) : null);
          body.replaceChildren(head, consoleBox(res), whyBox(res));
          break;
        }
        case 'steps': stepper = Stepper(res, { onLine: opts.onLine }); body.replaceChildren(stepper); break;
        case 'list': body.replaceChildren(stepsList(res.steps)); break;
        case 'vars': body.replaceChildren(varsTable(res.vars)); break;
        case 'tree': body.replaceChildren(typeTree(res)); break;
      }
    }
    draw();
    return { el, show(r, tab) { res = r; if (tab) cur = tab; draw(); } };
  }

  // ───────── Bloque de código ejecutable (dentro de la teoría) ─────────
  function CodeBlock(code, opts = {}) {
    const pre = h('pre', { html: highlight(code) });
    const result = h('div', { class: 'inline-run', style: { display: 'none' } });
    const run = () => {
      const res = J.run(code);
      result.style.display = '';
      let open = false;
      const list = h('div', { style: { display: 'none', marginTop: '10px' } }, stepsList(res.steps));
      const toggle = res.steps.length ? h('button', { class: 'btn sm ghost', style: { marginTop: '10px' }, onclick: e => { open = !open; list.style.display = open ? '' : 'none'; e.target.textContent = open ? '▲ Ocultar el porqué' : `🔬 Ver el porqué, paso a paso (${res.steps.length})`; } }, `🔬 Ver el porqué, paso a paso (${res.steps.length})`) : null;
      result.replaceChildren(consoleBox(res), whyBox(res), toggle, list);
      if (opts.autoSteps && toggle) toggle.click();
    };
    const bar = h('div', { class: 'code-bar' },
      h('span', { class: 'note', html: opts.note ? md(opts.note) : '' }),
      h('button', { class: 'btn sm primary', onclick: run }, '▶ Ejecutar'),
      h('button', { class: 'btn sm', onclick: () => window.App.openLab(code) }, '🧪 Experimentar en el Lab'));
    return h('div', { class: 'code-blk' }, pre, bar, result);
  }

  // ───────── Efectos ─────────
  function toast(msg, ms = 2200) {
    const t = h('div', { class: 'toast' }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), ms);
  }
  function confetti(n = 70) {
    const colors = ['#8b5cf6', '#22d3ee', '#a3e635', '#f472b6', '#fbbf24'];
    for (let i = 0; i < n; i++) {
      const c = h('div', { class: 'confetti' });
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.6 + Math.random() * 1.8 + 's';
      c.style.animationDelay = Math.random() * .4 + 's';
      document.body.append(c);
      setTimeout(() => c.remove(), 4200);
    }
  }

  // ───────── Progreso (localStorage, tolerante a fallos) ─────────
  const KEY = 'javaquest-progress-v1';
  const Store = {
    data: (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })(),
    get(path, def) { return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), this.data) ?? def; },
    set(path, val) {
      const ks = path.split('.'); let o = this.data;
      ks.slice(0, -1).forEach(k => (o = o[k] = o[k] || {}));
      o[ks[ks.length - 1]] = val;
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* sin almacenamiento */ }
      window.dispatchEvent(new Event('progress'));
    }
  };

  window.UI = { h, esc, md, tchip, highlight, highlightLines, Editor, consoleBox, whyBox, stepsList, stepEl, varsTable, typeTree, Stepper, ResultPanel, CodeBlock, toast, confetti, Store };
})();
