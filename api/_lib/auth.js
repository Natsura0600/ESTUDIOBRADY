// Sesión del panel: cookie firmada con HMAC. Sin base de datos.
import crypto from "node:crypto";
import { httpError } from "./http.js";

const COOKIE = "ec_admin";
const TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

function secret() {
  const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || (process.env.VERCEL ? "" : "dev-secret-local");
  if (!s) throw httpError(500, "Configurá ADMIN_PASSWORD y SESSION_SECRET en Vercel.");
  return s;
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function checkPassword(pass) {
  const real = process.env.ADMIN_PASSWORD || (process.env.VERCEL ? "" : "admin");
  if (!real) throw httpError(500, "Falta la variable ADMIN_PASSWORD.");
  const a = crypto.createHash("sha256").update(String(pass || "")).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export function sessionCookie() {
  const exp = Date.now() + TTL_MS;
  const payload = `admin.${exp}`;
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${TTL_MS / 1000}${secure}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function isAdmin(req) {
  const raw = req.headers.cookie || "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const parts = m[1].split(".");
  if (parts.length !== 3) return false;
  const [role, exp, sig] = parts;
  const expected = sign(`${role}.${exp}`);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return role === "admin" && Number(exp) > Date.now();
}

export function requireAdmin(req) {
  if (!isAdmin(req)) throw httpError(401, "Sesión vencida. Volvé a ingresar.");
}
