import { handler, send, readBody, query, httpError } from "./_lib/http.js";
import { requireAdmin, isAdmin } from "./_lib/auth.js";
import { getSite, saveSite, getNotices, getIndex } from "./_lib/db.js";
import { CATEGORIES, defaultSite, defaultNotices, defaultPosts, postMeta } from "./_lib/defaults.js";

const today = () => new Date().toISOString().slice(0, 10);

export function visibleNotices(list) {
  const t = today();
  return list
    .filter((n) => n.active !== false && (!n.until || n.until >= t))
    .sort((a, b) => (b.pinned - a.pinned) || String(b.date).localeCompare(String(a.date)));
}

export function sortPosts(list) {
  return [...list].sort((a, b) => (b.pinned - a.pinned) || String(b.date).localeCompare(String(a.date)));
}

export default handler({
  // Todo lo que necesita el sitio público en una sola llamada.
  GET: async (req, res) => {
    const admin = isAdmin(req);
    let site, notices, index, storageError;
    try {
      [site, notices, index] = await Promise.all([getSite(), getNotices(), getIndex()]);
    } catch (e) {
      // El panel tiene que ver el error real (para no pisar datos con el contenido base).
      if (admin) throw e;
      // El público ve el contenido base aunque R2 falle.
      console.error("R2 no disponible, se usa el contenido base:", e?.name || e?.message);
      site = defaultSite(); notices = defaultNotices(); index = defaultPosts().map(postMeta);
      storageError = true;
    }
    const fresh = query(req).fresh || admin || storageError;
    send(
      res,
      200,
      {
        site,
        notices: visibleNotices(notices),
        posts: sortPosts(index.filter((p) => p.published)).map(({ pendingCount, ...p }) => p),
        categories: CATEGORIES,
      },
      { "Cache-Control": fresh ? "no-store" : "public, s-maxage=15, stale-while-revalidate=300" }
    );
  },
  PUT: async (req, res) => {
    requireAdmin(req);
    const body = await readBody(req);
    if (!body || typeof body !== "object" || !body.brand) throw httpError(400, "Datos inválidos");
    const json = JSON.stringify(body);
    if (json.length > 400_000) throw httpError(413, "El contenido es demasiado grande");
    await saveSite(body);
    send(res, 200, { ok: true });
  },
});
