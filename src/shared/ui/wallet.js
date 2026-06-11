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
