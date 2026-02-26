// Configuracion central de la app.
// Este archivo concentra constantes y preferencias para facilitar ajustes sin tocar la logica.

// Version visible en pantalla (subir +1 en sub-version por commit: 0.10 -> 0.11, etc).
export const APP_VERSION = "0.11";

// Textos y valores globales del flujo principal.
export const APP_CONFIG = {
  successText: "Felicidades! Has completado la actividad. Ahora has ganado 1 NFT que será guardado en tu NFT gallery",
  returnUrl: "https://xerticagrupoacererobdr.my.canva.site/c1fncgdhef8bcwqy",
  snapDistance: 100,
  completionCountdownSeconds: 5,
  mindarWaitTimeoutMs: 12000,
  mindarPollIntervalMs: 120,
  iosResizeDelaysMs: [0, 120, 320, 650],
  insecureContextText: "Camara bloqueada por navegador: abre este sitio en HTTPS para usar AR en iPhone/iPad.",
  autoStartStatusText: "Iniciando camara AR automaticamente..."
};

// Preferencias de visualizacion y tunables de UI.
export const UI_PREFERENCES = {
  labelOffsetByPlanetId: {
    mercurio: 30,
    venus: 34,
    tierra: 38,
    marte: 34,
    jupiter: 44,
    saturno: 42,
    urano: 38,
    neptuno: 38,
    pluton: 30
  },
  confettiColors: ["#ffde59", "#ff6b6b", "#4ecdc4", "#7f5af0", "#58a6ff", "#ff9f1c"],
  confettiDensityFactor: 2.5
};

// Textos de estado mostrados en la capa UI.
export const OVERLAY_TEXTS = {
  tracking: "Marcador detectado. Arrastra cada nombre al planeta correcto.",
  scanning: "Buscando marcador. Apunta la cámara al marcador AR técnico."
};

// Configuracion del motor de escena (rangos de sliders y constantes de escala).
export const SCENE_CONFIG = {
  baseSystemScale: 0.9,
  planetScale: 1.35,
  sunScale: 0.84,
  orbitSpeedScale: 0.25,
  corePlanets: ["mercurio", "venus", "tierra", "marte"],
  coreTargetWidth: 0.34,
  zoom: { min: 0.1, max: 8.0, initial: 1.5 },
  orbit: { min: 2.0, max: 5.0, initial: 2.5 },
  planet: { min: 0.5, max: 3.0, initial: 1.0 },
  speed: { min: 0.0, max: 3.0, initial: 0.7 }
};

// Persistencia de preferencias de sliders por cookie.
export const SLIDER_COOKIE_CONFIG = {
  maxAgeDays: 180,
  keys: {
    zoom: "av_slider_zoom",
    orbit: "av_slider_orbit",
    planet: "av_slider_planet",
    speed: "av_slider_speed"
  }
};

const readCookieRaw = (key) => {
  const target = `${key}=`;
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (let index = 0; index < cookies.length; index += 1) {
    const item = cookies[index].trim();
    if (item.startsWith(target)) {
      return item.slice(target.length);
    }
  }
  return "";
};

export const getSliderPreferenceFromCookies = (sliderKey) => {
  const cookieKey = SLIDER_COOKIE_CONFIG.keys[sliderKey];
  if (!cookieKey) {
    return null;
  }
  const rawValue = readCookieRaw(cookieKey);
  if (!rawValue) {
    return null;
  }
  const parsed = Number(decodeURIComponent(rawValue));
  return Number.isFinite(parsed) ? parsed : null;
};

export const saveSliderPreferenceToCookies = (sliderKey, numericValue) => {
  const cookieKey = SLIDER_COOKIE_CONFIG.keys[sliderKey];
  if (!cookieKey || !Number.isFinite(numericValue)) {
    return;
  }
  const maxAgeSeconds = SLIDER_COOKIE_CONFIG.maxAgeDays * 24 * 60 * 60;
  const safeValue = encodeURIComponent(numericValue.toFixed(4));
  document.cookie = `${cookieKey}=${safeValue}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
};
