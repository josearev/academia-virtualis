import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const directories = [
  { source: path.join(rootDir, "assets", "targets"), target: path.join(rootDir, "public", "assets", "targets") },
  { source: path.join(rootDir, "assets", "nfts"), target: path.join(rootDir, "public", "assets", "nfts") }
];

const syncDirectories = async () => {
  for (const item of directories) {
    await fs.access(item.source);
    await fs.rm(item.target, { recursive: true, force: true });
    await fs.mkdir(path.dirname(item.target), { recursive: true });
    await fs.cp(item.source, item.target, {
      recursive: true,
      filter: (sourcePath) => path.basename(sourcePath) !== ".DS_Store"
    });
    process.stdout.write(`[assets] ${path.relative(rootDir, item.source)} -> ${path.relative(rootDir, item.target)}\n`);
  }
};

syncDirectories().catch((error) => {
  process.stderr.write(`[assets] Error: ${error.message}\n`);
  process.exit(1);
});
