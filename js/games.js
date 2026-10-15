/* Juegos del tema: cada juego recibe (root, topic, api) y dibuja dentro de root */
(function () {
  'use strict';
  const { h, md, esc, tchip, highlight, highlightLines, consoleBox, whyBox, stepsList, Stepper, toast, confetti, Store } = window.UI;
  const J = window.JavaEngine;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickOne = a => a[Math.random() * a.length | 0];
  const codeEl = (code, big) => h('div', { class: 'code-blk' }, h('pre', { html: highlight(code), style: big ? { fontSize: '16px' } : null }));

  function saveBest(key, score) {
    const prev = Store.get(key, null);
    if (prev === null || score > prev) { Store.set(key, score); return true; }
    return false;
  }
  function stat(label, val) { const b = h('b', null, val); return { el: h('div', { class: 'stat' }, b, h('span', null, label)), set: v => (b.textContent = v) }; }
  function header(api, title, sub) {
    return h('div', { class: 'game-top' },
      h('button', { class: 'btn sm ghost', onclick: () => api.back() }, '← Juegos'),
      h('div', null, h('div', { class: 'h2', style: { margin: 0 } }, title), sub ? h('div', { class: 'muted', style: { fontSize: '14px' } }, sub) : null));
  }
  function resultScreen(root, { title, score, of, best, msg, again, api }) {
    const pct = of ? Math.round(score / of * 100) : null;
    if (pct === null || pct >= 70) confetti();
    root.replaceChildren(h('div', { class: 'card result-screen fade-in' },
      h('div', { class: 'eyebrow' }, title),
      h('div', { class: 'score grad-text' }, of ? `${score}/${of}` : score),
      pct !== null ? h('p', { class: 'lead', style: { margin: '0 auto 8px' } }, pct >= 90 ? '🏆 ¡Nivel certificación!' : pct >= 70 ? '🔥 ¡Muy bien! Vas por buen camino.' : pct >= 50 ? '💪 Bien, pero repasa las explicaciones.' : '📚 Vuelve a la teoría y reintenta: así se aprende.') : null,
      msg ? h('p', { class: 'muted' }, msg) : null,
      best ? h('p', { style: { color: 'var(--lime)', fontWeight: 600 } }, '⭐ ¡Nuevo récord personal!') : null,
      h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '18px' } },
        h('button', { class: 'btn primary', onclick: again }, '↻ Jugar otra vez'),
        h('button', { class: 'btn', onclick: () => api.back() }, 'Otros juegos'))));
  }

  // ═════════════ 1. Promotion Arena ═════════════
  const NUMS = ['byte', 'short', 'char', 'int', 'long', 'float', 'double'];
  const SMALLT = ['byte', 'short', 'char'];
  const INIT = { byte: '1', short: '2', char: "'A'", int: '3', long: '4L', float: '1.5f', double: '2.5', boolean: 'true', String: '"hi"' };
  function genArena() {
    const r = Math.random();
    let t1 = pickOne(NUMS), t2 = pickOne(NUMS), expr;
    if (r < .25) { t1 = pickOne(SMALLT); t2 = pickOne(SMALLT); expr = `a ${pickOne(['+', '-', '*', '/', '%'])} b`; }
    else if (r < .45) expr = `a ${pickOne(['+', '-', '*', '/'])} b`;
    else if (r < .55) { t2 = null; expr = `a ${pickOne(['+', '*', '-'])} ${pickOne(['1', '1L', '1.0', '1f', "'x'", '2.5'])}`; }
    else if (r < .65) { t2 = null; expr = pickOne(['-a', '~a', '+a', 'a++', '--a', '!a']); }
    else if (r < .72) expr = `a ${pickOne(['+=', '*=', '-='])} b`;
    else if (r < .78) { t1 = pickOne(NUMS.slice(0, 5)); t2 = pickOne(NUMS.slice(0, 5)); expr = `a ${pickOne(['<<', '>>', '>>>'])} b`; }
    else if (r < .84) expr = `a ${pickOne(['>', '==', '<=', '!='])} b`;
    else if (r < .9) expr = pickOne(['a + b + ""', '"" + a + b', 'a + "" + b']);
    else if (r < .95) { t1 = 'boolean'; expr = `a ${pickOne(['+', '&', '&&', '==', '^'])} b`; t2 = pickOne(['boolean', 'int', 'boolean']); }
    else expr = `true ? a : b`;
    const decl = `${t1} a = ${INIT[t1]};` + (t2 ? `\n${t2} b = ${INIT[t2]};` : '');
    const code = `${decl}\nvar r = ${expr};`;
    const res = J.typeOf(code, 'r');
    if (res.ok && res.type === 'Object') return genArena();
    return { decl, expr, code, answer: res.ok ? res.type : 'NC', res, nlines: decl.split('\n').length + 1 };
  }
  function arena(root, topic, api) {
    const ROUNDS = 12, TIME = 15;
    let i = 0, score = 0, streak = 0, right = 0, timer = null, q, left;
    const sScore = stat('puntos', 0), sStreak = stat('racha 🔥', 0), sRound = stat('ronda', '1/' + ROUNDS);
    const bar = h('i', { style: { width: '100%' } });
    const body = h('div');
    root.replaceChildren(header(api, '🏟 Promotion Arena', '¿De qué tipo es el resultado? Responde antes de que se acabe el tiempo.'),
      h('div', { class: 'hud' }, sScore.el, sStreak.el, sRound.el), h('div', { class: 'timer' }, bar), body);
    const OPTS = [...NUMS, 'boolean', 'String', 'NC'];
    function next() {
      if (i >= ROUNDS) {
        clearInterval(timer);
        const best = saveBest('ops.game.arena', score);
        return resultScreen(root, { title: 'Promotion Arena', score: right, of: ROUNDS, best, msg: `${score} puntos`, again: () => arena(root, topic, api), api });
      }
      q = genArena(); left = TIME;
      sRound.set(`${i + 1}/${ROUNDS}`);
      const choices = OPTS.map(t => h('button', { class: 'choice t-' + (t === 'NC' ? 'none' : t), 'data-t': t, onclick: () => answer(t) }, t === 'NC' ? '✗ No compila' : t));
      body.replaceChildren(h('div', { class: 'card fade-in' },
        h('div', { class: 'mem-title' }, 'Dado esto:'), codeEl(q.decl),
        h('div', { class: 'mem-title', style: { marginTop: '16px' } }, '¿Qué tipo tiene esta expresión?'),
        h('div', { class: 'prec-expr', style: { lineHeight: 1.6 } }, h('span', { html: highlight(q.expr) })),
        h('div', { class: 'choices' }, choices)));
      clearInterval(timer);
      timer = setInterval(() => { left -= .1; bar.style.width = Math.max(0, left / TIME * 100) + '%'; if (left <= 0) answer(null); }, 100);
    }
    function answer(t) {
      clearInterval(timer);
      const ok = t === q.answer;
      body.querySelectorAll('.choice').forEach(b => { b.disabled = true; if (b.dataset.t === q.answer) b.classList.add('right'); else if (b.dataset.t === t) b.classList.add('wrong'); });
      if (ok) { right++; streak++; score += 100 + Math.round(left * 10) + (streak - 1) * 25; } else streak = 0;
      sScore.set(score); sStreak.set(streak);
      const full = J.run(q.code + '\nSystem.out.println(r);');
      const steps = full.steps.filter(s => s.line === q.nlines);
      const fb = h('div', { class: 'feedback ' + (ok ? 'good' : 'bad') },
        h('h4', null, ok ? '✓ ¡Correcto!' : t === null ? '⏰ ¡Se acabó el tiempo!' : '✗ No exactamente'),
        h('p', { html: `La respuesta es ${q.answer === 'NC' ? '<span class="t t-none">no compila</span>' : tchip(q.answer)}.` }),
        q.answer === 'NC' ? [h('div', { class: 'console' }, h('span', { class: 'err' }, 'error: ' + q.res.error)), q.res.why ? h('p', { style: { marginTop: '10px' }, html: '💡 ' + md(q.res.why) }) : null]
          : stepsList(steps.filter(s => s.kind !== 'decl').length ? steps.filter(s => s.kind !== 'decl') : steps),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', onclick: () => { i++; next(); } }, i + 1 >= ROUNDS ? 'Ver resultado →' : 'Siguiente →'), h('span', { class: 'muted', style: { fontSize: '12px' } }, 'o pulsa Enter')));
      body.firstChild.append(fb);
      fb.querySelector('.btn.primary').focus();
    }
    next();
  }

  // ═════════════ 2. ¿Compila? ═════════════
  function compila(root, topic, api) {
    const qs = shuffle(topic.COMPILA).slice(0, 12);
    let i = 0, right = 0;
    const sRight = stat('aciertos', 0), sRound = stat('pregunta', '');
    const body = h('div');
    root.replaceChildren(header(api, '✅❌ ¿Compila o no?', 'Piensa como javac: tipos, rangos, constantes y conversiones.'), h('div', { class: 'hud' }, sRight.el, sRound.el), body);
    function next() {
      if (i >= qs.length) {
        const best = saveBest('ops.game.compila', right);
        return resultScreen(root, { title: '¿Compila?', score: right, of: qs.length, best, again: () => compila(root, topic, api), api });
      }
      const q = qs[i];
      sRound.set(`${i + 1}/${qs.length}`);
      const bY = h('button', { class: 'choice', style: { '--tc': 'var(--green)' }, onclick: () => answer(true) }, '✅ Compila');
      const bN = h('button', { class: 'choice', style: { '--tc': 'var(--red)' }, onclick: () => answer(false) }, '❌ No compila');
      body.replaceChildren(h('div', { class: 'card fade-in' }, h('div', { class: 'mem-title' }, '¿Este código compila?'), codeEl(q.code, true), h('div', { class: 'big-choice' }, bY, bN)));
      function answer(v) {
        const res = J.run(q.code);
        const truth = res.phase !== 'compile';
        const ok = v === truth;
        if (ok) right++;
        sRight.set(right);
        bY.disabled = bN.disabled = true;
        (truth ? bY : bN).classList.add('right');
        if (!ok) (v ? bY : bN).classList.add('wrong');
        const fb = h('div', { class: 'feedback ' + (ok ? 'good' : 'bad') },
          h('h4', null, (ok ? '✓ ¡Correcto! ' : '✗ Fallaste: ') + (truth ? 'sí compila' : 'no compila')),
          h('p', { html: md(q.why) }),
          truth ? [h('div', { class: 'mem-title' }, res.phase === 'runtime' ? 'Compila… pero al ejecutar:' : 'Salida / variables:'), res.out ? consoleBox(res) : UI.varsTable(res.vars)] : [consoleBox(res), whyBox(res)],
          h('button', { class: 'btn primary', style: { marginTop: '14px' }, onclick: () => { i++; next(); } }, 'Siguiente →'));
        body.firstChild.append(fb);
        fb.querySelector('.btn.primary').focus();
      }
    }
    next();
  }

  // ═════════════ 3. Predice la salida ═════════════
  function predice(root, topic, api) {
    const qs = shuffle(topic.PREDICE).slice(0, 10);
    let i = 0, right = 0;
    const sRight = stat('aciertos', 0), sRound = stat('reto', '');
    const body = h('div');
    root.replaceChildren(header(api, '🔮 Predice la salida', 'Ejecuta el código en tu cabeza. Escribe exactamente lo que imprime.'), h('div', { class: 'hud' }, sRight.el, sRound.el), body);
    const norm = s => s.trim().replace(/\r/g, '').split('\n').map(l => l.trim()).join('\n');
    function next() {
      if (i >= qs.length) {
        const best = saveBest('ops.game.predice', right);
        return resultScreen(root, { title: 'Predice la salida', score: right, of: qs.length, best, again: () => predice(root, topic, api), api });
      }
      const q = qs[i];
      sRound.set(`${i + 1}/${qs.length}`);
      const inp = h('input', { class: 'answer-input', placeholder: '¿Qué imprime? (Enter para comprobar)', autocomplete: 'off', spellcheck: 'false' });
      const go = h('button', { class: 'btn primary', onclick: () => check() }, 'Comprobar');
      const giveUp = h('button', { class: 'btn ghost', onclick: () => check(true) }, 'No sé, muéstrame');
      inp.addEventListener('keydown', e => e.key === 'Enter' && check());
      body.replaceChildren(h('div', { class: 'card fade-in' }, codeEl(q.code, true), h('div', { class: 'row', style: { marginTop: '14px', flexWrap: 'nowrap' } }, inp, go), h('div', { style: { marginTop: '8px' } }, giveUp)));
      setTimeout(() => inp.focus(), 50);
      function check(skip) {
        const res = J.run(q.code);
        const ok = !skip && norm(inp.value) === norm(res.out);
        if (!skip && !inp.value.trim()) return inp.focus();
        if (ok) right++;
        sRight.set(right);
        inp.disabled = go.disabled = giveUp.disabled = true;
        const fb = h('div', { class: 'feedback ' + (ok ? 'good' : 'bad') },
          h('h4', null, ok ? '✓ ¡Exacto!' : skip ? '👀 La respuesta:' : '✗ Casi…'),
          !ok && !skip ? h('p', { html: `Escribiste <code class="inl">${esc(inp.value)}</code>` }) : null,
          consoleBox(res),
          h('div', { class: 'mem-title', style: { marginTop: '14px' } }, '🔬 Así lo ejecuta la JVM, paso a paso (usa ◀ ▶):'),
          Stepper(res),
          h('button', { class: 'btn primary', style: { marginTop: '14px' }, onclick: () => { i++; next(); } }, 'Siguiente →'));
        body.firstChild.append(fb);
      }
    }
    next();
  }

  // ═════════════ 4. La Escalera de precedencia ═════════════
  function collectOps(n, acc = []) {
    switch (n.k) {
      case 'bin': collectOps(n.l, acc); collectOps(n.r, acc); acc.push(n); break;
      case 'un': case 'pre': case 'post': case 'cast': collectOps(n.e, acc); if (!(n.k === 'un' && n.e.k === 'lit')) acc.push(n); break;
      case 'assign': collectOps(n.e, acc); acc.push(n); break;
      case 'tern': collectOps(n.c, acc); collectOps(n.a, acc); collectOps(n.b, acc); break;
    }
    return acc;
  }
  function escalera(root, topic, api) {
    const list = topic.ESCALERA;
    let i = 0, stars = 0, mistakes = 0;
    const sStars = stat('estrellas ⭐', 0), sRound = stat('nivel', '');
    const body = h('div');
    root.replaceChildren(header(api, '🧗 La Escalera de precedencia', 'Toca los operadores en el ORDEN en que Java los aplica.'),
      h('div', { class: 'tip', style: { marginBottom: '16px' } }, h('span', { class: 'blk-label' }, 'Cómo se juega'), h('p', { html: md('Variables: `int a = 2, b = 3, c = 4;`. Primero se aplica lo de mayor precedencia, pero recuerda: **los operandos se evalúan de izquierda a derecha**, así que con igual "urgencia" gana el de la izquierda (en `a * b + c / a` primero va `*`, luego `/`, luego `+`).') })),
      h('div', { class: 'hud' }, sStars.el, sRound.el), body);
    function next() {
      if (i >= list.length) {
        const best = saveBest('ops.game.escalera', stars);
        return resultScreen(root, { title: 'La Escalera', score: stars, of: list.length * 3, best, again: () => escalera(root, topic, api), api });
      }
      mistakes = 0;
      sRound.set(`${i + 1}/${list.length}`);
      const expr = list[i];
      const code = `int a = 2, b = 3, c = 4;\nvar r = ${expr};`;
      const res = J.run(code);
      const decl = res.prog.ast.body[1].decls[0];
      const init = decl.init;
      const ops = collectOps(init);
      const valSteps = res.steps.filter(s => s.line === 2 && s.kind !== 'decl');
      const src = res.prog.src;
      const exprEl = h('div', { class: 'prec-expr' });
      const sorted = ops.slice().sort((x, y) => x.opS - y.opS);
      let pos = init.s, k = 0;
      const spans = new Map();
      for (const op of sorted) {
        exprEl.append(src.slice(pos, op.opS));
        const sp = h('span', { class: 'prec-op', onclick: () => click(op, sp) }, src.slice(op.opS, op.opE));
        spans.set(op, sp);
        exprEl.append(sp);
        pos = op.opE;
      }
      exprEl.append(src.slice(pos, init.end));
      const stack = h('div', { class: 'prec-stack' });
      const hint = h('div', { class: 'muted', style: { minHeight: '24px', marginTop: '10px', fontSize: '14px' } });
      body.replaceChildren(h('div', { class: 'card fade-in' }, h('div', { class: 'mem-title' }, `Nivel ${i + 1}: ¿qué operador se aplica primero?`), exprEl, hint, stack));
      function click(op, sp) {
        if (sp.classList.contains('done')) return;
        if (op !== ops[k]) {
          mistakes++;
          sp.classList.remove('bad'); void sp.offsetWidth; sp.classList.add('bad');
          hint.innerHTML = `✗ Todavía no. ${esc(src.slice(op.opS, op.opE))} necesita que antes se resuelva algo con <b>mayor precedencia</b> o que esté <b>más a la izquierda</b>.`;
          return;
        }
        const st = valSteps.length === ops.length ? valSteps[k] : null;
        k++;
        sp.classList.add('done');
        sp.append(h('span', { class: 'badge' }, k));
        hint.textContent = '';
        stack.append(h('div', null, `${k}. ${src.slice(op.s, op.end).replace(/\s+/g, ' ')}`, st ? h('span', { style: { color: 'var(--muted)' } }, `  ⟶  ${st.text}`) : h('span', { html: '  ⟶  ' + tchip(op.t) })));
        if (k === ops.length) {
          const got = Math.max(1, 3 - mistakes);
          stars += got; sStars.set(stars);
          stack.append(h('div', { style: { borderLeftColor: 'var(--amber)' } }, `${'⭐'.repeat(got)}  r = ${res.vars.find(v => v.id === 'r').value} ${mistakes ? `(${mistakes} error${mistakes > 1 ? 'es' : ''})` : '¡perfecto!'}`));
          body.firstChild.append(h('button', { class: 'btn primary', style: { marginTop: '14px' }, onclick: () => { i++; next(); } }, 'Siguiente nivel →'));
        }
      }
    }
    next();
  }

  // ═════════════ 5. Bit Lab ═════════════
  function bitlab(root, topic, api) {
    const SRC = ['byte', 'short', 'char', 'int', 'long', 'float', 'double'];
    let st = { src: 'int', val: '200', to: 'byte' };
    const view = h('div');
    const inp = h('input', { class: 'answer-input', value: st.val, style: { maxWidth: '260px' }, spellcheck: 'false' });
    inp.addEventListener('input', () => { st.val = inp.value; draw(); });
    const srcBtns = h('div', { class: 'type-btns' });
    const toBtns = h('div', { class: 'type-btns' });
    function btns(el, key) {
      el.replaceChildren(...SRC.map(t => h('button', { class: 'type-btn t-' + t + (st[key] === t ? ' active' : ''), onclick: () => { st[key] = t; draw(); } }, t)));
    }
    function grid(bits, type, opts = {}) {
      const g = h('div', { class: 'bitgrid' });
      const n = bits.length;
      [...bits].forEach((b, idx) => {
        let cls = 'bit' + (b === '1' ? ' one' : '');
        if (type !== 'char' && idx === 0 && J.isIntegral(type)) cls += ' sign';
        if (type === 'float' || type === 'double') { const e = type === 'float' ? 8 : 11; if (idx === 0) cls += ' sign'; else if (idx <= e) cls += ' exp'; else cls += ' man'; }
        if (opts.cut && idx < opts.cut) cls += ' cut';
        if (opts.click) cls += ' click';
        if ((n - idx - 1) % 8 === 0 && idx !== n - 1) cls += ' nib';
        const c = h('div', { class: cls, title: `bit ${n - idx - 1}` }, b);
        if (opts.click) c.addEventListener('click', () => opts.click(idx));
        g.append(c);
      });
      return g;
    }
    function setFromBits(bits) {
      const t = st.src;
      let v;
      if (J.isIntegral(t)) {
        const big = BigInt('0b' + bits);
        v = t === 'char' ? Number(BigInt.asUintN(16, big)) : t === 'long' ? BigInt.asIntN(64, big) + 'L' : Number(BigInt.asIntN(J.BITS[t], big));
      } else {
        const dv = new DataView(new ArrayBuffer(8));
        let x;
        if (t === 'float') { dv.setUint32(0, parseInt(bits, 2)); x = dv.getFloat32(0); }
        else { dv.setBigUint64(0, BigInt('0b' + bits)); x = dv.getFloat64(0); }
        v = Number.isNaN(x) ? 'Double.NaN' : x === Infinity ? 'Double.POSITIVE_INFINITY' : x === -Infinity ? 'Double.NEGATIVE_INFINITY' : (t === 'float' ? J.javaFloat(x) + 'f' : J.javaDouble(x));
      }
      st.val = String(v); inp.value = st.val; draw();
    }
    function draw() {
      btns(srcBtns, 'src'); btns(toBtns, 'to');
      const code = `${st.src} v = (${st.src}) (${st.val || '0'});\n${st.to} r = (${st.to}) v;`;
      const res = J.run(code);
      if (res.phase === 'compile') {
        view.replaceChildren(h('div', { class: 'trap' }, h('span', { class: 'blk-label' }, 'Valor no válido'), h('p', { html: `Escribe un literal Java válido (ej. <code class="inl">300</code>, <code class="inl">-1</code>, <code class="inl">'A'</code>, <code class="inl">3.7e10</code>, <code class="inl">0xFF</code>, <code class="inl">Integer.MAX_VALUE</code>).<br><span class="muted">${esc(res.error.msg.split('\n')[0])}</span>` })));
        return;
      }
      const v = res.vars.find(x => x.id === 'v'), r = res.vars.find(x => x.id === 'r');
      const vb = J.bitsOf(v.raw, st.src), rb = J.bitsOf(r.raw, st.to);
      const castStep = res.steps.filter(s => s.kind === 'cast').pop();
      const intBased = J.isIntegral(st.src) && J.isIntegral(st.to);
      const cut = intBased && J.BITS[st.to] < J.BITS[st.src] ? J.BITS[st.src] - J.BITS[st.to] : 0;
      const flip = idx => { const b = vb.split(''); b[idx] = b[idx] === '1' ? '0' : '1'; setFromBits(b.join('')); };
      const rows = [
        h('div', { class: 'bitrow' }, h('div', { class: 'lbl', html: `origen ${tchip(st.src)} = <b style="color:#fff">${esc(v.value)}</b> <span class="muted">(toca un bit para cambiarlo)</span>` }), grid(vb, st.src, { cut, click: flip })),
      ];
      if (!J.isIntegral(st.src) && J.isIntegral(st.to) && st.to !== 'int' && st.to !== 'long') {
        const mid = J.conv(v.raw, st.src, 'int');
        rows.push(h('div', { class: 'bitrow' }, h('div', { class: 'lbl', html: `paso intermedio: primero a ${tchip('int')} (trunca/satura) = <b style="color:#fff">${mid}</b>` }), grid(J.bitsOf(mid, 'int'), 'int', { cut: 32 - J.BITS[st.to] })));
      }
      rows.push(h('div', { class: 'bitrow' }, h('div', { class: 'lbl', html: `resultado <code class="inl">(${st.to})</code> ${tchip(st.to)}` }), grid(rb, st.to)));
      view.replaceChildren(
        h('div', { class: 'card', style: { overflowX: 'auto' } }, rows,
          h('div', { class: 'row', style: { marginTop: '16px', alignItems: 'baseline' } }, h('span', { class: 'muted' }, 'Resultado:'), h('span', { class: 'bigval grad-text' }, r.value)),
          h('div', { class: 'row muted', style: { fontSize: '12px', marginTop: '6px' } }, h('span', { html: '<span class="bit sign" style="display:inline-grid;width:16px;height:16px;font-size:9px">s</span> bit de signo' }), (st.src === 'float' || st.src === 'double') ? h('span', { html: '<span class="bit exp" style="display:inline-grid;width:16px;height:16px;font-size:9px">e</span> exponente &nbsp;<span class="bit man" style="display:inline-grid;width:16px;height:16px;font-size:9px">m</span> mantisa' }) : null, cut ? h('span', null, `tachados = ${cut} bits que se descartan`) : null)),
        castStep && castStep.notes.length ? h('div', { class: 'deep', style: { marginTop: '14px' } }, h('span', { class: 'blk-label' }, '🔬 Qué pasó'), h('ul', { class: 'clean' }, castStep.notes.map(n => h('li', { html: md(n) })))) : null);
    }
    // Retos
    const retos = h('div', { class: 'grid3', style: { marginTop: '14px' } }, shuffle(topic.BITRETOS).slice(0, 6).map(q => {
      const i2 = h('input', { class: 'answer-input', placeholder: '¿resultado?', spellcheck: 'false' });
      const fb = h('div', { style: { minHeight: '22px', marginTop: '6px', fontSize: '13px' } });
      const card = h('div', { class: 'card', style: { padding: '16px' } }, h('div', { class: 'mono', style: { fontWeight: 700, marginBottom: '8px' } }, h('span', { html: highlight(q.e) })), i2, fb);
      i2.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const ok = i2.value.trim().replace(/^'(.)'$/, '$1') === q.a;
        card.style.borderColor = ok ? 'var(--green)' : 'var(--red)';
        fb.innerHTML = ok ? '✓ ¡Correcto!' : `✗ Es <b>${esc(q.a)}</b>`;
        if (ok) { const c = Store.get('ops.game.bitlab', 0); Store.set('ops.game.bitlab', c + 1); }
        const m = /^\((\w+)\)\s*(.*)$/.exec(q.e);
        if (m) {
          const tt = J.typeOf(`var v = ${m[2]};`, 'v');
          if (tt.ok) fb.append(h('button', { class: 'btn sm ghost', style: { marginLeft: '8px' }, onclick: () => { st = { src: tt.type, val: m[2], to: m[1] }; inp.value = st.val; draw(); root.scrollIntoView({ behavior: 'smooth' }); } }, 'ver bits'));
        }
      });
      return card;
    }));
    root.replaceChildren(header(api, '🧬 Bit Lab', 'Mira exactamente qué bits sobreviven a un cast.'),
      h('div', { class: 'card', style: { marginBottom: '14px' } },
        h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '24px' } },
          h('div', null, h('div', { class: 'mem-title' }, 'Valor (cualquier literal Java)'), inp),
          h('div', null, h('div', { class: 'mem-title' }, 'Tipo de origen'), srcBtns),
          h('div', null, h('div', { class: 'mem-title' }, 'Castear a'), toBtns))),
      view,
      h('div', { class: 'h3' }, '🎯 Retos rápidos (escribe y pulsa Enter)'), retos);
    draw();
    Store.set('ops.played.bitlab', true);
  }

  // ═════════════ 6. Rayos X ═════════════
  function rayosx(root, topic, api) {
    let cur = 0;
    const codeBox = h('pre', { style: { margin: 0, padding: '14px 16px', fontSize: '15px', lineHeight: 1.7 } });
    const stepWrap = h('div');
    const presets = h('div', { class: 'type-btns' });
    function load(k) {
      cur = k;
      presets.replaceChildren(...topic.RAYOSX.map((p, j) => h('button', { class: 'type-btn' + (j === k ? ' active' : ''), style: { '--tc': 'var(--pink)' }, onclick: () => load(j) }, p.name)));
      const p = topic.RAYOSX[k];
      const lines = highlightLines(p.code);
      const setLine = n => { codeBox.innerHTML = lines.map((l, i) => i + 1 === n ? `<span class="ed-line active">${l || ' '}</span>` : l).join('\n'); };
      setLine(0);
      const res = J.run(p.code);
      const sp = Stepper(res, { onLine: setLine, speed: 1800 });
      stepWrap.replaceChildren(sp);
      Store.set('ops.played.rayosx', true);
    }
    root.replaceChildren(header(api, '🩻 Rayos X', 'Cámara lenta de la JVM: mira la memoria cambiar en cada operación.'),
      h('div', { class: 'card', style: { marginBottom: '14px' } }, h('div', { class: 'mem-title' }, 'Elige un programa tramposo'), presets),
      h('div', { class: 'lab' },
        h('div', null, h('div', { class: 'code-blk' }, codeBox, h('div', { class: 'code-bar' }, h('span', { class: 'note' }, 'Usa ◀ ▶ o las flechas del teclado'), h('button', { class: 'btn sm', onclick: () => window.App.openLab(topic.RAYOSX[cur].code) }, '🧪 Editar en el Lab')))),
        stepWrap));
    load(0);
  }

  // ═════════════ 7. Flashcards ═════════════
  function flash(root, topic, api, deck) {
    deck = deck || shuffle(topic.FLASH.map((c, i) => ({ c, i })));
    let k = 0, known = 0;
    const review = [];
    const sK = stat('me las sé', 0), sLeft = stat('restantes', deck.length);
    const body = h('div');
    root.replaceChildren(header(api, '🃏 Flashcards', 'Toca la tarjeta para voltearla. Sé honesto contigo.'), h('div', { class: 'hud', style: { justifyContent: 'center', marginBottom: '16px' } }, sK.el, sLeft.el), body);
    function show() {
      if (k >= deck.length) {
        Store.set('ops.game.flash', Math.max(Store.get('ops.game.flash', 0), Math.round(known / deck.length * 100)));
        return root.replaceChildren(h('div', { class: 'card result-screen fade-in' }, h('div', { class: 'eyebrow' }, 'Mazo terminado'), h('div', { class: 'score grad-text' }, `${known}/${deck.length}`),
          h('p', { class: 'muted' }, review.length ? `Tienes ${review.length} tarjeta(s) para repasar.` : '¡Te las sabes todas! 🎉'),
          h('div', { class: 'row', style: { justifyContent: 'center' } },
            review.length ? h('button', { class: 'btn primary', onclick: () => flash(root, topic, api, shuffle(review)) }, `↻ Repasar las ${review.length} difíciles`) : null,
            h('button', { class: 'btn', onclick: () => flash(root, topic, api) }, 'Mazo completo'),
            h('button', { class: 'btn ghost', onclick: () => api.back() }, 'Otros juegos'))));
      }
      const { c } = deck[k];
      const card = h('div', { class: 'flash' },
        h('div', { class: 'flash-face flash-front' }, h('div', { class: 'eyebrow', style: { marginBottom: '14px' } }, `Tarjeta ${k + 1} de ${deck.length}`), h('div', { class: 'q', html: md(c[0]) }), h('div', { class: 'hint' }, 'toca para voltear ↻')),
        h('div', { class: 'flash-face flash-back' }, h('div', { class: 'a', html: md(c[1]) })));
      card.addEventListener('click', () => card.classList.toggle('flip'));
      body.replaceChildren(h('div', { class: 'flash-wrap fade-in' }, card,
        h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '18px' } },
          h('button', { class: 'btn', onclick: () => { review.push(deck[k]); k++; sLeft.set(deck.length - k); show(); } }, '↺ Repasar'),
          h('button', { class: 'btn primary', onclick: () => { known++; k++; sK.set(known); sLeft.set(deck.length - k); show(); } }, '✓ Me la sé'))));
    }
    show();
  }

  // ═════════════ 8. Cuestionarios: test por sección y simulador de examen ═════════════
  // Baraja las opciones dejando al final las de "no compila / excepción / depende"
  function shuffleOpts(q) {
    const idx = q.opts.map((_, i) => i);
    const fixed = idx.filter(i => /compil|Exception|Depende|No tiene/i.test(q.opts[i]));
    const order = [...shuffle(idx.filter(i => !fixed.includes(i))), ...fixed];
    return { ...q, opts: order.map(i => q.opts[i]), a: order.indexOf(q.a) };
  }
  function secTitle(topic, id) {
    if (id === 'integrador') return '🧩 Integradoras (mezclan todo)';
    const i = topic.SECTIONS.findIndex(s => s.id === id);
    return i < 0 ? id : `${i + 1}. ${topic.SECTIONS[i].title}`;
  }
  /* opts: { questions, head (elemento opcional), pass (0..1), inline, onDone(right, total) → ¿récord?, again(), actions: [[label, fn]] } */
  function runQuiz(root, topic, opts) {
    const qs = opts.questions.map(q => (q.type === 'code' ? q : shuffleOpts(q)));
    const passPct = Math.round((opts.pass || 0.68) * 100);
    let i = 0, right = 0;
    const answers = [];
    const sRight = stat('correctas', 0), sRound = stat('pregunta', '');
    const body = h('div');
    root.replaceChildren(opts.head || null, h('div', { class: 'hud' }, sRight.el, sRound.el), body);
    function finish() {
      const pct = Math.round(right / qs.length * 100);
      const passed = pct >= passPct;
      const best = opts.onDone ? opts.onDone(right, qs.length) : false;
      if (passed) confetti(opts.inline ? 40 : 70);
      const wrong = answers.filter(a => !a.ok);
      const bySec = new Map();
      answers.forEach(a => { if (!a.q.sec) return; const o = bySec.get(a.q.sec) || { ok: 0, n: 0 }; o.n++; if (a.ok) o.ok++; bySec.set(a.q.sec, o); });
      const breakdown = bySec.size > 1 ? h('div', { style: { textAlign: 'left', marginTop: '24px' } }, h('div', { class: 'h3' }, '📊 Resultado por sección'),
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('tbody', null, [...bySec].sort((x, y) => x[1].ok / x[1].n - y[1].ok / y[1].n).map(([sec, o]) => h('tr', null,
          h('td', null, secTitle(topic, sec)),
          h('td', { class: 'mono', style: { color: o.ok === o.n ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap' } }, `${o.ok}/${o.n} ${o.ok === o.n ? '✓' : '✗'}`),
          h('td', null, o.ok < o.n && sec !== 'integrador' ? h('a', { href: `#/ops/teoria/${sec}` }, 'Repasar →') : null))))))) : null;
      root.replaceChildren(h('div', { class: 'card result-screen fade-in' },
        h('div', { class: 'eyebrow' }, opts.inline ? (passed ? '✅ Test superado' : `📚 Aún no (necesitas ${passPct}%) — repasa y reintenta`) : (passed ? '✅ APROBADO' : `❌ NO APROBADO (${passPct}% requerido)`)),
        h('div', { class: 'score grad-text', style: opts.inline ? { fontSize: '48px' } : null }, `${right}/${qs.length}`),
        h('p', { class: 'muted', style: { margin: '0 0 6px' } }, `${pct}%` + (opts.inline && passed ? ' · sección marcada como entendida ✓' : '')),
        best ? h('p', { style: { color: 'var(--lime)', fontWeight: 600 } }, '⭐ ¡Nuevo récord personal!') : null,
        h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '14px' } },
          h('button', { class: 'btn primary', onclick: opts.again }, opts.inline ? '↻ Otro test (preguntas nuevas)' : '↻ Nuevo examen'),
          (opts.actions || []).map(([label, fn]) => h('button', { class: 'btn', onclick: fn }, label))),
        breakdown,
        wrong.length ? h('div', { style: { textAlign: 'left', marginTop: '24px' } }, h('div', { class: 'h3' }, '🔁 Repasa tus fallos'),
          wrong.map(a => h('div', { class: 'trap blk' },
            bySec.size > 1 ? h('div', { class: 'mem-title' }, secTitle(topic, a.q.sec)) : null,
            a.q.type === 'code' ? [h('p', { html: '💻 <b>Reto:</b> ' + md(a.q.task) }), h('div', { class: 'mem-title', style: { marginTop: '8px' } }, 'Una solución'), codeEl(a.q.solution), h('p', { style: { marginTop: '10px' }, html: md(a.q.why) })]
              : [a.q.q ? h('p', { html: md(a.q.q) }) : null, a.q.code ? codeEl(a.q.code) : null,
            h('p', { style: { marginTop: '10px' }, html: `<b>Tu respuesta:</b> ${md(a.q.opts[a.pick])}<br><b>Correcta:</b> ${md(a.q.opts[a.q.a])}<br>${md(a.q.why)}` })]))) : null));
    }
    function next() {
      if (i >= qs.length) return finish();
      const q = qs[i];
      sRound.set(`${i + 1}/${qs.length}`);
      if (q.type === 'code') return challenge(q);
      const btns = q.opts.map((o, j) => h('button', { class: 'opt', onclick: () => pick(j) }, h('span', { class: 'letter' }, 'ABCDE'[j]), h('span', { html: md(o) })));
      body.replaceChildren(h('div', { class: 'card fade-in' },
        !opts.inline && q.sec ? h('div', { class: 'eyebrow', style: { marginBottom: '6px' } }, secTitle(topic, q.sec)) : null,
        h('div', { class: 'quiz-q', html: md(q.q || '¿Cuál es el resultado?') }),
        q.code ? codeEl(q.code, true) : null,
        h('div', { class: 'opt-list' }, btns)));
      function pick(j) {
        const ok = j === q.a;
        if (ok) right++;
        answers.push({ q, ok, pick: j });
        sRight.set(right);
        btns.forEach((o, k) => { o.disabled = true; if (k === q.a) o.classList.add('right'); if (k === j) o.classList.add('picked'); if (k === j && !ok) o.classList.add('wrong'); });
        const res = q.code ? J.run(q.code) : null;
        const more = h('div', { style: { display: 'none', marginTop: '10px' } });
        const fb = h('div', { class: 'feedback ' + (ok ? 'good' : 'bad') },
          h('h4', null, ok ? '✓ Correcto' : `✗ Incorrecto — era la ${'ABCDE'[q.a]}`),
          h('p', { html: md(q.why) }),
          res ? h('button', { class: 'btn sm ghost', onclick: () => { more.style.display = more.style.display ? '' : 'none'; if (!more.firstChild) more.append(res.phase === 'compile' ? h('div', null, consoleBox(res), whyBox(res)) : Stepper(res)); } }, res.phase === 'compile' ? '🔬 Ver el error del compilador' : '🔬 Ver la ejecución paso a paso') : null,
          more,
          h('div', null, h('button', { class: 'btn primary', style: { marginTop: '14px' }, onclick: () => { i++; next(); } }, i + 1 >= qs.length ? 'Ver resultado →' : 'Siguiente →')));
        body.firstChild.append(fb);
      }
    }
    // Reto de código: el alumno escribe, el motor compila/ejecuta y valida los requisitos
    function challenge(q) {
      let tries = 0, done = false;
      const reqList = h('ul', { class: 'reqs' });
      const drawReqs = st => reqList.replaceChildren(window.Challenge.requirements(q).map(r => {
        const s = st && st.find(x => x.key === r.key);
        return h('li', { class: s ? (s.ok ? 'ok' : 'no') : '' }, h('span', { class: 'req-ico' }, s ? (s.ok ? '✓' : '✗') : '○'), h('span', { html: md(r.text) }));
      }));
      drawReqs();
      const result = h('div');
      const ed = UI.Editor(q.starter, { minHeight: 150, onRun: () => run() });
      const tryLbl = h('span', { class: 'muted', style: { fontSize: '13px' } });
      const bRun = h('button', { class: 'btn primary', onclick: () => run() }, '▶ Comprobar');
      const bHint = h('button', { class: 'btn ghost', onclick: () => { result.prepend(h('div', { class: 'tip blk fade-in' }, h('span', { class: 'blk-label' }, '💡 Pista'), h('p', { html: md(q.hint) }))); bHint.disabled = true; } }, '💡 Pista');
      const bGive = h('button', { class: 'btn ghost', onclick: () => end(false, true) }, '👀 Ver solución');
      const bReset = h('button', { class: 'btn ghost sm', onclick: () => { ed.value = q.starter; } }, '↺ Reiniciar código');
      body.replaceChildren(h('div', { class: 'card fade-in' },
        !opts.inline && q.sec ? h('div', { class: 'eyebrow', style: { marginBottom: '6px' } }, secTitle(topic, q.sec)) : null,
        h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', { class: 'pill', style: { background: 'rgba(163,230,53,.15)', color: 'var(--lime)', borderColor: 'rgba(163,230,53,.4)' } }, '💻 Reto de código'), h('span', { class: 'muted', style: { fontSize: '13px' } }, 'Escribe Java de verdad: el compilador del laboratorio lo revisa')),
        h('div', { class: 'quiz-q', html: md(q.task) }),
        h('div', { class: 'challenge' },
          h('div', null, ed.el, h('div', { class: 'row', style: { marginTop: '10px' } }, bRun, h('span', { class: 'muted', style: { fontSize: '12px' } }, h('kbd', null, 'Ctrl'), '+', h('kbd', null, 'Enter')), tryLbl, h('span', { class: 'spacer' }), bReset)),
          h('div', null, h('div', { class: 'mem-title' }, '✅ Requisitos'), reqList, h('div', { class: 'row', style: { marginTop: '10px' } }, bHint, bGive))),
        result));
      function run() {
        if (done) return;
        tries++;
        tryLbl.textContent = 'intento ' + tries;
        const c = window.Challenge.check(q, ed.value);
        drawReqs(c.reqs);
        ed.setError(c.res.phase === 'compile' ? c.res.error.line : 0);
        const hint = result.querySelector('.tip');
        result.replaceChildren(hint, h('div', { class: 'mem-title', style: { marginTop: '14px' } }, '🖥 Tu programa'), consoleBox(c.res), whyBox(c.res));
        if (c.ok) end(true);
        else result.append(h('p', { class: 'muted', style: { marginTop: '8px', fontSize: '13px' } }, 'Te falta cumplir ' + c.reqs.filter(r => !r.ok).length + ' requisito(s). Corrige y vuelve a comprobar.'));
      }
      function end(ok, gaveUp) {
        done = true;
        if (ok) right++;
        answers.push({ q, ok, tries });
        sRight.set(right);
        [bRun, bHint, bGive, bReset].forEach(b => (b.disabled = true));
        ed.ta.readOnly = true;
        const res = J.run(gaveUp ? q.solution : ed.value);
        result.append(h('div', { class: 'feedback ' + (ok ? 'good' : 'bad') },
          h('h4', null, ok ? '✓ ¡Reto superado' + (tries === 1 ? ' a la primera' : ' en ' + tries + ' intentos') + '!' : '👀 Una solución posible'),
          gaveUp ? codeEl(q.solution) : null,
          h('p', { style: { marginTop: '10px' }, html: md(q.why) }),
          h('div', { class: 'mem-title', style: { marginTop: '12px' } }, '🔬 ' + (gaveUp ? 'Así se ejecuta la solución' : 'Así se ejecutó tu código') + ', paso a paso'),
          Stepper(res),
          h('div', null, h('button', { class: 'btn primary', style: { marginTop: '14px' }, onclick: () => { i++; next(); } }, i + 1 >= qs.length ? 'Ver resultado →' : 'Siguiente →'))));
      }
    }
    next();
  }

  // Test de una sección: 5 preguntas al azar de su banco; con 4/5 se marca como entendida
  function sectionQuiz(root, topic, secId, onPass) {
    runQuiz(root, topic, {
      questions: [...shuffle(topic.QUIZ[secId] || []).slice(0, (topic.CHALLENGES[secId] || []).length ? 4 : 5), ...shuffle(topic.CHALLENGES[secId] || []).slice(0, 1)], inline: true, pass: 0.8,
      again: () => sectionQuiz(root, topic, secId, onPass),
      onDone(right, total) {
        const best = saveBest('ops.quiz.' + secId, right);
        if (right / total >= 0.8) { Store.set('ops.sec.' + secId, true); onPass && onPass(); }
        return best;
      }
    });
  }

  // Simulador final: 1 pregunta al azar de cada sección + 7 integradoras
  function examen(root, topic, api) {
    const qs = shuffle([
      ...topic.SECTIONS.filter(s => topic.QUIZ[s.id]).map(s => ({ ...pickOne(topic.QUIZ[s.id]), sec: s.id })),
      ...shuffle(topic.EXAMEN).slice(0, 5).map(q => ({ ...q, sec: 'integrador' })),
      ...shuffle(Object.values(topic.CHALLENGES).flat()).slice(0, 2)
    ]);
    const sub = `${qs.length} preguntas: una de cada sección, 5 integradoras y 2 retos de código. Aprobado: 68%.`;
    runQuiz(root, topic, {
      questions: qs, pass: 0.68,
      head: api.inTab ? h('div', { class: 'game-top' }, h('div', null, h('div', { class: 'h2', style: { margin: 0 } }, '🎯 Simulador de examen'), h('div', { class: 'muted', style: { fontSize: '14px' } }, sub))) : header(api, '🎯 Simulador de examen', sub),
      again: () => examen(root, topic, api),
      actions: [['Ir a los juegos', () => api.back()]],
      onDone: (right, total) => saveBest('ops.exam', Math.round(right / total * 100))
    });
  }
  window.Quiz = { run: runQuiz, section: sectionQuiz };

  // Enter = botón "Siguiente" en cualquier juego
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const all = document.querySelectorAll('.feedback .btn.primary');
    const fb = all[all.length - 1];
    if (fb && document.activeElement !== fb) { e.preventDefault(); fb.click(); }
  });

  window.GAMES = [
    { id: 'arena', ico: '🏟', name: 'Promotion Arena', tag: 'Promoción', desc: 'Contra reloj: ¿qué tipo tiene el resultado? byte + short, long * float, a++…', fn: arena, best: () => Store.get('ops.game.arena', null), unit: 'pts' },
    { id: 'compila', ico: '✅', name: '¿Compila o no?', tag: 'Casting', desc: 'Piensa como javac: rangos, constantes, lossy conversion, literales.', fn: compila, best: () => Store.get('ops.game.compila', null), unit: '/12' },
    { id: 'predice', ico: '🔮', name: 'Predice la salida', tag: 'Operadores', desc: 'Escribe lo que imprime. Luego mira la ejecución paso a paso.', fn: predice, best: () => Store.get('ops.game.predice', null), unit: '/10' },
    { id: 'escalera', ico: '🧗', name: 'La Escalera', tag: 'Precedencia', desc: 'Toca los operadores en el orden exacto en que Java los aplica.', fn: escalera, best: () => Store.get('ops.game.escalera', null), unit: '⭐' },
    { id: 'bitlab', ico: '🧬', name: 'Bit Lab', tag: 'Casting interno', desc: 'Visualiza los bits: qué se conserva y qué se pierde en cada cast.', fn: bitlab, best: () => Store.get('ops.game.bitlab', null), unit: ' retos' },
    { id: 'rayosx', ico: '🩻', name: 'Rayos X', tag: '++ / -- / &&', desc: 'Cámara lenta de la JVM con memoria animada para los casos tramposos.', fn: rayosx, best: () => Store.get('ops.played.rayosx', null) ? '✓' : null, unit: '' },
    { id: 'flash', ico: '🃏', name: 'Flashcards', tag: 'Memoria', desc: 'Las reglas clave en tarjetas que se voltean. Repite hasta dominarlas.', fn: flash, best: () => Store.get('ops.game.flash', null), unit: '%' },
    { id: 'examen', ico: '🎯', name: 'Simulador de examen', tag: 'OCP', desc: 'Todo el tema mezclado: una pregunta por sección + integradoras, y te dice dónde fallaste.', fn: examen, best: () => Store.get('ops.exam', null), unit: '%' }
  ];
})();
