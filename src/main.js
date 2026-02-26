import { createSolarSystemScene } from "./ar/scene.js";
import { createDragController } from "./game/dragdrop.js";
import { createGameState, findLabel, PLANETS } from "./game/state.js";
import { awardRandomNft } from "./nft/gallery.js";
import { createOverlay } from "./ui/overlay.js";

const SUCCESS_TEXT =
  "Felicidades! Has completado la actividad. Ahora has ganado 1 NFT que será guardado en tu NFT gallery";
const RETURN_URL = "https://xerticagrupoacererobdr.my.canva.site/c1fncgdhef8bcwqy";
const APP_VERSION = "0.10";
const SNAP_DISTANCE = 100;
const COMPLETION_COUNTDOWN_SECONDS = 5;
const CONFETTI_DURATION_MS = COMPLETION_COUNTDOWN_SECONDS * 1000;
const MINDAR_WAIT_TIMEOUT_MS = 12000;
const MINDAR_POLL_INTERVAL_MS = 120;
const IOS_RESIZE_DELAYS_MS = [0, 120, 320, 650];
const INSECURE_CONTEXT_TEXT =
  "Camara bloqueada por navegador: abre este sitio en HTTPS para usar AR en iPhone/iPad.";
const CONFETTI_COLORS = ["#ffde59", "#ff6b6b", "#4ecdc4", "#7f5af0", "#58a6ff", "#ff9f1c"];
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
overlay.setStatus("Iniciando camara AR automaticamente...", false);

const sceneEl = document.querySelector("#ar-scene");
const targetEl = document.querySelector("#target-root");
const cameraGate = document.querySelector("#camera-gate");
const cameraGateText = document.querySelector("#camera-gate-text");
const cameraDebug = document.querySelector("#camera-debug");
const startArButton = document.querySelector("#start-ar-btn");
const zoomControls = document.querySelector("#zoom-controls");
const zoomRange = document.querySelector("#zoom-range");
const zoomValue = document.querySelector("#zoom-value");
const orbitRange = document.querySelector("#orbit-range");
const orbitValue = document.querySelector("#orbit-value");
const planetRange = document.querySelector("#planet-range");
const planetValue = document.querySelector("#planet-value");
const speedRange = document.querySelector("#speed-range");
const speedValue = document.querySelector("#speed-value");
const debugHud = document.querySelector("#debug-hud");
const versionCounter = document.querySelector("#version-counter");
const confettiLayer = document.querySelector("#confetti-layer");

const solarScene = createSolarSystemScene({
  targetEl,
  planets: PLANETS
});

let arCamera = null;
let latestPositions = {};
let completionTimerId = null;
let completionCountdownIntervalId = null;
let confettiAnimationId = null;
let confettiStopTimerId = null;
let confettiPieces = [];
let arStarted = false;
let startInProgress = false;
let dragLockedByCompletion = false;
let pinchActive = false;
let pinchStartDistance = 0;
let pinchStartScale = 1;
let activeDragLabel = null;
const pinchPointers = new Map();
const confettiCtx = confettiLayer?.getContext("2d");

if (versionCounter) {
  versionCounter.textContent = `v${APP_VERSION}`;
}

const logStartup = (text) => {
  cameraDebug.textContent = text;
};

const setGateStatus = (text) => {
  cameraGateText.textContent = text;
  overlay.setStatus(text, false);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const resizeConfettiLayer = () => {
  if (!confettiLayer || !confettiCtx) {
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  confettiLayer.width = Math.floor(width * dpr);
  confettiLayer.height = Math.floor(height * dpr);
  confettiLayer.style.width = `${width}px`;
  confettiLayer.style.height = `${height}px`;
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

const createConfettiPiece = (startAtTop = true) => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    x: randomBetween(0, width),
    y: startAtTop ? randomBetween(-height, -10) : randomBetween(0, height),
    vx: randomBetween(-80, 80),
    vy: randomBetween(120, 260),
    gravity: randomBetween(240, 420),
    rotation: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-8, 8),
    size: randomBetween(5, 10),
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    opacity: randomBetween(0.75, 1)
  };
};

const recycleConfettiPiece = (piece) => {
  const recycled = createConfettiPiece(true);
  piece.x = recycled.x;
  piece.y = recycled.y;
  piece.vx = recycled.vx;
  piece.vy = recycled.vy;
  piece.gravity = recycled.gravity;
  piece.rotation = recycled.rotation;
  piece.spin = recycled.spin;
  piece.size = recycled.size;
  piece.color = recycled.color;
  piece.opacity = recycled.opacity;
};

const stopConfettiAnimation = () => {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  if (confettiStopTimerId) {
    clearTimeout(confettiStopTimerId);
    confettiStopTimerId = null;
  }
  if (confettiCtx && confettiLayer) {
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    confettiLayer.hidden = true;
  }
  confettiPieces = [];
};

const startConfettiAnimation = (durationMs = CONFETTI_DURATION_MS) => {
  if (!confettiLayer || !confettiCtx) {
    return;
  }

  stopConfettiAnimation();
  resizeConfettiLayer();
  confettiLayer.hidden = false;
  const pieceCount = Math.min(180, Math.max(90, Math.floor(window.innerWidth * 0.16)));
  confettiPieces = Array.from({ length: pieceCount }, () => createConfettiPiece(true));

  let lastTime = performance.now();
  const animate = (now) => {
    const deltaSec = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    confettiPieces.forEach((piece) => {
      piece.vy += piece.gravity * deltaSec;
      piece.x += piece.vx * deltaSec;
      piece.y += piece.vy * deltaSec;
      piece.rotation += piece.spin * deltaSec;

      const outOfBounds =
        piece.y - piece.size > window.innerHeight
        || piece.x < -piece.size * 2
        || piece.x > window.innerWidth + piece.size * 2;

      if (outOfBounds) {
        recycleConfettiPiece(piece);
      }

      confettiCtx.save();
      confettiCtx.translate(piece.x, piece.y);
      confettiCtx.rotate(piece.rotation);
      confettiCtx.globalAlpha = piece.opacity;
      confettiCtx.fillStyle = piece.color;
      confettiCtx.fillRect(-piece.size * 0.5, -piece.size * 0.5, piece.size, piece.size * 0.6);
      confettiCtx.restore();
    });

    confettiAnimationId = requestAnimationFrame(animate);
  };

  confettiAnimationId = requestAnimationFrame(animate);
  confettiStopTimerId = window.setTimeout(() => {
    stopConfettiAnimation();
  }, durationMs);
};

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

const { min: minOrbitScale, max: maxOrbitScale, initial: initialOrbitScale } = solarScene.getOrbitScaleRange();

orbitRange.min = String(minOrbitScale);
orbitRange.max = String(maxOrbitScale);
orbitRange.value = String(initialOrbitScale);

const updateOrbitUi = (scale) => {
  const fixed = scale.toFixed(2);
  orbitRange.value = fixed;
  orbitValue.textContent = `${fixed}x`;
};

const applyOrbitScale = (nextScale) => {
  const applied = solarScene.setOrbitScale(nextScale);
  updateOrbitUi(applied);
  return applied;
};

const { min: minPlanetScale, max: maxPlanetScale, initial: initialPlanetScale } = solarScene.getPlanetScaleRange();

planetRange.min = String(minPlanetScale);
planetRange.max = String(maxPlanetScale);
planetRange.value = String(initialPlanetScale);

const updatePlanetUi = (scale) => {
  const fixed = scale.toFixed(2);
  planetRange.value = fixed;
  planetValue.textContent = `${fixed}x`;
};

const applyPlanetScale = (nextScale) => {
  const applied = solarScene.setPlanetScale(nextScale);
  updatePlanetUi(applied);
  return applied;
};

const { min: minSpeedScale, max: maxSpeedScale, initial: initialSpeedScale } = solarScene.getOrbitSpeedRange();

speedRange.min = String(minSpeedScale);
speedRange.max = String(maxSpeedScale);
speedRange.value = String(initialSpeedScale);

const updateSpeedUi = (scale) => {
  const fixed = scale.toFixed(2);
  speedRange.value = fixed;
  speedValue.textContent = `${fixed}x`;
};

const applyOrbitSpeed = (nextScale) => {
  const applied = solarScene.setOrbitSpeed(nextScale);
  updateSpeedUi(applied);
  return applied;
};

const pointerDistance = ([first, second]) => {
  return Math.hypot(first.x - second.x, first.y - second.y);
};

applySolarScale(initialScale);
applyOrbitScale(initialOrbitScale);
applyPlanetScale(initialPlanetScale);
applyOrbitSpeed(initialSpeedScale);

const dragController = createDragController({
  canDrag: (labelId) => {
    const label = findLabel(gameState, labelId);
    const result = Boolean(label && !label.locked && gameState.markerVisible && !gameState.completed);
    console.log(`[drag] canDrag(${labelId}): ${result} | locked=${label?.locked} visible=${gameState.markerVisible} completed=${gameState.completed}`);
    return result;
  },
  onDragStart: (labelId, x, y) => {
    const label = findLabel(gameState, labelId);
    if (!label) {
      return;
    }
    activeDragLabel = labelId;
    label.dragging = true;
    label.pointerX = x;
    label.pointerY = y;
    solarScene.setOrbitPaused(true);
    console.log(`[drag] START ${labelId} @ (${x}, ${y})`);
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

    activeDragLabel = null;
    label.dragging = false;
    solarScene.setOrbitPaused(false);
    console.log(`[drag] END ${labelId} @ (${x}, ${y})`)

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

      const displacedLabel = gameState.labels.find(
        (l) => l !== label && !l.locked && !l.dragging && l.displayPlanetId === label.id
      );

      label.locked = true;
      label.displayPlanetId = label.id;
      gameState.correctCount += 1;
      overlay.showStamp(nearest.x, nearest.y);
      overlay.setProgress(gameState.correctCount, gameState.totalCount);

      if (displacedLabel) {
        displacedLabel.displayPlanetId = label.id;
      }

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

const startAr = async ({ manual = false } = {}) => {
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
    setGateStatus(
      manual
        ? "No se pudo iniciar AR. Toca de nuevo 'Iniciar camara AR'."
        : "No se pudo iniciar AR automaticamente. Toca 'Iniciar camara AR'."
    );
    logStartup(message);
  }
};

const onZoomSliderInput = (event) => {
  const nextScale = Number(event.currentTarget.value);
  applySolarScale(nextScale);
};

const onOrbitSliderInput = (event) => {
  applyOrbitScale(Number(event.currentTarget.value));
};

const onPlanetSliderInput = (event) => {
  applyPlanetScale(Number(event.currentTarget.value));
};

const onSpeedSliderInput = (event) => {
  applyOrbitSpeed(Number(event.currentTarget.value));
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
startArButton.addEventListener("click", () => {
  void startAr({ manual: true });
});
zoomRange.addEventListener("input", onZoomSliderInput);
orbitRange.addEventListener("input", onOrbitSliderInput);
planetRange.addEventListener("input", onPlanetSliderInput);
speedRange.addEventListener("input", onSpeedSliderInput);
window.addEventListener("resize", () => {
  scheduleIosResizes();
  resizeConfettiLayer();
});
window.addEventListener("orientationchange", () => {
  scheduleIosResizes();
  resizeConfettiLayer();
});
window.addEventListener("pointerdown", onPointerDown, { passive: true });
window.addEventListener("pointermove", onPointerMove, { passive: false });
window.addEventListener("pointerup", onPointerUp, { passive: true });
window.addEventListener("pointercancel", onPointerUp, { passive: true });

window.addEventListener("keydown", (event) => {
  if (event.key === "m" || event.key === "M") {
    gameState.markerVisible = !gameState.markerVisible;
    overlay.setDefaultStatus(gameState.markerVisible);
    console.log(`[DEBUG] markerVisible forzado → ${gameState.markerVisible}`);
  }
});

if (!isCameraContextAllowed()) {
  setGateStatus(INSECURE_CONTEXT_TEXT);
  startArButton.disabled = true;
  logStartup("Usa URL HTTPS para habilitar camara en iOS.");
} else if (!hasCameraApi()) {
  setGateStatus("Este navegador no expone la API de camara requerida para AR.");
  startArButton.disabled = true;
  logStartup("navigator.mediaDevices no disponible.");
} else {
  setGateStatus("Iniciando camara AR automaticamente...");
  window.setTimeout(() => {
    void startAr();
  }, 120);
}

const renderLabels = () => {
  const stackIndexByLabelId = new Map();
  const labelsByPlanet = new Map();

  gameState.labels.forEach((label) => {
    if (label.dragging || !gameState.markerVisible) {
      return;
    }

    const anchor = latestPositions[label.displayPlanetId];
    if (!anchor) {
      return;
    }

    if (!labelsByPlanet.has(label.displayPlanetId)) {
      labelsByPlanet.set(label.displayPlanetId, []);
    }
    labelsByPlanet.get(label.displayPlanetId).push(label);
  });

  labelsByPlanet.forEach((planetLabels) => {
    planetLabels.sort((a, b) => Number(b.locked) - Number(a.locked));
    planetLabels.forEach((label, index) => {
      stackIndexByLabelId.set(label.id, index);
    });
  });

  gameState.labels.forEach((label) => {
    let x = label.pointerX;
    let y = label.pointerY;
    let visible = false;

    if (label.dragging) {
      visible = true;
    } else {
      const anchor = latestPositions[label.displayPlanetId];
      if (anchor && gameState.markerVisible) {
        const zoomFactor = Math.sqrt(solarScene.getScale());
        const baseOffset = LABEL_OFFSET_BY_PLANET_ID[label.displayPlanetId] || 38;
        const stackIndex = stackIndexByLabelId.get(label.id) || 0;
        const stackSpacing = 34 * zoomFactor;
        x = anchor.x;
        y = anchor.y - baseOffset * zoomFactor + stackIndex * stackSpacing;
        visible = true;
      }
    }

    overlay.renderLabel(label, x, y, visible);
  });

  if (debugHud) {
    const visibleCount = gameState.labels.filter(l => !l.locked && latestPositions[l.displayPlanetId]).length;
    debugHud.textContent = `M:${gameState.markerVisible ? "✓" : "✗"} drag:${activeDragLabel || "--"} vis:${visibleCount}`;
  }
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

  if (completionTimerId) {
    clearTimeout(completionTimerId);
    completionTimerId = null;
  }
  if (completionCountdownIntervalId) {
    clearInterval(completionCountdownIntervalId);
    completionCountdownIntervalId = null;
  }

  gameState.completed = true;
  dragLockedByCompletion = true;
  dragController.setEnabled(false);
  startConfettiAnimation(CONFETTI_DURATION_MS);
  overlay.showCompletionCountdown(SUCCESS_TEXT, COMPLETION_COUNTDOWN_SECONDS);

  let secondsLeft = COMPLETION_COUNTDOWN_SECONDS;
  completionCountdownIntervalId = window.setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft <= 0) {
      clearInterval(completionCountdownIntervalId);
      completionCountdownIntervalId = null;
      return;
    }
    overlay.updateCompletionCountdown(secondsLeft);
  }, 1000);

  completionTimerId = window.setTimeout(() => {
    completionTimerId = null;
    if (completionCountdownIntervalId) {
      clearInterval(completionCountdownIntervalId);
      completionCountdownIntervalId = null;
    }
    const nftImage = awardRandomNft();
    overlay.showNftPopup(nftImage);
  }, COMPLETION_COUNTDOWN_SECONDS * 1000);
};

window.addEventListener("beforeunload", () => {
  if (completionTimerId) {
    clearTimeout(completionTimerId);
    completionTimerId = null;
  }
  if (completionCountdownIntervalId) {
    clearInterval(completionCountdownIntervalId);
    completionCountdownIntervalId = null;
  }
  stopConfettiAnimation();
});
