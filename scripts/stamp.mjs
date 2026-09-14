import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Run-callable bookkeeping. A run used to spend ~50 tool turns issuing one Edit call per
// file just to move a date. These helpers edit the value in place as text instead of
// re-serializing, so hand formatting (candidates.json keeps short arrays on one line)
// survives and the diff stays one line per value. Every edit is verified by parsing the
// result and comparing it with the intended object, so a stamp can never touch anything
// else in the file.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_VALUE = String.raw`(?:"[^"]*"|null)`;

export function kstToday(now = Date.now()) {
  return new Date(now + 9 * 3600000).toISOString().slice(0, 10);
}

function resolveDate(value) {
  const date = value === "today" ? kstToday() : value;
  if (!ISO_DATE.test(date ?? "")) throw new Error(`Date must be YYYY-MM-DD or "today" (KST), got ${JSON.stringify(value)}`);
  return date;
}

function assertSame(actualText, expected, label) {
  if (JSON.stringify(JSON.parse(actualText)) !== JSON.stringify(expected)) {
    throw new Error(`${label}: stamped file does not match the intended change; nothing was written`);
  }
}

// Umbrella file: set current_status.last_checked.
export function stampChecked(text, date) {
  const record = JSON.parse(text);
  if (!record.current_status) throw new Error(`${record.id ?? "record"} has no current_status`);
  const expected = structuredClone(record);
  expected.current_status.last_checked = date;

  let out;
  if ("last_checked" in record.current_status) {
    const pattern = new RegExp(String.raw`("last_checked":\s*)${DATE_VALUE}`, "g");
    const count = (text.match(pattern) ?? []).length;
    if (count !== 1) throw new Error(`${record.id}: expected one last_checked field, found ${count}`);
    out = text.replace(pattern, `$1"${date}"`);
  } else {
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const line = new RegExp(String.raw`^([ \t]*)("last_updated":\s*${DATE_VALUE})(,?)(?=\r?$)`, "m");
    const match = text.match(line);
    if (!match) throw new Error(`${record.id}: no last_updated line to place last_checked after`);
    const [whole, indent, field, comma] = match;
    out = text.replace(whole, `${indent}${field},${eol}${indent}"last_checked": "${date}"${comma}`);
  }
  assertSame(out, expected, record.id);
  return out;
}

// candidates.json: set follow_up.last_checked and add one to follow_up.checks_run.
export function stampFollowUp(text, ids, date) {
  const payload = JSON.parse(text);
  const expected = structuredClone(payload);
  let out = text;

  for (const id of new Set(ids)) {
    const target = expected.candidates.find((candidate) => candidate.id === id);
    if (!target) throw new Error(`candidates.json has no candidate ${id}`);
    if (!target.follow_up) throw new Error(`${id} has no follow_up block; add it by hand once (see data-schema.md)`);
    target.follow_up.last_checked = date;
    target.follow_up.checks_run = (target.follow_up.checks_run ?? 0) + 1;

    const start = out.search(new RegExp(String.raw`"id":\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    const next = /"id":\s*"cand-/g;
    next.lastIndex = start + 1;
    const end = next.exec(out)?.index ?? out.length;
    const slice = out.slice(start, end);

    const block = slice.match(/"follow_up":\s*\{[^{}]*\}/)?.[0];
    if (!block || !/"checks_run":\s*\d+/.test(block) || !new RegExp(String.raw`"last_checked":\s*${DATE_VALUE}`).test(block)) {
      throw new Error(`${id}: follow_up must carry last_checked and checks_run before it can be stamped`);
    }
    const stamped = block
      .replace(new RegExp(String.raw`("last_checked":\s*)${DATE_VALUE}`), `$1"${date}"`)
      .replace(/("checks_run":\s*)(\d+)/, (_, prefix, count) => `${prefix}${Number(count) + 1}`);
    out = out.slice(0, start) + slice.replace(block, stamped) + out.slice(end);
  }

  assertSame(out, expected, "candidates.json");
  return out;
}

async function main() {
  const [, , mode, dateArg, ...ids] = process.argv;
  if (!["checked", "followup"].includes(mode) || !dateArg || !ids.length) {
    console.error("Usage:\n  node scripts/stamp.mjs checked <YYYY-MM-DD|today> <umbrella-id>...\n  node scripts/stamp.mjs followup <YYYY-MM-DD|today> <candidate-id>...");
    process.exitCode = 1;
    return;
  }
  const date = resolveDate(dateArg);

  if (mode === "checked") {
    // Read and stamp every file before writing any, so one bad id leaves the tree untouched.
    const updates = [];
    for (const id of new Set(ids)) {
      const file = path.join(root, "data", "umbrellas", `${id}.json`);
      updates.push([file, stampChecked(await readFile(file, "utf8"), date)]);
    }
    await Promise.all(updates.map(([file, text]) => writeFile(file, text, "utf8")));
    console.log(`last_checked = ${date} on ${updates.length} umbrella file(s)`);
  } else {
    const file = path.join(root, "data", "candidates.json");
    await writeFile(file, stampFollowUp(await readFile(file, "utf8"), ids, date), "utf8");
    console.log(`follow_up stamped ${date} on ${new Set(ids).size} candidate(s)`);
  }
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
