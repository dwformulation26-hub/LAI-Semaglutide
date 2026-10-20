"use strict";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const THREAT = { 5: "Critical", 4: "High", 3: "Medium", 2: "Low", 1: "Minimal" };
const THREAT_COLOR = { 5: "var(--crit)", 4: "var(--serious)", 3: "var(--warn)", 2: "var(--good)", 1: "var(--good)" };
const CONF_CLASS = { Verified: "ok", Reported: "info", Estimate: "warn", Unverified: "crit" };

let D;            // data.json
const rendered = {};

// ── small builders ──────────────────────────────────────────────
const pill = (t, cls = "") => `<span class="pill ${cls}">${t}</span>`;
const conf = (c) => pill(esc(c || "Reported"), CONF_CLASS[c] || "");
const threat = (n) => (n ? `<span class="threat"><i style="background:${THREAT_COLOR[n]}"></i>${THREAT[n]}</span>` : `<span class="muted">—</span>`);
const scopeDot = (s) => `<span class="dot" style="background:var(--${s === "Korea" ? "korea" : "global"})"></span>`;
const srcs = (list) => (list && list.length ? `<div class="srcs">${list.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("")}</div>` : "");
const kpis = (list) => `<div class="kpis">${list.map((k) => `<div class="kpi"><div class="kpi-label">${k.label}</div><div class="kpi-num">${k.num}</div><div class="kpi-sub">${k.sub}</div></div>`).join("")}</div>`;
const head = (eyebrow, title, lede) => `<div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ""}</div>`;
const toDate = (s) => { const [y, m = 1, d = 1] = String(s).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };

// ── tooltip ─────────────────────────────────────────────────────
const tip = $("#tip");
document.addEventListener("pointermove", (e) => {
  const t = e.target.closest("[data-tip]");
  if (!t) { tip.hidden = true; return; }
  tip.innerHTML = t.dataset.tip;
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
    ${head(`Data as of ${D.meta.asOfLabel}`, "Presbyopia eye drops — who's competing, and how close they are", D.summary)}
    ${kpis(D.kpis)}
    <div class="split">
      <div class="card">
        <h2>Threat map</h2>
        <div class="small muted" style="margin:-6px 0 8px">Threat to a new entrant in Korea, against commercial readiness. Hover a point for detail.</div>
        <div class="tmap">${threatMap()}</div>
        <div class="legend"><span>${scopeDot("Korea")}Korean player / licensee</span><span>${scopeDot("Global")}Global originator</span></div>
      </div>
      <div class="card">
        <h2>What changed since your June build</h2>
        <ul class="changes">${D.changes.map((c) => `<li><div class="d">${c.date}</div><div><div class="h">${arrow[c.dir] || ""}${c.headline}</div><div class="i">${c.impact}</div></div></li>`).join("")}</ul>
        <div class="note"><span style="color:var(--crit)">▲</span> raises competitive pressure · <span style="color:var(--good)">▼</span> lowers it · <span style="color:var(--accent)">●</span> context</div>
      </div>
    </div>
    <div>
      <h2>Takeaways</h2>
      <div class="grid g3">${D.takeaways.map((t) => `<div class="card takeaway"><h3>${t.title}</h3><p>${t.body}</p></div>`).join("")}</div>
    </div>
    <div class="grid g2">
      <div class="card">
        <h2>US commercial reality — VIZZ net product sales</h2>
        ${hbars(D.revenue.map((r) => ({ label: r.period, v: r.usd_m, text: `$${r.usd_m.toFixed(2)}M`, tip: `<b>${r.period}</b><br>Net sales $${r.usd_m}M<br>${r.volume}<br>Prescribers ${r.prescribers}` })), 2)}
        <div class="note">LENZ is the only presbyopia-drop company that discloses sales. Source: LENZ quarterly releases (SEC 8-K).</div>
      </div>
      <div class="card">
        <h2>Commercial signals</h2>
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
  const ticksX = [[0, "Phase 2"], [1, "Phase 3"], [2, "Licensed"], [3, "Filed"], [4, "On market"]];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Threat map">
    <g class="grid">${[1, 2, 3, 4, 5].map((t) => `<line x1="${m.l}" x2="${W - m.r + 40}" y1="${y(t)}" y2="${y(t)}"/>`).join("")}</g>
    ${[1, 2, 3, 4, 5].map((t) => `<text x="${m.l - 10}" y="${y(t) + 4}" text-anchor="end">${THREAT[t]}</text>`).join("")}
    ${ticksX.map(([v, l]) => `<text x="${x(v)}" y="${H - m.b + 18}" text-anchor="middle">${l}</text>`).join("")}
    <text x="${(W - m.r + m.l) / 2}" y="${H - 4}" text-anchor="middle" style="fill:var(--muted)">Commercial readiness →</text>
    ${placed.map(({ p, dx, dy }) => {
      const cx = x(dx), cy = y(dy), col = p.scope === "Korea" ? "var(--korea)" : "var(--global)";
      const t = esc(`<b>${p.product}</b><br>${p.company}<br>${p.stage} · Threat ${THREAT[p.threat]}<br><span style="color:var(--ink-2)">${p.threat_why || ""}</span>`);
      return `<g data-tip="${t}"><circle cx="${cx}" cy="${cy}" r="7" fill="${col}"/><text class="lbl" x="${cx + 11}" y="${cy + 4}">${esc(p.short)}</text></g>`;
    }).join("")}
  </svg>`;
}

function hbars(rows, digits = 0, max) {
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
    ${head("Korea · 국내 노안 점안제", "The Korean race to the first MFDS approval", K.summary)}
    ${kpis(K.kpis)}
    <div class="card">
      <h2>MFDS race</h2>
      ${gantt(K.race)}
      <div class="legend">
        <span><i style="background:var(--seg-solid)"></i>Confirmed (licence → filing → review)</span>
        <span><i style="background:var(--seg-light)"></i>Expected — analyst estimate</span>
        <span><i style="background:var(--seg-market)"></i>On market (glaucoma label, off-label use)</span>
        <span><i style="background:var(--seg-market-light)"></i>Expected launch</span>
        <span>◆ milestone</span>
      </div>
    </div>
    <div>
      <h2>Company profiles</h2>
      <div class="grid g2">${K.companies.slice().sort((a, b) => (b.focus ? 1 : 0) - (a.focus ? 1 : 0) || b.threat - a.threat).map(company).join("")}</div>
    </div>
    <div class="grid g2">
      <div class="card">
        <h2>Licence chains into Korea</h2>
        ${K.chains.map((c) => `<div style="padding:9px 0;border-top:1px solid var(--line)"><div class="small" style="font-weight:600;margin-bottom:3px">${c.product}</div>
          <div class="chain">${c.chain.map((x) => `<span>${x}</span>`).join(`<span class="arrow2">→</span>`)}</div><div class="small muted">${c.note}</div></div>`).join("")}
      </div>
      <div class="card">
        <h2>Korea timeline</h2>
        <ul class="tl">${kEvents.map((e) => `<li><div class="d">${e.date}</div><div><span class="t">${e.type}</span>${e.text}</div></li>`).join("")}</ul>
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
    ${more.length ? `<details><summary>More detail</summary>${dl(more)}</details>` : ""}
    <div class="why"><b>Assessment.</b> ${p.threat_why}</div>
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
    <div class="g-row axis"><div></div><div class="g-track">${ticks}<div class="g-today" style="left:${today}%"><span>Today</span></div></div></div>
    ${rows.map((r) => `<div class="g-row"><div class="g-label">${r.product}<small>${r.company}</small></div><div class="g-track">
      ${years.map((y) => `<div class="g-tick" style="left:${pct(`${y}-01-01`)}%"></div>`).join("")}
      <div class="g-today" style="left:${today}%"></div>
      ${r.segments.map((s) => { const l = pct(s.start), w = Math.max(0.6, pct(s.end) - l);
        return `<div class="g-seg ${cls[s.phase]}" style="left:${l}%;width:${w}%" data-tip="${esc(`<b>${r.product} · ${r.company}</b><br>${s.phase}: ${s.start} → ${s.end}<br><span style='color:var(--ink-2)'>${s.note || ""}</span>`)}"></div>`; }).join("")}
      ${(r.milestones || []).map((m) => `<div class="g-ms" style="left:${pct(m.date)}%" data-tip="${esc(`<b>${m.label}</b><br>${m.date}`)}"></div>`).join("")}
    </div></div>`).join("")}
  </div></div>`;
}

// ═════════════════════════════════════════════════════════════════
// COMPETITORS
// ═════════════════════════════════════════════════════════════════
const F = { scope: "All", stage: "All", q: "", hideDead: true, open: null };

function renderCompetitors(el) {
  const stages = D.meta.stageOrder.filter((s) => D.competitors.some((c) => c.stage === s));
  el.innerHTML = `
    ${head("Competitor landscape", "Every tracked asset, Korea and global", D.pipelineSummary)}
    <div class="filters">
      <div class="seg" id="f-scope">${["All", "Korea", "Global"].map((s) => `<button type="button" data-v="${s}" aria-pressed="${F.scope === s}">${s}</button>`).join("")}</div>
      <select id="f-stage" aria-label="Stage"><option value="All">All stages</option>${stages.map((s) => `<option${F.stage === s ? " selected" : ""}>${s}</option>`).join("")}</select>
      <input type="search" id="f-q" placeholder="Search company, API, mechanism…" value="${esc(F.q)}" aria-label="Search">
      <label class="chk"><input type="checkbox" id="f-dead" ${F.hideDead ? "checked" : ""}> Hide discontinued</label>
      <button class="btn" id="f-csv" type="button">Download CSV</button>
    </div>
    <div class="card flush"><div class="tbl-wrap"><table>
      <thead><tr><th>Asset</th><th>Company</th><th>Mechanism</th><th>Highest stage</th><th>Korea</th><th>Threat</th></tr></thead>
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
    .filter((c) => !q || [c.product, c.company, c.api, c.mechanism, c.origin, c.kr_status].join(" ").toLowerCase().includes(q))
    .sort((a, b) => (b.scope === "Korea") - (a.scope === "Korea") || (b.threat || 0) - (a.threat || 0) || order.indexOf(a.stage) - order.indexOf(b.stage));
}

function drawRows() {
  const rows = filtered();
  $("#c-body").innerHTML = rows.map((c) => {
    const row = `<tr class="row" data-id="${c.id}" aria-expanded="${F.open === c.id}"><td>${scopeDot(c.scope)}<b>${c.product}</b></td><td>${c.company}</td>
      <td class="small">${c.mechanism}</td><td>${pill(c.stage, c.stage.startsWith("Discontinued") ? "crit" : c.stage.startsWith("Approved") || c.stage.startsWith("Off-label") ? "ok" : c.stage === "Filed" ? "info" : "")}</td>
      <td class="small">${c.kr_status && c.kr_status !== "—" ? c.kr_status.split(";")[0] : `<span class="muted">—</span>`}</td><td>${threat(c.threat)}</td></tr>`;
    if (F.open !== c.id) return row;
    const f = (k, v) => (v && v !== "—" ? `<div><div class="k">${k}</div><div class="v">${v}</div></div>` : "");
    return row + `<tr class="detail"><td colspan="6">
      <div class="facts">${f("API", c.api)}${f("Formulation", c.formulation)}${f("Duration", c.duration)}${f("US", c.us_status)}${f("Korea", c.kr_status)}${f("Other markets", c.other_status)}${f("Latest", c.latest)}${f("Next milestone", c.next_milestone)}</div>
      <div class="grid g2" style="margin-top:12px"><div class="small"><b>Differentiator.</b> ${c.differentiator}</div><div class="small"><b>Weakness / risk.</b> ${c.weakness}</div></div>
      ${c.threat_why ? `<div class="small" style="margin-top:10px"><b>Threat rationale.</b> ${c.threat_why}</div>` : ""}
      <div style="margin-top:10px">${conf(c.confidence)}</div>${srcs(c.sources)}</td></tr>`;
  }).join("") || `<tr><td colspan="6" class="muted">No assets match these filters.</td></tr>`;
  $("#c-count").textContent = `${rows.length} of ${D.competitors.length} assets · click a row for detail`;
}

function downloadCsv() {
  const cols = ["product", "company", "scope", "origin", "api", "mechanism", "stage", "us_status", "kr_status", "other_status", "duration", "next_milestone", "threat", "confidence"];
  const strip = (v) => String(v ?? "").replace(/<[^>]+>/g, "").replace(/"/g, '""');
  const csv = [cols.join(","), ...filtered().map((c) => cols.map((k) => `"${strip(k === "threat" ? THREAT[c.threat] || "" : c[k])}"`).join(","))].join("\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })), download: "presbyopia-competitors.csv" });
  a.click(); URL.revokeObjectURL(a.href);
}

// ═════════════════════════════════════════════════════════════════
// PRODUCTS
// ═════════════════════════════════════════════════════════════════
let PROD = "VIZZ";
function renderProducts(el) {
  const h = D.headToHead;
  const dur = h.map((r) => ({ label: r.product, v: r.duration_h, text: `${r.duration_h} h`, tip: `<b>${r.product}</b>: up to ${r.duration_h} h` }));
  const resp = h.filter((r) => r.responder_pct != null);
  const respBars = `<div class="bars">${resp.map((r) => `<div class="bar-row" data-tip="${esc(`<b>${r.product}</b> · ${r.trial}<br>${r.timepoint}<br>Active ${r.responder_pct}%${r.vehicle_pct != null ? ` · vehicle ${r.vehicle_pct}%` : " · vehicle ~10–15% (pooled)"}`)}">
      <div>${r.product}</div><div class="pair">
      <div class="pair-line"><span class="pbar" style="width:${r.responder_pct}%"></span><span class="pval">${r.responder_pct}%</span></div>
      <div class="pair-line">${r.vehicle_pct != null ? `<span class="pbar veh" style="width:${r.vehicle_pct}%"></span><span class="pval">${r.vehicle_pct}%</span>` : `<span class="pval muted">vehicle ~10–15% (pooled)</span>`}</div>
      </div></div>`).join("")}</div>`;
  const cols = Object.keys(D.positioning[0]);
  el.innerHTML = `
    ${head("Products", "Head-to-head and product deep-dives", "Cross-trial comparisons are indicative only — endpoints, timepoints and populations differ between programmes.")}
    <div class="grid g2">
      <div class="card"><h2>Duration of effect</h2>${hbars(dur, 0, 24)}<div class="note">Hours per dose, label or pivotal data. RYZUMVI = 12 h primary endpoint after a bedtime dose.</div></div>
      <div class="card"><h2>Pivotal responders, ≥3-line near-vision gain</h2>${respBars}
        <div class="legend"><span><i style="background:var(--accent)"></i>Active</span><span><i style="background:var(--vehicle)"></i>Vehicle / placebo</span></div>
        <div class="note">QLOSI and YUVEZZI omitted: no comparable responder rate in the collected sources.</div></div>
    </div>
    <div class="card flush"><div class="tbl-wrap"><table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>${D.positioning.map((r) => `<tr>${cols.map((c, i) => `<td class="${i ? "small" : ""}">${i ? r[c] : `<b>${r[c]}</b>`}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>
    <div>
      <h2>Product deep-dive</h2>
      <div class="seg" id="p-pick" style="margin-bottom:16px">${D.products.map((p) => `<button type="button" data-k="${p.key}" aria-pressed="${p.key === PROD}">${p.key}</button>`).join("")}</div>
      <div id="p-body"></div>
    </div>
    <details class="card"><summary style="margin:0">PK/PD evidence base (${D.pkpd.length} studies, from your June build)</summary>
      <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Drug</th><th>Study</th><th>Model</th><th>Key result</th><th>Ref</th></tr></thead>
      <tbody>${D.pkpd.map((s) => `<tr><td><b>${s.drug}</b></td><td class="small">${s.study}</td><td class="small">${s.model}</td><td class="small">${s.result}</td><td class="small"><a href="${esc(s.ref)}" target="_blank" rel="noopener">${s.ref_short} ↗</a></td></tr>`).join("")}</tbody></table></div>
    </details>`;
  $("#p-pick", el).addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; PROD = b.dataset.k; el.querySelectorAll("#p-pick button").forEach((x) => x.setAttribute("aria-pressed", x === b)); drawProduct(); });
  drawProduct();
}

function drawProduct() {
  const p = D.products.find((x) => x.key === PROD);
  const f = (k, v) => `<div><div class="k">${k}</div><div class="v">${v}</div></div>`;
  $("#p-body").innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline">
        <div><div style="font-size:22px;font-weight:680">${p.brand}</div><div class="muted">${p.generic}</div></div>
        <div>${pill(p.status || p.approval_status, "ok")}</div>
      </div>
      ${p.updates.length ? `<div class="update" style="margin-top:14px"><b>Updated Oct 2026</b><ul>${p.updates.map((u) => `<li>${u}</li>`).join("")}</ul></div>` : ""}
      <div class="facts" style="margin-top:14px">
        ${f("Company", p.company)}${f("Application", `${p.nda_number} · ${p.application_type}`)}${f("Class", p.drug_class)}
        ${f("Concentration", p.concentration)}${f("Dosing", p.dosing)}${f("Onset / duration", `${p.onset} · ${p.duration}`)}
        ${f("Dosage form", p.dosage_form)}${f("Preservative · pH", `${p.preservative} · ${p.ph_range}`)}${f("Storage", p.storage)}
      </div>
      <p class="small" style="margin:14px 0 0"><b>Efficacy.</b> <span style="color:var(--ink-2)">${p.efficacy_summary}</span></p>
      <details><summary>Mechanism &amp; technology</summary><p class="prose">${p.moa}</p><p class="small"><b>Platform.</b> ${p.technology}</p>
        <p class="small muted">${p.molecular_formula} · ${p.molecular_weight}</p></details>
      <details><summary>Excipients (${p.excipients.length})</summary><div class="tbl-wrap"><table><thead><tr><th>Excipient</th><th>Role</th><th>Rationale</th></tr></thead>
        <tbody>${p.excipients.map((e) => `<tr><td><b>${e.name}</b></td><td>${pill(e.role, "info")}</td><td class="small">${e.function}</td></tr>`).join("")}</tbody></table></div></details>
      <details><summary>Key trials (${p.key_trials.length})</summary>${p.key_trials.map((t) => `<div style="padding:10px 0;border-top:1px solid var(--line)" class="small"><b>${t.name}</b> <span class="muted">· ${t.citation}</span><br>${t.design}<br><span class="muted">Endpoint:</span> ${t.primary_endpoint}<br><span class="muted">Result:</span> ${t.result}</div>`).join("")}</details>
      <details><summary>Safety (${p.side_effects.length})</summary><div class="tbl-wrap"><table><thead><tr><th>Adverse effect</th><th>Incidence</th><th>Note</th></tr></thead>
        <tbody>${p.side_effects.map((s) => `<tr><td>${s.ae}</td><td class="small">${s.incidence}</td><td class="small">${s.note}</td></tr>`).join("")}</tbody></table></div>
        <p class="small"><b>Contraindications.</b> ${p.contraindications}</p></details>
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
    ${head("Deals & IP", "Who holds rights where, and for how long")}
    <div class="card flush"><div style="padding:16px 18px 0"><h2>Territory rights</h2><div class="small muted" style="margin-top:-6px">✓ approved · ⏳ filed · ✎ licensed, not filed</div></div>
      <div class="tbl-wrap"><table><thead><tr>${rc.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>${D.rights.map((r) => `<tr>${rc.map((c, i) => `<td class="${i ? "small" : ""}">${i ? r[c] : `<b>${r[c]}</b>`}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>
    <div class="card flush"><div style="padding:16px 18px 0"><h2>Deal log</h2></div><div class="tbl-wrap"><table>
      <thead><tr><th>Date</th><th>Asset</th><th>Licensor → licensee</th><th>Territory</th><th>Terms</th><th></th></tr></thead>
      <tbody>${deals.map((d) => `<tr><td class="tnum small nowrap">${d.date}</td><td><b>${d.asset}</b></td><td>${d.licensor} → <b>${d.licensee}</b></td><td class="small">${d.territory}</td><td class="small">${d.value_text}</td>
        <td class="small nowrap">${(d.sources || []).slice(0, 1).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">source ↗</a>`).join("")}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="card">
      <h2>Protection runway</h2>
      <div class="bars">${ip.map((r) => { const w = ((r.expiry - now) / (endY - now)) * 100, near = r.expiry <= now + 4;
        return `<div class="bar-row ip-row" data-tip="${esc(`<b>${r.asset}</b> · ${r.patent}<br>${r.holder}<br>${r.scope}`)}"><div class="small"><b>${r.asset}</b> <span class="muted">· ${r.patent}</span></div>
          <div class="bar-track"><div class="bar mid" style="width:${w}%;background:${near ? "var(--serious)" : "var(--accent)"}"></div><div class="bar-val mid" style="left:${w}%">${r.expiry}</div></div></div>`; }).join("")}</div>
      <div class="legend"><span><i style="background:var(--serious)"></i>Expires within 4 years — possible freedom-to-operate window</span><span><i style="background:var(--accent)"></i>Longer runway</span></div>
      <div class="note">US data, excluding extensions unless stated. Korean national-phase status needs counsel review.</div>
    </div>
    <div class="grid g2">${D.ipNotes.map((n) => `<div class="card"><h2>${n.title}</h2><p class="small" style="margin:0;color:var(--ink-2)">${n.body}</p></div>`).join("")}</div>
    <details class="card"><summary style="margin:0">Pilocarpine + brimonidine combination patents (your June build)</summary>
      <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Patent</th><th>Holder</th><th>Status</th><th>Scope</th></tr></thead>
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
  el.innerHTML = `
    ${head("Sources & method", "How this was built, and what's still open")}
    <div class="grid g2">
      <div class="card small" style="color:var(--ink-2)"><h2 style="color:var(--ink)">Method</h2>${md(D.meta.method)}
        <p>Confidence tags: ${conf("Verified")} primary source · ${conf("Reported")} trade press · ${conf("Estimate")} derived · ${conf("Unverified")} lead only.</p></div>
      <div class="card"><h2>Open questions</h2><ul class="small" style="margin:0;padding-left:18px;color:var(--ink-2)">${D.meta.openQuestions.map((q) => `<li style="margin-bottom:6px">${q}</li>`).join("")}</ul></div>
    </div>
    <div class="card"><h2>Event log</h2><ul class="tl">${ev.map((e) => `<li><div class="d">${e.date}</div><div><span class="t">${e.region} · ${e.type}</span>${e.text}</div></li>`).join("")}</ul></div>
    <div class="card"><h2>Source index (${all.size})</h2><div class="srcs" style="columns:2 280px;column-gap:24px">${[...all.values()].map((s) => `<div><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></div>`).join("")}</div></div>`;
}

// ═════════════════════════════════════════════════════════════════
// ROUTER
// ═════════════════════════════════════════════════════════════════
const VIEWS = { overview: renderOverview, korea: renderKorea, competitors: renderCompetitors, products: renderProducts, deals: renderDeals, sources: renderSources };

function show() {
  const id = (location.hash || "#overview").slice(1);
  const tab = VIEWS[id] ? id : "overview";
  document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== tab));
  document.querySelectorAll(".tabs a").forEach((a) => a.setAttribute("aria-selected", a.dataset.tab === tab));
  if (!rendered[tab]) { VIEWS[tab](document.getElementById(tab)); rendered[tab] = true; }
}

fetch("data.json")
  .then((r) => r.json())
  .then((d) => {
    D = d;
    $("#asof").textContent = `Korea & global competitors · as of ${D.meta.asOfLabel}`;
    addEventListener("hashchange", () => { show(); scrollTo({ top: 0 }); });
    show();
  })
  .catch(() => { $("#overview").innerHTML = `<p class="lede">Could not load data.json.</p>`; });
