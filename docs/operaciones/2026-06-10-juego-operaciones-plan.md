# Juego de Operaciones — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Construir el juego de Operaciones matemáticas (AR sobre el marcador, con modo de prueba sin AR) según el storyboard v2.

**Architecture:** Página propia `juegos/operaciones/index.html` (ya existe como stub "Próximamente", se reemplaza). La **lógica matemática** vive en un módulo puro y testeado (`mathgen.js`). El **juego** es una capa DOM interactiva (operación con estilo 3D, bola de energía animada, 4 esferas arrastrables) que funciona con o sin AR. Un **flag `?nomarker`** desactiva cámara/marcador y usa un fondo aleatorio para probar en el navegador.

**Tech Stack:** Vite, A-Frame + MindAR (vendored, solo en modo AR), JS plano + CSS. Tests con `node --test` (sin dependencias).

**Storyboard de referencia:** `docs/operaciones/2026-06-10-juego-operaciones-storyboard.html`

---

## Notas para quien ejecuta

- Commits con prefijo `[Opus-4.8]:`. Rama `feat/juego-operaciones`.
- `node --check <archivo>` valida sintaxis de cada módulo. `node --test` corre los tests.
- El modo AR reusa el patrón del Sistema Solar (MindAR `autoStart:false`). El modo `?nomarker` NO carga AR.
- **Reusar el marcador compartido:** `imageTargetSrc: /assets/targets/marker-sistema-solar.mind`.

### Mapa de archivos

```
juegos/operaciones/index.html              MODIFICAR (de stub → juego)
src/juegos/operaciones/main.js             CREAR  — orquestador (modo AR/nomarker, game loop, wiring)
src/juegos/operaciones/mathgen.js          CREAR  — lógica pura: operación por nivel + 4 opciones + datos de ayuda  [TESTEADO]
src/juegos/operaciones/mathgen.test.js     CREAR  — tests node:test
src/juegos/operaciones/config.js           CREAR  — niveles, flag nomarker, fondos aleatorios
src/juegos/operaciones/ui.js               CREAR  — capa DOM: selector de nivel, operación, ayuda visual, bola, esferas arrastrables, resultado
src/juegos/operaciones/operaciones.css     CREAR  — estilos (basados en el storyboard)
package.json                               MODIFICAR (script "test")
vite.config.js                             (sin cambios — ya incluye la entrada operaciones)
```

---

## Task 1: Lógica matemática pura + tests (`mathgen.js`)

**Files:** Create `src/juegos/operaciones/mathgen.js`, `src/juegos/operaciones/mathgen.test.js`

> Núcleo testeable. Sin DOM. Acepta un `rng = Math.random` inyectable para tests deterministas.

- [ ] **Step 1: Crear `src/juegos/operaciones/mathgen.js`**

```js
// Lógica pura del juego de Operaciones: generación de operaciones por nivel y opciones de respuesta.
// Sin DOM. `rng` inyectable para tests deterministas (por defecto Math.random).

const randInt = (min, max, rng = Math.random) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];

// Definición de cada nivel: edades de referencia y tipos de operación disponibles.
export const LEVELS = {
  1: { age: 7, label: "Nivel 1", hint: true, types: ["add", "sub"] },
  2: { age: 8, label: "Nivel 2", hint: true, types: ["add", "sub", "mul"] },
  3: { age: 10, label: "Nivel 3", hint: false, types: ["mul", "div"] },
  4: { age: 11, label: "Nivel 4", hint: false, types: ["mul", "div", "square", "cuberoot"] }
};

const SYMBOLS = { add: "+", sub: "−", mul: "×", div: "÷" };

// Construye una operación concreta para un tipo y nivel. Devuelve { type, a, b, answer, text, hint }.
const buildOperation = (type, level, rng) => {
  switch (type) {
    case "add": {
      const max = level <= 1 ? 9 : 18;
      let a = randInt(1, max, rng);
      let b = randInt(1, Math.max(1, (level <= 1 ? 10 : 20) - a), rng);
      return { type, a, b, answer: a + b, text: `${a} + ${b}`, hint: { kind: "add", a, b } };
    }
    case "sub": {
      const max = level <= 1 ? 10 : 20;
      let a = randInt(2, max, rng);
      let b = randInt(1, a, rng); // sin negativos
      return { type, a, b, answer: a - b, text: `${a} − ${b}`, hint: { kind: "sub", a, b } };
    }
    case "mul": {
      const hi = level <= 2 ? 5 : 10;
      const a = randInt(2, hi, rng);
      const b = randInt(2, hi, rng);
      return { type, a, b, answer: a * b, text: `${a} × ${b}`, hint: { kind: "mul", a, b } };
    }
    case "div": {
      const hi = level <= 3 ? 10 : 12;
      const b = randInt(2, hi, rng);
      const answer = randInt(2, hi, rng);
      const a = b * answer; // división exacta
      return { type, a, b, answer, text: `${a} ÷ ${b}`, hint: null };
    }
    case "square": {
      const a = randInt(2, 12, rng);
      return { type, a, b: 2, answer: a * a, text: `${a}²`, hint: null };
    }
    case "cuberoot": {
      const root = pick([2, 3, 4, 5, 6, 10], rng);
      const a = root * root * root;
      return { type, a, b: 3, answer: root, text: `∛${a}`, hint: null };
    }
    default:
      throw new Error(`Tipo de operación desconocido: ${type}`);
  }
};

// Genera una operación aleatoria válida para el nivel dado (1-4).
export const generateOperation = (level = 1, rng = Math.random) => {
  const cfg = LEVELS[level] || LEVELS[1];
  const type = pick(cfg.types, rng);
  const op = buildOperation(type, level, rng);
  return { level, hintEnabled: cfg.hint, ...op };
};

// Genera 4 opciones (la correcta + 3 distractores plausibles, distintos, no negativos), barajadas.
export const generateOptions = (operation, rng = Math.random) => {
  const answer = operation.answer;
  const options = new Set([answer]);
  let guard = 0;
  while (options.size < 4 && guard < 100) {
    guard += 1;
    const delta = randInt(1, Math.max(2, Math.ceil(Math.abs(answer) * 0.4) + 2), rng) * (rng() < 0.5 ? -1 : 1);
    const candidate = answer + delta;
    if (candidate >= 0 && candidate !== answer) {
      options.add(candidate);
    }
  }
  // Relleno determinista por si guard se agotó.
  let filler = answer + 1;
  while (options.size < 4) {
    if (filler !== answer && filler >= 0) options.add(filler);
    filler += 1;
  }
  // Barajar
  const arr = [...options];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
```

- [ ] **Step 2: Crear `src/juegos/operaciones/mathgen.test.js`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateOperation, generateOptions, LEVELS } from "./mathgen.js";

// rng determinista simple (LCG) para reproducibilidad.
const makeRng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

test("generateOperation respeta el nivel y produce respuestas correctas", () => {
  for (const level of [1, 2, 3, 4]) {
    const rng = makeRng(level * 7 + 1);
    for (let i = 0; i < 200; i += 1) {
      const op = generateOperation(level, rng);
      assert.equal(op.level, level);
      assert.ok(LEVELS[level].types.includes(op.type), `tipo ${op.type} válido en nivel ${level}`);
      assert.ok(Number.isInteger(op.answer), "answer entero");
      assert.ok(op.answer >= 0, "answer no negativo");
      // Verifica la aritmética por tipo
      if (op.type === "add") assert.equal(op.answer, op.a + op.b);
      if (op.type === "sub") { assert.equal(op.answer, op.a - op.b); assert.ok(op.answer >= 0); }
      if (op.type === "mul") assert.equal(op.answer, op.a * op.b);
      if (op.type === "div") assert.equal(op.a, op.b * op.answer);
      if (op.type === "square") assert.equal(op.answer * op.answer, op.a);
      if (op.type === "cuberoot") assert.equal(op.answer ** 3, op.a);
      assert.equal(typeof op.text, "string");
      assert.ok(op.text.length > 0);
    }
  }
});

test("hintEnabled solo en niveles 1 y 2", () => {
  assert.equal(generateOperation(1, makeRng(1)).hintEnabled, true);
  assert.equal(generateOperation(2, makeRng(2)).hintEnabled, true);
  assert.equal(generateOperation(3, makeRng(3)).hintEnabled, false);
  assert.equal(generateOperation(4, makeRng(4)).hintEnabled, false);
});

test("generateOptions da 4 opciones distintas, no negativas, con la respuesta incluida", () => {
  for (const level of [1, 2, 3, 4]) {
    const rng = makeRng(level * 13 + 5);
    for (let i = 0; i < 200; i += 1) {
      const op = generateOperation(level, rng);
      const opts = generateOptions(op, rng);
      assert.equal(opts.length, 4, "exactamente 4 opciones");
      assert.equal(new Set(opts).size, 4, "todas distintas");
      assert.ok(opts.every((n) => Number.isInteger(n) && n >= 0), "enteros no negativos");
      assert.ok(opts.includes(op.answer), "incluye la respuesta correcta");
    }
  }
});

test("nivel inválido cae a nivel 1", () => {
  const op = generateOperation(99, makeRng(1));
  assert.equal(op.level, 99);
  assert.ok(LEVELS[1].types.includes(op.type));
});
```

- [ ] **Step 3: Agregar script de test a `package.json`**

En `package.json`, dentro de `"scripts"`, agregar: `"test": "node --test"`.

- [ ] **Step 4: Correr los tests**

Run: `npm test`
Expected: todos los tests pasan (`# pass`, `0 fail`). Si algún test falla, corregir `mathgen.js` (no el test) hasta que pasen.

- [ ] **Step 5: Commit**

```bash
git add src/juegos/operaciones/mathgen.js src/juegos/operaciones/mathgen.test.js package.json
git commit -m "[Opus-4.8]: Agrega lógica de operaciones matemáticas con tests"
```

---

## Task 2: Configuración (`config.js`)

**Files:** Create `src/juegos/operaciones/config.js`

- [ ] **Step 1: Crear `src/juegos/operaciones/config.js`**

```js
// Configuración del juego de Operaciones.

// Flag de prueba: con ?nomarker (o ?test) en la URL, el juego NO usa cámara ni marcador,
// y se muestra directo en el navegador sobre un fondo aleatorio.
export const isNoMarkerMode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.has("nomarker") || params.has("test");
};

// Fondos (degradados) para el modo sin marcador. Se elige uno al azar.
export const BACKGROUNDS = [
  "radial-gradient(circle at 30% 20%, #243b6b 0%, #0b1026 70%)",
  "linear-gradient(160deg, #2a1a5e, #6a4bd6)",
  "linear-gradient(160deg, #0e7a5f, #134e4a)",
  "radial-gradient(circle at 70% 30%, #7a2e6b 0%, #1a0b26 70%)",
  "radial-gradient(circle at 50% 80%, #1f6f78 0%, #07121f 70%)"
];

export const pickRandomBackground = () =>
  BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];

// Texto y tunables.
export const GAME_CONFIG = {
  markerSrc: "/assets/targets/marker-sistema-solar.mind",
  correctText: "¡Resultado correcto!",
  incorrectPrefix: "Casi… la respuesta era",
  defaultLevel: 1
};
```

- [ ] **Step 2: Verificar sintaxis**

Run: `node --check src/juegos/operaciones/config.js`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add src/juegos/operaciones/config.js
git commit -m "[Opus-4.8]: Agrega config del juego de Operaciones (flag nomarker + fondos)"
```

---

## Task 3: Estilos del juego (`operaciones.css`)

**Files:** Create `src/juegos/operaciones/operaciones.css`

> Reusar el look del storyboard. La capa de juego es DOM sobre la cámara (modo AR) o sobre un fondo (modo nomarker). Debe ser auto-contenida.

- [ ] **Step 1: Crear `src/juegos/operaciones/operaciones.css`** con estilos para:
  - `html, body`: pantalla completa, sin scroll, fuente del proyecto, color claro. En modo nomarker el `body` lleva un fondo (se asigna por JS con `background` inline), así que NO fijar un fondo opaco aquí que lo tape.
  - `#op-root`: capa fija `inset:0`, `z-index` sobre la cámara, `pointer-events` solo en los elementos interactivos.
  - `.back-to-catalog`: botón «‹ Volver» arriba-izquierda (copiar el estilo que ya existe en `src/styles.css`).
  - `.op-level-select`: panel centrado con 4 botones de nivel (mostrar número + edad). Botón seleccionado resaltado.
  - `.op-statement`: la operación con estilo 3D (usar `text-shadow` en capas como en el storyboard `.op3d`).
  - `.op-hint`: fila de cubitos para la ayuda visual (clases `.op-cube`, grupos, signo). Solo visible en niveles 1-2.
  - `.op-ready-btn`: botón "⚡ Listo".
  - `.energy-ball`: bola de energía animada estilo Dragon Ball (gradiente radial blanco→amarillo→colores, `box-shadow` de brillo, `@keyframes` de pulso). Centro legible.
  - `.op-sphere`: esfera de opción arrastrable (gradiente radial, sombra). Estado `.dragging` (elevada) y `.snap-target` para la bola cuando una esfera está cerca.
  - `.op-result`: mensaje de resultado (correcto verde / incorrecto rojo) + botones de acción (`Otra operación`, `Salir`, `Repetir`).
  - Usar los colores del storyboard (acento `#15a37a`, energía blanco/amarillo/colores). Texto siempre legible (claro sobre fondo oscuro).

  Tomar como referencia visual exacta las clases del storyboard `docs/operaciones/2026-06-10-juego-operaciones-storyboard.html` (`.energy`, `.opt-sphere`, `.hint`, `.op3d`, `@keyframes ki`).

- [ ] **Step 2: Commit**

```bash
git add src/juegos/operaciones/operaciones.css
git commit -m "[Opus-4.8]: Agrega estilos del juego de Operaciones"
```

---

## Task 4: Capa de juego DOM (`ui.js`)

**Files:** Create `src/juegos/operaciones/ui.js`

> Construye y controla toda la UI del juego dentro de un contenedor `#op-root`. No sabe de AR; solo del DOM. Expone una API que `main.js` orquesta.

- [ ] **Step 1: Crear `src/juegos/operaciones/ui.js`** que exporte `createOperacionesUI({ onAnswer })` y devuelva un objeto con métodos. Requisitos:

  **Pantallas / estados** (todo dentro de `#op-root`):
  1. `showLevelSelect(onPick)`: muestra los 4 niveles (de `LEVELS` en mathgen) con número y edad; al elegir uno llama `onPick(level)`.
  2. `showOperation(operation, options, { showReady })`: pinta la operación (`.op-statement`), y si `operation.hintEnabled` pinta la ayuda visual de cubitos (`renderHint(operation.hint)`); muestra el botón "Listo".
  3. Al tocar "Listo": oculta "Listo", muestra la `.energy-ball` (con la operación dentro) y las 4 `.op-sphere` con las `options`.
  4. **Arrastre:** cada `.op-sphere` es arrastrable con Pointer Events (mouse+touch, pointer capture, como `dragdrop.js` del Sistema Solar). Mientras se arrastra: `.dragging`. Si en `pointerup` el centro de la esfera está dentro del radio de la `.energy-ball` → se considera "soltada en la bola" y se llama `onAnswer(value, isCorrect)` donde `isCorrect = (value === operation.answer)`. Si se suelta fuera, la esfera vuelve a su lugar.
  5. `showResult(isCorrect, correctAnswer)`: si correcto → mensaje verde + botones "Otra operación" / "Salir"; si incorrecto → mensaje rojo "Casi… la respuesta era N" + botón "Repetir".
  6. `renderHint(hint)`: para `kind:"add"` dibuja `a` cubos + signo + `b` cubos; `kind:"sub"` dibuja `a` cubos tachando `b`; `kind:"mul"` dibuja una cuadrícula `a × b`. (Mantenerlo simple y claro.)

  **API que devuelve `ui.js`** (para que `main.js` controle el flujo):
  - `mount()` — crea `#op-root` y el botón «‹ Volver» (link a `/`).
  - `levelSelect()` — Promise que resuelve con el nivel elegido.
  - `playRound(operation, options)` — pinta operación→listo→bola+esferas; resuelve `{ value, isCorrect }` cuando el usuario suelta una esfera en la bola.
  - `showResult(isCorrect, correctAnswer)` — Promise que resuelve con la acción elegida: `"again" | "exit" | "retry"`.
  - `setBackground(cssBackground)` — aplica un fondo al `#op-root` (para modo nomarker).

  Implementar el arrastre y la detección de "soltar en la bola" con coordenadas de `getBoundingClientRect()`. La bola está fija/centrada; las esferas parten de una fila inferior.

- [ ] **Step 2: Verificar sintaxis**

Run: `node --check src/juegos/operaciones/ui.js`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add src/juegos/operaciones/ui.js
git commit -m "[Opus-4.8]: Agrega capa de juego DOM de Operaciones (arrastrar esferas)"
```

---

## Task 5: Orquestador + página (`main.js` + `index.html`)

**Files:** Create `src/juegos/operaciones/main.js`; Modify `juegos/operaciones/index.html`

- [ ] **Step 1: Reemplazar `juegos/operaciones/index.html`** por la página del juego:
  - `<head>`: cargar `/src/juegos/operaciones/operaciones.css`. Cargar A-Frame + MindAR (`/vendor/...`) **igual que el Sistema Solar** (para el modo AR).
  - `<body>`: un `<div id="op-shell">` con:
    - El `<a-scene>` de MindAR (mismo markup base que el Sistema Solar, con `imageTargetSrc` al marcador compartido, `autoStart:false`), y `<a-entity id="op-target" mindar-image-target="targetIndex: 0">` (para el modo AR).
    - Nota: en modo `nomarker`, `main.js` no inicia el AR y oculta/ignora la escena.
  - `<script type="module" src="/src/juegos/operaciones/main.js"></script>`.

- [ ] **Step 2: Crear `src/juegos/operaciones/main.js`** (orquestador). Flujo:

  ```
  import { generateOperation, generateOptions } from "./mathgen.js";
  import { createOperacionesUI } from "./ui.js";
  import { isNoMarkerMode, pickRandomBackground, GAME_CONFIG } from "./config.js";

  - ui = createOperacionesUI({...}); ui.mount();
  - if (isNoMarkerMode()) { ui.setBackground(pickRandomBackground()); /* no AR */ }
    else { iniciar MindAR como en el Sistema Solar (autoStart tras tap o auto), mostrar cámara. }
  - Bucle principal (async):
      while (true) {
        const level = await ui.levelSelect();
        let playing = true;
        while (playing) {
          const op = generateOperation(level);
          const options = generateOptions(op);
          const { value, isCorrect } = await ui.playRound(op, options);
          const action = await ui.showResult(isCorrect, op.answer);
          if (action === "again") { /* nueva operación, mismo nivel */ continue; }
          if (action === "retry") { /* repetir: re-jugar la MISMA op */ ... }
          if (action === "exit") { playing = false; /* vuelve a selección de nivel */ }
        }
      }
  ```

  Detalles:
  - "otra operación" → nueva operación al mismo nivel (no vuelve a elegir nivel) — coincide con el flujo del storyboard.
  - "repetir" (tras error) → re-jugar la misma operación (mismas opciones o nuevas, a criterio; reusar la misma op es lo esperado).
  - "salir" → volver a la selección de nivel.
  - En modo AR, reusar el patrón de arranque de cámara del Sistema Solar (puede simplificarse: iniciar MindAR al cargar; si falla, mostrar mensaje). Mantenerlo simple; el foco es que el juego sea jugable.
  - El botón «‹ Volver» (creado por `ui.mount()`) navega a `/`.

- [ ] **Step 3: Verificar sintaxis y build**

Run: `node --check src/juegos/operaciones/main.js && npm run build`
Expected: `node --check` sin salida; `npm run build` termina sin error y emite `dist/juegos/operaciones/index.html`.

- [ ] **Step 4: Commit**

```bash
git add juegos/operaciones/index.html src/juegos/operaciones/main.js
git commit -m "[Opus-4.8]: Implementa el juego de Operaciones (orquestador + página)"
```

---

## Task 6: Verificación final

- [ ] **Step 1: Tests + build verdes**

Run: `npm test && npm run build`
Expected: tests pasan; build emite las 3 páginas.

- [ ] **Step 2: Prueba en navegador (modo sin marcador)**

Run: `npm run dev` y abrir `http://localhost:5173/juegos/operaciones/?nomarker=1`

Checklist:
- [ ] Aparece un fondo (degradado) aleatorio, sin pedir cámara.
- [ ] Se elige un nivel (1-4) con sus edades.
- [ ] Aparece una operación; en niveles 1-2 se ve la ayuda visual (cubitos).
- [ ] Al tocar "Listo" aparece la bola de energía animada + 4 esferas.
- [ ] Arrastrar la esfera correcta a la bola → "¡Correcto!" → "Otra operación" da una nueva; "Salir" vuelve a niveles.
- [ ] Arrastrar una incorrecta → muestra la respuesta correcta → "Repetir".
- [ ] El botón «‹ Volver» regresa al catálogo.

- [ ] **Step 3: (Opcional) Verificación AR en iPhone**

`npm run dev:host` / `tunnel` → abrir `/juegos/operaciones/` (sin flag) en iPhone: la cámara y el marcador funcionan, el juego se superpone. (Requiere dispositivo; lo hace el usuario.)

---

## Self-Review (cobertura del storyboard)

- ✅ Elegir nivel con edades (7-11) → Task 1 (LEVELS) + Task 4
- ✅ Operación aleatoria por nivel, en estilo 3D → Task 1 + Task 4
- ✅ Ayuda visual (cubitos) en niveles 1-2 → Task 1 (hint) + Task 4 (renderHint)
- ✅ Bola de energía animada (Dragon Ball) → Task 3 (CSS) + Task 4
- ✅ 4 esferas, arrastrar la correcta a la bola → Task 4
- ✅ Correcto → otra operación / salir; Incorrecto → respuesta correcta + repetir → Task 4/5
- ✅ "otra operación" vuelve a mostrar operación (mismo nivel) → Task 5
- ✅ Flag `?nomarker` con fondo aleatorio → Task 2 + Task 5
- ✅ Tests automáticos → Task 1
- ✅ Marcador compartido en modo AR → Task 5
```
