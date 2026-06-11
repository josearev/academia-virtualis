import { test } from "node:test";
import assert from "node:assert/strict";
import { generateOperation, generateOptions, LEVELS } from "./mathgen.js";

// rng determinista simple (LCG) para reproducibilidad.
const makeRng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

test("generateOperation respeta el nivel y produce respuestas correctas", () => {
  for (const level of [1, 2, 3, 4]) {
    const rng = makeRng(level * 7 + 1);
    for (let i = 0; i < 200; i += 1) {
      const op = generateOperation(level, rng);
      assert.equal(op.level, level);
      assert.ok(LEVELS[level].types.includes(op.type), `tipo ${op.type} válido en nivel ${level}`);
      assert.ok(Number.isInteger(op.answer), "answer entero");
      assert.ok(op.answer >= 0, "answer no negativo");
      if (op.type === "add") assert.equal(op.answer, op.a + op.b);
      if (op.type === "sub") { assert.equal(op.answer, op.a - op.b); assert.ok(op.answer >= 0); }
      if (op.type === "mul") assert.equal(op.answer, op.a * op.b);
      if (op.type === "div") assert.equal(op.a, op.b * op.answer);
      if (op.type === "square") assert.equal(op.answer, op.a * op.a);
      if (op.type === "cuberoot") assert.equal(op.answer ** 3, op.a);
      assert.equal(typeof op.text, "string");
      assert.ok(op.text.length > 0);
    }
  }
});

test("hintEnabled solo en niveles 1 y 2", () => {
  assert.equal(generateOperation(1, makeRng(1)).hintEnabled, true);
  assert.equal(generateOperation(2, makeRng(2)).hintEnabled, true);
  assert.equal(generateOperation(3, makeRng(3)).hintEnabled, false);
  assert.equal(generateOperation(4, makeRng(4)).hintEnabled, false);
});

test("generateOptions da 4 opciones distintas, no negativas, con la respuesta incluida", () => {
  for (const level of [1, 2, 3, 4]) {
    const rng = makeRng(level * 13 + 5);
    for (let i = 0; i < 200; i += 1) {
      const op = generateOperation(level, rng);
      const opts = generateOptions(op, rng);
      assert.equal(opts.length, 4, "exactamente 4 opciones");
      assert.equal(new Set(opts).size, 4, "todas distintas");
      assert.ok(opts.every((n) => Number.isInteger(n) && n >= 0), "enteros no negativos");
      assert.ok(opts.includes(op.answer), "incluye la respuesta correcta");
    }
  }
});

test("nivel inválido cae a nivel 1", () => {
  const op = generateOperation(99, makeRng(1));
  assert.equal(op.level, 99);
  assert.ok(LEVELS[1].types.includes(op.type));
});
