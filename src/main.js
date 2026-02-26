import { createSolarSystemScene } from "./ar/scene.js";
import { createDragController } from "./game/dragdrop.js";
import { createGameState, findLabel, PLANETS } from "./game/state.js";
import { awardRandomNft } from "./nft/gallery.js";
import { createOverlay } from "./ui/overlay.js";

const SUCCESS_TEXT =
  "Felicidades! Has completado la actividad. Ahora has ganado 1 NFT que será guardado en tu NFT gallery";
const RETURN_URL = "https://xerticagrupoacererobdr.my.canva.site/c1fncgdhef8bcwqy";
const SNAP_DISTANCE = 86;
const MINDAR_WAIT_TIMEOUT_MS = 12000;
const MINDAR_POLL_INTERVAL_MS = 120;
const IOS_RESIZE_DELAYS_MS = [0, 120, 320, 650];
const INSECURE_CONTEXT_TEXT =
  "Camara bloqueada por navegador: abre este sitio en HTTPS para usar AR en iPhone/iPad.";
const LABEL_OFFSET_BY_PLANET_ID = {
  mercurio: 30,
  venus: 34,
  tierra: 38,
  marte: 34,
  jupiter: 44,
  saturno: 42,
  urano: 38,
  neptuno: 38,
  pluton: 30
};

const gameState = createGameState();
const overlay = createOverlay({
  labels: gameState.labels,
  onRetry: () => window.location.reload(),
  onClose: () => {
    window.location.href = RETURN_URL;
  }
});

overlay.setProgress(gameState.correctCount, gameState.totalCount);
overlay.setStatus("Presiona 'Iniciar camara AR' para continuar.", false);

const sceneEl = document.querySelector("#ar-scene");
const targetEl = document.querySelector("#target-root");
const cameraGate = document.querySelector("#camera-gate");
const cameraGateText = document.querySelector("#camera-gate-text");
const cameraDebug = document.querySelector("#camera-debug");
const startArButton = document.querySelector("#start-ar-btn");
const zoomControls = document.querySelector("#zoom-controls");
const zoomRange = document.querySelector("#zoom-range");
const zoomValue = document.querySelector("#zoom-value");

const solarScene = createSolarSystemScene({
  targetEl,
  planets: PLANETS
});

let arCamera = null;
let latestPositions = {};
let completionTimerId = null;
let arStarted = false;
let startInProgress = false;
let dragLockedByCompletion = false;
let pinchActive = false;
let pinchStartDistance = 0;
let pinchStartScale = 1;
const pinchPointers = new Map();

const logStartup = (text) => {
  cameraDebug.textContent = text;
};

const setGateStatus = (text) => {
  cameraGateText.textContent = text;
  overlay.setStatus(text, false);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForSceneLoad = async (timeoutMs = MINDAR_WAIT_TIMEOUT_MS) => {
  if (sceneEl.hasLoaded) {
    return;
  }

  await new Promise((resolve, reject) => {
    const timerId = setTimeout(() => {
      sceneEl.removeEventListener("loaded", onLoad);
      reject(new Error("La escena A-Frame no termino de cargar."));
    }, timeoutMs);

    const onLoad = () => {
      clearTimeout(timerId);
      resolve();
    };

    sceneEl.addEventListener("loaded", onLoad, { once: true });
  });
};

const waitForMindarSystem = async (timeoutMs = MINDAR_WAIT_TIMEOUT_MS) => {
  await waitForSceneLoad(timeoutMs);

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const system = sceneEl.systems?.["mindar-image-system"];
    if (system && typeof system.start === "function") {
      return system;
    }
    await sleep(MINDAR_POLL_INTERVAL_MS);
  }

  throw new Error("El motor AR no se inicializo a tiempo.");
};

const syncArViewport = () => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  sceneEl.style.position = "fixed";
  sceneEl.style.left = "0px";
  sceneEl.style.top = "0px";
  sceneEl.style.width = `${viewportWidth}px`;
  sceneEl.style.height = `${viewportHeight}px`;

  const canvasEl = sceneEl.canvas;
  if (canvasEl) {
    canvasEl.style.position = "fixed";
    canvasEl.style.left = "0px";
    canvasEl.style.top = "0px";
    canvasEl.style.width = `${viewportWidth}px`;
    canvasEl.style.height = `${viewportHeight}px`;
  }

  const mindarSystem = sceneEl.systems?.["mindar-image-system"];
  const videoEl = mindarSystem?.video;
  if (videoEl) {
    videoEl.style.position = "fixed";
    videoEl.style.left = "0px";
    videoEl.style.top = "0px";
    videoEl.style.width = `${viewportWidth}px`;
    videoEl.style.height = `${viewportHeight}px`;
    videoEl.style.objectFit = "cover";
    videoEl.style.zIndex = "-2";
  }
};

const requestArResize = () => {
  const mindarSystem = sceneEl.systems?.["mindar-image-system"];
  if (mindarSystem && typeof mindarSystem._resize === "function") {
    try {
      mindarSystem._resize();
    } catch {
      // Best effort; keep fallback CSS sync.
    }
  }
  syncArViewport();
};

const scheduleIosResizes = () => {
  IOS_RESIZE_DELAYS_MS.forEach((delayMs) => {
    window.setTimeout(requestArResize, delayMs);
  });
};

const { min: minScale, max: maxScale, initial: initialScale } = solarScene.getScaleRange();

zoomRange.min = String(minScale);
zoomRange.max = String(maxScale);
zoomRange.value = String(initialScale);

const clampScale = (scale) => Math.min(maxScale, Math.max(minScale, scale));

const updateZoomUi = (scale) => {
  const fixed = scale.toFixed(2);
  zoomRange.value = fixed;
  zoomValue.textContent = `${fixed}x`;
};

const applySolarScale = (nextScale) => {
  const applied = solarScene.setScale(clampScale(nextScale));
  updateZoomUi(applied);
  return applied;
};

const pointerDistance = ([first, second]) => {
  return Math.hypot(first.x - second.x, first.y - second.y);
};

applySolarScale(initialScale);

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
  arStarted = true;
  startInProgress = false;
  cameraGate.classList.add("hidden");
  solarScene.setLayoutPreset("didactic");
  logStartup("Motor AR activo.");
  overlay.setStatus("Buscando marcador. Apunta la cámara al marcador AR técnico.", false);
  scheduleIosResizes();
});

sceneEl.addEventListener("arError", (event) => {
  arStarted = false;
  startInProgress = false;
  startArButton.disabled = false;
  const errorCode = event?.detail?.error || "ERROR_DESCONOCIDO";
  setGateStatus("No fue posible acceder a la cámara. Revisa permisos e intenta nuevamente.");
  logStartup(`Error AR: ${errorCode}`);
});

targetEl.addEventListener("targetFound", () => {
  gameState.markerVisible = true;
  overlay.setDefaultStatus(true);
  zoomControls.hidden = false;

  solarScene.setLayoutPreset("didactic");
  const fittedScale = solarScene.fitCorePlanetsToMarker();
  updateZoomUi(fittedScale);

  scheduleIosResizes();
});

targetEl.addEventListener("targetLost", () => {
  gameState.markerVisible = false;
  overlay.setDefaultStatus(false);
  zoomControls.hidden = true;
  pinchActive = false;
  pinchPointers.clear();
  if (!dragLockedByCompletion) {
    dragController.setEnabled(true);
  }
});

sceneEl.addEventListener("renderstart", () => {
  arCamera = sceneEl.camera;
  syncArViewport();
  window.requestAnimationFrame(updateLoop);
});

window.addEventListener("error", (event) => {
  const message = event?.message || "Error de ejecucion";
  logStartup(`JS: ${message}`);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason?.message || String(event?.reason || "Promesa rechazada");
  logStartup(`Promise: ${reason}`);
});

const isCameraContextAllowed = () => {
  if (window.isSecureContext) {
    return true;
  }
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
};

const hasCameraApi = () => {
  return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

const startAr = async () => {
  if (arStarted || startInProgress) {
    return;
  }

  if (!isCameraContextAllowed()) {
    setGateStatus(INSECURE_CONTEXT_TEXT);
    startArButton.disabled = true;
    logStartup("Bloqueado por contexto inseguro.");
    return;
  }

  if (!hasCameraApi()) {
    setGateStatus("Este navegador no expone la API de camara requerida para AR.");
    startArButton.disabled = true;
    logStartup("navigator.mediaDevices no disponible.");
    return;
  }

  startInProgress = true;
  startArButton.disabled = true;
  setGateStatus("Cargando motor AR...");
  logStartup("Esperando inicializacion de mindar-image-system.");
  syncArViewport();

  try {
    const arSystem = await waitForMindarSystem();
    setGateStatus("Motor AR listo. Solicitando permisos de cámara...");
    logStartup("Motor AR detectado, iniciando stream de camara.");

    await arSystem.start();
    scheduleIosResizes();
  } catch (error) {
    startInProgress = false;
    startArButton.disabled = false;
    const message = error?.message || "No se pudo inicializar AR.";
    setGateStatus("No se pudo iniciar AR. Toca de nuevo 'Iniciar camara AR'.");
    logStartup(message);
  }
};

const onZoomSliderInput = (event) => {
  const nextScale = Number(event.currentTarget.value);
  applySolarScale(nextScale);
};

const onPointerDown = (event) => {
  if (event.pointerType !== "touch" || !gameState.markerVisible || gameState.completed) {
    return;
  }

  pinchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pinchPointers.size !== 2) {
    return;
  }

  if (gameState.labels.some((label) => label.dragging)) {
    return;
  }

  pinchActive = true;
  const points = [...pinchPointers.values()];
  pinchStartDistance = pointerDistance(points);
  pinchStartScale = solarScene.getScale();
  if (!dragLockedByCompletion) {
    dragController.setEnabled(false);
  }
};

const onPointerMove = (event) => {
  if (!pinchPointers.has(event.pointerId)) {
    return;
  }

  pinchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (!pinchActive || pinchPointers.size < 2 || pinchStartDistance <= 0) {
    return;
  }

  event.preventDefault();
  const points = [...pinchPointers.values()];
  const ratio = pointerDistance(points) / pinchStartDistance;
  applySolarScale(pinchStartScale * ratio);
};

const onPointerUp = (event) => {
  if (!pinchPointers.has(event.pointerId)) {
    return;
  }

  pinchPointers.delete(event.pointerId);
  if (pinchActive && pinchPointers.size < 2) {
    pinchActive = false;
    if (!dragLockedByCompletion) {
      dragController.setEnabled(true);
    }
  }
};

syncArViewport();
startArButton.addEventListener("click", startAr);
zoomRange.addEventListener("input", onZoomSliderInput);
window.addEventListener("resize", scheduleIosResizes);
window.addEventListener("orientationchange", scheduleIosResizes);
window.addEventListener("pointerdown", onPointerDown, { passive: true });
window.addEventListener("pointermove", onPointerMove, { passive: false });
window.addEventListener("pointerup", onPointerUp, { passive: true });
window.addEventListener("pointercancel", onPointerUp, { passive: true });

if (!isCameraContextAllowed()) {
  setGateStatus(INSECURE_CONTEXT_TEXT);
  startArButton.disabled = true;
  logStartup("Usa URL HTTPS para habilitar camara en iOS.");
}

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
        const zoomFactor = Math.sqrt(solarScene.getScale());
        const baseOffset = LABEL_OFFSET_BY_PLANET_ID[label.displayPlanetId] || 38;
        x = anchor.x;
        y = anchor.y - baseOffset * zoomFactor;
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
  dragLockedByCompletion = true;
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
});
