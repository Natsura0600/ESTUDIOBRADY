import { $, $$, esc, api, md, fmtDate, timeAgo } from "./app.js";

const S = {
  site: null,
  siteDirty: false,
  posts: [],
  categories: [],
  notices: [],
  pending: [],
  messages: [],
  storage: "",
  view: "dash",
};

// ---------------------------------------------------------------- utilidades
const clone = (o) => JSON.parse(JSON.stringify(o));
const getP = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const setP = (o, p, v) => { const ks = p.split("."); const last = ks.pop(); const t = ks.reduce((a, k) => (a[k] ??= {}), o); t[last] = v; };
const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

function toast(msg, bad = false) {
  const t = $(".toast");
  t.textContent = msg;
  t.style.background = bad ? "var(--red)" : "";
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 3000);
}

async function call(path, opts) {
  try { return await api(path, opts); }
  catch (e) {
    if (/Sesión vencida/.test(e.message)) showLogin();
    toast(e.message, true);
    throw e;
  }
}

// Redimensiona en el navegador antes de subir: imágenes livianas en R2.
async function uploadImage(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Elegí una imagen");
  let blob = file, type = file.type;
  if (type !== "image/gif") {
    const bmp = await createImageBitmap(file);
    const max = 1800;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    type = "image/webp";
    blob = await new Promise((r) => c.toBlob(r, type, 0.85));
    if (!blob) { type = "image/jpeg"; blob = await new Promise((r) => c.toBlob(r, type, 0.85)); }
  }
  const data = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1]);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
  const r = await call("/api/upload", { method: "POST", body: { type, data } });
  return r.url;
}

// ---------------------------------------------------------------- formularios por esquema
const ICONS = ["receipt", "scale", "users", "ledger", "building", "chart", "shield", "calc", "briefcase"];

const SCHEMAS = {
  brand: {
    title: "Marca y SEO",
    cards: [
      { title: "Identidad", hint: "Aparece en el encabezado, el pie y el título de la pestaña.", fields: [
        { k: "brand.name", label: "Nombre del estudio" },
        { k: "brand.descriptor", label: "Descriptor", hint: "Ej: Contadores Públicos" },
        { k: "brand.since", label: "Año de fundación", type: "number" },
      ] },
      { title: "Buscadores (SEO)", fields: [
        { k: "seo.title", label: "Título para Google", full: true },
        { k: "seo.description", label: "Descripción", type: "textarea", full: true, hint: "Entre 120 y 160 caracteres" },
      ] },
    ],
  },
  hero: {
    title: "Portada",
    cards: [
      { title: "Encabezado principal", fields: [
        { k: "hero.eyebrow", label: "Antetítulo", full: true },
        { k: "hero.title", label: "Título", type: "textarea", full: true, hint: "Cada renglón es una línea. La última se muestra en verde itálica." },
        { k: "hero.subtitle", label: "Bajada", type: "textarea", full: true },
        { k: "hero.ctaPrimary", label: "Botón principal" },
        { k: "hero.ctaSecondary", label: "Botón secundario" },
        { k: "hero.image", label: "Imagen de portada", type: "image", full: true, hint: "Opcional. Si no subís una, se muestra una ilustración contable." },
      ] },
    ],
  },
  about: {
    title: "El estudio",
    cards: [{ title: "Presentación", fields: [
      { k: "about.title", label: "Título", full: true },
      { k: "about.text", label: "Texto", type: "textarea", full: true, hint: "Dejá un renglón en blanco para separar párrafos." },
      { k: "about.points", label: "Puntos destacados", type: "strings", full: true, hint: "Uno por renglón" },
      { k: "about.image", label: "Foto del estudio", type: "image", full: true },
    ] }],
  },
  services: {
    title: "Servicios",
    cards: [{ title: "Áreas de servicio", hint: "Se muestran como lista interactiva en la página principal.", fields: [
      { k: "services", type: "list", itemLabel: (x) => x.title, template: { icon: "briefcase", title: "Nuevo servicio", text: "", items: [] }, fields: [
        { k: "title", label: "Nombre" },
        { k: "icon", label: "Ícono", type: "select", options: ICONS },
        { k: "text", label: "Descripción", type: "textarea", full: true },
        { k: "items", label: "Qué incluye", type: "strings", full: true, hint: "Uno por renglón" },
      ] },
    ] }],
  },
  team: {
    title: "Equipo",
    cards: [{ title: "Integrantes", fields: [
      { k: "team", type: "list", itemLabel: (x) => x.name, template: { name: "", role: "", bio: "", photo: "" }, fields: [
        { k: "name", label: "Nombre" },
        { k: "role", label: "Cargo" },
        { k: "bio", label: "Breve descripción", type: "textarea", full: true },
        { k: "photo", label: "Foto", type: "image", full: true, hint: "Sin foto se muestran las iniciales." },
      ] },
    ] }],
  },
  location: {
    title: "Ubicación y horarios",
    cards: [
      { title: "Dirección", fields: [
        { k: "location.address", label: "Dirección" },
        { k: "location.city", label: "Localidad / CP" },
        { k: "location.mapQuery", label: "Búsqueda para el mapa", full: true, hint: "Escribila como la buscarías en Google Maps. Es lo que ubica el pin." },
        { k: "location.howToGet", label: "Cómo llegar", type: "textarea", full: true },
      ] },
      { title: "Horarios", hint: "Formato sugerido: “Lunes a viernes” · “9:00 a 18:00” (así funciona el indicador “Abierto ahora”).", fields: [
        { k: "location.hours", type: "list", itemLabel: (x) => `${x.days} · ${x.time}`, template: { days: "", time: "" }, fields: [
          { k: "days", label: "Días" },
          { k: "time", label: "Horario" },
        ] },
      ] },
    ],
  },
  contact: {
    title: "Contacto y redes",
    cards: [{ title: "Canales", fields: [
      { k: "contact.phone", label: "Teléfono principal" },
      { k: "contact.phone2", label: "Teléfono alternativo" },
      { k: "contact.whatsapp", label: "WhatsApp", hint: "Solo números con código de país. Ej: 5491140000000" },
      { k: "contact.email", label: "Email" },
      { k: "contact.facebook", label: "Facebook (URL)" },
      { k: "contact.instagram", label: "Instagram (URL)" },
      { k: "contact.linkedin", label: "LinkedIn (URL)" },
    ] }],
  },
};

function markDirty() {
  S.siteDirty = true;
  const b = $("#save-site");
  if (b) { b.disabled = false; b.innerHTML = `<span class="dirty-dot"></span> Guardar cambios`; }
}

function imageField(value, onChange) {
  const el = h(`<div class="img-field">
    <div class="img-prev"></div>
    <div class="col">
      <input placeholder="URL de la imagen o subí una" value="${esc(value || "")}">
      <div class="row">
        <label class="btn ghost sm upload-btn">Subir imagen<input type="file" accept="image/*"></label>
        <button type="button" class="btn ghost sm" data-clear>Quitar</button>
      </div>
    </div>
  </div>`);
  const prev = $(".img-prev", el);
  const url = $("input:not([type=file])", el);
  const paint = () => { prev.style.backgroundImage = url.value ? `url("${url.value.replace(/"/g, "")}")` : ""; prev.textContent = url.value ? "" : "Sin imagen"; };
  paint();
  url.addEventListener("input", () => { paint(); onChange(url.value.trim()); });
  $("[data-clear]", el).addEventListener("click", () => { url.value = ""; paint(); onChange(""); });
  $("input[type=file]", el).addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    prev.textContent = "Subiendo…";
    try { url.value = await uploadImage(f); paint(); onChange(url.value); toast("Imagen subida"); }
    catch { paint(); }
    e.target.value = "";
  });
  return el;
}

function renderFields(container, obj, fields, onChange) {
  const grid = h(`<div class="grid2"></div>`);
  container.append(grid);
  for (const f of fields) {
    const val = getP(obj, f.k);
    const set = (v) => { setP(obj, f.k, v); onChange(); };

    if (f.type === "list") {
      const wrap = h(`<div class="full" style="grid-column:1/-1"></div>`);
      grid.append(wrap);
      const arr = Array.isArray(val) ? val : (setP(obj, f.k, []), getP(obj, f.k));
      const draw = () => {
        wrap.innerHTML = "";
        arr.forEach((item, i) => {
          const box = h(`<div class="list-item">
            <div class="list-item-head"><span class="num">${String(i + 1).padStart(2, "0")}</span><b>${esc(f.itemLabel?.(item) || "")}</b>
              <button type="button" class="icon-btn" data-a="up" title="Subir">↑</button>
              <button type="button" class="icon-btn" data-a="down" title="Bajar">↓</button>
              <button type="button" class="icon-btn red" data-a="del" title="Eliminar">✕</button>
            </div></div>`);
          renderFields(box, item, f.fields, () => { $("b", box).textContent = f.itemLabel?.(item) || ""; onChange(); });
          $$("[data-a]", box).forEach((b) => b.addEventListener("click", () => {
            const a = b.dataset.a;
            if (a === "del" && !confirm("¿Eliminar este elemento?")) return;
            if (a === "del") arr.splice(i, 1);
            if (a === "up" && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
            if (a === "down" && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
            draw(); onChange();
          }));
          wrap.append(box);
        });
        const add = h(`<button type="button" class="add-btn">+ Agregar</button>`);
        add.addEventListener("click", () => { arr.push(clone(f.template || {})); draw(); onChange(); wrap.lastElementChild.previousElementSibling?.scrollIntoView({ behavior: "smooth", block: "center" }); });
        wrap.append(add);
      };
      draw();
      continue;
    }

    const lab = h(`<label class="in ${f.full ? "full" : ""}"><span>${esc(f.label)}${f.hint ? ` <small>· ${esc(f.hint)}</small>` : ""}</span></label>`);
    let input;
    if (f.type === "textarea") {
      input = h(`<textarea></textarea>`); input.value = val ?? "";
      input.addEventListener("input", () => set(input.value));
    } else if (f.type === "strings") {
      input = h(`<textarea></textarea>`); input.value = (val || []).join("\n");
      input.addEventListener("input", () => set(input.value.split("\n").map((s) => s.trim()).filter(Boolean)));
    } else if (f.type === "number") {
      input = h(`<input type="number" step="any">`); input.value = val ?? "";
      input.addEventListener("input", () => set(input.value === "" ? "" : Number(input.value)));
    } else if (f.type === "bool") {
      lab.className = "check";
      lab.innerHTML = `<input type="checkbox" ${val ? "checked" : ""}> ${esc(f.label)}`;
      $("input", lab).addEventListener("change", (e) => set(e.target.checked));
      grid.append(lab);
      continue;
    } else if (f.type === "select") {
      input = h(`<select>${f.options.map((o) => `<option ${o === val ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`);
      input.addEventListener("change", () => set(input.value));
    } else if (f.type === "image") {
      input = imageField(val, set);
    } else if (f.type === "date") {
      input = h(`<input type="date">`); input.value = val ?? "";
      input.addEventListener("input", () => set(input.value));
    } else {
      input = h(`<input>`); input.value = val ?? "";
      input.addEventListener("input", () => set(input.value));
    }
    lab.append(input);
    grid.append(lab);
  }
}

// ---------------------------------------------------------------- vistas
function setActions(html) { $("#topbar-actions").innerHTML = html; }

const VIEWS = {
  async dash(v) {
    $("#view-title").textContent = "Resumen";
    setActions(`<a class="btn sm" href="/" target="_blank" rel="noopener">Ver sitio ↗</a>`);
    const unread = S.messages.filter((m) => !m.read).length;
    const activeNotices = S.notices.filter((n) => n.active !== false && (!n.until || n.until >= new Date().toISOString().slice(0, 10))).length;
    v.innerHTML = `
      <div class="kpis">
        <div class="kpi" data-go="posts"><div class="v">${S.posts.filter((p) => p.published).length}</div><div class="l">Publicaciones en el foro</div></div>
        <div class="kpi ${S.pending.length ? "warn" : ""}" data-go="moderation"><div class="v">${S.pending.length}</div><div class="l">Comentarios por revisar</div></div>
        <div class="kpi ${unread ? "warn" : ""}" data-go="messages"><div class="v">${unread}</div><div class="l">Consultas sin leer</div></div>
        <div class="kpi" data-go="notices"><div class="v">${activeNotices}</div><div class="l">Avisos vigentes</div></div>
      </div>
      <div class="grid2">
        <div class="card"><h2>Accesos rápidos</h2><p class="hint">Lo que más se usa en el día a día.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn sm" data-go="posts:new">+ Nueva publicación</button>
            <button class="btn ghost sm" data-go="notices">Publicar un aviso</button>
            <button class="btn ghost sm" data-go="site:services">Editar servicios</button>
          </div>
        </div>
        <div class="card"><h2>Almacenamiento</h2><p class="hint">Todo el contenido, comentarios e imágenes se guardan en Cloudflare R2.</p>
          ${storageBadge()}
        </div>
      </div>
      <div class="card"><h2>Últimas consultas</h2><p class="hint">Mensajes del formulario de contacto.</p>
        ${S.messages.slice(0, 4).map((m) => `<div class="cmt ${m.read ? "" : "unread"}" style="margin-bottom:8px"><div class="cmt-head"><b>${esc(m.name)}</b><span>${esc(m.topic || "")} · ${timeAgo(m.date)}</span></div><p style="margin:0">${esc(m.message.slice(0, 160))}${m.message.length > 160 ? "…" : ""}</p></div>`).join("") || `<p style="color:var(--muted);margin:0">Todavía no llegaron consultas.</p>`}
      </div>`;
    $$("[data-go]", v).forEach((b) => b.addEventListener("click", () => {
      const g = b.dataset.go;
      if (g === "posts:new") return go("posts", { edit: "new" });
      go(g);
    }));
  },

  async posts(v, opts = {}) {
    if (opts.edit) return postEditor(v, opts.edit);
    $("#view-title").textContent = "Foro";
    setActions(`<button class="btn sm" id="new-post">+ Nueva publicación</button>`);
    $("#new-post").onclick = () => go("posts", { edit: "new" });
    const sorted = [...S.posts].sort((a, b) => (b.pinned - a.pinned) || String(b.date).localeCompare(String(a.date)));
    v.innerHTML = sorted.length
      ? `<table class="table"><thead><tr><th>Título</th><th class="hide-sm">Categoría</th><th class="hide-sm">Fecha</th><th>Estado</th><th></th></tr></thead><tbody>
        ${sorted.map((p) => `<tr>
          <td><div class="t">${esc(p.title)}</div><small style="color:var(--muted)">${p.commentCount} comentarios${p.pendingCount ? ` · <b style="color:var(--amber)">${p.pendingCount} por revisar</b>` : ""}</small></td>
          <td class="hide-sm">${esc(p.category)}</td>
          <td class="hide-sm">${fmtDate(p.date)}</td>
          <td>${p.pinned ? '<span class="pill pin">Destacado</span> ' : ""}${p.published ? '<span class="pill">Publicado</span>' : '<span class="pill draft">Borrador</span>'}</td>
          <td><div class="acts">
            <a class="icon-btn" href="/post?s=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener" title="Ver">↗</a>
            <button class="icon-btn" data-edit="${p.id}" title="Editar">✎</button>
            <button class="icon-btn red" data-del="${p.id}" title="Eliminar">✕</button>
          </div></td></tr>`).join("")}
      </tbody></table>`
      : `<div class="empty"><b>Todavía no hay publicaciones</b>Creá la primera con el botón de arriba.</div>`;
    $$("[data-edit]", v).forEach((b) => b.addEventListener("click", () => go("posts", { edit: b.dataset.edit })));
    $$("[data-del]", v).forEach((b) => b.addEventListener("click", async () => {
      const p = S.posts.find((x) => x.id === b.dataset.del);
      if (!confirm(`¿Eliminar “${p.title}” y sus comentarios? No se puede deshacer.`)) return;
      await call(`/api/posts?id=${encodeURIComponent(p.id)}`, { method: "DELETE" });
      S.posts = S.posts.filter((x) => x.id !== p.id);
      toast("Publicación eliminada");
      badges(); VIEWS.posts(v);
    }));
  },

  async moderation(v) {
    $("#view-title").textContent = "Moderación";
    setActions(`<button class="btn ghost sm" id="reload-mod">Actualizar</button>`);
    $("#reload-mod").onclick = async () => { await loadPending(); VIEWS.moderation(v); };
    if (!S.pending.length) {
      v.innerHTML = `<div class="empty"><b>Todo al día</b>No hay comentarios esperando revisión.</div>`;
      return;
    }
    v.innerHTML = "";
    for (const c of S.pending) v.append(commentBox(c, { postId: c.postId, postTitle: c.postTitle, postSlug: c.postSlug }, async () => { await loadPending(); await loadPosts(); badges(); VIEWS.moderation(v); }));
  },

  async notices(v) {
    $("#view-title").textContent = "Avisos";
    setActions(`<button class="btn sm" id="save-notices" disabled>Guardado</button>`);
    const list = clone(S.notices);
    const btn = $("#save-notices");
    const dirty = () => { btn.disabled = false; btn.innerHTML = `<span class="dirty-dot"></span> Guardar avisos`; };
    btn.onclick = async () => {
      btn.disabled = true;
      const r = await call("/api/notices", { method: "PUT", body: { notices: list } }).catch(() => (btn.disabled = false));
      if (r?.notices) { S.notices = r.notices; btn.textContent = "Guardado"; toast("Avisos publicados"); }
    };
    const card = h(`<div class="card"><h2>Avisos informativos</h2><p class="hint">Se muestran en la barra superior del sitio, en la sección Avisos y en el foro. Un aviso deja de mostrarse solo después de su fecha “Visible hasta”.</p></div>`);
    v.innerHTML = "";
    v.append(card);
    renderFields(card, { list }, [
      { k: "list", type: "list", itemLabel: (x) => `${x.active === false ? "⏸ " : ""}${x.title || "Sin título"}`, template: { id: "", type: "info", title: "", text: "", link: "", date: new Date().toISOString().slice(0, 10), until: "", pinned: false, active: true }, fields: [
        { k: "title", label: "Título", full: true },
        { k: "type", label: "Tipo", type: "select", options: ["info", "vencimiento", "importante"] },
        { k: "link", label: "Enlace (opcional)" },
        { k: "text", label: "Texto", type: "textarea", full: true },
        { k: "date", label: "Fecha de publicación", type: "date" },
        { k: "until", label: "Visible hasta", type: "date", hint: "vacío = sin vencimiento" },
        { k: "active", label: "Activo", type: "bool" },
        { k: "pinned", label: "Fijar arriba", type: "bool" },
      ] },
    ], dirty);
  },

  async messages(v) {
    $("#view-title").textContent = "Consultas";
    setActions(`<button class="btn ghost sm" id="reload-msg">Actualizar</button>`);
    $("#reload-msg").onclick = async () => { await loadMessages(); badges(); VIEWS.messages(v); };
    if (!S.messages.length) { v.innerHTML = `<div class="empty"><b>Sin consultas</b>Cuando alguien complete el formulario de contacto, aparece acá.</div>`; return; }
    v.innerHTML = S.messages.map((m) => `
      <div class="cmt ${m.read ? "" : "unread"}" data-id="${m.id}">
        <div class="cmt-head"><b>${esc(m.name)}</b><span>${esc(m.topic || "Consulta")} · ${fmtDate(m.date)} · ${timeAgo(m.date)}</span></div>
        <div class="cmt-head">${m.email ? `<a href="mailto:${esc(m.email)}?subject=${encodeURIComponent("Tu consulta a " + S.site.brand.name)}">${esc(m.email)}</a>` : ""}${m.phone ? `<a href="https://wa.me/${esc(m.phone.replace(/\D/g, ""))}" target="_blank" rel="noopener">WhatsApp ${esc(m.phone)}</a>` : ""}</div>
        <p>${esc(m.message)}</p>
        <div class="acts"><button class="btn ghost sm" data-read>${m.read ? "Marcar como no leída" : "Marcar como leída"}</button><button class="btn danger sm" data-del>Eliminar</button></div>
      </div>`).join("");
    $$(".cmt", v).forEach((box) => {
      const m = S.messages.find((x) => x.id === box.dataset.id);
      $("[data-read]", box).onclick = async () => { m.read = !m.read; await call("/api/contact", { method: "PATCH", body: { id: m.id, read: m.read } }); badges(); VIEWS.messages(v); };
      $("[data-del]", box).onclick = async () => {
        if (!confirm("¿Eliminar esta consulta?")) return;
        await call(`/api/contact?id=${m.id}`, { method: "DELETE" });
        S.messages = S.messages.filter((x) => x.id !== m.id); badges(); VIEWS.messages(v);
      };
    });
  },
};

function siteView(v, key) {
  const sc = SCHEMAS[key];
  $("#view-title").textContent = sc.title;
  setActions(`<a class="btn ghost sm" href="/" target="_blank" rel="noopener">Ver sitio ↗</a><button class="btn sm" id="save-site" ${S.siteDirty ? "" : "disabled"}>${S.siteDirty ? '<span class="dirty-dot"></span> Guardar cambios' : "Guardado"}</button>`);
  $("#save-site").onclick = saveSite;
  v.innerHTML = "";
  for (const c of sc.cards) {
    const card = h(`<div class="card"><h2>${esc(c.title)}</h2>${c.hint ? `<p class="hint">${esc(c.hint)}</p>` : '<div style="height:12px"></div>'}</div>`);
    renderFields(card, S.site, c.fields, markDirty);
    v.append(card);
  }
}

async function saveSite() {
  const b = $("#save-site");
  if (b) b.disabled = true;
  try {
    await call("/api/site", { method: "PUT", body: S.site });
    S.siteDirty = false;
    $("#side-name").textContent = S.site.brand.name;
    if (b) b.textContent = "Guardado";
    toast("Cambios publicados en el sitio");
  } catch { if (b) b.disabled = false; }
}

// ---------------------------------------------------------------- comentarios
function commentBox(c, ctx, refresh) {
  const box = h(`<div class="cmt ${c.status === "pending" ? "unread" : ""}">
    <div class="cmt-head"><b>${esc(c.name)}</b><span>${timeAgo(c.date)}${c.email ? ` · ${esc(c.email)}` : ""}</span>
      ${ctx.postTitle ? `<a href="/post?s=${encodeURIComponent(ctx.postSlug)}" target="_blank" rel="noopener">en “${esc(ctx.postTitle)}” ↗</a>` : ""}
      ${c.status === "pending" ? '<span class="pill draft">Pendiente</span>' : '<span class="pill">Publicado</span>'}</div>
    <p>${esc(c.text)}</p>
    <textarea placeholder="Respuesta del estudio (opcional, se muestra debajo del comentario)">${esc(c.reply || "")}</textarea>
    <div class="acts">
      ${c.status === "pending" ? '<button class="btn sm" data-a="approve">Aprobar y publicar</button>' : '<button class="btn ghost sm" data-a="hide">Ocultar</button>'}
      <button class="btn ghost sm" data-a="reply">Guardar respuesta</button>
      <button class="btn danger sm" data-a="del">Eliminar</button>
    </div></div>`);
  const ta = $("textarea", box);
  $$("[data-a]", box).forEach((b) => b.addEventListener("click", async () => {
    const a = b.dataset.a;
    if (a === "del") {
      if (!confirm("¿Eliminar el comentario?")) return;
      await call(`/api/comments?postId=${encodeURIComponent(ctx.postId)}&commentId=${encodeURIComponent(c.id)}`, { method: "DELETE" });
      toast("Comentario eliminado");
    } else {
      await call("/api/comments", { method: "PATCH", body: { postId: ctx.postId, commentId: c.id, action: a === "reply" ? undefined : a, reply: ta.value } });
      toast(a === "approve" ? "Comentario publicado" : a === "hide" ? "Comentario oculto" : "Respuesta guardada");
    }
    refresh();
  }));
  return box;
}

// ---------------------------------------------------------------- editor de publicaciones
async function postEditor(v, id) {
  const isNew = id === "new";
  $("#view-title").textContent = isNew ? "Nueva publicación" : "Editar publicación";
  let post = isNew
    ? { title: "", category: S.categories[0], author: S.site.team?.[0]?.name || "", date: new Date().toISOString(), cover: "", pinned: false, published: true, excerpt: "", body: "", comments: [] }
    : (await call(`/api/posts?id=${encodeURIComponent(id)}`)).post;

  setActions(`<button class="btn ghost sm" id="back">← Volver</button><button class="btn sm" id="save-post">${isNew ? "Publicar" : "Guardar"}</button>`);
  $("#back").onclick = () => go("posts");

  v.innerHTML = `
    <div class="editor">
      <div>
        <div class="card">
          <label class="in full" style="margin-bottom:14px"><span>Título</span><input id="p-title" value="${esc(post.title)}" placeholder="Ej: Cambios en la recategorización del Monotributo" style="font-size:18px;font-weight:600"></label>
          <label class="in full" style="margin-bottom:14px"><span>Resumen <small>· aparece en las tarjetas del foro</small></span><textarea id="p-excerpt" style="min-height:70px">${esc(post.excerpt)}</textarea></label>
          <div class="tabs"><button class="on" data-tab="write">Escribir</button><button data-tab="preview">Vista previa</button></div>
          <div id="write">
            <div class="toolbar">
              <button type="button" data-md="h2">Título</button><button type="button" data-md="h3">Subtítulo</button>
              <button type="button" data-md="b"><b>N</b></button><button type="button" data-md="i"><i>K</i></button>
              <button type="button" data-md="ul">• Lista</button><button type="button" data-md="ol">1. Lista</button>
              <button type="button" data-md="quote">“ Cita</button><button type="button" data-md="link">Enlace</button>
              <label class="upload-btn" style="padding:6px 10px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">Imagen<input type="file" accept="image/*" id="body-img"></label>
            </div>
            <textarea id="p-body" class="in" style="width:100%;padding:14px;border:1px solid var(--line-2);border-radius:10px;outline:none">${esc(post.body)}</textarea>
            <p style="font-size:12.5px;color:var(--muted);margin:8px 0 0">Formato: <code>## Título</code>, <code>**negrita**</code>, <code>*itálica*</code>, <code>- lista</code>, <code>[texto](https://...)</code>. Dejá un renglón en blanco entre párrafos.</p>
          </div>
          <div id="preview" class="preview prose" hidden></div>
        </div>
        <div id="post-comments"></div>
      </div>
      <div>
        <div class="card">
          <h2 style="font-size:18px;margin-bottom:14px">Publicación</h2>
          <div style="display:grid;gap:14px">
            <label class="check"><input type="checkbox" id="p-published" ${post.published ? "checked" : ""}> Publicada</label>
            <label class="check"><input type="checkbox" id="p-pinned" ${post.pinned ? "checked" : ""}> Destacada (arriba del foro)</label>
            <label class="in"><span>Categoría</span><select id="p-category">${S.categories.map((c) => `<option ${c === post.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
            <label class="in"><span>Autor</span><input id="p-author" value="${esc(post.author)}" list="authors"><datalist id="authors">${(S.site.team || []).map((m) => `<option value="${esc(m.name)}">`).join("")}</datalist></label>
            <label class="in"><span>Fecha</span><input type="date" id="p-date" value="${esc(String(post.date).slice(0, 10))}"></label>
          </div>
        </div>
        <div class="card"><h2 style="font-size:18px;margin-bottom:14px">Imagen de portada</h2><div id="p-cover"></div><p class="hint" style="margin:10px 0 0;font-size:13px">Sin imagen se genera una portada automática según la categoría.</p></div>
        ${!isNew ? `<div class="card"><a class="btn ghost sm" href="/post?s=${encodeURIComponent(post.slug)}" target="_blank" rel="noopener">Ver publicación ↗</a></div>` : ""}
      </div>
    </div>`;

  $("#p-cover").append(imageField(post.cover, (u) => (post.cover = u)));

  const body = $("#p-body");
  const wrapSel = (before, after = "", placeholder = "texto") => {
    const s = body.selectionStart, e = body.selectionEnd;
    const sel = body.value.slice(s, e) || placeholder;
    body.setRangeText(before + sel + after, s, e, "end");
    body.focus();
  };
  const linePrefix = (prefix) => {
    const s = body.selectionStart;
    const ls = body.value.lastIndexOf("\n", s - 1) + 1;
    body.setRangeText(prefix, ls, ls, "end");
    body.focus();
  };
  $$("[data-md]", v).forEach((b) => b.addEventListener("click", () => {
    ({
      h2: () => linePrefix("## "), h3: () => linePrefix("### "), ul: () => linePrefix("- "), ol: () => linePrefix("1. "), quote: () => linePrefix("> "),
      b: () => wrapSel("**", "**"), i: () => wrapSel("*", "*"),
      link: () => { const u = prompt("Dirección del enlace (https://…)"); if (u) wrapSel("[", `](${u})`, "texto del enlace"); },
    })[b.dataset.md]();
  }));
  $("#body-img").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    toast("Subiendo imagen…");
    try { const u = await uploadImage(f); body.setRangeText(`\n\n![imagen](${u})\n\n`, body.selectionStart, body.selectionStart, "end"); toast("Imagen insertada"); } catch {}
    e.target.value = "";
  });

  $$(".tabs button", v).forEach((b) => b.addEventListener("click", () => {
    $$(".tabs button", v).forEach((x) => x.classList.toggle("on", x === b));
    const prev = b.dataset.tab === "preview";
    $("#write").hidden = prev;
    $("#preview").hidden = !prev;
    if (prev) $("#preview").innerHTML = md(body.value) || "<p style='color:var(--muted)'>Nada para mostrar todavía.</p>";
  }));

  $("#save-post").onclick = async () => {
    const payload = {
      id: isNew ? undefined : post.id,
      title: $("#p-title").value,
      excerpt: $("#p-excerpt").value,
      body: body.value,
      category: $("#p-category").value,
      author: $("#p-author").value,
      date: $("#p-date").value ? new Date($("#p-date").value + "T12:00:00").toISOString() : post.date,
      cover: post.cover,
      pinned: $("#p-pinned").checked,
      published: $("#p-published").checked,
    };
    if (!payload.title.trim()) return toast("Poné un título", true);
    $("#save-post").disabled = true;
    try {
      const r = await call("/api/posts", { method: "POST", body: payload });
      await loadPosts();
      toast(isNew ? "Publicación creada" : "Cambios guardados");
      go("posts", { edit: r.post.id });
    } catch { $("#save-post").disabled = false; }
  };

  // Comentarios de esta publicación
  const cm = $("#post-comments");
  if (!isNew && post.comments?.length) {
    cm.innerHTML = `<div class="card" style="padding-bottom:10px"><h2>Comentarios (${post.comments.length})</h2><p class="hint">Aprobá, respondé u ocultá los comentarios de esta publicación.</p></div>`;
    const card = cm.firstElementChild;
    [...post.comments].reverse().forEach((c) => card.append(commentBox(c, { postId: post.id }, async () => { await loadPosts(); await loadPending(); badges(); postEditor(v, post.id); })));
  }
}

function storageBadge() {
  const st = S.status || {};
  if (st.ok && st.mode === "r2") return `<span class="storage">● Conectado a R2 · bucket “${esc(st.bucket)}”</span>`;
  if (st.ok && st.mode === "local") return `<span class="storage local">● Modo local (.data) — en Vercel se usa R2</span>`;
  return `<span class="storage local" style="background:#fbe7e2;color:#9a3523;white-space:normal;line-height:1.5">● Sin conexión a R2: ${esc(st.error || "error desconocido")}</span>`;
}

// ---------------------------------------------------------------- carga y navegación
async function loadPosts() { const r = await call("/api/posts"); S.posts = r.posts; }
async function loadPending() { S.pending = (await call("/api/comments")).pending; }
async function loadMessages() { S.messages = (await call("/api/contact")).messages; }
async function loadAll() {
  const [site, notices] = await Promise.all([call("/api/site?fresh=1"), call("/api/notices"), loadPosts(), loadPending(), loadMessages()]);
  S.site = clone(site.site);
  S.categories = site.categories;
  S.notices = notices.notices;
  $("#side-name").textContent = S.site.brand.name;
}

function badges() {
  $("#b-posts").textContent = S.posts.length || "";
  $("#b-mod").textContent = S.pending.length || "";
  $("#b-msg").textContent = S.messages.filter((m) => !m.read).length || "";
}

async function go(view, opts) {
  if (S.siteDirty && !view.startsWith("site:") && !confirm("Tenés cambios del sitio sin guardar. ¿Salir igual?")) return;
  if (S.siteDirty && !view.startsWith("site:")) { S.siteDirty = false; await loadAll(); }
  S.view = view;
  $$("#side-nav button").forEach((b) => b.classList.toggle("on", b.dataset.view === view));
  $("#app").classList.remove("menu-open");
  const v = $("#view");
  v.innerHTML = "";
  scrollTo(0, 0);
  if (view.startsWith("site:")) siteView(v, view.slice(5));
  else await VIEWS[view](v, opts);
  if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
}

function showLogin() {
  $("#app").hidden = true;
  $("#login").hidden = false;
}

async function start() {
  $("#login").hidden = true;
  $("#app").hidden = false;
  try {
    await loadAll();
  } catch (e) {
    $("#view-title").textContent = "Problema con el almacenamiento";
    $("#view").innerHTML = `<div class="card"><h2>No se pudieron leer los datos</h2>
      <p class="hint">El sitio público sigue mostrando el contenido base, pero el panel necesita R2 para guardar cambios.</p>
      ${storageBadge()}<p style="margin-top:14px;color:var(--muted)">Detalle: ${esc(e.message)}</p>
      <button class="btn sm" style="margin-top:14px" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }
  badges();
  const initial = location.hash.slice(1);
  go(initial && (VIEWS[initial] || SCHEMAS[initial.replace("site:", "")]) ? initial : "dash");
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#login-err");
  err.textContent = "";
  const btn = $("button", e.target);
  btn.disabled = true;
  try {
    await api("/api/auth", { method: "POST", body: { password: e.target.password.value } });
    e.target.reset();
    const st = await api("/api/auth").catch(() => ({}));
    S.status = st.status;
    await start();
  } catch (ex) { err.textContent = ex.message; }
  finally { btn.disabled = false; }
});

$$("#side-nav button").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));
$("#menu-btn").addEventListener("click", () => $("#app").classList.toggle("menu-open"));
$("#logout").addEventListener("click", async () => { await api("/api/auth", { method: "DELETE" }); location.reload(); });
addEventListener("beforeunload", (e) => { if (S.siteDirty) { e.preventDefault(); e.returnValue = ""; } });
addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    ($("#save-site:not([disabled])") || $("#save-post") || $("#save-notices:not([disabled])"))?.click();
  }
});

(async () => {
  const s = await api("/api/auth").catch(() => ({ admin: false }));
  S.storage = s.storage;
  S.status = s.status;
  if (s.admin) start();
  else showLogin();
})();
