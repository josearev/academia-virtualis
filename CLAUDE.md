# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                  # Install dependencies
npm run vendor:sync          # Copy AR libs from node_modules → public/vendor/ (run before dev/build)
npm run dev                  # Local dev (includes vendor sync)
npm run dev:host             # LAN dev server at 0.0.0.0:5173 (for iPhone/iPad testing)
npm run tunnel               # HTTPS Cloudflare tunnel + Basic Auth (credentials: virtualis / virtualis.1811)
npm run compile:target       # Recompile .mind marker file after changing assets/markers/marker-tech.png
npm run build                # Production build → dist/
npm run preview              # Serve dist/ locally
```

> **Workflow**: `npm install && npm run compile:target && npm run dev:host`

**Important**: `npm run tunnel` starts its own Vite on port 5173 plus an auth proxy on 5174. Do NOT run `dev:host` and `tunnel` at the same time — kill all Vite processes first (`lsof -ti :5173 | xargs kill -9; lsof -ti :5174 | xargs kill -9`). Tunnel credentials and ports are configurable via env vars: `TUNNEL_USER`, `TUNNEL_PASSWORD`, `PORT` (Vite, default 5173), `PROXY_PORT` (auth proxy, default 5174).

`compile:target` accepts `MARKER_SOURCE=path/to/image.png` to compile a different marker image.

There is no test framework. Manual checks: desktop drag/drop, then iOS Safari (camera permission, marker detection, touch drag/drop, 9/9 completion, NFT reveal, retry/close).

## Coding Style

- ES modules (`type: module`), plain JavaScript + CSS, no framework.
- Indentation: 2 spaces; always use semicolons.
- `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for constants, lowercase file names grouped by domain.
- Keep modules focused: AR logic in `src/ar/`, gameplay in `src/game/`, UI in `src/ui/`.

## Commit & Pull Request Guidelines

**Every session that changes app code or assets must create a commit** using the format:
- `[Modelo]: Descripción`
- Example: `[Sonnet-4.6]: Implementa validación de drag and drop`

Do not include `prompts.md` changes in feature commits.

PRs for UI/AR changes should include screenshots or video, commands run (`build`, marker compile, manual checks), and notes about iOS behavior.

## Architecture Overview

iOS-first AR educational game with no backend. Everything runs in the browser using A-Frame + MindAR for image-based marker tracking.

### Data Flow

```
index.html (HTML shell + UI mount points)
    └── src/main.js          ← Orchestrator: boots AR, owns game loop, pinch/zoom, drag wiring
            ├── src/ar/scene.js      ← Three.js solar system (3D objects, orbit animation, screen projection)
            ├── src/game/state.js    ← Planet data + derangement shuffle
            ├── src/game/dragdrop.js ← Pointer event controller (mouse + touch unified, pointer capture)
            ├── src/ui/overlay.js    ← DOM manipulation: labels, stamps, HUD, modal
            └── src/nft/gallery.js  ← Random NFT award + localStorage persistence
```

### AR Lifecycle (`main.js`)

MindAR is configured with `autoStart: false` — camera only starts when the user taps the button. Startup sequence:

1. Button click → `waitForMindarSystem()` polls `sceneEl.systems["mindar-image-system"]` until ready (12 s timeout)
2. `arSystem.start()` → MindAR emits `arReady` (or `arError`)
3. `renderstart` event → captures `sceneEl.camera`, starts `requestAnimationFrame` loop
4. `targetFound` / `targetLost` on `#target-root` → toggles `gameState.markerVisible`

### Labels (HTML, not 3D)

Planet labels are `<button>` elements in `#labels-layer`. Every frame, `renderLabels()` projects each planet's 3D world position to 2D via `scene.getScreenPositions(camera, w, h)`, then repositions the DOM buttons with `overlay.renderLabel()`. Vertical offset above each planet is defined in `LABEL_OFFSET_BY_PLANET_ID` (map in `main.js`) and scales with `Math.sqrt(solarScene.getScale())`.

### Drag-Drop → Snap

`dragdrop.js` uses pointer capture to unify mouse and touch. On drag-end, `findNearestPlanet()` checks if the drop point is within `SNAP_DISTANCE` (86 px) of any visible planet's current screen position. A match on the correct planet increments `gameState.correctCount` and shows a stamp. Wrong planet → red flash via `.incorrect` class.

Drag is disabled (`dragController.setEnabled(false)`) during active pinch gesture and permanently after activity completion.

### Solar System Scene (`src/ar/scene.js`)

- Three.js root `Group` added to `targetEl.object3D` — tracks the AR marker automatically.
- `LAYOUT_PRESETS` defines two layouts (`didactic`, `wide`). Only `didactic` is used currently. Each preset sets per-planet `x` position, `microOrbit` amplitude, and `speedFactor`.
- `fitCorePlanetsToMarker()` auto-scales the scene on `targetFound` so Sun + core planets (Mercurio → Marte) fill the marker area.
- `planetNodes` is a `Map<planetId, node>`. `Map.forEach(callback)` signature is `(value, key, map)` — the second argument is the string key, not a numeric index. Store any needed numeric index as a property on the node when building the Map.
- `phaseOffset` (numeric, stored per-node at construction time) ensures each planet starts at a different orbital angle.

### iOS Viewport Fixes

`scheduleIosResizes()` calls `requestArResize()` at `[0, 120, 320, 650]` ms delays. Triggered on `arReady`, `targetFound`, `window resize`, and `orientationchange`. `syncArViewport()` forces `position: fixed` on the A-Frame scene, canvas, and MindAR video element to counteract Safari's viewport behavior.

### Zoom

Pinch gesture and range slider both call `scene.setScale(n)`, clamped to `[0.8, 2.6]`. Scale is applied to the Three.js root `Group` (`root.scale.setScalar(BASE_SYSTEM_SCALE * currentScale)`), not A-Frame entities.

### Vendor Libraries

A-Frame and MindAR are NOT loaded from CDN. `scripts/sync-vendor.mjs` copies them from `node_modules` to `public/vendor/` before every dev/build. `index.html` loads from `/vendor/`. If you skip `vendor:sync`, the page will 404 on the AR libraries.

### Marker Compilation

`assets/markers/marker-tech.png` → `npm run compile:target` → `assets/targets/marker-tech.mind`. The `.mind` file is referenced in `index.html`. Recompile whenever the marker image changes. `scripts/generate-tech-marker.mjs` can regenerate the source PNG programmatically.

### NFT Reward

On activity completion, after a 5 s delay `gallery.js` picks a random path from `/assets/nfts/NFT-SistemaSolar-1.png` … `10.png` and appends it to `localStorage` key `academia_virtualis_gallery_v1`. The close button navigates to an external Canva site (`RETURN_URL` in `main.js`).
