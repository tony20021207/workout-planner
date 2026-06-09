import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // CORS — required for the Vercel frontend (different origin) to call
  // this Railway API. CORS_ORIGINS is a comma-separated list of allowed
  // origins; defaults to '*' for backwards compat with the bundled
  // Manus deploy where frontend + backend share a host. In production
  // set CORS_ORIGINS to your Vercel domain (and any custom domains).
  const corsOrigins = (process.env.CORS_ORIGINS ?? "*").split(",").map((s) => s.trim());
  app.use(
    cors({
      origin: corsOrigins.length === 1 && corsOrigins[0] === "*" ? true : corsOrigins,
      credentials: true,
    }),
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check — used by Railway's deploy verification and any uptime
  // monitor. Returns 200 + a JSON heartbeat with no DB call so it stays
  // fast even when the DB is slow.
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true, ts: Date.now() });
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Serve static client bundle ONLY when explicitly configured.
  //   - Development: setupVite (Vite dev server middleware)
  //   - Production + SERVE_CLIENT=true: serve the built dist/public
  //     (the bundled Manus deploy uses this so one container serves both)
  //   - Production + SERVE_CLIENT=false (Railway default): API-only;
  //     Vercel serves the client separately. Skipping serveStatic here
  //     avoids 'dist/public not found' noise in Railway logs.
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else if (process.env.SERVE_CLIENT !== "false") {
    serveStatic(app);
  }

  // Production: bind directly to PORT (Railway provides this). Dev:
  // use the port-roaming logic so multiple dev servers can coexist.
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port =
    process.env.NODE_ENV === "production"
      ? preferredPort
      : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
