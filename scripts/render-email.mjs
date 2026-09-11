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

// Every list in the digest (new findings, discovered-late, new candidates) uses
// the exact same row shape: name, date, a short summary, a source link. The only
// thing that varies per section is a single accent color carried through onto
// each of that section's items — visual richness without re-introducing a
// hierarchy between individual items within a section.
const SECTION_ACCENT = {
  findings: { accent: "#178665", soft: "#eaf7f2" },
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
    if (name) return name.length > 34 ? `${name.slice(0, 33).replace(/[\s,]+$/, "")}\u2026` : name;
  }
  return cutPublication(sourceName);
}

function cutPublication(sourceName) {
  const cut = String(sourceName ?? "").split(/\s[-\u2013\u2014/]\s|,\s|\s\(/)[0].trim();
  const name = cut || String(sourceName ?? "").trim() || "Source";
  return name.length > 34 ? `${name.slice(0, 33).replace(/[\s,]+$/, "")}\u2026` : name;
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

function buildSubject(input) {
  const count = input.findings.length;
  const lead = orderItems(input.findings)[0];
  if (count === 1) return `LAI update — ${lead.headline}`;
  if (count > 1) return `LAI update — ${count} new findings (incl. ${lead.headline})`;
  // No headline findings this run, but there's still something worth a subject line for.
  const parts = [];
  if (input.lateItems.length) parts.push(`${input.lateItems.length} discovered late`);
  if (input.candidates.length) parts.push(`${input.candidates.length} new candidate${input.candidates.length === 1 ? "" : "s"}`);
  if (!parts.length) return null;
  return `LAI update — ${parts.join(", ")}`;
}

function buildPreheader(input) {
  const count = input.findings.length;
  const dateLabel = formatDate(input.runDate);
  const lead = count ? orderItems(input.findings)[0] : null;
  if (count === 1) return `New finding on ${dateLabel}: ${lead.headline}`;
  if (count > 1) return `${count} new findings on ${dateLabel}, including ${lead.headline}.`;
  if (input.lateItems.length || input.candidates.length) return `No new headline findings on ${dateLabel} — see what was discovered late or is pending review.`;
  return "";
}

// Pure: takes the parsed input payload and the raw template file contents,
// returns { subject, preheader, html } or null if there's nothing to report
// this run (the caller should skip drafting an email entirely in that case).
export function renderDigest(rawInput, templateHtml) {
  const input = { findings: [], lateItems: [], candidates: [], leadIn: "", ...rawInput };

  const subject = buildSubject(input);
  if (subject === null) return null;

  const { block: itemTemplate, rest: withoutItem } = extractBlock(templateHtml, "ITEM");
  const { block: findingsSectionTemplate, rest: withoutFindingsSection } = extractBlock(withoutItem, "FINDINGS_SECTION");
  const { block: lateSectionTemplate, rest: withoutLateSection } = extractBlock(withoutFindingsSection, "LATE_SECTION");
  const { block: candidatesSectionTemplate, rest: withoutCandidates } = extractBlock(withoutLateSection, "CANDIDATES_SECTION");
  const { block: coverageSectionTemplate, rest: base } = extractBlock(withoutCandidates, "COVERAGE_SECTION");

  const findingsSectionHtml = renderSection(input.findings, findingsSectionTemplate, itemTemplate, "FINDINGS_ITEMS", "findings");
  const lateSectionHtml = renderSection(input.lateItems, lateSectionTemplate, itemTemplate, "LATE_ITEMS", "late");
  const candidatesSectionHtml = renderSection(input.candidates, candidatesSectionTemplate, itemTemplate, "CANDIDATE_ITEMS", "candidates");
  const preheader = buildPreheader(input);

  const coverageRows = renderCoverage(input.coverage);
  const coverageSectionHtml = coverageRows ? fill(coverageSectionTemplate, { COVERAGE_ROWS: coverageRows }) : "";

  const html = fill(base, {
    __COVERAGE_SECTION_SLOT__: coverageSectionHtml,
    __FINDINGS_SECTION_SLOT__: findingsSectionHtml,
    __LATE_SECTION_SLOT__: lateSectionHtml,
    __CANDIDATES_SECTION_SLOT__: candidatesSectionHtml,
    // ITEM is only ever used as the row template fed into the three SECTION
    // templates above — its own slot in the base never holds anything directly.
    __ITEM_SLOT__: "",
    SUBJECT: escapeHtml(subject),
    PREHEADER: escapeHtml(preheader),
    RUN_DATE: formatDate(input.runDate),
    LEAD_IN: richText(input.leadIn),
    DASHBOARD_URL: escapeHtml(dashboardUrl)
  });

  return { subject, preheader, html };
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
  const result = renderDigest(input, templateHtml);

  if (!result) {
    console.log("Nothing to report this run — skip drafting an email entirely.");
    return;
  }

  await writeFile(outputPath, JSON.stringify(result, null, 2), "utf8");
  console.log(`Rendered digest (${input.findings?.length ?? 0} findings, ${input.lateItems?.length ?? 0} late, ${input.candidates?.length ?? 0} candidates) → ${outputPath}`);
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(fileURLToPath(import.meta.url))) main();
