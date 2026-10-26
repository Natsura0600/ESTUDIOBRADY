import { handler, send, readBody, httpError, clean, uid } from "./_lib/http.js";
import { requireAdmin } from "./_lib/auth.js";
import { getNotices, saveNotices } from "./_lib/db.js";

const TYPES = ["vencimiento", "importante", "info"];

export default handler({
  GET: async (req, res) => {
    requireAdmin(req);
    send(res, 200, { notices: await getNotices() }, { "Cache-Control": "no-store" });
  },
  // El panel manda la lista completa ya editada.
  PUT: async (req, res) => {
    requireAdmin(req);
    const { notices } = await readBody(req);
    if (!Array.isArray(notices)) throw httpError(400, "Lista inválida");
    const cleanList = notices.slice(0, 100).map((n) => ({
      id: clean(n.id, 20) || uid(8),
      type: TYPES.includes(n.type) ? n.type : "info",
      title: clean(n.title, 140),
      text: clean(n.text, 1200),
      link: clean(n.link, 300),
      date: clean(n.date, 10) || new Date().toISOString().slice(0, 10),
      until: clean(n.until, 10),
      pinned: Boolean(n.pinned),
      active: n.active !== false,
    }));
    await saveNotices(cleanList);
    send(res, 200, { ok: true, notices: cleanList });
  },
});
