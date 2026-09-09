import { FAMILY_LABELS, FAMILY_COLORS, FINDING_LABELS, STAGE_COLORS, STAGES, formatDate, prepareDatabase, safeUrl, truncate } from "./model.js";
import { DEFAULT_LANG, LANGS, familyLabelText, findingLabelText, originLabelText, stageLabelText, t } from "./i18n.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { data: null, rawPayload: null, lang: DEFAULT_LANG, programQuery: "", stage: "all", expandedPrograms: new Set() };

function node(tag, className = "", text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const clear = (element) => { element.replaceChildren(); return element; };
const badge = (text, tone = "blue") => node("span", `pill pill-${tone}`, text);
const firstSentence = (value, lang) => truncate(String(value || (lang === "ko" ? "업데이트 기록됨" : "Update recorded")).replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/)[0], 125);

function sourceAnchor(value, label, lang) {
  const anchor = node("a", "source-link", label);
  const url = safeUrl(value);
  if (!url) {
    anchor.textContent = t(lang, "source.noLink");
    anchor.setAttribute("aria-disabled", "true");
    return anchor;
  }
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  return anchor;
}

function evidenceTone(type) {
  return { trial_data_readout: "blue", regulatory: "violet", deal_partnership: "green", market_reaction: "orange", manufacturing_capacity: "amber", financing_investor: "blue" }[type] ?? "blue";
}

function getStoredLang() {
  try {
    const stored = localStorage.getItem("lai-lang");
    return LANGS.includes(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function applyStaticStrings(lang) {
  $$("[data-i18n]").forEach((el) => { el.textContent = t(lang, el.dataset.i18n); });
  $$("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(lang, el.dataset.i18nPlaceholder); });
  $$("[data-i18n-aria-label]").forEach((el) => { el.setAttribute("aria-label", t(lang, el.dataset.i18nAriaLabel)); });
  document.documentElement.lang = lang;
  document.title = t(lang, "meta.title");
}

function updateLangToggle(lang) {
  $$(".lang-toggle").forEach((toggle) => {
    toggle.classList.toggle("is-ko", lang === "ko");
    toggle.setAttribute("aria-checked", String(lang === "ko"));
    $$("[data-lang]", toggle).forEach((option) => option.setAttribute("aria-pressed", String(option.dataset.lang === lang)));
  });
}

function setLang(lang) {
  if (lang === state.lang) return;
  state.lang = lang;
  try { localStorage.setItem("lai-lang", lang); } catch { /* private mode or blocked storage */ }
  applyStaticStrings(lang);
  updateLangToggle(lang);
  if (state.rawPayload) {
    state.data = prepareDatabase(state.rawPayload, lang);
    renderAll(state.data);
  }
}

function renderHeader(data) {
  const lang = state.lang;
  const displayDate = formatDate(data.latestDataDate, true, lang);
  $("#latest-date").textContent = displayDate;
  $("#mobile-date").textContent = displayDate;
  $("#rail-freshness").textContent = t(lang, "rail.freshness", { count: data.records.length, date: displayDate });
  $("#footer-status").textContent = t(lang, "footer.snapshot", { date: displayDate });
}

function renderOverview(data) {
  const lang = state.lang;
  const programs = [...data.semaglutidePrograms].sort((a, b) =>
    b.stageOrder - a.stageOrder || String(b.current_status?.last_updated ?? "").localeCompare(String(a.current_status?.last_updated ?? ""))
  );
  $("#race-caption").textContent = t(lang, "overview.raceCaption", { count: programs.length });
  const chart = clear($("#race-chart"));
  programs.forEach((program) => {
    const row = node("div", `race-row${program.isOurProduct ? " ours" : ""}`);
    const name = node("div", "race-name");
    name.append(node("strong", "", `${truncate(program.program, 38)}${program.isOurProduct ? " ★" : ""}`), node("span", "", program.company));
    const track = node("div", "race-track");
    const bar = node("div", "race-bar", stageLabelText(program.stageLabel, lang));
    bar.style.width = `${Math.max(7, Math.min(100, (Math.max(program.stageOrder, .35) / 6) * 100))}%`;
    bar.style.background = program.isOurProduct ? "#178665" : STAGE_COLORS[program.stageLabel];
    track.append(bar);
    row.append(name, track);
    chart.append(row);
  });

  $("#leader-company").textContent = data.leader.company;
  $("#leader-program").textContent = data.leader.program;
  $("#leader-stage").textContent = stageLabelText(data.leader.stageLabel, lang);
  $("#leader-summary").textContent = truncate(data.leader.current_status?.stage, 330);
  $("#leader-interpretation").textContent = data.leaderNote;

  const conditions = [
    ["01", t(lang, "conditions.tracked.label"), data.records.length, t(lang, "conditions.tracked.badge"), "blue", t(lang, "conditions.tracked.detail", { count: data.findings.length }), "#367fd0"],
    ["02", t(lang, "conditions.pending.label"), data.pendingCandidates.length, t(lang, "conditions.pending.badge"), "amber", t(lang, "conditions.pending.detail"), "#e4a11b"],
    ["03", t(lang, "conditions.monitoring.label"), `${data.health.healthyCount}/${data.health.total}`, data.health.allHealthy ? t(lang, "conditions.monitoring.badgeActive") : t(lang, "conditions.monitoring.badgeAttention"), data.health.allHealthy ? "green" : "orange", data.health.summary, "#2bb98a"]
  ];
  const container = clear($("#tracking-conditions"));
  conditions.forEach(([index, label, value, badgeText, tone, detail, color]) => {
    const card = node("article", "condition-card");
    card.style.setProperty("--tone", color);
    const top = node("div", "condition-top");
    top.append(node("span", "condition-label", label), node("span", "condition-index", index));
    card.append(top, node("h3", "", String(value)), badge(badgeText, tone), node("p", "", detail));
    container.append(card);
  });
}

function renderIntelligence(data) {
  const lang = state.lang;
  const feed = clear($("#latest-feed"));
  data.findings.slice(0, 6).forEach((finding) => {
    const article = node("article", "feed-item");
    const meta = node("div", "feed-meta");
    meta.append(node("strong", "", formatDate(finding.date, true, lang)), node("span", "", finding.company));
    const copy = node("div", "feed-copy");
    copy.append(node("h3", "", firstSentence(finding.summary, lang)), node("p", "", truncate(finding.summary, 300)));
    const tag = node("span", `tag pill-${evidenceTone(finding.type)}`, findingLabelText(finding.type, lang));
    copy.append(tag);
    article.append(meta, copy, sourceAnchor(finding.sourceUrl, t(lang, "intelligence.source"), lang));
    feed.append(article);
  });

  const newest = data.findings[0]?.timestamp ?? Date.now();
  const recent = data.findings.filter((finding) => finding.timestamp >= newest - 30 * 86400000);
  const counts = new Map();
  recent.forEach((finding) => counts.set(finding.type, (counts.get(finding.type) ?? 0) + 1));
  const topType = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  const items = [
    [t(lang, "readout.leadLabel"), `${data.leader.company} · ${stageLabelText(data.leader.stageLabel, lang)}`],
    [t(lang, "readout.volumeLabel"), t(lang, "readout.volumeValue", { count: recent.length, topType: topType ? t(lang, "readout.volumeTopType", { label: findingLabelText(topType, lang) }) : "" })],
    [t(lang, "readout.attentionLabel"), t(lang, "readout.attentionValue", { count: data.pendingCandidates.length })],
    [t(lang, "readout.monitoringLabel"), data.health.summary]
  ];
  const readout = clear($("#readout"));
  items.forEach(([title, body]) => {
    const item = node("div", "readout-item");
    item.append(node("strong", "", title), node("p", "", body));
    readout.append(item);
  });
}

function renderStatistics(data) {
  const lang = state.lang;
  const confirmed = data.findings.filter((finding) => finding.confidence === "confirmed").length;
  const korean = data.records.filter((record) => record.origin === "KR").length;
  const values = [
    [data.records.length, t(lang, "statistics.programsTracked"), t(lang, "statistics.programsTrackedDetail", { korean, global: data.records.length - korean })],
    [data.semaglutidePrograms.length, t(lang, "statistics.semaglutideLinked"), t(lang, "statistics.semaglutideLinkedDetail")],
    [data.findings.length, t(lang, "statistics.historicalFindings"), t(lang, "statistics.historicalFindingsDetail")],
    [confirmed, t(lang, "statistics.confirmedEvidence"), t(lang, "statistics.confirmedEvidenceDetail", { count: data.findings.length - confirmed })]
  ];
  const metrics = clear($("#metrics"));
  values.forEach(([value, label, detail]) => {
    const card = node("article", "metric");
    card.append(node("strong", "", String(value)), node("span", "", label), node("small", "", detail));
    metrics.append(card);
  });

  const familyCounts = new Map();
  data.records.forEach((record) => familyCounts.set(record.technology_family ?? "other", (familyCounts.get(record.technology_family ?? "other") ?? 0) + 1));
  const families = [...familyCounts].sort((a, b) => b[1] - a[1]);
  const maximum = Math.max(...families.map(([, count]) => count), 1);
  const chart = clear($("#family-chart"));
  families.forEach(([family, count]) => {
    const row = node("div", "family-row");
    const track = node("div", "family-track");
    const bar = node("div", "family-bar");
    bar.style.width = `${count / maximum * 100}%`;
    bar.style.background = FAMILY_COLORS[family] ?? FAMILY_COLORS.other;
    track.append(bar);
    row.append(node("span", "", familyLabelText(family, lang)), track, node("strong", "", String(count)));
    chart.append(row);
  });

  const percent = data.findings.length ? Math.round(confirmed / data.findings.length * 100) : 0;
  const wrap = node("div", "donut-wrap");
  const donut = node("div", "donut");
  donut.style.setProperty("--confirmed", percent);
  const label = node("div", "donut-label");
  label.append(node("strong", "", `${percent}%`), node("span", "", t(lang, "statistics.confirmedLabel")));
  donut.append(label);
  const legend = node("div", "legend");
  [["#2bb98a", t(lang, "statistics.confirmed"), confirmed], ["#e4a11b", t(lang, "statistics.unverified"), data.findings.length - confirmed]].forEach(([color, name, count]) => {
    const row = node("div", "legend-row");
    const dot = node("span", "legend-dot"); dot.style.background = color;
    row.append(dot, node("span", "", name), node("strong", "", String(count)));
    legend.append(row);
  });
  wrap.append(donut, legend);
  clear($("#evidence-chart")).append(wrap);
}

function stageBadge(stage, lang, inferred) {
  const element = node("span", "stage-badge", stageLabelText(stage, lang));
  element.style.setProperty("--stage-color", STAGE_COLORS[stage]);
  if (inferred) {
    element.title = t(lang, "programs.stageInferredTitle");
    element.append(node("sup", "stage-badge-flag", "†"));
  }
  return element;
}

function tableCell(label, content, secondary) {
  const cell = node("td");
  cell.dataset.label = label;
  cell.append(content instanceof Node ? content : node("strong", "", content || "—"));
  if (secondary) cell.append(node("span", "", secondary));
  return cell;
}

function filteredPrograms() {
  const query = state.programQuery.trim().toLowerCase();
  return [...state.data.records]
    .filter((record) => state.stage === "all" || record.stageLabel === state.stage)
    .filter((record) => !query || [record.canonical_name, record.technology_family, record.current_status?.stage].join(" ").toLowerCase().includes(query))
    .sort((a, b) => b.stageOrder - a.stageOrder || String(b.current_status?.last_updated ?? "").localeCompare(String(a.current_status?.last_updated ?? "")));
}

function toggleExpand(id) {
  if (state.expandedPrograms.has(id)) state.expandedPrograms.delete(id);
  else state.expandedPrograms.add(id);
  renderPrograms();
}

function evidenceItem(finding, lang) {
  const item = node("article", "evidence-item");
  const date = node("div", "evidence-date");
  date.append(node("strong", "", formatDate(finding.date, true, lang)), node("span", "", finding.confidence === "confirmed" ? t(lang, "evidence.confirmed") : t(lang, "evidence.unverified")));
  const copy = node("div", "evidence-copy");
  copy.append(
    node("span", `tag pill-${evidenceTone(finding.type)}`, findingLabelText(finding.type, lang)),
    node("p", "", finding.summary),
    node("small", "", `${finding.sourceName} · ${t(lang, "evidence.tier", { tier: finding.sourceTier ?? "—" })}`)
  );
  const source = node("div", "evidence-source");
  const url = safeUrl(finding.sourceUrl);
  if (url) { const link = node("a", "", t(lang, "evidence.open")); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; source.append(link); }
  else source.append(node("span", "", "—"));
  item.append(date, copy, source);
  return item;
}

function programNameCell(record, count, expanded, lang) {
  const cell = node("td");
  cell.dataset.label = t(lang, "programs.col.program");
  const button = node("button", "row-toggle");
  button.type = "button";
  button.setAttribute("aria-expanded", String(expanded));
  const text = node("span", "row-toggle-text");
  text.append(
    node("strong", "", record.company),
    node("span", "", record.program),
    node("em", "", t(lang, "programs.findingCount", { count, plural: count === 1 ? "" : "s" }))
  );
  button.append(node("span", "caret", "›"), text);
  button.addEventListener("click", () => toggleExpand(record.id));
  cell.append(button);
  return cell;
}

function renderPrograms() {
  const lang = state.lang;
  const records = filteredPrograms();
  const body = clear($("#program-table"));
  $("#program-empty").hidden = records.length > 0;
  records.forEach((record) => {
    const findings = state.data.findings.filter((finding) => finding.recordId === record.id);
    const expanded = state.expandedPrograms.has(record.id);
    const row = node("tr", "program-row");
    row.append(
      programNameCell(record, findings.length, expanded, lang),
      tableCell(t(lang, "programs.col.origin"), originLabelText(record.origin, lang)),
      tableCell(t(lang, "programs.col.technology"), familyLabelText(record.technology_family, lang)),
      tableCell(t(lang, "programs.col.stage"), stageBadge(record.stageLabel, lang, record.stageInferred)),
      tableCell(t(lang, "programs.col.status"), truncate(record.current_status?.stage, 190)),
      tableCell(t(lang, "programs.col.updated"), formatDate(record.current_status?.last_updated, true, lang))
    );
    body.append(row);

    const detailRow = node("tr", "evidence-row");
    detailRow.hidden = !expanded;
    const detailCell = node("td");
    detailCell.colSpan = 6;
    const list = node("div", "evidence-list");
    if (findings.length) findings.forEach((finding) => list.append(evidenceItem(finding, lang)));
    else list.append(node("div", "empty-state", t(lang, "evidence.empty")));
    detailCell.append(list);
    detailRow.append(detailCell);
    body.append(detailRow);
  });
}

function renderCandidates(data) {
  const lang = state.lang;
  const container = clear($("#candidate-list"));
  data.pendingCandidates.forEach((candidate) => {
    const card = node("article", "candidate-card");
    card.append(badge(t(lang, "review.pendingBadge"), "amber"), node("h3", "", candidate.detected_name ?? "Unnamed candidate"));
    const evidence = [...(candidate.evidence ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    card.append(node("p", "", truncate(evidence?.snippet ?? t(lang, "review.noEvidence"), 260)));
    const footer = node("footer");
    const score = Number(candidate.fuzzy_match?.score);
    footer.append(node("span", "", Number.isFinite(score) ? t(lang, "review.matchScore", { score: score.toFixed(2) }) : t(lang, "review.noMatchScore")));
    const url = safeUrl(evidence?.source?.url);
    if (url) { const link = node("a", "", t(lang, "review.reviewSource")); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; footer.append(link); }
    card.append(footer);
    container.append(card);
  });
  if (!data.pendingCandidates.length) container.append(node("div", "empty-state panel", t(lang, "review.empty")));
}

const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
function downloadCsv(fileName, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = fileName; document.body.append(anchor); anchor.click(); anchor.remove();
  URL.revokeObjectURL(url);
}

function populateFilters(data, lang) {
  const select = $("#stage-filter");
  const current = select.value;
  clear(select);
  const allOption = node("option", "", t(lang, "programs.allStages"));
  allOption.value = "all";
  select.append(allOption);
  [...new Set(data.records.map((record) => record.stageLabel))].sort((a, b) => STAGES[b] - STAGES[a]).forEach((stage) => {
    const option = node("option", "", stageLabelText(stage, lang)); option.value = stage; select.append(option);
  });
  select.value = [...select.options].some((option) => option.value === current) ? current : "all";
}

// CSV export always uses the English label maps, independent of the UI language,
// so the exported file stays a stable, consistently-formatted interop artifact.
function exportProgramsWithEvidence() {
  const headers = ["Program", "Origin", "Technology", "Normalized stage", "Reported status", "Dosing target", "Program updated", "Finding date", "Finding type", "Finding summary", "Confidence", "Source", "Tier", "URL"];
  const rows = filteredPrograms().flatMap((record) => {
    const base = [record.canonical_name, record.origin, FAMILY_LABELS[record.technology_family] ?? record.technology_family, record.stageLabel, record.current_status?.stage, record.current_status?.dosing_target, record.current_status?.last_updated];
    const findings = state.data.findings.filter((finding) => finding.recordId === record.id);
    if (!findings.length) return [[...base, "", "", "", "", "", "", ""]];
    return findings.map((finding) => [...base, finding.date, FINDING_LABELS[finding.type] ?? finding.type, finding.summary, finding.confidence, finding.sourceName, finding.sourceTier, finding.sourceUrl]);
  });
  downloadCsv("lai-programs-evidence.csv", headers, rows);
}

function bindEvents() {
  $("#program-search").addEventListener("input", (event) => { state.programQuery = event.target.value; renderPrograms(); });
  $("#stage-filter").addEventListener("change", (event) => { state.stage = event.target.value; renderPrograms(); });
  $("#program-export").addEventListener("click", exportProgramsWithEvidence);
}

function bindLangToggle() {
  $$(".lang-toggle").forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      const option = event.target.closest("[data-lang]");
      if (option) setLang(option.dataset.lang);
    });
  });
}

function enableScrollSpy() {
  const links = $$('[data-nav]');
  const activate = (id) => links.forEach((link) => link.classList.toggle("is-current", link.dataset.nav === id));
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) activate(visible.target.id);
  }, { rootMargin: "-15% 0px -65% 0px", threshold: [0, .1, .4] });
  ["overview", "intelligence", "statistics", "programs", "review"].forEach((id) => observer.observe(document.getElementById(id)));
  links.forEach((link) => link.addEventListener("click", () => activate(link.dataset.nav)));
}

function renderAll(data) {
  renderHeader(data);
  renderOverview(data);
  renderIntelligence(data);
  renderStatistics(data);
  populateFilters(data, state.lang);
  renderPrograms();
  renderCandidates(data);
}

async function start() {
  state.lang = getStoredLang();
  applyStaticStrings(state.lang);
  updateLangToggle(state.lang);
  bindLangToggle();
  try {
    const response = await fetch("/data/dashboard.json", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Database request failed (${response.status})`);
    const payload = await response.json();
    state.rawPayload = payload;
    const data = prepareDatabase(payload, state.lang);
    if (!data.records.length) throw new Error("The dashboard database contains no accepted records.");
    state.data = data;
    renderAll(data);
    bindEvents();
    enableScrollSpy();
    $("#app-status").hidden = true;
  } catch (error) {
    const status = $("#app-status");
    status.classList.add("error");
    status.replaceChildren(node("strong", "", t(state.lang, "app.unavailable")), document.createTextNode(` ${error.message}`));
    console.error(error);
  }
}

start();
