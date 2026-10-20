"use strict";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const THREAT_COLOR = { 5: "var(--crit)", 4: "var(--serious)", 3: "var(--warn)", 2: "var(--good)", 1: "var(--good)" };
const CONF_CLASS = { Verified: "ok", Reported: "info", Estimate: "warn", Unverified: "crit" };
const DATA_FILE = { en: "data.json", ko: "data.ko.json" };

let D;                 // active dataset
let LANG = pickLang();
const cache = {};
let rendered = {};

// ── language ────────────────────────────────────────────────────
function pickLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "ko" || q === "en") return q;
  try { const s = localStorage.getItem("lang"); if (s === "ko" || s === "en") return s; } catch (e) { /* storage unavailable */ }
  return (navigator.language || "").toLowerCase().startsWith("ko") ? "ko" : "en";
}
const t = (k, vars = {}) => (I18N[LANG][k] ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? "");
const en = (v) => (LANG === "ko" ? ENUM_KO[v] ?? v : v);          // enumerated data values
const asOfText = () => { const [y, m, d] = D.meta.asOf.split("-").map(Number); return LANG === "ko" ? `${y}년 ${m}월 ${d}일` : D.meta.asOfLabel; };

// ── small builders ──────────────────────────────────────────────
const pill = (s, cls = "") => `<span class="pill ${cls}">${s}</span>`;
const conf = (c) => pill(esc(en(c || "Reported")), CONF_CLASS[c] || "");
const threatName = (n) => t(`threat.${n}`);
const threat = (n) => (n ? `<span class="threat"><i style="background:${THREAT_COLOR[n]}"></i>${threatName(n)}</span>` : `<span class="muted">—</span>`);
const scopeDot = (s) => `<span class="dot" style="background:var(--${s === "Korea" ? "korea" : "global"})"></span>`;
const srcs = (list) => (list && list.length ? `<div class="srcs">${list.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("")}</div>` : "");
const kpis = (list) => `<div class="kpis">${list.map((k) => `<div class="kpi"><div class="kpi-label">${k.label}</div><div class="kpi-num">${k.num}</div><div class="kpi-sub">${k.sub}</div></div>`).join("")}</div>`;
const head = (eyebrow, title, lede) => `<div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ""}</div>`;
const toDate = (s) => { const [y, m = 1, d = 1] = String(s).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };

// ── tooltip ─────────────────────────────────────────────────────
const tip = $("#tip");
document.addEventListener("pointermove", (e) => {
  const el = e.target.closest("[data-tip]");
  if (!el) { tip.hidden = true; return; }
  tip.innerHTML = el.dataset.tip;
  tip.hidden = false;
  const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
  let x = e.clientX + pad, y = e.clientY + pad;
  if (x + w > innerWidth - 8) x = e.clientX - w - pad;
  if (y + h > innerHeight - 8) y = e.clientY - h - pad;
  tip.style.left = x + "px"; tip.style.top = y + "px";
});

// ═════════════════════════════════════════════════════════════════
// OVERVIEW
// ═════════════════════════════════════════════════════════════════
function renderOverview(el) {
  const arrow = { up: `<span class="arrow" style="color:var(--crit)">▲</span>`, down: `<span class="arrow" style="color:var(--good)">▼</span>`, info: `<span class="arrow" style="color:var(--accent)">●</span>` };
  el.innerHTML = `
    ${head(t("ov.eyebrow", { d: asOfText() }), t("ov.title"), D.summary)}
    ${kpis(D.kpis)}
    <div class="split">
      <div class="card">
        <h2>${t("tmap.title")}</h2>
        <div class="small muted" style="margin:-6px 0 8px">${t("tmap.sub")}</div>
        <div class="tmap">${threatMap()}</div>
        <div class="legend"><span>${scopeDot("Korea")}${t("legend.korea")}</span><span>${scopeDot("Global")}${t("legend.global")}</span></div>
      </div>
      <div class="card">
        <h2>${t("changes.title")}</h2>
        <ul class="changes">${D.changes.map((c) => `<li><div class="d">${c.date}</div><div><div class="h">${arrow[c.dir] || ""}${c.headline}</div><div class="i">${c.impact}</div></div></li>`).join("")}</ul>
        <div class="note"><span style="color:var(--crit)">▲</span> ${t("changes.up")} · <span style="color:var(--good)">▼</span> ${t("changes.down")} · <span style="color:var(--accent)">●</span> ${t("changes.info")}</div>
      </div>
    </div>
    <div>
      <h2>${t("takeaways")}</h2>
      <div class="grid g3">${D.takeaways.map((x) => `<div class="card takeaway"><h3>${x.title}</h3><p>${x.body}</p></div>`).join("")}</div>
    </div>
    <div class="grid g2">
      <div class="card">
        <h2>${t("rev.title")}</h2>
        ${hbars(D.revenue.map((r) => ({ label: r.period, v: r.usd_m, text: `$${r.usd_m.toFixed(2)}M`, tip: `<b>${r.period}</b><br>${t("rev.net")} $${r.usd_m}M<br>${r.volume}<br>${t("rev.prescribers")} ${r.prescribers}` })))}
        <div class="note">${t("rev.note")}</div>
      </div>
      <div class="card">
        <h2>${t("signals")}</h2>
        ${D.tractionNotes.map((n) => `<p class="small" style="margin:0 0 10px"><b>${n.title}.</b> <span style="color:var(--ink-2)">${n.body}</span></p>`).join("")}
        ${D.marketNotes.map((n) => `<p class="small" style="margin:0"><b>${n.title}.</b> <span style="color:var(--ink-2)">${n.body}</span></p>`).join("")}
      </div>
    </div>`;
}

function threatMap() {
  const pts = D.competitors.filter((c) => c.threat);
  const R = { "Approved (US)": 4, "Approved (ex-US)": 4, "Off-label (other indication)": 4, Filed: 3, "Licensed (pre-filing)": 2, "Phase 3": 1, "Phase 2": 0 };
  const W = 680, H = 400, m = { l: 64, r: 130, t: 14, b: 40 };
  const x = (v) => m.l + 20 + (v / 4) * (W - m.l - m.r - 20);
  const y = (v) => H - m.b - ((v - 0.5) / (5.5 - 0.5)) * (H - m.t - m.b);
  // spread points sharing a cell vertically
  const groups = {};
  pts.forEach((p) => { const k = `${R[p.stage]}|${p.threat}`; (groups[k] = groups[k] || []).push(p); });
  const placed = [];
  Object.values(groups).forEach((g) => g.forEach((p, i) => placed.push({ p, dx: R[p.stage], dy: p.threat + (i - (g.length - 1) / 2) * 0.34 })));
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t("tmap.title")}">
    <g class="grid">${[1, 2, 3, 4, 5].map((v) => `<line x1="${m.l}" x2="${W - m.r + 40}" y1="${y(v)}" y2="${y(v)}"/>`).join("")}</g>
    ${[1, 2, 3, 4, 5].map((v) => `<text x="${m.l - 10}" y="${y(v) + 4}" text-anchor="end">${threatName(v)}</text>`).join("")}
    ${[0, 1, 2, 3, 4].map((v) => `<text x="${x(v)}" y="${H - m.b + 18}" text-anchor="middle">${t(`tick.${v}`)}</text>`).join("")}
    <text x="${(W - m.r + m.l) / 2}" y="${H - 4}" text-anchor="middle" style="fill:var(--muted)">${t("tmap.axis")}</text>
    ${placed.map(({ p, dx, dy }) => {
      const cx = x(dx), cy = y(dy), col = p.scope === "Korea" ? "var(--korea)" : "var(--global)";
      const tipHtml = esc(`<b>${p.product}</b><br>${p.company}<br>${en(p.stage)} · ${t("col.threat")} ${threatName(p.threat)}<br><span style="color:var(--ink-2)">${p.threat_why || ""}</span>`);
      return `<g data-tip="${tipHtml}"><circle cx="${cx}" cy="${cy}" r="7" fill="${col}"/><text class="lbl" x="${cx + 11}" y="${cy + 4}">${esc(p.short)}</text></g>`;
    }).join("")}
  </svg>`;
}

function hbars(rows, max) {
  const top = max || Math.max(...rows.map((r) => r.v)) * 1.18;
  return `<div class="bars">${rows.map((r) => `<div class="bar-row" data-tip="${esc(r.tip || "")}"><div>${r.label}</div><div class="bar-track">
    <div class="bar mid" style="width:${(r.v / top) * 100}%;${r.color ? `background:${r.color}` : ""}"></div>
    <div class="bar-val mid" style="left:${(r.v / top) * 100}%">${r.text}</div></div></div>`).join("")}</div>`;
}

// ═════════════════════════════════════════════════════════════════
// KOREA
// ═════════════════════════════════════════════════════════════════
function renderKorea(el) {
  const K = D.korea;
  const kEvents = D.events.filter((e) => e.region === "Korea").sort((a, b) => b.date.localeCompare(a.date));
  el.innerHTML = `
    ${head(t("kr.eyebrow"), t("kr.title"), K.summary)}
    ${kpis(K.kpis)}
    <div class="card">
      <h2>${t("race")}</h2>
      ${gantt(K.race)}
      <div class="legend">
        <span><i style="background:var(--seg-solid)"></i>${t("race.confirmed")}</span>
        <span><i style="background:var(--seg-light)"></i>${t("race.expected")}</span>
        <span><i style="background:var(--seg-market)"></i>${t("race.market")}</span>
        <span><i style="background:var(--seg-market-light)"></i>${t("race.launch")}</span>
        <span>◆ ${t("race.ms")}</span>
      </div>
    </div>
    <div>
      <h2>${t("profiles")}</h2>
      <div class="grid g2">${K.companies.slice().sort((a, b) => (b.focus ? 1 : 0) - (a.focus ? 1 : 0) || b.threat - a.threat).map(company).join("")}</div>
    </div>
    <div class="grid g2">
      <div class="card">
        <h2>${t("chains")}</h2>
        ${K.chains.map((c) => `<div style="padding:9px 0;border-top:1px solid var(--line)"><div class="small" style="font-weight:600;margin-bottom:3px">${c.product}</div>
          <div class="chain">${c.chain.map((x) => `<span>${x}</span>`).join(`<span class="arrow2">→</span>`)}</div><div class="small muted">${c.note}</div></div>`).join("")}
      </div>
      <div class="card">
        <h2>${t("ktimeline")}</h2>
        <ul class="tl">${kEvents.map((e) => `<li><div class="d">${e.date}</div><div><span class="t">${en(e.type)}</span>${e.text}</div></li>`).join("")}</ul>
      </div>
    </div>
    <div class="grid g2">${K.marketNotes.map((n) => `<div class="card"><h2>${n.title}</h2><p class="small" style="margin:0;color:var(--ink-2)">${n.body}</p></div>`).join("")}</div>`;
}

function company(p) {
  const main = p.facts.slice(0, 3), more = p.facts.slice(3);
  const dl = (fs) => `<dl>${fs.map((f) => `<dt>${f.k}</dt><dd>${f.v}</dd>`).join("")}</dl>`;
  return `<div class="co${p.focus ? " focus" : ""}">
    <div class="co-head"><div><div class="co-name">${p.company}<span class="co-ko">${p.company_ko}</span></div><div class="co-role">${p.role}</div></div>
      <div style="display:flex;gap:8px;align-items:center">${threat(p.threat)} ${conf(p.confidence)}</div></div>
    ${dl(main)}
    ${more.length ? `<details><summary>${t("more")}</summary>${dl(more)}</details>` : ""}
    <div class="why"><b>${t("assessment")}</b> ${p.threat_why}</div>
    ${srcs(p.sources)}
  </div>`;
}

function gantt(rows) {
  const start = toDate("2024-01-01"), end = toDate("2030-01-01"), span = end - start;
  const pct = (s) => Math.max(0, Math.min(100, ((toDate(s) - start) / span) * 100));
  const cls = { "License → NDA": "solid", "NDA review": "solid", Development: "solid", "Expected review": "light", "Expected development": "light", "On market": "market", "Expected launch": "market-light" };
  const years = [2024, 2025, 2026, 2027, 2028, 2029];
  const today = pct(D.meta.asOf);
  const ticks = years.map((y) => `<div class="g-tick" style="left:${pct(`${y}-01-01`)}%"><span>${y}</span></div>`).join("");
  return `<div class="gantt"><div class="gantt-inner">
    <div class="g-row axis"><div></div><div class="g-track">${ticks}<div class="g-today" style="left:${today}%"><span>${t("today")}</span></div></div></div>
    ${rows.map((r) => `<div class="g-row"><div class="g-label">${r.product}<small>${r.company}</small></div><div class="g-track">
      ${years.map((y) => `<div class="g-tick" style="left:${pct(`${y}-01-01`)}%"></div>`).join("")}
      <div class="g-today" style="left:${today}%"></div>
      ${r.segments.map((s) => { const l = pct(s.start), w = Math.max(0.6, pct(s.end) - l);
        return `<div class="g-seg ${cls[s.phase]}" style="left:${l}%;width:${w}%" data-tip="${esc(`<b>${r.product} · ${r.company}</b><br>${en(s.phase)}: ${s.start} → ${s.end}<br><span style='color:var(--ink-2)'>${s.note || ""}</span>`)}"></div>`; }).join("")}
      ${(r.milestones || []).map((ms) => `<div class="g-ms" style="left:${pct(ms.date)}%" data-tip="${esc(`<b>${ms.label}</b><br>${ms.date}`)}"></div>`).join("")}
    </div></div>`).join("")}
  </div></div>`;
}

// ═════════════════════════════════════════════════════════════════
// COMPETITORS
// ═════════════════════════════════════════════════════════════════
const F = { scope: "All", stage: "All", q: "", hideDead: true, open: null };

function renderCompetitors(el) {
  const stages = D.meta.stageOrder.filter((s) => D.competitors.some((c) => c.stage === s));
  const scopeLabel = { All: t("f.all"), Korea: t("scope.Korea"), Global: t("scope.Global") };
  el.innerHTML = `
    ${head(t("c.eyebrow"), t("c.title"), D.pipelineSummary)}
    <div class="filters">
      <div class="seg" id="f-scope">${["All", "Korea", "Global"].map((s) => `<button type="button" data-v="${s}" aria-pressed="${F.scope === s}">${scopeLabel[s]}</button>`).join("")}</div>
      <select id="f-stage" aria-label="${t("col.stage")}"><option value="All">${t("f.allStages")}</option>${stages.map((s) => `<option value="${esc(s)}"${F.stage === s ? " selected" : ""}>${en(s)}</option>`).join("")}</select>
      <input type="search" id="f-q" placeholder="${t("f.search")}" value="${esc(F.q)}" aria-label="${t("f.search")}">
      <label class="chk"><input type="checkbox" id="f-dead" ${F.hideDead ? "checked" : ""}> ${t("f.hideDead")}</label>
      <button class="btn" id="f-csv" type="button">${t("f.csv")}</button>
    </div>
    <div class="card flush"><div class="tbl-wrap"><table>
      <thead><tr><th>${t("col.asset")}</th><th>${t("col.company")}</th><th>${t("col.mech")}</th><th>${t("col.stage")}</th><th>${t("col.korea")}</th><th>${t("col.threat")}</th></tr></thead>
      <tbody id="c-body"></tbody></table></div></div>
    <div class="note" id="c-count"></div>`;
  $("#f-scope", el).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; F.scope = b.dataset.v; el.querySelectorAll("#f-scope button").forEach((x) => x.setAttribute("aria-pressed", x === b)); drawRows(); });
  $("#f-stage", el).addEventListener("change", (e) => { F.stage = e.target.value; drawRows(); });
  $("#f-q", el).addEventListener("input", (e) => { F.q = e.target.value; drawRows(); });
  $("#f-dead", el).addEventListener("change", (e) => { F.hideDead = e.target.checked; drawRows(); });
  $("#f-csv", el).addEventListener("click", downloadCsv);
  $("#c-body", el).addEventListener("click", (e) => { const r = e.target.closest("tr.row"); if (!r || e.target.closest("a")) return; F.open = F.open === r.dataset.id ? null : r.dataset.id; drawRows(); });
  drawRows();
}

function filtered() {
  const q = F.q.trim().toLowerCase(), order = D.meta.stageOrder;
  return D.competitors
    .filter((c) => (F.scope === "All" || c.scope === F.scope) && (F.stage === "All" || c.stage === F.stage) && !(F.hideDead && c.stage.startsWith("Discontinued")))
    .filter((c) => !q || [c.product, c.company, c.api, c.mechanism, c.origin, c.kr_status, en(c.stage)].join(" ").toLowerCase().includes(q))
    .sort((a, b) => (b.scope === "Korea") - (a.scope === "Korea") || (b.threat || 0) - (a.threat || 0) || order.indexOf(a.stage) - order.indexOf(b.stage));
}

function drawRows() {
  const rows = filtered();
  $("#c-body").innerHTML = rows.map((c) => {
    const stageCls = c.stage.startsWith("Discontinued") ? "crit" : c.stage.startsWith("Approved") || c.stage.startsWith("Off-label") ? "ok" : c.stage === "Filed" ? "info" : "";
    const kr = c.kr_status && c.kr_status !== "—" ? c.kr_status.split(/;|；/)[0] : `<span class="muted">—</span>`;
    const row = `<tr class="row" data-id="${c.id}" aria-expanded="${F.open === c.id}"><td>${scopeDot(c.scope)}<b>${c.product}</b></td><td>${c.company}</td>
      <td class="small">${c.mechanism}</td><td>${pill(en(c.stage), stageCls)}</td><td class="small">${kr}</td><td>${threat(c.threat)}</td></tr>`;
    if (F.open !== c.id) return row;
    const f = (k, v) => (v && v !== "—" ? `<div><div class="k">${t(k)}</div><div class="v">${v}</div></div>` : "");
    return row + `<tr class="detail"><td colspan="6">
      <div class="facts">${f("d.api", c.api)}${f("d.form", c.formulation)}${f("d.duration", c.duration)}${f("d.us", c.us_status)}${f("d.korea", c.kr_status)}${f("d.other", c.other_status)}${f("d.latest", c.latest)}${f("d.next", c.next_milestone)}</div>
      <div class="grid g2" style="margin-top:12px"><div class="small"><b>${t("d.diff")}</b> ${c.differentiator}</div><div class="small"><b>${t("d.weak")}</b> ${c.weakness}</div></div>
      ${c.threat_why ? `<div class="small" style="margin-top:10px"><b>${t("d.why")}</b> ${c.threat_why}</div>` : ""}
      <div style="margin-top:10px">${conf(c.confidence)}</div>${srcs(c.sources)}</td></tr>`;
  }).join("") || `<tr><td colspan="6" class="muted">${t("c.none")}</td></tr>`;
  $("#c-count").textContent = t("c.count", { n: rows.length, t: D.competitors.length });
}

function downloadCsv() {
  const cols = ["product", "company", "scope", "origin", "api", "mechanism", "stage", "us_status", "kr_status", "other_status", "duration", "next_milestone", "threat", "confidence"];
  const strip = (v) => String(v ?? "").replace(/<[^>]+>/g, "").replace(/"/g, '""');
  const val = (c, k) => (k === "threat" ? (c.threat ? threatName(c.threat) : "") : ["stage", "confidence"].includes(k) ? en(c[k]) : k === "scope" ? t(`scope.${c.scope}`) : c[k]);
  const csv = [cols.join(","), ...filtered().map((c) => cols.map((k) => `"${strip(val(c, k))}"`).join(","))].join("\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })), download: `presbyopia-competitors-${LANG}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
}

// ═════════════════════════════════════════════════════════════════
// PRODUCTS
// ═════════════════════════════════════════════════════════════════
let PROD = "VIZZ";
function renderProducts(el) {
  const h = D.headToHead;
  const dur = h.map((r) => ({ label: r.product, v: r.duration_h, text: t("dur.val", { n: r.duration_h }), tip: `<b>${r.product}</b>: ${t("dur.tip", { n: r.duration_h })}` }));
  const resp = h.filter((r) => r.responder_pct != null);
  const respBars = `<div class="bars">${resp.map((r) => `<div class="bar-row" data-tip="${esc(`<b>${r.product}</b> · ${r.trial}<br>${r.timepoint}<br>${t("resp.active")} ${r.responder_pct}%${r.vehicle_pct != null ? ` · ${t("resp.vehicle")} ${r.vehicle_pct}%` : ` · ${t("resp.pooled")}`}`)}">
      <div>${r.product}</div><div class="pair">
      <div class="pair-line"><span class="pbar" style="width:${r.responder_pct}%"></span><span class="pval">${r.responder_pct}%</span></div>
      <div class="pair-line">${r.vehicle_pct != null ? `<span class="pbar veh" style="width:${r.vehicle_pct}%"></span><span class="pval">${r.vehicle_pct}%</span>` : `<span class="pval muted">${t("resp.pooled")}</span>`}</div>
      </div></div>`).join("")}</div>`;
  const cols = Object.keys(D.positioning[0]);
  el.innerHTML = `
    ${head(t("p.eyebrow"), t("p.title"), t("p.lede"))}
    <div class="grid g2">
      <div class="card"><h2>${t("dur.title")}</h2>${hbars(dur, 24)}<div class="note">${t("dur.note")}</div></div>
      <div class="card"><h2>${t("resp.title")}</h2>${respBars}
        <div class="legend"><span><i style="background:var(--accent)"></i>${t("resp.active")}</span><span><i style="background:var(--vehicle)"></i>${t("resp.vehicle")}</span></div>
        <div class="note">${t("resp.note")}</div></div>
    </div>
    <div class="card flush"><div class="tbl-wrap"><table><thead><tr>${cols.map((c) => `<th>${t(`pos.${c}`)}</th>`).join("")}</tr></thead>
      <tbody>${D.positioning.map((r) => `<tr>${cols.map((c, i) => `<td class="${i ? "small" : ""}">${i ? r[c] : `<b>${r[c]}</b>`}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>
    <div>
      <h2>${t("deep")}</h2>
      <div class="seg" id="p-pick" style="margin-bottom:16px">${D.products.map((p) => `<button type="button" data-k="${p.key}" aria-pressed="${p.key === PROD}">${p.key}</button>`).join("")}</div>
      <div id="p-body"></div>
    </div>
    <details class="card"><summary style="margin:0">${t("pkpd", { n: D.pkpd.length })}</summary>
      <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>${t("pk.drug")}</th><th>${t("pk.study")}</th><th>${t("pk.model")}</th><th>${t("pk.result")}</th><th>${t("pk.ref")}</th></tr></thead>
      <tbody>${D.pkpd.map((s) => `<tr><td><b>${s.drug}</b></td><td class="small">${s.study}</td><td class="small">${s.model}</td><td class="small">${s.result}</td><td class="small"><a href="${esc(s.ref)}" target="_blank" rel="noopener">${s.ref_short} ↗</a></td></tr>`).join("")}</tbody></table></div>
    </details>`;
  $("#p-pick", el).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; PROD = b.dataset.k; el.querySelectorAll("#p-pick button").forEach((x) => x.setAttribute("aria-pressed", x === b)); drawProduct(); });
  drawProduct();
}

function drawProduct() {
  const p = D.products.find((x) => x.key === PROD);
  const f = (k, v) => `<div><div class="k">${t(k)}</div><div class="v">${v}</div></div>`;
  $("#p-body").innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline">
        <div><div style="font-size:22px;font-weight:680">${p.brand}</div><div class="muted">${p.generic}</div></div>
        <div>${pill(p.status || p.approval_status, "ok")}</div>
      </div>
      ${p.updates.length ? `<div class="update" style="margin-top:14px"><b>${t("updated")}</b><ul>${p.updates.map((u) => `<li>${u}</li>`).join("")}</ul></div>` : ""}
      <div class="facts" style="margin-top:14px">
        ${f("pf.company", p.company)}${f("pf.app", `${p.nda_number} · ${p.application_type}`)}${f("pf.class", p.drug_class)}
        ${f("pf.conc", p.concentration)}${f("pf.dosing", p.dosing)}${f("pf.onset", `${p.onset} · ${p.duration}`)}
        ${f("pf.form", p.dosage_form)}${f("pf.pres", `${p.preservative} · ${p.ph_range}`)}${f("pf.storage", p.storage)}
      </div>
      <p class="small" style="margin:14px 0 0"><b>${t("pf.eff")}</b> <span style="color:var(--ink-2)">${p.efficacy_summary}</span></p>
      <details><summary>${t("pf.moa")}</summary><p class="prose">${p.moa}</p><p class="small"><b>${t("pf.platform")}</b> ${p.technology}</p>
        <p class="small muted">${p.molecular_formula} · ${p.molecular_weight}</p></details>
      <details><summary>${t("pf.exc")} (${p.excipients.length})</summary><div class="tbl-wrap"><table><thead><tr><th>${t("pf.excName")}</th><th>${t("pf.role")}</th><th>${t("pf.rationale")}</th></tr></thead>
        <tbody>${p.excipients.map((e) => `<tr><td><b>${e.name}</b></td><td>${pill(e.role, "info")}</td><td class="small">${e.function}</td></tr>`).join("")}</tbody></table></div></details>
      <details><summary>${t("pf.trials")} (${p.key_trials.length})</summary>${p.key_trials.map((x) => `<div style="padding:10px 0;border-top:1px solid var(--line)" class="small"><b>${x.name}</b> <span class="muted">· ${x.citation}</span><br>${x.design}<br><span class="muted">${t("pf.endpoint")}</span> ${x.primary_endpoint}<br><span class="muted">${t("pf.result")}</span> ${x.result}</div>`).join("")}</details>
      <details><summary>${t("pf.safety")} (${p.side_effects.length})</summary><div class="tbl-wrap"><table><thead><tr><th>${t("pf.ae")}</th><th>${t("pf.inc")}</th><th>${t("pf.note")}</th></tr></thead>
        <tbody>${p.side_effects.map((s) => `<tr><td>${s.ae}</td><td class="small">${s.incidence}</td><td class="small">${s.note}</td></tr>`).join("")}</tbody></table></div>
        <p class="small"><b>${t("pf.ci")}</b> ${p.contraindications}</p></details>
    </div>`;
}

// ═════════════════════════════════════════════════════════════════
// DEALS & IP
// ═════════════════════════════════════════════════════════════════
function renderDeals(el) {
  const rc = Object.keys(D.rights[0]);
  const deals = D.deals.slice().sort((a, b) => b.date.localeCompare(a.date));
  const now = Number(D.meta.asOf.slice(0, 4)), endY = 2046, ip = D.ip.slice().sort((a, b) => a.expiry - b.expiry);
  el.innerHTML = `
    ${head(t("dl.eyebrow"), t("dl.title"))}
    <div class="card flush"><div style="padding:16px 18px 0"><h2>${t("rights")}</h2><div class="small muted" style="margin-top:-6px">${t("rights.legend")}</div></div>
      <div class="tbl-wrap"><table><thead><tr>${rc.map((c) => `<th>${t(`rt.${c}`)}</th>`).join("")}</tr></thead>
      <tbody>${D.rights.map((r) => `<tr>${rc.map((c, i) => `<td class="${i ? "small" : ""}">${i ? r[c] : `<b>${r[c]}</b>`}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>
    <div class="card flush"><div style="padding:16px 18px 0"><h2>${t("deallog")}</h2></div><div class="tbl-wrap"><table>
      <thead><tr><th>${t("dlc.date")}</th><th>${t("dlc.asset")}</th><th>${t("dlc.parties")}</th><th>${t("dlc.terr")}</th><th>${t("dlc.terms")}</th><th></th></tr></thead>
      <tbody>${deals.map((d) => `<tr><td class="tnum small nowrap">${d.date}</td><td><b>${d.asset}</b></td><td>${d.licensor} → <b>${d.licensee}</b></td><td class="small">${d.territory}</td><td class="small">${d.value_text}</td>
        <td class="small nowrap">${(d.sources || []).slice(0, 1).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${t("source")} ↗</a>`).join("")}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="card">
      <h2>${t("runway")}</h2>
      <div class="bars">${ip.map((r) => { const w = ((r.expiry - now) / (endY - now)) * 100, near = r.expiry <= now + 4;
        return `<div class="bar-row ip-row" data-tip="${esc(`<b>${r.asset}</b> · ${r.patent}<br>${r.holder}<br>${r.scope}`)}"><div class="small"><b>${r.asset}</b> <span class="muted">· ${r.patent}</span></div>
          <div class="bar-track"><div class="bar mid" style="width:${w}%;background:${near ? "var(--serious)" : "var(--accent)"}"></div><div class="bar-val mid" style="left:${w}%">${r.expiry}</div></div></div>`; }).join("")}</div>
      <div class="legend"><span><i style="background:var(--serious)"></i>${t("runway.near")}</span><span><i style="background:var(--accent)"></i>${t("runway.long")}</span></div>
      <div class="note">${t("runway.note")}</div>
    </div>
    <div class="grid g2">${D.ipNotes.map((n) => `<div class="card"><h2>${n.title}</h2><p class="small" style="margin:0;color:var(--ink-2)">${n.body}</p></div>`).join("")}</div>
    <details class="card"><summary style="margin:0">${t("combo")}</summary>
      <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>${t("pt.patent")}</th><th>${t("pt.holder")}</th><th>${t("pt.status")}</th><th>${t("pt.scope")}</th></tr></thead>
      <tbody>${D.patents.map((p) => `<tr><td><a href="${esc(p.ref)}" target="_blank" rel="noopener"><b>${p.no}</b> ↗</a></td><td class="small">${p.holder}</td><td class="small">${p.status}</td><td class="small">${p.scope}${p.note ? `<div class="muted" style="margin-top:4px">${p.note}</div>` : ""}</td></tr>`).join("")}</tbody></table></div>
    </details>`;
}

// ═════════════════════════════════════════════════════════════════
// SOURCES
// ═════════════════════════════════════════════════════════════════
function renderSources(el) {
  const md = (s) => s.split(/\n\n+/).map((p) => p.trim()).map((p) => /^\d\./.test(p)
    ? `<ol>${p.split(/\n(?=\d\.)/).map((l) => `<li>${l.replace(/^\d\.\s*/, "")}</li>`).join("")}</ol>`
    : `<p>${p}</p>`).join("").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>").replace(/`(.+?)`/g, "<code>$1</code>");
  const all = new Map();
  [...D.competitors, ...D.korea.companies, ...D.deals, ...D.events, ...D.changes].forEach((x) => (x.sources || []).forEach((s) => all.set(s.url, s)));
  const ev = D.events.slice().sort((a, b) => b.date.localeCompare(a.date));
  const cl = ["Verified", "Reported", "Estimate", "Unverified"].map((c) => `${conf(c)} ${t(`conf.${c}.d`)}`).join(" · ");
  el.innerHTML = `
    ${head(t("s.eyebrow"), t("s.title"))}
    <div class="grid g2">
      <div class="card small" style="color:var(--ink-2)"><h2 style="color:var(--ink)">${t("method")}</h2>${md(D.meta.method)}
        <p>${t("conf.label")} ${cl}</p></div>
      <div class="card"><h2>${t("open")}</h2><ul class="small" style="margin:0;padding-left:18px;color:var(--ink-2)">${D.meta.openQuestions.map((q) => `<li style="margin-bottom:6px">${q}</li>`).join("")}</ul></div>
    </div>
    <div class="card"><h2>${t("evlog")}</h2><ul class="tl">${ev.map((e) => `<li><div class="d">${e.date}</div><div><span class="t">${en(e.region)} · ${en(e.type)}</span>${e.text}</div></li>`).join("")}</ul></div>
    <div class="card"><h2>${t("srcidx")} (${all.size})</h2><div class="srcs" style="columns:2 280px;column-gap:24px">${[...all.values()].map((s) => `<div><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></div>`).join("")}</div></div>`;
}

// ═════════════════════════════════════════════════════════════════
// ROUTER + LANGUAGE SWITCH
// ═════════════════════════════════════════════════════════════════
const VIEWS = { overview: renderOverview, korea: renderKorea, competitors: renderCompetitors, products: renderProducts, deals: renderDeals, sources: renderSources };

function show() {
  const id = (location.hash || "#overview").slice(1);
  const tab = VIEWS[id] ? id : "overview";
  document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== tab));
  document.querySelectorAll(".tabs a").forEach((a) => a.setAttribute("aria-selected", a.dataset.tab === tab));
  if (!rendered[tab]) { VIEWS[tab](document.getElementById(tab)); rendered[tab] = true; }
}

function paintChrome() {
  document.documentElement.lang = LANG;
  document.title = t("brand.title");
  document.querySelectorAll("[data-i18n]").forEach((n) => (n.textContent = t(n.dataset.i18n)));
  $("#asof").textContent = t("brand.sub", { d: asOfText() });
  document.querySelectorAll("#lang button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lang === LANG));
}

async function load(lang) {
  if (!cache[lang]) cache[lang] = await fetch(DATA_FILE[lang]).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  return cache[lang];
}

async function setLang(lang) {
  LANG = lang;
  try { localStorage.setItem("lang", lang); } catch (e) { /* storage unavailable */ }
  const url = new URL(location.href); url.searchParams.set("lang", lang); history.replaceState(null, "", url);
  try { D = await load(lang); } catch (e) { if (lang !== "en") return setLang("en"); $("#overview").innerHTML = `<p class="lede">${t("load.err")}</p>`; return; }
  rendered = {};
  document.querySelectorAll(".panel").forEach((p) => (p.innerHTML = ""));
  paintChrome();
  show();
}

$("#lang").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b && b.dataset.lang !== LANG) setLang(b.dataset.lang); });
addEventListener("hashchange", () => { show(); scrollTo({ top: 0 }); });
setLang(LANG);
