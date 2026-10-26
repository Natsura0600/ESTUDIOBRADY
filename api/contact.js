import { handler, send, readBody, query, httpError, clean, uid } from "./_lib/http.js";
import { requireAdmin } from "./_lib/auth.js";
import { getMessages, saveMessages } from "./_lib/db.js";

export default handler({
  GET: async (req, res) => {
    requireAdmin(req);
    send(res, 200, { messages: await getMessages() }, { "Cache-Control": "no-store" });
  },
  POST: async (req, res) => {
    const b = await readBody(req);
    if (b.website) return send(res, 200, { ok: true });
    const name = clean(b.name, 80);
    const email = clean(b.email, 120);
    const phone = clean(b.phone, 40);
    const message = clean(b.message, 3000);
    if (name.length < 2) throw httpError(400, "Ingresá tu nombre.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && phone.length < 6) throw httpError(400, "Dejanos un email o un teléfono para responderte.");
    if (message.length < 5) throw httpError(400, "Contanos brevemente tu consulta.");
    const list = await getMessages();
    list.unshift({ id: uid(8), name, email, phone, topic: clean(b.topic, 60), message, date: new Date().toISOString(), read: false });
    await saveMessages(list.slice(0, 500));
    send(res, 200, { ok: true });
  },
  PATCH: async (req, res) => {
    requireAdmin(req);
    const { id, read } = await readBody(req);
    const list = await getMessages();
    const m = list.find((x) => x.id === id);
    if (m) m.read = Boolean(read);
    await saveMessages(list);
    send(res, 200, { ok: true });
  },
  DELETE: async (req, res) => {
    requireAdmin(req);
    const { id } = query(req);
    await saveMessages((await getMessages()).filter((m) => m.id !== id));
    send(res, 200, { ok: true });
  },
});
