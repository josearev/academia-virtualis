import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadImage } from "canvas";
import { OfflineCompiler } from "mind-ar/src/image-target/offline-compiler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "assets", "targets");
const sourceRelative = process.env.MARKER_SOURCE || "assets/markers/marker-sistema-solar.png";
const sourceImagePath = path.resolve(rootDir, sourceRelative);
const markerName = path.parse(sourceImagePath).name;
const outPath = path.join(outDir, `${markerName}.mind`);

const run = async () => {
  await fs.mkdir(outDir, { recursive: true });

  const image = await loadImage(sourceImagePath);
  const compiler = new OfflineCompiler();

  let lastBucket = -1;
  await compiler.compileImageTargets([image], (progress) => {
    const bucket = Math.floor(progress / 5);
    if (bucket > lastBucket) {
      lastBucket = bucket;
      process.stdout.write(`Compilando target: ${Math.round(progress)}%\n`);
    }
  });

  const data = compiler.exportData();
  await fs.writeFile(outPath, Buffer.from(data));
  process.stdout.write(`Target generado: ${outPath}\n`);
};

run().catch((error) => {
  process.stderr.write(`Error al compilar target: ${error.message}\n`);
  process.exit(1);
});
