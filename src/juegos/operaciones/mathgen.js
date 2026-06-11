// Lógica pura del juego de Operaciones: generación de operaciones por nivel y opciones de respuesta.
// Sin DOM. `rng` inyectable para tests deterministas (por defecto Math.random).

const randInt = (min, max, rng = Math.random) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];

// Definición de cada nivel: edades de referencia y tipos de operación disponibles.
export const LEVELS = {
  1: { age: 7, label: "Nivel 1", hint: true, types: ["add", "sub"] },
  2: { age: 8, label: "Nivel 2", hint: true, types: ["add", "sub", "mul"] },
  3: { age: 10, label: "Nivel 3", hint: false, types: ["mul", "div"] },
  4: { age: 11, label: "Nivel 4", hint: false, types: ["mul", "div", "square", "cuberoot"] }
};

// Construye una operación concreta para un tipo y nivel. Devuelve { type, a, b, answer, text, hint }.
const buildOperation = (type, level, rng) => {
  switch (type) {
    case "add": {
      const max = level <= 1 ? 9 : 18;
      let a = randInt(1, max, rng);
      let b = randInt(1, Math.max(1, (level <= 1 ? 10 : 20) - a), rng);
      return { type, a, b, answer: a + b, text: `${a} + ${b}`, hint: { kind: "add", a, b } };
    }
    case "sub": {
      const max = level <= 1 ? 10 : 20;
      let a = randInt(2, max, rng);
      let b = randInt(1, a, rng); // sin negativos
      return { type, a, b, answer: a - b, text: `${a} − ${b}`, hint: { kind: "sub", a, b } };
    }
    case "mul": {
      const hi = level <= 2 ? 5 : 10;
      const a = randInt(2, hi, rng);
      const b = randInt(2, hi, rng);
      return { type, a, b, answer: a * b, text: `${a} × ${b}`, hint: { kind: "mul", a, b } };
    }
    case "div": {
      const hi = level <= 3 ? 10 : 12;
      const b = randInt(2, hi, rng);
      const answer = randInt(2, hi, rng);
      const a = b * answer; // división exacta
      return { type, a, b, answer, text: `${a} ÷ ${b}`, hint: null };
    }
    case "square": {
      const a = randInt(2, 12, rng);
      return { type, a, b: 2, answer: a * a, text: `${a}²`, hint: null };
    }
    case "cuberoot": {
      const root = pick([2, 3, 4, 5, 6, 10], rng);
      const a = root * root * root;
      return { type, a, b: 3, answer: root, text: `∛${a}`, hint: null };
    }
    default:
      throw new Error(`Tipo de operación desconocido: ${type}`);
  }
};

// Genera una operación aleatoria válida para el nivel dado (1-4).
export const generateOperation = (level = 1, rng = Math.random) => {
  const cfg = LEVELS[level] || LEVELS[1];
  const type = pick(cfg.types, rng);
  const op = buildOperation(type, level, rng);
  return { level, hintEnabled: cfg.hint, ...op };
};

// Genera 4 opciones (la correcta + 3 distractores plausibles, distintos, no negativos), barajadas.
export const generateOptions = (operation, rng = Math.random) => {
  const answer = operation.answer;
  const options = new Set([answer]);
  let guard = 0;
  while (options.size < 4 && guard < 100) {
    guard += 1;
    const delta = randInt(1, Math.max(2, Math.ceil(Math.abs(answer) * 0.4) + 2), rng) * (rng() < 0.5 ? -1 : 1);
    const candidate = answer + delta;
    if (candidate >= 0 && candidate !== answer) {
      options.add(candidate);
    }
  }
  // Relleno determinista por si guard se agotó.
  let filler = answer + 1;
  while (options.size < 4) {
    if (filler !== answer && filler >= 0) options.add(filler);
    filler += 1;
  }
  // Barajar
  const arr = [...options];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
