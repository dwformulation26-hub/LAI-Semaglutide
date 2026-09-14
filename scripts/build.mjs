import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CANDIDATE_STATUSES, MOLECULE_ORDER, STAGES } from "../src/model.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const umbrellaDirectory = path.join(root, "data", "umbrellas");
const requiredFields = [
  "id",
  "canonical_name",
  "origin",
  "technology_family",
  "current_status",
  "finding_history"
];
const validStageLabels = Object.keys(STAGES);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UNRESOLVED_STATUSES = new Set(["watch", "pending", "ready_for_promotion", "stalled"]);
const BAR_KEYS = ["named_entity", "technical_claim", "confirmed_source", "second_dated_event"];
const DATE_BASES = ["stated", "inferred"];

// The dashboard renders summaries and source names verbatim, so they describe the world
// only. How a run found or checked an item ("discovered via this run", "fetch was
// EGRESS_BLOCKED") belongs in verification_note. These checks collect every problem
// before failing, so an unattended run can fix them all in one pass.
const NARRATION = /EGRESS_BLOCKED|not previously logged|discovered via (?:this run|(?:the )?(?:weekly|daily))|this run['’]s|FOR REVIEWER|SCOPE CAVEAT|search[- ](?:index|result|snippet|engine)/i;
const problems = [];

function checkWorldText(label, ...texts) {
  return texts.filter((text) => NARRATION.test(String(text ?? "")))
    .map(() => `${label}: summary, snippet or source name narrates the pipeline; move that to verification_note`);
}

function checkVerificationFields(label, item) {
  const found = [];
  if ("date_basis" in item && !DATE_BASES.includes(item.date_basis)) found.push(`${label}: date_basis must be one of ${DATE_BASES.join(", ")}`);
  if ("verification_note" in item && typeof item.verification_note !== "string") found.push(`${label}: verification_note must be a string`);
  if (!ISO_DATE.test(item.date ?? "")) found.push(`${label}: date must be YYYY-MM-DD`);
  return found;
}

// Track B3's stall rule and weekly deep pass read these fields; a candidate missing them
// is silently skipped rather than failing loudly, so their shape is enforced here.
function checkUnresolvedCandidate(candidate) {
  const label = `candidates.json ${candidate.id}`;
  const found = [];
  if (!ISO_DATE.test(candidate.created_date ?? "")) found.push(`${label}: created_date must be YYYY-MM-DD`);
  if (!Array.isArray(candidate.evidence) || !candidate.evidence.length) found.push(`${label}: needs at least one evidence entry`);
  (candidate.evidence ?? []).forEach((item, index) => {
    if (!item.source?.url) found.push(`${label} evidence[${index}]: source.url is required`);
  });
  const followUp = candidate.follow_up;
  if (!followUp) {
    found.push(`${label}: follow_up is required ({ last_checked: null, checks_run: 0, near_bar: false } for a new candidate)`);
  } else {
    if (!(followUp.last_checked === null || ISO_DATE.test(followUp.last_checked ?? ""))) found.push(`${label}: follow_up.last_checked must be YYYY-MM-DD or null`);
    if (!Number.isInteger(followUp.checks_run) || followUp.checks_run < 0) found.push(`${label}: follow_up.checks_run must be a non-negative integer`);
    if (typeof followUp.near_bar !== "boolean") found.push(`${label}: follow_up.near_bar must be true or false`);
  }
  const bar = candidate.promotion_bar;
  if (!bar) {
    found.push(`${label}: promotion_bar is required`);
  } else {
    const keys = [...(bar.cleared ?? []), ...(bar.unmet ?? [])];
    if (keys.length !== BAR_KEYS.length || !BAR_KEYS.every((key) => keys.includes(key))) {
      found.push(`${label}: promotion_bar.cleared and unmet must together name each of ${BAR_KEYS.join(", ")} exactly once`);
    }
    if (!bar.evidence) found.push(`${label}: promotion_bar.evidence is required`);
  }
  return found;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const umbrellaFiles = (await readdir(umbrellaDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort();

const records = [];
for (const fileName of umbrellaFiles) {
  const record = await readJson(path.join(umbrellaDirectory, fileName));
  const missing = requiredFields.filter((field) => !(field in record));
  if (missing.length) {
    throw new Error(`${fileName} is missing required fields: ${missing.join(", ")}`);
  }
  if (!Array.isArray(record.finding_history)) {
    throw new Error(`${fileName}: finding_history must be an array`);
  }
  // stage_label is the controlled field the scan skill must assign directly (see
  // SKILL.md's "Stage scoring" section) -- this is a hard build failure, not a
  // warning, precisely so an un-assigned or invalid value can never silently reach
  // production and fall back to guessing the stage from prose.
  const stageLabel = record.current_status?.stage_label;
  if (!validStageLabels.includes(stageLabel)) {
    throw new Error(
      `${fileName}: current_status.stage_label is ${JSON.stringify(stageLabel)}, must be one of ${validStageLabels.join(", ")}`
    );
  }
  // molecule_class gets the same treatment as stage_label, and for the same reason: it
  // used to be recovered by pattern-matching the record's text at render time, which
  // cannot tell a molecule the program formulates from one it is merely measured
  // against. The field must be present and every value must be known -- but an EMPTY
  // array is deliberately legal, and means the scan found the evidence genuinely
  // ambiguous and declined to guess. Those records surface in the review queue.
  const moleculeClass = record.current_status?.molecule_class;
  if (!Array.isArray(moleculeClass)) {
    throw new Error(
      `${fileName}: current_status.molecule_class is missing or not an array. Use [] to mean "evidence was ambiguous, left for admin review".`
    );
  }
  const unknown = moleculeClass.filter((value) => !MOLECULE_ORDER.includes(value));
  if (unknown.length) {
    throw new Error(
      `${fileName}: current_status.molecule_class contains ${unknown.map((v) => JSON.stringify(v)).join(", ")}, must be one of ${MOLECULE_ORDER.join(", ")}`
    );
  }
  if (!record.current_status?.molecule_evidence) {
    throw new Error(
      `${fileName}: current_status.molecule_evidence is required — one sentence naming the fact behind the class, or behind leaving it unassigned.`
    );
  }
  for (const finding of record.finding_history) {
    problems.push(...checkWorldText(`${fileName} ${finding.id}`, finding.summary, finding.source?.name));
    problems.push(...checkVerificationFields(`${fileName} ${finding.id}`, finding));
  }
  records.push(record);
}

const candidatePayload = await readJson(path.join(root, "data", "candidates.json"));
const meta = await readJson(path.join(root, "data", "meta.json"));
const candidates = Array.isArray(candidatePayload.candidates) ? candidatePayload.candidates : [];

// candidate.status drives the escalation ladder (see the scan skill's Track B3 section):
// an unknown value would silently drop a candidate out of the review queue instead of
// showing up as an error, so it fails the build for the same reason stage_label does.
for (const candidate of candidates) {
  if (!CANDIDATE_STATUSES.includes(candidate.status)) {
    throw new Error(
      `candidates.json: ${candidate.id ?? "(candidate with no id)"} has status ${JSON.stringify(candidate.status)}, must be one of ${CANDIDATE_STATUSES.join(", ")}`
    );
  }
  if (candidate.status === "ready_for_promotion" && !candidate.promotion_bar?.evidence) {
    throw new Error(
      `candidates.json: ${candidate.id} is ready_for_promotion but has no promotion_bar.evidence explaining why`
    );
  }
  for (const [index, item] of (candidate.evidence ?? []).entries()) {
    problems.push(...checkWorldText(`candidates.json ${candidate.id} evidence[${index}]`, item.snippet, item.source?.name));
    problems.push(...checkVerificationFields(`candidates.json ${candidate.id} evidence[${index}]`, item));
  }
  if (UNRESOLVED_STATUSES.has(candidate.status)) problems.push(...checkUnresolvedCandidate(candidate));
}

// A weekly sweep drafts no email; it lists what it logged in digest_carryover for the next
// weekday digest. An id that doesn't exist would silently drop out of that email.
const carryover = meta.digest_carryover;
if (carryover) {
  for (const { umbrella_id: umbrellaId, finding_id: findingId } of carryover.findings ?? []) {
    const record = records.find((item) => item.id === umbrellaId);
    if (!record?.finding_history.some((finding) => finding.id === findingId)) problems.push(`meta.json digest_carryover: no finding ${findingId} in ${umbrellaId}`);
  }
  for (const id of [...(carryover.candidates ?? []), ...(carryover.newly_escalated ?? [])]) {
    if (!candidates.some((candidate) => candidate.id === id)) problems.push(`meta.json digest_carryover: no candidate ${id}`);
  }
}

if (problems.length) {
  throw new Error(`Data checks failed (${problems.length}):\n  - ${problems.join("\n  - ")}`);
}

const dateValues = records.flatMap((record) => [
  record.current_status?.last_updated,
  ...record.finding_history.map((finding) => finding.date)
]).filter(Boolean).sort();

const dashboardPayload = {
  schema_version: 1,
  built_at: new Date().toISOString(),
  latest_data_date: dateValues.at(-1) ?? null,
  records,
  candidates,
  meta
};

await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, "assets"), { recursive: true });
await mkdir(path.join(output, "data"), { recursive: true });

await Promise.all([
  cp(path.join(root, "index.html"), path.join(output, "index.html")),
  cp(path.join(root, "src", "app.js"), path.join(output, "assets", "app.js")),
  cp(path.join(root, "src", "model.js"), path.join(output, "assets", "model.js")),
  cp(path.join(root, "src", "i18n.js"), path.join(output, "assets", "i18n.js")),
  cp(path.join(root, "src", "styles.css"), path.join(output, "assets", "styles.css")),
  cp(path.join(root, "public", "manifest.webmanifest"), path.join(output, "manifest.webmanifest")),
  cp(path.join(root, "public", "icon.svg"), path.join(output, "icon.svg")),
  writeFile(
    path.join(output, "data", "dashboard.json"),
    JSON.stringify(dashboardPayload),
    "utf8"
  )
]);

const findingCount = records.reduce((total, record) => total + record.finding_history.length, 0);
const escalatedCount = candidates.filter((candidate) => candidate.status === "ready_for_promotion").length;
console.log(`Built Vercel dashboard with ${records.length} records, ${findingCount} findings, and ${candidates.length} candidates (${escalatedCount} ready for promotion).`);
