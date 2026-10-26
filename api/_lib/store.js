// Capa de almacenamiento: TODO vive en un bucket de Cloudflare R2
// (API compatible con S3). No hay base de datos: cada colección es un JSON.
//
// En desarrollo local, si no hay credenciales de R2, se usa la carpeta ./.data
// para poder probar sin internet. En Vercel siempre se usa R2.

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
} = process.env;

const BUCKET = String(R2_BUCKET || "").trim();
const useR2 = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);
const LOCAL_DIR = path.join(process.cwd(), ".data");

let client;
function s3() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${String(R2_ACCOUNT_ID).trim()}.r2.cloudflarestorage.com`,
      // R2 no acepta los checksums que el SDK agrega por defecto desde la v3.729
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: { accessKeyId: String(R2_ACCESS_KEY_ID).trim(), secretAccessKey: String(R2_SECRET_ACCESS_KEY).trim() },
    });
  }
  return client;
}

function assertConfigured() {
  if (!useR2 && process.env.VERCEL) {
    const err = new Error(
      "Faltan las variables de entorno de R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)."
    );
    err.status = 500;
    err.expose = true;
    throw err;
  }
}

function isNotFound(e) {
  if (e?.name === "NoSuchBucket") return false;
  return e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404 || e?.code === "ENOENT";
}

export async function getObject(key) {
  assertConfigured();
  try {
    if (useR2) {
      const out = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      const body = Buffer.from(await out.Body.transformToByteArray());
      return { body, contentType: out.ContentType || "application/octet-stream", etag: out.ETag };
    }
    const file = path.join(LOCAL_DIR, key);
    const body = await fs.readFile(file);
    let contentType = "application/octet-stream";
    try { contentType = (await fs.readFile(file + ".type", "utf8")).trim(); } catch {}
    return { body, contentType };
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

export async function putObject(key, body, contentType = "application/octet-stream") {
  assertConfigured();
  if (useR2) {
    try {
      await s3().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
    } catch (e) {
      const err = new Error("No se pudo guardar en R2: " + explainStorageError(e));
      err.status = 502; err.expose = true;
      throw err;
    }
    return;
  }
  const file = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
  await fs.writeFile(file + ".type", contentType);
}

export async function deleteObject(key) {
  assertConfigured();
  if (useR2) {
    await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return;
  }
  const file = path.join(LOCAL_DIR, key);
  await fs.rm(file, { force: true });
  await fs.rm(file + ".type", { force: true });
}

export async function getJSON(key, fallback) {
  const obj = await getObject(key);
  if (!obj) return typeof fallback === "function" ? fallback() : fallback;
  try {
    return JSON.parse(obj.body.toString("utf8"));
  } catch {
    return typeof fallback === "function" ? fallback() : fallback;
  }
}

export async function putJSON(key, data) {
  await putObject(key, Buffer.from(JSON.stringify(data, null, 2)), "application/json; charset=utf-8");
}

export const storageMode = useR2 ? "r2" : "local";

// Traduce los errores de R2 a algo entendible para el panel.
export function explainStorageError(e) {
  const code = e?.code === "ENOTFOUND" ? "ENOTFOUND" : e?.name || e?.Code || e?.code || "";
  const map = {
    NoSuchBucket: `El bucket "${BUCKET}" no existe en R2. Crealo o corregí R2_BUCKET en Vercel.`,
    InvalidAccessKeyId: "El R2_ACCESS_KEY_ID no es válido. Generá un token nuevo en R2 y actualizá la variable en Vercel.",
    SignatureDoesNotMatch: "El R2_SECRET_ACCESS_KEY no coincide con el Access Key. Revisá la variable en Vercel.",
    AccessDenied: "El token de R2 no tiene permiso sobre este bucket. Usá un token con 'Object Read & Write' para ese bucket.",
    ENOTFOUND: "No se encontró la cuenta de R2. Revisá R2_ACCOUNT_ID en Vercel.",
  };
  return map[code] || e?.message || "Error desconocido de almacenamiento";
}

// Prueba la conexión leyendo una clave que no existe: NoSuchKey = todo bien.
export async function storageStatus() {
  if (!useR2) {
    return process.env.VERCEL
      ? { ok: false, mode: "none", error: "Faltan las variables de R2 en Vercel (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET). Después de cargarlas hay que volver a desplegar." }
      : { ok: true, mode: "local" };
  }
  try {
    await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: "__ping__" }));
    return { ok: true, mode: "r2", bucket: BUCKET };
  } catch (e) {
    if (isNotFound(e) && e?.name !== "NoSuchBucket") return { ok: true, mode: "r2", bucket: BUCKET };
    return { ok: false, mode: "r2", bucket: BUCKET, error: explainStorageError(e) };
  }
}
