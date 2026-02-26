const STATUS_TRACKING = "Marcador detectado. Arrastra cada nombre al planeta correcto.";
const STATUS_SCANNING = "Buscando marcador. Apunta la cámara al marcador AR técnico.";

export const createOverlay = ({ labels, onRetry, onClose }) => {
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

  const labelElements = new Map();

  retryBtn.addEventListener("click", onRetry);
  closeBtn.addEventListener("click", onClose);

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
      nftImage.src = imageSrc;
      nftFigure.hidden = false;
      actionButtons.hidden = false;
    }
  };
};
