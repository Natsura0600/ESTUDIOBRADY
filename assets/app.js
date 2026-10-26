// Utilidades compartidas por todas las páginas públicas.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body && typeof opts.body !== "string" ? JSON.stringify(opts.body) : opts.body,
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// ---------- Formatos ----------
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fmtDate(iso, long = false) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  if (isNaN(d)) return "";
  if (long) return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return "recién";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 7) return `hace ${Math.floor(s / 86400)} d`;
  return fmtDate(iso);
}
export const money = (n) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Number(n) || 0);
export const initials = (name) => String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
export const readTime = (text) => Math.max(1, Math.round(String(text || "").split(/\s+/).length / 210));

// ---------- Markdown mínimo y seguro ----------
export function md(src) {
  const inline = (t) =>
    esc(t)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
      .replace(/!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|mailto:)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const lines = String(src || "").replace(/\r/g, "").split("\n");
  let html = "", list = null, para = [];
  const flushP = () => { if (para.length) { html += `<p>${inline(para.join(" "))}</p>`; para = []; } };
  const flushL = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const l = raw.trim();
    let m;
    if (!l) { flushP(); flushL(); continue; }
    if ((m = l.match(/^(#{2,3})\s+(.*)/))) { flushP(); flushL(); html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; continue; }
    if (l === "---") { flushP(); flushL(); html += "<hr>"; continue; }
    if ((m = l.match(/^>\s?(.*)/))) { flushP(); flushL(); html += `<blockquote>${inline(m[1])}</blockquote>`; continue; }
    if ((m = l.match(/^[-*]\s+(.*)/))) { flushP(); if (list !== "ul") { flushL(); html += "<ul>"; list = "ul"; } html += `<li>${inline(m[1])}</li>`; continue; }
    if ((m = l.match(/^\d+[.)]\s+(.*)/))) { flushP(); if (list !== "ol") { flushL(); html += "<ol>"; list = "ol"; } html += `<li>${inline(m[1])}</li>`; continue; }
    flushL();
    para.push(l);
  }
  flushP(); flushL();
  return html;
}

// ---------- Íconos (trazo fino, hechos a mano) ----------
const P = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowUR: '<path d="M7 17 17 7M8 7h9v9"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  scale: '<path d="M12 4v16M5 20h14M4 8h16"/><path d="m4 8-2.5 6a3 3 0 0 0 5 0zM20 8l-2.5 6a3 3 0 0 0 5 0z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  ledger: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16M4 13h16M10 3v18"/>',
  building: '<path d="M4 21V5l8-2v18M12 8h8v13M2 21h20"/><path d="M8 8v.01M8 12v.01M8 16v.01M16 12v.01M16 16v.01"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  calc: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6.5h8M8 11h.01M12 11h.01M16 11h.01M8 14.5h.01M12 14.5h.01M16 14.5v3.5M8 18h4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chat: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  fb: '<path d="M14 21v-8h3l.5-3.5H14V7.6c0-1 .3-1.6 1.7-1.6h1.8V3a24 24 0 0 0-2.7-.1C12.2 2.9 10.5 4.5 10.5 7.4v2.1H7.5V13h3v8"/>',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  in: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.01"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/>',
};
export const icon = (name, size = 20, sw = 1.6) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.info}</svg>`;

// ---------- Portadas generadas para publicaciones sin imagen ----------
const CAT_TONES = {
  Impuestos: ["#0f3f2b", "#a9cdb6"],
  Monotributo: ["#1f7a4c", "#d7efe0"],
  Laboral: ["#143a3a", "#9fd0c9"],
  "Economía": ["#2b3d1f", "#c9dca5"],
  Inversiones: ["#0d2b24", "#7fc2a0"],
  "Novedades del estudio": ["#3a4a3f", "#e3ecd9"],
};
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
export function genCover(post) {
  const [bg, fg] = CAT_TONES[post.category] || CAT_TONES.Impuestos;
  const h = hash(post.id || post.title);
  const pts = Array.from({ length: 9 }, (_, i) => {
    const y = 150 - ((h >> i) % 7) * 12 - i * 6;
    return `${i * 50},${y}`;
  }).join(" ");
  const bars = Array.from({ length: 7 }, (_, i) => {
    const bh = 30 + ((h >> (i + 2)) % 9) * 9;
    return `<rect x="${250 + i * 20}" y="${230 - bh}" width="11" height="${bh}" rx="2" fill="${fg}" opacity="${0.18 + i * 0.05}"/>`;
  }).join("");
  const glyph = { Impuestos: "%", Monotributo: "M", Laboral: "§", "Economía": "↗", Inversiones: "$", "Novedades del estudio": "✦" }[post.category] || "§";
  return `<span class="gen"><svg viewBox="0 0 400 275" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="400" height="275" fill="${bg}"/>
    ${Array.from({ length: 8 }, (_, i) => `<line x1="0" x2="400" y1="${34 * i + 20}" y2="${34 * i + 20}" stroke="${fg}" stroke-opacity=".09"/>`).join("")}
    <line x1="64" x2="64" y1="0" y2="275" stroke="${fg}" stroke-opacity=".14"/>
    ${bars}
    <polyline points="${pts}" fill="none" stroke="${fg}" stroke-width="2.4" stroke-linejoin="round" opacity=".85"/>
    <text x="22" y="250" font-family="Fraunces, Georgia, serif" font-style="italic" font-size="120" fill="${fg}" opacity=".16">${esc(glyph)}</text>
  </svg></span>`;
}
export const coverHTML = (p) => (p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy">` : genCover(p));

export function postCard(p, i = 0) {
  return `<a class="post-card" href="/post?s=${encodeURIComponent(p.slug)}" data-reveal style="--d:${(i % 3) * 0.08}s">
    <div class="cover">
      <span class="cat-badge">${esc(p.category)}</span>
      ${p.pinned ? '<span class="pinned-badge">Destacado</span>' : ""}
      ${coverHTML(p)}
    </div>
    <div class="meta"><span>${fmtDate(p.date)}</span><i class="dot"></i><span>${esc(p.author || "Estudio")}</span></div>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.excerpt)}</p>
    <div class="foot"><span>${icon("chat", 15)} ${p.commentCount || 0} comentario${p.commentCount === 1 ? "" : "s"}</span><span class="link-u">Leer ${icon("arrow", 15)}</span></div>
  </a>`;
}

// ---------- Datos del sitio (una sola llamada) ----------
let cache;
export function loadSite() {
  if (!cache) cache = api("/api/site");
  return cache;
}

// ---------- Header, ticker y footer ----------
export function renderChrome({ site, notices }, active = "") {
  const b = site.brand;
  const c = site.contact;
  document.title = document.title.includes("|") ? document.title.split("|")[0] + "| " + b.name : site.seo?.title || b.name;
  const metaDesc = $('meta[name="description"]');
  if (metaDesc && site.seo?.description && !metaDesc.dataset.fixed) metaDesc.content = site.seo.description;

  const links = [
    ["/#estudio", "El estudio", "estudio"],
    ["/#servicios", "Servicios", "servicios"],
    ["/foro", "Foro", "foro"],
    ["/#ubicacion", "Ubicación", "ubicacion"],
    ["/#contacto", "Contacto", "contacto"],
  ];

  // Con un solo aviso la barra queda fija; con varios, se desplaza.
  const tItem = (n) => `<span class="ticker-item"><span class="tag ${esc(n.type)}">${esc(n.type)}</span><a href="/foro#avisos">${esc(n.title)}</a></span>`;
  const ticker = notices.length
    ? `<div class="ticker" role="region" aria-label="Avisos">
        <div class="ticker-in">
          <div class="ticker-label"><i class="pulse"></i>Avisos</div>
          ${notices.length === 1
            ? `<div class="ticker-static">${tItem(notices[0])}</div>`
            : `<div class="ticker-track" style="--dur:${Math.max(30, notices.length * 14)}s">${[...notices, ...notices, ...(notices.length < 3 ? [...notices, ...notices] : [])].map(tItem).join("")}</div>`}
        </div>
      </div>`
    : "";

  const header = `
    ${ticker}
    <header class="site-header" id="top">
      <div class="wrap nav">
        <a href="/" class="brand" aria-label="${esc(b.name)} — inicio">
          <span class="brand-mark"><img src="/assets/img/emblema-blanco.png" alt=""></span>
          <span><span class="brand-name">${esc(b.name)}</span><span class="brand-sub">${esc(b.descriptor)}</span></span>
        </a>
        <nav class="menu" aria-label="Principal">
          ${links.map(([h, t, k]) => `<a href="${h}" class="${k === active ? "active" : ""}">${t}</a>`).join("")}
        </nav>
        <div class="nav-cta">
          <a class="btn sm" href="/#contacto">Pedir un turno <span class="arr">${icon("arrowUR", 14)}</span></a>
          <button class="burger" aria-label="Abrir menú" aria-expanded="false"><span></span><span></span></button>
        </div>
      </div>
    </header>
    <div class="drawer" aria-hidden="true">
      ${links.map(([h, t], i) => `<a href="${h}">${t}<small>0${i + 1}</small></a>`).join("")}
      <a class="btn" href="/#contacto" style="font-family:var(--sans);font-size:15px;opacity:1;transform:none;border:0">Pedir un turno <span class="arr">${icon("arrowUR", 14)}</span></a>
    </div>`;

  const year = new Date().getFullYear();
  const nameParts = b.name.split(" ");
  const footer = `
    <footer class="site-footer">
      <div class="wrap">
        <div class="foot-grid">
          <div>
            <a href="/" class="brand"><span class="brand-mark"><img src="/assets/img/emblema-blanco.png" alt=""></span><span><span class="brand-name">${esc(b.name)}</span><span class="brand-sub">${esc(b.descriptor)}</span></span></a>
            <p class="about">${esc(site.seo?.description || "")}</p>
          </div>
          <div><h4>Sitio</h4><ul>${links.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul></div>
          <div><h4>Contacto</h4><ul>
            ${c.phone ? `<li><a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}">${esc(c.phone)}</a></li>` : ""}
            ${c.phone2 ? `<li><a href="tel:${esc(c.phone2.replace(/[^\d+]/g, ""))}">${esc(c.phone2)}</a></li>` : ""}
            ${c.email ? `<li><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : ""}
            ${c.whatsapp ? `<li><a href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a></li>` : ""}
            ${c.instagram ? `<li><a href="${esc(c.instagram)}" target="_blank" rel="noopener">Instagram</a></li>` : ""}
            ${c.facebook ? `<li><a href="${esc(c.facebook)}" target="_blank" rel="noopener">Facebook</a></li>` : ""}
            ${c.linkedin ? `<li><a href="${esc(c.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></li>` : ""}
          </ul></div>
          <div><h4>Oficina</h4><ul><li>${esc(site.location.address)}</li><li>${esc(site.location.city)}</li>${(site.location.hours || []).map((h) => `<li style="color:var(--muted)">${esc(h.days)} · ${esc(h.time)}</li>`).join("")}</ul></div>
        </div>
        <div class="wordmark" aria-hidden="true"><span data-reveal>${esc(nameParts[0])}</span> <span data-reveal style="--d:.12s"><em>${esc(nameParts.slice(1).join(" "))}</em></span></div>
        <div class="foot-bottom">
          <span>© ${year} ${esc(b.name)}. Todos los derechos reservados.</span>
          <span>La información publicada es de carácter general y no reemplaza el asesoramiento profesional.</span>
        </div>
      </div>
    </footer>
    ${c.whatsapp ? `<a class="wa-float" href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener" aria-label="Escribinos por WhatsApp"><span class="tip">¿Consultas? Escribinos</span>${icon("wa", 26, 1.7)}</a>` : ""}
    <div class="toast" role="status" aria-live="polite"></div>`;

  $("#chrome-top").innerHTML = header;
  $("#chrome-bottom").innerHTML = footer;
  bindChrome();
}

function bindChrome() {
  const header = $(".site-header");
  const burger = $(".burger");
  burger?.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    burger.setAttribute("aria-expanded", open);
    $(".drawer").setAttribute("aria-hidden", !open);
  });
  $$(".drawer a").forEach((a) => a.addEventListener("click", () => document.body.classList.remove("nav-open")));

  let last = 0;
  const wa = $(".wa-float");
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle("scrolled", y > 50);
    header.classList.toggle("hide", y > 400 && y > last && !document.body.classList.contains("nav-open"));
    wa?.classList.toggle("show", y > 600);
    last = y;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

export function toast(msg) {
  const t = $(".toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 3200);
}

// ---------- Animaciones ----------
export function splitWords(el) {
  if (!el || el.dataset.split) return;
  el.dataset.split = 1;
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(document.createTextNode(part));
          const w = document.createElement("span");
          w.className = "w";
          w.innerHTML = `<span style="--i:${i++}">${esc(part)}</span>`;
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
    });
  };
  walk(el);
  el.classList.add("split-words");
}

let io;
export function observeReveals(root = document) {
  if (!io) {
    io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
  }
  $$("[data-split]:not(.split-words)", root).forEach((el) => { splitWords(el); io.observe(el); });
  $$("[data-reveal]:not(.in), .clip-up:not(.in)", root).forEach((el) => io.observe(el));
}

export function countUp(el) {
  const target = Number(el.dataset.to) || 0;
  const dur = 1800;
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const v = Math.round(target * (1 - Math.pow(1 - p, 4)));
    el.firstChild.nodeValue = money(v);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function parallax() {
  const els = $$("[data-parallax]");
  if (!els.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const tick = () => {
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      const k = Number(el.dataset.parallax) || 0.1;
      const off = (r.top + r.height / 2 - innerHeight / 2) * -k;
      el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
    });
  };
  addEventListener("scroll", () => requestAnimationFrame(tick), { passive: true });
  tick();
}

// Red de seguridad: ante cualquier error de JS, mostrar todo el contenido
// en vez de dejarlo oculto esperando la animación de entrada.
export function revealAll() {
  document.body.classList.add("ready");
  $$("[data-reveal], .clip-up, [data-split]").forEach((el) => el.classList.add("in"));
}
addEventListener("error", revealAll);
addEventListener("unhandledrejection", revealAll);
