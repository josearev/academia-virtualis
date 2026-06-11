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

// ── Zoom de los objetos 3D (persistido en cookie, como el Sistema Solar) ──────
export const ZOOM_RANGE = { min: 0.3, max: 3, step: 0.05, initial: 1 };

const ZOOM_COOKIE_KEY = "av_op_zoom";
const ZOOM_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;

export const getZoomFromCookie = () => {
  const match = document.cookie.match(/(?:^|;\s*)av_op_zoom=([^;]+)/);
  const value = match ? Number(decodeURIComponent(match[1])) : NaN;
  if (!Number.isFinite(value)) {
    return ZOOM_RANGE.initial;
  }
  return Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, value));
};

export const saveZoomToCookie = (value) => {
  document.cookie = `${ZOOM_COOKIE_KEY}=${encodeURIComponent(value)}; path=/; max-age=${ZOOM_COOKIE_MAX_AGE}; SameSite=Lax`;
};
