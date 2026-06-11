// Configuración del juego de Operaciones.

// Flag de prueba: con ?nomarker (o ?test) en la URL, el juego NO usa cámara ni marcador,
// y se muestra directo en el navegador sobre un fondo aleatorio.
export const isNoMarkerMode = () => {
  const params = new URLSearchParams(window.location.search);
  return params.has("nomarker") || params.has("test");
};

// Fondos (degradados) para el modo sin marcador. Se elige uno al azar.
export const BACKGROUNDS = [
  "radial-gradient(circle at 30% 20%, #243b6b 0%, #0b1026 70%)",
  "linear-gradient(160deg, #2a1a5e, #6a4bd6)",
  "linear-gradient(160deg, #0e7a5f, #134e4a)",
  "radial-gradient(circle at 70% 30%, #7a2e6b 0%, #1a0b26 70%)",
  "radial-gradient(circle at 50% 80%, #1f6f78 0%, #07121f 70%)"
];

export const pickRandomBackground = () =>
  BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];

// Texto y tunables.
export const GAME_CONFIG = {
  markerSrc: "/assets/targets/marker-sistema-solar.mind",
  correctText: "¡Resultado correcto!",
  incorrectPrefix: "Casi… la respuesta era",
  defaultLevel: 1
};
