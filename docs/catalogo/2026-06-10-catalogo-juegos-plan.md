# Catálogo de juegos (MPA) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la app de un solo juego (Sistema Solar) en un catálogo multipágina de juegos AR, con código compartido y billetera de premios agrupada por juego.

**Architecture:** Multipágina (MPA) con Vite. `index.html` pasa a ser la portada/catálogo (sin AR). El juego Sistema Solar se mueve a `juegos/sistema-solar/` con su código en `src/juegos/sistema-solar/`. Se agrega `juegos/operaciones/` como página "Próximamente". El código común (lista de juegos, billetera NFT, galería) vive en `src/shared/`.

**Tech Stack:** Vite 7, A-Frame 1.7 + MindAR (vendored), ES modules, JavaScript + CSS sin framework. **No hay framework de tests**: la verificación es `npm run build` (debe pasar) + checks manuales en navegador/iOS Safari.

**Spec de referencia:** `docs/catalogo/2026-06-10-catalogo-juegos-design.md`

---

## Notas para quien ejecuta (leer antes de empezar)

- **Rutas absolutas funcionan desde cualquier página.** `index.html` ya carga `/vendor/...`, `/src/...`, `/assets/...` con rutas absolutas; al mover HTML a subcarpetas (`juegos/sistema-solar/`) esas rutas siguen resolviendo. Mantener rutas absolutas (con `/` inicial) en los `<script>`, `<link>` y `imageTargetSrc`.
- **Imports JS relativos sí cambian al mover archivos.** Cuidado con `import.meta.glob` en `gallery.js`.
- **Commits frecuentes.** Cada tarea termina con un commit `[Opus-4.8]: ...` (formato obligatorio del repo).
- **El árbol de trabajo debe quedar construible** (`npm run build`) al final de cada tarea que toque código de build.
- **`git mv`** para mover archivos (preserva historial).

### Mapa de archivos (estado objetivo)

```
index.html                              MODIFICAR (pasa a ser catálogo)
juegos/sistema-solar/index.html         CREAR (markup AR movido desde index.html)
juegos/operaciones/index.html           CREAR (Próximamente)
vite.config.js                          CREAR (multipágina)

src/catalogo/catalogo.js                CREAR
src/catalogo/catalogo.css               CREAR
src/shared/games.js                     CREAR (fuente única de datos)
src/shared/nft/gallery.js               MOVER desde src/nft/gallery.js + gameId/v3
src/shared/ui/wallet.js                 CREAR (extraído de overlay.js)
src/shared/ui/wallet.css                CREAR (extraído de styles.css)

src/juegos/sistema-solar/main.js        MOVER desde src/main.js + edits
src/juegos/sistema-solar/ar/scene.js    MOVER desde src/ar/scene.js
src/juegos/sistema-solar/game/*.js      MOVER desde src/game/*.js
src/juegos/sistema-solar/ui/overlay.js  MOVER desde src/ui/overlay.js + quitar wallet/close
src/juegos/sistema-solar/config/app-config.js  MOVER desde src/config/app-config.js
src/styles.css                          MODIFICAR (quitar reglas de wallet/gallery)
```

---

## Task 1: Fuente única de datos — `src/shared/games.js`

**Files:**
- Create: `src/shared/games.js`

- [ ] **Step 1: Crear el módulo del catálogo de juegos**

Crear `src/shared/games.js` con exactamente:

```js
// Fuente única de datos del catálogo de juegos.
// La portada (catalogo.js) y la billetera (nft/gallery.js, ui/wallet.js) leen de aquí.
export const GAMES = [
  {
    id: "sistema-solar",
    nombre: "Sistema Solar",
    descripcion: "Coloca cada planeta en su lugar",
    emoji: "🪐",
    color: "linear-gradient(135deg, #3b2f8f, #6a4bd6)",
    url: "/juegos/sistema-solar/",
    estado: "disponible"
  },
  {
    id: "operaciones",
    nombre: "Operaciones",
    descripcion: "Resuelve retos de matemáticas",
    emoji: "➗",
    color: "linear-gradient(135deg, #0e7a5f, #23b58a)",
    url: "/juegos/operaciones/",
    estado: "proximamente"
  }
];

export const getGameById = (gameId) =>
  GAMES.find((game) => game.id === gameId) || null;

export const getGameName = (gameId) => {
  const game = getGameById(gameId);
  return game ? game.nombre : gameId;
};

// Enlace externo mostrado al pie del catálogo (antes era APP_CONFIG.returnUrl,
// que ya no usa ningún juego). Se centraliza aquí, en el módulo compartido.
export const CANVA_URL = "https://xerticagrupoacererobdr.my.canva.site/c1fncgdhef8bcwqy";
```

- [ ] **Step 2: Verificar que el módulo es válido**

Run: `node --input-type=module -e "import('./src/shared/games.js').then(m => console.log(m.GAMES.map(g => g.id).join(',')))"`
Expected (salida): `sistema-solar,operaciones`

- [ ] **Step 3: Commit**

```bash
git add src/shared/games.js
git commit -m "[Opus-4.8]: Agrega catálogo de juegos compartido (games.js)"
```

---

## Task 2: Mover la galería NFT a `shared/` con dimensión `gameId` (cookie v3)

**Files:**
- Move: `src/nft/gallery.js` → `src/shared/nft/gallery.js`
- Modify: `src/shared/nft/gallery.js` (glob path, modelo v3, API por juego, migración)

> **Contexto del archivo actual:** `gallery.js` guarda en cookie `av_nft_gallery_v2` con forma plana `{ counts: { [imageSrc]: n }, order: [imageSrc...], lastWonAt }`. Migra desde un `localStorage` legacy. Expone `getGallerySummary()` (lista plana), `awardRandomNft()`, `getNftStyleName()`. Usa `import.meta.glob("../../assets/nfts/...")`.

- [ ] **Step 1: Mover el archivo con git**

```bash
mkdir -p src/shared/nft
git mv src/nft/gallery.js src/shared/nft/gallery.js
rmdir src/nft 2>/dev/null || true
```

- [ ] **Step 2: Arreglar la ruta del glob de NFTs**

El archivo se movió un nivel más profundo (`src/nft/` → `src/shared/nft/`), así que el glob necesita un `../` más.

En `src/shared/nft/gallery.js`, reemplazar:

```js
const nftModules = import.meta.glob("../../assets/nfts/*.{png,jpg,jpeg,webp,avif}", { eager: true });
```

por:

```js
const nftModules = import.meta.glob("../../../assets/nfts/*.{png,jpg,jpeg,webp,avif}", { eager: true });
```

- [ ] **Step 3: Actualizar claves de cookie y agregar import de games**

En `src/shared/nft/gallery.js`, reemplazar las primeras líneas:

```js
const COOKIE_KEY = "av_nft_gallery_v2";
const COOKIE_MAX_AGE_DAYS = 180;
const LEGACY_STORAGE_KEY = "academia_virtualis_gallery_v1";
const UNKNOWN_STYLE_NAME = "Estilo desconocido";
```

por:

```js
import { GAMES, getGameName } from "../games.js";

const COOKIE_KEY = "av_nft_gallery_v3";
const LEGACY_COOKIE_KEY_V2 = "av_nft_gallery_v2";
const COOKIE_MAX_AGE_DAYS = 180;
const LEGACY_STORAGE_KEY = "academia_virtualis_gallery_v1";
const UNKNOWN_STYLE_NAME = "Estilo desconocido";
const DEFAULT_GAME_ID = "sistema-solar";
```

- [ ] **Step 4: Reemplazar el modelo de estado vacío y la normalización por la versión v3 (agrupada por juego)**

En `src/shared/nft/gallery.js`, reemplazar la función `createEmptyGallery` y la función `normalizeState` completas:

```js
const createEmptyGallery = () => ({ counts: {}, order: [], lastWonAt: null });
```

```js
const normalizeState = (rawState) => {
  if (!rawState || typeof rawState !== "object") {
    return createEmptyGallery();
  }

  const counts = {};
  if (rawState.counts && typeof rawState.counts === "object") {
    Object.entries(rawState.counts).forEach(([imageSrc, value]) => {
      const parsed = Number(value);
      if (NFT_POOL.includes(imageSrc) && Number.isFinite(parsed) && parsed > 0) {
        counts[imageSrc] = Math.floor(parsed);
      }
    });
  }

  const order = [];
  if (Array.isArray(rawState.order)) {
    rawState.order.forEach((imageSrc) => {
      if (typeof imageSrc === "string" && counts[imageSrc] > 0 && !order.includes(imageSrc)) {
        order.push(imageSrc);
      }
    });
  }

  Object.keys(counts).forEach((imageSrc) => {
    if (!order.includes(imageSrc)) {
      order.push(imageSrc);
    }
  });

  const lastWonAt = typeof rawState.lastWonAt === "string" ? rawState.lastWonAt : null;
  return { counts, order, lastWonAt };
};
```

por estas dos funciones nuevas:

```js
// Estado v3: premios agrupados por juego.
// { games: { [gameId]: { counts: { [imageSrc]: n }, order: [imageSrc...] } }, lastWonAt }
const createEmptyGallery = () => ({ games: {}, lastWonAt: null });

const createEmptyGameBucket = () => ({ counts: {}, order: [] });

// Normaliza un bucket plano { counts, order } filtrando imágenes inexistentes.
const normalizeBucket = (rawBucket) => {
  const bucket = createEmptyGameBucket();
  if (!rawBucket || typeof rawBucket !== "object") {
    return bucket;
  }

  if (rawBucket.counts && typeof rawBucket.counts === "object") {
    Object.entries(rawBucket.counts).forEach(([imageSrc, value]) => {
      const parsed = Number(value);
      if (NFT_POOL.includes(imageSrc) && Number.isFinite(parsed) && parsed > 0) {
        bucket.counts[imageSrc] = Math.floor(parsed);
      }
    });
  }

  if (Array.isArray(rawBucket.order)) {
    rawBucket.order.forEach((imageSrc) => {
      if (typeof imageSrc === "string" && bucket.counts[imageSrc] > 0 && !bucket.order.includes(imageSrc)) {
        bucket.order.push(imageSrc);
      }
    });
  }

  Object.keys(bucket.counts).forEach((imageSrc) => {
    if (!bucket.order.includes(imageSrc)) {
      bucket.order.push(imageSrc);
    }
  });

  return bucket;
};

const normalizeState = (rawState) => {
  if (!rawState || typeof rawState !== "object") {
    return createEmptyGallery();
  }

  const games = {};
  if (rawState.games && typeof rawState.games === "object") {
    Object.entries(rawState.games).forEach(([gameId, rawBucket]) => {
      const bucket = normalizeBucket(rawBucket);
      if (bucket.order.length > 0) {
        games[gameId] = bucket;
      }
    });
  }

  const lastWonAt = typeof rawState.lastWonAt === "string" ? rawState.lastWonAt : null;
  return { games, lastWonAt };
};
```

- [ ] **Step 5: Agregar migración desde el formato plano v2 y ajustar la lectura**

En `src/shared/nft/gallery.js`, reemplazar la función `readGalleryState` completa:

```js
const readGalleryState = () => {
  const rawCookie = readCookieRaw(COOKIE_KEY);
  if (rawCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(rawCookie));
      return normalizeState(parsed);
    } catch {
      return createEmptyGallery();
    }
  }

  const migratedState = buildStateFromLegacyStorage();
  if (migratedState) {
    persistCookie(migratedState);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return normalizeState(migratedState);
  }

  return createEmptyGallery();
};
```

por:

```js
// Envuelve un bucket plano { counts, order, lastWonAt } bajo games[DEFAULT_GAME_ID].
const wrapFlatBucketAsV3 = (flat) => ({
  games: { [DEFAULT_GAME_ID]: { counts: flat.counts, order: flat.order } },
  lastWonAt: typeof flat.lastWonAt === "string" ? flat.lastWonAt : null
});

const readGalleryState = () => {
  // 1) Formato actual v3.
  const rawCookieV3 = readCookieRaw(COOKIE_KEY);
  if (rawCookieV3) {
    try {
      return normalizeState(JSON.parse(decodeURIComponent(rawCookieV3)));
    } catch {
      return createEmptyGallery();
    }
  }

  // 2) Migración desde cookie plana v2 → v3 (premios viejos = Sistema Solar).
  const rawCookieV2 = readCookieRaw(LEGACY_COOKIE_KEY_V2);
  if (rawCookieV2) {
    try {
      const flat = normalizeBucket(JSON.parse(decodeURIComponent(rawCookieV2)));
      const lastWonAt = (() => {
        try { return JSON.parse(decodeURIComponent(rawCookieV2)).lastWonAt ?? null; } catch { return null; }
      })();
      const migrated = wrapFlatBucketAsV3({ ...flat, lastWonAt });
      const normalized = normalizeState(migrated);
      persistCookie(normalized);
      return normalized;
    } catch {
      // sigue a la migración legacy
    }
  }

  // 3) Migración desde localStorage legacy v1 → v3.
  const legacyFlat = buildStateFromLegacyStorage();
  if (legacyFlat) {
    const normalized = normalizeState(wrapFlatBucketAsV3(legacyFlat));
    persistCookie(normalized);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return normalized;
  }

  return createEmptyGallery();
};
```

- [ ] **Step 6: Reemplazar `getGallerySummary` (agrupado) y `awardRandomNft(gameId)`**

En `src/shared/nft/gallery.js`, reemplazar las funciones exportadas `getGallerySummary` y `awardRandomNft` completas:

```js
export const getGallerySummary = () => {
  const state = readGalleryState();
  return state.order
    .filter((imageSrc) => state.counts[imageSrc] > 0)
    .map((imageSrc) => ({
      imageSrc,
      styleName: getNftStyleName(imageSrc),
      count: state.counts[imageSrc]
    }));
};

export const awardRandomNft = () => {
  if (NFT_POOL.length === 0) {
    return { imageSrc: "", styleName: UNKNOWN_STYLE_NAME };
  }

  const selected = NFT_POOL[Math.floor(Math.random() * NFT_POOL.length)];
  const state = readGalleryState();

  state.counts[selected] = (state.counts[selected] || 0) + 1;
  state.order = [selected, ...state.order.filter((imageSrc) => imageSrc !== selected)];
  state.lastWonAt = new Date().toISOString();

  persistGalleryState(state);
  return {
    imageSrc: selected,
    styleName: getNftStyleName(selected)
  };
};
```

por:

```js
// Devuelve los premios agrupados por juego, en el orden de GAMES.
// Los juegos sin premios se omiten (no se muestra encabezado vacío).
export const getGallerySummary = () => {
  const state = readGalleryState();
  const knownIds = GAMES.map((game) => game.id);
  const extraIds = Object.keys(state.games).filter((id) => !knownIds.includes(id));
  const orderedIds = [...knownIds, ...extraIds];

  return orderedIds
    .map((gameId) => {
      const bucket = state.games[gameId];
      if (!bucket || bucket.order.length === 0) {
        return null;
      }
      const items = bucket.order
        .filter((imageSrc) => bucket.counts[imageSrc] > 0)
        .map((imageSrc) => ({
          imageSrc,
          styleName: getNftStyleName(imageSrc),
          count: bucket.counts[imageSrc]
        }));
      if (items.length === 0) {
        return null;
      }
      return { gameId, nombre: getGameName(gameId), items };
    })
    .filter(Boolean);
};

export const awardRandomNft = (gameId = DEFAULT_GAME_ID) => {
  if (NFT_POOL.length === 0) {
    return { imageSrc: "", styleName: UNKNOWN_STYLE_NAME };
  }

  const selected = NFT_POOL[Math.floor(Math.random() * NFT_POOL.length)];
  const state = readGalleryState();

  const bucket = state.games[gameId] || createEmptyGameBucket();
  bucket.counts[selected] = (bucket.counts[selected] || 0) + 1;
  bucket.order = [selected, ...bucket.order.filter((imageSrc) => imageSrc !== selected)];
  state.games[gameId] = bucket;
  state.lastWonAt = new Date().toISOString();

  persistGalleryState(state);
  return {
    imageSrc: selected,
    styleName: getNftStyleName(selected)
  };
};
```

- [ ] **Step 7: Verificar que el módulo sigue siendo válido sintácticamente**

Run: `npx vite build 2>&1 | tail -5`
Expected: build falla **solo** si hay otros archivos rotos por las tareas siguientes. En este punto, si index.html aún importa rutas viejas, puede fallar — está bien si el error NO menciona `gallery.js`. Para aislar el módulo: `node --check src/shared/nft/gallery.js` (Expected: sin salida = OK sintáctico; ignora que `import.meta.glob` no exista fuera de Vite, `node --check` solo valida sintaxis).

> Nota: `node --check` no resuelve imports, solo valida sintaxis. La validación funcional real ocurre en la verificación manual de la Task 9.

- [ ] **Step 8: Commit**

```bash
git add src/shared/nft/gallery.js
git commit -m "[Opus-4.8]: Mueve galería NFT a shared con premios agrupados por juego (v3)"
```

---

## Task 3: Billetera compartida — `src/shared/ui/wallet.js` + `wallet.css`

**Files:**
- Create: `src/shared/ui/wallet.js`
- Create: `src/shared/ui/wallet.css`

> **Qué hace:** extrae del `overlay.js` actual el botón 🏆 y el modal de galería, pero renderizando **agrupado por juego** (un título por juego + su grilla de tarjetas). Lee los premios con `getGallerySummary()`.

- [ ] **Step 1: Crear `src/shared/ui/wallet.js`**

```js
import { getGallerySummary } from "../nft/gallery.js";

const UNKNOWN_STYLE_NAME = "Estilo desconocido";

export const createWallet = () => {
  const walletBtn = document.querySelector("#wallet-btn");
  const galleryModal = document.querySelector("#gallery-modal");
  const galleryGrid = document.querySelector("#gallery-grid");
  const galleryEmpty = document.querySelector("#gallery-empty");
  const galleryCloseBtn = document.querySelector("#gallery-close-btn");

  const renderItemCard = (item) => {
    const card = document.createElement("figure");
    card.className = "gallery-card";

    const image = document.createElement("img");
    image.src = item.imageSrc;
    image.alt = "NFT ganado";

    const caption = document.createElement("figcaption");
    const style = document.createElement("span");
    style.className = "gallery-style";
    style.textContent = item.styleName || UNKNOWN_STYLE_NAME;

    const count = document.createElement("span");
    count.className = "gallery-count";
    count.textContent = `x${item.count}`;

    caption.appendChild(style);
    caption.appendChild(count);
    card.appendChild(image);
    card.appendChild(caption);
    return card;
  };

  const render = () => {
    if (!galleryGrid || !galleryEmpty) {
      return;
    }
    const groups = getGallerySummary();
    const hasItems = groups.length > 0;
    galleryEmpty.hidden = hasItems;
    galleryGrid.hidden = !hasItems;
    galleryGrid.replaceChildren();
    if (!hasItems) {
      return;
    }

    groups.forEach((group) => {
      const title = document.createElement("h2");
      title.className = "gallery-group-title";
      title.textContent = group.nombre;
      galleryGrid.appendChild(title);

      const groupGrid = document.createElement("div");
      groupGrid.className = "gallery-group";
      group.items.forEach((item) => groupGrid.appendChild(renderItemCard(item)));
      galleryGrid.appendChild(groupGrid);
    });
  };

  const open = () => {
    if (!galleryModal) {
      return;
    }
    render();
    galleryModal.hidden = false;
  };

  const close = () => {
    if (galleryModal) {
      galleryModal.hidden = true;
    }
  };

  if (walletBtn) {
    walletBtn.addEventListener("click", () => {
      if (galleryModal && !galleryModal.hidden) {
        close();
        return;
      }
      open();
    });
  }
  if (galleryCloseBtn) {
    galleryCloseBtn.addEventListener("click", close);
  }
  if (galleryModal) {
    galleryModal.addEventListener("click", (event) => {
      if (event.target === galleryModal) {
        close();
      }
    });
  }
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    }
  });

  return { refresh: render, open, close };
};
```

- [ ] **Step 2: Crear `src/shared/ui/wallet.css` (auto-contenido, no depende de styles.css)**

```css
/* Billetera de premios — compartida entre portada y juegos. Auto-contenida. */
#wallet-btn {
  position: fixed;
  left: 50%;
  bottom: max(12px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 60;
  display: grid;
  place-content: center;
  width: 52px;
  height: 52px;
  min-width: 52px;
  min-height: 52px;
  border-radius: 999px;
  border: 1px solid rgba(122, 158, 219, 0.72);
  background: rgba(16, 41, 87, 0.92);
  color: #eff6ff;
  padding: 0;
  cursor: pointer;
}

.wallet-icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

#gallery-modal {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: clamp(16px, 5vw, 40px);
  overflow-y: auto;
  background: rgba(2, 6, 17, 0.92);
  color: #e7f1ff;
  font-family: "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
}

#gallery-modal[hidden] {
  display: none;
}

#gallery-modal h1 {
  margin: 8px 0 0;
  font-size: clamp(20px, 5vw, 28px);
  text-align: center;
}

#gallery-empty {
  text-align: center;
  color: #bfd3ee;
  max-width: 34rem;
}

#gallery-grid {
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

#gallery-grid[hidden] {
  display: none;
}

.gallery-group-title {
  margin: 8px 0 0;
  font-size: 16px;
  color: #ffd36a;
  border-bottom: 1px solid rgba(122, 158, 219, 0.35);
  padding-bottom: 6px;
}

.gallery-group {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.gallery-card {
  margin: 0;
  background: rgba(7, 18, 41, 0.74);
  border: 1px solid rgba(122, 158, 219, 0.4);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gallery-card img {
  width: 100%;
  border-radius: 8px;
  display: block;
}

.gallery-card figcaption {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.gallery-style {
  color: #e7f1ff;
}

.gallery-count {
  color: #ffd36a;
  font-weight: 700;
}

#gallery-close-btn {
  min-height: 44px;
  padding: 10px 22px;
  border-radius: 999px;
  border: 1px solid rgba(122, 158, 219, 0.72);
  background: rgba(16, 41, 87, 0.92);
  color: #f4f8ff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
```

- [ ] **Step 3: Verificar sintaxis del JS**

Run: `node --check src/shared/ui/wallet.js`
Expected: sin salida (OK).

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui/wallet.js src/shared/ui/wallet.css
git commit -m "[Opus-4.8]: Agrega billetera compartida (wallet.js + wallet.css) agrupada por juego"
```

---

## Task 4: Quitar wallet/gallery de `styles.css` (evitar duplicado)

**Files:**
- Modify: `src/styles.css` (eliminar reglas movidas a `wallet.css`)

> Las reglas de `#wallet-btn`, `.wallet-icon`, `#gallery-*`, `.gallery-*` y la variante `.overlay-modal--gallery` ahora viven en `wallet.css`. Hay que quitarlas de `styles.css` para no duplicar/colisionar. **Conservar** `.overlay-modal` base y las variantes `--countdown` y `--nft` (las usan los modales de completado y de premio, que siguen en el juego).

- [ ] **Step 1: Eliminar el bloque `#wallet-btn` y `.wallet-icon`**

En `src/styles.css`, eliminar las reglas `#wallet-btn { ... }` (≈ líneas 301-318) y `.wallet-icon { ... }` (≈ líneas 320-324). Buscar por selector exacto y borrar cada bloque completo `{ ... }`.

- [ ] **Step 2: Eliminar las reglas de galería**

En `src/styles.css`, eliminar los bloques completos de: `#gallery-empty`, `#gallery-grid`, `#gallery-grid[hidden]`, `.gallery-card`, `.gallery-card img`, `.gallery-card figcaption`, `.gallery-style`, `.gallery-count` (≈ líneas 450-512).

- [ ] **Step 3: Eliminar la variante de modal de galería**

En `src/styles.css`, eliminar el bloque `.overlay-modal--gallery { ... }` (≈ línea 214) y el bloque `#gallery-close-btn` si existe. **No** tocar `.overlay-modal`, `.overlay-modal--countdown`, `.overlay-modal--nft`.

- [ ] **Step 4: Verificar que no quedaron selectores de galería en styles.css**

Run: `grep -nE "wallet-btn|wallet-icon|gallery-(empty|grid|card|style|count|close)|overlay-modal--gallery" src/styles.css`
Expected: **sin coincidencias** (salida vacía).

- [ ] **Step 5: Commit**

```bash
git add src/styles.css
git commit -m "[Opus-4.8]: Mueve estilos de billetera/galería de styles.css a wallet.css"
```

---

## Task 5: Mover el juego Sistema Solar a `src/juegos/sistema-solar/`

**Files:**
- Move: `src/main.js` → `src/juegos/sistema-solar/main.js`
- Move: `src/ar/` → `src/juegos/sistema-solar/ar/`
- Move: `src/game/` → `src/juegos/sistema-solar/game/`
- Move: `src/ui/` → `src/juegos/sistema-solar/ui/`
- Move: `src/config/` → `src/juegos/sistema-solar/config/`
- Modify: `src/juegos/sistema-solar/main.js` (imports, wallet, award por juego, sin close)
- Modify: `src/juegos/sistema-solar/ui/overlay.js` (quitar wallet/gallery/close)

- [ ] **Step 1: Mover los archivos con git**

```bash
mkdir -p src/juegos/sistema-solar
git mv src/ar src/juegos/sistema-solar/ar
git mv src/game src/juegos/sistema-solar/game
git mv src/ui src/juegos/sistema-solar/ui
git mv src/config src/juegos/sistema-solar/config
git mv src/main.js src/juegos/sistema-solar/main.js
```

- [ ] **Step 2: Arreglar imports en `main.js` (gallery a shared, agregar wallet)**

En `src/juegos/sistema-solar/main.js`, reemplazar la línea de import de la galería:

```js
import { awardRandomNft, getGallerySummary } from "./nft/gallery.js";
```

por:

```js
import { awardRandomNft } from "../../shared/nft/gallery.js";
import { createWallet } from "../../shared/ui/wallet.js";
```

> Los demás imports (`./ar/scene.js`, `./game/dragdrop.js`, `./game/state.js`, `./ui/overlay.js`, `./config/app-config.js`) **no cambian**: esas carpetas se movieron junto a `main.js`.

- [ ] **Step 3: Quitar `onClose`/`RETURN_URL` y el push manual de galería; crear la billetera**

En `src/juegos/sistema-solar/main.js`, reemplazar el bloque de creación del overlay (≈ líneas 43-56):

```js
const overlay = createOverlay({
  labels: gameState.labels,
  onRetry: () => window.location.reload(),
  onClose: () => {
    window.location.href = RETURN_URL;
  },
  onDownload: (imageSrc) => {
    downloadNftImage(imageSrc);
  }
});
overlay.setGalleryItems(getGallerySummary());

overlay.setProgress(gameState.correctCount, gameState.totalCount);
overlay.setStatus(APP_CONFIG.autoStartStatusText, false);
```

por:

```js
const overlay = createOverlay({
  labels: gameState.labels,
  onRetry: () => window.location.reload(),
  onDownload: (imageSrc) => {
    downloadNftImage(imageSrc);
  }
});
const wallet = createWallet();

overlay.setProgress(gameState.correctCount, gameState.totalCount);
overlay.setStatus(APP_CONFIG.autoStartStatusText, false);
```

- [ ] **Step 4: Quitar la constante `RETURN_URL` ya sin uso**

En `src/juegos/sistema-solar/main.js`, eliminar la línea:

```js
const RETURN_URL = APP_CONFIG.returnUrl;
```

(El enlace a Canva ahora vive en `CANVA_URL` de `shared/games.js`, usado por el catálogo en la Task 7. `APP_CONFIG.returnUrl` en `app-config.js` queda sin uso; se puede dejar como está.)

- [ ] **Step 5: Otorgar el premio con el `gameId` del juego y refrescar la billetera**

En `src/juegos/sistema-solar/main.js`, reemplazar (≈ líneas 1051-1053):

```js
    const awardedNft = awardRandomNft();
    overlay.setGalleryItems(getGallerySummary());
    overlay.showNftPopup(awardedNft.imageSrc, awardedNft.styleName);
```

por:

```js
    const awardedNft = awardRandomNft("sistema-solar");
    wallet.refresh();
    overlay.showNftPopup(awardedNft.imageSrc, awardedNft.styleName);
```

- [ ] **Step 6: Quitar wallet/gallery/close de `overlay.js`**

En `src/juegos/sistema-solar/ui/overlay.js`:

(a) Cambiar la firma para quitar `onClose`:

```js
export const createOverlay = ({ labels, onRetry, onClose, onDownload }) => {
```
→
```js
export const createOverlay = ({ labels, onRetry, onDownload }) => {
```

(b) Eliminar estas referencias DOM (≈ líneas 13-26), dejando solo las del juego:

Eliminar las líneas que declaran: `closeBtn`, `walletBtn`, `galleryModal`, `galleryGrid`, `galleryEmpty`, `galleryCloseBtn`.

(c) Eliminar la variable `let galleryItems = [];`.

(d) Eliminar el listener del botón cerrar:

```js
  closeBtn.addEventListener("click", onClose);
```

(e) Eliminar las funciones completas `renderGallery`, `openGallery`, `closeGallery`, y los bloques de listeners del `walletBtn`, `galleryCloseBtn`, `galleryModal` y el `keydown` de Escape (≈ líneas 40-120).

(f) Eliminar el método `setGalleryItems` del objeto retornado (≈ líneas 206-218), incluida la coma previa.

> **Resultado:** `overlay.js` conserva labels, status, progress, stamps, `showIncorrect`, `showCompletionCountdown`, `updateCompletionCountdown`, `showNftPopup`. Ya no toca wallet ni galería ni el botón cerrar.

- [ ] **Step 7: Verificar sintaxis de los dos archivos editados**

Run: `node --check src/juegos/sistema-solar/main.js && node --check src/juegos/sistema-solar/ui/overlay.js`
Expected: sin salida (OK).

Run: `grep -nE "getGallerySummary|setGalleryItems|RETURN_URL|onClose|closeBtn|walletBtn|galleryModal" src/juegos/sistema-solar/main.js src/juegos/sistema-solar/ui/overlay.js`
Expected: **sin coincidencias** (salida vacía).

- [ ] **Step 8: Commit**

```bash
git add src/juegos/sistema-solar
git commit -m "[Opus-4.8]: Mueve juego Sistema Solar a src/juegos/ y usa billetera compartida"
```

---

## Task 6: Página del juego Sistema Solar (`juegos/sistema-solar/index.html`)

**Files:**
- Create: `juegos/sistema-solar/index.html` (markup AR movido desde `index.html`, con ajustes)

> Se toma el `<body>` actual de `index.html` (la escena AR), se ajustan las rutas de `<script>`/`<link>`, se **quita el botón "Cerrar sitio"**, se **agrega el botón «‹ Volver»**, y se enlaza `wallet.css`.

- [ ] **Step 1: Crear `juegos/sistema-solar/index.html`**

Crear el archivo con exactamente este contenido (es el `index.html` actual con: `<link>` a `wallet.css` añadido; `src="/src/juegos/sistema-solar/main.js"`; botón «‹ Volver» nuevo; sin el botón `#close-btn`):

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Sistema Solar AR — Academia Virtualis</title>
    <link rel="stylesheet" href="/src/styles.css" />
    <link rel="stylesheet" href="/src/shared/ui/wallet.css" />
    <script src="/vendor/aframe/aframe.min.js"></script>
    <script src="/vendor/mindar/mindar-image-aframe.prod.js"></script>
  </head>
  <body>
    <div id="app-shell">
      <a-scene
        id="ar-scene"
        mindar-image="imageTargetSrc: /assets/targets/marker-sistema-solar.mind; autoStart: false; maxTrack: 1; missTolerance: 10; warmupTolerance: 6; filterMinCF: 0.0001; filterBeta: 0.001; uiLoading: no; uiScanning: no;"
        color-space="sRGB"
        renderer="colorManagement: true, physicallyCorrectLights"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
        embedded
      >
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity id="target-root" mindar-image-target="targetIndex: 0"></a-entity>
      </a-scene>

      <a href="/" id="back-to-catalog" class="back-to-catalog" aria-label="Volver al catálogo de juegos">‹ Volver</a>

      <div id="hud" aria-live="polite">
        <div id="status-pill">Iniciando cámara AR...</div>
        <div id="progress-pill">Aciertos: 0/9</div>
      </div>

      <div id="labels-layer" aria-label="Etiquetas de planetas"></div>
      <div id="stamp-layer" aria-hidden="true"></div>
      <canvas id="confetti-layer" aria-hidden="true" hidden></canvas>
      <section id="controls-panel" class="controls-panel" hidden>
        <div class="controls-section">
          <h3 class="controls-section-title">Configuración</h3>
          <label for="zoom-range">Zoom sistema solar</label>
          <input id="zoom-range" type="range" min="0.1" max="8" step="0.01" value="1.5" />
          <span id="zoom-value">1.50x</span>
          <label for="orbit-range">Tamaño de órbitas</label>
          <input id="orbit-range" type="range" min="2" max="5" step="0.05" value="2.5" />
          <span id="orbit-value">2.50x</span>
          <label for="planet-range">Tamaño de planetas</label>
          <input id="planet-range" type="range" min="0.5" max="3" step="0.05" value="1" />
          <span id="planet-value">1.00x</span>
          <label for="speed-range">Velocidad de órbita</label>
          <input id="speed-range" type="range" min="0" max="3" step="0.05" value="0.7" />
          <span id="speed-value">0.70x</span>
        </div>
        <div id="rotation-section" class="controls-section">
          <h3 class="controls-section-title">Rotación</h3>
          <label for="rotation-x-range">Rotación X</label>
          <input id="rotation-x-range" type="range" min="-180" max="180" step="1" value="-4" />
          <span id="rotation-x-value" class="rotation-value">-4°</span>
          <label for="rotation-y-range">Rotación Y</label>
          <input id="rotation-y-range" type="range" min="-180" max="180" step="1" value="0" />
          <span id="rotation-y-value" class="rotation-value">0°</span>
          <label for="rotation-z-range">Rotación Z</label>
          <input id="rotation-z-range" type="range" min="-180" max="180" step="1" value="0" />
          <span id="rotation-z-value" class="rotation-value">0°</span>
        </div>
        <button id="reset-controls-btn" class="controls-reset-btn" type="button">Reset sliders</button>
      </section>

      <button
        id="controls-toggle"
        class="controls-toggle"
        type="button"
        aria-label="Expandir panel de controles"
        aria-expanded="false"
        hidden
      >
        &#9776;
      </button>

      <button id="wallet-btn" type="button" aria-label="Abrir galería de NFTs">
        <svg class="wallet-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M3 7.5A2.5 2.5 0 0 1 5.5 5h12A2.5 2.5 0 0 1 20 7.5V9h1.5A1.5 1.5 0 0 1 23 10.5v5a1.5 1.5 0 0 1-1.5 1.5H20v1.5a2.5 2.5 0 0 1-2.5 2.5h-12A2.5 2.5 0 0 1 3 18.5v-11ZM20 15h1v-4h-1a2 2 0 0 0 0 4Zm-2-8H5.5a.5.5 0 0 0 0 1H18V7Zm0 3H5v8.5a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V17h-1a4 4 0 1 1 0-8h1v-.5A.5.5 0 0 0 18 10Z"
          />
        </svg>
      </button>

      <section id="camera-gate" hidden>
        <h2>Actividad AR</h2>
        <p id="camera-gate-text">Iniciando camara AR automaticamente...</p>
        <button id="start-ar-btn" type="button">Iniciar camara AR</button>
        <p id="camera-debug" aria-live="polite"></p>
      </section>

      <div id="version-counter" aria-live="polite"></div>

      <section id="completion-modal" class="overlay-modal overlay-modal--countdown" hidden>
        <h1>Actividad completada</h1>
        <p id="completion-message"></p>
        <p id="completion-countdown">Mostrando NFT en <span id="completion-countdown-value">5</span>s</p>
      </section>

      <section id="nft-modal" class="overlay-modal overlay-modal--nft" hidden>
        <h1>NFT asignado</h1>
        <figure id="nft-figure" hidden>
          <img id="nft-image" alt="NFT ganado" />
          <figcaption id="nft-style-name">Estilo desconocido</figcaption>
        </figure>
        <div id="action-buttons" hidden>
          <button id="download-btn" type="button">Descargar NFT</button>
          <button id="retry-btn" type="button">Volver a intentar</button>
        </div>
      </section>

      <section id="gallery-modal" class="overlay-modal overlay-modal--gallery" hidden>
        <h1>Mi galería NFT</h1>
        <p id="gallery-empty" hidden>Aún no has ganado NFTs. Completa una actividad para obtener uno.</p>
        <div id="gallery-grid" hidden></div>
        <button id="gallery-close-btn" type="button">Cerrar galería</button>
      </section>
    </div>

    <script type="module" src="/src/juegos/sistema-solar/main.js"></script>
  </body>
</html>
```

> Nota: se mantiene `class="overlay-modal overlay-modal--gallery"` en `#gallery-modal` por compatibilidad de markup, pero su estilo real viene de `wallet.css` (que define `#gallery-modal` por id). La variante `--gallery` ya no existe en CSS y es inerte.

- [ ] **Step 2: Agregar el estilo del botón «‹ Volver» a `src/styles.css`**

Añadir al final de `src/styles.css`:

```css
.back-to-catalog {
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  left: max(12px, env(safe-area-inset-left));
  z-index: 70;
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(122, 158, 219, 0.72);
  background: rgba(16, 41, 87, 0.92);
  color: #f4f8ff;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}
```

- [ ] **Step 3: Verificar que el HTML referencia las rutas correctas**

Run: `grep -nE "main.js|wallet.css|close-btn|back-to-catalog" juegos/sistema-solar/index.html`
Expected: aparece `/src/juegos/sistema-solar/main.js`, `/src/shared/ui/wallet.css`, `back-to-catalog`; **NO** aparece `close-btn`.

- [ ] **Step 4: Commit**

```bash
git add juegos/sistema-solar/index.html src/styles.css
git commit -m "[Opus-4.8]: Crea página del juego Sistema Solar con botón Volver y sin botón Cerrar"
```

---

## Task 7: Portada / catálogo (`index.html` + `src/catalogo/`)

**Files:**
- Modify: `index.html` (reemplazo total: ahora es el catálogo)
- Create: `src/catalogo/catalogo.js`
- Create: `src/catalogo/catalogo.css`

- [ ] **Step 1: Reemplazar `index.html` por la portada**

Sobrescribir `index.html` con exactamente:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Academia Virtualis — Juegos</title>
    <link rel="stylesheet" href="/src/catalogo/catalogo.css" />
    <link rel="stylesheet" href="/src/shared/ui/wallet.css" />
  </head>
  <body>
    <main id="catalog">
      <header class="catalog-header">
        <h1 class="catalog-title">Academia Virtualis</h1>
        <button id="wallet-btn" type="button" class="catalog-wallet" aria-label="Abrir galería de NFTs">
          <svg class="wallet-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 7.5A2.5 2.5 0 0 1 5.5 5h12A2.5 2.5 0 0 1 20 7.5V9h1.5A1.5 1.5 0 0 1 23 10.5v5a1.5 1.5 0 0 1-1.5 1.5H20v1.5a2.5 2.5 0 0 1-2.5 2.5h-12A2.5 2.5 0 0 1 3 18.5v-11ZM20 15h1v-4h-1a2 2 0 0 0 0 4Zm-2-8H5.5a.5.5 0 0 0 0 1H18V7Zm0 3H5v8.5a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V17h-1a4 4 0 1 1 0-8h1v-.5A.5.5 0 0 0 18 10Z"
            />
          </svg>
        </button>
      </header>

      <p class="catalog-subtitle">Elige un juego para empezar 🚀</p>
      <ul id="game-list" class="game-list"></ul>

      <footer class="catalog-footer">
        <a id="canva-link" class="canva-link" href="#" target="_blank" rel="noopener">Volver al sitio de Canva ↗</a>
      </footer>
    </main>

    <section id="gallery-modal" hidden>
      <h1>Mi galería NFT</h1>
      <p id="gallery-empty" hidden>Aún no has ganado NFTs. Completa una actividad para obtener uno.</p>
      <div id="gallery-grid" hidden></div>
      <button id="gallery-close-btn" type="button">Cerrar galería</button>
    </section>

    <script type="module" src="/src/catalogo/catalogo.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Crear `src/catalogo/catalogo.js`**

```js
import { GAMES, CANVA_URL } from "../shared/games.js";
import { createWallet } from "../shared/ui/wallet.js";

const gameList = document.querySelector("#game-list");
const canvaLink = document.querySelector("#canva-link");

const buildCard = (game) => {
  const item = document.createElement("li");
  item.className = `game-card game-card--${game.estado}`;

  const icon = document.createElement("span");
  icon.className = "game-icon";
  icon.style.background = game.color;
  icon.textContent = game.estado === "proximamente" ? "🔒" : game.emoji;

  const text = document.createElement("span");
  text.className = "game-text";
  const name = document.createElement("span");
  name.className = "game-name";
  name.textContent = game.estado === "proximamente" ? `${game.nombre} (Próximamente)` : game.nombre;
  const desc = document.createElement("span");
  desc.className = "game-desc";
  desc.textContent = game.descripcion;
  text.appendChild(name);
  text.appendChild(desc);

  if (game.estado === "disponible") {
    const link = document.createElement("a");
    link.className = "game-link";
    link.href = game.url;
    link.setAttribute("aria-label", `Jugar ${game.nombre}`);
    const go = document.createElement("span");
    go.className = "game-go";
    go.textContent = "›";
    link.appendChild(icon);
    link.appendChild(text);
    link.appendChild(go);
    item.appendChild(link);
  } else {
    item.setAttribute("aria-disabled", "true");
    item.appendChild(icon);
    item.appendChild(text);
  }

  return item;
};

GAMES.forEach((game) => gameList.appendChild(buildCard(game)));

if (canvaLink) {
  canvaLink.href = CANVA_URL;
}

createWallet();
```

> Nota: el enlace a Canva usa `CANVA_URL` de `shared/games.js` (módulo compartido), evitando que el catálogo dependa de la config del juego solar.

- [ ] **Step 3: Crear `src/catalogo/catalogo.css`**

```css
:root {
  --bg: #020611;
  --panel: rgba(7, 18, 41, 0.74);
  --text: #e7f1ff;
  --text-subtle: #bfd3ee;
  --accent: #ffd36a;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  min-height: 100%;
  background: radial-gradient(circle at 20% 20%, #12325f 0%, var(--bg) 55%);
  color: var(--text);
  font-family: "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
}

#catalog {
  max-width: 560px;
  margin: 0 auto;
  padding: max(20px, env(safe-area-inset-top)) 18px calc(80px + env(safe-area-inset-bottom));
}

.catalog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.catalog-title {
  font-size: clamp(20px, 6vw, 26px);
  margin: 8px 0;
}

.catalog-wallet {
  position: static;
  transform: none;
  flex: 0 0 auto;
}

.catalog-subtitle {
  color: var(--text-subtle);
  margin: 4px 0 18px;
}

.game-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.game-card {
  background: var(--panel);
  border: 1px solid rgba(122, 158, 219, 0.4);
  border-radius: 16px;
}

.game-card--proximamente {
  opacity: 0.5;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.game-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  text-decoration: none;
  color: inherit;
}

.game-icon {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  border-radius: 14px;
  display: grid;
  place-content: center;
  font-size: 28px;
}

.game-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.game-name {
  font-weight: 800;
  font-size: 15px;
}

.game-desc {
  font-size: 12px;
  color: var(--text-subtle);
}

.game-go {
  color: var(--accent);
  font-size: 22px;
  font-weight: 800;
}

.catalog-footer {
  margin-top: 28px;
  text-align: center;
}

.canva-link {
  color: var(--text-subtle);
  font-size: 13px;
  text-decoration: underline;
}
```

- [ ] **Step 4: Verificar sintaxis del JS del catálogo**

Run: `node --check src/catalogo/catalogo.js`
Expected: sin salida (OK).

- [ ] **Step 5: Commit**

```bash
git add index.html src/catalogo/catalogo.js src/catalogo/catalogo.css
git commit -m "[Opus-4.8]: Convierte index.html en portada/catálogo con enlace a Canva"
```

---

## Task 8: Página "Próximamente" de Operaciones (`juegos/operaciones/index.html`)

**Files:**
- Create: `juegos/operaciones/index.html`

- [ ] **Step 1: Crear `juegos/operaciones/index.html`**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Operaciones — Academia Virtualis</title>
    <link rel="stylesheet" href="/src/catalogo/catalogo.css" />
    <style>
      .soon-wrap {
        min-height: 100svh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 14px;
        padding: 24px;
      }
      .soon-emoji { font-size: 64px; }
      .soon-title { font-size: 24px; margin: 0; }
      .soon-text { color: var(--text-subtle); max-width: 28rem; margin: 0; }
      .soon-back {
        margin-top: 8px;
        display: inline-flex;
        align-items: center;
        min-height: 44px;
        padding: 10px 22px;
        border-radius: 999px;
        border: 1px solid rgba(122, 158, 219, 0.72);
        background: rgba(16, 41, 87, 0.92);
        color: #f4f8ff;
        font-weight: 700;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main class="soon-wrap">
      <div class="soon-emoji">🚧</div>
      <h1 class="soon-title">Operaciones — Próximamente</h1>
      <p class="soon-text">Este juego de matemáticas todavía está en construcción. ¡Vuelve pronto!</p>
      <a class="soon-back" href="/">‹ Volver al catálogo</a>
    </main>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add juegos/operaciones/index.html
git commit -m "[Opus-4.8]: Agrega página Próximamente del juego de Operaciones"
```

---

## Task 9: Configuración Vite multipágina + build verde

**Files:**
- Create: `vite.config.js`

- [ ] **Step 1: Crear `vite.config.js` con las 3 entradas**

```js
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const entry = (relativePath) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        catalogo: entry("./index.html"),
        sistemaSolar: entry("./juegos/sistema-solar/index.html"),
        operaciones: entry("./juegos/operaciones/index.html")
      }
    }
  }
});
```

- [ ] **Step 2: Construir todo el proyecto**

Run: `npm run build`
Expected: termina sin error. En la salida de Vite deben aparecer las 3 páginas emitidas: `dist/index.html`, `dist/juegos/sistema-solar/index.html`, `dist/juegos/operaciones/index.html`.

- [ ] **Step 3: Verificar los HTML emitidos**

Run: `ls dist/index.html dist/juegos/sistema-solar/index.html dist/juegos/operaciones/index.html`
Expected: los 3 archivos existen.

- [ ] **Step 4: Verificar que no quedan imports rotos a rutas viejas**

Run: `grep -rnE "from \"\.\./nft/|from \"\./nft/|src/main.js|src/ar/|src/ui/overlay" src juegos index.html | grep -v "juegos/sistema-solar"`
Expected: **sin coincidencias** (salida vacía) — ya no se referencian las rutas viejas.

- [ ] **Step 5: Commit**

```bash
git add vite.config.js
git commit -m "[Opus-4.8]: Configura Vite multipágina (catálogo + 2 juegos)"
```

---

## Task 10: Documentación y verificación final

**Files:**
- Modify: `CLAUDE.md` (Data Flow + estructura), `AGENTS.md` si aplica

- [ ] **Step 1: Actualizar `CLAUDE.md`**

En `CLAUDE.md`, sección **Architecture Overview / Data Flow**, reemplazar el diagrama de flujo de datos para reflejar la nueva estructura MPA: `index.html` = catálogo; juegos en `juegos/<id>/index.html` con código en `src/juegos/<id>/`; código común en `src/shared/` (`games.js`, `nft/gallery.js`, `ui/wallet.js`). Mencionar que el marcador `.mind` es compartido y que la cookie de premios es `av_nft_gallery_v3` (agrupada por `gameId`, con migración desde v2).

- [ ] **Step 2: Commit de docs**

```bash
git add CLAUDE.md
git commit -m "[Opus-4.8]: Actualiza CLAUDE.md con la arquitectura de catálogo MPA"
```

- [ ] **Step 3: Verificación manual en escritorio (`npm run dev`)**

Run: `npm run dev` y abrir el navegador en la URL que imprime.

Checklist:
- [ ] La portada `/` muestra 2 juegos: 🪐 Sistema Solar (activo) y ➗ Operaciones (atenuado, "Próximamente").
- [ ] El pie de la portada tiene el enlace a Canva y abre la URL de `APP_CONFIG.returnUrl`.
- [ ] El botón 🏆 abre la galería (vacía o con premios previos agrupados bajo "Sistema Solar").
- [ ] Tocar 🪐 navega a `/juegos/sistema-solar/`; el botón «‹ Volver» regresa a `/`.
- [ ] En el juego solar ya **no** existe el botón "Cerrar sitio" (sí "Descargar NFT" y "Volver a intentar").
- [ ] Tocar ➗ navega a `/juegos/operaciones/` (Próximamente); «‹ Volver al catálogo» regresa a `/`.

- [ ] **Step 4: Verificación de migración de premios**

Si hay un dispositivo/navegador con premios previos (cookie `av_nft_gallery_v2`), abrir la billetera y confirmar que esos NFTs aparecen agrupados bajo "Sistema Solar" (migración v2 → v3). Si no hay datos previos, marcar como N/A.

- [ ] **Step 5: Verificación en iOS Safari (vía `npm run dev:host` o `npm run tunnel`)**

Checklist (en iPhone/iPad):
- [ ] La portada abre rápido y sin pedir cámara.
- [ ] Al entrar al Sistema Solar, Safari pide permiso de cámara y el marcador se detecta.
- [ ] Arrastrar etiquetas funciona; completar 9/9 dispara confeti + cuenta regresiva + NFT.
- [ ] El NFT ganado aparece en la billetera bajo "Sistema Solar".
- [ ] «‹ Volver» regresa a la portada y la cámara se libera (no queda encendida).

> Si algún check de iOS falla, NO marcar la tarea como completa; depurar antes de cerrar.

---

## Self-Review (cobertura del spec)

- ✅ Portada lista de juegos (layout B) → Task 7
- ✅ Mover Sistema Solar a su carpeta → Tasks 5 y 6
- ✅ Botón «‹ Volver» en juegos → Tasks 6 y 8
- ✅ Página "Próximamente" de Operaciones → Task 8
- ✅ Código compartido `src/shared/` (games, gallery, wallet) → Tasks 1, 2, 3
- ✅ Billetera cookie v3 con `gameId` + migración desde v2 → Task 2
- ✅ Galería agrupada por juego, omitiendo juegos sin premios → Tasks 2 y 3
- ✅ `vite.config.js` multipágina → Task 9
- ✅ Quitar botón "Cerrar" del solar → Tasks 5 y 6
- ✅ Enlace a Canva al final del catálogo → Task 7
- ✅ Marcador AR compartido (mismo `.mind`) → Task 6 (sin cambios al marcador)
```
