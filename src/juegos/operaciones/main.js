import { generateOperation, generateOptions } from "./mathgen.js";
import { createOperacionesUI } from "./ui.js";
import { createScene3D } from "./scene3d.js";
import {
  isNoMarkerMode,
  pickRandomBackground,
  ZOOM_RANGE,
  getZoomFromCookie,
  saveZoomToCookie
} from "./config.js";

const ui = createOperacionesUI();
ui.mount();

const noMarker = isNoMarkerMode();

// ── Construcción de la escena A-Frame según el modo ──────────────────────────
// AR: escena con MindAR; el contenido 3D cuelga del marcador (#op-target).
// Sin marcador (?nomarker): escena plana; el contenido cuelga de un ancla fija
// frente a la cámara, con un fondo degradado detrás del lienzo transparente.
const buildScene = () => {
  const scene = document.createElement("a-scene");
  scene.id = "op-scene";
  scene.setAttribute("vr-mode-ui", "enabled: false");
  scene.setAttribute("device-orientation-permission-ui", "enabled: false");
  scene.setAttribute("renderer", "colorManagement: true; alpha: true");
  scene.setAttribute("embedded", "");

  const camera = document.createElement("a-camera");
  camera.setAttribute("position", "0 0 0");
  camera.setAttribute("look-controls", "enabled: false");
  camera.setAttribute("wasd-controls", "enabled: false");
  scene.appendChild(camera);

  const ambient = document.createElement("a-entity");
  ambient.setAttribute("light", "type: ambient; intensity: 0.95");
  scene.appendChild(ambient);
  const dir = document.createElement("a-entity");
  dir.setAttribute("light", "type: directional; intensity: 0.6");
  dir.setAttribute("position", "1 1 1");
  scene.appendChild(dir);

  let anchor;
  if (noMarker) {
    document.body.style.background = pickRandomBackground();
    anchor = document.createElement("a-entity");
    anchor.id = "op-anchor";
    anchor.setAttribute("position", "0 0 -1.8");
    scene.appendChild(anchor);
  } else {
    scene.setAttribute(
      "mindar-image",
      "imageTargetSrc: /assets/targets/marker-sistema-solar.mind; autoStart: false; maxTrack: 1; uiLoading: no; uiScanning: no;"
    );
    scene.setAttribute("color-space", "sRGB");
    anchor = document.createElement("a-entity");
    anchor.id = "op-target";
    anchor.setAttribute("mindar-image-target", "targetIndex: 0");
    scene.appendChild(anchor);
  }

  document.body.appendChild(scene);
  return { scene, anchor };
};

const { scene: sceneEl, anchor: anchorEl } = buildScene();

// Espera a que A-Frame cargue y haya cámara de render disponible.
const waitForScene = () =>
  new Promise((resolve) => {
    const ready = () => {
      const tick = () => {
        if (sceneEl.camera) {
          resolve();
        } else {
          setTimeout(tick, 60);
        }
      };
      tick();
    };
    if (sceneEl.hasLoaded) {
      ready();
    } else {
      sceneEl.addEventListener("loaded", ready, { once: true });
    }
  });

// ── Arranque de la cámara AR (solo modo marcador, tras gesto del usuario) ─────
const waitForMindarSystem = () =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      const system = sceneEl.systems && sceneEl.systems["mindar-image-system"];
      if (system) {
        resolve(system);
        return;
      }
      if (Date.now() - startedAt > 12000) {
        reject(new Error("MindAR no inició a tiempo"));
        return;
      }
      setTimeout(tick, 120);
    };
    if (sceneEl.hasLoaded) {
      tick();
    } else {
      sceneEl.addEventListener("loaded", tick, { once: true });
    }
  });

const startAr = async () => {
  try {
    const system = await waitForMindarSystem();
    await system.start();
  } catch (error) {
    console.warn("AR no disponible:", error);
  }
};

// ── Bucle del juego ──────────────────────────────────────────────────────────
const runGame = async (scene3d) => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const level = await ui.levelSelect();
    let inLevel = true;
    while (inLevel) {
      const operation = generateOperation(level);
      const options = generateOptions(operation);
      let sameOperation = true;
      while (sameOperation) {
        scene3d.showOperation(operation);
        await ui.showReady(operation);
        ui.clear();
        const { isCorrect } = await scene3d.playAnswer(operation, options);
        scene3d.clear();
        const action = await ui.showResult(isCorrect, operation.answer);
        ui.clear();
        if (action === "retry") {
          continue; // repetir la MISMA operación
        }
        sameOperation = false;
        if (action === "exit") {
          inLevel = false; // volver a la selección de nivel
        }
        // action === "again" → nueva operación, mismo nivel
      }
    }
  }
};

// ── Arranque ─────────────────────────────────────────────────────────────────
const boot = async () => {
  await waitForScene();
  const scene3d = createScene3D({ sceneEl, anchorEl });

  // Control de zoom (escala los objetos 3D), persistido en cookie.
  const initialZoom = getZoomFromCookie();
  scene3d.setScale(initialZoom);
  ui.mountZoom({
    value: initialZoom,
    min: ZOOM_RANGE.min,
    max: ZOOM_RANGE.max,
    step: ZOOM_RANGE.step,
    onInput: (n) => {
      scene3d.setScale(n);
      saveZoomToCookie(n);
    }
  });

  if (!noMarker) {
    // iOS Safari exige un gesto del usuario para encender la cámara: mostramos un botón.
    const startButton = document.createElement("button");
    startButton.id = "op-start-ar";
    startButton.type = "button";
    startButton.textContent = "▶ Iniciar cámara AR";
    startButton.addEventListener(
      "click",
      () => {
        startButton.remove();
        startAr();
      },
      { once: true }
    );
    document.body.appendChild(startButton);
  }

  runGame(scene3d);
};

boot();
