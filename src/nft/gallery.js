const COOKIE_KEY = "av_nft_gallery_v2";
const COOKIE_MAX_AGE_DAYS = 180;
const LEGACY_STORAGE_KEY = "academia_virtualis_gallery_v1";

const NFT_POOL = Array.from({ length: 10 }, (_, index) => `/assets/nfts/NFT-SistemaSolar-${index + 1}.png`);
const EMPTY_GALLERY = { counts: {}, order: [], lastWonAt: null };

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

const normalizeState = (rawState) => {
  if (!rawState || typeof rawState !== "object") {
    return { ...EMPTY_GALLERY };
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

const readGalleryState = () => {
  const rawCookie = readCookieRaw(COOKIE_KEY);
  if (rawCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(rawCookie));
      return normalizeState(parsed);
    } catch {
      return { ...EMPTY_GALLERY };
    }
  }

  const migratedState = buildStateFromLegacyStorage();
  if (migratedState) {
    persistCookie(migratedState);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return normalizeState(migratedState);
  }

  return { ...EMPTY_GALLERY };
};

const persistGalleryState = (state) => {
  persistCookie(state);
};

export const getGallerySummary = () => {
  const state = readGalleryState();
  return state.order
    .filter((imageSrc) => state.counts[imageSrc] > 0)
    .map((imageSrc) => ({
      imageSrc,
      count: state.counts[imageSrc]
    }));
};

export const awardRandomNft = () => {
  const selected = NFT_POOL[Math.floor(Math.random() * NFT_POOL.length)];
  const state = readGalleryState();

  state.counts[selected] = (state.counts[selected] || 0) + 1;
  state.order = [selected, ...state.order.filter((imageSrc) => imageSrc !== selected)];
  state.lastWonAt = new Date().toISOString();

  persistGalleryState(state);
  return selected;
};
