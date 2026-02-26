const BASE_SYSTEM_SCALE = 0.9;
const ORBIT_SCALE = 0.62;
const PLANET_SCALE = 1.35;
const SUN_SCALE = 0.84;
const MIN_ZOOM_SCALE = 0.8;
const MAX_ZOOM_SCALE = 2.6;
const DEFAULT_ZOOM_SCALE = 1.2;

const createPlanetMesh = (three, planet) => {
  const geometry = new three.SphereGeometry(planet.radius * PLANET_SCALE, 32, 24);
  const material = new three.MeshStandardMaterial({
    color: planet.color,
    emissive: planet.color,
    emissiveIntensity: 0.08,
    roughness: 0.72,
    metalness: 0.06
  });
  const mesh = new three.Mesh(geometry, material);
  mesh.position.x = planet.orbitRadius * ORBIT_SCALE;
  return mesh;
};

export const createSolarSystemScene = ({ targetEl, planets }) => {
  const three = window.AFRAME.THREE;
  const root = new three.Group();
  const sunLight = new three.PointLight(0xffd17c, 2.45, 2.35);
  const ambientLight = new three.AmbientLight(0xbccfff, 0.9);
  let currentScale = DEFAULT_ZOOM_SCALE;

  const sun = new three.Mesh(
    new three.SphereGeometry(0.09 * SUN_SCALE, 36, 28),
    new three.MeshStandardMaterial({
      color: 0xffb43b,
      emissive: 0xff8c1f,
      emissiveIntensity: 1.05,
      roughness: 0.65,
      metalness: 0.1
    })
  );

  root.add(sun);
  root.add(sunLight);
  root.add(ambientLight);
  root.scale.setScalar(BASE_SYSTEM_SCALE * currentScale);
  root.position.set(0, 0.004, 0.055);
  root.rotation.x = -0.09;

  const byId = new Map();
  const tmpVector = new three.Vector3();

  planets.forEach((planet) => {
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
    byId.set(planet.id, {
      data: planet,
      mesh,
      orbitPivot
    });
  });

  targetEl.object3D.add(root);

  const clampScale = (scale) => Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, scale));

  return {
    update(timeSeconds) {
      root.rotation.y = timeSeconds * 0.06;
      sun.rotation.y = timeSeconds * 0.3;

      byId.forEach(({ orbitPivot, mesh, data }, index) => {
        orbitPivot.rotation.y = timeSeconds * data.orbitSpeed + index * 0.45;
        mesh.rotation.y = timeSeconds * 1.4;
      });
    },
    getScreenPositions(camera, viewportWidth, viewportHeight) {
      const positions = {};
      byId.forEach(({ mesh, data }) => {
        mesh.getWorldPosition(tmpVector);
        tmpVector.project(camera);

        const x = (tmpVector.x * 0.5 + 0.5) * viewportWidth;
        const y = (-tmpVector.y * 0.5 + 0.5) * viewportHeight;
        const visible = tmpVector.z >= -1 && tmpVector.z <= 1;

        positions[data.id] = {
          id: data.id,
          name: data.name,
          x,
          y,
          visible
        };
      });

      return positions;
    },
    setScale(scale) {
      currentScale = clampScale(scale);
      root.scale.setScalar(BASE_SYSTEM_SCALE * currentScale);
      return currentScale;
    },
    getScale() {
      return currentScale;
    },
    getScaleRange() {
      return { min: MIN_ZOOM_SCALE, max: MAX_ZOOM_SCALE, initial: DEFAULT_ZOOM_SCALE };
    }
  };
};
