// Servidor local que imita a Vercel: archivos estáticos + /api/*.
// Sin variables de R2 guarda los datos en ./.data (contraseña admin: "admin").
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

try {
  const env = await fs.readFile(".env", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const ROOT = process.cwd();
const PORT = process.env.PORT || 3000;
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".json": "application/json", ".txt": "text/plain" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api/")) {
      const name = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, "");
      const mod = await import(pathToFileURL(path.join(ROOT, "api", name + ".js")).href);
      return await mod.default(req, res);
    }
    let p = decodeURIComponent(url.pathname);
    if (p === "/") p = "/index.html";
    if (!path.extname(p)) p += ".html";
    const file = path.join(ROOT, path.normalize(p));
    if (!file.startsWith(ROOT) || file.includes(`${path.sep}api${path.sep}`)) throw new Error("forbidden");
    const data = await fs.readFile(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch (e) {
    if (!res.headersSent) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("404"); }
  }
}).listen(PORT, () => console.log(`→ http://localhost:${PORT}`));
