import http from "node:http";
import { spawn } from "node:child_process";
import process from "node:process";

const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "0.0.0.0";
const PROXY_PORT = Number(process.env.PROXY_PORT || 5174);
const TUNNEL_USER = process.env.TUNNEL_USER || "virtualis";
const TUNNEL_PASSWORD = process.env.TUNNEL_PASSWORD || "virtualis.1811";
const TUNNEL_REALM = "Academia Virtualis Tunnel";

const startVite = () =>
  spawn("npx", ["vite", "--host", HOST, "--port", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"]
  });

const parseAuth = (header) => {
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }
  try {
    const raw = Buffer.from(header.slice(6), "base64").toString("utf8");
    const divider = raw.indexOf(":");
    if (divider === -1) {
      return null;
    }
    return {
      user: raw.slice(0, divider),
      password: raw.slice(divider + 1)
    };
  } catch {
    return null;
  }
};

const startAuthProxy = () =>
  http.createServer((clientReq, clientRes) => {
    const credentials = parseAuth(clientReq.headers.authorization);
    const isAuthorized =
      credentials &&
      credentials.user === TUNNEL_USER &&
      credentials.password === TUNNEL_PASSWORD;

    if (!isAuthorized) {
      clientRes.writeHead(401, {
        "WWW-Authenticate": `Basic realm="${TUNNEL_REALM}"`,
        "Content-Type": "text/plain; charset=utf-8"
      });
      clientRes.end("Autenticacion requerida.");
      return;
    }

    const proxyReq = http.request(
      {
        host: "127.0.0.1",
        port: PORT,
        method: clientReq.method,
        path: clientReq.url,
        headers: {
          ...clientReq.headers,
          host: `127.0.0.1:${PORT}`
        }
      },
      (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(clientRes);
      }
    );

    proxyReq.on("error", () => {
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      }
      clientRes.end("No fue posible conectar con la app local.");
    });

    clientReq.pipe(proxyReq);
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

const startCloudflared = () =>
  spawn(
    "cloudflared",
    ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${PROXY_PORT}`],
    {
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

const extractTunnelUrl = (text) => {
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  return match ? match[0] : null;
};

const main = async () => {
  console.log(`[remote] Iniciando servidor Vite en ${HOST}:${PORT}...`);
  const vite = startVite();
  const authProxy = startAuthProxy();
  let cloudflared = null;
  let publicUrl = null;

  vite.stdout.on("data", (chunk) => process.stdout.write(chunk.toString()));
  vite.stderr.on("data", (chunk) => process.stderr.write(chunk.toString()));

  const stopAll = () => {
    if (cloudflared && !cloudflared.killed) {
      cloudflared.kill("SIGTERM");
      cloudflared = null;
    }
    if (authProxy.listening) {
      authProxy.close();
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
    if (cloudflared && !cloudflared.killed) {
      cloudflared.kill("SIGTERM");
    }
    if (authProxy.listening) {
      authProxy.close();
    }
    process.exit(code ?? 1);
  });

  await new Promise((resolve, reject) => {
    authProxy.on("error", reject);
    authProxy.listen(PROXY_PORT, "127.0.0.1", resolve);
  });

  console.log(`[remote] Proxy con password activo en 127.0.0.1:${PROXY_PORT}.`);
  await waitForServer();

  console.log("[remote] Creando tunel HTTPS con Cloudflare...");
  cloudflared = startCloudflared();
  cloudflared.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    const maybeUrl = extractTunnelUrl(text);
    if (maybeUrl && !publicUrl) {
      publicUrl = maybeUrl;
      console.log(`[remote] URL publica: ${publicUrl}`);
      console.log(`[remote] Usuario: ${TUNNEL_USER}`);
      console.log(`[remote] Password: ${TUNNEL_PASSWORD}`);
    }
    process.stdout.write(text);
  });
  cloudflared.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    const maybeUrl = extractTunnelUrl(text);
    if (maybeUrl && !publicUrl) {
      publicUrl = maybeUrl;
      console.log(`[remote] URL publica: ${publicUrl}`);
      console.log(`[remote] Usuario: ${TUNNEL_USER}`);
      console.log(`[remote] Password: ${TUNNEL_PASSWORD}`);
    }
    process.stderr.write(text);
  });

  cloudflared.on("exit", (code) => {
    console.error(`[remote] cloudflared termino con codigo ${code}.`);
    stopAll();
    process.exit(code ?? 1);
  });

  const startedAt = Date.now();
  while (!publicUrl && Date.now() - startedAt < 30000) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!publicUrl) {
    throw new Error("No se obtuvo URL publica de cloudflared.");
  }
};

main().catch((error) => {
  console.error(`[remote] Error: ${error.message}`);
  process.exit(1);
});
