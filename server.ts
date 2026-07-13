import app from "./api/index";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

const PORT = 3000;

async function startServer() {
  // Treat Vercel deployments as production even if NODE_ENV is not explicitly set
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  // Vite middleware for development
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
