# Deploy automatico en Cloudflare Pages

Este proyecto se despliega automaticamente desde GitHub a Cloudflare Pages.

## Configuracion en Cloudflare (una sola vez)

1. `Workers & Pages` -> `Create` -> `Pages` -> `Connect to Git`.
2. Selecciona el repositorio `josearev/academia-virtualis`.
3. Configura:
   - `Production branch`: `main`
   - `Build command`: `npm run build`
   - `Build output directory`: `dist`
4. En `Settings` -> `Builds & deployments` -> `Environment variables` (Production), agrega:
   - `NODE_VERSION=20`

## Notas de Node

- El repo fija Node 20 con `.node-version`, `.nvmrc` y `engines.node` en `package.json`.
- Esto evita fallos de instalacion de `canvas` que ocurren con Node 22 en el entorno de Pages.

## Operacion diaria

1. Haz push a `main`.
2. Cloudflare ejecuta build automaticamente.
3. Verifica estado en `Deployments`.

## Validacion post-deploy

1. Abrir `https://<tu-proyecto>.pages.dev`.
2. Confirmar que no hay 404 en recursos `vendor` y `assets/targets`.
3. Probar permisos de camara y flujo AR en iOS Safari.
