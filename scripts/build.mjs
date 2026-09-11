import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CANDIDATE_STATUSES, STAGES } from "../src/model.js";

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
