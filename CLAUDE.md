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
- Keep modules focused: AR logic in `src/ar/`, gameplay in `src/game/`, UI in `src/ui/`, tunables in `src/config/`.
- **Tunables go in `src/config/app-config.js`, not inline.** Strings, distances, ranges, timings, colors, and feature flags are all centralized there (see Configuration below).

## Commit & Pull Request Guidelines

**Every session that changes app code or assets must create a commit** using the format:
- `[Modelo]: Descripción` (imperative) — e.g. `[Sonnet-4.6]: Implementa validación de drag and drop`

Do not include `prompts.md` changes in feature commits. `prompts.md` is user-owned and must not be edited by agents; use `directivas.md` for agent-maintained session directives. `AGENTS.md` is a stub that just points back to this file.

PRs for UI/AR changes should include screenshots or video, commands run (`build`, marker compile, manual checks), and notes about iOS behavior.

## Architecture Overview

iOS-first AR educational game with no backend. Everything runs in the browser using A-Frame + MindAR for image-based marker tracking. Students drag shuffled planet name labels onto the matching planet; completing all 9 (Mercurio → Plutón) triggers a confetti + countdown + random NFT reward flow.

### Data Flow

```
index.html (HTML shell + UI mount points: HUD, labels layer, controls panel, modals)
    └── src/main.js               ← Orchestrator: boots AR, owns render loop, pinch/zoom,
            │                        slider wiring, drag wiring, completion + confetti
            ├── src/config/app-config.js ← Central config: tunables, text, ranges, flags,
            │                              cookie helpers for slider persistence
            ├── src/ar/scene.js          ← Three.js solar system (procedural planet textures,
            │                              orbit animation, zoom/orbit/planet/speed/rotation, projection)
            ├── src/game/state.js        ← Planet data (PLANETS) + derangement shuffle
            ├── src/game/dragdrop.js     ← Pointer event controller (mouse + touch, pointer capture)
            ├── src/ui/overlay.js        ← DOM: labels, stamps, HUD, completion/NFT/gallery modals
            └── src/nft/gallery.js       ← Random NFT award + cookie persistence + style names
```

### Configuration (`src/config/app-config.js`)

This is the single source of truth for behavior. Read it before changing any constant.
- `APP_VERSION` — shown on screen via `#version-counter`; bump the sub-version by +1 per commit.
- `APP_CONFIG` — `successText`, `returnUrl` (external Canva site the close button navigates to), `snapDistance` (**100 px**, the drop tolerance), `completionCountdownSeconds`, MindAR poll/timeout values, `iosResizeDelaysMs`, gate texts.
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

The active marker target is `/assets/targets/marker-sistema-solar.mind` (set in `index.html`).

### Labels (HTML, not 3D)

Planet labels are `<button>` elements in `#labels-layer`. Every frame, `renderLabels()` projects each planet's 3D world position to 2D via `scene.getScreenPositions(camera, w, h)`, then repositions the DOM buttons. Vertical offset comes from `UI_PREFERENCES.labelOffsetByPlanetId` and scales with `Math.sqrt(scene.getScale())`. When multiple labels land on the same planet, `renderLabels()` stacks them vertically (locked ones first).

### Drag-Drop → Snap

`dragdrop.js` uses pointer capture to unify mouse and touch. On drag-end, `findNearestPlanet()` checks whether the drop point is within `SNAP_DISTANCE` (`APP_CONFIG.snapDistance`, 100 px) of any visible planet's current screen position. Correct planet → increment `gameState.correctCount` + show stamp; if another label was occupying that planet it gets displaced. Wrong/too-far → `overlay.showIncorrect()` (red flash). Drag is disabled during an active pinch gesture and permanently after completion (`dragLockedByCompletion`). Orbits pause while a label is being dragged.

### Solar System Scene (`src/ar/scene.js`)

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

A-Frame and MindAR are NOT loaded from CDN. `scripts/sync-vendor.mjs` copies them from `node_modules` to `public/vendor/` before every dev/build; `index.html` loads from `/vendor/`.

### Runtime Assets

`scripts/sync-runtime-assets.mjs` (`assets:sync`) copies `assets/targets/` and `assets/nfts/` into `public/assets/` (excluding `.DS_Store`) so Vite serves them at `/assets/...`. Source of truth is `assets/`; `public/assets/` is generated. Marker images live in `assets/markers/`.

### Marker Compilation

`assets/markers/marker-sistema-solar.png` → `npm run compile:target` → `assets/targets/marker-sistema-solar.mind` (then `assets:sync` mirrors it into `public/`). Recompile whenever the marker image changes. `scripts/generate-tech-marker.mjs` can regenerate a high-contrast technical marker PNG programmatically.

### NFT Reward & Gallery (`src/nft/gallery.js`)

- The NFT pool is built dynamically at build time via `import.meta.glob("../../assets/nfts/*.{png,jpg,jpeg,webp,avif}")` — drop a file in `assets/nfts/` and it's included automatically (no hardcoded list).
- On completion, after the countdown, `awardRandomNft()` picks one at random and records it.
- **Persistence is a cookie**, key `av_nft_gallery_v2` (180-day max-age), storing `{counts, order, lastWonAt}`. Legacy `localStorage` data under `academia_virtualis_gallery_v1` is migrated to the cookie on first read, then removed.
- Style names are derived from the filename segment after the **last hyphen** before the extension: `NFT-SistemaSolar-1-LooneyTunes.png` → `Looney Tunes` (`getNftStyleName`).
- The wallet button opens a gallery modal showing each won NFT (square cards) with its style name and win count (`xN`). The NFT modal includes a Download button (`downloadNftImage` in `main.js`); the close button navigates to `APP_CONFIG.returnUrl`.

## Security & Configuration

- The remote tunnel uses HTTP Basic Auth; keep credentials configurable via env vars (`TUNNEL_USER` / `TUNNEL_PASSWORD`).
- Camera access on iOS requires HTTPS (or localhost). Use `dev:remote` for real-device testing over HTTPS.
- Large generated folders (`dist/`, `node_modules/`) stay untracked. `public/vendor/` and `public/assets/` are generated by the sync scripts.
