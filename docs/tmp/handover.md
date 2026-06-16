# Handover — Academia Virtualis

> Documento para que otro agente continúe esta sesión sin contexto previo.
> Fecha: 2026-06-16 · Rama: `main` (limpia, todo pusheado a `origin/main`).

## 0. Lee esto primero

- **CLAUDE.md** (raíz, en español) es la fuente de verdad de arquitectura/comandos/convenciones. Léelo antes de tocar código.
- Proyecto **iPhone-first**, AR en navegador con A-Frame + MindAR, Vite, JS plano, sin backend.
- Lo desarrolla **José con su hijo Lucas (11 años)** para una hackathon escolar. **Responder didáctico y sencillo**; a veces Lucas escribe los prompts.

## 1. Convenciones (IMPORTANTES, no las rompas)

- **Commits**: `[Modelo]: Descripción` en imperativo. Ej.: `[Opus-4.8]: Agrega X`.
- **Cierre de ramas**: hacer **merge a `main`** (no PR) + `git push origin main`. No dejar ramas abiertas.
- **Documentación** en `docs/<tema>/`: generar en **HTML** con design system ligero + diagramas **Mermaid** (más didáctico para Lucas). Excepción: si José pide explícitamente `.md` (como este handover), respétalo.
- **`prompts.md`**: NO leerlo ni editarlo (es del usuario). No incluirlo en commits de features.
- Al terminar trabajo de UI/AR, **probar en el navegador** (modo `?nomarker` para Operaciones) antes de cerrar.

## 2. Estado actual del proyecto

Catálogo multipágina (MPA) con 2 juegos, ambos AR con marcador compartido:

- **Portada** `index.html` → `src/catalogo/catalogo.js` (lista de juegos + wallet 🏆 + enlace Canva al pie).
- **Sistema Solar** `juegos/sistema-solar/` (juego original, intacto).
- **Operaciones** `juegos/operaciones/` (construido esta sesión, **completo y jugable**).
- Código compartido en `src/shared/` (`games.js`, `nft/gallery.js`, `ui/wallet.js`).
- Premios NFT en cookie `av_nft_gallery_v3`, agrupados por juego.

### Juego de Operaciones (lo más reciente)

Matemáticas en AR: elegir nivel (1-4, ~7-11 años) → operación aleatoria (ayuda visual de cubitos en N1-N2) → "Listo" → **bola de energía 3D + 4 esferas 3D** → arrastrar la correcta a la bola → correcto/incorrecto → otra/salir/repetir.

- **Gameplay en 3D REAL** (Three.js bajo A-Frame), anclado al marcador → mantiene perspectiva. Módulo `src/juegos/operaciones/scene3d.js`. Arrastre por **raycasting**.
- **Menús = HUD DOM** en `src/juegos/operaciones/ui.js` (nivel, "Listo"+ayuda, resultado, slider de zoom).
- **Lógica pura testeada**: `mathgen.js` + `mathgen.test.js` (`npm test`, node --test).
- **Modo prueba sin AR**: `/juegos/operaciones/?nomarker=1` (fondo degradado aleatorio, sin cámara).
- **Zoom**: slider abajo-derecha, escala los objetos 3D, persiste en cookie `av_op_zoom`. El umbral de "soltar en la bola" escala con el zoom.
- `config.js`: flag nomarker, fondos, `ZOOM_RANGE` (0.3–3, inicial 1).

Verificado en navegador (modo nomarker) end-to-end: niveles, ayuda visual, bola, arrastre correcto/incorrecto, zoom, sin errores de consola. **Falta verificación en iPhone real** (cámara/AR + tamaño de objetos sobre el marcador).

## 3. Cómo correr y probar

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # tests de mathgen
npm run build          # debe quedar verde (emite 3 páginas)
```
- Operaciones sin AR: `http://localhost:5173/juegos/operaciones/?nomarker=1`
- En iPhone: `npm run dev:host` (o `npm run tunnel` para HTTPS) → abrir `/juegos/operaciones/` → tocar "▶ Iniciar cámara AR".
- Hay `.claude/launch.json` (config "dev") para el preview server del MCP de navegador.

## 4. Tema ABIERTO / próximo paso probable: AR sin marcador

José pidió investigar anclar objetos a **superficies reales** (mesa, almohada) en vez de marcador.
- Análisis completo en **`docs/arquitectura/2026-06-16-ar-sin-marcador.md`**.
- Hallazgo clave: **WebXR `immersive-ar` NO está en Safari iOS** (a jun 2026). Alternativas: tap-to-place + giroscopio (gratis, 3DoF), o SLAM de pago (Onirix, etc.).
- **José dijo que iba a pasar detalles** sobre soporte AR en la **nueva versión de iOS/Safari** (tomado de Vision Pro). **Cuando los traiga**: verificar si Safari iOS ya expone WebXR `immersive-ar` + `hit-test`; si sí, ese es el camino recomendado (gratis, anclaje real). Ver checklist §3 y §8 de ese doc.
- **No hay nada implementado aún** de esto; está en fase de decisión.

## 5. Mejoras conocidas / pendientes menores

- **Tamaño de objetos 3D de Operaciones en el marcador real**: calibrado a ojo para navegador; quizá haya que ajustar la escala base en `scene3d.js` tras probar en iPhone (el slider de zoom ayuda, pero el default puede afinarse).
- Verificación AR en iPhone de Operaciones (cámara, perspectiva, arrastre táctil) — pendiente del usuario.

## 6. Documentación de la sesión (referencia)

- `docs/catalogo/` — diseño + plan del catálogo MPA (HTML con Mermaid + specs `.md`).
- `docs/operaciones/` — storyboard v2 del juego (HTML) + plan de implementación (`.md`).
- `docs/arquitectura/` — análisis de AR sin marcador (`.md`).

## 7. Memoria persistente

Hay memorias del proyecto en el directorio de memoria de Claude (índice en `MEMORY.md`): contexto Lucas/hackathon, catálogo MPA, convención de docs HTML, preferencia de merge a main, y mecánica del juego de Operaciones. Se actualizan solas; revísalas si necesitas contexto histórico.
