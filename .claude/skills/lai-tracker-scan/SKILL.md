---
name: lai-tracker-scan
description: Runs the LAI Tracker's research pipeline for the Long-Acting Injectable (LAI) drug development tracker project — daily umbrella monitoring, daily wire-skim discovery, weekly structural discovery sweeps, candidate follow-up and escalation, and tiered anti-hallucination QC. Use this skill whenever asked to run the LAI tracker scan, run today's LAI tracking, do the daily LAI check, do the weekly LAI sweep, run Track A or Track B, or refresh the LAI Tracker's data — including when a scheduled/cron routine fires with a prompt like "run daily LAI scan" or "run weekly LAI sweep." Also use it if asked to audit or re-verify the LAI Tracker registry for accuracy. Do NOT use this skill to promote, merge, reject, or snooze a candidate into an umbrella — that is a separate, manual, admin-only action this skill explicitly never performs.
---

# LAI Tracker scan

This skill runs the research engine behind the LAI Tracker — a living tracker of Long-Acting Injectable (LAI) drug development, semaglutide depot/LAI technologies first, then broader peptide/protein LAI delivery tech. It covers both Korean domestic and global players, with that split treated as a first-class filter throughout, not an afterthought.

This skill is meant to be invoked unattended, by a scheduled routine with no prior conversation context. Because of that, follow it exactly rather than improvising the process from general research instincts — the whole point of pinning this down as a skill is that every run applies the same criteria, so small inconsistencies don't compound into drift over months.

**The one rule that overrides everything else below:** this skill only ever *proposes*. It writes findings to known entities and writes new candidates to a pending list. It never creates a new umbrella, never merges a candidate into an existing one, never rejects or snoozes a candidate, and never edits the app's interface/UI code — only the data file. Promotion and the other triage actions are exclusively performed by the admin, by hand, in a separate conversation. Do this even for a candidate that looks like an obvious slam-dunk — the review step exists specifically to catch the cases that look obvious and aren't.

## Pick your mode first

The invocation (the scheduled routine's prompt, or what the person asked) tells you which mode to run. Don't run more than one mode per invocation unless explicitly asked to.

| Mode | Trigger | Runs |
|---|---|---|
| **Daily scan** | "run daily LAI scan", "run today's LAI tracking", or no mode specified | Track A + Track B1 + Track B3 (cheap pass) + QC Tier 0/1 |
| **Weekly sweep** | "run weekly LAI sweep", "Sunday LAI compile" | Track B2 + Track B3 (deep pass) + QC Tier 2 (and Track A/B1 too, if the daily scan hasn't already run today) |
| **Full audit** | Only when explicitly requested — "run a full LAI audit/re-verification" | QC Tier 3 only. Never self-trigger this — see QC section |

If it's ambiguous which mode was meant, default to **Daily scan** — it's the cheapest and safest default.

**Automated schedule (as of 2026-09-07):** Weekly sweep also fires on its own every Sunday at 9:00 AM KST, via the "LAI Tracker — Weekly Sweep" cloud routine (separate from the daily "LAI Tracker — Daily Scan" routine, which fires every day). Both are scheduled cloud routines, not something this file controls directly — check them with the `RemoteTrigger` tool if a run needs to be inspected or the schedule needs to change.

## Search budget discipline

A real run hit its session search cap partway through a Daily scan, covering only 2 of 37 umbrellas before running out — a good chunk of that budget went to redundant re-phrasings of the same query for a single umbrella instead of covering everyone. These rules exist because that happened, not as theory:

- **Breadth before depth.** On a Daily scan, do one pass across every umbrella first — one query per umbrella using its single most distinctive alias (usually the drug code or ticker, not the generic company name) — before spending any further budget going deeper on the ones that showed something promising. This guarantees every umbrella gets at least one check even if the budget runs out later, instead of exhausting the budget on the first few while the rest get zero attention.
- **One query per alias, two absolute max.** If the first query for an alias comes back with nothing new, move on — don't try three more phrasings hunting for something. A quiet result is a valid result, not a reason to keep searching.
- **Don't retry a domain that just told you no.** If a fetch returns `EGRESS_BLOCKED` or a similar hard error, don't try that same domain again this run — note it under `source_health` (see below) and move on. Retrying a blocked domain burns a tool call for a result you already know.
- **Track B1's wire skim is a fixed, bounded pass** — a handful of term-based searches, not a per-umbrella sweep. Don't let it balloon into checking specific companies; that's Track A's job.
- **Track B3's daily pass spends at most 2 searches, and its weekly pass one query per pending candidate.** Follow-up must never crowd out Track A's first-pass coverage of the 37 umbrellas — if budget is tight, the umbrellas come first and the follow-up queue waits for the weekly deep pass. Date math costs nothing and always runs.

## Freshness window — Track A and Track B1 only

The whole point of a *daily* scan is that the dashboard and the email digest always read as current — a finding that's actually a week old, surfacing today as if it just happened, makes the tracker feel unpunctual even though the information itself is accurate. This section draws that line consistently; it is not a license to skip real news that arrives late.

**Window definition:** `window_start` = the timestamp of the last successful `daily_scan` run, from `meta.json.last_run.daily_scan`. If that's null (first run, or the last run never completed), fall back to `last_run.weekly_sweep` if it's more recent than 24h ago; if neither exists, default `window_start` to 24 hours before now. Letting the window stretch back to the last real run — instead of a hard 24h cutoff — means a skipped day or a long weekend widens the net instead of silently losing whatever aged past exactly 24h.

**Applying it:**
- When searching, prefer the search tool's own recency filter (e.g. "past day") scoped to roughly this window where available — this also helps the search-budget discipline above by not pulling back stale results to begin with.
- For every finding (Track A) or candidate (Track B1), compare its actual publish/event date (the finding's `date` field, or the candidate evidence's `date`) against `window_start`.
  - **Within the window:** log normally. This is what belongs in the digest's headline "what's new" section — a punctual update.
  - **Older than the window (real news, just discovered late):** still log it — append-only history means real information is never dropped just because it arrived late (see "Writing to the data file" below). But keep it out of the digest's headline list; if it's material enough to mention, put it in a clearly separate "discovered late" note carrying its actual original date, so the digest never implies something is fresher than it is.
- This gate applies to Track A findings and Track B1 candidates only. Track B2's weekly structural sources (conference abstracts, patent filings, etc.) refresh on their own slower cadence by design — applying a 24h window there would filter out almost everything B2 exists to catch.

## Throttling quiet umbrellas

Checking every umbrella every single day is wasteful once an umbrella has demonstrated it's genuinely quiet — most of a Daily scan's budget otherwise goes to companies with no news, over and over, forever. To cut that without losing real coverage:

- Every umbrella's `current_status` carries a `last_checked` date (see the schema), updated every time Track A checks it — whether or not anything new was found. This is separate from `last_updated`, which only changes when a real finding lands.
- Before checking an umbrella, compute days since `last_updated`. If it's been 21+ days with no new finding, and `last_checked` shows it was already checked within the last 2 days, **skip it this run** — check umbrellas like this every 3rd day instead of daily.
- The moment a skipped umbrella produces a new finding, it goes back to being checked daily. This throttle is for consistently quiet umbrellas, not a standing exemption.
- A missing `last_checked` (e.g. an umbrella seeded before this rule existed) means "never checked under this rule" — always check it, don't assume it's quiet.

## Track A — umbrella monitoring (daily)

For every existing "umbrella" (a tracked company/platform/asset — has a `canonical_name` and an `aliases` list: English name, Korean name, ticker, drug code, platform name, etc.) that isn't being skipped this run under the throttle above, search **once per alias**, never one blended query covering all aliases at once. A blended query is exactly how Korean-language hits get missed — the two languages compete for the same query and English results crowd out Hangul ones. Apply the search budget discipline above: breadth first, one query per alias, don't chase a quiet result with more phrasings.

Classify every finding into exactly one of these six types, and take the corresponding action:

| Type | Signal words | Action |
|---|---|---|
| Deal/partnership | "partners with", "licenses", "collaboration" | Append to `finding_history`; flag the partner org as a Track B candidate if it's not already a known umbrella |
| Financing/investor | "raises", "convertible bond", "capital increase", stock-move % | Append; update the cap-table note |
| Regulatory | NDA, IND, CHMP, PDUFA | Append; update `current_status.stage` |
| Trial/data readout | "topline", "Phase", % weight loss, PK data | Append; update `current_status.data_point` |
| Manufacturing/capacity | "plant", "facility", capacity multiplier | Append, lower priority |
| Market reaction | stock %, analyst note | Append, lowest priority — context only, never the sole basis for a status change |

A known company's deal can surface a brand-new partner organization. Log the deal itself under the known umbrella (that's Track A's job, since it was found via a known alias) — but the new partner org itself becomes a Track B candidate, not a footnote inside the known umbrella's history.

## Track B1 — daily wire skim (daily, cheap)

Skim fast wires (PR Newswire, BusinessWire, GlobeNewswire, general trade press) for LAI-adjacent terms that are **not tied to any known company name**: "long-acting injectable," "depot," "sustained-release," "microsphere," and similar. This is deliberately not company-scoped — a brand-new entrant's debut deal or data readout breaks here first, before it has any brand recognition to search for by name.

Anything found feeds the same candidate pipeline as Track B2 below (see Source tiering and Candidate pipeline).

## Track B2 — weekly structural sweep (weekly, heavier)

These sources don't refresh daily, so checking them daily would just re-read unchanged data — that's why this runs weekly instead:

- Full conference **accepted-abstract indices** for ADA, ASCO, AAN, ObesityWeek, JPM Healthcare Conference — the actual abstract index, not news coverage about the conference
- Patent filings: **KIPRIS** (Korea), USPTO/WIPO (global), filtered to sustained-release/depot CPC classes — patents often post before any press release exists
- The **KOSDAQ 기술특례상장** (tech-special listing) pipeline — a company entering this pipeline is a strong watch signal even with no other news yet
- clinicaltrials.gov **new-registration feed**, scanned by intervention/title text, not company name — a new entrant may have no brand recognition to search for
- University tech-transfer / spin-off announcements
- VC/deal databases for seed/Series A rounds tagged drug-delivery/LAI

### Candidate pipeline (applies to anything found by Track B1 or B2)

1. Extract the entity mention (org name, drug code, platform name).
2. **Fuzzy-match it against the existing alias table first.** This is the step that prevents duplicate umbrellas — e.g. recognizing a code name as an existing company's own asset rather than a new entrant. Do this before anything else in the pipeline.
3. If it matches an existing umbrella well enough to plausibly be the same entity, log it as a new finding under that umbrella (Track A style) instead of creating a candidate — don't queue something as "new" that fuzzy-matches strongly to something already tracked.
4. If no strong match: score it. A candidate needs a named entity **plus** a concrete technical claim (mechanism, drug code, trial phase) **plus** at least one Tier 1/2 source before it's worth surfacing. A bare name mention with no substance stays in a lower-priority watch queue, not the main candidate list — don't inflate thin signal into a promotable-looking candidate.
5. Write scored candidates to the pending list in the data file, with their evidence (source, snippet, link, date) and their fuzzy-match result against the closest existing umbrella (even a non-match is useful context for the human reviewing it).
6. Stop there. Do not create, merge, or discard anything — see the boundary rule at the top of this file.

## Track B3 — candidate follow-up and escalation (every run)

Tracks B1 and B2 find new entities. B3 is what makes that finding mean something later: it re-checks everything already sitting in `candidates.json`, accumulates new evidence onto it, and escalates a candidate that has earned umbrella status into a decision the admin can't miss. Without this track the discovery half of the pipeline is a write-only log — a candidate gets reported once on the day it's found and then silently ages forever, which is exactly the failure this section exists to stop.

B3 never creates, merges, rejects or snoozes anything. Its entire output is updated evidence, an updated `status` on the ladder, and a written `promotion_bar`. The admin still performs every promotion by hand — see the boundary rule at the top of this file. What changes is that the candidate now arrives at that decision with a complete case attached, instead of the admin having to rebuild it from a two-week-old snippet.

### The promotion bar — four conditions, all required

A candidate is `ready_for_promotion` when all four are cleared **and** it isn't a merge case (below). These are deliberately the same standards used elsewhere in this file, not a new parallel rubric:

1. **`named_entity`** — a specific named organization, platform or asset, not a category or an unnamed "a Korean biotech." Already required to exist as a candidate at all.
2. **`technical_claim`** — a concrete mechanism, drug code, or trial phase. Also already required at creation.
3. **`confirmed_source`** — meets the same confirmation rule as a "confirmed" finding: one Tier 1 source, or two genuinely independent Tier 2 sources. Two outlets re-hosting one press release is still one source.
4. **`second_dated_event`** — evidence spanning **at least two distinct dates**, i.e. the entity has shown up more than once in the world rather than in one announcement and then nothing. A single event that is itself stage-bearing (an IND clearance, a trial registration, a regulatory filing, an approval) satisfies this on its own, because that's a verifiable state change rather than an announcement.

Condition 4 is the one that actually does the work of this bar. Conditions 1–3 are satisfiable by one good press release, and a single press release is how a company that never ships anything looks identical to one that's real. Requiring a second dated event, or one verifiable state change, is what separates them without any judgment call about how exciting the news sounded.

**Merge case.** If `fuzzy_match.score` is **0.55 or higher**, the candidate is more likely the same entity as an existing umbrella than a new one. Never escalate it to `ready_for_promotion` — leave `status` as `pending`, and write the suspected duplicate plainly in `promotion_bar.evidence` (e.g. `"Likely the same program as mapi-pharma-semaglutide (0.55) — needs a merge decision, not a new umbrella."`). Merging is an admin action exactly like promoting.

**Write `promotion_bar` on every check**, including a check where nothing moved. `cleared` and `unmet` together must always name all four condition keys, and `evidence` is one sentence saying what specifically moved or is still missing. If `status` changes, `evidence` is mandatory, not optional — the same rule as `stage_evidence` on an umbrella.

### Cheap daily pass (free date math, at most 2 searches)

Runs on every Daily scan, after Track A and B1. No re-search of the whole queue — that's the weekly pass's job.

1. **Age every unresolved candidate** (`watch`, `pending`, `ready_for_promotion`, `stalled`). This is pure date math on `created_date`, the newest `evidence.date`, and `follow_up.last_checked` — no searches, so it always runs in full even on a budget-exhausted run.
2. **Apply the stall rule:** a `pending` candidate that is 30+ days past `created_date`, has `follow_up.checks_run` of 3 or more, and has had no new evidence appended since it was created, becomes `stalled`. Write `promotion_bar.evidence` saying so, in the form of a recommendation: `"No new evidence in 34 days across 4 checks — recommend reject or snooze."` A stalled candidate is a cleanup proposal for the admin, not a verdict, and it is never deleted.
3. **Re-search at most 2 candidates** — `near_bar` ones first (they're one condition from escalating, so a single search can resolve them), then any `ready_for_promotion` candidate whose case hasn't been refreshed in 7+ days. One query each, on the candidate's most distinctive alias, under the same budget discipline as Track A. Skip this step entirely if Track A didn't finish its first pass this run.
4. **Update `follow_up`** on anything you actually re-searched: bump `checks_run`, set `last_checked` to today.

### Weekly deep pass (one query per pending candidate)

Runs on every Weekly sweep, after Track B2. Work the queue in this order, so the most promotable candidates are re-checked first if the budget runs short: `ready_for_promotion`, then `near_bar` `pending`, then the rest of `pending`, then `watch` and `stalled` (these two only on every 4th sweep — roughly monthly).

For each candidate in scope:

1. One query on its most distinctive alias — drug code or platform name over the generic company name, and never a blended multi-alias query. Two queries maximum, same as Track A.
2. **Append** anything new to `evidence`. Never rewrite an existing entry (the schema's append-only rule).
3. **Re-run the fuzzy match against the current alias table**, not the score stored at creation. The registry has grown since — a candidate that was genuinely new in September can turn out to be a program an umbrella added later, and this is the step that catches it instead of letting a duplicate get promoted.
4. **Re-score the four conditions**, rewrite `promotion_bar`, and move `status` on the ladder if it changed. Set or clear `near_bar`.
5. A candidate whose new evidence shows it belongs to an existing umbrella goes the merge route in step 3 above — `pending` with the duplicate named, never a silent finding written into that umbrella's file. Track B only ever writes `candidates.json`; that lane rule is not suspended just because the match is obvious.

### Escalation is a standing obligation, not a one-time report

A `ready_for_promotion` candidate is the loudest thing this skill can produce, and it stays loud until the admin resolves it:

- It leads the email digest's `leadIn` **every run**, on the day it escalates and on every run after, until its `resolution` is non-null. This is the one case that outranks the normal headline-picking order below — a candidate ready for promotion beats a regulatory filing or a trial readout, because the filing is news the reader can read at leisure while the escalation is blocked on a decision only they can make.
- It appears in the digest's `candidates` array every run too, not only on the run that created it. Re-appearing is the point: an escalation that was shown once and then went quiet is indistinguishable from one that was handled. The renderer's generated subject line will count it as a "new candidate" on those later runs — that's a known wrinkle of frozen infrastructure, and the `leadIn` you write is what carries the real message. Don't edit the renderer to fix it.
- It sorts to the top of the dashboard's candidate queue, and the app counts escalations separately from the plain pending count.

Everything else on the ladder keeps the existing behavior: a newly created candidate appears in that run's digest once, and after that it lives on the dashboard until it's resolved.

## Source tiering and the confirmation rule

Apply this consistently — it's what keeps "confirmed" meaning something over time instead of degrading into "confirmed enough":

- **Tier 1 (trust directly):** company IR/press pages, FDA.gov, EMA, clinicaltrials.gov, and DART (전자공시시스템, Korea's mandatory disclosure system). DART matters especially for KOSDAQ/KOSPI-listed Korean companies — material news there often lands before press picks it up.
- **Tier 2 (credible, but corroborate):** named trade press with bylines (Korea Biomedical Review, Fierce Biotech, Endpoints, BioSpace) and PR Newswire/BusinessWire/GlobeNewswire (these three mostly re-host the actual company release, so treat them as near-Tier-1).
- **Tier 3 (discovery only, never confirmation):** aggregator blogs, generic pipeline-tracker content-farm sites. Fine for spotting a name you haven't seen before; never sufficient to log something as confirmed.

**Rule:** log a material claim as "confirmed" only with either one Tier 1 source, or two *independent* Tier 2 sources (not two articles both quoting the same PR Newswire release — that's one source wearing two hats). Anything short of that gets logged as "unverified," visibly, not silently rounded up to confirmed.

## Stage scoring — how a finding may change `current_status.stage_label`

This section exists because the dashboard used to *infer* a program's development stage from the free-text `stage` description with a regex parser, and that parser was wrong four separate times in one review — roman numerals swallowed into the wrong phase, "IND submitted" not recognized as equivalent to "IND filed," a combined Phase I/II design counted as an active Phase 2 the moment it started recruiting. A parser guessing at prose will always have another edge case. The fix isn't a better parser — it's that **you assign the stage directly, the same way you already assign `technology_family` or `finding.type`, instead of leaving it to be reverse-engineered later.**

`current_status.stage_label` must always be exactly one of: `Research`, `Preclinical`, `IND filed`, `Phase 1`, `Phase 2`, `Phase 3`, `Filed / review`, `Approved / marketed`. `scripts/build.mjs` fails the build if it's missing or isn't one of these eight — this is a hard stop, not a style preference. `stage` stays as free-text color; `stage_label` is what the dashboard actually sorts, colors, and ranks programs by.

**When you may advance `stage_label` to a higher bucket:**

- Only when the source **explicitly and unambiguously states the current status** in a way that maps cleanly onto one of the eight buckets — never infer it from adjacent or contextual language, and never advance on a source's forward-looking language ("targeted," "planned," "expects to," "intends to," "aims to") no matter how confident it sounds.
- Only with the **same Tier 1/2 confirmation bar as a "confirmed" finding** (one Tier 1 source, or two independent Tier 2 sources). A Tier 3 or single-unverified-Tier-2 source can update the free-text `stage` description, but must never move `stage_label` forward on its own.
- **"IND filed" vs "Phase 1":** an IND submitted or filed but not yet cleared, or cleared but dosing not yet begun, is `IND filed` — not `Phase 1`. Only move to `Phase 1` once the source explicitly says dosing or enrollment has actually started.
- **Combined-phase designs (e.g. "Phase I/IIa"):** default to the *lower* bucket (`Phase 1`) even if the combined protocol is actively recruiting. Only advance to `Phase 2` once the source explicitly shows the higher portion itself is active — an expansion cohort dosing, a dose-expansion stage started, not merely that the joint-phase trial exists or is enrolling.
- If a finding's evidence is genuinely ambiguous against these rules, **do not guess** — leave `stage_label` at its current value, update `stage`'s prose if useful, and add a one-line note under `stage_evidence` flagging the ambiguity for the admin instead of silently picking a bucket.

**Demotions** (discontinued, paused, failed, clinical hold) need the same confirmation bar as an advance, and there's no dedicated bucket for "discontinued" in the eight values yet — keep the last accurate `stage_label`, but make the discontinuation unmistakable in `stage`'s text and flag it for the admin rather than leaving it to blend in as if the program were still progressing normally.

**Every time you change `stage_label`, write `stage_evidence`** — one sentence, in your own words, naming the specific fact from the source that justifies the new bucket (e.g. `"Phase 1 IND cleared and first patient dosed per the Aug 30 MFDS clearance letter."`). This is what lets a future review (human or otherwise) check your work without re-deriving it from scratch. Never invent a ninth value if nothing seems to fit cleanly — that has never actually happened across the 37 tracked umbrellas; if it ever does, keep the closest-fitting existing value and flag the mismatch instead of coining a new one.

## Calendar-aware bursts

Weight extra search effort around known disclosure clusters, since that's where yield concentrates: ADA (June), ObesityWeek (November), JPM Healthcare Conference (January), ASCO (June), AAN (April). Daily cadence shouldn't structurally miss anything, but it's worth spending more of the search budget in these windows than in a quiet month.

## QC strategy — the goldilocks tiers

This is deliberately tiered by cost, because a daily research routine cannot afford to re-verify everything every time, and a tracker with no human QC layer cannot afford to verify nothing. Match the tier to the mode you're running (see the mode table above) — don't do more than the mode calls for, and don't skip what it calls for either.

**Tier 0 — every run, effectively free.** Before writing anything: is the output well-formed (valid against the data file's structure)? And for each finding written *in this run*, does it actually say what the source you just read said — a quick self-check against material already in context, not a re-fetch. This costs almost nothing because you already read the source this run.

**Tier 1 — every run, cheap.** Never re-audit the whole registry in a daily or weekly run — QC scope is strictly bounded to what this run itself touched. Staleness is handled as free date math only: compute days-since-last-finding per umbrella and surface it as a flag. Do not spend run budget *investigating* why an umbrella has gone quiet — that's a judgment call for the human looking at the dashboard, not a task to chase down automatically.

**Tier 2 — weekly, folded into the Weekly sweep mode, not a separate run.** Re-verify a small random sample (5–10) of *existing* findings already in the registry against their cited source — this is how citation rot and old mistakes get caught statistically over time without ever paying to check everything at once. Also run a fast fuzzy-dedup sweep across the whole alias table — this is closer to string-matching than research, so it's cheap even at full-registry scope.

**Tier 3 — quarterly or explicit request only. Never self-triggered.** A full-registry re-verification of every umbrella's `current_status` against a fresh source check. This is the expensive tier — genuinely costly at full scope — so the Daily scan and Weekly sweep modes must never invoke it on their own. Only run it when the mode table above says Full audit, i.e. someone asked for it directly.

## Writing to the data file

The schema is locked — read `references/data-schema.md` before writing anything, and follow it exactly. It defines the file layout (`data/umbrellas/<id>.json` per entity, plus `candidates.json` and `meta.json`), the controlled vocabularies for every enum field, and the deterministic ID-generation rules for findings and candidates.

Two things matter more than the field names themselves, because they're what actually prevents drift over months of unattended runs:

- **Never invent a variant of a controlled value.** If `technology_family` doesn't cleanly fit one of the listed values, use `other` and add a one-line note — don't coin a new tag that reads more naturally in the moment. A schema only prevents naming drift if every run treats it as fixed, not as a starting suggestion.
- **Never write outside your own file's lane.** Track A only ever touches the specific umbrella files it found findings for. Track B, follow-up included, only ever touches `candidates.json` — B3 updating a candidate's evidence never also writes that evidence into an umbrella file, however strong the match looks. Don't "helpfully" fix something you notice in an unrelated umbrella file while you're in there — flag it instead, or handle it under the mode that owns it.

Update `meta.json`'s `last_run` and `source_health` at the end of every run, even a run that found nothing — an absent update is indistinguishable from a job that silently failed, which is exactly the failure mode this field exists to catch. Also record coverage: how many umbrellas were actually checked this run versus skipped (throttled quiet ones, or ones never reached because the search budget ran out) — a run that only covered 2 of 37 umbrellas needs to be visible as incomplete, not indistinguishable from a full run that just happened to find little. Record follow-up coverage the same way, under `coverage.candidate_follow_up` — how many unresolved candidates exist, how many Track B3 actually re-checked this run, and how many it escalated or stalled. A run that escalated nothing because it re-checked nothing must be distinguishable from a run that re-checked the whole queue and found nothing ready. If any domain returned `EGRESS_BLOCKED` this run, log it under `source_health` with status `blocked` so a pattern of unreachable sources shows up over time instead of silently degrading source quality run after run.

Commit to the GitHub repo with a clear message describing what changed and why (e.g. "Track A: 2 new findings for peptron-pt403, inventagelab-ivl3021" or "Weekly sweep: 3 new candidates"). Never touch the app's interface/UI code from this skill — if a run seems to require a UI change, stop and flag it instead of making it.

## Email digest

After a Daily scan or Weekly sweep, draft one bundled digest of what changed this run as a **Gmail draft**, not a sent email. This mirrors the promotion boundary above: drafting is this skill's job, sending is a decision only the admin makes, every time — there is no standing authorization to send mail unattended. If a future admin decision changes this policy, it will be written here explicitly; until then, draft-only is the rule, not a placeholder.

**Don't hand-write the HTML, and don't touch the template file.** `email/templates/daily-digest.html` and `scripts/render-email.mjs` are frozen infrastructure, exactly like the dashboard's `index.html`/`src/`/`scripts/build.mjs` — a routine run changes data, never design. Never edit the rendered HTML by hand, never improvise your own markup, and never modify the template file itself from this skill, even if the output looks like it could use a tweak — that's a deliberate, reviewed, one-off change the admin makes in conversation, not something a daily/weekly run does on its own. Your job every run is only to supply the input data, run the script unmodified, and hand its output to the Gmail draft tool unmodified.

**1. Build the input payload** as a JSON object (write it to a scratch path, e.g. `email/draft-input.json` — this file is gitignored, it's per-run scratch, not registry data):

```json
{
  "runDate": "2026-09-04",
  "leadIn": "One short sentence summarizing the run — findings + late items + candidates, in your own words.",
  "findings": [ /* one entry per finding inside the freshness window this run */ ],
  "lateItems": [ /* real findings logged this run but dated outside the freshness window (see above) */ ],
  "candidates": [ /* new Track B1/B2 candidates from this run, plus every unresolved ready_for_promotion candidate (see Track B3) */ ]
}
```

**Writing the `leadIn`: this is a headline, not a summary.** Its job is to catch attention and earn the scroll down to the full list — not to account for everything that happened this run. Keep it short, one sentence.

The reader is not you: they don't know what an "umbrella" is, don't care that this was a "sweep" or a "wire skim," and a raw coverage fraction like "37/37" or "5 umbrellas due for a check" reads as an internal ops metric, not news. Those are all terms this skill uses for its *own* bookkeeping (Track A/B mechanics, `meta.json` coverage) — they belong in the commit message and `source_health`, never in the digest.

**When there's more than one finding, don't try to fold all of them into the sentence.** Pick the single most compelling one (two, at most, and only if both are genuinely strong) and lead with that — the rest are already listed in full right below, so the headline isn't the reader's only chance to see them. Trying to cram every item in produces a run-on that reads like a status report, not a headline. Judge "most compelling" the way a news editor would: a `ready_for_promotion` candidate outranks everything (see Track B3 — it's the only item in the digest that is blocked on the reader's decision rather than just informing them); then a regulatory filing or trial readout; then a new company entering the space, which beats a routine update to one already tracked; a plain new candidate is worth leading with only when there's no real finding that outranks it.

Write it the way you'd tell a colleague the one thing worth knowing today, and only mention that a run was quiet in plain terms ("no new developments today") without exposing the count of things checked. If nothing at all happened, a short plain sentence saying so is fine — don't manufacture drama, but don't narrate the scan process either.

**Every entry in all three arrays uses the exact same shape** — the digest deliberately gives every item identical visual weight, not one highlighted story with extra sections and the rest as footnotes:

| Field | Source | Direct or synthesized |
|---|---|---|
| `headline` | The umbrella's `canonical_name` (findings/late items) or the candidate's `detected_name` | Direct |
| `date` | The finding's own `date` (findings/late items) or the candidate's most recent evidence `date` | Direct |
| `sourceUrl`, `sourceName` | The finding's or candidate evidence's `source` object | Direct |
| `summary` | — | **Synthesized, but only lightly.** One short 1–2 sentence summary of what happened and why it's worth noting — not a verbatim dump of the finding's full `summary` field, and not split across separate "why/impact/watch next" fields. `**bold**` the single most important clause if one stands out; don't force it. |

There is no `type`, `confidence`, `stageChange`, or evidence-tier badge in the digest — those live in the registry and the dashboard, not here. Keep `summary` genuinely short; if you find yourself writing more than two sentences, that belongs in the umbrella's `finding_history`, not the digest row.

**2. Run the renderer:**

```bash
node scripts/render-email.mjs email/draft-input.json email/draft-output.json
```

If there's nothing in any of the three arrays, the script prints a message and writes no output file — that's the signal to skip drafting an email entirely this run, not an error to work around.

**3. Read `email/draft-output.json`** — it has exactly `{ "subject": "...", "preheader": "...", "html": "..." }`. Pass `subject` and `html` to the Gmail draft tool as-is. Don't edit, re-wrap, or re-escape either value — the script already handles escaping and the light `**bold**` markup.

## Hard boundaries, recap

- Never promote, merge, reject, or snooze a candidate — proposal only, always. Escalating one to `ready_for_promotion` is the ceiling, and it is not a promotion.
- Never let an unresolved candidate go un-aged on a run — the date math is free and always runs, even when the search budget is gone.
- Never escalate a candidate with `fuzzy_match.score` 0.55 or higher — that's a merge decision for the admin, not a new umbrella.
- Never change a candidate's `status` without writing `promotion_bar.evidence` explaining why.
- Never drop a `ready_for_promotion` candidate out of the digest until its `resolution` is non-null.
- Never send the digest email — draft it and stop, every run.
- Never run the Tier 3 full audit automatically from a Daily scan or Weekly sweep.
- Never blend multiple aliases into one search query.
- Never fire more than two query variants for a single alias.
- Never retry a domain that returned `EGRESS_BLOCKED` this run.
- Never do a deep multi-query dive on any umbrella before every umbrella has had its first-pass query — breadth before depth.
- Never edit the app's interface/UI code, or the email digest template/renderer.
- Never log a claim as "confirmed" without meeting the Tier 1/Tier 2 source rule.
- Never advance `current_status.stage_label` without meeting that same Tier 1/Tier 2 bar, without the source explicitly (not inferentially) stating the current status, or without writing `stage_evidence` explaining why.
- Never leave `stage_label` unset or set it to anything outside the eight controlled values — the build fails on this by design; don't work around it, fix the value.
