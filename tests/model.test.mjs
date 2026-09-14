import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CANDIDATE_STATUSES, MOLECULE_ORDER, assessRunHealth, competitiveScore, interpretLeader, leadSentence, moleculeClasses, normalizeStage, orderPrograms, prepareDatabase, safeUrl } from "../src/model.js";

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
  // A combined Phase I/II design defaults to Phase 1 until there's language showing
  // the "II" portion is itself underway (see the dedicated combo test below) -- merely
  // "recruiting" for the combined protocol doesn't mean the Phase 2 portion has begun.
  assert.equal(normalizeStage("Phase I/IIa — recruiting"), "Phase 1");
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
});

test("buckets a combined Phase I/II design as Phase 1 until the II portion is actually underway", () => {
  // Design decision (not a bug fix): a trial that "just started recruiting" for a
  // combined Phase I/II protocol shouldn't rank the same as a program with a
  // completed, separate Phase 1 and its own distinct Phase 2 already underway --
  // so a bare combo mention defaults to Phase 1 regardless of "recruiting" language.
  assert.equal(normalizeStage("Phase I/IIa — recruiting (started Aug 9, 2026)"), "Phase 1");
  assert.equal(normalizeStage("Phase 1/2a trial ongoing since Q1 2026"), "Phase 1");
  // Only promotes to Phase 2 once the "2"/"II" portion specifically is shown as active.
  assert.equal(
    normalizeStage("Phase I/IIa study; Phase 1 portion complete, Phase 2a expansion cohort now dosing"),
    "Phase 2"
  );
  assert.equal(normalizeStage("Phase 1/2a trial; dose-expansion started Q3 2026"), "Phase 2");
});

test("prefers a declared stage_label over guessing from prose, and flags it when it has to guess", () => {
  const declared = prepareDatabase({
    records: [{
      id: "x", canonical_name: "X – Y", origin: "Global", technology_family: "other",
      // The free-text stage would normalize to "Phase 3" on its own -- stage_label must win.
      current_status: { stage: "Phase 3 pivotal trial dosing", stage_label: "Phase 1" },
      finding_history: []
    }]
  }).records[0];
  assert.equal(declared.stageLabel, "Phase 1");
  assert.equal(declared.stageInferred, false);

  const missing = prepareDatabase({
    records: [{
      id: "x", canonical_name: "X – Y", origin: "Global", technology_family: "other",
      current_status: { stage: "Phase 3 pivotal trial dosing" }, // no stage_label at all
      finding_history: []
    }]
  }).records[0];
  assert.equal(missing.stageLabel, "Phase 3");
  assert.equal(missing.stageInferred, true);

  const invalid = prepareDatabase({
    records: [{
      id: "x", canonical_name: "X – Y", origin: "Global", technology_family: "other",
      current_status: { stage: "Preclinical", stage_label: "Phase 2.5" }, // not one of the eight values
      finding_history: []
    }]
  }).records[0];
  assert.equal(invalid.stageLabel, "Preclinical");
  assert.equal(invalid.stageInferred, true);
});

test("prepares the complete repository snapshot and identifies the development leader", async () => {
  const data = prepareDatabase(await sourcePayload());
  // records.length only changes when an umbrella is promoted (a manual, admin-only action),
  // so it's safe to pin exactly. findings/candidates grow every time the daily scan finds
  // something, so pinning an exact count here would fail after the very next scan run —
  // assert the pipeline produced a non-empty, monotonically-plausible result instead.
  assert.equal(data.records.length, 45);
  assert.ok(data.findings.length >= 126, `expected at least 126 findings, got ${data.findings.length}`);
  assert.ok(data.pendingCandidates.length >= 9, `expected at least 9 pending candidates, got ${data.pendingCandidates.length}`);
  assert.equal(data.leader.id, "mapi-pharma-semaglutide");
  assert.equal(data.leader.stageLabel, "Phase 1");
});

test("reads molecule_class from the record instead of inferring it from text", () => {
  // The regression this guards: the old isSemaglutideProgram() matched any mention of a
  // molecule anywhere in the record, including comparator arms and explicit denials.
  const comparatorOnly = {
    id: "x", canonical_name: "Example – PRT-9999",
    current_status: {
      stage_label: "Preclinical",
      molecule_class: ["other_incretin"],
      data_point: "combined with semaglutide, 26.8% at day 14 vs 28.8% for tirzepatide monotherapy"
    },
    finding_history: [{ date: "2026-01-01", summary: "the Lilly collaboration does NOT include tirzepatide" }]
  };
  assert.deepEqual(moleculeClasses(comparatorOnly), ["other_incretin"]);

  // An empty array is legal and distinct from a missing field; both mean "unresolved".
  assert.deepEqual(moleculeClasses({ current_status: { molecule_class: [] } }), []);
  assert.deepEqual(moleculeClasses({ current_status: {} }), []);

  // Unknown values are dropped rather than silently rendered as a seventh class.
  assert.deepEqual(moleculeClasses({ current_status: { molecule_class: ["semaglutide", "cagrisema"] } }), ["semaglutide"]);
});

test("orders a class board by maturity first, with score breaking ties within a stage", () => {
  // Regression: the race chart ranked by competitive score alone, which blends in news
  // recency, so an IND-filed program with fresh news sat above Phase 1 programs and the
  // bars zigzagged down the chart.
  const program = (company, stageOrder, total, last_updated = "2026-01-01") =>
    ({ company, stageOrder, score: { total }, current_status: { last_updated } });
  const board = [
    program("Preclinical Co", 1, 55),
    program("Fresh IND Co", 2, 62),
    program("Phase One C", 3, 60),
    program("Phase One A", 3, 65, "2026-08-01"),
    program("Phase One B", 3, 65, "2026-09-01")
  ];
  const names = (list) => list.map((item) => item.company);

  assert.deepEqual(names(orderPrograms(board)), ["Phase One B", "Phase One A", "Phase One C", "Fresh IND Co", "Preclinical Co"]);
  assert.deepEqual(names(orderPrograms(board, "score")), ["Phase One B", "Phase One A", "Fresh IND Co", "Phase One C", "Preclinical Co"]);
  assert.deepEqual(names(board), ["Preclinical Co", "Fresh IND Co", "Phase One C", "Phase One A", "Phase One B"], "ordering must not mutate the board it was given");
});

test("every live class board reads in non-increasing stage order under maturity", async () => {
  const data = prepareDatabase(await sourcePayload());
  for (const group of data.moleculeGroups) {
    const stages = orderPrograms(group.members).map((record) => record.stageOrder);
    assert.deepEqual(stages, [...stages].sort((a, b) => b - a), `${group.key} board is out of stage order`);
  }
});

test("groups every record into its declared classes and flags the unresolved ones", async () => {
  const data = prepareDatabase(await sourcePayload());
  const grouped = new Set();
  for (const group of data.moleculeGroups) {
    assert.ok(MOLECULE_ORDER.includes(group.key), `unexpected group ${group.key}`);
    group.members.forEach((record) => grouped.add(record.id));
  }
  data.needsMoleculeReview.forEach((record) => {
    assert.deepEqual(record.molecules, [], `${record.id} is in the review queue but carries classes`);
    grouped.add(record.id);
  });
  // Every record lands somewhere: on at least one board, or in the review queue.
  assert.equal(grouped.size, data.records.length);

  // A record declaring two classes appears on both boards but exists once in the registry.
  const dual = data.records.find((record) => record.molecules.length > 1);
  assert.ok(dual, "expected at least one multi-class record");
  const boards = data.moleculeGroups.filter((g) => g.members.some((m) => m.id === dual.id));
  assert.equal(boards.length, dual.molecules.length);
  assert.equal(data.records.filter((r) => r.id === dual.id).length, 1);
});

test("scores competitively from declared fields only, and never scores the platform set", () => {
  const now = Date.parse("2026-09-11T00:00:00Z");
  const strong = competitiveScore({
    current_status: { stage_label: "Phase 3", last_updated: "2026-09-05", dosing_target: "Monthly" },
    finding_history: [{ date: "2026-09-05", type: "trial_data_readout", source: { tier: 1 } }]
  }, now);
  assert.equal(strong.total, strong.stage + strong.momentum + strong.evidence + strong.dosing);
  assert.equal(strong.stage, 32);      // Phase 3 is 5 of 7 steps -> round(5/7*45)
  assert.equal(strong.momentum, 25);   // 6 days old
  assert.equal(strong.evidence, 18);   // Tier 1
  assert.equal(strong.dosing, 12);     // monthly

  const stale = competitiveScore({
    current_status: { stage_label: "Phase 3", last_updated: "2024-01-01", dosing_target: "Once daily oral" },
    finding_history: [{ date: "2024-01-01", source: { tier: 3 } }]
  }, now);
  assert.equal(stale.momentum, 0);
  assert.equal(stale.dosing, 0);
  assert.ok(stale.total < strong.total, "a stale record must not outrank a fresh one at the same stage");
});

test("momentum comes only from findings that move a program, never from sales or share moves", () => {
  const now = Date.parse("2026-09-11T00:00:00Z");
  const salesOnly = competitiveScore({
    current_status: { stage_label: "Approved / marketed", last_updated: "2026-09-05" },
    finding_history: [
      { date: "2026-09-05", type: "market_reaction", source: { tier: 1 } },
      { date: "2025-01-01", type: "regulatory", source: { tier: 1 } }
    ]
  }, now);
  assert.equal(salesOnly.momentum, 0, "a fresh sales line must not refresh momentum");

  const readout = competitiveScore({
    current_status: { stage_label: "Phase 2", last_updated: "2026-01-01" },
    finding_history: [{ date: "2026-09-01", type: "trial_data_readout", source: { tier: 2 } }]
  }, now);
  assert.equal(readout.momentum, 25);
});

test("takes the first sentence without cutting at abbreviations", () => {
  // Regression: the feed headline for Ascletis read "Ascletis initiated a U.S."
  assert.equal(leadSentence("Ascletis initiated a U.S. Phase I study for ASC36. It is the fourth start."), "Ascletis initiated a U.S. Phase I study for ASC36.");
  assert.equal(leadSentence("Camurus Inc. filed in the E.U. today. More follows."), "Camurus Inc. filed in the E.U. today.");
  assert.equal(leadSentence("No period at all"), "No period at all");
  assert.equal(leadSentence("임상 1상을 시작했다. 두 번째 문장."), "임상 1상을 시작했다.");
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

test("sorts escalated candidates above routine ones regardless of recency", () => {
  // The point of the escalation ladder (scan skill, Track B3) is that a candidate which
  // cleared the promotion bar cannot be buried by newer arrivals -- so status outranks
  // every recency tiebreak in the review queue.
  const data = prepareDatabase({
    records: [],
    candidates: [
      { id: "cand-b", detected_name: "Fresh Pending", status: "pending", created_date: "2026-09-10",
        evidence: [{ source: { name: "x", url: "https://example.com/b", tier: 1 }, date: "2026-09-10" }] },
      { id: "cand-a", detected_name: "Escalated", status: "ready_for_promotion", created_date: "2026-08-01",
        promotion_bar: { cleared: ["named_entity", "technical_claim", "confirmed_source", "second_dated_event"], unmet: [], evidence: "IND cleared and dosing started." },
        evidence: [{ source: { name: "x", url: "https://example.com/a", tier: 1 }, date: "2026-09-01" }] },
      { id: "cand-c", detected_name: "Gone Quiet", status: "stalled", created_date: "2026-07-01",
        evidence: [{ source: { name: "x", url: "https://example.com/c", tier: 2 }, date: "2026-07-01" }] },
      { id: "cand-d", detected_name: "Thin Signal", status: "watch", created_date: "2026-08-15", evidence: [] },
      { id: "cand-e", detected_name: "Already Handled", status: "promoted", created_date: "2026-08-20", evidence: [],
        resolution: { action: "promoted", umbrella_id: "somewhere", date: "2026-08-21" } }
    ],
    meta: {}
  });

  assert.deepEqual(data.pendingCandidates.map((candidate) => candidate.id), ["cand-a", "cand-b", "cand-c"]);
  assert.deepEqual(data.readyCandidates.map((candidate) => candidate.id), ["cand-a"]);
  assert.deepEqual(data.watchCandidates.map((candidate) => candidate.id), ["cand-d"]);
  assert.deepEqual(data.pendingCandidates.filter((candidate) => candidate.status === "stalled").map((candidate) => candidate.id), ["cand-c"]);
  // A resolved candidate leaves the queue entirely -- it is no longer anyone's decision.
  assert.equal(data.pendingCandidates.some((candidate) => candidate.id === "cand-e"), false);
});

test("derives candidate waiting time and follow-up counts at render time", () => {
  // days_pending is deliberately never stored (see data-schema.md) -- a stored age is
  // wrong the day after it's written, which is exactly how a forgotten candidate hides.
  const data = prepareDatabase({
    records: [],
    candidates: [
      { id: "cand-f", detected_name: "Tracked", status: "pending", created_date: "2026-01-01",
        follow_up: { last_checked: "2026-01-20", checks_run: 4 },
        promotion_bar: { cleared: ["named_entity", "technical_claim"], unmet: ["confirmed_source", "second_dated_event"], evidence: "Still a single Tier 3 mention." },
        evidence: [{ source: { name: "x", url: "https://example.com/f", tier: 3 }, date: "2026-01-05" }] }
    ],
    meta: {}
  });
  const candidate = data.pendingCandidates[0];
  assert.equal(candidate.followUpChecks, 4);
  assert.deepEqual(candidate.unmetConditions, ["confirmed_source", "second_dated_event"]);
  assert.ok(candidate.daysPending > 0);
  assert.ok(candidate.daysPending >= candidate.daysSinceEvidence);
});

test("keeps every stored candidate status inside the controlled vocabulary", async () => {
  // scripts/build.mjs fails the build on an unknown status for the same reason it fails
  // on a bad stage_label: an unrecognized value would drop the candidate out of the
  // review queue silently instead of loudly.
  const { candidates } = await sourcePayload();
  for (const candidate of candidates) {
    assert.ok(
      CANDIDATE_STATUSES.includes(candidate.status),
      `${candidate.id} has uncontrolled status ${JSON.stringify(candidate.status)}`
    );
    if (candidate.status === "ready_for_promotion") {
      assert.ok(candidate.promotion_bar?.evidence, `${candidate.id} is escalated with no written rationale`);
    }
  }
});
