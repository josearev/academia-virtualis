import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const entry = (relativePath) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        catalogo: entry("./index.html"),
        sistemaSolar: entry("./juegos/sistema-solar/index.html"),
        operaciones: entry("./juegos/operaciones/index.html")
      }
    }
  }
});
