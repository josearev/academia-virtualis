export const PLANETS = [
  { id: "mercurio", name: "Mercurio", color: "#b6b6b6", radius: 0.02, orbitRadius: 0.18, orbitSpeed: 1.45 },
  { id: "venus", name: "Venus", color: "#d0ab69", radius: 0.024, orbitRadius: 0.24, orbitSpeed: 1.2 },
  { id: "tierra", name: "Tierra", color: "#3a8ef6", radius: 0.026, orbitRadius: 0.31, orbitSpeed: 1.05 },
  { id: "marte", name: "Marte", color: "#cf664f", radius: 0.022, orbitRadius: 0.37, orbitSpeed: 0.91 },
  { id: "jupiter", name: "Jupiter", color: "#d7a986", radius: 0.052, orbitRadius: 0.5, orbitSpeed: 0.68 },
  { id: "saturno", name: "Saturno", color: "#d4bf8c", radius: 0.046, orbitRadius: 0.62, orbitSpeed: 0.53 },
  { id: "urano", name: "Urano", color: "#88c0c7", radius: 0.034, orbitRadius: 0.73, orbitSpeed: 0.42 },
  { id: "neptuno", name: "Neptuno", color: "#4c6fd8", radius: 0.033, orbitRadius: 0.84, orbitSpeed: 0.37 },
  { id: "pluton", name: "Pluton", color: "#ba9885", radius: 0.015, orbitRadius: 0.93, orbitSpeed: 0.29 }
];

const shuffle = (input) => {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const createDerangement = (planetIds) => {
  if (planetIds.length < 2) {
    return [...planetIds];
  }

  for (let tries = 0; tries < 120; tries += 1) {
    const candidate = shuffle(planetIds);
    const valid = candidate.every((planetId, index) => planetId !== planetIds[index]);
    if (valid) {
      return candidate;
    }
  }

  // Fallback deterministic rotation to guarantee no fixed points.
  return planetIds.map((_, index) => planetIds[(index + 1) % planetIds.length]);
};

export const createGameState = () => {
  const planetIds = PLANETS.map((planet) => planet.id);
  const shuffledAnchors = createDerangement(planetIds);

  const labels = PLANETS.map((planet, index) => ({
    id: planet.id,
    text: planet.name,
    displayPlanetId: shuffledAnchors[index],
    locked: false,
    dragging: false,
    pointerX: 0,
    pointerY: 0,
    visible: false
  }));

  return {
    completed: false,
    correctCount: 0,
    labels,
    markerVisible: false,
    totalCount: PLANETS.length
  };
};

export const findLabel = (state, labelId) => state.labels.find((label) => label.id === labelId);
