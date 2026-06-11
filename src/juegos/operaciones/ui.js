// ui.js — Capa DOM del Juego de Operaciones.
// API: createOperacionesUI() → { mount, setBackground, levelSelect, playRound, showResult }
// Convenciones: ES modules, plain JS, 2-space indent, semicolons.

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

const clearStage = (stage) => {
  while (stage.firstChild) stage.removeChild(stage.firstChild);
};

// ─────────────────────────────────────────────────────────────────────────────
// Hint rendering
// ─────────────────────────────────────────────────────────────────────────────

const renderHint = (hint) => {
  if (!hint) return null;

  const container = el("div", "op-hint");

  if (hint.kind === "add") {
    // Grupo A (color principal)
    const groupA = el("div", "op-hint-group");
    for (let i = 0; i < hint.a; i += 1) {
      groupA.appendChild(el("div", "op-cube"));
    }
    // Signo +
    const sign = el("span", "op-hint-sign", { text: "+" });
    // Grupo B (segundo color)
    const groupB = el("div", "op-hint-group");
    for (let i = 0; i < hint.b; i += 1) {
      groupB.appendChild(el("div", "op-cube op-cube--b"));
    }
    container.append(groupA, sign, groupB);

  } else if (hint.kind === "sub") {
    // hint.a cubes, los últimos hint.b visualmente apagados
    const group = el("div", "op-hint-group");
    for (let i = 0; i < hint.a; i += 1) {
      const cube = el("div", i >= hint.a - hint.b ? "op-cube op-cube--off" : "op-cube");
      group.appendChild(cube);
    }
    container.appendChild(group);

  } else if (hint.kind === "mul") {
    // Grid de a × b cubes
    const group = el("div", "op-hint-group op-hint-group--grid");
    group.style.gridTemplateColumns = `repeat(${hint.b}, 12px)`;
    for (let i = 0; i < hint.a * hint.b; i += 1) {
      group.appendChild(el("div", "op-cube"));
    }
    container.appendChild(group);
  }

  return container;
};

// ─────────────────────────────────────────────────────────────────────────────
// Drag-and-drop con Pointer Events (igual al patrón de sistema-solar/dragdrop.js)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adjunta drag-to-ball en las esferas de opciones.
 * @param {HTMLElement[]} spheres - lista de .op-sphere
 * @param {HTMLElement}   ball    - .energy-ball
 * @param {Function}      onDrop  - (value: number, isCorrect: boolean) => void
 */
const attachDrag = (spheres, ball, onDrop) => {
  let active = null;    // { sphere, pointerId, origX, origY, value }
  let disabled = false;

  const getBallCenter = () => {
    const r = ball.getBoundingClientRect();
    return {
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      radius: r.width / 2,
    };
  };

  const getSphereCenter = (sphere) => {
    const r = sphere.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  };

  const resetSphere = (sphere) => {
    sphere.style.transform = "";
    sphere.style.left = "";
    sphere.style.top = "";
    sphere.classList.remove("dragging");
    sphere.classList.add("bounce-back");
    sphere.addEventListener("animationend", () => sphere.classList.remove("bounce-back"), { once: true });
  };

  const onPointerMove = (e) => {
    if (!active || e.pointerId !== active.pointerId) return;
    e.preventDefault();

    const dx = e.clientX - active.startX;
    const dy = e.clientY - active.startY;
    active.sphere.style.transform = `translate(${dx}px, ${dy}px) scale(1.18)`;

    // Feedback snap-target si cerca
    const { cx: bx, cy: by, radius: br } = getBallCenter();
    const sc = getSphereCenter(active.sphere);
    // Aproximación: usar posición del puntero para cálculo más estable
    const dist = Math.hypot(e.clientX - bx, e.clientY - by);
    if (dist < br + 30) {
      ball.classList.add("snap-target");
    } else {
      ball.classList.remove("snap-target");
    }
  };

  const finishDrag = (e, canceled = false) => {
    if (!active || e.pointerId !== active.pointerId) return;
    e.preventDefault();

    const { sphere, value } = active;
    const pointerId = active.pointerId;
    active = null;

    ball.classList.remove("snap-target");

    if (sphere.hasPointerCapture(pointerId)) {
      sphere.releasePointerCapture(pointerId);
    }

    if (canceled) {
      resetSphere(sphere);
      return;
    }

    // Comprobar si el centro de la esfera quedó dentro de ballRadius + 30
    const { cx: bx, cy: by, radius: br } = getBallCenter();
    const sc = getSphereCenter(sphere);
    const dist = Math.hypot(sc.cx - bx, sc.cy - by);

    if (dist < br + 30) {
      // Drop aceptado
      disabled = true;
      sphere.classList.remove("dragging");
      sphere.classList.add("accepted");
      onDrop(value);
    } else {
      resetSphere(sphere);
    }
  };

  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", (e) => finishDrag(e, false), { passive: false });
  window.addEventListener("pointercancel", (e) => finishDrag(e, true), { passive: false });

  spheres.forEach((sphere) => {
    const value = Number(sphere.dataset.value);
    sphere.addEventListener("pointerdown", (e) => {
      if (disabled || active) return;
      e.preventDefault();
      active = {
        sphere,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        value,
      };
      sphere.setPointerCapture(e.pointerId);
      sphere.classList.add("dragging");
    });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Factory principal
// ─────────────────────────────────────────────────────────────────────────────

export const createOperacionesUI = () => {
  let root = null;
  let stage = null;

  // ── mount ─────────────────────────────────────────────────────────────────

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

  // ── setBackground ─────────────────────────────────────────────────────────

  const setBackground = (cssBackground) => {
    if (!root) return;
    root.style.background = cssBackground;
  };

  // ── levelSelect ───────────────────────────────────────────────────────────

  const levelSelect = () => new Promise((resolve) => {
    mount();
    clearStage(stage);

    const wrapper = el("div", "op-level-select");

    const title = el("h2", "", { text: "Elige el nivel" });
    wrapper.appendChild(title);

    const levelsRow = el("div", "op-levels");

    [1, 2, 3, 4].forEach((n) => {
      const cfg = LEVELS[n];
      const btn = el("button", "op-level-btn");
      btn.dataset.level = n;

      const numSpan = el("span", "lvl-num", { text: String(n) });
      const ageSpan = el("span", "lvl-age", { text: `~${cfg.age} años` });
      btn.appendChild(numSpan);
      btn.appendChild(ageSpan);

      btn.addEventListener("click", () => {
        // Marcar seleccionado visualmente antes de resolver
        levelsRow.querySelectorAll(".op-level-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        setTimeout(() => resolve(n), 120);
      });

      levelsRow.appendChild(btn);
    });

    const hint = el("p", "op-level-hint", { text: "Nivel 1 fácil · Nivel 4 difícil" });

    wrapper.appendChild(levelsRow);
    wrapper.appendChild(hint);
    stage.appendChild(wrapper);
  });

  // ── playRound ─────────────────────────────────────────────────────────────

  const playRound = (operation, options) => new Promise((resolve) => {
    mount();
    clearStage(stage);

    const statement = el("div", "op-statement");

    // Texto 3D de la operación
    const opText = el("div", "op3d", { text: operation.text });
    statement.appendChild(opText);

    // Ayuda visual si corresponde
    if (operation.hintEnabled && operation.hint) {
      const hintEl = renderHint(operation.hint);
      if (hintEl) statement.appendChild(hintEl);
    }

    // Botón "Listo"
    const readyBtn = el("button", "op-ready-btn", { text: "⚡ Listo" });
    statement.appendChild(readyBtn);

    stage.appendChild(statement);

    // Al pulsar "Listo" → transicionar a bola de energía + esferas
    readyBtn.addEventListener("click", () => {
      // Ocultar el enunciado con botón
      readyBtn.style.display = "none";
      opText.style.display = "none";
      const hintNode = statement.querySelector(".op-hint");
      if (hintNode) hintNode.style.display = "none";

      // Bola de energía
      const ball = el("div", "energy-ball");
      const ballText = el("div", "op-ball-text", { text: operation.text });
      ball.appendChild(ballText);
      stage.appendChild(ball);

      // Instrucción breve
      const tip = el("div", "", { text: "Arrastra la respuesta correcta 🔮" });
      tip.style.cssText = "font-size:11px; color:#9fb0d6; margin-top:4px;";
      stage.appendChild(tip);

      // Esferas de opciones
      const spheresRow = el("div", "op-spheres");
      const sphereEls = options.map((value) => {
        const sphere = el("div", "op-sphere");
        sphere.textContent = String(value);
        sphere.dataset.value = value;
        spheresRow.appendChild(sphere);
        return sphere;
      });
      stage.appendChild(spheresRow);

      // Adjuntar drag
      attachDrag(sphereEls, ball, (value) => {
        const isCorrect = value === operation.answer;
        resolve({ value, isCorrect });
      });
    }, { once: true });
  });

  // ── showResult ────────────────────────────────────────────────────────────

  const showResult = (isCorrect, correctAnswer) => new Promise((resolve) => {
    mount();
    clearStage(stage);

    const result = el("div", `op-result ${isCorrect ? "op-result--ok" : "op-result--bad"}`);

    const emoji = el("div", "op-result-emoji");
    emoji.textContent = isCorrect ? "🎉" : "❌";

    const msg = el("div", "op-msg");
    msg.textContent = isCorrect
      ? "¡Resultado correcto!"
      : `Casi… la respuesta era ${correctAnswer}`;

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

    result.appendChild(emoji);
    result.appendChild(msg);
    result.appendChild(actions);
    stage.appendChild(result);
  });

  // ── API pública ───────────────────────────────────────────────────────────

  return { mount, setBackground, levelSelect, playRound, showResult };
};
