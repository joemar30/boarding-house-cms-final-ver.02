import "dotenv/config";
import express from "express";
import axios from "axios";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
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
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // PHP Backend Proxy Middleware
  // Since Vite's proxy config is often ignored in middleware mode, 
  // we add it directly to Express here.
  app.all("/php/*", async (req, res) => {
    try {
      // Rewrite /php/* to /boarding-house-cms/php/*
      const targetUrl = `http://localhost:80/boarding-house-cms${req.originalUrl}`;
      
      const proxyResponse = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        headers: {
          ...req.headers,
          host: "localhost",
        },
        params: req.query,
        validateStatus: () => true, // Forward all status codes
        responseType: "arraybuffer", // Use arraybuffer to pass through exactly
      });

      // Set headers from backend
      Object.entries(proxyResponse.headers).forEach(([k, v]) => {
        if (k !== "content-encoding" && v !== undefined) {
          res.setHeader(k, v);
        }
      });
      res.status(proxyResponse.status).send(proxyResponse.data);
    } catch (err: any) {
      console.error("[PHP Proxy Error]", err.message);
      res.status(502).json({ 
        error: "PHP Gateway Error", 
        message: "Failed to connect to Apache at localhost:80. Make sure XAMPP is running.",
        detail: err.message
      });
    }
  });

  // Local dev auth: simple login endpoint (only when LOCAL_DEV_AUTH is enabled)
  if (process.env.LOCAL_DEV_AUTH === "true") {
    app.get("/api/auth/dev-login", (_req, res) => {
      res.cookie("dev_logged_in", "true", {
        httpOnly: false,
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        path: "/",
      });
      console.log("[Dev Auth] Dev user logged in");
      res.redirect(302, "/");
    });
    app.get("/api/auth/dev-logout", (_req, res) => {
      res.clearCookie("dev_logged_in", { path: "/" });
      console.log("[Dev Auth] Dev user logged out");
      res.redirect(302, "/");
    });
  }

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
