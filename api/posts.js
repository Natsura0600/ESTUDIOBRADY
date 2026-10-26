import { handler, send, readBody, query, httpError, clean, uid, slugify } from "./_lib/http.js";
import { requireAdmin, isAdmin } from "./_lib/auth.js";
import { getIndex, getPostById, getPostBySlug, savePost, removePostFromIndex, KEYS } from "./_lib/db.js";
import { deleteObject } from "./_lib/store.js";
import { CATEGORIES, defaultPosts, postMeta } from "./_lib/defaults.js";

export default handler({
  GET: async (req, res) => {
    const { slug, id } = query(req);
    const admin = isAdmin(req);

    if (!slug && !id) {
      requireAdmin(req);
      const idx = await getIndex();
      return send(res, 200, { posts: idx }, { "Cache-Control": "no-store" });
    }

    let post, fallback = false;
    try {
      post = id ? await getPostById(id) : await getPostBySlug(slug);
    } catch (e) {
      if (admin) throw e;
      fallback = true;
      post = defaultPosts().find((p) => p.slug === slug || p.id === id) || null;
    }
    if (!post || (!post.published && !admin)) throw httpError(404, "Publicación no encontrada");

    const out = admin
      ? post
      : { ...post, comments: (post.comments || []).filter((c) => c.status === "approved").map(({ email, ...c }) => c) };

    // Relacionadas: misma categoría primero.
    const idx = (fallback ? defaultPosts().map(postMeta) : await getIndex().catch(() => defaultPosts().map(postMeta)))
      .filter((p) => p.published && p.id !== post.id);
    const related = [...idx.filter((p) => p.category === post.category), ...idx.filter((p) => p.category !== post.category)]
      .slice(0, 3)
      .map(({ pendingCount, ...p }) => p);

    send(res, 200, { post: out, related }, { "Cache-Control": admin ? "no-store" : "public, s-maxage=10, stale-while-revalidate=120" });
  },

  POST: async (req, res) => {
    requireAdmin(req);
    const b = await readBody(req);
    const title = clean(b.title, 180);
    if (!title) throw httpError(400, "El título es obligatorio");

    const existing = b.id ? await getPostById(b.id) : null;
    const idx = await getIndex();
    let slug = slugify(b.slug || title) || uid(6);
    if (idx.some((p) => p.slug === slug && p.id !== b.id)) slug = `${slug}-${uid(4).toLowerCase()}`;

    const post = {
      id: existing?.id || uid(10),
      slug,
      title,
      category: CATEGORIES.includes(b.category) ? b.category : CATEGORIES[0],
      author: clean(b.author, 80),
      date: clean(b.date, 40) || existing?.date || new Date().toISOString(),
      cover: clean(b.cover, 400),
      pinned: Boolean(b.pinned),
      published: b.published !== false,
      excerpt: clean(b.excerpt, 400),
      body: clean(b.body, 60000),
      comments: existing?.comments || [],
    };
    const meta = await savePost(post);
    send(res, 200, { ok: true, post: meta });
  },

  DELETE: async (req, res) => {
    requireAdmin(req);
    const { id } = query(req);
    if (!id) throw httpError(400, "Falta el id");
    await removePostFromIndex(id);
    await deleteObject(KEYS.post(id));
    send(res, 200, { ok: true });
  },
});
