const BASE_SYSTEM_SCALE = 0.9;
const PLANET_SCALE = 1.35;
const SUN_SCALE = 0.84;
const MIN_ZOOM_SCALE = 0.8;
const MAX_ZOOM_SCALE = 2.6;
const DEFAULT_ZOOM_SCALE = 1.2;
const CORE_PLANETS = ["mercurio", "venus", "tierra", "marte"];

const LAYOUT_PRESETS = {
  didactic: {
    sunX: -0.22,
    sunY: 0,
    coreTargetWidth: 0.34,
    rootYOffset: 0.004,
    rootZOffset: 0.055,
    planets: {
      mercurio: { x: -0.1, microOrbit: 0.007, speedFactor: 1.3 },
      venus: { x: -0.042, microOrbit: 0.0085, speedFactor: 1.18 },
      tierra: { x: 0.016, microOrbit: 0.0095, speedFactor: 1.05 },
      marte: { x: 0.072, microOrbit: 0.0082, speedFactor: 0.94 },
      jupiter: { x: 0.158, microOrbit: 0.012, speedFactor: 0.78 },
      saturno: { x: 0.24, microOrbit: 0.011, speedFactor: 0.66 },
      urano: { x: 0.312, microOrbit: 0.0092, speedFactor: 0.53 },
      neptuno: { x: 0.374, microOrbit: 0.0088, speedFactor: 0.49 },
      pluton: { x: 0.426, microOrbit: 0.0072, speedFactor: 0.44 }
    }
  },
  wide: {
    sunX: -0.24,
    sunY: 0,
    coreTargetWidth: 0.38,
    rootYOffset: 0.002,
    rootZOffset: 0.05,
    planets: {
      mercurio: { x: -0.11, microOrbit: 0.009, speedFactor: 1.3 },
      venus: { x: -0.05, microOrbit: 0.01, speedFactor: 1.18 },
      tierra: { x: 0.02, microOrbit: 0.011, speedFactor: 1.05 },
      marte: { x: 0.088, microOrbit: 0.0098, speedFactor: 0.94 },
      jupiter: { x: 0.185, microOrbit: 0.014, speedFactor: 0.78 },
      saturno: { x: 0.28, microOrbit: 0.013, speedFactor: 0.66 },
      urano: { x: 0.365, microOrbit: 0.011, speedFactor: 0.53 },
      neptuno: { x: 0.44, microOrbit: 0.0104, speedFactor: 0.49 },
      pluton: { x: 0.5, microOrbit: 0.0088, speedFactor: 0.44 }
    }
  }
};

const createPlanetMesh = (three, planet) => {
  const geometry = new three.SphereGeometry(planet.radius * PLANET_SCALE, 32, 24);
  const material = new three.MeshStandardMaterial({
    color: planet.color,
    emissive: planet.color,
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
  root.rotation.x = -0.07;

  let currentScale = DEFAULT_ZOOM_SCALE;
  let layoutPresetKey = "didactic";

  const planetNodes = new Map();
  const tmpVector = new three.Vector3();

  planets.forEach((planet, idx) => {
    const orbitPivot = new three.Object3D();
    const mesh = createPlanetMesh(three, planet);
    orbitPivot.add(mesh);

    if (planet.id === "saturno") {
      const ring = new three.Mesh(
        new three.TorusGeometry(planet.radius * PLANET_SCALE * 1.9, planet.radius * PLANET_SCALE * 0.15, 12, 48),
        new three.MeshStandardMaterial({ color: 0xcbb88f, roughness: 0.8, metalness: 0.08 })
      );
      ring.rotation.x = Math.PI / 2.6;
      mesh.add(ring);
    }

    root.add(orbitPivot);
    planetNodes.set(planet.id, {
      data: planet,
      mesh,
      orbitPivot,
      baseX: 0,
      microOrbit: 0.008,
      speedFactor: 1,
      phaseOffset: idx * 0.35
    });
  });

  targetEl.object3D.add(root);

  const applyLayout = (presetKey) => {
    const preset = LAYOUT_PRESETS[presetKey] || LAYOUT_PRESETS.didactic;
    layoutPresetKey = presetKey in LAYOUT_PRESETS ? presetKey : "didactic";

    sun.position.set(preset.sunX, preset.sunY, 0);
    root.position.set(0, preset.rootYOffset, preset.rootZOffset);

    planetNodes.forEach((node, planetId) => {
      const placement = preset.planets[planetId];
      if (!placement) {
        return;
      }
      node.baseX = placement.x;
      node.microOrbit = placement.microOrbit;
      node.speedFactor = placement.speedFactor;
      node.orbitPivot.position.set(placement.x, 0, 0);
      node.mesh.position.set(placement.microOrbit, 0, 0);
    });
  };

  const applyScale = () => {
    root.scale.setScalar(BASE_SYSTEM_SCALE * currentScale);
  };

  const setScale = (scale) => {
    currentScale = clampScale(scale);
    applyScale();
    return currentScale;
  };

  const fitCorePlanetsToMarker = () => {
    const preset = LAYOUT_PRESETS[layoutPresetKey] || LAYOUT_PRESETS.didactic;
    const xValues = [sun.position.x];

    CORE_PLANETS.forEach((planetId) => {
      const node = planetNodes.get(planetId);
      if (node) {
        xValues.push(node.baseX);
      }
    });

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const coreWidth = Math.max(0.0001, maxX - minX);
    const targetScale = clampScale(preset.coreTargetWidth / (coreWidth * BASE_SYSTEM_SCALE));
    currentScale = targetScale;
    applyScale();

    const centerX = (minX + maxX) / 2;
    root.position.x = -centerX * BASE_SYSTEM_SCALE * currentScale;

    return currentScale;
  };

  applyLayout("didactic");
  applyScale();

  return {
    update(timeSeconds) {
      sun.rotation.y = timeSeconds * 0.28;

      planetNodes.forEach((node) => {
        node.orbitPivot.rotation.y = timeSeconds * node.data.orbitSpeed * node.speedFactor + node.phaseOffset;
        node.mesh.rotation.y = timeSeconds * 1.2;
      });
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
    setLayoutPreset(presetKey) {
      applyLayout(presetKey);
      return layoutPresetKey;
    },
    fitCorePlanetsToMarker
  };
};
