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

export function isSemaglutideProgram(record) {
  const status = record.current_status ?? {};
  const text = [
    record.canonical_name ?? "",
    ...(record.aliases ?? []),
    status.data_point ?? "",
    ...(record.finding_history ?? []).map((finding) => finding.summary ?? "")
  ].join(" ").toLowerCase();
  if (!text.includes("semaglutide")) return false;
  return [
    /semaglutide.{0,55}(?:depot|implant|asset|candidate|microparticle|microsphere|lai|injectable)/,
    /(?:depot|implant|asset|candidate|microparticle|microsphere|lai|injectable|once-monthly|plga).{0,55}semaglutide/
  ].some((pattern) => pattern.test(text));
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
    return {
      ...record,
      ...names,
      stageLabel,
      stageOrder: STAGES[stageLabel],
      stageInferred,
      isSemaglutide: isSemaglutideProgram(record),
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

  const semaglutidePrograms = records.filter((record) => record.isSemaglutide);
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
