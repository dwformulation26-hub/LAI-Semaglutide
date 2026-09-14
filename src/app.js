import { CANDIDATE_TONES, FAMILY_COLORS, FAMILY_LABELS, FINDING_LABELS, MOLECULE_COLORS, MOLECULE_ORDER, RACE_ORDERS, SCORED_CLASSES, SCORE_WEIGHTS, STAGES, STAGE_COLORS, formatDate, interpretLeader, leadSentence, localized, orderPrograms, prepareDatabase, safeUrl, truncate } from "./model.js";
import { DEFAULT_LANG, LANGS, familyLabelText, findingLabelText, moleculeLabelText, originLabelText, stageLabelText, t } from "./i18n.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { data: null, rawPayload: null, lang: DEFAULT_LANG, programQuery: "", stage: "all", molecule: "all", classView: "semaglutide", raceOrder: storedRaceOrder(), expandedPrograms: new Set() };

function node(tag, className = "", text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const clear = (element) => { element.replaceChildren(); return element; };
const badge = (text, tone = "blue") => node("span", `pill pill-${tone}`, text);
const localText = (source, field, lang) => localized(source, field, lang).text;

// Korean mode shows the record's Korean copy; a missing one falls back to the English with a
// visible marker.
function localParagraph(source, field, lang, limit) {
  const { text, fallback } = localized(source, field, lang);
  const paragraph = node("p", "", limit ? truncate(text, limit) : text);
  if (fallback) paragraph.append(node("span", "lang-fallback", t(lang, "content.englishOriginal")));
  return paragraph;
}

const firstSentence = (value, lang) => truncate(leadSentence(value || (lang === "ko" ? "업데이트 기록됨" : "Update recorded")), 125);

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

function storedRaceOrder() {
  try {
    const stored = localStorage.getItem("lai-race-order");
    return RACE_ORDERS.includes(stored) ? stored : "maturity";
  } catch {
    return "maturity";
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

// Overview is a launch pad, not a dead end: clicking a program there opens that exact
// umbrella in the directory below. Filters are cleared only when they would hide the
// target, so a deliberate filter survives a click on something it already shows.
function focusProgram(id) {
  const record = state.data.records.find((entry) => entry.id === id);
  if (!record) return;

  const hidden = !filteredPrograms().some((entry) => entry.id === id);
  if (hidden) {
    state.molecule = "all";
    state.stage = "all";
    state.programQuery = "";
    $("#molecule-filter").value = "all";
    $("#stage-filter").value = "all";
    $("#program-search").value = "";
  }

  state.expandedPrograms.add(id);
  renderPrograms();

  const row = document.getElementById(`program-${id}`);
  if (!row) return;
  row.scrollIntoView({ behavior: "smooth", block: "center" });
  row.classList.add("is-target");
  setTimeout(() => row.classList.remove("is-target"), 2200);
  const toggle = row.querySelector(".row-toggle");
  if (toggle) toggle.focus({ preventScroll: true });
}

function programLink(record, className, build) {
  const button = node("button", className);
  button.type = "button";
  button.title = t(state.lang, "overview.openRecord", { program: record.program });
  build(button);
  button.addEventListener("click", () => focusProgram(record.id));
  return button;
}

function renderClassPicker(data) {
  const lang = state.lang;
  const picker = clear($("#class-picker"));
  MOLECULE_ORDER.forEach((key) => {
    const group = data.groupFor(key);
    const chip = node("button", "class-chip");
    chip.type = "button";
    chip.style.setProperty("--tone", MOLECULE_COLORS[key]);
    chip.setAttribute("aria-pressed", String(state.classView === key));
    chip.append(node("i", ""), node("span", "", moleculeLabelText(key, lang)), node("b", "", String(group.members.length)));
    chip.addEventListener("click", () => {
      if (state.classView === key) return;
      state.classView = key;
      renderOverview(state.data);
    });
    picker.append(chip);
  });
}

function renderRaceOrder(group) {
  const lang = state.lang;
  const control = clear($("#race-order"));
  // An unscored board (non-incretin) has no score to rank by, so it always reads in
  // maturity order and the switch is hidden rather than left doing nothing.
  control.hidden = !group.scored || !group.members.length;
  RACE_ORDERS.forEach((order) => {
    const button = node("button", "race-order-option", t(lang, `overview.order.${order}`));
    button.type = "button";
    button.setAttribute("aria-pressed", String(state.raceOrder === order));
    button.addEventListener("click", () => {
      if (state.raceOrder === order) return;
      state.raceOrder = order;
      try { localStorage.setItem("lai-race-order", order); } catch { /* private mode or blocked storage */ }
      renderRace(state.data);
    });
    control.append(button);
  });
}

function renderRace(data) {
  const lang = state.lang;
  const group = data.groupFor(state.classView);
  const label = moleculeLabelText(state.classView, lang);
  const order = group.scored ? state.raceOrder : "maturity";
  const programs = orderPrograms(group.members, order);
  renderRaceOrder(group);

  $("#race-caption").textContent = programs.length
    ? t(lang, `overview.classCaption.${order}`, { count: programs.length, molecule: label })
    : t(lang, "overview.classEmpty", { molecule: label });

  const empty = $("#class-empty");
  clear(empty);
  empty.hidden = programs.length > 0 && group.scored;
  if (!programs.length) {
    empty.append(node("strong", "", t(lang, "overview.classEmpty", { molecule: label })), node("span", "", t(lang, "overview.classEmptyDetail")));
  } else if (!group.scored) {
    empty.append(node("strong", "", moleculeLabelText(state.classView, lang)), node("span", "", t(lang, "overview.unscoredNote")));
  }

  const chart = clear($("#race-chart"));
  programs.slice(0, 12).forEach((program) => {
    const row = node("div", `race-row${program.isOurProduct ? " ours" : ""}`);
    const name = programLink(program, "race-name", (button) => {
      button.append(node("strong", "", `${truncate(program.program, 38)}${program.isOurProduct ? " \u2605" : ""}`), node("span", "", program.company));
    });
    const track = node("div", "race-track");
    const bar = node("div", "race-bar", stageLabelText(program.stageLabel, lang));
    bar.style.width = `${Math.max(7, Math.min(100, (Math.max(program.stageOrder, .35) / 6) * 100))}%`;
    bar.style.background = program.isOurProduct ? "#178665" : STAGE_COLORS[program.stageLabel];
    if (group.scored) bar.append(node("span", "race-score", String(program.score.total)));
    track.append(bar);
    row.append(name, track);
    chart.append(row);
  });

  // The leader panel follows the selected class and order rather than being fixed to
  // semaglutide: under maturity it is the most advanced program still in development.
  const ranked = programs.filter((record) => record.stageLabel !== "Approved / marketed");
  const leader = ranked[0] ?? programs[0] ?? data.leader;
  const leaderHead = clear($("#leader-company"));
  leaderHead.append(programLink(leader, "leader-link", (button) => button.append(document.createTextNode(leader.company))));
  const leaderProgram = clear($("#leader-program"));
  leaderProgram.append(programLink(leader, "leader-link leader-link-sub", (button) => button.append(document.createTextNode(leader.program))));
  $("#leader-stage").textContent = stageLabelText(leader.stageLabel, lang);
  $("#leader-summary").textContent = truncate(localText(leader.current_status, "stage", lang), 330);
  $("#leader-interpretation").textContent = interpretLeader(leader, ranked, Date.now(), lang);
}

function renderOverview(data) {
  const lang = state.lang;
  renderClassPicker(data);
  renderRace(data);

  const conditions = [
    ["01", t(lang, "conditions.tracked.label"), data.records.length, t(lang, "conditions.tracked.badge"), "blue", t(lang, "conditions.tracked.detail", { count: data.findings.length }), "#367fd0"],
    ["02", t(lang, "conditions.pending.label"), data.pendingCandidates.length,
      data.readyCandidates.length
        ? t(lang, "conditions.pending.badgeEscalated", { count: data.readyCandidates.length })
        : t(lang, "conditions.pending.badge"),
      data.readyCandidates.length ? "orange" : "amber",
      data.readyCandidates.length
        ? t(lang, "conditions.pending.detailEscalated", {
          count: data.readyCandidates.length,
          entities: data.readyCandidates.length === 1 ? "candidate has" : "candidates have",
          await: data.readyCandidates.length === 1 ? "awaits" : "await"
        })
        : t(lang, "conditions.pending.detail"),
      data.readyCandidates.length ? "#ee7443" : "#e4a11b"],
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
    copy.append(node("h3", "", firstSentence(localText(finding, "summary", lang), lang)), localParagraph(finding, "summary", lang, 300));
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
    [t(lang, "readout.attentionLabel"), data.readyCandidates.length
      ? t(lang, "readout.attentionEscalated", { ready: data.readyCandidates.length, count: data.pendingCandidates.length })
      : t(lang, "readout.attentionValue", { count: data.pendingCandidates.length })],
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
    [data.records.filter((record) => record.isScored).length, t(lang, "statistics.scoredPrograms"), t(lang, "statistics.scoredProgramsDetail")],
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

  // Same bar idiom as the technology chart, so the two read as one family of charts.
  const moleculeChart = clear($("#molecule-chart"));
  const groupCounts = data.moleculeGroups.map((group) => [group.key, group.members.length]);
  if (data.needsMoleculeReview.length) groupCounts.push(["unassigned", data.needsMoleculeReview.length]);
  const moleculeMax = Math.max(...groupCounts.map(([, count]) => count), 1);
  groupCounts.forEach(([key, count]) => {
    const row = node("div", "family-row");
    const track = node("div", "family-track");
    const bar = node("div", "family-bar");
    bar.style.width = `${count / moleculeMax * 100}%`;
    bar.style.background = MOLECULE_COLORS[key];
    track.append(bar);
    row.append(node("span", "", moleculeLabelText(key, lang)), track, node("strong", "", String(count)));
    moleculeChart.append(row);
  });

  const scoreChart = clear($("#score-chart"));
  [
    [SCORE_WEIGHTS.stage, t(lang, "statistics.scoreStage"), t(lang, "statistics.scoreStageDetail")],
    [SCORE_WEIGHTS.momentum, t(lang, "statistics.scoreMomentum"), t(lang, "statistics.scoreMomentumDetail")],
    [SCORE_WEIGHTS.evidence, t(lang, "statistics.scoreEvidence"), t(lang, "statistics.scoreEvidenceDetail")],
    [SCORE_WEIGHTS.dosing, t(lang, "statistics.scoreDosing"), t(lang, "statistics.scoreDosingDetail")]
  ].forEach(([weight, name, detail]) => {
    const row = node("div", "score-row");
    const copy = node("div", "");
    copy.append(node("span", "", name), node("small", "", detail));
    row.append(node("strong", "", String(weight)), copy);
    scoreChart.append(row);
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

function moleculeCell(record, lang) {
  const cell = node("td");
  cell.dataset.label = t(lang, "programs.col.molecule");
  const tags = node("div", "mol-tags");
  const keys = record.needsMoleculeReview ? ["unassigned"] : record.molecules;
  keys.forEach((key) => {
    const tag = node("span", "mol-tag", key === "unassigned" ? t(lang, "programs.moleculeReview") : moleculeLabelText(key, lang));
    tag.style.setProperty("--tone", MOLECULE_COLORS[key]);
    if (key === "unassigned" && record.moleculeEvidence) tag.title = record.moleculeEvidence;
    tags.append(tag);
  });
  cell.append(tags);
  return cell;
}

function scoreCell(record, lang) {
  const cell = node("td");
  cell.dataset.label = t(lang, "programs.col.score");
  if (!record.isScored) {
    cell.append(node("span", "score-unscored", t(lang, "programs.unscored")));
    return cell;
  }
  const value = node("strong", "score-value", String(record.score.total));
  value.title = t(lang, "programs.scoreBreakdown", {
    stage: record.score.stage, momentum: record.score.momentum, evidence: record.score.evidence, dosing: record.score.dosing
  });
  cell.append(value);
  return cell;
}

function filteredPrograms() {
  const query = state.programQuery.trim().toLowerCase();
  return [...state.data.records]
    .filter((record) => state.stage === "all" || record.stageLabel === state.stage)
    .filter((record) => state.molecule === "all"
      || (state.molecule === "unassigned" ? record.needsMoleculeReview : record.molecules.includes(state.molecule)))
    .filter((record) => !query || [record.canonical_name, record.technology_family, record.current_status?.stage, record.current_status?.stage_ko].join(" ").toLowerCase().includes(query))
    .sort((a, b) => {
      if (a.isScored !== b.isScored) return a.isScored ? -1 : 1;
      if (a.isScored) return b.score.total - a.score.total || String(b.current_status?.last_updated ?? "").localeCompare(String(a.current_status?.last_updated ?? ""));
      return b.stageOrder - a.stageOrder || String(b.current_status?.last_updated ?? "").localeCompare(String(a.current_status?.last_updated ?? ""));
    });
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
    localParagraph(finding, "summary", lang),
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
    row.id = `program-${record.id}`;
    row.append(
      programNameCell(record, findings.length, expanded, lang),
      moleculeCell(record, lang),
      scoreCell(record, lang),
      tableCell(t(lang, "programs.col.origin"), originLabelText(record.origin, lang)),
      tableCell(t(lang, "programs.col.technology"), familyLabelText(record.technology_family, lang)),
      tableCell(t(lang, "programs.col.stage"), stageBadge(record.stageLabel, lang, record.stageInferred)),
      tableCell(t(lang, "programs.col.status"), truncate(localText(record.current_status, "stage", lang), 190)),
      tableCell(t(lang, "programs.col.updated"), formatDate(record.current_status?.last_updated, true, lang))
    );
    body.append(row);

    const detailRow = node("tr", "evidence-row");
    detailRow.hidden = !expanded;
    const detailCell = node("td");
    detailCell.colSpan = 8;
    const list = node("div", "evidence-list");
    if (findings.length) findings.forEach((finding) => list.append(evidenceItem(finding, lang)));
    else list.append(node("div", "empty-state", t(lang, "evidence.empty")));
    detailCell.append(list);
    detailRow.append(detailCell);
    body.append(detailRow);
  });
}

function renderMoleculeReview(data) {
  const lang = state.lang;
  const container = clear($("#molecule-review"));
  if (!data.needsMoleculeReview.length) {
    container.append(node("div", "empty-state panel", t(lang, "review.moleculeEmpty")));
    return;
  }
  data.needsMoleculeReview.forEach((record) => {
    const card = node("article", "candidate-card");
    card.append(badge(t(lang, "review.moleculeBadge"), "amber"), node("h3", "", record.canonical_name));
    card.append(record.moleculeEvidence
      ? localParagraph(record.current_status, "molecule_evidence", lang)
      : localParagraph(record.current_status, "stage", lang, 260));
    const footer = node("footer");
    footer.append(node("span", "", `${originLabelText(record.origin, lang)} · ${stageLabelText(record.stageLabel, lang)}`));
    footer.append(node("span", "", formatDate(record.current_status?.last_updated, true, lang)));
    card.append(footer);
    container.append(card);
  });
}

function renderCandidates(data) {
  const lang = state.lang;
  const container = clear($("#candidate-list"));
  data.pendingCandidates.forEach((candidate) => {
    const escalated = candidate.status === "ready_for_promotion";
    const card = node("article", `candidate-card${escalated ? " is-escalated" : ""}`);
    card.append(
      badge(t(lang, `review.status.${candidate.status}`), CANDIDATE_TONES[candidate.status] ?? "amber"),
      node("h3", "", candidate.detected_name ?? "Unnamed candidate")
    );
    const evidence = [...(candidate.evidence ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    // For an escalated or stalled candidate the written promotion_bar rationale is the
    // thing the admin has to act on, so it outranks the raw evidence snippet on the card.
    const rationale = candidate.promotion_bar?.evidence;
    card.append((escalated || candidate.status === "stalled") && rationale
      ? localParagraph(candidate.promotion_bar, "evidence", lang, 260)
      : evidence ? localParagraph(evidence, "snippet", lang, 260) : node("p", "", t(lang, "review.noEvidence")));
    const unmet = candidate.unmetConditions ?? [];
    if (!escalated && !candidate.assessed) {
      card.append(node("p", "candidate-unmet", t(lang, "review.unassessed")));
    } else if (!escalated && unmet.length) {
      card.append(node("p", "candidate-unmet", t(lang, "review.unmet", {
        list: unmet.map((key) => t(lang, `review.condition.${key}`)).join(", ")
      })));
    }
    const footer = node("footer");
    const score = Number(candidate.fuzzy_match?.score);
    const trail = [
      t(lang, "review.waiting", { days: candidate.daysPending ?? 0 }),
      t(lang, "review.checks", { count: candidate.followUpChecks ?? 0 })
    ];
    if (Number.isFinite(score)) trail.push(t(lang, "review.matchScore", { score: score.toFixed(2) }));
    footer.append(node("span", "", trail.join(" · ")));
    const url = safeUrl(evidence?.source?.url);
    if (url) { const link = node("a", "", t(lang, "review.reviewSource")); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; footer.append(link); }
    card.append(footer);
    container.append(card);
  });
  if (data.watchCandidates.length) {
    container.append(node("div", "candidate-watch-note", t(lang, "review.watchNote", { count: data.watchCandidates.length })));
  }
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
  const moleculeSelect = $("#molecule-filter");
  const currentMolecule = moleculeSelect.value;
  clear(moleculeSelect);
  const allMolecules = node("option", "", t(lang, "programs.allMolecules"));
  allMolecules.value = "all";
  moleculeSelect.append(allMolecules);
  data.moleculeGroups.filter((group) => group.members.length).forEach((group) => {
    const option = node("option", "", `${moleculeLabelText(group.key, lang)} (${group.members.length})`);
    option.value = group.key;
    moleculeSelect.append(option);
  });
  if (data.needsMoleculeReview.length) {
    const option = node("option", "", `${moleculeLabelText("unassigned", lang)} (${data.needsMoleculeReview.length})`);
    option.value = "unassigned";
    moleculeSelect.append(option);
  }
  moleculeSelect.value = [...moleculeSelect.options].some((option) => option.value === currentMolecule) ? currentMolecule : "all";

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
// so the exported file stays a stable, consistently-formatted interop artifact. The Korean
// copies ride along in their own columns next to the English they translate.
function exportProgramsWithEvidence() {
  const headers = ["Program", "Molecule class", "Competitive score", "Origin", "Technology", "Normalized stage", "Reported status", "Reported status (KO)", "Dosing target", "Program updated", "Finding date", "Finding type", "Finding summary", "Finding summary (KO)", "Confidence", "Source", "Tier", "URL"];
  const rows = filteredPrograms().flatMap((record) => {
    const base = [record.canonical_name, record.molecules.join("; "), record.isScored ? record.score.total : "", record.origin, FAMILY_LABELS[record.technology_family] ?? record.technology_family, record.stageLabel, record.current_status?.stage, record.current_status?.stage_ko, record.current_status?.dosing_target, record.current_status?.last_updated];
    const findings = state.data.findings.filter((finding) => finding.recordId === record.id);
    if (!findings.length) return [[...base, "", "", "", "", "", "", "", ""]];
    return findings.map((finding) => [...base, finding.date, FINDING_LABELS[finding.type] ?? finding.type, finding.summary, finding.summary_ko, finding.confidence, finding.sourceName, finding.sourceTier, finding.sourceUrl]);
  });
  downloadCsv("lai-programs-evidence.csv", headers, rows);
}

function bindEvents() {
  $("#program-search").addEventListener("input", (event) => { state.programQuery = event.target.value; renderPrograms(); });
  $("#stage-filter").addEventListener("change", (event) => { state.stage = event.target.value; renderPrograms(); });
  $("#molecule-filter").addEventListener("change", (event) => { state.molecule = event.target.value; renderPrograms(); });
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
  renderMoleculeReview(data);
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
