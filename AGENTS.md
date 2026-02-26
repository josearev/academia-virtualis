# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vite-based web AR game for iPhone/iPad-first usage.

- `index.html`: A-Frame + MindAR scene shell and UI mount points.
- `src/main.js`: app orchestration (game flow, events, completion logic).
- `src/ar/`: AR scene composition and 3D solar-system behavior.
- `src/game/`: state and drag/drop interaction logic.
- `src/ui/`: overlay rendering (status, labels, modal, stamps).
- `src/nft/`: random NFT selection and local gallery persistence.
- `scripts/compile-target.mjs`: compiles `logo-eight-academy.png` into a `.mind` marker.
- `assets/targets/`: generated marker files used by MindAR.
- `nfts/`: NFT images shown after success.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run compile:target`: generate `assets/targets/logo-eight-academy.mind`.
- `npm run dev`: run local dev server.
- `npm run dev:host`: run dev server on `0.0.0.0:5173` for LAN testing.
- `npm run tunnel`: expose local server via LocalTunnel (HTTPS).
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
- Example: `[Codex-5.3]: Implementa validación de drag and drop`

PRs should include:
- Clear summary and scope.
- Commands run (`build`, marker compile, manual checks).
- Screenshots/video for UI/AR changes.
- Notes about iOS behavior and any known limitations.

## Agent-Specific Instruction
- Every time an agent changes app code or assets, it must create a commit in the same session using the format `[Modelo]: Descripción`.

## Security & Configuration Notes
- Do not commit secrets or private tunnel credentials.
- Large generated folders (`dist/`, `node_modules/`) should stay untracked.
- If marker source changes (`logo-eight-academy.png`), re-run `npm run compile:target`.
