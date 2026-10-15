# JavaQuest ☕

App web para aprender Java desde cero hasta nivel certificación (OCP), de forma interactiva.

Incluye un **mini compilador + intérprete de Java escrito en JavaScript** (`js/engine.js`) que aplica las reglas del JLS: promoción numérica, conversiones de asignación, constantes de compilación, `final`, `var`, overflow de 32/64 bits, cortocircuito, String pool… y explica cada paso.

## Cómo abrirla

```bash
node tools/serve.js
```

Luego abre http://localhost:5173. (También funciona con doble clic en `index.html`.)

## Desplegar en Vercel

Es un sitio estático: no hay que compilar nada. `vercel.json` ya está configurado.

1. Entra a https://vercel.com/new e importa el repo de GitHub.
2. Deja todo como viene (Vercel lee `vercel.json`) y pulsa **Deploy**.
3. Cada `git push` a `main` vuelve a desplegar automáticamente.

En cada despliegue se ejecuta `npm test`: si un test falla, **el despliegue se cancela** y la versión anterior sigue en línea.

O desde la terminal: `npm i -g vercel` y luego `vercel --prod`.

## Qué hay

| Sección | Qué hace |
|---|---|
| 📘 Teoría | 13 secciones con ejemplos ejecutables, reglas, trampas de examen, widgets y al final de cada una, su **📝 Test** (4 preguntas al azar + 1 **reto de código** que escribes tú y el motor valida); al sacar 4/5 la sección se completa sola |
| 🧪 Laboratorio | Editor de Java: salida, paso a paso con memoria animada, traza, árbol de tipos y bits |
| 🔢 Bits (panel flotante) | Se abre encima de cualquier página (botón flotante o tecla B) sin perder tu ejercicio. Convertidor decimal / binario / hex / octal por tipo, bits clicables, complemento a dos, IEEE 754 y calculadora de bits |
| 🎮 Juegos | Promotion Arena, ¿Compila?, Predice la salida, La Escalera, Bit Lab, Rayos X, Flashcards |
| 🎯 Examen | Simulacro final: 1 pregunta de cada sección + 5 integradoras + 2 retos de código, con desglose de dónde fallaste |

## Tests

```bash
node tests/engine.test.js     # semántica de Java del motor
node tests/content.test.js    # las respuestas de los juegos coinciden con el motor
```

## Estructura

- `js/engine.js` — léxico, parser, chequeo de tipos y ejecución con traza
- `js/ui.js` — editor, consola, depurador paso a paso, árbol de tipos
- `js/content-ops.js` — teoría y bancos de preguntas de los juegos del tema 1
- `js/quiz-ops.js` — preguntas y retos de código por sección, y el validador de retos
- `js/bits.js` — panel flotante de Bits (convertidor y calculadora)
- `js/widgets.js` — widgets interactivos de la teoría
- `js/games.js` — los juegos
- `js/app.js` — menú, rutas y progreso

Para añadir un tema nuevo: crea `js/content-<tema>.js` con la misma forma que `content-ops.js` y actívalo en `MODULES` dentro de `app.js`.
