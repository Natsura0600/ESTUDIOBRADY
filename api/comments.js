import { handler, send, readBody, query, httpError, clean, uid } from "./_lib/http.js";
import { requireAdmin } from "./_lib/auth.js";
import { getIndex, getPostById, getPostBySlug, savePost } from "./_lib/db.js";

export default handler({
  // Comentarios pendientes de todas las publicaciones (panel).
  GET: async (req, res) => {
    requireAdmin(req);
    const idx = (await getIndex()).filter((p) => p.pendingCount > 0);
    const posts = await Promise.all(idx.map((p) => getPostById(p.id)));
    const pending = posts.filter(Boolean).flatMap((p) =>
      (p.comments || [])
        .filter((c) => c.status === "pending")
        .map((c) => ({ ...c, postId: p.id, postTitle: p.title, postSlug: p.slug }))
    );
    send(res, 200, { pending }, { "Cache-Control": "no-store" });
  },

  // Comentario público: queda pendiente hasta que el estudio lo aprueba.
  POST: async (req, res) => {
    const b = await readBody(req);
    if (b.website) return send(res, 200, { ok: true }); // honeypot anti-spam
    if (Number(b.elapsed) > 0 && Number(b.elapsed) < 2500) throw httpError(429, "Esperá unos segundos antes de enviar.");

    const name = clean(b.name, 60);
    const text = clean(b.text, 1500);
    if (name.length < 2 || text.length < 5) throw httpError(400, "Completá tu nombre y un comentario de al menos 5 caracteres.");
    if ((text.match(/https?:\/\//g) || []).length > 2) throw httpError(400, "El comentario tiene demasiados enlaces.");

    const post = await getPostBySlug(clean(b.slug, 120));
    if (!post || !post.published) throw httpError(404, "Publicación no encontrada");
    const comments = post.comments || [];
    if (comments.filter((c) => c.status === "pending").length >= 60) throw httpError(429, "Hay muchos comentarios esperando moderación. Probá más tarde.");

    comments.push({
      id: uid(8),
      name,
      email: clean(b.email, 120),
      text,
      date: new Date().toISOString(),
      status: "pending",
      reply: "",
    });
    post.comments = comments;
    await savePost(post);
    send(res, 200, { ok: true, message: "¡Gracias! Tu comentario se publicará cuando el estudio lo revise." });
  },

  // Aprobar o responder.
  PATCH: async (req, res) => {
    requireAdmin(req);
    const { postId, commentId, action, reply } = await readBody(req);
    const post = await getPostById(postId);
    if (!post) throw httpError(404, "Publicación no encontrada");
    const c = (post.comments || []).find((x) => x.id === commentId);
    if (!c) throw httpError(404, "Comentario no encontrado");
    if (action === "approve") c.status = "approved";
    if (action === "hide") c.status = "pending";
    if (typeof reply === "string") c.reply = clean(reply, 1500);
    await savePost(post);
    send(res, 200, { ok: true, comment: c });
  },

  DELETE: async (req, res) => {
    requireAdmin(req);
    const { postId, commentId } = query(req);
    const post = await getPostById(postId);
    if (!post) throw httpError(404, "Publicación no encontrada");
    post.comments = (post.comments || []).filter((c) => c.id !== commentId);
    await savePost(post);
    send(res, 200, { ok: true });
  },
});
