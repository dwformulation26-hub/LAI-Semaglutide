import { stageLabelText, t } from "./i18n.js";

export const OUR_PRODUCT_ID = "daewoong-tionlab-quject";

export const STAGES = {
  Research: 0,
  Preclinical: 1,
  "IND filed": 2,
  "Phase 1": 3,
  "Phase 2": 4,
  "Phase 3": 5,
  "Filed / review": 6,
  "Approved / marketed": 7
};

export const STAGE_COLORS = {
  Research: "#a9aaa5",
  Preclinical: "#e4a11b",
  "IND filed": "#ee7443",
  "Phase 1": "#2bb98a",
  "Phase 2": "#7666b7",
  "Phase 3": "#367fd0",
  "Filed / review": "#225da8",
  "Approved / marketed": "#70736f"
};

// Candidate lifecycle, mirroring the escalation ladder in the scan skill's Track B3
// section. REVIEW_ORDER decides queue position, so an escalated candidate can never be
// pushed below routine ones by recency. Terminal statuses (promoted/merged/rejected/
// snoozed) are admin-written and drop out of the queue entirely.
export const CANDIDATE_STATUSES = [
  "watch",
  "pending",
  "ready_for_promotion",
  "stalled",
  "promoted",
  "merged",
  "rejected",
  "snoozed"
];

const REVIEW_ORDER = { ready_for_promotion: 0, pending: 1, stalled: 2 };

export const CANDIDATE_TONES = {
  ready_for_promotion: "orange",
  pending: "amber",
  stalled: "violet",
  watch: "blue"
};

export const FAMILY_LABELS = {
  plga_microsphere: "PLGA microsphere",
  lipid_liquid_crystal_depot: "Lipid liquid-crystal depot",
  in_situ_forming_depot: "In-situ forming depot",
  molecular_engineering: "Molecular engineering",
  prodrug_linker: "Prodrug / linker",
  subdermal_implant: "Subdermal implant",
  other: "Other"
};

export const FAMILY_COLORS = {
  plga_microsphere: "#367fd0",
  lipid_liquid_crystal_depot: "#ee7443",
  in_situ_forming_depot: "#2bb98a",
  molecular_engineering: "#7666b7",
  prodrug_linker: "#e4a11b",
  subdermal_implant: "#d86698",
  other: "#70736f"
};

// Molecule classes are declared per record in current_status.molecule_class, the same
// way stage_label is -- assigned at write time by the scan, with an evidence sentence,
// never inferred here from record text. The order below is the order the dashboard
// presents them in: the four named molecules, then the two catch-all buckets.
export const MOLECULE_ORDER = [
  "semaglutide",
  "tirzepatide",
  "retatrutide",
  "amylin",
  "other_incretin",
  "non_incretin"
];

export const MOLECULE_LABELS = {
  semaglutide: "Semaglutide",
  tirzepatide: "Tirzepatide",
  retatrutide: "Retatrutide",
  amylin: "Amylin",
  other_incretin: "Other incretin",
  non_incretin: "Non-incretin LAI",
  unassigned: "Needs review"
};

export const MOLECULE_COLORS = {
  semaglutide: "#178665",
  tirzepatide: "#dc6336",
  retatrutide: "#6d5dad",
  amylin: "#d86698",
  other_incretin: "#367fd0",
  non_incretin: "#91949a",
  unassigned: "#a87504"
};

// Non-incretin programs are tracked and searched in full, but deliberately left out of
// the competitive score: ranking a decades-old leuprolide depot against an IND-stage
// obesity program would put approved products permanently on top of every board.
export const SCORED_CLASSES = new Set(["semaglutide", "tirzepatide", "retatrutide", "amylin", "other_incretin"]);

// The two orders a class board can be read in. Maturity is the default: a race chart is
// read top to bottom as "who is furthest along", and the competitive score blends in news
// recency, so ranking by score alone let an IND-filed program with fresh news sit above
// programs already dosing in Phase 1 and made the bars zigzag down the chart.
export const RACE_ORDERS = ["maturity", "score"];

const byNewestUpdate = (a, b) => String(b.current_status?.last_updated ?? "").localeCompare(String(a.current_status?.last_updated ?? ""));

// Pure: returns a new array. Maturity is declared stage first, with competitive score
// breaking ties inside a stage; score is the score-first ranking. Both fall back to the
// newest update and then company name, so the same records always read in the same order.
export function orderPrograms(programs, order = "maturity") {
  const byScore = (a, b) => b.score.total - a.score.total;
  const byCompany = (a, b) => String(a.company ?? "").localeCompare(String(b.company ?? ""));
  return [...programs].sort(order === "score"
    ? (a, b) => byScore(a, b) || byNewestUpdate(a, b) || byCompany(a, b)
    : (a, b) => b.stageOrder - a.stageOrder || byScore(a, b) || byNewestUpdate(a, b) || byCompany(a, b));
}

export const FINDING_LABELS = {
  trial_data_readout: "Clinical / data",
  regulatory: "Regulatory",
  deal_partnership: "Partnership",
  market_reaction: "Market reaction",
  manufacturing_capacity: "Manufacturing",
  financing_investor: "Financing"
};

export function normalizeStage(stageText = "") {
  const text = String(stageText).toLowerCase();
  if (/\bapproved\b|\bmarketed\b|commercially launched/.test(text)) return "Approved / marketed";
  if (/\bind\b.{0,20}(?:filed|submitted|application)|(?:filed|submitted)\s+(?:an?\s+)?ind\b/.test(text)) return "IND filed";

  // Roman-numeral phase mentions are matched with a negative lookahead (e.g. "i(?!i)")
  // so "Phase II"/"Phase III" can never be swallowed by the "Phase 1"/"Phase 2" patterns
  // as if the trailing numerals were just an arbitrary word-character suffix (they'd
  // otherwise register as "Phase 1"/"Phase 2" purely because "ii"/"iii" start with "i").
  // Sub-stage suffixes like "1b"/"ib"/"iia" still match fine, since the lookahead only
  // blocks a *roman-numeral* character immediately following, not any word character.
  const phase1Num = "(?:i(?!i)|1)";
  const phase2Num = "(?:ii(?!i)|2)";
  const futureWords = /target|plan|prepar|expect|intend|intent|aim|advanc(?:e|ing)?\s*(?:into|toward)/;

  const combo = text.match(new RegExp(`phase\\s*${phase1Num}\\s*\\/\\s*${phase2Num}\\w*`));
  if (combo) {
    const start = Math.max(0, combo.index - 32);
    const end = Math.min(text.length, combo.index + combo[0].length + 60);
    const window = text.slice(start, end);
    if (!futureWords.test(window)) {
      // A combined Phase I/II design only counts as reaching Phase 2 once there's
      // language showing the "2"/"II" portion is itself underway -- otherwise a trial
      // that "just started recruiting" for the combined study would rank the same as
      // one that already ran a full, separate Phase 2. Default to Phase 1 until then.
      // Searches the whole text, not just the window around the combo match -- "Phase
      // 2a is now dosing" naturally sits further from "Phase I/II" than the futureWords
      // check above needs to look, since it's describing a separate, later event.
      const phase2Underway = /(?:phase\s*(?:ii|2)\w*|expansion(?:\s*cohort)?|dose[- ]expansion).{0,40}?(?:enrolling|dosing|dosed|underway|begun|started|initiated|ongoing)/.test(text);
      return phase2Underway ? "Phase 2" : "Phase 1";
    }
  }
  if (new RegExp(`(?:positive|completed|following positive)\\s+phase\\s*${phase1Num}\\w*`).test(text)) return "Phase 1";

  const patterns = [
    ["Phase 3", /phase\s*(?:iii|3)\w*|pivotal(?:-stage)?/g],
    ["Phase 2", new RegExp(`phase\\s*${phase2Num}\\w*`, "g")],
    ["Phase 1", new RegExp(`phase\\s*${phase1Num}\\w*`, "g")]
  ];
  for (const [label, pattern] of patterns) {
    for (const match of text.matchAll(pattern)) {
      const start = Math.max(0, (match.index ?? 0) - 32);
      const end = Math.min(text.length, (match.index ?? 0) + match[0].length + 42);
      if (!futureWords.test(text.slice(start, end))) return label;
    }
  }
  if (/\bnda\b|\bbla\b|under (?:fda|ema|nmpa|regulatory) review/.test(text)) return "Filed / review";
  if (/preclinical|nonclinical|ind-enabling/.test(text)) return "Preclinical";
  return "Research";
}

export function splitName(canonicalName = "") {
  const parts = String(canonicalName).split(/\s+[–—-]\s+/, 2);
  return parts.length === 2
    ? { company: parts[0].trim(), program: parts[1].trim() }
    : { company: String(canonicalName).trim(), program: String(canonicalName).trim() };
}

// Replaces the old isSemaglutideProgram() text matcher. That function decided a
// program's molecule by pattern-matching the canonical name, every alias, the status
// data point and the full text of every finding ever logged -- so a rival molecule
// named in a comparator arm, an analyst note, or an explicit denial ("the Lilly
// collaboration does NOT include tirzepatide") all read as a match. Here the value is
// simply read back from what the scan declared.
export function moleculeClasses(record) {
  const declared = record.current_status?.molecule_class;
  if (!Array.isArray(declared) || !declared.length) return [];
  return declared.filter((value) => MOLECULE_ORDER.includes(value));
}

// Deterministic, computed at render, never stored: a saved score is a number that ages
// on its own and that a scan run could quietly edit. Every input is a field the record
// already declares, so any row's total can be re-derived by hand from the registry.
export const SCORE_WEIGHTS = { stage: 45, momentum: 25, evidence: 18, dosing: 12 };

// Momentum counts only news that moves a program. A quarterly sales line or a share move
// used to refresh momentum exactly like a trial readout, so programs ranked by their
// earnings calendar.
export const MOMENTUM_TYPES = new Set(["regulatory", "trial_data_readout", "deal_partnership"]);

export function competitiveScore(record, now = Date.now()) {
  const status = record.current_status ?? {};

  const order = STAGES[status.stage_label];
  const stage = Number.isFinite(order) ? Math.round((order / 7) * SCORE_WEIGHTS.stage) : 0;

  const lastMove = (record.finding_history ?? [])
    .filter((finding) => MOMENTUM_TYPES.has(finding.type))
    .map((finding) => finding.date)
    .filter(Boolean)
    .sort()
    .at(-1);
  const age = daysSince(lastMove, now);
  const momentum = age === null ? 0 : age <= 14 ? 25 : age <= 30 ? 21 : age <= 60 ? 16 : age <= 90 ? 11 : age <= 180 ? 6 : 0;

  const latest = [...(record.finding_history ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const tier = latest?.source?.tier;
  const evidence = tier === 1 ? 18 : tier === 2 ? 12 : tier === 3 ? 5 : 0;

  const dosing = String(status.dosing_target ?? "").toLowerCase();
  const interval = /month|quarter|every 6|every 3/.test(dosing) ? 12 : /week/.test(dosing) ? 5 : 0;

  return { total: stage + momentum + evidence + interval, stage, momentum, evidence, dosing: interval };
}

export function safeUrl(value) {
  try {
    const url = new URL(String(value));
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function truncate(value, limit = 160) {
  const text = String(value || "—").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const shortened = text.slice(0, limit - 1);
  return `${shortened.slice(0, shortened.lastIndexOf(" ") || shortened.length)}…`;
}

// Abbreviations end in a period without ending the sentence. Splitting on every period
// cut a feed headline to "Ascletis initiated a U.S."
const ABBREVIATION = /(?:\b(?:[A-Za-z]\.){2,}|\b(?:Inc|Ltd|Co|Corp|Dr|No|St|vs|approx)\.)$/;

export function leadSentence(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  const boundary = /[.!?](?=\s)/g;
  for (let match = boundary.exec(text); match; match = boundary.exec(text)) {
    const head = text.slice(0, match.index + 1);
    if (!(match[0] === "." && ABBREVIATION.test(head))) return head;
  }
  return text;
}

export function formatDate(value, long = false, lang = "en") {
  if (!value) return lang === "ko" ? "날짜 없음" : "Date unavailable";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return String(value);
  const locale = lang === "ko" ? "ko-KR" : "en-GB";
  return new Intl.DateTimeFormat(locale, long
    ? { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }
    : { day: "2-digit", month: "short", timeZone: "UTC" }).format(date);
}

const RUN_CADENCE_DAYS = { daily_scan: 2, weekly_sweep: 10, qc_tier2: 10 };

export function daysSince(dateValue, now = Date.now()) {
  if (!dateValue) return null;
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.floor((now - parsed) / 86400000));
}

export function assessRunHealth(runStatus = {}, now = Date.now(), lang = "en") {
  const checks = Object.entries(RUN_CADENCE_DAYS).map(([key, maxDays]) => {
    const days = daysSince(runStatus[key], now);
    return { key, label: t(lang, `health.label.${key}`), days, status: days === null ? "never" : days <= maxDays ? "healthy" : "stale" };
  });
  const healthyCount = checks.filter((check) => check.status === "healthy").length;
  const allHealthy = healthyCount === checks.length;
  const summary = allHealthy
    ? t(lang, "health.summaryHealthy")
    : checks
        .filter((check) => check.status !== "healthy")
        .map((check) => (check.status === "never" ? t(lang, "health.neverRun", { label: check.label }) : t(lang, "health.overdue", { label: check.label, days: check.days })))
        .join("; ") + ".";
  return { checks, healthyCount, total: checks.length, allHealthy, summary };
}

export function interpretLeader(leader, developmentPrograms, now = Date.now(), lang = "en") {
  if (!leader) return "";
  const days = daysSince(leader.current_status?.last_updated, now);
  const updated = days === null ? t(lang, "leader.updateUnavailable") : days === 0 ? t(lang, "leader.updatedToday") : t(lang, "leader.updatedDaysAgo", { days });
  const others = developmentPrograms.filter((program) => program.id !== leader.id);
  if (!others.length) return t(lang, "leader.onlyProgram", { updated });
  const nextBest = Math.max(...others.map((program) => program.stageOrder));
  const gap = leader.stageOrder - nextBest;
  if (gap <= 0) {
    const tied = others.filter((program) => program.stageOrder === leader.stageOrder).length;
    return t(lang, "leader.tied", { tied, plural: tied === 1 ? "" : "s", stage: stageLabelText(leader.stageLabel, lang), updated });
  }
  return t(lang, "leader.gap", { gap, plural: gap === 1 ? "" : "s", updated });
}

export function prepareDatabase(payload, lang = "en") {
  const records = (payload.records ?? []).map((record) => {
    const names = splitName(record.canonical_name);
    // stage_label is the controlled value the scan skill is required to assign
    // directly (see SKILL.md's "Stage scoring" section) -- it's authoritative and used
    // as-is. normalizeStage() only runs as a defensive fallback for a record that
    // predates that requirement or somehow shipped without it; stageInferred marks
    // that case so the UI can flag it rather than silently presenting a guess as fact.
    const declaredLabel = record.current_status?.stage_label;
    const stageInferred = !(declaredLabel in STAGES);
    const stageLabel = stageInferred ? normalizeStage(record.current_status?.stage) : declaredLabel;
    const molecules = moleculeClasses(record);
    return {
      ...record,
      ...names,
      stageLabel,
      stageOrder: STAGES[stageLabel],
      stageInferred,
      molecules,
      moleculeEvidence: record.current_status?.molecule_evidence ?? "",
      // A record the scan could not resolve carries no class at all, rather than a
      // guessed one. It stays in the registry and surfaces in the review queue.
      needsMoleculeReview: molecules.length === 0,
      score: competitiveScore(record),
      isScored: molecules.some((value) => SCORED_CLASSES.has(value)),
      isOurProduct: record.id === OUR_PRODUCT_ID
    };
  });

  const findings = records.flatMap((record) => (record.finding_history ?? []).map((finding) => ({
    ...finding,
    company: record.company,
    program: record.program,
    recordId: record.id,
    technologyFamily: record.technology_family ?? "other",
    sourceName: finding.source?.name ?? (lang === "ko" ? "출처 미상" : "Source unavailable"),
    sourceUrl: safeUrl(finding.source?.url),
    sourceTier: finding.source?.tier ?? null,
    timestamp: Date.parse(`${String(finding.date ?? "").slice(0, 10)}T00:00:00Z`) || 0
  }))).sort((a, b) => b.timestamp - a.timestamp || String(b.id).localeCompare(String(a.id)));

  // One ranked board per class. A program formulating two molecules appears on both
  // boards, which is correct -- InventageLab really is a separate competitor on each.
  const moleculeGroups = MOLECULE_ORDER.map((key) => {
    const members = orderPrograms(records.filter((record) => record.molecules.includes(key)), "score");
    return { key, scored: SCORED_CLASSES.has(key), members };
  });

  const groupFor = (key) => moleculeGroups.find((group) => group.key === key);
  const needsMoleculeReview = records.filter((record) => record.needsMoleculeReview);
  const semaglutidePrograms = groupFor("semaglutide").members;
  const developmentPrograms = semaglutidePrograms.filter((record) => record.stageLabel !== "Approved / marketed");
  const leader = [...developmentPrograms].sort((a, b) =>
    b.stageOrder - a.stageOrder || String(b.current_status?.last_updated ?? "").localeCompare(String(a.current_status?.last_updated ?? ""))
  )[0] ?? records[0];

  const candidates = payload.candidates ?? [];
  const candidateAge = (candidate) => {
    const dates = (candidate.evidence ?? []).map((item) => item.date).filter(Boolean).sort();
    return {
      ...candidate,
      daysPending: daysSince(candidate.created_date, Date.now()),
      daysSinceEvidence: daysSince(dates.at(-1) ?? candidate.created_date, Date.now()),
      followUpChecks: candidate.follow_up?.checks_run ?? 0,
      // A candidate written before Track B3 existed has no promotion_bar at all. An empty
      // unmet list would read as "nothing missing" -- i.e. promotable -- so the absence of
      // an assessment is carried explicitly instead.
      assessed: Boolean(candidate.promotion_bar),
      unmetConditions: candidate.promotion_bar?.unmet ?? []
    };
  };
  // The review queue is every unresolved candidate except the thin-signal watch list,
  // ordered by escalation level first and only then by how long it has been waiting --
  // the whole point of escalation is that it cannot be buried by newer arrivals.
  const pendingCandidates = candidates
    .filter((candidate) => candidate.status in REVIEW_ORDER)
    .map(candidateAge)
    .sort((a, b) =>
      REVIEW_ORDER[a.status] - REVIEW_ORDER[b.status] ||
      b.daysSinceEvidence - a.daysSinceEvidence ||
      String(a.id).localeCompare(String(b.id))
    );
  const readyCandidates = pendingCandidates.filter((candidate) => candidate.status === "ready_for_promotion");
  const watchCandidates = candidates.filter((candidate) => candidate.status === "watch").map(candidateAge);
  const runStatus = payload.meta?.last_run ?? {};
  const health = assessRunHealth(runStatus, Date.now(), lang);
  const leaderNote = interpretLeader(leader, developmentPrograms, Date.now(), lang);

  return {
    records,
    findings,
    moleculeGroups,
    groupFor,
    needsMoleculeReview,
    semaglutidePrograms,
    leader,
    leaderNote,
    candidates,
    pendingCandidates,
    readyCandidates,
    watchCandidates,
    runStatus,
    health,
    latestDataDate: payload.latest_data_date,
    builtAt: payload.built_at
  };
}
