import crypto from "node:crypto";

export function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}

export async function readBody(req) {
  if (req.body !== undefined && req.body !== null && req.body !== "") {
    if (typeof req.body === "string") {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
    if (Buffer.isBuffer(req.body)) {
      try { return JSON.parse(req.body.toString("utf8")); } catch { return {}; }
    }
    return req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return {}; }
}

export function query(req) {
  const url = new URL(req.url, "http://x");
  return Object.fromEntries(url.searchParams.entries());
}

// Envuelve un handler: método permitido + errores prolijos.
export function handler(methods) {
  return async (req, res) => {
    const fn = methods[req.method];
    if (!fn) return send(res, 405, { error: "Método no permitido" });
    try {
      await fn(req, res);
    } catch (e) {
      if (!e.expose) console.error(e);
      send(res, e.status || 500, { error: e.expose || e.status ? e.message : "Error interno" });
    }
  };
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  e.expose = true;
  return e;
}

export const uid = (n = 10) => crypto.randomBytes(n).toString("base64url").slice(0, n);

export function slugify(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function clean(str, max = 2000) {
  return String(str ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}
