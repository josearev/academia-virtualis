# Diseño — Catálogo de juegos (Academia Virtualis)

> Fecha: 2026-06-10
> Estado: aprobado para escribir plan de implementación

## 1. Objetivo

Transformar la app de **un solo juego** (Sistema Solar) a un **catálogo de varios juegos**.
La página `index.html`, que hoy *es* el juego del Sistema Solar, pasa a ser una **portada**
(menú) desde la cual se elige un juego. El juego del Sistema Solar se muda a su propia
página, y se agrega un segundo juego (**Operaciones matemáticas**) que por ahora muestra
una pantalla "Próximamente" — su mecánica se diseñará en una sesión posterior.

**Contexto:** proyecto educativo desarrollado por José con su hijo Lucas (11 años) para una
hackathon escolar. Las decisiones priorizan claridad y simplicidad.

## 2. Decisiones tomadas (brainstorming)

| Tema | Decisión |
|------|----------|
| Arquitectura | **Multipágina (MPA)**: cada juego es su propia página HTML con su propio `<a-scene>`. La portada no carga AR. |
| Marcador AR | **Compartido**: todos los juegos usan el mismo `.mind`. No hay marcador por juego. |
| Layout de portada | **Lista de juegos** (tarjetas compactas horizontales, estilo menú de apps). Incluye fila "Próximamente" para juegos futuros. |
| Volver al menú | Cada juego tiene un botón **«‹ Volver»** arriba que regresa a la portada. |
| Página de Operaciones | Stub **"🚧 Próximamente"** con AR no inicializado; el enlace del catálogo funciona. |
| Premios NFT | **Un solo almacenamiento** (cookie), pero cada premio guarda **`gameId`**; la galería los muestra **agrupados por juego**. |

## 3. Estructura de archivos (objetivo)

```
index.html                          ← Portada / catálogo (sin AR)
juegos/
  sistema-solar/index.html          ← Juego solar (HTML que hoy está en index.html)
  operaciones/index.html            ← Juego de mates: pantalla "Próximamente"
vite.config.js                      ← NUEVO: declara las 3 páginas (MPA)

src/
  catalogo/
    catalogo.js                     ← Lógica de la portada: render de la lista, navegación, abrir billetera
  juegos/
    sistema-solar/
      main.js                       ← (movido desde src/main.js)
      ar/scene.js                   ← (movido desde src/ar/scene.js)
      game/state.js, dragdrop.js    ← (movidos desde src/game/)
      ui/overlay.js                 ← overlay del solar SIN la parte de billetera (movido desde src/ui/overlay.js)
      config/app-config.js          ← (movido desde src/config/app-config.js)
    operaciones/
      main.js                       ← stub mínimo de "Próximamente"
  shared/
    nft/gallery.js                  ← (movido desde src/nft/gallery.js) + dimensión gameId
    ui/wallet.js                    ← NUEVO: botón 🏆 + modal de galería (extraído de overlay.js), usable en portada y juegos
  styles.css                        ← compartido; se le agregan estilos de portada y se mantiene wallet/galería
```

**Catálogo de juegos (fuente única de datos):** un arreglo en `src/catalogo/catalogo.js`
(o `src/shared/games.js`) describe cada juego: `{ id, nombre, descripcion, emoji, color, url, estado }`
donde `estado ∈ { 'disponible', 'proximamente' }`. La portada y la billetera leen de aquí
(la billetera usa `id`/`nombre` para etiquetar los grupos).

## 4. Componentes y responsabilidades

### 4.1 Portada (`index.html` + `src/catalogo/catalogo.js`)
- HTML: cabecera con título + botón 🏆 (billetera), contenedor de lista, y el `<section>` del
  modal de galería (reutiliza el markup existente).
- `catalogo.js`: recorre el catálogo de juegos y pinta una tarjeta por cada uno.
  - `disponible` → tarjeta activa, al tocar navega a `url`.
  - `proximamente` → tarjeta atenuada con 🔒, no navegable.
- Importa `shared/ui/wallet.js` + `shared/nft/gallery.js` para el botón 🏆 y la galería agrupada.
- **No** carga A-Frame/MindAR (la portada es ligera). `index.html` no incluye los `<script>` de vendor AR.

### 4.2 Juego Sistema Solar (`juegos/sistema-solar/index.html` + `src/juegos/sistema-solar/*`)
- Se mueve el HTML AR actual (a-scene, HUD, labels, paneles, modales) desde `index.html`.
- Se agrega un botón **«‹ Volver»** (arriba-izquierda) que navega a la portada (`/`).
- `main.js` y módulos se mueven sin cambios de lógica de juego; solo se ajustan:
  - rutas de import hacia `shared/`,
  - rutas de `<script>`/`<link>` en el HTML,
  - extracción de la parte de billetera del overlay (pasa a `shared/ui/wallet.js`).
- El botón post-NFT **«Cerrar»** pasa a regresar a la **portada** (`/`) en lugar de la web
  externa (`RETURN_URL`), coherente con un mundo de catálogo. *(Confirmar al implementar; bajo riesgo.)*

### 4.3 Juego Operaciones (`juegos/operaciones/index.html` + `src/juegos/operaciones/main.js`)
- Página mínima: fondo, título "Operaciones", cartel **"🚧 Próximamente"**, botón **«‹ Volver»**.
- Reutiliza el botón 🏆 y la billetera compartida (opcional pero coherente).
- **No** inicializa AR todavía. La mecánica real es trabajo futuro (otra sesión / otro spec).

### 4.4 Billetera compartida (`src/shared/ui/wallet.js` + `src/shared/nft/gallery.js`)
- `wallet.js`: maneja el botón 🏆, abre/cierra el modal de galería y pinta los premios
  **agrupados por juego** (un encabezado por juego, luego sus tarjetas).
- `gallery.js`: almacenamiento en cookie + premios. Ver modelo de datos abajo.

## 5. Modelo de datos de premios (cookie)

**Hoy** (`av_nft_gallery_v2`): `{ counts: { [imageSrc]: n }, order: [imageSrc...], lastWonAt }`.
No distingue de qué juego vino el premio.

**Nuevo** (`av_nft_gallery_v3`): se agrega la dimensión juego.

```js
{
  games: {
    "sistema-solar": { counts: { [imageSrc]: n }, order: [imageSrc, ...] },
    "operaciones":   { counts: { ... }, order: [ ... ] }
  },
  lastWonAt: "ISO-8601" | null
}
```

- **API:**
  - `awardRandomNft(gameId)` — incrementa el premio dentro de `games[gameId]`.
  - `getGallerySummary()` — devuelve los grupos por juego: `[{ gameId, nombre, items: [{ imageSrc, styleName, count }] }]`.
- **Migración:** al leer, si existe cookie `v2` (formato plano) o el legacy localStorage,
  se envuelve bajo `games["sistema-solar"]` y se reescribe como `v3`. Así los premios ya
  ganados se conservan, etiquetados como Sistema Solar. Se mantiene la lógica de migración
  existente (legacy → cookie) encadenada antes de la de v2 → v3.

## 6. Configuración de Vite (MPA)

Crear `vite.config.js` declarando las entradas:

```js
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        catalogo:     resolve(__dirname, "index.html"),
        sistemaSolar: resolve(__dirname, "juegos/sistema-solar/index.html"),
        operaciones:  resolve(__dirname, "juegos/operaciones/index.html"),
      },
    },
  },
});
```

Los scripts npm (`dev`, `dev:host`, `build`, `tunnel`) no cambian; siguen ejecutando
`vendor:sync` + `assets:sync` antes de Vite. El vendor AR sigue copiándose a `public/vendor/`;
solo las páginas de juego cargan esos `<script>`.

## 7. Navegación

- Portada `/` → tarjeta → `/juegos/sistema-solar/` o `/juegos/operaciones/`.
- En cada juego, «‹ Volver» → `/`.
- Cierre post-NFT del solar → `/` (antes web externa).

## 8. Riesgos y consideraciones

- **iOS Safari + AR:** al navegar entre páginas, la cámara/MindAR se reinicia de forma
  natural (recarga completa) — es justo la razón de elegir MPA. Verificar permiso de cámara
  al entrar a un juego desde la portada.
- **Rutas relativas:** al mover HTML a subcarpetas, revisar que `<script type=module>`,
  `<link>` y referencias a `/assets/...` y `/vendor/...` (rutas absolutas desde la raíz) sigan
  resolviendo. Las rutas absolutas (`/assets/...`) funcionan igual desde subcarpetas.
- **`import.meta.glob` de NFTs:** en `gallery.js` la ruta relativa a `assets/nfts/` cambia al
  mover el archivo a `src/shared/nft/`. Ajustar el patrón del glob.
- **Tamaño de `main.js` (1067 líneas):** no se refactoriza su lógica interna en esta entrega;
  solo se mueve y se le quita la parte de billetera. Mantener el cambio acotado.

## 9. Alcance

**Incluido (esta entrega):**
- Portada con lista de juegos (layout B) + botón 🏆.
- Migración del juego Sistema Solar a su propia página, con botón «‹ Volver».
- Página "Próximamente" de Operaciones, enlazada desde la portada.
- Billetera compartida con `gameId` y galería agrupada por juego (cookie v3 + migración).
- `vite.config.js` para MPA.

**Excluido (futuro):**
- Mecánica real del juego de Operaciones (se diseñará por separado).
- Refactor interno de `main.js` del Sistema Solar.

## 10. Verificación (manual, no hay framework de tests)

- `npm run build` genera las 3 páginas en `dist/`.
- Desktop: portada muestra 2 juegos; abrir Sistema Solar funciona; «‹ Volver» regresa.
- iOS Safari: cámara y marcador funcionan en Sistema Solar tras navegar desde la portada;
  completar 9/9 sigue otorgando NFT; la billetera muestra el premio bajo "Sistema Solar".
- Operaciones abre la pantalla "Próximamente" y «‹ Volver» regresa.
- Premios ganados antes del cambio siguen visibles (migración v2 → v3).
```
