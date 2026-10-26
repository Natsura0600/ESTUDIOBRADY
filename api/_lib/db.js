// Acceso a "colecciones" guardadas como JSON en R2.
//
//   site.json             → textos, planes, equipo, contacto, ubicación...
//   notices.json          → avisos informativos
//   posts/index.json      → listado liviano del foro
//   posts/<id>.json       → publicación completa + comentarios
//   messages.json         → consultas del formulario de contacto
//   uploads/<archivo>     → imágenes subidas desde el panel

import { getJSON, putJSON } from "./store.js";
import { defaultSite, defaultNotices, defaultPosts, postMeta } from "./defaults.js";

export const KEYS = {
  site: "site.json",
  notices: "notices.json",
  index: "posts/index.json",
  post: (id) => `posts/${id}.json`,
  messages: "messages.json",
};

// Mezcla superficial para que, si se agregan campos nuevos al sitio en el
// futuro, no rompa un site.json viejo.
function withDefaults(saved) {
  const base = defaultSite();
  if (!saved) return base;
  const out = { ...base, ...saved };
  for (const k of Object.keys(base)) {
    if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) && saved[k]) {
      out[k] = { ...base[k], ...saved[k] };
    }
  }
  return out;
}

export async function getSite() {
  return withDefaults(await getJSON(KEYS.site, null));
}
export const saveSite = (s) => putJSON(KEYS.site, s);

export const getNotices = () => getJSON(KEYS.notices, defaultNotices);
export const saveNotices = (n) => putJSON(KEYS.notices, n);

export async function getIndex() {
  const idx = await getJSON(KEYS.index, null);
  if (idx) return idx;
  return defaultPosts().map(postMeta);
}

export async function getPostById(id) {
  const post = await getJSON(KEYS.post(id), null);
  if (post) return post;
  const seeded = await getJSON(KEYS.index, null);
  if (!seeded) return defaultPosts().find((p) => p.id === id) || null;
  return null;
}

export async function getPostBySlug(slug) {
  const idx = await getIndex();
  const meta = idx.find((p) => p.slug === slug || p.id === slug);
  return meta ? getPostById(meta.id) : null;
}

// La primera vez que se escribe en el foro, se copian los posts de ejemplo a R2.
export async function ensureSeeded() {
  const idx = await getJSON(KEYS.index, null);
  if (idx) return idx;
  const posts = defaultPosts();
  await Promise.all(posts.map((p) => putJSON(KEYS.post(p.id), p)));
  const index = posts.map(postMeta);
  await putJSON(KEYS.index, index);
  return index;
}

export async function savePost(post) {
  const idx = await ensureSeeded();
  await putJSON(KEYS.post(post.id), post);
  const meta = postMeta(post);
  const i = idx.findIndex((p) => p.id === post.id);
  if (i >= 0) idx[i] = meta;
  else idx.unshift(meta);
  await putJSON(KEYS.index, idx);
  return meta;
}

export async function removePostFromIndex(id) {
  const idx = await ensureSeeded();
  await putJSON(KEYS.index, idx.filter((p) => p.id !== id));
}

export const getMessages = () => getJSON(KEYS.messages, []);
export const saveMessages = (m) => putJSON(KEYS.messages, m);
