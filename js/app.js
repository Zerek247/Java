/* App: menú lateral, rutas (#/...), página de inicio, tema con pestañas, laboratorio y progreso */
(function () {
  'use strict';
  const { h, md, tchip, Editor, ResultPanel, CodeBlock, Store, toast } = window.UI;
  const J = window.JavaEngine;
  const TOPIC = window.TOPICS.ops;

  const MODULES = [{
    id: 'm1', title: 'Módulo 1: Java Básico', desc: 'Estructura de clases, tipos, operadores, control de flujo, strings y access modifiers',
    topics: [
      { id: 'ops', num: '01', title: 'Handling values - Operators, promotion, casting', q: 52, live: true },
      { id: 'text', num: '01', title: 'Handling values - Manipulating text', q: 45 },
      { id: 'wrap', num: '01', title: 'Handling values - Using primitives and wrapper classes', q: 31 },
      { id: 'if', num: '03', title: 'Controlling Program Flow - if/else, switch', q: 51 },
      { id: 'loops', num: '03', title: 'Controlling Program Flow - Loops', q: 52 },
      { id: 'decl', num: '02', title: 'Java OOA - Declaration and Instantiation', q: 17 },
      { id: 'init', num: '02', title: 'Java OOA - Object Initialization', q: 17 },
      { id: 'gc', num: '02', title: 'Java OOA - Garbage Collection', q: 11 },
      { id: 'fields', num: '02', title: 'Java OOA - Using fields and methods', q: 32 }
    ]
  }];
  const TABS = [['teoria', '📘 Teoría'], ['lab', '🧪 Laboratorio'], ['bits', '🔢 Bits'], ['juegos', '🎮 Juegos'], ['examen', '🎯 Examen']];

  // ───────── Progreso ─────────
  function progress() {
    const secs = TOPIC.SECTIONS.filter(s => Store.get('ops.sec.' + s.id)).length;
    const games = window.GAMES.filter(g => g.id !== 'examen' && g.best() !== null).length;
    const exam = Store.get('ops.exam', 0) >= 68 ? 1 : 0;
    const total = TOPIC.SECTIONS.length + window.GAMES.length - 1 + 2;
    return { secs, games, exam, pct: Math.round((secs + games + exam * 2) / total * 100) };
  }

  // ───────── Lab (estado persistente en la sesión) ─────────
  let labCode = (() => { try { return localStorage.getItem('javaquest-lab') || null; } catch (e) { return null; } })() || TOPIC.LAB_EXAMPLES[0].code;
  let labAutorun = false;

  const App = {
    openLab(code) { labCode = code; labAutorun = true; location.hash = '#/ops/lab'; },
  };
  window.App = App;

  // ───────── Sidebar ─────────
  const sidebar = document.getElementById('sidebar');
  function drawSidebar(route) {
    const p = progress();
    sidebar.replaceChildren(
      h('div', { class: 'brand', onclick: () => (location.hash = '#/') }, h('div', { class: 'brand-logo' }, 'J'), h('div', null, h('h1', null, 'JavaQuest'), h('small', null, 'De cero a certificación'))),
      MODULES.map(m => h('div', { class: 'side-module' },
        h('div', { class: 'side-module-title' }, h('span', null, m.title), h('span', null, '1/' + m.topics.length)),
        m.topics.map((t, i) => [
          h('button', { class: 'side-topic' + (route.topic === t.id ? ' active' : ''), disabled: !t.live, onclick: () => (location.hash = `#/${t.id}/teoria`), title: t.live ? '' : 'Próximamente' },
            h('span', { class: 'num' }, String(i + 1).padStart(2, '0')), h('span', null, t.title.replace(/^.* - /, '')), t.live ? h('span', { class: 'lock', style: { color: 'var(--lime)' } }, p.pct + '%') : h('span', { class: 'lock' }, '🔒')),
          route.topic === t.id ? h('div', { class: 'side-sub' }, TABS.map(([k, l]) => h('button', { class: route.tab === k ? 'active' : '', onclick: () => (location.hash = `#/${t.id}/${k}`) }, l))) : null
        ]))),
      h('div', { class: 'side-foot', html: '💡 <b>Cómo estudiar:</b> lee una sección de teoría → ejecuta sus ejemplos → juega el juego relacionado → vuelve al examen. Repetir es la clave.' }));
  }

  // ───────── Home ─────────
  function home(view) {
    const p = progress();
    const m = MODULES[0];
    view.replaceChildren(h('div', { class: 'container fade-in' },
      h('section', { class: 'hero' },
        h('div', { class: 'eyebrow' }, 'Java · nivel certificación OCP'),
        h('h1', { class: 'h1' }, 'Aprende Java ', h('span', { class: 'grad-text' }, 'jugando con el compilador'), '.'),
        h('p', { class: 'lead' }, 'Nada de memorizar a ciegas: cada regla la ves funcionar. Escribe código, ejecútalo paso a paso, mira los bits en memoria y entiende por qué algo compila o no — con un mini compilador de Java que corre en tu navegador.'),
        h('div', { class: 'hero-cta' },
          h('button', { class: 'btn primary', onclick: () => (location.hash = '#/ops/teoria') }, p.pct ? '▶ Continuar tema 1' : '▶ Empezar por el tema 1'),
          h('button', { class: 'btn', onclick: () => (location.hash = '#/ops/lab') }, '🧪 Abrir el laboratorio'),
          h('button', { class: 'btn', onclick: () => (location.hash = '#/ops/juegos') }, '🎮 Ir a los juegos')),
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('b', { class: 'grad-text' }, p.pct + '%'), h('span', null, 'progreso tema 1')),
          h('div', { class: 'stat' }, h('b', null, `${p.secs}/${TOPIC.SECTIONS.length}`), h('span', null, 'secciones entendidas')),
          h('div', { class: 'stat' }, h('b', null, `${p.games}/${window.GAMES.length - 1}`), h('span', null, 'juegos probados')),
          h('div', { class: 'stat' }, h('b', null, (Store.get('ops.exam', null) ?? '–') + (Store.get('ops.exam', null) !== null ? '%' : '')), h('span', null, 'mejor examen')))),
      h('div', { class: 'card module-card' },
        h('div', { class: 'module-head' },
          h('h2', null, m.title, h('span', { class: 'pill' }, m.topics.reduce((a, t) => a + t.q, 0) + ' preguntas')),
          h('div', { class: 'muted', style: { fontSize: '14px', marginTop: '4px' } }, m.desc),
          h('div', { class: 'progress' }, h('i', { style: { width: Math.round(p.pct / m.topics.length) + '%' } }))),
        m.topics.map(t => h('button', { class: 'topic-row' + (t.live ? ' live' : ''), disabled: !t.live, onclick: () => (location.hash = `#/${t.id}/teoria`) },
          h('span', { class: 'dot' }), h('b', null, `${t.num} - ${t.title}`),
          h('span', { class: 'meta' }, t.live ? h('span', { class: 'pill', style: { background: 'rgba(163,230,53,.15)', color: 'var(--lime)', borderColor: 'rgba(163,230,53,.4)' } }, 'disponible · ' + p.pct + '%') : h('span', null, 'próximamente'), `${t.q}Q`, t.live ? '›' : '🔒')))),
      h('div', { class: 'grid3', style: { marginTop: '26px' } },
        [['📘', 'Teoría que se ejecuta', 'Cada regla viene con código que puedes correr ahí mismo, y un botón para ver el porqué paso a paso.'],
        ['🧪', 'Laboratorio con rayos X', 'Escribe Java y mira: salida, traza de cada operación, árbol de tipos, variables y sus bits reales.'],
        ['🎮', '8 juegos', 'Promotion Arena, ¿Compila?, Predice la salida, La Escalera, Bit Lab, Rayos X, Flashcards y examen.']]
          .map(([i, t, d]) => h('div', { class: 'card' }, h('div', { style: { fontSize: '28px' } }, i), h('div', { class: 'h3', style: { marginTop: '8px' } }, t), h('p', { class: 'muted', style: { margin: 0 } }, d))))));
  }

  // ───────── Página del tema ─────────
  function topicPage(view, route) {
    const p = progress();
    const content = h('div');
    view.replaceChildren(h('div', { class: 'container fade-in' },
      h('div', { class: 'topic-header' },
        h('div', { style: { flex: 1, minWidth: '260px' } },
          h('div', { class: 'eyebrow' }, 'Módulo 1 · Tema 01 · Handling values'),
          h('h1', { class: 'h1', style: { marginBottom: '4px' } }, 'Operators, ', h('span', { class: 'grad-text' }, 'Promotion'), ' & Casting'),
          h('p', { class: 'muted', style: { margin: 0 } }, 'Cómo opera Java con los valores, cómo iguala los tipos y cómo los convierte. Las reglas exactas que pide la certificación.')),
        h('div', { class: 'ring', style: { '--p': p.pct }, title: 'progreso del tema' }, h('span', null, p.pct + '%'))),
      h('div', { class: 'tabs' }, TABS.map(([k, l]) => h('button', { class: 'tab' + (route.tab === k ? ' active' : ''), onclick: () => (location.hash = `#/ops/${k}`) }, l))),
      content));
    const api = { back: () => (location.hash = '#/ops/juegos') };
    switch (route.tab) {
      case 'lab': return lab(content);
      case 'bits': return window.BitsTool(content);
      case 'juegos': {
        if (route.sub) {
          const g = window.GAMES.find(x => x.id === route.sub);
          if (g) return g.fn(content, TOPIC, api);
        }
        return gamesHub(content);
      }
      case 'examen': return window.GAMES.find(g => g.id === 'examen').fn(content, TOPIC, { back: () => (location.hash = '#/ops/juegos'), inTab: true });
      default: return theory(content, route.sub);
    }
  }

  // ───────── Teoría ─────────
  function theory(root, focus) {
    const toc = h('nav', { class: 'toc' });
    const secs = h('div');
    const label = { rule: '📏 Regla', trap: '⚠ Trampa de examen', tip: '💡 Tip', deep: '🔬 Por dentro' };
    function block(b) {
      if (b.p) return h('p', { class: 'blk', html: md(b.p) });
      for (const k of ['rule', 'trap', 'tip', 'deep']) if (b[k]) return h('div', { class: k + ' blk' }, h('span', { class: 'blk-label' }, b.title ? label[k].split(' ')[0] + ' ' + b.title : label[k]), h('p', { html: md(b[k]) }));
      if (b.code) return h('div', { class: 'blk' }, CodeBlock(b.code, { note: b.note }));
      if (b.table) return h('div', { class: 'blk tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, b.table.head.map(c => h('th', null, c)))), h('tbody', null, b.table.rows.map(r => h('tr', null, r.map(c => h('td', { html: md(c) })))))));
      if (b.list) return h('div', { class: 'card blk' }, b.list.map(item => {
        const row = h('label', { class: 'row', style: { flexWrap: 'nowrap', alignItems: 'flex-start', padding: '6px 0', cursor: 'pointer', gap: '10px' } }, h('input', { type: 'checkbox', style: { marginTop: '5px', accentColor: '#a3e635' } }), h('span', { html: md(item) }));
        return row;
      }));
      if (b.widget) return h('div', { class: 'blk' }, window.Widgets[b.widget]());
      if (b.game) {
        const g = window.GAMES.find(x => x.id === b.game);
        return h('div', { class: 'card blk row', style: { borderColor: 'rgba(139,92,246,.5)', background: 'linear-gradient(120deg, rgba(139,92,246,.15), rgba(34,211,238,.06))' } },
          h('span', { style: { fontSize: '30px' } }, g.ico), h('span', { style: { flex: 1, minWidth: '200px' }, html: md(b.text) }),
          h('button', { class: 'btn primary', onclick: () => (location.hash = b.game === 'examen' ? '#/ops/examen' : '#/ops/juegos/' + b.game) }, 'Jugar →'));
      }
      return null;
    }
    TOPIC.SECTIONS.forEach((s, i) => {
      const done = () => Store.get('ops.sec.' + s.id, false);
      const tb = h('button', { class: done() ? 'done' : '', onclick: () => document.getElementById('sec-' + s.id).scrollIntoView({ behavior: 'smooth' }) }, h('span', { class: 'chk' }, done() ? '✓' : ''), `${i + 1}. ${s.title}`);
      toc.append(tb);
      // Estado de la sección: se completa automáticamente al superar su test
      const best = () => Store.get('ops.quiz.' + s.id, null);
      const status = h('div', { class: 'sec-status' });
      const headBadge = h('span', { class: 'pill sec-badge' });
      const paintDone = () => {
        const v = done(), b = best();
        tb.className = v ? 'done' : ''; tb.firstChild.textContent = v ? '✓' : '';
        headBadge.textContent = v ? '✓ Completada' : '○ Pendiente';
        headBadge.classList.toggle('ok', v);
        status.className = 'sec-status' + (v ? ' ok' : '');
        status.replaceChildren(
          h('span', { class: 'sec-status-ico' }, v ? '✅' : '🎯'),
          h('span', { style: { flex: 1, minWidth: '200px' } }, v
            ? h('span', null, h('b', null, 'Sección completada'), ` · mejor resultado en el test: ${b ?? '–'}/5. Puedes repetir el test cuando quieras para repasar.`)
            : h('span', null, h('b', null, 'Supera el test (4 de 5) para completar esta sección.'), b !== null ? ` Tu mejor resultado hasta ahora: ${b}/5.` : '')),
          TOPIC.SECTIONS[i + 1] ? h('button', { class: 'btn sm' + (v ? ' primary' : ' ghost'), onclick: () => document.getElementById('sec-' + TOPIC.SECTIONS[i + 1].id).scrollIntoView({ behavior: 'smooth' }) }, 'Siguiente: ' + TOPIC.SECTIONS[i + 1].title + ' ↓')
            : h('button', { class: 'btn sm' + (v ? ' primary' : ' ghost'), onclick: () => (location.hash = '#/ops/examen') }, '🎯 Ir al simulacro final →'));
      };
      // Test de la sección, siempre visible al final
      const nQ = (TOPIC.QUIZ[s.id] || []).length;
      const quizInner = h('div');
      const quizBox = h('div', { class: 'section-quiz' },
        h('div', { class: 'row', style: { marginBottom: '10px' } }, h('div', { class: 'h3', style: { margin: 0 } }, `📝 Test de la sección ${i + 1}`), h('span', { class: 'muted', style: { fontSize: '13px' } }, `4 preguntas al azar de ${nQ} + 1 reto de código · cada intento es distinto`)),
        quizInner);
      secs.append(h('section', { class: 'section card', id: 'sec-' + s.id },
        h('div', { class: 'section-head' }, h('div', { class: 'section-num' }, i + 1), h('h2', { class: 'h2', style: { flex: 1 } }, s.title), nQ ? headBadge : null),
        s.blocks.map(block),
        nQ ? quizBox : null,
        status));
      if (nQ) window.Quiz.section(quizInner, TOPIC, s.id, () => { paintDone(); toast(`🎉 ¡Sección ${i + 1} completada! Progreso del tema: ${progress().pct}%`); }, () => paintDone());
      paintDone();
    });
    root.replaceChildren(h('div', { class: 'theory' }, toc, secs));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const idx = TOPIC.SECTIONS.findIndex(s => 'sec-' + s.id === e.target.id);
      [...toc.children].forEach((b, j) => b.classList.toggle('active', j === idx));
    }), { rootMargin: '-30% 0px -60% 0px' });
    secs.querySelectorAll('section').forEach(s => io.observe(s));
    if (focus) setTimeout(() => { const el = document.getElementById('sec-' + focus); el && el.scrollIntoView(); }, 50);
  }

  // ───────── Laboratorio ─────────
  function lab(root) {
    const sel = h('select', { class: 'sel', onchange: e => { if (e.target.value !== '') { ed.value = TOPIC.LAB_EXAMPLES[+e.target.value].code; save(); run(); } } },
      h('option', { value: '' }, '📂 Ejemplos…'), TOPIC.LAB_EXAMPLES.map((x, i) => h('option', { value: i }, x.name)));
    const bar = h('div', { class: 'ed-bar' },
      h('button', { class: 'btn sm primary', onclick: () => run() }, '▶ Ejecutar'), h('span', { class: 'muted', style: { fontSize: '12px' } }, h('kbd', null, 'Ctrl'), '+', h('kbd', null, 'Enter')),
      h('span', { class: 'spacer' }), sel,
      h('button', { class: 'btn sm ghost', onclick: () => { ed.value = ''; save(); ed.ta.focus(); } }, '🗑 Limpiar'));
    const save = () => { try { localStorage.setItem('javaquest-lab', ed.value); } catch (e) { /* */ } };
    const ed = Editor(labCode, { bar, onRun: () => run(), onChange: v => { labCode = v; save(); } });
    const panel = ResultPanel({ onLine: n => ed.setActive(n) });
    function run() {
      labCode = ed.value;
      const res = J.run(ed.value);
      ed.setError(res.phase === 'compile' ? res.error.line : 0);
      panel.show(res, 'out');
      Store.set('ops.played.lab', true);
    }
    root.replaceChildren(
      h('div', { class: 'tip', style: { marginBottom: '16px' } }, h('span', { class: 'blk-label' }, '🧪 Tu laboratorio de Java'), h('p', { html: md('Escribe sentencias sueltas (o pega una clase con `main`). Soporta los 8 primitivos, `String`, `var`, `final`, `if/else`, todos los operadores, casts y `System.out.println`. Mira **Paso a paso** para la ejecución en cámara lenta, **Árbol de tipos** para ver la promoción y **Variables y bits** para la memoria real.') })),
      h('div', { class: 'lab' }, ed.el, panel.el));
    if (labAutorun) { labAutorun = false; setTimeout(run, 30); }
  }

  // ───────── Juegos ─────────
  function gamesHub(root) {
    root.replaceChildren(h('div', { class: 'grid3 fade-in' }, window.GAMES.map(g => {
      const best = g.best();
      return h('div', { class: 'card game-card', tabindex: 0, onclick: () => (location.hash = g.id === 'examen' ? '#/ops/examen' : '#/ops/juegos/' + g.id), onkeydown: e => e.key === 'Enter' && e.currentTarget.click() },
        h('span', { class: 'pill tag' }, g.tag), h('div', { class: 'ico' }, g.ico), h('h3', null, g.name), h('p', null, g.desc),
        h('div', { class: 'best' }, best !== null ? `⭐ Mejor: ${best}${g.unit}` : '— sin jugar todavía —'));
    })));
  }

  // ───────── Router ─────────
  const view = document.getElementById('view');
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const r = { topic: parts[0] || null, tab: parts[1] || 'teoria', sub: parts[2] || null };
    sidebar.classList.remove('open');
    drawSidebar(r);
    if (r.topic === 'ops') topicPage(view, r); else home(view);
    if (!(r.tab === 'teoria' && r.sub)) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('progress', () => {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    drawSidebar({ topic: parts[0] || null, tab: parts[1] || 'teoria' });
    const ring = document.querySelector('.ring');
    if (ring) { const p = progress().pct; ring.style.setProperty('--p', p); ring.querySelector('span').textContent = p + '%'; }
  });
  document.getElementById('menu-btn').addEventListener('click', () => sidebar.classList.toggle('open'));
  route();
})();
