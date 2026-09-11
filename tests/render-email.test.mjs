import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { orderItems, renderDigest } from "../scripts/render-email.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateHtml = await readFile(path.join(root, "email", "templates", "daily-digest.html"), "utf8");

// Findings, late items, and candidates all share this exact shape — that's the point.
const sampleFinding = {
  headline: "AUL009 files Phase 1 IND in Korea",
  date: "2026-09-02",
  summary: "Kyungdong and Aul Bio filed a Phase 1 IND with Korea's MFDS for the once-monthly semaglutide LAI, moving AUL009 from preclinical to IND-filed.",
  sourceUrl: "https://www.kpanews.co.kr/news/articleView.html?idxno=542327",
  sourceName: "약사공론 (KPA News)"
};

test("renders a single-finding digest with a headline subject and no leftover template tokens", () => {
  const result = renderDigest({ runDate: "2026-09-04", leadIn: "1 new finding today.", findings: [sampleFinding] }, templateHtml);
  assert.equal(result.subject, "LAI update — AUL009 files Phase 1 IND in Korea");
  assert.equal(result.preheader, "New finding on 04 SEP 2026: AUL009 files Phase 1 IND in Korea");
  assert.match(result.html, /AUL009 files Phase 1 IND in Korea/);
  assert.match(result.html, /02 SEP 2026/);
  assert.match(result.html, /WHAT'S NEW/);
  assert.doesNotMatch(result.html, /\{\{[A-Z_]+\}\}/);
  assert.doesNotMatch(result.html, /<!--[A-Z_/]+-->/);
});

test("uses a multi-finding subject and every finding gets the same name/date/summary/link shape", () => {
  const second = { headline: "Peptron raises Series C", date: "2026-09-03", summary: "A KRW 20B Series C round to fund PT403's Phase 1 readout.", sourceUrl: "https://example.com/2", sourceName: "Korea Biomedical Review" };
  const result = renderDigest({ runDate: "2026-09-04", leadIn: "2 new findings today.", findings: [sampleFinding, second] }, templateHtml);
  // The subject names whichever row the ordered list actually leads with, not whichever
  // the run happened to supply first — otherwise the subject can advertise an item the
  // reader then finds third in the email. Neither fixture declares a molecule class or a
  // stage change, so ordering falls through to newest-first, and Peptron (03 Sep) wins
  // over AUL009 (02 Sep) despite being passed second.
  assert.equal(result.subject, "LAI update — 2 new findings (incl. Peptron raises Series C)");
  assert.match(result.html, /AUL009 files Phase 1 IND in Korea/);
  assert.match(result.html, /Peptron raises Series C/);
  // Only one WHAT'S NEW header should appear even with two findings — they share one section, one row shape each.
  assert.equal((result.html.match(/WHAT'S NEW/g) ?? []).length, 1);
});

test("converts **bold** in Claude-authored summaries but never interprets raw HTML from source text", () => {
  const finding = { ...sampleFinding, summary: "**Not just a preclinical watch item anymore.** A <script>alert(1)</script> claim & a \"quoted\" detail." };
  const result = renderDigest({ runDate: "2026-09-04", leadIn: "x", findings: [finding] }, templateHtml);
  assert.match(result.html, /<strong>Not just a preclinical watch item anymore\.<\/strong>/);
  assert.doesNotMatch(result.html, /\*\*/);
  assert.doesNotMatch(result.html, /<script>alert/);
  assert.match(result.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("falls back to a late/candidate-only subject when there are no headline findings", () => {
  const result = renderDigest({
    runDate: "2026-09-04",
    leadIn: "",
    findings: [],
    lateItems: [{ headline: "Peptron raises convertible bond", date: "2026-08-20", summary: "Published on DART, only surfaced by this run's wire skim.", sourceUrl: "https://dart.fss.or.kr/x", sourceName: "DART" }],
    candidates: [{ headline: "Example Biosciences", date: "2026-09-01", summary: "Licensed a PLGA microsphere platform for an undisclosed GLP-1 asset.", sourceUrl: "https://example.com", sourceName: "BioSpace" }]
  }, templateHtml);
  assert.equal(result.subject, "LAI update — 1 discovered late, 1 new candidate");
  assert.match(result.html, /DISCOVERED LATE/);
  assert.match(result.html, /NEW CANDIDATES/);
  assert.doesNotMatch(result.html, /WHAT'S NEW/);
});

test("returns null when there is nothing to report, so the caller can skip drafting entirely", () => {
  const result = renderDigest({ runDate: "2026-09-04", leadIn: "", findings: [], lateItems: [], candidates: [] }, templateHtml);
  assert.equal(result, null);
});

test("orders rows deterministically: stage changes, then class, then newest", () => {
  const item = (headline, date, molecules, stageChange = null) => ({ headline, date, molecules, stageChange, summary: "s", sourceUrl: "https://e.com", sourceName: "E" });
  const ordered = orderItems([
    item("Zulu", "2026-01-01", ["non_incretin"]),
    item("Alpha", "2026-05-05", ["tirzepatide"]),
    item("Bravo", "2026-05-05", ["semaglutide"]),
    item("Charlie", "2026-02-02", ["non_incretin"], "PHASE 2"),
    item("Delta", "2026-09-09", ["semaglutide"])
  ]).map((x) => x.headline);

  // A stage change leads regardless of its class or how old it is.
  assert.equal(ordered[0], "Charlie");
  // Then molecule class order: semaglutide before tirzepatide before non-incretin.
  assert.deepEqual(ordered.slice(1), ["Delta", "Bravo", "Alpha", "Zulu"]);

  // Same inputs in any order produce the same output.
  const shuffled = orderItems([
    item("Alpha", "2026-05-05", ["tirzepatide"]),
    item("Charlie", "2026-02-02", ["non_incretin"], "PHASE 2"),
    item("Delta", "2026-09-09", ["semaglutide"]),
    item("Zulu", "2026-01-01", ["non_incretin"]),
    item("Bravo", "2026-05-05", ["semaglutide"])
  ]).map((x) => x.headline);
  assert.deepEqual(shuffled, ordered);
});

test("the subject names the row the ordered list actually leads with", () => {
  const out = renderDigest({
    runDate: "2026-09-11",
    leadIn: "x",
    findings: [
      { headline: "Quiet Co", date: "2026-09-11", molecules: ["non_incretin"], summary: "s", sourceUrl: "https://e.com", sourceName: "E" },
      { headline: "Moved Co", date: "2026-09-01", molecules: ["semaglutide"], stageChange: "IND FILED", summary: "s", sourceUrl: "https://e.com", sourceName: "E" }
    ]
  }, templateHtml);
  assert.match(out.subject, /Moved Co/);
  assert.match(out.preheader, /Moved Co/);
});

test("tags each row with its classes and marks only a real stage change", () => {
  const out = renderDigest({
    runDate: "2026-09-11", leadIn: "x",
    findings: [{
      headline: "Dual Co", date: "2026-09-11", molecules: ["semaglutide", "tirzepatide"],
      stageChange: "PHASE 1", summary: "s", sourceUrl: "https://e.com", sourceName: "E"
    }]
  }, templateHtml);
  assert.match(out.html, /Semaglutide/);
  assert.match(out.html, /Tirzepatide/);
  assert.match(out.html, /STAGE → PHASE 1/);

  const noChange = renderDigest({
    runDate: "2026-09-11", leadIn: "x",
    findings: [{ headline: "Steady Co", date: "2026-09-11", molecules: ["amylin"], summary: "s", sourceUrl: "https://e.com", sourceName: "E" }]
  }, templateHtml);
  assert.doesNotMatch(noChange.html, /STAGE →/);
});

test("uses a declared publication, falling back to cutting the free-text source name", () => {
  const render = (finding) => renderDigest({ runDate: "2026-09-11", leadIn: "x", findings: [finding] }, templateHtml).html;
  const base = { headline: "H", date: "2026-09-11", molecules: ["semaglutide"], summary: "s", sourceUrl: "https://e.com" };

  assert.match(render({ ...base, sourceName: "anything at all", sourcePublication: "Fierce Biotech" }), /Fierce Biotech/);
  // No declared publication: cut the article title off the free-text name.
  assert.match(render({ ...base, sourceName: 'Fierce Biotech – "Pfizer axes ex-Metsera obesity asset in quarterly clearout"' }), /Fierce Biotech/);
  assert.match(render({ ...base, sourceName: "Money Today (머니투데이), corroborated by TheBioNews" }), /Money Today/);
  // The action itself is a fixed label, so the row can never wrap on a long source.
  assert.match(render({ ...base, sourceName: "E" }), /Read more/);
});

test("coverage reports checks and news separately, and never drops a class", () => {
  const out = renderDigest({
    runDate: "2026-09-11", leadIn: "x",
    findings: [{ headline: "H", date: "2026-09-11", molecules: ["semaglutide"], summary: "s", sourceUrl: "https://e.com", sourceName: "E" }],
    coverage: [
      { key: "semaglutide", label: "Semaglutide", programs: 9, daysSinceCheck: 0, daysSinceNews: 0 },
      { key: "retatrutide", label: "Retatrutide", programs: 1, daysSinceCheck: 3, daysSinceNews: 94 },
      { key: "amylin", label: "Amylin", programs: 4, daysSinceCheck: null, daysSinceNews: null }
    ]
  }, templateHtml);

  assert.match(out.html, /Semaglutide/);
  assert.match(out.html, /checked 3d ago/);   // the coverage claim
  assert.match(out.html, /94d ago/);          // the news, kept separate
  assert.match(out.html, /not yet checked/);  // a class with no check yet still renders
  assert.match(out.html, /no finding yet/);
  // The header must not claim every class was checked this run — the throttle skips most.
  assert.doesNotMatch(out.html, /CHECKED THIS RUN/);
});

test("omits the coverage block entirely when no coverage is supplied", () => {
  const out = renderDigest({
    runDate: "2026-09-11", leadIn: "x",
    findings: [{ headline: "H", date: "2026-09-11", molecules: ["semaglutide"], summary: "s", sourceUrl: "https://e.com", sourceName: "E" }]
  }, templateHtml);
  assert.doesNotMatch(out.html, /COVERAGE &middot;/);
  assert.doesNotMatch(out.html, /\{\{/, "no unfilled template tokens may survive");
});

test("links the dashboard button at the current domain, and lets the environment override it", () => {
  const base = { runDate: "2026-09-11", leadIn: "x", findings: [{ headline: "H", date: "2026-09-11", molecules: ["semaglutide"], summary: "s", sourceUrl: "https://e.com", sourceName: "E" }] };
  const out = renderDigest(base, templateHtml);
  // Regression: this was pinned to lai-tracker.vercel.app, which outlived the project
  // rename, so every digest sent readers to a dead host.
  assert.doesNotMatch(out.html, /lai-tracker\.vercel\.app/);
  assert.match(out.html, /https:\/\/lai-semaglutide\.vercel\.app\//);
  assert.doesNotMatch(out.html, /\{\{DASHBOARD_URL\}\}/);
});

test("the footer states only what stays true whether the digest is drafted or sent", () => {
  const out = renderDigest({
    runDate: "2026-09-11", leadIn: "x",
    findings: [{ headline: "H", date: "2026-09-11", molecules: ["semaglutide"], summary: "s", sourceUrl: "https://e.com", sourceName: "E" }]
  }, templateHtml);
  // The old wording promised the digest was "never sent without a human reviewing it
  // first", which stops being a claim the system can stand behind the moment sending is
  // ever automated. Approval of the send is the part that holds either way.
  assert.doesNotMatch(out.html, /never sent/);
  assert.match(out.html, /A person approves each send/);
  assert.match(out.html, /public sources/);
});
