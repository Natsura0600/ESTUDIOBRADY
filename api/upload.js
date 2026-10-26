import { handler, send, readBody, httpError, uid } from "./_lib/http.js";
import { requireAdmin } from "./_lib/auth.js";
import { putObject } from "./_lib/store.js";

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export default handler({
  POST: async (req, res) => {
    requireAdmin(req);
    const { type, data } = await readBody(req);
    const ext = TYPES[type];
    if (!ext) throw httpError(400, "Formato no permitido. Usá JPG, PNG, WEBP o GIF.");
    const buf = Buffer.from(String(data || ""), "base64");
    if (!buf.length) throw httpError(400, "Archivo vacío");
    if (buf.length > 3.2 * 1024 * 1024) throw httpError(413, "La imagen supera los 3 MB");
    const d = new Date();
    const key = `uploads/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${uid(10)}.${ext}`;
    await putObject(key, buf, type);
    send(res, 200, { ok: true, url: `/api/media?k=${encodeURIComponent(key)}` });
  },
});
