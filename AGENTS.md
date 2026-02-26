# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vite-based web AR game for iPhone/iPad-first usage.

- `index.html`: A-Frame + MindAR scene shell and UI mount points.
- `src/main.js`: app orchestration (game flow, events, completion logic).
- `src/ar/`: AR scene composition and 3D solar-system behavior.
- `src/game/`: state and drag/drop interaction logic.
- `src/ui/`: overlay rendering (status, labels, modal, stamps).
- `src/nft/`: random NFT selection and local gallery persistence.
- `scripts/compile-target.mjs`: compiles the active marker image into a `.mind` target.
- `scripts/generate-tech-marker.mjs`: generates the technical high-contrast AR marker.
- `scripts/dev-remote.mjs`: runs Vite + Cloudflare tunnel with HTTP Basic Auth.
- `scripts/sync-vendor.mjs`: syncs local vendor JS (`aframe`, `mindar`) into `public/vendor/`.
- `assets/targets/`: generated marker files used by MindAR.
- `assets/markers/`: marker images/documents.
- `assets/nfts/`: NFT images shown after success.
- `public/vendor/`: local copies of runtime AR libraries (no CDN dependency).

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run vendor:sync`: sync vendor JS from `node_modules` to `public/vendor`.
- `npm run compile:target`: generate marker target (`assets/targets/*.mind`) from current marker source.
- `npm run dev`: run local dev server (includes vendor sync).
- `npm run dev:host`: run dev server on `0.0.0.0:5173` for LAN testing (includes vendor sync).
- `npm run dev:remote`: run dev server + HTTPS Cloudflare tunnel with auth.
- `npm run tunnel`: alias of `npm run dev:remote`.
- `npm run build`: production build into `dist/`.
- `npm run preview`: serve the built app from `dist/`.

Example workflow:
`npm install && npm run compile:target && npm run dev:host`

## Coding Style & Naming Conventions
- Language: modern ES modules (`type: module`), plain JavaScript + CSS.
- Indentation: 2 spaces; always use semicolons.
- Naming:
  - `camelCase` for variables/functions.
  - `UPPER_SNAKE_CASE` for constants (`SUCCESS_TEXT`).
  - lowercase file names grouped by domain (`src/game/state.js`).
- Keep modules focused: AR logic in `src/ar`, gameplay in `src/game`, UI in `src/ui`.

## Testing Guidelines
There is no automated test framework configured yet.

Minimum validation before PR:
- `npm run build` passes.
- Manual test on desktop (mouse drag/drop).
- Manual test on iOS Safari (camera permission, marker detection, touch drag/drop, 9/9 completion, NFT reveal, retry/close actions).

## Commit & Pull Request Guidelines
Use this commit message format for all application changes:
- `[Modelo]: Descripción`
- Example: `[Codex-GPT5]: Implementa validación de drag and drop`

PRs should include:
- Clear summary and scope.
- Commands run (`build`, marker compile, manual checks).
- Screenshots/video for UI/AR changes.
- Notes about iOS behavior and any known limitations.

## Agent-Specific Instruction
- Every time an agent changes app code or assets, it must create a commit in the same session using the format `[Modelo]: Descripción`.
- When a user requests tunnel password conventions, preserve the agreed credentials unless explicitly changed by the user.
- Do not include unrelated local changes in commits (for example `prompts.md` edits made outside feature scope).
- `prompts.md` is user-owned and must not be edited by agents; use `directivas.md` for agent-maintained session directives.

## Security & Configuration Notes
- Tunnel uses HTTP Basic Auth in `dev-remote`; keep credentials configurable via env vars.
- Large generated folders (`dist/`, `node_modules/`) should stay untracked.
- If marker source changes, regenerate target with `npm run compile:target`.
