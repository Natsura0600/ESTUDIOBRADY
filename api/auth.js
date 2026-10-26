import { handler, send, readBody } from "./_lib/http.js";
import { checkPassword, sessionCookie, clearCookie, isAdmin } from "./_lib/auth.js";
import { storageMode, storageStatus } from "./_lib/store.js";

export default handler({
  GET: async (req, res) => {
    const admin = isAdmin(req);
    const out = { admin, storage: storageMode };
    if (admin) out.status = await storageStatus();
    send(res, 200, out, { "Cache-Control": "no-store" });
  },
  POST: async (req, res) => {
    const { password } = await readBody(req);
    if (!checkPassword(password)) {
      await new Promise((r) => setTimeout(r, 700)); // frena intentos por fuerza bruta
      return send(res, 401, { error: "Contraseña incorrecta" });
    }
    send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(), "Cache-Control": "no-store" });
  },
  DELETE: async (req, res) => send(res, 200, { ok: true }, { "Set-Cookie": clearCookie() }),
});
