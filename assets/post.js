import { $, $$, esc, icon, api, loadSite, renderChrome, observeReveals, postCard, coverHTML, fmtDate, timeAgo, initials, md, readTime, toast } from "./app.js";

const slug = new URLSearchParams(location.search).get("s");
const t0 = Date.now();

function commentHTML(c) {
  return `<div class="comment" data-reveal>
    <span class="av">${esc(initials(c.name))}</span>
    <div>
      <div class="ch"><b>${esc(c.name)}</b><span>${timeAgo(c.date)}</span></div>
      <p>${esc(c.text)}</p>
      ${c.reply ? `<div class="reply"><b>${icon("check", 13, 2.2)} Respuesta del estudio</b>${esc(c.reply)}</div>` : ""}
    </div>
  </div>`;
}

(async function init() {
  try {
  const [data, res] = await Promise.all([loadSite(), slug ? api(`/api/posts?slug=${encodeURIComponent(slug)}`).catch(() => null) : null]);
  renderChrome(data, "foro");
  const main = $("#article");

  if (!res) {
    main.innerHTML = `<section class="page-hero"><div class="wrap"><h1 class="h-lg">No encontramos esta publicación.</h1><p class="lead">Puede que se haya movido o eliminado.</p><a class="btn" href="/foro" style="margin-top:20px">Volver al foro <span class="arr">${icon("arrow", 14)}</span></a></div></section>`;
    return;
  }

  const { post, related } = res;
  const url = location.href;
  document.title = `${post.title} | ${data.site.brand.name}`;
  $('meta[name="description"]').content = post.excerpt || post.title;
  const comments = post.comments || [];

  main.innerHTML = `
    <div class="wrap">
      <header class="article-head">
        <nav class="crumbs"><a href="/">Inicio</a><span>/</span><a href="/foro">Foro</a><span>/</span><a href="/foro?c=${encodeURIComponent(post.category)}">${esc(post.category)}</a></nav>
        <h1 data-split>${esc(post.title)}</h1>
        <div class="byline" data-reveal>
          <span class="av">${esc(initials(post.author || "E"))}</span>
          <span><b>${esc(post.author || data.site.brand.name)}</b>${fmtDate(post.date, true)}</span>
          <span style="margin-left:auto;display:inline-flex;gap:16px">
            <span style="display:inline-flex;gap:6px;align-items:center">${icon("clock", 15)} ${readTime(post.body)} min de lectura</span>
            <a href="#comentarios" style="display:inline-flex;gap:6px;align-items:center">${icon("chat", 15)} ${comments.length}</a>
          </span>
        </div>
      </header>
      <div class="article-cover clip-up">${coverHTML(post)}</div>
      <div class="article-layout">
        <aside class="share" aria-label="Compartir">
          <a href="https://wa.me/?text=${encodeURIComponent(post.title + " " + url)}" target="_blank" rel="noopener" title="Compartir por WhatsApp">${icon("wa", 18)}</a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" rel="noopener" title="Compartir en LinkedIn">${icon("in", 18)}</a>
          <a href="mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(url)}" title="Enviar por email">${icon("mail", 18)}</a>
          <button id="copy" title="Copiar enlace">${icon("link", 18)}</button>
        </aside>
        <div>
          <article class="prose" data-reveal>${md(post.body)}</article>

          <section class="comments" id="comentarios">
            <h2>Comentarios <small>${comments.length}</small></h2>
            <div id="comment-list">${comments.length ? comments.map(commentHTML).join("") : `<p style="color:var(--muted)">Todavía no hay comentarios. ¡Hacé la primera pregunta!</p>`}</div>

            <form class="comment-form" id="cform" novalidate data-reveal>
              <h3>Dejá tu comentario o consulta</h3>
              <p>Los comentarios se publican después de ser revisados por el estudio. No compartas datos personales sensibles (CUIT, claves, montos de tu cuenta).</p>
              <div class="form" style="margin-top:12px">
                <div class="field"><input id="c-name" name="name" placeholder=" " required maxlength="60"><label for="c-name">Nombre</label></div>
                <div class="field"><input id="c-email" name="email" type="email" placeholder=" " maxlength="120"><label for="c-email">Email (opcional, no se publica)</label></div>
                <div class="field full"><textarea id="c-text" name="text" placeholder=" " required maxlength="1500"></textarea><label for="c-text">Comentario</label></div>
                <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
                <div class="full"><button class="btn light" type="submit">Publicar comentario <span class="arr">${icon("arrowUR", 14)}</span></button></div>
                <p class="form-msg" id="c-out" role="status"></p>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
    ${related.length ? `<section class="related"><div class="wrap"><div class="sec-head split"><div class="idx"><b>+</b> — Seguir leyendo</div><div><h2 class="h-lg" data-split>Publicaciones <em>relacionadas</em></h2></div><a class="btn ghost" href="/foro">Ver todo el foro <span class="arr">${icon("arrow", 14)}</span></a></div><div class="posts">${related.map(postCard).join("")}</div></div></section>` : ""}`;

  $("#copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(url); toast("Enlace copiado"); } catch { toast(url); }
  });

  const form = $("#cform");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const out = $("#c-out");
    const btn = $("button[type=submit]", form);
    const body = { ...Object.fromEntries(new FormData(form)), slug: post.slug, elapsed: Date.now() - t0 };
    btn.disabled = true;
    out.className = "form-msg";
    out.textContent = "Enviando…";
    try {
      const r = await api("/api/comments", { method: "POST", body });
      form.reset();
      out.className = "form-msg ok";
      out.textContent = r.message || "¡Gracias por tu comentario!";
    } catch (err) {
      out.className = "form-msg err";
      out.textContent = err.message;
    } finally { btn.disabled = false; }
  });

  const bar = $("#progress");
  const art = $(".prose");
  const onScroll = () => {
    const r = art.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight * 0.6)));
    bar.style.transform = `scaleX(${p})`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  observeReveals();
  } catch (e) {
    console.error(e);
    const m = document.querySelector("main");
    m?.insertAdjacentHTML("afterbegin", `<p style="padding:30px;text-align:center;color:#b4432f">No pudimos cargar el contenido (${String(e.message).replace(/</g, "&lt;")}). Probá recargar la página.</p>`);
    document.body.classList.add("ready");
    document.querySelectorAll("[data-reveal],.clip-up,[data-split]").forEach((el) => el.classList.add("in"));
  }
})();
