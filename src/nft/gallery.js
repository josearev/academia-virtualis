const STORAGE_KEY = "academia_virtualis_gallery_v1";

const NFT_POOL = Array.from({ length: 10 }, (_, index) => `/assets/nfts/NFT-SistemaSolar-${index + 1}.png`);

const readStorage = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || { wonNfts: [], lastWonAt: null };
  } catch {
    return { wonNfts: [], lastWonAt: null };
  }
};

export const awardRandomNft = () => {
  const selected = NFT_POOL[Math.floor(Math.random() * NFT_POOL.length)];
  const gallery = readStorage();
  gallery.wonNfts.push(selected);
  gallery.lastWonAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery));
  return selected;
};
