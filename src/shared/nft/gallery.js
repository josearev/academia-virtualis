import { GAMES, getGameName } from "../games.js";

const COOKIE_KEY = "av_nft_gallery_v3";
const LEGACY_COOKIE_KEY_V2 = "av_nft_gallery_v2";
const COOKIE_MAX_AGE_DAYS = 180;
const LEGACY_STORAGE_KEY = "academia_virtualis_gallery_v1";
const UNKNOWN_STYLE_NAME = "Estilo desconocido";
const DEFAULT_GAME_ID = "sistema-solar";

const nftModules = import.meta.glob("../../../assets/nfts/*.{png,jpg,jpeg,webp,avif}", { eager: true });
const NFT_POOL = Object.keys(nftModules)
  .map((filePath) => filePath.split("/").pop())
  .filter((fileName) => Boolean(fileName))
  .map((fileName) => `/assets/nfts/${fileName}`)
  .sort((first, second) => first.localeCompare(second, "es", { numeric: true, sensitivity: "base" }));

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

const readCookieRaw = (key) => {
  const target = `${key}=`;
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (let index = 0; index < cookies.length; index += 1) {
    const item = cookies[index].trim();
    if (item.startsWith(target)) {
      return item.slice(target.length);
    }
  }
  return "";
};

const persistCookie = (state) => {
  const maxAgeSeconds = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  const payload = encodeURIComponent(JSON.stringify(state));
  document.cookie = `${COOKIE_KEY}=${payload}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
};

const extractStyleToken = (imageSrc) => {
  if (typeof imageSrc !== "string" || imageSrc.length === 0) {
    return "";
  }
  const fileName = imageSrc.split("/").pop() || "";
  const fileNameWithoutExt = fileName.replace(/\.[^.]+$/, "");
  const lastDashIndex = fileNameWithoutExt.lastIndexOf("-");
  if (lastDashIndex < 0 || lastDashIndex >= fileNameWithoutExt.length - 1) {
    return "";
  }
  return fileNameWithoutExt.slice(lastDashIndex + 1);
};

const normalizeStyleName = (token) => {
  if (!token) {
    return UNKNOWN_STYLE_NAME;
  }
  const withSpaces = token
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return withSpaces || UNKNOWN_STYLE_NAME;
};

export const getNftStyleName = (imageSrc) => {
  return normalizeStyleName(extractStyleToken(imageSrc));
};

const buildStateFromLegacyStorage = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null");
    if (!parsed || !Array.isArray(parsed.wonNfts) || parsed.wonNfts.length === 0) {
      return null;
    }

    const counts = {};
    const order = [];
    for (let index = parsed.wonNfts.length - 1; index >= 0; index -= 1) {
      const imageSrc = parsed.wonNfts[index];
      if (!NFT_POOL.includes(imageSrc)) {
        continue;
      }
      counts[imageSrc] = (counts[imageSrc] || 0) + 1;
      if (!order.includes(imageSrc)) {
        order.push(imageSrc);
      }
    }

    if (Object.keys(counts).length === 0) {
      return null;
    }

    return {
      counts,
      order,
      lastWonAt: typeof parsed.lastWonAt === "string" ? parsed.lastWonAt : null
    };
  } catch {
    return null;
  }
};

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

const persistGalleryState = (state) => {
  persistCookie(state);
};

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
