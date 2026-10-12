// Verifica que las respuestas de los juegos coincidan con el motor.  node tests/content.test.js
globalThis.window = globalThis;
const J = require('../js/engine.js');
const T = require('../js/content-ops.js');
let pass = 0, fail = 0;
const bad = (...a) => { fail++; console.log('✗', ...a); };

for (const q of T.COMPILA) {
  const r = J.run(q.code);
  const ok = r.ok || r.phase === 'runtime';
  ok === q.ok ? pass++ : bad('COMPILA', JSON.stringify(q.code), 'esperado', q.ok, 'motor:', r.error && r.error.msg);
}
for (const q of T.PREDICE) {
  const r = J.run(q.code);
  r.out.trimEnd() === q.out ? pass++ : bad('PREDICE', JSON.stringify(q.code), q.out, '→', r.out, r.error && r.error.msg);
}
for (const q of T.EXAMEN) {
  if (!q.code) continue;
  const r = J.run(q.code);
  const ans = q.opts[q.a];
  if (r.ok) (r.out.trimEnd() === ans ? pass++ : bad('EXAMEN', JSON.stringify(q.code), ans, '→', r.out));
  else if (r.phase === 'compile') {
    const m = /línea (\d)/.exec(ans);
    const okc = /Compilation fails|No compila|Falla/.test(ans) && (!m || +m[1] === r.error.line);
    okc ? pass++ : bad('EXAMEN CE', JSON.stringify(q.code), ans, '→', r.error.msg, 'línea', r.error.line);
  } else bad('EXAMEN runtime', q.code);
}
for (const q of T.BITRETOS) {
  const r = J.run(`System.out.println(${q.e});`);
  r.out.trimEnd() === q.a ? pass++ : bad('BIT', q.e, q.a, '→', r.out, r.error && r.error.msg);
}
for (const e of T.ESCALERA) {
  const r = J.run(`int a = 2, b = 3, c = 4;\nvar r = ${e};`);
  r.ok ? pass++ : bad('ESCALERA', e, r.error && r.error.msg);
}
for (const x of [...T.RAYOSX, ...T.LAB_EXAMPLES]) {
  const r = J.run(x.code);
  (r.ok || x.name.startsWith('Error')) ? pass++ : bad('PRESET', x.name, r.error && r.error.msg);
}
// los ejemplos de teoría: solo comprobamos que el motor no falle internamente
for (const s of T.SECTIONS) for (const b of s.blocks) if (b.code) {
  const r = J.run(b.code);
  (r.error && /interno/.test(r.error.msg)) ? bad('TEORIA', b.code, r.error.msg) : pass++;
}
console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
