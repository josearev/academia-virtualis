import { createSolarSystemScene } from "./ar/scene.js";
import { createDragController } from "./game/dragdrop.js";
import { createGameState, findLabel, PLANETS } from "./game/state.js";
import { awardRandomNft } from "./nft/gallery.js";
import { createOverlay } from "./ui/overlay.js";

const SUCCESS_TEXT =
  "Felicidades! Has completado la actividad. Ahora has ganado 1 NFT que será guardado en tu NFT gallery";
const RETURN_URL = "https://xerticagrupoacererobdr.my.canva.site/c1fncgdhef8bcwqy";
const SNAP_DISTANCE = 86;

const gameState = createGameState();
const overlay = createOverlay({
  labels: gameState.labels,
  onRetry: () => window.location.reload(),
  onClose: () => {
    window.location.href = RETURN_URL;
  }
});

overlay.setProgress(gameState.correctCount, gameState.totalCount);
overlay.setStatus("Solicitando permisos de cámara...", false);

const sceneEl = document.querySelector("#ar-scene");
const targetEl = document.querySelector("#target-root");

const solarScene = createSolarSystemScene({
  targetEl,
  planets: PLANETS
});

let arCamera = null;
let latestPositions = {};
let completionTimerId = null;
let nftTimerId = null;

const dragController = createDragController({
  canDrag: (labelId) => {
    const label = findLabel(gameState, labelId);
    return Boolean(label && !label.locked && gameState.markerVisible && !gameState.completed);
  },
  onDragStart: (labelId, x, y) => {
    const label = findLabel(gameState, labelId);
    if (!label) {
      return;
    }
    label.dragging = true;
    label.pointerX = x;
    label.pointerY = y;
  },
  onDragMove: (labelId, x, y) => {
    const label = findLabel(gameState, labelId);
    if (!label) {
      return;
    }
    label.pointerX = x;
    label.pointerY = y;
  },
  onDragEnd: (labelId, x, y) => {
    const label = findLabel(gameState, labelId);
    if (!label) {
      return;
    }

    label.dragging = false;

    if (x === null || y === null || !gameState.markerVisible || gameState.completed) {
      return;
    }

    const nearest = findNearestPlanet(x, y, latestPositions);
    if (!nearest || nearest.distance > SNAP_DISTANCE) {
      overlay.showIncorrect(label.id);
      return;
    }

    if (nearest.id === label.id) {
      if (label.locked) {
        return;
      }

      label.locked = true;
      label.displayPlanetId = label.id;
      gameState.correctCount += 1;
      overlay.showStamp(nearest.x, nearest.y);
      overlay.setProgress(gameState.correctCount, gameState.totalCount);

      if (gameState.correctCount === gameState.totalCount) {
        completeActivity();
      }
      return;
    }

    overlay.showIncorrect(label.id);
  }
});

gameState.labels.forEach((label) => {
  const labelElement = overlay.getLabelElement(label.id);
  dragController.bind(labelElement, label.id);
});

const updateLoop = (timeMs) => {
  const timeSeconds = timeMs / 1000;
  solarScene.update(timeSeconds);

  if (arCamera) {
    latestPositions = solarScene.getScreenPositions(arCamera, window.innerWidth, window.innerHeight);
    renderLabels();
  }

  window.requestAnimationFrame(updateLoop);
};

sceneEl.addEventListener("arReady", () => {
  overlay.setStatus("Buscando marcador. Apunta la cámara al logo de Eight Academy.", false);
});

sceneEl.addEventListener("arError", () => {
  overlay.setStatus("No fue posible acceder a la cámara. Revisa permisos e intenta nuevamente.", false);
});

targetEl.addEventListener("targetFound", () => {
  gameState.markerVisible = true;
  overlay.setDefaultStatus(true);
});

targetEl.addEventListener("targetLost", () => {
  gameState.markerVisible = false;
  overlay.setDefaultStatus(false);
});

sceneEl.addEventListener("renderstart", () => {
  arCamera = sceneEl.camera;
  window.requestAnimationFrame(updateLoop);
});

const renderLabels = () => {
  gameState.labels.forEach((label) => {
    let x = label.pointerX;
    let y = label.pointerY;
    let visible = false;

    if (label.dragging) {
      visible = true;
    } else {
      const anchor = latestPositions[label.displayPlanetId];
      if (anchor && gameState.markerVisible && anchor.visible) {
        x = anchor.x;
        y = anchor.y - 44;
        visible = true;
      }
    }

    overlay.renderLabel(label, x, y, visible);
  });
};

const findNearestPlanet = (x, y, positions) => {
  let nearest = null;

  Object.values(positions).forEach((position) => {
    if (!position.visible) {
      return;
    }

    const dx = position.x - x;
    const dy = position.y - y;
    const distance = Math.hypot(dx, dy);

    if (!nearest || distance < nearest.distance) {
      nearest = {
        ...position,
        distance
      };
    }
  });

  return nearest;
};

const completeActivity = () => {
  if (gameState.completed) {
    return;
  }

  gameState.completed = true;
  dragController.setEnabled(false);
  overlay.showCompletionMessage(SUCCESS_TEXT);

  completionTimerId = window.setTimeout(() => {
    const nftImage = awardRandomNft();
    overlay.showNftResult(nftImage);
  }, 5000);
};

window.addEventListener("beforeunload", () => {
  if (completionTimerId) {
    clearTimeout(completionTimerId);
  }
  if (nftTimerId) {
    clearTimeout(nftTimerId);
  }
});
