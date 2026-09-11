import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MOLECULE_ORDER, STAGES } from "../src/model.js";

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
  records.push(record);
}

const candidatePayload = await readJson(path.join(root, "data", "candidates.json"));
const meta = await readJson(path.join(root, "data", "meta.json"));
const candidates = Array.isArray(candidatePayload.candidates) ? candidatePayload.candidates : [];

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
console.log(`Built Vercel dashboard with ${records.length} records, ${findingCount} findings, and ${candidates.length} candidates.`);
