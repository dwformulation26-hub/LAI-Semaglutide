import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(root, "email", "templates", "daily-digest.html");
// The deployed dashboard. Overridable by environment so the domain can change without
// a code edit -- this was hardcoded to a stale hostname (lai-tracker.vercel.app) that
// silently outlived the project rename, and every digest kept linking to it.
const dashboardUrl = process.env.LAI_DASHBOARD_URL ?? "https://lai-semaglutide.vercel.app/";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
// Escapes first, then turns **text** the caller wrote into <strong> — never
// interprets markup in raw source-derived fields, only in Claude-authored prose.
function richText(value) {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// A hardcoded 3-letter month table, not Intl's "short" month: en-GB's CLDR
// data abbreviates September as "Sept" (4 letters) while every other month
// gets 3, which would make this the one month of the year that visually
// breaks the header's fixed-width date format.
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function formatDate(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return escapeHtml(iso);
  return `${String(date.getUTCDate()).padStart(2, "0")} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function extractBlock(html, name) {
  const re = new RegExp(`<!--${name}-->([\\s\\S]*?)<!--\\/${name}-->`);
  const match = html.match(re);
  if (!match) throw new Error(`Template is missing the ${name} block`);
  return { block: match[1], rest: html.replace(re, `{{__${name}_SLOT__}}`) };
}

function fill(template, tokens) {
  let out = template;
  for (const [key, value] of Object.entries(tokens)) out = out.replaceAll(`{{${key}}}`, value ?? "");
  return out;
}

// Every list in the digest (new findings, escalations, discovered-late, new candidates)
// uses the exact same row shape: name, date, a short summary, a source link. The only
// thing that varies per section is a single accent color carried through onto
// each of that section's items — visual richness without re-introducing a
// hierarchy between individual items within a section.
const SECTION_ACCENT = {
  findings: { accent: "#178665", soft: "#eaf7f2" },
  escalations: { accent: "#c2571a", soft: "#fdf0e8" },
  late: { accent: "#a87504", soft: "#fdf6e6" },
  candidates: { accent: "#6d5dad", soft: "#f2f0fa" }
};

const MOLECULE_COLORS = {
  semaglutide: "#178665",
  tirzepatide: "#dc6336",
  retatrutide: "#6d5dad",
  amylin: "#d86698",
  other_incretin: "#367fd0",
  non_incretin: "#7b7f84",
  unassigned: "#a87504"
};
const MOLECULE_LABELS = {
  semaglutide: "Semaglutide",
  tirzepatide: "Tirzepatide",
  retatrutide: "Retatrutide",
  amylin: "Amylin",
  other_incretin: "Other incretin",
  non_incretin: "Non-incretin LAI",
  unassigned: "Class unresolved"
};

function pill(text, color, filled) {
  const style = filled
    ? `background:${color};color:#ffffff;`
    : `background:#ffffff;color:${color};box-shadow:inset 0 0 0 1px ${color}40;`;
  return `<span style="display:inline-block;padding:3px 8px;margin:0 5px 4px 0;border-radius:99px;${style}font-size:9px;font-weight:800;letter-spacing:.3px;white-space:nowrap;">${escapeHtml(text)}</span>`;
}

// A stage advance is the single most decision-relevant thing a run can report, and in
// the old layout it was a clause buried mid-summary. It gets its own filled marker.
function itemTags(item) {
  const tags = (item.molecules ?? []).map((key) =>
    pill(MOLECULE_LABELS[key] ?? key, MOLECULE_COLORS[key] ?? "#7b7f84", false));
  if (item.stageChange) {
    tags.unshift(pill(`STAGE → ${item.stageChange}`, "#10182d", true));
  }
  return tags.join("");
}

// The row shows the publication, not the article headline. Source names in the registry
// are often "Publication - \"Full article title\"" or carry a corroboration clause, and
// dropping the whole string into a button is what made the row wrap onto two lines.
// source.name is not a publication field -- it holds whatever the run wrote, sometimes
// a publication, sometimes a publication plus the full article title, sometimes a
// corroboration clause naming two outlets. A declared source.publication wins; the
// string cut below is the fallback for records written before that field existed.
function publicationName(sourceName, declared) {
  if (declared) {
    const name = String(declared).trim();
    if (name) return name.length > 34 ? `${name.slice(0, 33).replace(/[\s,]+$/, "")}…` : name;
  }
  return cutPublication(sourceName);
}

function cutPublication(sourceName) {
  const cut = String(sourceName ?? "").split(/\s[-–—/]\s|,\s|\s\(/)[0].trim();
  const name = cut || String(sourceName ?? "").trim() || "Source";
  return name.length > 34 ? `${name.slice(0, 33).replace(/[\s,]+$/, "")}…` : name;
}

function renderItem(item, itemTemplate, accent) {
  return fill(itemTemplate, {
    ITEM_TAGS: itemTags(item),
    ITEM_HEADLINE: escapeHtml(item.headline),
    ITEM_DATE: formatDate(item.date),
    ITEM_SUMMARY: richText(item.summary),
    ITEM_SOURCE_URL: escapeHtml(item.sourceUrl),
    ITEM_SOURCE_NAME: escapeHtml(publicationName(item.sourceName, item.sourcePublication)),
    ITEM_ACCENT: accent.accent,
    ITEM_ACCENT_SOFT: accent.soft
  });
}

// Deterministic digest order. On 96 of 111 recorded dates there was exactly one
// finding, so this only bites on the rare busy day -- but when it does, the order
// should be explainable rather than whatever sequence the run happened to write in.
// Stage changes lead because a program moving bucket is the most decision-relevant
// thing a run can report; everything after that is stable tie-breaking.
const CLASS_ORDER = ["semaglutide", "tirzepatide", "retatrutide", "amylin", "other_incretin", "non_incretin"];

function classRank(item) {
  const ranks = (item.molecules ?? []).map((key) => CLASS_ORDER.indexOf(key)).filter((i) => i >= 0);
  return ranks.length ? Math.min(...ranks) : CLASS_ORDER.length;
}

export function orderItems(items) {
  return [...items].sort((a, b) =>
    Number(Boolean(b.stageChange)) - Number(Boolean(a.stageChange))
    || classRank(a) - classRank(b)
    || String(b.date).localeCompare(String(a.date))
    || String(a.headline).localeCompare(String(b.headline)));
}

function renderSection(items, sectionTemplate, itemTemplate, itemsTokenName, accentKey) {
  if (!items.length) return "";
  const accent = SECTION_ACCENT[accentKey];
  return fill(sectionTemplate, { [itemsTokenName]: orderItems(items).map((item) => renderItem(item, itemTemplate, accent)).join("\n") });
}

// The coverage strip exists to answer one question the item list structurally cannot:
// "is the tracker still watching the classes that produced nothing today?" It costs one
// compact row per class, instead of one empty section per class.
function renderCoverage(coverage) {
  if (!coverage || !coverage.length) return "";
  return coverage.map((row, index) => {
    const color = MOLECULE_COLORS[row.key] ?? "#7b7f84";
    const border = index === 0 ? "" : "border-top:1px solid #f0f1ed;";

    // Two different numbers, deliberately. "Last update" is when this class last
    // produced a real finding, which is the news. "Checked" is when the run last
    // actually queried it, which is the coverage claim -- and under the quiet-umbrella
    // throttle those diverge a lot, so collapsing them into one line would overstate
    // what the run did.
    const news = row.daysSinceNews === null || row.daysSinceNews === undefined
      ? "no finding yet"
      : row.daysSinceNews === 0 ? "updated today" : `${row.daysSinceNews}d ago`;
    const checked = row.daysSinceCheck === null || row.daysSinceCheck === undefined
      ? "not yet checked"
      : row.daysSinceCheck === 0 ? "checked today" : `checked ${row.daysSinceCheck}d ago`;
    const fresh = typeof row.daysSinceNews === "number" && row.daysSinceNews <= 14;

    return `<tr>
      <td width="4" bgcolor="${color}" style="background:${color};font-size:0;line-height:0;${border}">&nbsp;</td>
      <td style="padding:8px 10px;${border}color:#111317;font-size:11px;font-weight:800;white-space:nowrap;">${escapeHtml(row.label)}</td>
      <td align="right" style="padding:8px 10px;${border}color:#83868b;font-size:10px;white-space:nowrap;">${escapeHtml(String(row.programs))} tracked</td>
      <td align="right" style="padding:8px 10px;${border}color:#83868b;font-size:10px;white-space:nowrap;">${escapeHtml(checked)}</td>
      <td align="right" width="96" style="padding:8px 12px 8px 10px;${border}color:${fresh ? "#178665" : "#83868b"};font-size:10px;font-weight:${fresh ? "800" : "400"};white-space:nowrap;">${escapeHtml(news)}</td>
    </tr>`;
  }).join("");
}

// --- What is allowed into the digest -------------------------------------------------
// These gates are enforced here rather than left to prose in the skill, because prose
// rules alone did not hold: a January 2025 patent grant from a single search snippet went
// out as Monday's news, and the same five escalations were re-sent every day.

const LATE_ITEM_MAX_AGE_DAYS = 90;

function daysBetween(fromIso, toIso) {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Number.isNaN(from) || Number.isNaN(to) ? null : Math.round((to - from) / 86400000);
}

// A late item is still news only while it is recent and confirmed. Older or unverified
// items stay logged and on the dashboard; they just don't get emailed.
export function digestLateItems(items = [], runDate) {
  return items.filter((item) => {
    const age = daysBetween(item.date, runDate);
    return item.confidence === "confirmed" && age !== null && age <= LATE_ITEM_MAX_AGE_DAYS;
  });
}

const weekday = (runDate) => new Date(`${runDate}T00:00:00Z`).getUTCDay();

// Email goes out on weekdays only. The Sunday sweep drafts no digest; what it logs reaches
// the next weekday digest through meta.json's digest_carryover.
export function isWeekend(runDate) {
  const day = weekday(runDate);
  return day === 0 || day === 6;
}

// An escalation repeats in the Monday digest only, unless it escalated since the last
// digest. Daily repetition made the subject line wrong and the email read as noise.
export function digestEscalations(items = [], runDate) {
  const monday = weekday(runDate) === 1;
  return items.filter((item) => item.newlyEscalated === true || monday);
}

// The leadIn is a news headline. Three wording corrections in ten days showed a prose
// rule alone does not keep pipeline and admin-queue language out of it, so it is linted.
const LEAD_IN_RULES = [
  [/\bumbrellas?\b/i, "\"umbrella\""],
  [/\bsweep\b/i, "\"sweep\""],
  [/\bwire[- ]?skim\b/i, "\"wire skim\""],
  [/\bpromotion\b/i, "\"promotion\""],
  [/\bawaiting\b|\bwaiting on\b/i, "\"awaiting\""],
  [/\byour (?:decision|review|call|approval)\b/i, "a request for the reader's decision"],
  [/\bpending\b|\bqueue\b/i, "queue status"],
  [/\bcoverage\b/i, "\"coverage\""]
];

export function lintLeadIn(leadIn) {
  const text = String(leadIn ?? "");
  const problems = LEAD_IN_RULES.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  // A count like "37/37" reads as an ops metric. Phase designations ("Phase 2/3") are not counts.
  const withoutPhases = text.replace(/\bphase\s*(?:\d+|[ivx]+)[a-c]?\s*\/\s*(?:\d+|[ivx]+)[a-c]?/gi, "");
  if (/\b\d+\s*\/\s*\d+\b/.test(withoutPhases)) problems.push("an N/N count");
  return problems;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function buildSubject(input) {
  const count = input.findings.length;
  const lead = orderItems(input.findings)[0];
  if (count === 1) return `LAI update — ${lead.headline}`;
  if (count > 1) return `LAI update — ${count} new findings (incl. ${lead.headline})`;
  // No headline findings this run. Each part counts only what it names: repeated
  // escalations are never counted as new candidates.
  const parts = [];
  if (input.escalations.length) parts.push(`${plural(input.escalations.length, "program")} cleared the evidence bar`);
  if (input.lateItems.length) parts.push(`${input.lateItems.length} discovered late`);
  if (input.candidates.length) parts.push(plural(input.candidates.length, "new candidate"));
  if (!parts.length) return null;
  return `LAI update — ${parts.join(", ")}`;
}

function buildPreheader(input) {
  const count = input.findings.length;
  const dateLabel = formatDate(input.runDate);
  const lead = count ? orderItems(input.findings)[0] : null;
  if (count === 1) return `New finding on ${dateLabel}: ${lead.headline}`;
  if (count > 1) return `${count} new findings on ${dateLabel}, including ${lead.headline}.`;
  if (input.escalations.length || input.lateItems.length || input.candidates.length) return `No new headline findings on ${dateLabel} — see what else surfaced.`;
  return "";
}

// --- Send or draft ------------------------------------------------------------------
// New findings and new candidates are the send triggers (extended to candidates
// 2026-09-18: a candidate only reaches `candidates` at all after clearing named_entity +
// technical_claim + a Tier 1/2 source, which is a high enough bar that it is worth an
// unattended send on its own). A digest carrying nothing but repeated escalations or late
// items is still worth drafting, but it is not news that justifies mailing four inboxes
// unattended -- that one waits in Drafts for the admin to read and send by hand. Decided
// here rather than in prose so the rule is testable and a run cannot talk itself into a
// send.
export function deliveryMode(input) {
  return ((input.findings?.length ?? 0) > 0 || (input.candidates?.length ?? 0) > 0) ? "send" : "draft";
}

// Pure: takes the parsed input payload and the raw template file contents,
// returns { subject, preheader, html } or null if there's nothing to report
// this run or runDate is a Saturday or Sunday (the caller should skip drafting an
// email entirely in that case).
// Throws if the leadIn uses internal or admin-queue wording, so the run rewrites it.
export function renderDigest(rawInput, templateHtml) {
  if (isWeekend(rawInput.runDate)) return null;
  const base = { findings: [], escalations: [], lateItems: [], candidates: [], leadIn: "", ...rawInput };
  const input = {
    ...base,
    escalations: digestEscalations(base.escalations, base.runDate),
    lateItems: digestLateItems(base.lateItems, base.runDate)
  };

  const subject = buildSubject(input);
  if (subject === null) return null;

  const problems = lintLeadIn(input.leadIn);
  if (problems.length) {
    throw new Error(`leadIn uses internal or admin wording: ${problems.join(", ")}. Rewrite it as one sentence of news about the program itself.`);
  }

  const { block: itemTemplate, rest: withoutItem } = extractBlock(templateHtml, "ITEM");
  const { block: findingsSectionTemplate, rest: withoutFindingsSection } = extractBlock(withoutItem, "FINDINGS_SECTION");
  const { block: escalationsSectionTemplate, rest: withoutEscalationsSection } = extractBlock(withoutFindingsSection, "ESCALATIONS_SECTION");
  const { block: lateSectionTemplate, rest: withoutLateSection } = extractBlock(withoutEscalationsSection, "LATE_SECTION");
  const { block: candidatesSectionTemplate, rest: withoutCandidates } = extractBlock(withoutLateSection, "CANDIDATES_SECTION");
  const { block: coverageSectionTemplate, rest: shell } = extractBlock(withoutCandidates, "COVERAGE_SECTION");

  const findingsSectionHtml = renderSection(input.findings, findingsSectionTemplate, itemTemplate, "FINDINGS_ITEMS", "findings");
  const escalationsSectionHtml = renderSection(input.escalations, escalationsSectionTemplate, itemTemplate, "ESCALATION_ITEMS", "escalations");
  const lateSectionHtml = renderSection(input.lateItems, lateSectionTemplate, itemTemplate, "LATE_ITEMS", "late");
  const candidatesSectionHtml = renderSection(input.candidates, candidatesSectionTemplate, itemTemplate, "CANDIDATE_ITEMS", "candidates");
  const preheader = buildPreheader(input);

  const coverageRows = renderCoverage(input.coverage);
  const coverageSectionHtml = coverageRows ? fill(coverageSectionTemplate, { COVERAGE_ROWS: coverageRows }) : "";

  const html = fill(shell, {
    __COVERAGE_SECTION_SLOT__: coverageSectionHtml,
    __FINDINGS_SECTION_SLOT__: findingsSectionHtml,
    __ESCALATIONS_SECTION_SLOT__: escalationsSectionHtml,
    __LATE_SECTION_SLOT__: lateSectionHtml,
    __CANDIDATES_SECTION_SLOT__: candidatesSectionHtml,
    // ITEM is only ever used as the row template fed into the SECTION templates
    // above — its own slot in the base never holds anything directly.
    __ITEM_SLOT__: "",
    SUBJECT: escapeHtml(subject),
    PREHEADER: escapeHtml(preheader),
    RUN_DATE: formatDate(input.runDate),
    LEAD_IN: richText(input.leadIn),
    DASHBOARD_URL: escapeHtml(dashboardUrl)
  });

  return { subject, preheader, html, delivery: deliveryMode(input) };
}

async function main() {
  const [, , inputPath, outputPath = path.join(root, "email", "draft-output.json")] = process.argv;
  if (!inputPath) {
    console.error("Usage: node scripts/render-email.mjs <input.json> [output.json]");
    process.exitCode = 1;
    return;
  }

  const input = JSON.parse(await readFile(inputPath, "utf8"));
  const templateHtml = await readFile(templatePath, "utf8");

  if (isWeekend(input.runDate)) {
    console.log("Weekend run — no email. The next weekday digest carries this run's results through meta.json's digest_carryover.");
    return;
  }

  const heldLate = (input.lateItems?.length ?? 0) - digestLateItems(input.lateItems, input.runDate).length;
  const heldEscalations = (input.escalations?.length ?? 0) - digestEscalations(input.escalations, input.runDate).length;
  if (heldLate) console.log(`Held back ${heldLate} late item(s): older than ${LATE_ITEM_MAX_AGE_DAYS} days or not confirmed. They stay on the dashboard.`);
  if (heldEscalations) console.log(`Held back ${heldEscalations} repeat escalation(s): repeats go out in the Monday digest only.`);

  let result;
  try {
    result = renderDigest(input, templateHtml);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  if (!result) {
    console.log("Nothing to report this run — skip drafting an email entirely.");
    return;
  }

  await writeFile(outputPath, JSON.stringify(result, null, 2), "utf8");
  const escalations = (input.escalations?.length ?? 0) - heldEscalations;
  const late = (input.lateItems?.length ?? 0) - heldLate;
  console.log(`Rendered digest (${input.findings?.length ?? 0} findings, ${escalations} escalations, ${late} late, ${input.candidates?.length ?? 0} candidates) → ${outputPath}`);
  console.log(result.delivery === "send"
    ? "delivery: send — this digest has a new finding or a new candidate, so send it to the standing recipient list."
    : "delivery: draft — no new finding or candidate this run. Create the Gmail draft and do not send it.");
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(fileURLToPath(import.meta.url))) main();
