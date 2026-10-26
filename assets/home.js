import {
  $, $$, esc, icon, loadSite, renderChrome, observeReveals, countUp, parallax,
  postCard, fmtDate, money, initials, api, toast,
} from "./app.js";

const nl2p = (t) => String(t || "").split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join("");

// Panel del hero: el logo del estudio sobre su verde, con renglones de libro contable.
function heroArt() {
  return `<div class="hero-logo">
    <svg class="hero-lines" viewBox="0 0 400 460" preserveAspectRatio="none" aria-hidden="true">
      ${Array.from({ length: 16 }, (_, i) => `<line x1="0" x2="400" y1="${30 + i * 28}" y2="${30 + i * 28}" stroke="#ffffff" stroke-opacity=".07"/>`).join("")}
    </svg>
    <img src="/assets/img/logo-blanco.png" alt="Estudio Brady · Contadores Públicos">
  </div>`;
}

function fillIcons(root = document) {
  $$("[data-ic]", root).forEach((el) => { el.innerHTML = icon(el.dataset.ic, el.classList.contains("arr") ? 14 : 18); });
  $$("[data-ic-inline]", root).forEach((el) => el.insertAdjacentHTML("afterbegin", icon(el.dataset.icInline, 13, 2)));
}

function hero(site) {
  const h = site.hero;
  $("#hero-eyebrow").textContent = h.eyebrow;
  $("#hero-title").innerHTML = String(h.title || "")
    .split("\n")
    .map((l, i, arr) => {
      const txt = esc(l);
      // La última línea va en itálica verde, como acento editorial.
      return `<span class="line"><span>${i === arr.length - 1 && arr.length > 1 ? `<em>${txt}</em>` : txt}</span></span>`;
    })
    .join("");
  $("#hero-sub").textContent = h.subtitle;
  $("#hero-cta1").textContent = h.ctaPrimary;
  $("#hero-cta2").textContent = h.ctaSecondary;
  $("#hero-photo").innerHTML = h.image ? `<img src="${esc(h.image)}" alt="">` : heroArt();

  const since = Number(site.brand.since) || 0;
  const years = since ? new Date().getFullYear() - since : 0;
  $("#lc-year").textContent = since ? `${since} — hoy` : "";
  $("#lc-val").dataset.to = years;
  $("#lc-since").innerHTML = since ? `${icon("star", 13, 2)} Desde ${since} en Luján` : "";
  $("#lc-rows").innerHTML = (site.services || []).slice(0, 4)
    .map((s) => `<div><span>${esc(s.title)}</span><span class="ok">${icon("check", 13, 2)}</span></div>`).join("");
  if (!years) $(".ledger-card .lc-val").style.display = "none";

  const c = site.contact;
  $("#hero-meta").innerHTML = `${since ? `<span>${icon("star", 16)} Desde <b>${since}</b></span>` : ""}
    <span>${icon("pin", 16)} ${esc(site.location.address)}</span>
    ${c.phone ? `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}" style="display:flex;gap:8px;align-items:center">${icon("phone", 16)} <b>${esc(c.phone)}</b></a>` : ""}`;
}

function about(site) {
  const a = site.about;
  $("#about-title").textContent = a.title;
  $("#about-text").innerHTML = nl2p(a.text);
  $("#about-points").innerHTML = (a.points || [])
    .map((p, i) => `<li data-reveal style="--d:${i * 0.08}s"><span class="ck">${icon("check", 14, 2)}</span>${esc(p)}</li>`)
    .join("");
  const years = site.brand.since ? new Date().getFullYear() - Number(site.brand.since) : "";
  const ring = "Estudio contable · impositivo · laboral · ";
  const photo = a.image || "/assets/img/estudio.jpg";
  $("#about-media").innerHTML = `<img src="${esc(photo)}" alt="Sala de reuniones del estudio" loading="lazy">
    ${years ? `<div class="badge"><svg viewBox="0 0 128 128"><defs><path id="circ" d="M64 64 m-50 0 a50 50 0 1 1 100 0 a50 50 0 1 1 -100 0"/></defs><text><textPath href="#circ">${ring}${ring}</textPath></text></svg><div><b>${years}</b><div style="font-size:11px;opacity:.7">años</div></div></div>` : ""}`;
}

function services(site) {
  const list = site.services || [];
  const listEl = $("#svc-list");
  const card = $("#svc-card");
  listEl.innerHTML = list
    .map((s, i) => `
      <button class="svc-item ${i === 0 ? "on" : ""}" data-i="${i}" data-reveal style="--d:${i * 0.05}s" aria-expanded="${i === 0}">
        <span class="n">${String(i + 1).padStart(2, "0")}</span>
        <span class="t">${esc(s.title)}</span>
        <span class="pm">${icon("plus", 14, 1.8)}</span>
      </button>
      <div class="svc-mobile-body"><div><p style="margin:0">${esc(s.text)}</p><ul>${(s.items || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div>`)
    .join("");

  const show = (i) => {
    const s = list[i];
    if (!s) return;
    card.innerHTML = `<div class="swap">
      <div class="ic">${icon(s.icon || "briefcase", 28, 1.4)}</div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.text)}</p>
      <ul>${(s.items || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <a class="btn light" href="#contacto">Consultar por ${esc(s.title.toLowerCase())} <span class="arr">${icon("arrowUR", 14)}</span></a>
    </div><span class="bg-num">${String(i + 1).padStart(2, "0")}</span>`;
  };
  show(0);

  const mobile = () => matchMedia("(max-width: 900px)").matches;
  $$(".svc-item", listEl).forEach((btn) => {
    const i = Number(btn.dataset.i);
    btn.addEventListener("mouseenter", () => { if (!mobile() && !btn.classList.contains("on")) activate(btn, i); });
    btn.addEventListener("click", () => activate(btn, i, true));
  });
  function activate(btn, i, toggle) {
    const body = btn.nextElementSibling;
    if (mobile()) {
      const open = toggle && btn.classList.contains("on") && body.offsetHeight > 0;
      $$(".svc-item", listEl).forEach((b) => { b.classList.remove("on"); b.nextElementSibling.style.height = "0px"; b.setAttribute("aria-expanded", "false"); });
      if (!open) { btn.classList.add("on"); body.style.height = body.scrollHeight + "px"; btn.setAttribute("aria-expanded", "true"); }
      return;
    }
    $$(".svc-item", listEl).forEach((b) => { b.classList.toggle("on", b === btn); b.setAttribute("aria-expanded", b === btn); });
    show(i);
  }
}

function homePosts(posts) {
  $("#home-posts").innerHTML = posts.length
    ? posts.slice(0, 3).map(postCard).join("")
    : `<p style="color:var(--muted)">Pronto vas a encontrar acá las primeras publicaciones.</p>`;
}

function team(site) {
  const t = site.team || [];
  if (!t.length) return $("#team-wrap").remove();
  $("#team").innerHTML = t
    .map((m, i) => `<article class="tm" data-reveal style="--d:${(i % 5) * 0.06}s">
      <div class="tm-ph">${m.photo ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" loading="lazy">` : `<span>${esc(initials(m.name))}</span>`}</div>
      <div><h3>${esc(m.name)}</h3><div class="role">${esc(m.role)}</div>${m.bio ? `<p>${esc(m.bio)}</p>` : ""}</div>
    </article>`)
    .join("");
}

function openNow(hours) {
  const DAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const today = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  let recognized = false;
  for (const h of hours || []) {
    const d = norm(h.days);
    const range = d.match(/(lunes|martes|miercoles|jueves|viernes|sabado|domingo)s?\s*a\s*(lunes|martes|miercoles|jueves|viernes|sabado|domingo)/);
    let match = false;
    if (range) {
      const a = DAYS.indexOf(range[1]), b = DAYS.indexOf(range[2]);
      match = a <= b ? today >= a && today <= b : today >= a || today <= b;
    } else match = DAYS.some((x, i) => i === today && d.includes(x));
    if (range || DAYS.some((x) => d.includes(x))) recognized = true;
    if (!match) continue;
    const t = h.time.match(/(\d{1,2})[:.]?(\d{2})?\s*(?:a|-|–)\s*(\d{1,2})[:.]?(\d{2})?/);
    if (!t) return null;
    const from = Number(t[1]) * 60 + Number(t[2] || 0), to = Number(t[3]) * 60 + Number(t[4] || 0);
    return mins >= from && mins < to;
  }
  return recognized ? false : null;
}

function renderLocation(site) {
  const l = site.location, c = site.contact;
  $("#map").innerHTML = `
    <iframe title="Mapa de ubicación" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
      src="https://www.google.com/maps?q=${encodeURIComponent(l.mapQuery || l.address)}&z=16&output=embed"></iframe>
    <a class="pinbox" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.mapQuery || l.address)}" target="_blank" rel="noopener">
      <span class="ic">${icon("pin", 20)}</span>
      <span><b>${esc(l.address)}</b><span>${esc(l.city)}</span><br><span class="link-u" style="font-size:13px;margin-top:6px">Cómo llegar ${icon("arrowUR", 12)}</span></span>
    </a>`;
  $("#hours").innerHTML = (l.hours || []).map((h) => `<div><span>${esc(h.days)}</span><span>${esc(h.time)}</span></div>`).join("");
  const o = openNow(l.hours);
  const badge = $("#open-badge");
  if (o === null) badge.remove();
  else { badge.classList.toggle("closed", !o); badge.innerHTML = `<i></i>${o ? "Abierto ahora" : "Cerrado ahora"}`; }
  $("#howto").textContent = l.howToGet || "";
  $("#contact-lines").innerHTML = [
    c.whatsapp && `<a href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener">${icon("wa", 18)} WhatsApp</a>`,
    c.phone && `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}">${icon("phone", 18)} ${esc(c.phone)}</a>`,
    c.phone2 && `<a href="tel:${esc(c.phone2.replace(/[^\d+]/g, ""))}">${icon("phone", 18)} ${esc(c.phone2)}</a>`,
    c.email && `<a href="mailto:${esc(c.email)}">${icon("mail", 18)} ${esc(c.email)}</a>`,
    c.instagram && `<a href="${esc(c.instagram)}" target="_blank" rel="noopener">${icon("ig", 18)} Instagram</a>`,
    c.facebook && `<a href="${esc(c.facebook)}" target="_blank" rel="noopener">${icon("fb", 18)} Facebook</a>`,
    c.linkedin && `<a href="${esc(c.linkedin)}" target="_blank" rel="noopener">${icon("in", 18)} LinkedIn</a>`,
  ].filter(Boolean).join("");
}

function contactForm(site) {
  const c = site.contact;
  $("#contact-direct").innerHTML = [
    c.phone && `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}">${icon("phone", 18)} ${esc(c.phone)}</a>`,
    c.whatsapp && `<a href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener">${icon("wa", 18)} WhatsApp</a>`,
    c.email && `<a href="mailto:${esc(c.email)}">${icon("mail", 18)} ${esc(c.email)}</a>`,
    `<span>${icon("pin", 18)} ${esc(site.location.address)}, Luján</span>`,
  ].filter(Boolean).join("");
  const sel = $("#cf-topic");
  const opts = ["Consulta general", "Pedir un turno", ...(site.services || []).map((s) => s.title)];
  sel.innerHTML = opts.map((o) => `<option>${esc(o)}</option>`).join("");
  const form = $("#contact-form");
  const out = $("#cf-msg-out");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const btn = $("button[type=submit]", form);
    btn.disabled = true;
    out.className = "form-msg";
    out.textContent = "Enviando…";
    try {
      await api("/api/contact", { method: "POST", body: data });
      form.reset();
      out.className = "form-msg ok";
      out.textContent = "¡Listo! Recibimos tu consulta y te respondemos a la brevedad.";
      toast("Consulta enviada");
    } catch (err) {
      out.className = "form-msg err";
      out.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
}

(async function init() {
  fillIcons();
  try {
    const data = await loadSite();
    const { site } = data;
    renderChrome(data);
    const steps = [
      () => hero(site), () => about(site), () => team(site), () => services(site),
      () => homePosts(data.posts), () => renderLocation(site), () => contactForm(site),
    ];
    for (const step of steps) {
      try { step(); } catch (err) { console.error(err); }
    }
    fillIcons();
  } catch (e) {
    console.error(e);
    document.querySelector("main").insertAdjacentHTML("afterbegin", `<p style="padding:30px;text-align:center;color:#b4432f">No pudimos cargar el contenido (${esc(e.message)}). Probá recargar la página.</p>`);
  }

  requestAnimationFrame(() => document.body.classList.add("ready"));
  observeReveals();
  parallax();

  // Contadores cuando entran en pantalla
  const cio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } }), { threshold: 0.5 });
  $$(".cnt, #lc-val").forEach((el) => cio.observe(el));

  if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView(), 200);
})();
