import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const copyPlan = [
  {
    source: path.join(rootDir, "node_modules", "aframe", "dist", "aframe-v1.7.1.min.js"),
    target: path.join(rootDir, "public", "vendor", "aframe", "aframe.min.js")
  },
  {
    source: path.join(rootDir, "node_modules", "mind-ar", "dist", "mindar-image-aframe.prod.js"),
    target: path.join(rootDir, "public", "vendor", "mindar", "mindar-image-aframe.prod.js")
  }
];

const syncVendor = async () => {
  for (const file of copyPlan) {
    await fs.access(file.source);
    await fs.mkdir(path.dirname(file.target), { recursive: true });
    await fs.copyFile(file.source, file.target);
    process.stdout.write(`[vendor] ${path.relative(rootDir, file.source)} -> ${path.relative(rootDir, file.target)}\n`);
  }
};

syncVendor().catch((error) => {
  process.stderr.write(`[vendor] Error: ${error.message}\n`);
  process.exit(1);
});
