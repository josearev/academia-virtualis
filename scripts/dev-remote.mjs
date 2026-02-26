import { spawn } from "node:child_process";
import process from "node:process";
import localtunnel from "localtunnel";

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "0.0.0.0";

const startVite = () =>
  spawn("npx", ["vite", "--host", HOST, "--port", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"]
  });

const waitForServer = async (timeoutMs = 25000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}`);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("Vite no inicio a tiempo.");
};

const getTunnelPassword = async () => {
  try {
    const response = await fetch("https://loca.lt/mytunnelpassword");
    if (!response.ok) {
      return null;
    }
    const text = (await response.text()).trim();
    return text || null;
  } catch {
    return null;
  }
};

const main = async () => {
  console.log(`[remote] Iniciando servidor Vite en ${HOST}:${PORT}...`);
  const vite = startVite();
  let tunnel = null;

  vite.stdout.on("data", (chunk) => process.stdout.write(chunk.toString()));
  vite.stderr.on("data", (chunk) => process.stderr.write(chunk.toString()));

  const stopAll = () => {
    if (tunnel) {
      tunnel.close();
      tunnel = null;
    }
    if (!vite.killed) {
      vite.kill("SIGTERM");
    }
  };

  process.on("SIGINT", () => {
    stopAll();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stopAll();
    process.exit(0);
  });

  vite.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[remote] Vite termino con codigo ${code}.`);
    }
    if (tunnel) {
      tunnel.close();
    }
    process.exit(code ?? 1);
  });

  await waitForServer();

  console.log("[remote] Creando tunel HTTPS...");
  tunnel = await localtunnel({ port: PORT });
  console.log(`[remote] URL publica: ${tunnel.url}`);

  const tunnelPassword = await getTunnelPassword();
  if (tunnelPassword) {
    console.log(`[remote] Password de localtunnel (si lo pide): ${tunnelPassword}`);
  }

  tunnel.on("close", () => {
    console.error("[remote] El tunel se cerro.");
    stopAll();
    process.exit(1);
  });
};

main().catch((error) => {
  console.error(`[remote] Error: ${error.message}`);
  process.exit(1);
});
