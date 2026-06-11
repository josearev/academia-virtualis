// ui.js — Capa DOM (HUD 2D) del Juego de Operaciones.
// Los menús (elegir nivel, botón "Listo" + ayuda visual, resultado) son DOM;
// el gameplay 3D (operación, bola de energía, esferas) lo maneja scene3d.js.
// API: createOperacionesUI() → { mount, levelSelect, showReady, showResult, clear }

import { LEVELS } from "./mathgen.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers DOM
// ─────────────────────────────────────────────────────────────────────────────

const el = (tag, cls = "", attrs = {}) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "text") { e.textContent = v; }
    else { e.setAttribute(k, v); }
  });
  return e;
};

// ─────────────────────────────────────────────────────────────────────────────
// Ayuda visual (cubitos) — niveles 1 y 2
// ─────────────────────────────────────────────────────────────────────────────

const renderHint = (hint) => {
  if (!hint) return null;

  const container = el("div", "op-hint");

  if (hint.kind === "add") {
    const groupA = el("div", "op-hint-group");
    for (let i = 0; i < hint.a; i += 1) groupA.appendChild(el("div", "op-cube"));
    const sign = el("span", "op-hint-sign", { text: "+" });
    const groupB = el("div", "op-hint-group");
    for (let i = 0; i < hint.b; i += 1) groupB.appendChild(el("div", "op-cube op-cube--b"));
    container.append(groupA, sign, groupB);
  } else if (hint.kind === "sub") {
    const group = el("div", "op-hint-group");
    for (let i = 0; i < hint.a; i += 1) {
      const cube = el("div", i >= hint.a - hint.b ? "op-cube op-cube--off" : "op-cube");
      group.appendChild(cube);
    }
    container.appendChild(group);
  } else if (hint.kind === "mul") {
    const group = el("div", "op-hint-group op-hint-group--grid");
    group.style.gridTemplateColumns = `repeat(${hint.b}, 12px)`;
    for (let i = 0; i < hint.a * hint.b; i += 1) group.appendChild(el("div", "op-cube"));
    container.appendChild(group);
  }

  return container;
};

// ─────────────────────────────────────────────────────────────────────────────
// Factory principal
// ─────────────────────────────────────────────────────────────────────────────

export const createOperacionesUI = () => {
  let root = null;
  let stage = null;     // overlay centrado (nivel / resultado)
  let readyWrap = null; // overlay inferior (ayuda + Listo)

  const mount = () => {
    if (document.getElementById("op-root")) {
      root = document.getElementById("op-root");
      stage = root.querySelector(".op-stage");
      return;
    }
    root = el("div", "", { id: "op-root" });
    const backLink = el("a", "back-to-catalog", { href: "/" });
    backLink.textContent = "‹ Volver";
    stage = el("div", "op-stage");
    root.appendChild(backLink);
    root.appendChild(stage);
    document.body.appendChild(root);
  };

  // Limpia todos los overlays (centro e inferior).
  const clear = () => {
    if (stage) {
      while (stage.firstChild) stage.removeChild(stage.firstChild);
    }
    if (readyWrap) {
      readyWrap.remove();
      readyWrap = null;
    }
  };

  // ── Elegir nivel ────────────────────────────────────────────────────────────
  const levelSelect = () => new Promise((resolve) => {
    mount();
    clear();

    const wrapper = el("div", "op-level-select");
    wrapper.appendChild(el("h2", "", { text: "Elige el nivel" }));

    const levelsRow = el("div", "op-levels");
    [1, 2, 3, 4].forEach((n) => {
      const cfg = LEVELS[n];
      const btn = el("button", "op-level-btn");
      btn.dataset.level = n;
      btn.appendChild(el("span", "lvl-num", { text: String(n) }));
      btn.appendChild(el("span", "lvl-age", { text: `~${cfg.age} años` }));
      btn.addEventListener("click", () => {
        levelsRow.querySelectorAll(".op-level-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        setTimeout(() => resolve(n), 120);
      });
      levelsRow.appendChild(btn);
    });

    wrapper.appendChild(levelsRow);
    wrapper.appendChild(el("p", "op-level-hint", { text: "Nivel 1 fácil · Nivel 4 difícil" }));
    stage.appendChild(wrapper);
  });

  // ── Listo (con ayuda visual) ─────────────────────────────────────────────────
  // La operación ya se ve en 3D; aquí solo mostramos la ayuda (niveles 1-2) y el botón.
  const showReady = (operation) => new Promise((resolve) => {
    mount();
    clear();

    readyWrap = el("div", "op-ready-wrap");

    if (operation.hintEnabled && operation.hint) {
      const hintEl = renderHint(operation.hint);
      if (hintEl) readyWrap.appendChild(hintEl);
    }

    const readyBtn = el("button", "op-ready-btn", { text: "⚡ Listo" });
    readyBtn.addEventListener("click", () => resolve(), { once: true });
    readyWrap.appendChild(readyBtn);

    root.appendChild(readyWrap);
  });

  // ── Control de zoom (siempre visible) ────────────────────────────────────────
  // Escala los objetos 3D, como el control del Sistema Solar. Persiste fuera (cookie).
  const mountZoom = ({ value, min, max, step, onInput }) => {
    mount();
    if (document.getElementById("op-zoom")) {
      return;
    }
    const panel = el("div", "op-zoom", { id: "op-zoom" });
    const label = el("span", "op-zoom-label", { text: "🔍 Zoom" });
    const slider = el("input", "op-zoom-range", {
      type: "range",
      min: String(min),
      max: String(max),
      step: String(step)
    });
    slider.value = String(value);
    const valueText = el("span", "op-zoom-value", { text: `${Number(value).toFixed(2)}x` });
    slider.addEventListener("input", () => {
      const n = Number(slider.value);
      valueText.textContent = `${n.toFixed(2)}x`;
      onInput(n);
    });
    panel.append(label, slider, valueText);
    root.appendChild(panel);
  };

  // ── Resultado ────────────────────────────────────────────────────────────────
  const showResult = (isCorrect, correctAnswer) => new Promise((resolve) => {
    mount();
    clear();

    const result = el("div", `op-result ${isCorrect ? "op-result--ok" : "op-result--bad"}`);

    const emoji = el("div", "op-result-emoji");
    emoji.textContent = isCorrect ? "🎉" : "❌";

    const msg = el("div", "op-msg");
    msg.textContent = isCorrect ? "¡Resultado correcto!" : `Casi… la respuesta era ${correctAnswer}`;

    const actions = el("div", "op-actions");
    if (isCorrect) {
      const againBtn = el("button", "op-action-btn", { text: "🔁 Otra operación" });
      const exitBtn = el("button", "op-action-btn", { text: "🚪 Salir" });
      againBtn.addEventListener("click", () => resolve("again"), { once: true });
      exitBtn.addEventListener("click", () => resolve("exit"), { once: true });
      actions.appendChild(againBtn);
      actions.appendChild(exitBtn);
    } else {
      const retryBtn = el("button", "op-action-btn", { text: "🔁 Repetir" });
      retryBtn.addEventListener("click", () => resolve("retry"), { once: true });
      actions.appendChild(retryBtn);
    }

    result.append(emoji, msg, actions);
    stage.appendChild(result);
  });

  return { mount, levelSelect, showReady, showResult, clear, mountZoom };
};
