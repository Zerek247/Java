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
// Test por sección: cada sección tiene banco suficiente y las respuestas con código coinciden con el motor
const QM = require('../js/quiz-ops.js');
const Q = QM.QUIZ;
// Retos de código: la solución cumple todos los requisitos y el código inicial NO
for (const s of T.SECTIONS) {
  const list = QM.CHALLENGES[s.id];
  if (!list || list.length < 2) { bad('RETO', s.id, 'menos de 2 retos'); continue; }
  for (const ch of list) {
    const sol = QM.check(ch, ch.solution);
    sol.ok ? pass++ : bad('RETO solución', s.id, JSON.stringify(ch.solution), sol.reqs.filter(r => !r.ok).map(r => r.text), sol.res.out || (sol.res.error && sol.res.error.msg));
    QM.check(ch, ch.starter).ok ? bad('RETO starter ya resuelto', s.id, ch.starter) : pass++;
    ch.hint && ch.why ? pass++ : bad('RETO sin pista/explicación', s.id, ch.task);
  }
}
// Las trampas típicas no deben pasar los retos
const cheat = (sec, i, code) => { QM.check(QM.CHALLENGES[sec][i], code).ok ? bad('RETO tramposo aceptado', sec, code) : pass++; };
cheat('aritmeticos', 2, 'System.out.println(3000000000L);');
cheat('aritmeticos', 0, 'System.out.println("3 2");');
cheat('casting', 0, 'System.out.println(-56);');
cheat('precedencia', 0, 'int r = 19;\nSystem.out.println(r);');
cheat('bits', 0, 'int x = 5;\nint r = 40;\nSystem.out.println(r);');
for (const s of T.SECTIONS) {
  const bank = Q[s.id];
  if (!bank || bank.length < 6) { bad('QUIZ', s.id, 'banco insuficiente', bank && bank.length); continue; }
  for (const q of bank) {
    if (!(q.a >= 0 && q.a < q.opts.length) || !q.why) { bad('QUIZ formato', s.id, q.code || q.q); continue; }
    if (!q.code) { pass++; continue; }
    const r = J.run(q.code);
    const ans = q.opts[q.a];
    let ok;
    if (r.phase === 'compile') ok = /No compila|Compilation fails/.test(ans);
    else if (r.phase === 'runtime') ok = /ArithmeticException/.test(ans);
    else if (r.out.trim()) ok = r.out.trimEnd() === ans;
    else ok = /^(Compila|Sí)/.test(ans);
    ok ? pass++ : bad('QUIZ', s.id, JSON.stringify(q.code), 'respuesta', ans, '→ motor:', r.phase || 'ok', r.out.trim() || (r.error && r.error.msg));
  }
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
