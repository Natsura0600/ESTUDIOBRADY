import { $, $$, esc, icon, loadSite, renderChrome, observeReveals, postCard, coverHTML, fmtDate } from "./app.js";

const state = { cat: new URLSearchParams(location.search).get("c") || "Todas", q: "" };
let posts = [];
let categories = [];

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function render() {
  const q = norm(state.q);
  const filtered = posts.filter(
    (p) => (state.cat === "Todas" || p.category === state.cat) && (!q || norm(p.title + " " + p.excerpt + " " + p.category).includes(q))
  );

  $$("#cats button").forEach((b) => { b.classList.toggle("on", b.dataset.c === state.cat); b.setAttribute("aria-selected", b.dataset.c === state.cat); });

  const [first, ...rest] = filtered;
  const showFeature = first && !q;
  $("#feature").innerHTML = showFeature
    ? `<a class="feature-post post-card" href="/post?s=${encodeURIComponent(first.slug)}" data-reveal>
        <div class="cover"><span class="cat-badge">${esc(first.category)}</span>${first.pinned ? '<span class="pinned-badge">Destacado</span>' : ""}${coverHTML(first)}</div>
        <div>
          <div class="meta"><span>${fmtDate(first.date)}</span><i class="dot"></i><span>${esc(first.author || "Estudio")}</span></div>
          <h3 style="margin:14px 0 14px">${esc(first.title)}</h3>
          <p>${esc(first.excerpt)}</p>
          <div style="margin-top:22px;display:flex;gap:18px;align-items:center"><span class="link-u">Leer publicación ${icon("arrow", 15)}</span><span style="color:var(--muted);font-size:13.5px;display:inline-flex;gap:6px;align-items:center">${icon("chat", 15)} ${first.commentCount || 0}</span></div>
        </div>
      </a>`
    : "";
  const items = showFeature ? rest : filtered;
  $("#list").innerHTML = items.length
    ? items.map(postCard).join("")
    : showFeature ? "" : `<div class="forum-empty">${icon("search", 28)}<p style="margin-top:12px">No encontramos publicaciones${state.q ? ` para “${esc(state.q)}”` : " en esta categoría"}.</p></div>`;
  observeReveals($("main"));

  const url = new URL(location.href);
  if (state.cat === "Todas") url.searchParams.delete("c"); else url.searchParams.set("c", state.cat);
  history.replaceState(null, "", url);
}

(async function init() {
  try {
  $$("[data-ic]").forEach((el) => (el.innerHTML = icon(el.dataset.ic, el.classList.contains("arr") ? 14 : 18)));
  const data = await loadSite();
  renderChrome(data, "foro");
  posts = data.posts;
  categories = data.categories;
  const count = (c) => posts.filter((p) => p.category === c).length;

  $("#cats").innerHTML = ["Todas", ...categories.filter(count)]
    .map((c) => `<button role="tab" data-c="${esc(c)}">${esc(c)}<small>${c === "Todas" ? posts.length : count(c)}</small></button>`)
    .join("");
  $$("#cats button").forEach((b) => b.addEventListener("click", () => { state.cat = b.dataset.c; render(); }));

  let t;
  $("#q").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 180); });

  $("#side-notices").innerHTML = data.notices.length
    ? data.notices.slice(0, 4).map((n) => `<div class="mini-notice"><span class="chip ${esc(n.type)}">${esc(n.type)}</span><b>${esc(n.title)}</b><span>${fmtDate(n.date)}</span></div>`).join("")
    : `<p style="color:var(--muted);font-size:14px;margin:0">Sin avisos por ahora.</p>`;
  $("#side-cats").innerHTML = categories
    .map((c) => `<a href="?c=${encodeURIComponent(c)}" data-c="${esc(c)}">${icon("arrow", 15)} ${esc(c)} <span style="margin-left:auto;font-family:var(--mono);font-size:12px;color:var(--muted)">${count(c)}</span></a>`)
    .join("");
  $$("#side-cats a").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); state.cat = a.dataset.c; render(); scrollTo({ top: $(".forum-tools").offsetTop - 80, behavior: "smooth" }); }));

  if (!["Todas", ...categories].includes(state.cat)) state.cat = "Todas";
  render();
  observeReveals();
  } catch (e) {
    console.error(e);
    const m = document.querySelector("main");
    m?.insertAdjacentHTML("afterbegin", `<p style="padding:30px;text-align:center;color:#b4432f">No pudimos cargar el contenido (${String(e.message).replace(/</g, "&lt;")}). Probá recargar la página.</p>`);
    document.body.classList.add("ready");
    document.querySelectorAll("[data-reveal],.clip-up,[data-split]").forEach((el) => el.classList.add("in"));
  }
})();
