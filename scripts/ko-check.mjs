import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Korean copy checks. English is the source of truth and each Korean field is its
// translation, so the facts a translation can silently corrupt -- numbers and
// identifiers -- must survive character for character. See the skill's
// references/ko-glossary.md for the writing rules this enforces.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const STATUS_FIELDS = ["stage", "stage_evidence", "molecule_evidence", "dosing_target", "partner", "data_point"];

const HANGUL = /[가-힣]/;
const EXEMPT_CODES = /^(?:FY\d{2,4}|Q[1-4]\d*|[12]H|H[12])$/i;
const stripThousands = (text) => String(text ?? "").replace(/(\d),(?=\d{3}(?!\d))/g, "$1");

// A code has an uppercase letter (PT403, NCT07722728) or is a tracker id (cand-2026-09-02-007);
// lowercase words like "end-2025" or "trailing-12-month" are prose, and their digits are
// still checked as numbers.
const isCode = (token) => /\d{2,}/.test(token) && !EXEMPT_CODES.test(token) && (/[A-Z]/.test(token) || /^(?:cand|f)-\d/.test(token));
// Leading zeros carry no meaning ("2024-06-03" is 2024년 6월 3일), so numbers compare without them.
const numberValue = (token) => token.replace(/^0+(?=\d)/, "");
// Digits inside a word, like the 2 in G2GBio, are part of a name rather than a number, and
// an ordinal ("2nd asset") reads naturally in Korean without its digit (두 번째 자산).
const numbersIn = (text) => [...text.matchAll(/\d+(?:\.\d+)?/g)]
  .filter((match) => !(/[A-Za-z]/.test(text[match.index - 1] ?? "") && /[A-Za-z]/.test(text[match.index + match[0].length] ?? "")))
  .filter((match) => !/^(?:st|nd|rd|th)\b/i.test(text.slice(match.index + match[0].length)))
  .map((match) => numberValue(match[0]));

export function protectedTokens(english) {
  const text = stripThousands(english);
  const codes = (text.match(/\b[A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)*\b/g) ?? []).filter(isCode);
  const numbers = numbersIn(text.replace(/\b(?:[12]H|H[12])\b/g, ""));
  return { codes: [...new Set(codes)], numbers: [...new Set(numbers)] };
}

// Problems with one Korean field against its English source; an empty list means it passes.
export function checkKoreanCopy(english, korean) {
  const en = String(english ?? "").trim();
  if (!en) return [];
  const ko = stripThousands(korean).trim();
  if (!ko) return ["Korean copy is missing"];
  const problems = [];
  const { codes, numbers } = protectedTokens(en);
  const missingCodes = codes.filter((code) => !ko.includes(code));
  const koreanNumbers = new Set([...ko.matchAll(/\d+(?:\.\d+)?/g)].map((match) => numberValue(match[0])));
  const missingNumbers = numbers.filter((number) => !koreanNumbers.has(number));
  if (missingCodes.length) problems.push(`identifiers missing from Korean: ${missingCodes.join(", ")}`);
  if (missingNumbers.length) problems.push(`numbers missing from Korean: ${missingNumbers.join(", ")}`);
  if (en.split(/\s+/).length >= 4 && !HANGUL.test(ko)) problems.push("Korean copy contains no Hangul");
  return problems;
}

// Every English/Korean pair the dashboard shows, with a label for error messages.
export function koreanPairs({ records = [], candidates = [] }) {
  const pairs = [];
  for (const record of records) {
    const status = record.current_status ?? {};
    for (const field of STATUS_FIELDS) {
      pairs.push({ label: `${record.id} current_status.${field}`, en: status[field], ko: status[`${field}_ko`] });
    }
    for (const finding of record.finding_history ?? []) {
      pairs.push({ label: `${record.id} ${finding.id} summary`, en: finding.summary, ko: finding.summary_ko });
    }
  }
  for (const candidate of candidates) {
    (candidate.evidence ?? []).forEach((item, index) => {
      pairs.push({ label: `candidates.json ${candidate.id} evidence[${index}].snippet`, en: item.snippet, ko: item.snippet_ko });
    });
    if (candidate.promotion_bar) {
      pairs.push({ label: `candidates.json ${candidate.id} promotion_bar.evidence`, en: candidate.promotion_bar.evidence, ko: candidate.promotion_bar.evidence_ko });
    }
  }
  return pairs;
}

export function checkAllKorean(data) {
  return koreanPairs(data).flatMap(({ label, en, ko }) => checkKoreanCopy(en, ko).map((problem) => `${label}: ${problem}`));
}

// CLI: node scripts/ko-check.mjs            -> check the repository data
//      node scripts/ko-check.mjs <file.json> -> check a translation batch
//        { "records": { "<id>": { "current_status": { "<field>_ko": "..." }, "findings": { "<finding id>": "..." } } },
//          "candidates": { "<id>": { "snippets": ["..."], "promotion_bar_evidence": "..." } } }
async function loadRepository() {
  const directory = path.join(root, "data", "umbrellas");
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json"));
  const records = await Promise.all(files.map(async (name) => JSON.parse(await readFile(path.join(directory, name), "utf8"))));
  const { candidates } = JSON.parse(await readFile(path.join(root, "data", "candidates.json"), "utf8"));
  return { records, candidates };
}

export function applyBatch(data, batch) {
  const records = [];
  for (const [id, translation] of Object.entries(batch.records ?? {})) {
    const record = data.records.find((item) => item.id === id);
    if (!record) throw new Error(`batch names unknown record ${id}`);
    const copy = structuredClone(record);
    Object.assign(copy.current_status, translation.current_status ?? {});
    for (const finding of copy.finding_history) finding.summary_ko = translation.findings?.[finding.id];
    records.push(copy);
  }
  const candidates = [];
  for (const [id, translation] of Object.entries(batch.candidates ?? {})) {
    const candidate = data.candidates.find((item) => item.id === id);
    if (!candidate) throw new Error(`batch names unknown candidate ${id}`);
    const copy = structuredClone(candidate);
    copy.evidence.forEach((item, index) => { item.snippet_ko = translation.snippets?.[index]; });
    if (copy.promotion_bar) copy.promotion_bar.evidence_ko = translation.promotion_bar_evidence;
    candidates.push(copy);
  }
  return { records, candidates };
}

async function main() {
  const [, , batchPath] = process.argv;
  const data = await loadRepository();
  const target = batchPath ? applyBatch(data, JSON.parse(await readFile(batchPath, "utf8"))) : data;
  const problems = checkAllKorean(target);
  if (problems.length) {
    console.error(`Korean copy check failed (${problems.length}):\n  - ${problems.join("\n  - ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Korean copy check passed: ${koreanPairs(target).filter((pair) => String(pair.en ?? "").trim()).length} fields.`);
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
