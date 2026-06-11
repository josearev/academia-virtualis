import { generateOperation, generateOptions } from "./mathgen.js";
import { createOperacionesUI } from "./ui.js";
import { isNoMarkerMode, pickRandomBackground } from "./config.js";

const ui = createOperacionesUI();
ui.mount();

const sceneEl = document.querySelector("#op-scene");

const syncArViewport = () => {
  if (!sceneEl) {
    return;
  }
  const fix = (el) => {
    if (!el) {
      return;
    }
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.width = "100vw";
    el.style.height = "100vh";
  };
  fix(sceneEl);
  fix(sceneEl.querySelector("canvas"));
  fix(sceneEl.querySelector("video"));
};

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
  if (!sceneEl) {
    return;
  }
  try {
    const system = await waitForMindarSystem();
    await system.start();
    sceneEl.addEventListener("renderstart", syncArViewport);
    syncArViewport();
    [0, 320, 650].forEach((delay) => setTimeout(syncArViewport, delay));
    window.addEventListener("resize", syncArViewport);
    window.addEventListener("orientationchange", syncArViewport);
  } catch (error) {
    console.warn("AR no disponible:", error);
  }
};

const runGame = async () => {
  // Bucle infinito del juego: elegir nivel → jugar operaciones → volver a niveles al salir.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const level = await ui.levelSelect();
    let inLevel = true;
    while (inLevel) {
      const operation = generateOperation(level);
      const options = generateOptions(operation);
      let sameOperation = true;
      while (sameOperation) {
        const { isCorrect } = await ui.playRound(operation, options);
        const action = await ui.showResult(isCorrect, operation.answer);
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

if (isNoMarkerMode()) {
  if (sceneEl) {
    sceneEl.style.display = "none"; // sin cámara en modo de prueba
  }
  ui.setBackground(pickRandomBackground());
} else {
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

runGame();
