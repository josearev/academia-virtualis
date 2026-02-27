# Academia Virtualis - Solar System AR Game

A marker-based educational AR web game built with Vite, A-Frame, and MindAR, optimized for iPhone/iPad usage.

## Overview

The app renders a 3D solar system anchored to a printed/onscreen AR marker. Students drag shuffled planet labels to the correct planet. Once all labels are correct, the app shows a completion flow with countdown, confetti, and a random NFT reward stored locally.

## Features

- Marker-based AR scene using MindAR image tracking.
- 3D procedural solar system rendered with A-Frame/Three.js.
- Drag-and-drop planet labels (touch and mouse support).
- Correctness feedback (green check stamps + progress counter).
- Completion sequence with countdown and confetti.
- Random NFT assignment from local assets.
- Wallet button + local NFT gallery with style labels and counters.
- NFT gallery persistence in cookies.
- Local vendor bundles (no CDN dependency at runtime).

## Tech Stack

- Node.js 20.x
- Vite 7
- A-Frame 1.7.1
- MindAR 1.2.5
- `canvas` (used by marker/target generation scripts)

## Project Structure

```text
.
├── index.html                         # A-Frame + MindAR scene shell and UI mount points
├── src/
│   ├── main.js                        # App orchestration and game flow
│   ├── config/app-config.js           # Tunables, text, behavior constants
│   ├── ar/scene.js                    # AR scene composition and solar system behavior
│   ├── game/state.js                  # Planet definitions and game state
│   ├── game/dragdrop.js               # Drag/drop interactions
│   ├── ui/overlay.js                  # HUD, labels, modals, stamps
│   ├── nft/gallery.js                 # Random NFT selection and local persistence
│   └── styles.css                     # UI styles
├── scripts/
│   ├── compile-target.mjs             # Compiles marker image into .mind target
│   ├── generate-tech-marker.mjs       # Generates high-contrast technical marker
│   ├── dev-remote.mjs                 # Vite + auth proxy + Cloudflare tunnel
│   └── sync-vendor.mjs                # Sync local vendor libs to public/vendor
├── assets/
│   ├── markers/                       # Marker source images/documents
│   ├── targets/                       # Generated .mind tracking targets
│   └── nfts/                          # NFT reward images
├── public/vendor/                     # Local runtime JS bundles (aframe + mindar)
└── docs/cloudflare-pages-deploy.md    # Cloudflare Pages deployment notes
```

## Prerequisites

- Node.js `20.x` (see `.nvmrc`, `.node-version`, and `engines.node`).
- npm.
- Optional for remote sharing: `cloudflared` CLI available in `PATH`.

## Installation

```bash
npm install
npm run compile:target
```

Notes:

- `dev`, `dev:host`, `dev:remote`, `tunnel`, and `build` automatically run `vendor:sync` first.
- If marker source changes, re-run `npm run compile:target`.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local development server (includes vendor sync). |
| `npm run dev:host` | Host on `0.0.0.0:5173` for LAN device testing (includes vendor sync). |
| `npm run dev:remote` | Local dev server + local Basic Auth proxy + Cloudflare HTTPS tunnel. |
| `npm run tunnel` | Alias for `npm run dev:remote`. |
| `npm run build` | Production build to `dist/` (includes vendor sync). |
| `npm run preview` | Preview built app on `0.0.0.0:4173`. |
| `npm run vendor:sync` | Copies vendor bundles from `node_modules` to `public/vendor`. |
| `npm run compile:target` | Compiles marker image into MindAR `.mind` target file. |

## Quick Start Workflows

### Local desktop check

```bash
npm install
npm run compile:target
npm run dev
```

### iPhone/iPad on same Wi-Fi (LAN)

```bash
npm run dev:host
```

Open from device using your machine LAN IP and port `5173`.

### Remote HTTPS sharing

```bash
npm run dev:remote
```

The script prints a public `https://*.trycloudflare.com` URL plus Basic Auth credentials.

## Remote Tunnel and Basic Auth

`scripts/dev-remote.mjs` supports these environment variables:

- `HOST` (default: `0.0.0.0`)
- `PORT` (default: `5173`)
- `PROXY_PORT` (default: `5174`)
- `TUNNEL_USER` (default: `virtualis`)
- `TUNNEL_PASSWORD` (default: `virtualis.1811`)

Example with custom credentials:

```bash
TUNNEL_USER=myuser TUNNEL_PASSWORD='strong-pass' npm run dev:remote
```

## AR Marker Pipeline

### Compile target used by MindAR

Default source image:

- `assets/markers/marker-sistema-solar.png`

Compile command:

```bash
npm run compile:target
```

Output:

- `assets/targets/<marker-name>.mind`

Use a different marker source:

```bash
MARKER_SOURCE=assets/markers/logo-eight-academy.png npm run compile:target
```

### Generate a technical marker image

```bash
node scripts/generate-tech-marker.mjs
```

This overwrites `assets/markers/marker-tech.png`.

## Gameplay and Persistence Notes

- Current implementation includes **9 labels/targets** (`Aciertos: 0/9`), including Pluto.
- On completion, the app shows countdown, then assigns one random NFT from `assets/nfts/`.
- NFT wins are stored in cookies under key:
  - `av_nft_gallery_v2`
- Legacy migration: if old local data exists under `academia_virtualis_gallery_v1`, it is migrated to the cookie model.
- Gallery cards are square (`1:1`), show full NFT artwork, style name, and win count (`xN`).

### NFT style naming rule

Style is derived from the filename segment after the last hyphen (`-`), before the extension.

Example:

- `NFT-SistemaSolar-1-LooneyTunes.png` -> `Looney Tunes`

### Controls and reset

- Sliders available:
  - Solar system zoom
  - Orbit size
  - Planet size
  - Orbit speed
  - Rotation X/Y/Z
- Preferences are persisted in cookies.
- `Reset sliders` restores and persists defaults:
  - Zoom: `1.5x`
  - Orbit size: `2.5x`
  - Planet size: `1.0x`
  - Orbit speed: `0.7x`
  - Rotation X: `-4°`
  - Rotation Y: `0°`
  - Rotation Z: `0°`

## iOS/Safari Notes

- Camera access on iPhone/iPad requires **HTTPS** (or special localhost contexts).
- For real-device validation, prefer `dev:remote` (HTTPS tunnel) or deployed URL.
- If camera is blocked, verify browser permissions and secure context.
- On iPad orientation changes, the app re-synchronizes AR scene/canvas/video viewport to avoid left-shift and right-side margins.

## Build and Deployment

Build locally:

```bash
npm run build
npm run preview
```

Production output is generated in `dist/`.

For Cloudflare Pages setup and Node version guidance, see:

- [`docs/cloudflare-pages-deploy.md`](docs/cloudflare-pages-deploy.md)

## Manual QA Checklist

- Desktop:
  - Drag/drop with mouse works correctly.
  - Progress updates and incorrect feedback behaves correctly.
- iOS Safari:
  - Camera permission prompt appears and is accepted.
  - Marker detection starts reliably.
  - Touch drag/drop interaction is usable.
  - Rotate iPad portrait/landscape and verify AR viewport stays aligned (no lateral margin).
  - Full 9/9 completion flow works.
  - NFT modal appears; download/retry/close actions work.
  - Wallet gallery shows square NFTs without crop, style label, and `xN` counters.

## Troubleshooting

- `cloudflared: command not found`
  - Install Cloudflare Tunnel CLI and retry `npm run dev:remote`.
- Marker not detected
  - Ensure correct marker image/print, good lighting, and correct `.mind` target generated.
- Camera blocked on iOS
  - Use HTTPS URL and confirm Safari camera permissions.
- Missing vendor files / 404 under `/vendor/`
  - Run `npm run vendor:sync`.
- Build/runtime issues with native modules
  - Confirm Node.js `20.x` is in use.

## License

Private project. All rights reserved unless explicitly stated otherwise.
