# CLAUDE.md

Este archivo guía a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

> Contexto del proyecto: juego educativo de AR desarrollado por José junto a su hijo **Lucas (11 años)** para una hackathon escolar. Mantén las explicaciones didácticas y sencillas; a veces Lucas escribe los prompts directamente.

## Comandos

```bash
npm install                  # Instala dependencias (Node 20.x — ver .nvmrc / engines)
npm run vendor:sync          # Copia libs de AR de node_modules → public/vendor/
npm run assets:sync          # Copia assets/{targets,nfts} → public/assets/ (omite .DS_Store)
npm run dev                  # Dev local (corre vendor:sync + assets:sync primero)
npm run dev:host             # Servidor dev en LAN 0.0.0.0:5173 (para probar en iPhone/iPad)
npm run dev:remote           # Vite + proxy Basic Auth + túnel HTTPS de Cloudflare
npm run tunnel               # Alias de dev:remote (credenciales: virtualis / virtualis.1811)
npm run compile:target       # Recompila el archivo de marcador .mind
npm run build                # Build de producción → dist/ (corre vendor:sync + assets:sync primero)
npm run preview              # Sirve la app construida en 0.0.0.0:4173
npm test                     # Tests automáticos: node --test (solo mathgen.test.js por ahora)
```

> **Flujo de trabajo**: `npm install && npm run compile:target && npm run dev:host`

`dev`, `dev:host`, `dev:remote`, `tunnel` y `build` corren `vendor:sync` **y** `assets:sync` antes de arrancar — esos dos pasos llenan `public/`, que de otro modo no tiene los archivos de runtime. Si los saltas, la página da 404 en `/vendor/*` (librerías AR) o `/assets/*` (marcadores y NFTs).

**Puertos y credenciales del túnel**: `npm run tunnel` (= `dev:remote`) levanta Vite en 5173 más un proxy Basic Auth en 5174, y luego abre un túnel HTTPS con `cloudflared` apuntando al proxy. NO corras `dev:host` y `tunnel` a la vez — mata primero todos los procesos de Vite (`lsof -ti :5173 | xargs kill -9; lsof -ti :5174 | xargs kill -9`). Requiere el CLI `cloudflared` en el `PATH`. Configurable con variables de entorno: `TUNNEL_USER`, `TUNNEL_PASSWORD`, `HOST`, `PORT` (Vite, por defecto 5173), `PROXY_PORT` (proxy de auth, por defecto 5174).

`compile:target` usa por defecto `assets/markers/marker-sistema-solar.png` y escribe `assets/targets/<nombre-marcador>.mind`. Cambia el origen con `MARKER_SOURCE=assets/markers/otro.png npm run compile:target`.

### Pruebas

- **Automáticas**: `npm test` corre `node --test` contra `src/juegos/operaciones/mathgen.test.js` (la lógica matemática pura). Son los únicos tests automatizados del repo.
- **Manuales**: en escritorio probar arrastrar/soltar; luego en iOS Safari (permiso de cámara, detección del marcador, arrastre táctil, completar, confeti, NFT + descarga, galería, reintentar/volver). Tras un cambio de orientación en iPad, confirmar que el viewport AR queda alineado (sin margen lateral).
- El juego de Operaciones tiene un **modo sin AR** para probar en el navegador: `/juegos/operaciones/?nomarker=1`.

## Estilo de código

- Módulos ES (`type: module`), JavaScript plano + CSS, sin framework.
- Indentación: 2 espacios; siempre punto y coma.
- `camelCase` para variables/funciones, `UPPER_SNAKE_CASE` para constantes, nombres de archivo en minúscula agrupados por dominio.
- Mantén los módulos enfocados. Por juego, el código vive bajo `src/juegos/<id>/` (Sistema Solar: lógica AR en `ar/`, gameplay en `game/`, UI en `ui/`, ajustes en `config/`). El código compartido entre juegos vive en `src/shared/`.
- **Los ajustes (tunables) van en el `config` del juego, no inline.** Textos, distancias, rangos, tiempos, colores y feature flags se centralizan ahí (ver Configuración más abajo).

## Convenciones de commits y documentación

**Cada sesión que cambie código o assets debe crear un commit** con el formato:
- `[Modelo]: Descripción` (en imperativo) — p. ej. `[Opus-4.8]: Implementa validación de drag and drop`.

No incluyas cambios de `prompts.md` en los commits de features. `prompts.md` es del usuario y los agentes no deben editarlo ni leerlo. `AGENTS.md` es un stub que apunta a este archivo.

**Cierre de ramas**: al finalizar una rama de trabajo, hacer **merge a `main`** (no Pull Request) y mantener `origin/main` actualizado con push. (Flujo rápido de hackathon.)

**Documentación** (`docs/`): generar la documentación en **HTML** con un design system ligero y diagramas **Mermaid** cuando aplique (es más didáctico para Lucas). Organizar por tema en subcarpetas (`docs/catalogo/`, `docs/operaciones/`, `docs/arquitectura/`). Avisar a José cuando un documento HTML esté listo para que Lucas lo vea. (Excepción: si José pide explícitamente un `.md`, respétalo.)

## Visión general de la arquitectura

Juego educativo de AR **iPhone-first**, sin backend. Todo corre en el navegador con A-Frame + MindAR para seguimiento de marcador por imagen. El marcador `.mind` es **compartido por todos los juegos**.

### Arquitectura multipágina (catálogo de juegos)

La app es un **catálogo multipágina (MPA)** construido con Vite. `index.html` es la portada del catálogo (sin AR); cada juego es su propia página HTML bajo `juegos/<id>/index.html` con su JS bajo `src/juegos/<id>/`. Navegar entre páginas hace una recarga completa, así el ciclo de vida de cámara/MindAR se reinicia limpio (importante en iOS Safari).

- `vite.config.js` declara los 3 puntos de entrada (`rollupOptions.input`): catálogo + 2 juegos.
- El código compartido vive en `src/shared/`:
  - `games.js` — fuente única de la lista de juegos (`GAMES`) + enlace `CANVA_URL` del pie.
  - `nft/gallery.js` — premios NFT + persistencia en cookie, **agrupados por juego** (cookie `av_nft_gallery_v3`, `{ games: { [gameId]: { counts, order } }, lastWonAt }`; auto-migra desde el `v2` plano y el localStorage legacy, asignando los premios viejos a `sistema-solar`). `awardRandomNft(gameId)`, `getGallerySummary()` → `[{ gameId, nombre, items }]`.
  - `ui/wallet.js` (+ `wallet.css`) — el botón 🏆 + modal de galería, mostrando premios agrupados por juego. Lo usan tanto el catálogo como los juegos. Estilos auto-contenidos (no dependen de `styles.css`).

### Flujo de datos — Catálogo (`index.html`)

```
index.html (sin AR)
    └── src/catalogo/catalogo.js  ← pinta la lista de juegos desde GAMES, conecta enlace Canva + wallet
            ├── src/shared/games.js       ← GAMES + CANVA_URL
            └── src/shared/ui/wallet.js   ← botón 🏆 + modal de galería
                    └── src/shared/nft/gallery.js
```

### Flujo de datos — Juego Sistema Solar (`juegos/sistema-solar/index.html`)

Estudiantes arrastran etiquetas de nombres de planetas (barajadas) sobre el planeta correcto; completar los 9 (Mercurio → Plutón) dispara confeti + cuenta regresiva + premio NFT al azar.

```
juegos/sistema-solar/index.html (shell AR + botón «‹ Volver» + puntos de montaje de UI)
    └── src/juegos/sistema-solar/main.js       ← Orquestador: arranca AR, render loop, pinch/zoom,
            │                                     sliders, drag, completado + confeti
            ├── src/juegos/sistema-solar/config/app-config.js ← Config central (tunables, rangos, flags)
            ├── src/juegos/sistema-solar/ar/scene.js          ← Sistema solar en Three.js
            ├── src/juegos/sistema-solar/game/state.js        ← Datos de planetas + derangement shuffle
            ├── src/juegos/sistema-solar/game/dragdrop.js     ← Controlador de pointer events
            ├── src/juegos/sistema-solar/ui/overlay.js        ← DOM: etiquetas, sellos, HUD, modales completado/NFT
            ├── src/shared/nft/gallery.js                     ← awardRandomNft("sistema-solar")
            └── src/shared/ui/wallet.js                       ← wallet 🏆 compartida
```

### Flujo de datos — Juego Operaciones (`juegos/operaciones/index.html`)

Juego de matemáticas: eliges un nivel (1-4, edades ~7-11), aparece una operación aleatoria (con ayuda visual de cubitos en niveles 1-2), tocas "Listo" → una bola de energía animada + 4 esferas de respuesta; arrastras la esfera correcta sobre la bola. Correcto → otra operación / salir; incorrecto → muestra la respuesta → repetir.

**El gameplay usa objetos 3D REALES** (Three.js bajo A-Frame) anclados al marcador, así mantienen la perspectiva en AR. Los menús (elegir nivel, botón "Listo" + ayuda, resultado, zoom) son HUD en DOM.

```
juegos/operaciones/index.html (carga A-Frame + MindAR; main.js construye la escena según el modo)
    └── src/juegos/operaciones/main.js     ← orquestador (construye escena AR o nomarker, bucle del
            │                                 juego, botón "Iniciar cámara AR", zoom)
            ├── src/juegos/operaciones/mathgen.js  ← lógica PURA: operación por nivel + 4 opciones  [CON TESTS]
            ├── src/juegos/operaciones/scene3d.js  ← contenido 3D real (Three.js): operación (sprite),
            │                                         bola de energía (esfera emisiva + halo, pulso),
            │                                         4 esferas; arrastre por RAYCASTING; setScale (zoom)
            ├── src/juegos/operaciones/ui.js       ← HUD DOM: selección de nivel, "Listo"+ayuda, resultado, slider de zoom
            └── src/juegos/operaciones/config.js   ← flag nomarker + fondos aleatorios + zoom (cookie av_op_zoom)
```

- **Anclaje 3D**: en modo AR, el contenido cuelga de `#op-target` (marcador MindAR); en `?nomarker` cuelga de un ancla fija frente a la cámara (`#op-anchor`) con fondo degradado. El arrastre usa raycasting sobre el lienzo, así funciona igual con o sin zoom (el umbral de "soltar en la bola" escala con `group.scale`).
- **Zoom**: slider abajo-derecha que llama `scene3d.setScale(n)` (escala el grupo 3D), persistido en la cookie `av_op_zoom` (rango `ZOOM_RANGE` en `config.js`, 0.3–3, inicial 1).
- **Flag de prueba**: abre `/juegos/operaciones/?nomarker=1` (o `?test`) para jugar en el navegador con un fondo degradado aleatorio — sin cámara/marcador. En modo AR aparece un botón "▶ Iniciar cámara AR" (iOS Safari exige un gesto del usuario para encender la cámara).
- **Niveles** (`LEVELS` en `mathgen.js`): N1 (~7 años) suma/resta; N2 (~8) +multiplicación; N3 (~10) mult/división exacta; N4 (~11) +cuadrados/raíces. Ayuda visual (cubitos) solo en N1 y N2.

### Configuración (`src/juegos/sistema-solar/config/app-config.js`)

Fuente única de verdad del comportamiento del Sistema Solar. Léelo antes de cambiar cualquier constante.
- `APP_VERSION` — se muestra en pantalla vía `#version-counter`; sube la sub-versión en +1 por commit.
- `APP_CONFIG` — `successText`, `returnUrl` (**ahora sin uso**: se quitó el botón de cerrar; el enlace a Canva vive en `src/shared/games.js` como `CANVA_URL`, mostrado en el pie del catálogo), `snapDistance` (**100 px**, tolerancia de soltado), `completionCountdownSeconds`, valores de poll/timeout de MindAR, `iosResizeDelaysMs`, textos de gate.
- `UI_PREFERENCES` — `labelOffsetByPlanetId` (offset vertical por planeta), colores/densidad del confeti.
- `UI_FLAGS.showRotationControls` — activa/desactiva la sección del slider de rotación.
- `SCENE_CONFIG` — constantes de escala más rangos de sliders: `zoom {min,max,initial}` (**0.1 / 8.0 / 1.5**), `orbit`, `planet`, `speed`, y `corePlanets` / `coreTargetWidth` para auto-ajuste.
- `ROTATION_CONFIG` — rangos y defaults de grados X/Y/Z (X inicial `-4`).
- `SLIDER_COOKIE_CONFIG` + `getSliderPreferenceFromCookies` / `saveSliderPreferenceToCookies` — todo el estado de sliders y el flag de panel colapsado persisten en cookies (max-age 180 días).

### Ciclo de vida AR — Sistema Solar (`main.js`)

MindAR se configura con `autoStart: false`. La app **arranca la cámara ~120 ms tras cargar** (en contexto seguro/localhost con API de cámara); el botón `#camera-gate` es un fallback manual mostrado ante error o contexto inseguro. Secuencia de arranque:

1. `startAr()` → `waitForMindarSystem()` espera a que cargue la escena A-Frame, luego sondea `sceneEl.systems["mindar-image-system"]` hasta estar listo (timeout 12 s)
2. `arSystem.start()` → MindAR emite `arReady` (o `arError`)
3. evento `renderstart` → captura `sceneEl.camera`, arranca el loop de `requestAnimationFrame`
4. `targetFound` / `targetLost` en `#target-root` → alterna `gameState.markerVisible`, muestra/oculta el panel de controles

El marcador activo es `/assets/targets/marker-sistema-solar.mind` (definido en `juegos/sistema-solar/index.html`). El mismo marcador lo comparten todos los juegos.

### Etiquetas (HTML, no 3D) — Sistema Solar

Las etiquetas de planetas son `<button>` en `#labels-layer`. Cada frame, `renderLabels()` proyecta la posición 3D de cada planeta a 2D vía `scene.getScreenPositions(camera, w, h)` y reposiciona los botones DOM. El offset vertical viene de `UI_PREFERENCES.labelOffsetByPlanetId` y escala con `Math.sqrt(scene.getScale())`. Si varias etiquetas caen sobre el mismo planeta, `renderLabels()` las apila verticalmente (primero las bloqueadas).

### Drag-Drop → Snap — Sistema Solar

`dragdrop.js` usa pointer capture para unificar mouse y touch. Al soltar, `findNearestPlanet()` revisa si el punto de soltado está dentro de `SNAP_DISTANCE` (`APP_CONFIG.snapDistance`, 100 px) de la posición en pantalla de algún planeta visible. Planeta correcto → incrementa `gameState.correctCount` + muestra sello; si otra etiqueta ocupaba ese planeta, se desplaza. Incorrecto/lejos → `overlay.showIncorrect()` (destello rojo). El arrastre se desactiva durante un pinch activo y permanentemente tras completar (`dragLockedByCompletion`). Las órbitas se pausan mientras se arrastra una etiqueta.

### Escena del Sistema Solar (`src/juegos/sistema-solar/ar/scene.js`)

- `Group` raíz de Three.js añadido a `targetEl.object3D` — sigue el marcador AR automáticamente.
- Las mallas de planetas usan **texturas dibujadas por canvas** (`createPlanetTexture` por planeta); Saturno y Urano tienen anillos de toro. Los anillos de órbita son `RingGeometry` planos.
- Expone controles independientes, cada uno con un `get*Range()` que devuelve `{min,max,initial}` de `SCENE_CONFIG`: `setScale` (zoom, escala el grupo raíz), `setOrbitScale` (radios de órbita + grupo de anillos), `setPlanetScale` (escala de malla por planeta), `setOrbitSpeed` (multiplicador de velocidad) y `setRotationDegrees` (inclinación global X/Y/Z). `main.js` conecta cada uno a un slider y lo persiste en cookie.
- `fitCorePlanetsToMarker()` puede auto-escalar para que el Sol + planetas centrales llenen el marcador; `PLANETS` y `phaseOffset` (guardado por nodo) escalonan los ángulos iniciales.
- `planetNodes` es un `Map<planetId, node>`. `Map.forEach(callback)` es `(value, key, map)` — el segundo arg es la clave string, no un índice numérico. Guarda cualquier índice numérico como propiedad del nodo.

### Arreglos de viewport en iOS — Sistema Solar

`scheduleIosResizes()` llama `requestArResize()` en los delays de `APP_CONFIG.iosResizeDelaysMs` (`[0, 120, 320, 650]`) más 1000 ms extra y dos rAFs. Se dispara en `arReady`, `targetFound`, `resize`, `orientationchange` y resize/scroll de `visualViewport`. `syncArViewport()` fuerza `position: fixed` (usando métricas de `visualViewport`) sobre la escena A-Frame, el canvas y el video de MindAR, para contrarrestar el comportamiento del viewport de Safari.

### Zoom y Pinch — Sistema Solar

El pinch de dos dedos y el slider de zoom llaman `scene.setScale(n)`, acotado a `SCENE_CONFIG.zoom` (`[0.1, 8.0]`). La escala se aplica al `Group` raíz de Three.js (`root.scale.setScalar(baseSystemScale * currentScale)`), no a entidades A-Frame. El pinch desactiva el arrastre mientras está activo y guarda el zoom final en cookie al soltar.

### Librerías vendored

A-Frame y MindAR NO se cargan desde CDN. `scripts/sync-vendor.mjs` las copia de `node_modules` a `public/vendor/` antes de cada dev/build; las **páginas de juego** (`juegos/<id>/index.html`) las cargan desde `/vendor/`. El catálogo `index.html` no carga las librerías AR.

### Assets de runtime

`scripts/sync-runtime-assets.mjs` (`assets:sync`) copia `assets/targets/` y `assets/nfts/` a `public/assets/` (excluyendo `.DS_Store`) para que Vite los sirva en `/assets/...`. La fuente de verdad es `assets/`; `public/assets/` es generado. Las imágenes de marcador viven en `assets/markers/`.

### Compilación del marcador

`assets/markers/marker-sistema-solar.png` → `npm run compile:target` → `assets/targets/marker-sistema-solar.mind` (luego `assets:sync` lo espeja en `public/`). Recompila cuando cambie la imagen del marcador. `scripts/generate-tech-marker.mjs` puede regenerar un PNG de marcador técnico de alto contraste programáticamente.

### Premios NFT y galería (`src/shared/nft/gallery.js` + `src/shared/ui/wallet.js`)

- El pool de NFTs se construye dinámicamente en build vía `import.meta.glob("../../../assets/nfts/*.{png,jpg,jpeg,webp,avif}")` — suelta un archivo en `assets/nfts/` y queda incluido automáticamente (sin lista hardcodeada).
- Al completar, tras la cuenta regresiva, el juego llama `awardRandomNft(gameId)` (p. ej. `awardRandomNft("sistema-solar")`) para elegir uno al azar y registrarlo bajo ese juego.
- **La persistencia es una cookie**, clave `av_nft_gallery_v3` (max-age 180 días), guardando `{ games: { [gameId]: { counts, order } }, lastWonAt }`. En la primera lectura auto-migra desde la cookie plana `v2` y desde el `localStorage` legacy (`academia_virtualis_gallery_v1`), asignando esos premios viejos a `sistema-solar`.
- `getGallerySummary()` devuelve los premios agrupados por juego: `[{ gameId, nombre, items: [{ imageSrc, styleName, count }] }]`, omitiendo juegos sin premios.
- Los nombres de estilo se derivan del segmento del nombre de archivo tras el **último guion** antes de la extensión: `NFT-SistemaSolar-1-LooneyTunes.png` → `Looney Tunes` (`getNftStyleName`).
- La wallet 🏆 (`src/shared/ui/wallet.js`, `createWallet()`) abre un modal de galería con cada NFT ganado (tarjetas cuadradas) con su nombre de estilo y conteo (`xN`), **agrupado por juego** con un encabezado por juego. La comparten el catálogo y cada juego. El modal de premio (lado del juego) incluye un botón Descargar (`downloadNftImage` en el `main.js` del juego); el viejo botón "Cerrar sitio" fue removido.

## AR sin marcador (investigación en curso)

Existe un análisis sobre migrar de marcador a **AR sin marcador / world tracking** (anclar objetos a superficies reales como una mesa o almohada) en `docs/arquitectura/2026-06-16-ar-sin-marcador.md`. Resumen: la vía estándar gratuita (**WebXR `immersive-ar`**) **no está soportada en Safari iOS** a junio 2026 — pendiente de verificar si la nueva versión de iOS/Safari lo habilita. Alternativas: tap-to-place + giroscopio (gratis, 3DoF, no resiste traslación) o plataformas SLAM de pago (Onirix, etc.). Decisión pendiente.

## Seguridad y configuración

- El túnel remoto usa HTTP Basic Auth; mantén las credenciales configurables vía variables de entorno (`TUNNEL_USER` / `TUNNEL_PASSWORD`).
- El acceso a la cámara en iOS requiere HTTPS (o localhost). Usa `dev:remote` para probar en dispositivo real sobre HTTPS.
- Las carpetas generadas grandes (`dist/`, `node_modules/`) quedan sin trackear. `public/vendor/` y `public/assets/` son generadas por los scripts de sync.
