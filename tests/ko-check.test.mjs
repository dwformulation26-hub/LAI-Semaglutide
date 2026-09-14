import assert from "node:assert/strict";
import test from "node:test";
import { checkAllKorean, checkKoreanCopy, protectedTokens } from "../scripts/ko-check.mjs";

test("finds the numbers and development codes a translation must keep", () => {
  const { codes, numbers } = protectedTokens("Peptron's PT403 (NCT07722728) gave 7.5% weight loss at 400 mg in Q3 2026, FY2026 H1 sales of KRW 1,500B.");
  assert.deepEqual(codes, ["PT403", "NCT07722728"]);
  assert.ok(numbers.includes("7.5") && numbers.includes("400") && numbers.includes("1500") && numbers.includes("2026"));
  assert.ok(!numbers.includes("1"), "the H1 label must not demand a bare 1");
});

test("passes a faithful Korean copy and flags a dropped number or code", () => {
  const english = "Peptron dosed the first patient in the PT403 Phase 1 study on Aug 30, 2026, at 1,200 mg.";
  assert.deepEqual(checkKoreanCopy(english, "펩트론은 2026년 8월 30일 PT403 임상 1상에서 첫 환자에게 1200 mg을 투여했다."), []);
  assert.match(checkKoreanCopy(english, "펩트론은 2026년 8월 30일 임상 1상에서 첫 환자에게 1,200 mg을 투여했다.").join(), /identifiers missing from Korean: PT403/);
  assert.match(checkKoreanCopy(english, "펩트론은 2026년 8월 3일 PT403 임상 1상에서 첫 환자에게 1,200 mg을 투여했다.").join(), /numbers missing from Korean: 30/);
});

test("does not demand name digits, leading zeros, or lowercase words as codes", () => {
  // Found translating the registry: G2GBio is 지투지바이오, an ISO date reads naturally as
  // 2024년 6월 3일, and "end-2025" is prose, not a development code.
  assert.deepEqual(checkKoreanCopy(
    "G2GBio filed the application on 2024-06-03 and expects approval by end-2025.",
    "지투지바이오는 2024년 6월 3일 출원했으며 2025년 말까지 승인을 기대한다."
  ), []);
  assert.deepEqual(protectedTokens("Candidate cand-2026-09-02-007 overlaps PT403.").codes, ["cand-2026-09-02-007", "PT403"]);
  assert.deepEqual(checkKoreanCopy("An option on a 2nd asset from 2026", "2026년부터 두 번째 자산에 대한 옵션"), []);
});

test("requires a copy with Hangul, but not for an empty English field or a bare name", () => {
  assert.deepEqual(checkKoreanCopy(null, undefined), []);
  assert.deepEqual(checkKoreanCopy("Eli Lilly", "Eli Lilly"), []);
  assert.match(checkKoreanCopy("Phase 1 dosing has started", "").join(), /missing/);
  assert.match(checkKoreanCopy("Phase 1 dosing has started", "Phase 1 dosing has started").join(), /no Hangul/);
});

test("walks every dashboard text field on records and candidates", () => {
  const problems = checkAllKorean({
    records: [{
      id: "x",
      current_status: { stage: "Phase 2 completed in 2026", stage_ko: "2026년 임상 2상 완료", partner: null, data_point: "7.5% weight loss at week 16" },
      finding_history: [{ id: "f-1", summary: "Topline results were positive in 2026.", summary_ko: "2026년 톱라인 결과가 긍정적이었다." }]
    }],
    candidates: [{ id: "c-1", evidence: [{ snippet: "Registered NCT07484204 in 2026." }], promotion_bar: { evidence: "Clears all four conditions.", evidence_ko: "네 가지 조건을 모두 충족했다." } }]
  });
  assert.deepEqual(problems, [
    "x current_status.data_point: Korean copy is missing",
    "candidates.json c-1 evidence[0].snippet: Korean copy is missing"
  ]);
});
