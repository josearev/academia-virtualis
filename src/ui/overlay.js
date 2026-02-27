import { OVERLAY_TEXTS } from "../config/app-config.js";

const STATUS_TRACKING = OVERLAY_TEXTS.tracking;
const STATUS_SCANNING = OVERLAY_TEXTS.scanning;

export const createOverlay = ({ labels, onRetry, onClose, onDownload }) => {
  const statusPill = document.querySelector("#status-pill");
  const progressPill = document.querySelector("#progress-pill");
  const labelsLayer = document.querySelector("#labels-layer");
  const stampLayer = document.querySelector("#stamp-layer");
  const completionModal = document.querySelector("#completion-modal");
  const completionCountdownValue = document.querySelector("#completion-countdown-value");
  const nftModal = document.querySelector("#nft-modal");
  const completionMessage = document.querySelector("#completion-message");
  const nftFigure = document.querySelector("#nft-figure");
  const nftImage = document.querySelector("#nft-image");
  const actionButtons = document.querySelector("#action-buttons");
  const retryBtn = document.querySelector("#retry-btn");
  const closeBtn = document.querySelector("#close-btn");
  const downloadBtn = document.querySelector("#download-btn");
  const walletBtn = document.querySelector("#wallet-btn");
  const galleryModal = document.querySelector("#gallery-modal");
  const galleryGrid = document.querySelector("#gallery-grid");
  const galleryEmpty = document.querySelector("#gallery-empty");
  const galleryCloseBtn = document.querySelector("#gallery-close-btn");

  const labelElements = new Map();
  let currentNftImageSrc = "";
  let galleryItems = [];

  retryBtn.addEventListener("click", onRetry);
  closeBtn.addEventListener("click", onClose);
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      onDownload?.(currentNftImageSrc);
    });
  }

  const renderGallery = () => {
    if (!galleryGrid || !galleryEmpty) {
      return;
    }

    const hasItems = galleryItems.length > 0;
    galleryEmpty.hidden = hasItems;
    galleryGrid.hidden = !hasItems;
    galleryGrid.replaceChildren();

    if (!hasItems) {
      return;
    }

    galleryItems.forEach((item) => {
      const card = document.createElement("figure");
      card.className = "gallery-card";

      const image = document.createElement("img");
      image.src = item.imageSrc;
      image.alt = "NFT ganado";

      const caption = document.createElement("figcaption");
      const count = document.createElement("span");
      count.className = "gallery-count";
      count.textContent = `x${item.count}`;
      caption.appendChild(count);

      card.appendChild(image);
      card.appendChild(caption);
      galleryGrid.appendChild(card);
    });
  };

  const openGallery = () => {
    if (!galleryModal) {
      return;
    }
    renderGallery();
    galleryModal.hidden = false;
  };

  const closeGallery = () => {
    if (!galleryModal) {
      return;
    }
    galleryModal.hidden = true;
  };

  if (walletBtn) {
    walletBtn.addEventListener("click", () => {
      if (galleryModal && !galleryModal.hidden) {
        closeGallery();
        return;
      }
      openGallery();
    });
  }

  if (galleryCloseBtn) {
    galleryCloseBtn.addEventListener("click", closeGallery);
  }

  if (galleryModal) {
    galleryModal.addEventListener("click", (event) => {
      if (event.target === galleryModal) {
        closeGallery();
      }
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeGallery();
    }
  });

  labels.forEach((label) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "planet-label";
    element.textContent = label.text;
    element.dataset.id = label.id;
    labelsLayer.appendChild(element);
    labelElements.set(label.id, element);
  });

  return {
    getLabelElement(labelId) {
      return labelElements.get(labelId);
    },
    setStatus(text, tracking = false) {
      statusPill.textContent = text;
      statusPill.classList.toggle("lost", !tracking);
    },
    setDefaultStatus(isTracking) {
      this.setStatus(isTracking ? STATUS_TRACKING : STATUS_SCANNING, isTracking);
    },
    setProgress(correctCount, totalCount) {
      progressPill.textContent = `Aciertos: ${correctCount}/${totalCount}`;
    },
    renderLabel(label, x, y, visible) {
      const element = labelElements.get(label.id);
      if (!element) {
        return;
      }

      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.opacity = visible ? "1" : "0";
      element.style.visibility = visible ? "visible" : "hidden";
      element.classList.toggle("dragging", label.dragging);
      element.classList.toggle("locked", label.locked);
      if (!visible) {
        element.classList.remove("incorrect");
      }
    },
    showIncorrect(labelId) {
      const element = labelElements.get(labelId);
      if (!element) {
        return;
      }
      element.classList.remove("incorrect");
      window.requestAnimationFrame(() => {
        element.classList.add("incorrect");
      });
      setTimeout(() => {
        element.classList.remove("incorrect");
      }, 320);
    },
    showStamp(x, y) {
      const stamp = document.createElement("div");
      stamp.className = "stamp";
      stamp.textContent = "✓";
      stamp.style.left = `${x}px`;
      stamp.style.top = `${y}px`;
      stampLayer.appendChild(stamp);
      setTimeout(() => stamp.remove(), 750);
    },
    showCompletionCountdown(messageText, secondsLeft) {
      completionModal.hidden = false;
      nftModal.hidden = true;
      completionMessage.textContent = messageText;
      completionCountdownValue.textContent = String(secondsLeft);
    },
    updateCompletionCountdown(secondsLeft) {
      completionCountdownValue.textContent = String(secondsLeft);
    },
    showNftPopup(imageSrc) {
      completionModal.hidden = true;
      nftModal.hidden = false;
      nftFigure.hidden = true;
      actionButtons.hidden = true;
      currentNftImageSrc = imageSrc;
      nftImage.src = imageSrc;
      nftFigure.hidden = false;
      actionButtons.hidden = false;
    },
    setGalleryItems(items) {
      const nextItems = Array.isArray(items) ? items : [];
      galleryItems = nextItems
        .filter((item) => item && typeof item.imageSrc === "string")
        .map((item) => ({
          imageSrc: item.imageSrc,
          count: Number.isFinite(Number(item.count)) && Number(item.count) > 0 ? Math.floor(Number(item.count)) : 1
        }));
      renderGallery();
    }
  };
};
