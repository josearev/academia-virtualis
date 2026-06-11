# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                  # Install dependencies (Node 20.x — see .nvmrc / engines)
npm run vendor:sync          # Copy AR libs from node_modules → public/vendor/
npm run assets:sync          # Copy assets/{targets,nfts} → public/assets/ (skips .DS_Store)
npm run dev                  # Local dev (runs vendor:sync + assets:sync first)
npm run dev:host             # LAN dev server at 0.0.0.0:5173 (for iPhone/iPad testing)
npm run dev:remote           # Vite + Basic Auth proxy + Cloudflare HTTPS tunnel
npm run tunnel               # Alias for dev:remote (credentials: virtualis / virtualis.1811)
npm run compile:target       # Recompile the .mind marker file
npm run build                # Production build → dist/ (runs vendor:sync + assets:sync first)
npm run preview              # Serve built app on 0.0.0.0:4173
```

> **Workflow**: `npm install && npm run compile:target && npm run dev:host`

`dev`, `dev:host`, `dev:remote`, `tunnel`, and `build` all run `vendor:sync` **and** `assets:sync` before starting — these two sync steps populate `public/`, which is otherwise empty of runtime files. Skip them and the page 404s on `/vendor/*` (AR libraries) or `/assets/*` (markers and NFTs).

**Tunnel ports & credentials**: `npm run tunnel` (= `dev:remote`) starts Vite on 5173 plus a Basic Auth proxy on 5174, then opens a `cloudflared` HTTPS tunnel pointing at the proxy. Do NOT run `dev:host` and `tunnel` at the same time — kill all Vite processes first (`lsof -ti :5173 | xargs kill -9; lsof -ti :5174 | xargs kill -9`). Requires the `cloudflared` CLI in `PATH`. Configurable via env vars: `TUNNEL_USER`, `TUNNEL_PASSWORD`, `HOST`, `PORT` (Vite, default 5173), `PROXY_PORT` (auth proxy, default 5174).

`compile:target` defaults to `assets/markers/marker-sistema-solar.png` and writes `assets/targets/<marker-name>.mind`. Override the source with `MARKER_SOURCE=assets/markers/other.png npm run compile:target`.

There is no test framework. Manual checks: desktop drag/drop, then iOS Safari (camera permission, marker detection, touch drag/drop, 9/9 completion, confetti, NFT reveal + download, gallery, retry/close). After an iPad orientation change, confirm the AR viewport stays aligned (no lateral margin).

## Coding Style

- ES modules (`type: module`), plain JavaScript + CSS, no framework, no `vite.config.*` (Vite defaults).
- Indentation: 2 spaces; always use semicolons.
- `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for constants, lowercase file names grouped by domain.
- Keep modules focused. Per game, code lives under `src/juegos/<id>/` (for Sistema Solar: AR logic in `ar/`, gameplay in `game/`, UI in `ui/`, tunables in `config/`). Cross-game code lives in `src/shared/`.
- **Tunables go in `src/juegos/sistema-solar/config/app-config.js`, not inline.** Strings, distances, ranges, timings, colors, and feature flags are all centralized there (see Configuration below).

## Commit & Pull Request Guidelines

**Every session that changes app code or assets must create a commit** using the format:
- `[Modelo]: Descripción` (imperative) — e.g. `[Sonnet-4.6]: Implementa validación de drag and drop`

Do not include `prompts.md` changes in feature commits. `prompts.md` is user-owned and must not be edited by agents; use `directivas.md` for agent-maintained session directives. `AGENTS.md` is a stub that just points back to this file.

PRs for UI/AR changes should include screenshots or video, commands run (`build`, marker compile, manual checks), and notes about iOS behavior.

## Architecture Overview

iOS-first AR educational game with no backend. Everything runs in the browser using A-Frame + MindAR for image-based marker tracking. Students drag shuffled planet name labels onto the matching planet; completing all 9 (Mercurio → Plutón) triggers a confetti + countdown + random NFT reward flow.

### Multi-page architecture (catálogo de juegos)

The app is a **multi-page (MPA)** game catalog built with Vite. `index.html` is the catalog
landing page (no AR); each game is its own HTML page under `juegos/<id>/index.html` with its
JS under `src/juegos/<id>/`. Navigating between pages does a full reload, so the camera/MindAR
lifecycle resets cleanly (important on iOS Safari). **All games share the same AR marker** (`.mind`).

- `vite.config.js` declares the 3 entry points (`rollupOptions.input`): catalog + 2 games.
- Shared code lives in `src/shared/`:
  - `games.js` — single source of truth for the game list (`GAMES`) + `CANVA_URL` footer link.
  - `nft/gallery.js` — NFT award + cookie persistence, **grouped by game** (cookie `av_nft_gallery_v3`,
    `{ games: { [gameId]: { counts, order } }, lastWonAt }`; auto-migrates from flat `v2` and legacy
    localStorage, assigning old prizes to `sistema-solar`). `awardRandomNft(gameId)`,
    `getGallerySummary()` → `[{ gameId, nombre, items }]`.
  - `ui/wallet.js` (+ `wallet.css`) — the 🏆 button + gallery modal, rendering prizes grouped by game.
    Used by both the catalog and the games. Self-contained styles (does not depend on `styles.css`).

### Data Flow — Catalog (`index.html`)

```
index.html (no AR)
    └── src/catalogo/catalogo.js  ← renders the game list from GAMES, wires Canva link + wallet
            ├── src/shared/games.js       ← GAMES + CANVA_URL
            └── src/shared/ui/wallet.js   ← 🏆 wallet button + gallery modal
                    └── src/shared/nft/gallery.js
```

### Data Flow — Sistema Solar game (`juegos/sistema-solar/index.html`)

```
juegos/sistema-solar/index.html (AR shell + «‹ Volver» button + UI mount points)
    └── src/juegos/sistema-solar/main.js       ← Orchestrator: boots AR, render loop, pinch/zoom,
            │                                     slider wiring, drag wiring, completion + confetti
            ├── src/juegos/sistema-solar/config/app-config.js ← Central config (tunables, ranges, flags)
            ├── src/juegos/sistema-solar/ar/scene.js          ← Three.js solar system
            ├── src/juegos/sistema-solar/game/state.js        ← Planet data + derangement shuffle
            ├── src/juegos/sistema-solar/game/dragdrop.js     ← Pointer event controller
            ├── src/juegos/sistema-solar/ui/overlay.js        ← DOM: labels, stamps, HUD, completion/NFT modals
            ├── src/shared/nft/gallery.js                     ← awardRandomNft("sistema-solar")
            └── src/shared/ui/wallet.js                       ← shared 🏆 wallet
```

### Data Flow — Operaciones game (`juegos/operaciones/index.html`)

Math game: choose a level (1-4, ages ~7-11), a random operation appears (with a visual cube hint
on levels 1-2), tap "Listo" → an animated energy ball + 4 answer spheres; drag the correct sphere
onto the ball. Correct → another op / exit; wrong → shows the answer → repeat.

```
juegos/operaciones/index.html (A-Frame shell for AR; #op-root overlay built by JS)
    └── src/juegos/operaciones/main.js     ← orchestrator (game loop, AR start button, nomarker mode)
            ├── src/juegos/operaciones/mathgen.js  ← PURE logic: operation per level + 4 options  [TESTED]
            ├── src/juegos/operaciones/ui.js       ← DOM layer: level select, energy ball, draggable spheres
            └── src/juegos/operaciones/config.js   ← nomarker flag + random backgrounds
```

- **Test flag:** open `/juegos/operaciones/?nomarker=1` (or `?test`) to play in a plain browser
  with a random gradient background — no camera/marker needed. AR mode shows a "▶ Iniciar cámara AR"
  button (iOS Safari requires a user gesture to start the camera).
- **Tests:** `npm test` runs `node --test` against `mathgen.test.js` (the only automated tests in the repo).

### Configuration (`src/juegos/sistema-solar/config/app-config.js`)

This is the single source of truth for behavior. Read it before changing any constant.
- `APP_VERSION` — shown on screen via `#version-counter`; bump the sub-version by +1 per commit.
- `APP_CONFIG` — `successText`, `returnUrl` (**now unused**: the old close button was removed; the Canva link lives in `src/shared/games.js` as `CANVA_URL`, shown at the catalog footer), `snapDistance` (**100 px**, the drop tolerance), `completionCountdownSeconds`, MindAR poll/timeout values, `iosResizeDelaysMs`, gate texts.
- `UI_PREFERENCES` — `labelOffsetByPlanetId` (per-planet vertical label offset), confetti colors/density.
- `UI_FLAGS.showRotationControls` — toggles the rotation slider section.
- `SCENE_CONFIG` — scene scale constants plus slider ranges: `zoom {min,max,initial}` (**0.1 / 8.0 / 1.5**), `orbit`, `planet`, `speed`, and `corePlanets` / `coreTargetWidth` for auto-fit.
- `ROTATION_CONFIG` — X/Y/Z degree ranges and defaults (X initial `-4`).
- `SLIDER_COOKIE_CONFIG` + `getSliderPreferenceFromCookies` / `saveSliderPreferenceToCookies` — all slider state and the controls-panel collapsed flag persist in cookies (180-day max-age).

### AR Lifecycle (`main.js`)

MindAR is configured with `autoStart: false`. The app **auto-starts the camera ~120 ms after load** (when in a secure/localhost context with a camera API); the `#camera-gate` button is a manual fallback shown on error or insecure context. Startup sequence:

1. `startAr()` → `waitForMindarSystem()` waits for the A-Frame scene to load, then polls `sceneEl.systems["mindar-image-system"]` until ready (12 s timeout)
2. `arSystem.start()` → MindAR emits `arReady` (or `arError`)
3. `renderstart` event → captures `sceneEl.camera`, starts the `requestAnimationFrame` loop
4. `targetFound` / `targetLost` on `#target-root` → toggles `gameState.markerVisible`, shows/hides the controls panel

The active marker target is `/assets/targets/marker-sistema-solar.mind` (set in `juegos/sistema-solar/index.html`). The same marker is shared by all games.

### Labels (HTML, not 3D)

Planet labels are `<button>` elements in `#labels-layer`. Every frame, `renderLabels()` projects each planet's 3D world position to 2D via `scene.getScreenPositions(camera, w, h)`, then repositions the DOM buttons. Vertical offset comes from `UI_PREFERENCES.labelOffsetByPlanetId` and scales with `Math.sqrt(scene.getScale())`. When multiple labels land on the same planet, `renderLabels()` stacks them vertically (locked ones first).

### Drag-Drop → Snap

`dragdrop.js` uses pointer capture to unify mouse and touch. On drag-end, `findNearestPlanet()` checks whether the drop point is within `SNAP_DISTANCE` (`APP_CONFIG.snapDistance`, 100 px) of any visible planet's current screen position. Correct planet → increment `gameState.correctCount` + show stamp; if another label was occupying that planet it gets displaced. Wrong/too-far → `overlay.showIncorrect()` (red flash). Drag is disabled during an active pinch gesture and permanently after completion (`dragLockedByCompletion`). Orbits pause while a label is being dragged.

### Solar System Scene (`src/juegos/sistema-solar/ar/scene.js`)

- Three.js root `Group` added to `targetEl.object3D` — tracks the AR marker automatically.
- Planet meshes use **procedurally drawn canvas textures** (per-planet `createPlanetTexture`); Saturn and Uranus get torus rings. Orbit rings are drawn as flat `RingGeometry`.
- Exposes independent controls, each with a `get*Range()` returning `{min,max,initial}` from `SCENE_CONFIG`: `setScale` (zoom, scales the root group), `setOrbitScale` (orbit radii + ring group), `setPlanetScale` (per-planet mesh scale), `setOrbitSpeed` (animation speed multiplier), and `setRotationDegrees` (global X/Y/Z tilt). `main.js` wires each to a slider and persists it to a cookie.
- `fitCorePlanetsToMarker()` can auto-scale so the Sun + core planets fill the marker; `PLANETS` and `phaseOffset` (stored per node) stagger starting angles.
- `planetNodes` is a `Map<planetId, node>`. `Map.forEach(callback)` is `(value, key, map)` — the second arg is the string key, not a numeric index. Store any numeric index as a node property.

### iOS Viewport Fixes

`scheduleIosResizes()` calls `requestArResize()` at the `APP_CONFIG.iosResizeDelaysMs` delays (`[0, 120, 320, 650]`) plus an extra 1000 ms and two rAFs. Triggered on `arReady`, `targetFound`, `window resize`, `orientationchange`, and `visualViewport` resize/scroll. `syncArViewport()` forces `position: fixed` (using `visualViewport` metrics) on the A-Frame scene, canvas, and MindAR video element to counteract Safari viewport behavior.

### Zoom & Pinch

Two-finger pinch and the zoom slider both call `scene.setScale(n)`, clamped to `SCENE_CONFIG.zoom` (`[0.1, 8.0]`). Scale applies to the Three.js root `Group` (`root.scale.setScalar(baseSystemScale * currentScale)`), not A-Frame entities. Pinch disables drag while active and saves the final zoom to a cookie on release.

### Vendor Libraries

A-Frame and MindAR are NOT loaded from CDN. `scripts/sync-vendor.mjs` copies them from `node_modules` to `public/vendor/` before every dev/build; the **game pages** (`juegos/<id>/index.html`) load them from `/vendor/`. The catalog `index.html` does not load the AR libraries.

### Runtime Assets

`scripts/sync-runtime-assets.mjs` (`assets:sync`) copies `assets/targets/` and `assets/nfts/` into `public/assets/` (excluding `.DS_Store`) so Vite serves them at `/assets/...`. Source of truth is `assets/`; `public/assets/` is generated. Marker images live in `assets/markers/`.

### Marker Compilation

`assets/markers/marker-sistema-solar.png` → `npm run compile:target` → `assets/targets/marker-sistema-solar.mind` (then `assets:sync` mirrors it into `public/`). Recompile whenever the marker image changes. `scripts/generate-tech-marker.mjs` can regenerate a high-contrast technical marker PNG programmatically.

### NFT Reward & Gallery (`src/shared/nft/gallery.js` + `src/shared/ui/wallet.js`)

- The NFT pool is built dynamically at build time via `import.meta.glob("../../../assets/nfts/*.{png,jpg,jpeg,webp,avif}")` — drop a file in `assets/nfts/` and it's included automatically (no hardcoded list).
- On completion, after the countdown, the game calls `awardRandomNft(gameId)` (e.g. `awardRandomNft("sistema-solar")`) to pick one at random and record it under that game.
- **Persistence is a cookie**, key `av_nft_gallery_v3` (180-day max-age), storing `{ games: { [gameId]: { counts, order } }, lastWonAt }`. On first read it auto-migrates from the flat `v2` cookie and from legacy `localStorage` (`academia_virtualis_gallery_v1`), assigning those older prizes to `sistema-solar`.
- `getGallerySummary()` returns prizes grouped by game: `[{ gameId, nombre, items: [{ imageSrc, styleName, count }] }]`, omitting games with no prizes.
- Style names are derived from the filename segment after the **last hyphen** before the extension: `NFT-SistemaSolar-1-LooneyTunes.png` → `Looney Tunes` (`getNftStyleName`).
- The 🏆 wallet (`src/shared/ui/wallet.js`, `createWallet()`) opens a gallery modal showing each won NFT (square cards) with its style name and win count (`xN`), **grouped by game** with a heading per game. It's shared by the catalog and every game. The NFT-award modal (game-side) includes a Download button (`downloadNftImage` in the game's `main.js`); the old "Cerrar sitio" button was removed.

## Security & Configuration

- The remote tunnel uses HTTP Basic Auth; keep credentials configurable via env vars (`TUNNEL_USER` / `TUNNEL_PASSWORD`).
- Camera access on iOS requires HTTPS (or localhost). Use `dev:remote` for real-device testing over HTTPS.
- Large generated folders (`dist/`, `node_modules/`) stay untracked. `public/vendor/` and `public/assets/` are generated by the sync scripts.
