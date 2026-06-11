// scene3d.js — Contenido 3D REAL del juego de Operaciones (Three.js bajo el ancla del marcador).
// La operación, la bola de energía y las 4 esferas de respuesta son objetos 3D hijos del ancla,
// así mantienen la perspectiva según el marcador AR. El arrastre usa raycasting sobre el lienzo.

// Crea un sprite de texto (canvas → textura). Los sprites siempre miran a la cámara,
// así los números se leen desde cualquier ángulo del marcador.
const makeTextSprite = (THREE, text, { fontSize = 110, color = "#ffffff", height = 0.25, glow = false } = {}) => {
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  const textWidth = ctx.measureText(text).width;
  const pad = fontSize * 0.45;
  canvas.width = Math.ceil(textWidth + pad * 2);
  canvas.height = Math.ceil(fontSize * 1.5);
  ctx = canvas.getContext("2d");
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (glow) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 20;
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(height * aspect, height, 1);
  return sprite;
};

const BALL_RADIUS = 0.18;
const SPHERE_RADIUS = 0.12;
const SNAP_DISTANCE = 0.4; // distancia (en unidades del ancla) para aceptar el drop sobre la bola
const SPHERE_X = [-0.62, -0.21, 0.21, 0.62];
const SPHERE_PALETTE = [0x7fb6f0, 0x9be7c4, 0xffd76a, 0xc7a3ff];

export const createScene3D = ({ sceneEl, anchorEl }) => {
  const THREE = AFRAME.THREE;
  const group = new THREE.Group();
  anchorEl.object3D.add(group);

  let opSprite = null;
  let ball = null; // { node, core, glow }
  let spheres = []; // [{ mesh, value, home }]
  let teardownDrag = null;
  let answered = false;
  const startTime = performance.now();

  // ── Pulso animado de la bola de energía ──────────────────────────────────
  let rafId = requestAnimationFrame(function animate() {
    if (ball) {
      const t = (performance.now() - startTime) / 1000;
      const pulse = 1 + Math.sin(t * 3.2) * 0.07;
      ball.core.scale.setScalar(pulse);
      ball.glow.scale.setScalar(pulse * 1.04);
      ball.core.rotation.y += 0.012;
    }
    rafId = requestAnimationFrame(animate);
  });

  // ── Operación en 3D (sprite de texto) ────────────────────────────────────
  const showOperation = (operation) => {
    if (opSprite) {
      group.remove(opSprite);
      opSprite = null;
    }
    opSprite = makeTextSprite(THREE, operation.text, { height: 0.34, color: "#ffffff", glow: true });
    opSprite.position.set(0, 0.58, 0);
    group.add(opSprite);
  };

  // ── Bola de energía (núcleo emisivo + halo aditivo) ──────────────────────
  const buildBall = () => {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffcf4a,
        emissiveIntensity: 1.25,
        roughness: 0.22,
        metalness: 0.0
      })
    );
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS * 1.55, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfff0a0,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    const node = new THREE.Group();
    node.add(glow);
    node.add(core);
    node.position.set(0, 0.05, 0);
    group.add(node);
    ball = { node, core, glow };
  };

  const ballWorldPos = () => ball.node.getWorldPosition(new THREE.Vector3());

  // ── Esferas de respuesta ─────────────────────────────────────────────────
  const buildSpheres = (options) => {
    options.forEach((value, i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(SPHERE_RADIUS, 28, 28),
        new THREE.MeshStandardMaterial({
          color: SPHERE_PALETTE[i % SPHERE_PALETTE.length],
          roughness: 0.35,
          metalness: 0.1,
          emissive: 0x0a0a22,
          emissiveIntensity: 0.4
        })
      );
      const home = new THREE.Vector3(SPHERE_X[i], -0.5, 0.06);
      mesh.position.copy(home);

      const label = makeTextSprite(THREE, String(value), { height: 0.15, color: "#0b1026" });
      label.position.set(0, 0, SPHERE_RADIUS + 0.02);
      mesh.add(label);

      group.add(mesh);
      spheres.push({ mesh, value, home });
    });
  };

  // ── Arrastre con raycasting ──────────────────────────────────────────────
  const playAnswer = (operation, options) =>
    new Promise((resolve) => {
      answered = false;
      buildBall();
      buildSpheres(options);

      const camera = sceneEl.camera;
      const canvas = sceneEl.canvas || sceneEl.querySelector("canvas");
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const plane = new THREE.Plane();
      const planeHit = new THREE.Vector3();
      const camDir = new THREE.Vector3();
      let active = null;

      const setNdc = (e) => {
        const r = canvas.getBoundingClientRect();
        ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        ndc.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      };

      const onDown = (e) => {
        if (answered || active) {
          return;
        }
        setNdc(e);
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(spheres.map((s) => s.mesh), false);
        if (!hits.length) {
          return;
        }
        const entry = spheres.find((s) => s.mesh === hits[0].object);
        if (!entry) {
          return;
        }
        active = entry;
        camera.getWorldDirection(camDir);
        plane.setFromNormalAndCoplanarPoint(camDir.clone().negate(), entry.mesh.getWorldPosition(new THREE.Vector3()));
        entry.mesh.scale.setScalar(1.18);
        e.preventDefault();
      };

      const onMove = (e) => {
        if (!active) {
          return;
        }
        setNdc(e);
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.ray.intersectPlane(plane, planeHit)) {
          active.mesh.position.copy(active.mesh.parent.worldToLocal(planeHit.clone()));
          const d = active.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(ballWorldPos());
          ball.glow.material.opacity = d < SNAP_DISTANCE ? 0.6 : 0.3;
        }
        e.preventDefault();
      };

      const onUp = (e) => {
        if (!active) {
          return;
        }
        const entry = active;
        active = null;
        entry.mesh.scale.setScalar(1);
        ball.glow.material.opacity = 0.3;
        const d = entry.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(ballWorldPos());
        if (d < SNAP_DISTANCE) {
          answered = true;
          teardown();
          resolve({ value: entry.value, isCorrect: entry.value === operation.answer });
        } else {
          entry.mesh.position.copy(entry.home);
        }
        e.preventDefault();
      };

      const teardown = () => {
        canvas.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      teardownDrag = teardown;

      canvas.addEventListener("pointerdown", onDown, { passive: false });
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp, { passive: false });
      window.addEventListener("pointercancel", onUp, { passive: false });
    });

  // ── Limpieza ─────────────────────────────────────────────────────────────
  const clear = () => {
    if (teardownDrag) {
      teardownDrag();
      teardownDrag = null;
    }
    if (ball) {
      group.remove(ball.node);
      ball = null;
    }
    spheres.forEach((s) => group.remove(s.mesh));
    spheres = [];
    if (opSprite) {
      group.remove(opSprite);
      opSprite = null;
    }
  };

  const dispose = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    clear();
    anchorEl.object3D.remove(group);
  };

  return { showOperation, playAnswer, clear, dispose };
};
