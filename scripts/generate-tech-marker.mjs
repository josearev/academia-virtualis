import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "canvas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outPath = path.join(rootDir, "assets", "markers", "marker-tech.png");

const size = 1200;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext("2d");

ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, size, size);

// Outer border for robust corners.
ctx.strokeStyle = "#000000";
ctx.lineWidth = 44;
ctx.strokeRect(34, 34, size - 68, size - 68);

// High-frequency grid pattern.
const grid = 10;
const innerMargin = 140;
const cell = (size - innerMargin * 2) / grid;

for (let y = 0; y < grid; y += 1) {
  for (let x = 0; x < grid; x += 1) {
    const px = innerMargin + x * cell;
    const py = innerMargin + y * cell;
    const value = (x * 31 + y * 17 + x * y * 13) % 11;

    if (value % 2 === 0) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(px + 10, py + 10, cell - 20, cell - 20);
    }

    if (value === 3 || value === 7) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px + cell / 2, py + cell / 2, cell * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    if (value === 5 || value === 9) {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(px + 12, py + 12);
      ctx.lineTo(px + cell - 12, py + cell - 12);
      ctx.moveTo(px + cell - 12, py + 12);
      ctx.lineTo(px + 12, py + cell - 12);
      ctx.stroke();
    }
  }
}

// Central label for human guidance.
ctx.fillStyle = "#000000";
ctx.fillRect(size * 0.29, size * 0.43, size * 0.42, size * 0.14);
ctx.fillStyle = "#ffffff";
ctx.font = "bold 64px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("ACADEMIA AR", size / 2, size / 2);

await fs.writeFile(outPath, canvas.toBuffer("image/png"));
console.log(`Marker generado: ${outPath}`);
