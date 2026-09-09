import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assessRunHealth, interpretLeader, normalizeStage, prepareDatabase, safeUrl } from "../src/model.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function sourcePayload() {
  const directory = path.join(root, "data", "umbrellas");
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json"));
  const records = await Promise.all(files.map(async (name) => JSON.parse(await readFile(path.join(directory, name), "utf8"))));
  const candidates = JSON.parse(await readFile(path.join(root, "data", "candidates.json"), "utf8")).candidates;
  const meta = JSON.parse(await readFile(path.join(root, "data", "meta.json"), "utf8"));
  return { records, candidates, meta, latest_data_date: "2026-09-02", built_at: new Date(0).toISOString() };
}

test("normalizes active combined studies without promoting planned phases", () => {
  assert.equal(normalizeStage("Phase I/IIa — recruiting"), "Phase 2");
  assert.equal(normalizeStage("Phase 2b in preparation following positive Phase 1b"), "Phase 1");
  assert.equal(normalizeStage("Phase 1 IND filed; dosing targeted in 2026"), "IND filed");
});

test("recognizes IND-submitted phrasing as filed, not an active trial", () => {
  // Regression: "Phase 1 IND submitted ... pending approval" was matching the bare
  // "Phase 1" pattern (only "ind filed"/"ind application" were recognized), which
  // misclassified a still-pending IND as an active Phase 1 trial.
  assert.equal(normalizeStage("Phase 1 IND submitted to Korea's MFDS (Aug 25, 2026), pending approval"), "IND filed");
  assert.equal(normalizeStage("Company filed an IND for the program in Q3"), "IND filed");
  assert.equal(normalizeStage("IND application submitted; Phase 1 dosing targeted in 2026"), "IND filed");
});

test("never lets a roman-numeral Phase II/III mention register as Phase 1/2", () => {
  // Regression: /phase\s*(?:i|1)\w*/ let the greedy \w* swallow extra roman-numeral
  // letters, so "Phase II" and "Phase III" both matched as if they were "Phase 1" --
  // and the "positive/completed + phase 1" shortcut fired on "positive Phase II" and
  // returned early, before the real "Global Phase III ... dosed" mention downstream
  // ever got a chance to match the (correctly ordered) Phase 3 pattern.
  assert.equal(
    normalizeStage("Global Phase III (pivotal trials, first participant dosed Aug 2026); formulation completed positive Phase II 24-week study"),
    "Phase 3"
  );
  // Sub-stage suffixes on roman numerals must still resolve correctly -- the fix only
  // blocks a *roman-numeral* character right after i/ii, not any word character.
  assert.equal(normalizeStage("Phase Ib dose-escalation ongoing"), "Phase 1");
  assert.equal(normalizeStage("Phase IIa fully enrolled"), "Phase 2");
});

test("requires the Phase 1/2 combo check to respect future-intent language, like every other phase check", () => {
  // Regression: this was the one phase check with no futureWords guard at all, so
  // "stated intent to advance into Phase 1/2" overrode an explicit, twice-repeated
  // "Preclinical" elsewhere in the same text.
  assert.equal(
    normalizeStage("Preclinical. Remains listed at preclinical stage despite the company's stated intent to advance into Phase 1/2."),
    "Preclinical"
  );
  // An actual active combined-phase trial must still match.
  assert.equal(normalizeStage("Phase I/IIa — recruiting (started Aug 9, 2026)"), "Phase 2");
});

test("prepares the complete repository snapshot and identifies the development leader", async () => {
  const data = prepareDatabase(await sourcePayload());
  // records.length only changes when an umbrella is promoted (a manual, admin-only action),
  // so it's safe to pin exactly. findings/candidates grow every time the daily scan finds
  // something, so pinning an exact count here would fail after the very next scan run —
  // assert the pipeline produced a non-empty, monotonically-plausible result instead.
  assert.equal(data.records.length, 37);
  assert.ok(data.findings.length >= 126, `expected at least 126 findings, got ${data.findings.length}`);
  assert.ok(data.pendingCandidates.length >= 9, `expected at least 9 pending candidates, got ${data.pendingCandidates.length}`);
  assert.equal(data.leader.id, "mapi-pharma-semaglutide");
  assert.equal(data.leader.stageLabel, "Phase 2");
});

test("flags stale or never-run monitoring types against their expected cadence", () => {
  const now = Date.parse("2026-09-04T00:00:00Z");
  const healthy = assessRunHealth({ daily_scan: "2026-09-03T00:00:00Z", weekly_sweep: "2026-08-28T00:00:00Z", qc_tier2: "2026-08-28T00:00:00Z" }, now);
  assert.equal(healthy.allHealthy, true);
  assert.equal(healthy.healthyCount, 3);

  const stale = assessRunHealth({ daily_scan: "2026-09-03T00:00:00Z", weekly_sweep: null, qc_tier2: null }, now);
  assert.equal(stale.allHealthy, false);
  assert.equal(stale.healthyCount, 1);
  assert.match(stale.summary, /Weekly sweep has never run/);
  assert.match(stale.summary, /QC Tier 2 has never run/);
});

test("interprets the leader's lead margin and tie state", () => {
  const now = Date.parse("2026-09-04T00:00:00Z");
  const leader = { id: "a", stageOrder: 4, stageLabel: "Phase 2", current_status: { last_updated: "2026-09-01" } };
  const trailing = { id: "b", stageOrder: 3, stageLabel: "Phase 1", current_status: {} };
  assert.match(interpretLeader(leader, [leader, trailing], now), /Leads by 1 stage over the next-closest program; updated 3d ago\./);

  const tiedWith = { id: "c", stageOrder: 4, stageLabel: "Phase 2", current_status: {} };
  assert.match(interpretLeader(leader, [leader, tiedWith], now), /Tied with 1 other program at Phase 2/);

  assert.match(interpretLeader(leader, [leader], now), /Only program at this stage/);
});

test("accepts only web source links", () => {
  assert.match(safeUrl("https://example.com/source"), /^https:/);
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("not a url"), null);
});
