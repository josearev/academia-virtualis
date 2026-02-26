import { ROTATION_CONFIG, SCENE_CONFIG } from "../config/app-config.js";

const BASE_SYSTEM_SCALE = SCENE_CONFIG.baseSystemScale;
const PLANET_SCALE = SCENE_CONFIG.planetScale;
const SUN_SCALE = SCENE_CONFIG.sunScale;
const ORBIT_SPEED_SCALE = SCENE_CONFIG.orbitSpeedScale;
const CORE_PLANETS = SCENE_CONFIG.corePlanets;
const CORE_TARGET_WIDTH = SCENE_CONFIG.coreTargetWidth;

const MIN_ZOOM_SCALE = SCENE_CONFIG.zoom.min;
const MAX_ZOOM_SCALE = SCENE_CONFIG.zoom.max;
const DEFAULT_ZOOM_SCALE = SCENE_CONFIG.zoom.initial;
const MIN_ORBIT_SCALE = SCENE_CONFIG.orbit.min;
const MAX_ORBIT_SCALE = SCENE_CONFIG.orbit.max;
const DEFAULT_ORBIT_SCALE = SCENE_CONFIG.orbit.initial;
const MIN_PLANET_SCALE = SCENE_CONFIG.planet.min;
const MAX_PLANET_SCALE = SCENE_CONFIG.planet.max;
const DEFAULT_PLANET_SCALE = SCENE_CONFIG.planet.initial;
const MIN_SPEED_SCALE = SCENE_CONFIG.speed.min;
const MAX_SPEED_SCALE = SCENE_CONFIG.speed.max;
const DEFAULT_SPEED_SCALE = SCENE_CONFIG.speed.initial;
const DEFAULT_ROTATION_X = ROTATION_CONFIG.x.initial;
const DEFAULT_ROTATION_Y = ROTATION_CONFIG.y.initial;
const DEFAULT_ROTATION_Z = ROTATION_CONFIG.z.initial;

const degreesToRadians = (degrees) => degrees * (Math.PI / 180);

const createPlanetTexture = (three, planetId) => {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  if (planetId === "mercurio") {
    ctx.fillStyle = "#9a9a9a";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#b8b8b8";
    for (let i = 0; i < 8; i++) {
      const px = (Math.sin(i * 2.3 + 1) * 0.4 + 0.5) * s;
      const py = (Math.cos(i * 1.7 + 2) * 0.4 + 0.5) * s;
      const r = (0.04 + Math.sin(i * 3.1) * 0.02) * s;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#707070";
    for (let i = 0; i < 12; i++) {
      const px = (Math.cos(i * 1.9 + 0.5) * 0.45 + 0.5) * s;
      const py = (Math.sin(i * 2.7 + 1.2) * 0.45 + 0.5) * s;
      const r = (0.02 + Math.sin(i * 4.1) * 0.015) * s;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (planetId === "venus") {
    const grad = ctx.createRadialGradient(cx, cy * 0.8, 0, cx, cy, s * 0.6);
    grad.addColorStop(0, "#f5d87a");
    grad.addColorStop(0.5, "#dfa84b");
    grad.addColorStop(1, "#c4882a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(210,160,60,0.4)";
    ctx.lineWidth = 6;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, s * (i / 6 + 0.05));
      ctx.bezierCurveTo(s * 0.3, s * (i / 6 + 0.15), s * 0.7, s * (i / 6 - 0.05), s, s * (i / 6 + 0.1));
      ctx.stroke();
    }
  } else if (planetId === "tierra") {
    ctx.fillStyle = "#1a5fb8";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#3a8a3a";
    ctx.beginPath();
    ctx.ellipse(cx * 0.55, cy, cx * 0.22, cy * 0.6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx * 1.2, cy * 0.9, cx * 0.25, cy * 0.55, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a7a3a";
    ctx.beginPath();
    ctx.ellipse(cx * 1.55, cy * 0.75, cx * 0.35, cy * 0.35, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8f8ff";
    ctx.fillRect(0, 0, s, s * 0.08);
    ctx.fillRect(0, s * 0.88, s, s * 0.12);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(s * (0.1 + i * 0.2), s * (0.25 + Math.sin(i * 1.3) * 0.12), s * 0.12, s * 0.04, i * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (planetId === "marte") {
    ctx.fillStyle = "#cc5533";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#a83a20";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(
        s * (0.2 + i * 0.15),
        s * (0.3 + Math.cos(i * 2.1) * 0.25),
        s * (0.08 + Math.sin(i * 1.7) * 0.04),
        s * (0.06 + Math.cos(i * 2.3) * 0.03),
        i * 0.5, 0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.fillStyle = "#de7755";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(s * (0.1 + i * 0.25), s * (0.6 + Math.sin(i * 1.9) * 0.15), s * 0.1, s * 0.06, i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f0e8e0";
    ctx.beginPath();
    ctx.ellipse(cx, s * 0.05, cx * 0.55, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (planetId === "jupiter") {
    ctx.fillStyle = "#e8d5b4";
    ctx.fillRect(0, 0, s, s);
    const jupBands = [
      { y: 0.08, h: 0.06, color: "#c8a87a" },
      { y: 0.16, h: 0.05, color: "#a87850" },
      { y: 0.24, h: 0.08, color: "#d4b888" },
      { y: 0.35, h: 0.06, color: "#b88c60" },
      { y: 0.44, h: 0.10, color: "#d0a070" },
      { y: 0.56, h: 0.06, color: "#b07848" },
      { y: 0.65, h: 0.07, color: "#c8a478" },
      { y: 0.74, h: 0.05, color: "#a87050" },
      { y: 0.82, h: 0.08, color: "#c09068" }
    ];
    jupBands.forEach(({ y, h, color }) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, s * y, s, s * h);
    });
    ctx.fillStyle = "#c04828";
    ctx.beginPath();
    ctx.ellipse(s * 0.65, s * 0.49, s * 0.1, s * 0.06, 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (planetId === "saturno") {
    ctx.fillStyle = "#e8d898";
    ctx.fillRect(0, 0, s, s);
    const satBands = [
      { y: 0.10, h: 0.05, color: "#c8b870" },
      { y: 0.18, h: 0.06, color: "#d4c880" },
      { y: 0.27, h: 0.08, color: "#b8a860" },
      { y: 0.38, h: 0.06, color: "#c8b870" },
      { y: 0.47, h: 0.08, color: "#ddd098" },
      { y: 0.58, h: 0.05, color: "#c0b068" },
      { y: 0.66, h: 0.07, color: "#d0c080" },
      { y: 0.76, h: 0.06, color: "#b8a860" }
    ];
    satBands.forEach(({ y, h, color }) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, s * y, s, s * h);
    });
  } else if (planetId === "urano") {
    const grad = ctx.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, "#a8dce4");
    grad.addColorStop(0.4, "#70c0cc");
    grad.addColorStop(0.7, "#5ab0bc");
    grad.addColorStop(1, "#80c8d4");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "rgba(100,180,195,0.3)";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(0, s * (0.2 + i * 0.18), s, s * 0.05);
    }
  } else if (planetId === "neptuno") {
    const grad = ctx.createRadialGradient(cx * 0.7, cy * 0.7, 0, cx, cy, s * 0.6);
    grad.addColorStop(0, "#3a5fcc");
    grad.addColorStop(0.5, "#2040a0");
    grad.addColorStop(1, "#102880");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(s * 0.6, s * 0.45, s * 0.08, s * 0.05, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(80,120,220,0.3)";
    ctx.lineWidth = 8;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, s * (0.2 + i * 0.17));
      ctx.lineTo(s, s * (0.22 + i * 0.17));
      ctx.stroke();
    }
  } else if (planetId === "pluton") {
    ctx.fillStyle = "#b09880";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#887060";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(
        s * (0.2 + i * 0.12 + Math.sin(i * 2.1) * 0.05),
        s * (0.3 + Math.cos(i * 1.7) * 0.3),
        s * 0.08, s * 0.06,
        i * 0.6, 0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.fillStyle = "#d4b8a0";
    ctx.beginPath();
    ctx.ellipse(cx * 1.1, cy * 1.1, cx * 0.3, cy * 0.25, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  return new three.CanvasTexture(canvas);
};

const createOrbitRing = (three, radius) => {
  const segments = 64;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new three.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geo = new three.BufferGeometry().setFromPoints(points);
  const mat = new three.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
  return new three.Line(geo, mat);
};

const createPlanetMesh = (three, planet) => {
  const geometry = new three.SphereGeometry(planet.radius * PLANET_SCALE, 32, 24);
  const texture = createPlanetTexture(three, planet.id);
  const material = new three.MeshStandardMaterial({
    map: texture,
    emissive: new three.Color(planet.color),
    emissiveIntensity: 0.16,
    roughness: 0.72,
    metalness: 0.06
  });
  return new three.Mesh(geometry, material);
};

const clampScale = (scale) => Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, scale));

export const createSolarSystemScene = ({ targetEl, planets }) => {
  const three = window.AFRAME.THREE;
  const root = new three.Group();
  const sunLight = new three.PointLight(0xffd17c, 1.85, 2.2);
  const ambientLight = new three.AmbientLight(0xbccfff, 0.98);

  const sun = new three.Mesh(
    new three.SphereGeometry(0.09 * SUN_SCALE, 36, 28),
    new three.MeshStandardMaterial({
      color: 0xffb43b,
      emissive: 0xff8c1f,
      emissiveIntensity: 0.72,
      roughness: 0.65,
      metalness: 0.1
    })
  );

  root.add(sun);
  root.add(sunLight);
  root.add(ambientLight);

  let currentRotationDegrees = {
    x: DEFAULT_ROTATION_X,
    y: DEFAULT_ROTATION_Y,
    z: DEFAULT_ROTATION_Z
  };

  const clampRotationByAxis = (axis, value) => {
    const limits = ROTATION_CONFIG[axis];
    if (!limits) {
      return value;
    }
    return Math.min(limits.max, Math.max(limits.min, value));
  };

  const applyRotation = () => {
    root.rotation.x = degreesToRadians(currentRotationDegrees.x);
    root.rotation.y = degreesToRadians(currentRotationDegrees.y);
    root.rotation.z = degreesToRadians(currentRotationDegrees.z);
  };

  let currentScale = DEFAULT_ZOOM_SCALE;
  let currentOrbitScale = DEFAULT_ORBIT_SCALE;
  let currentPlanetScale = DEFAULT_PLANET_SCALE;
  let currentSpeedScale = DEFAULT_SPEED_SCALE;
  let virtualTime = 0;
  let lastRealTime = null;
  let orbitPaused = false;

  const orbitRingsGroup = new three.Group();
  root.add(orbitRingsGroup);

  const planetNodes = new Map();
  const tmpVector = new three.Vector3();

  planets.forEach((planet, idx) => {
    const orbitPivot = new three.Object3D();
    const mesh = createPlanetMesh(three, planet);
    mesh.position.set(planet.orbitRadius, 0, 0);
    orbitPivot.add(mesh);

    const node = {
      data: planet,
      mesh,
      orbitPivot,
      ring: null,
      phaseOffset: idx * (Math.PI * 2 / planets.length)
    };

    if (planet.id === "saturno") {
      const ring = new three.Mesh(
        new three.TorusGeometry(planet.radius * PLANET_SCALE * 2.0, planet.radius * PLANET_SCALE * 0.18, 8, 64),
        new three.MeshStandardMaterial({ color: 0xcbb88f, roughness: 0.8, metalness: 0.08, transparent: true, opacity: 0.9 })
      );
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
      node.ring = ring;
    }

    if (planet.id === "urano") {
      const ring = new three.Mesh(
        new three.TorusGeometry(planet.radius * PLANET_SCALE * 1.7, planet.radius * PLANET_SCALE * 0.08, 6, 64),
        new three.MeshStandardMaterial({ color: 0x7ab8c0, roughness: 0.9, metalness: 0.04, transparent: true, opacity: 0.75 })
      );
      ring.rotation.z = Math.PI / 2;
      mesh.add(ring);
      node.ring = ring;
    }

    root.add(orbitPivot);
    orbitRingsGroup.add(createOrbitRing(three, planet.orbitRadius));
    planetNodes.set(planet.id, node);
  });

  targetEl.object3D.add(root);

  const applyLayout = () => {
    sun.position.set(0, 0, 0);
    root.position.set(0, 0.004, 0.055);

    planetNodes.forEach((node) => {
      node.orbitPivot.position.set(0, 0, 0);
      node.mesh.position.set(node.data.orbitRadius * currentOrbitScale, 0, 0);
    });
  };

  const applyScale = () => {
    root.scale.setScalar(BASE_SYSTEM_SCALE * currentScale);
  };

  const clampOrbitScale = (s) => Math.min(MAX_ORBIT_SCALE, Math.max(MIN_ORBIT_SCALE, s));

  const setOrbitScale = (scale) => {
    currentOrbitScale = clampOrbitScale(scale);
    orbitRingsGroup.scale.setScalar(currentOrbitScale);
    planetNodes.forEach((node) => {
      node.mesh.position.setX(node.data.orbitRadius * currentOrbitScale);
    });
    return currentOrbitScale;
  };

  const setScale = (scale) => {
    currentScale = clampScale(scale);
    applyScale();
    return currentScale;
  };

  const fitCorePlanetsToMarker = () => {
    const maxCoreOrbitRadius = Math.max(
      ...CORE_PLANETS.map((id) => planetNodes.get(id)?.data.orbitRadius ?? 0)
    );
    const effectiveRadius = maxCoreOrbitRadius * currentOrbitScale;
    const targetScale = clampScale(CORE_TARGET_WIDTH / (2 * effectiveRadius * BASE_SYSTEM_SCALE));
    currentScale = targetScale;
    applyScale();
    root.position.x = 0;
    return currentScale;
  };

  applyLayout();
  applyScale();
  applyRotation();
  setOrbitScale(DEFAULT_ORBIT_SCALE); // sincroniza orbitRingsGroup.scale desde el inicio

  return {
    update(realTimeSeconds) {
      if (lastRealTime !== null && !orbitPaused) {
        const delta = realTimeSeconds - lastRealTime;
        virtualTime += delta * currentSpeedScale;
      }
      lastRealTime = realTimeSeconds;

      sun.rotation.y = virtualTime * 0.28;

      planetNodes.forEach((node) => {
        node.orbitPivot.rotation.y =
          virtualTime * node.data.orbitSpeed * node.data.speedFactor * ORBIT_SPEED_SCALE
          + node.phaseOffset;
        node.mesh.rotation.y = virtualTime * 1.2;
      });
    },
    setOrbitPaused(paused) {
      orbitPaused = paused;
    },
    getScreenPositions(camera, viewportWidth, viewportHeight) {
      const positions = {};

      planetNodes.forEach((node, planetId) => {
        node.mesh.getWorldPosition(tmpVector);
        tmpVector.project(camera);

        const x = (tmpVector.x * 0.5 + 0.5) * viewportWidth;
        const y = (-tmpVector.y * 0.5 + 0.5) * viewportHeight;
        const visible = tmpVector.z >= -1 && tmpVector.z <= 1;

        positions[planetId] = {
          id: planetId,
          name: node.data.name,
          x,
          y,
          visible
        };
      });

      return positions;
    },
    setScale,
    getScale() {
      return currentScale;
    },
    getScaleRange() {
      return { min: MIN_ZOOM_SCALE, max: MAX_ZOOM_SCALE, initial: DEFAULT_ZOOM_SCALE };
    },
    setOrbitScale,
    getOrbitScale() {
      return currentOrbitScale;
    },
    getOrbitScaleRange() {
      return { min: MIN_ORBIT_SCALE, max: MAX_ORBIT_SCALE, initial: DEFAULT_ORBIT_SCALE };
    },
    setPlanetScale(scale) {
      currentPlanetScale = Math.min(MAX_PLANET_SCALE, Math.max(MIN_PLANET_SCALE, scale));
      planetNodes.forEach((node) => {
        node.mesh.scale.setScalar(currentPlanetScale);
      });
      return currentPlanetScale;
    },
    getPlanetScale() {
      return currentPlanetScale;
    },
    getPlanetScaleRange() {
      return { min: MIN_PLANET_SCALE, max: MAX_PLANET_SCALE, initial: DEFAULT_PLANET_SCALE };
    },
    setOrbitSpeed(scale) {
      currentSpeedScale = Math.min(MAX_SPEED_SCALE, Math.max(MIN_SPEED_SCALE, scale));
      return currentSpeedScale;
    },
    getOrbitSpeed() {
      return currentSpeedScale;
    },
    getOrbitSpeedRange() {
      return { min: MIN_SPEED_SCALE, max: MAX_SPEED_SCALE, initial: DEFAULT_SPEED_SCALE };
    },
    setRotationDegrees({ x, y, z }) {
      if (Number.isFinite(x)) {
        currentRotationDegrees.x = clampRotationByAxis("x", x);
      }
      if (Number.isFinite(y)) {
        currentRotationDegrees.y = clampRotationByAxis("y", y);
      }
      if (Number.isFinite(z)) {
        currentRotationDegrees.z = clampRotationByAxis("z", z);
      }
      applyRotation();
      return { ...currentRotationDegrees };
    },
    getRotationDegrees() {
      return { ...currentRotationDegrees };
    },
    getRotationRange() {
      return {
        x: { ...ROTATION_CONFIG.x },
        y: { ...ROTATION_CONFIG.y },
        z: { ...ROTATION_CONFIG.z }
      };
    },
    fitCorePlanetsToMarker
  };
};
