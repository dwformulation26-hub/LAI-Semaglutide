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
| **Weekly sweep** | "run weekly LAI sweep", "Sunday LAI sweep" | Track B2 + Track B3 (deep pass) + QC Tier 2, plus Track A/B1 whenever `last_run.daily_scan` is more than 12 hours old — true on every scheduled Sunday run, since no daily scan runs on weekends |
| **Full audit** | Only when explicitly requested — "run a full LAI audit/re-verification" | QC Tier 3 only. Never self-trigger this — see QC section |

If it's ambiguous which mode was meant, default to **Daily scan** — it's the cheapest and safest default.

## Schedule and time zone — everything is KST

**Automated schedule (as of 2026-09-14), stated in KST, the only time zone this tracker reasons in:**

| Routine | Fires (KST) | Cron as stored (UTC) |
|---|---|---|
| LAI Tracker - Daily Scan | Monday to Friday, 06:00 KST | `0 21 * * 0-4` |
| LAI Tracker - Weekly Sweep | Sunday, 09:00 KST | `0 0 * * 0` |

Nothing runs on Saturday. The routine scheduler only accepts cron in UTC, so the stored expressions are translations of the KST times above, and that translation is the only place UTC appears. The daily one crosses midnight: 06:00 KST Monday is 21:00 UTC Sunday, which is why its day mask is `0-4` and not `1-5` — getting that mask wrong by one is the easy mistake. Both routines can be inspected and edited with the `RemoteTrigger` tool, and their exact prompts are kept in [references/routine-prompts.md](references/routine-prompts.md), which must be updated whenever a routine changes.

**Every date and time this skill reads, compares or writes is KST (Asia/Seoul, UTC+9, no daylight saving):**

- Start every run with `TZ=Asia/Seoul date '+%Y-%m-%dT%H:%M:%S+09:00'` and use that one value as "now" for the whole run. Never estimate, round or invent a run time: the next run's freshness window is computed from it, and a timestamp six hours off silently narrows or widens that window.
- **Timestamps** (`meta.json` only) are ISO 8601 with the KST offset, e.g. `2026-09-15T06:04:12+09:00`. Values written before 2026-09-14 end in `Z` (UTC); they are still correct instants, so compare timestamps as instants, never as strings or by their date prefix.
- **Run-bookkeeping dates** — `current_status.last_checked`, `current_status.last_updated`, a candidate's `created_date` and `follow_up.last_checked`, and the digest's `runDate` — are the KST calendar date of the run, from `TZ=Asia/Seoul date +%F`. The cloud sandbox clock is UTC, so a bare `date` at 06:00 KST returns *yesterday*; always set `TZ`.
- **Day counts** — the quiet-umbrella throttle, the stall rule's 30+ days, and the digest coverage strip's `daysSinceCheck` and `daysSinceNews` — are differences between KST calendar dates.
- **Source event dates** (`finding.date`, a candidate's `evidence.date`, patent priority dates) are the date as the source publishes it. Never shift them by a time zone: they record when something happened in the world, not when a run saw it.

**How the week is covered.** The Sunday sweep is the only run between Friday 06:00 and Monday 06:00, so it runs Track A and B1 itself and writes `last_run.daily_scan` as well as `last_run.weekly_sweep`. That splits the weekend cleanly: Sunday's window reaches back to Friday's daily scan (about 51 hours, covering Friday, Saturday and Sunday morning), and Monday's reaches back to Sunday's sweep (about 21 hours). A weekly sweep started by hand within 12 hours of a daily scan skips Track A/B1 rather than repeating them.

## Search budget discipline

A real run hit its session search cap partway through a Daily scan, covering only 2 of 37 umbrellas before running out — a good chunk of that budget went to redundant re-phrasings of the same query for a single umbrella instead of covering everyone. These rules exist because that happened, not as theory:

- **Breadth before depth.** On a Daily scan, do one pass across every umbrella first — one query per umbrella using its single most distinctive alias (usually the drug code or ticker, not the generic company name) — before spending any further budget going deeper on the ones that showed something promising. This guarantees every umbrella gets at least one check even if the budget runs out later, instead of exhausting the budget on the first few while the rest get zero attention.
- **Cap the aliases queried per record per run, and order them by distinctiveness.** Query the drug code and ticker first, the platform name next, and generic company or molecule names last. Naming four molecule classes adds low-specificity terms that many records share, and without a cap those quietly eat the breadth pass. The alias table is 245 strings across 41 records, so an uncapped full pass is 245 searches.
- **One query per alias, two absolute max.** If the first query for an alias comes back with nothing new, move on — don't try three more phrasings hunting for something. A quiet result is a valid result, not a reason to keep searching.
- **Don't retry a domain that just told you no.** If a fetch returns `EGRESS_BLOCKED` or a similar hard error, don't try that same domain again this run — note it under `source_health` (see below) and move on. Retrying a blocked domain burns a tool call for a result you already know.
- **Never fetch a host already recorded as blocked.** Before the first WebFetch of a run, read `meta.json`'s `source_health` and list every host whose status is `blocked` or `search_only`. Don't WebFetch those hosts this run; reach their content through search. Any other host gets at most one fetch attempt per run, and a refusal adds it to the list. The 2026-09-13 sweep spent about 20 tool calls re-fetching hosts already on that list.
- **Run every track in this one session.** Don't use the Agent tool or spawn helper agents. Each helper re-reads this skill and the data files and none of them sees the blocked list, so the seven helpers the 2026-09-13 sweep started multiplied its cost and repeated the blocked fetches.
- **Track B1's wire skim is a fixed, bounded pass** — a handful of term-based searches, not a per-umbrella sweep. Don't let it balloon into checking specific companies; that's Track A's job.
- **Track B3's daily pass spends at most 2 searches, and its weekly pass one query per pending candidate.** Follow-up must never crowd out Track A's first-pass coverage of every due umbrella — if budget is tight, the umbrellas come first and the follow-up queue waits for the weekly deep pass. Date math costs nothing and always runs.

## Freshness window — Track A and Track B1 only

The whole point of a *daily* scan is that the dashboard and the email digest always read as current — a finding that's actually a week old, surfacing today as if it just happened, makes the tracker feel unpunctual even though the information itself is accurate. This section draws that line consistently; it is not a license to skip real news that arrives late.

**Window definition:** `window_start` = the timestamp of the last successful `daily_scan` run, from `meta.json.last_run.daily_scan`. If that's null (first run, or the last run never completed), fall back to `last_run.weekly_sweep` if it's more recent than 24h ago; if neither exists, default `window_start` to 24 hours before now. Letting the window stretch back to the last real run — instead of a hard 24h cutoff — means a skipped day or a long weekend widens the net instead of silently losing whatever aged past exactly 24h.

**The weekend sits inside the Sunday and Monday windows, and this is the mechanism that makes it work.** Because `window_start` is the last real run rather than a fixed 24 hours back, Sunday's sweep reaches back to Friday's daily scan and Monday's daily scan reaches back to Sunday's sweep (see "How the week is covered" above). Three consequences, none of them anomalies to correct for:

- **Friday, Saturday and Sunday-morning news is inside Sunday's window**, so it is a normal headline finding in Sunday's digest. It does not belong in the discovered-late note — that is for genuinely old material, not for news the schedule chose not to look at yet.
- **Sunday throttles the quiet records Friday checked, and Monday picks them up.** Their weekend news still counts as headline on Monday because a throttled record's window starts at its own last check (see "Applying it" below).
- **Budget accordingly.** On Sunday, Track A/B1 share one search budget with B2, B3's deep pass and QC Tier 2. Do the breadth-first Track A pass before any B2 query, and record coverage honestly in `meta.json` if the budget runs out.

Use the search tool's recency filter to match the actual window, not a reflexive "past day" — on a Sunday, "past day" silently discards most of what the run exists to catch.

**Applying it:**
- When searching, prefer the search tool's own recency filter scoped to roughly this window where available (a Sunday needs "past week", not "past day" — see the weekend note above) — this also helps the search-budget discipline above by not pulling back stale results to begin with.
- For every finding (Track A) or candidate (Track B1), compare its actual publish/event date (the finding's `date` field, or the candidate evidence's `date`) against `window_start`.
- **A throttled record's window starts at its own last check.** The quiet-umbrella throttle means some records were not queried on the previous run, so news about them from the skipped days was never seen. For a Track A record, compare against the earlier of `window_start` and 00:00 KST on that record's previous `last_checked` date. Without this, a record checked Friday, throttled Sunday and checked Monday would push its Saturday news into the discovered-late note.
  - **Within the window:** log normally. This is what belongs in the digest's headline "what's new" section — a punctual update.
  - **Older than the window (real news, just discovered late):** still log it — append-only history means real information is never dropped just because it arrived late (see "Writing to the data file" below). But keep it out of the digest's headline list; if it's material enough to mention, put it in a clearly separate "discovered late" note carrying its actual original date, so the digest never implies something is fresher than it is.
- This gate applies to Track A findings and Track B1 candidates only. Track B2's weekly structural sources (conference abstracts, patent filings, etc.) refresh on their own slower cadence by design — applying a 24h window there would filter out almost everything B2 exists to catch.

## Throttling quiet umbrellas

Checking every umbrella every single day is wasteful once an umbrella has demonstrated it's genuinely quiet — most of a Daily scan's budget otherwise goes to companies with no news, over and over, forever. To cut that without losing real coverage:

- Every umbrella's `current_status` carries a `last_checked` date (see the schema), updated every time Track A checks it — whether or not anything new was found. This is separate from `last_updated`, which only changes when a real finding lands.
- Before checking an umbrella, compute days since `last_updated`. If it's been 21+ days with no new finding, and `last_checked` is no more than 2 KST calendar days before today (a record checked Monday is skipped Tuesday and Wednesday and checked again Thursday), **skip it this run** — check umbrellas like this every 3rd day instead of daily.
- The moment a skipped umbrella produces a new finding, it goes back to being checked daily. This throttle is for consistently quiet umbrellas, not a standing exemption.
- A missing `last_checked` (e.g. an umbrella seeded before this rule existed) means "never checked under this rule" — always check it, don't assume it's quiet.

## Track A — umbrella monitoring (daily)

For every existing "umbrella" (a tracked company/platform/asset — has a `canonical_name` and an `aliases` list: English name, Korean name, ticker, drug code, platform name, etc.) that isn't being skipped this run under the throttle above, search **once per alias**, never one blended query covering all aliases at once. A blended query is exactly how Korean-language hits get missed — the two languages compete for the same query and English results crowd out Hangul ones. Apply the search budget discipline above: breadth first, one query per alias, don't chase a quiet result with more phrasings.

**Log only news about the record's long-acting assets.** The tracker covers long-acting technology: depots, implants, microspheres, in-situ gels and molecules engineered for monthly or less frequent dosing. Oral, daily and weekly programs are out of scope even when they share the record's molecule or company, and so are sales figures, share-price moves and analyst notes. Don't log them as findings; if one is material context, give it one line in `coverage.daily_scan.notes`. Patents on long-acting formulations stay in scope (see "Primary sources available to every track").

Classify every finding into exactly one of these types, and take the corresponding action:

| Type | Signal words | Action |
|---|---|---|
| Deal/partnership | "partners with", "licenses", "collaboration" | Append to `finding_history`; flag the partner org as a Track B candidate if it's not already a known umbrella |
| Financing/investor | "raises", "convertible bond", "capital increase" | Append; update the cap-table note. A share-price move is not a financing event |
| Regulatory | NDA, IND, CHMP, PDUFA | Append; update `current_status.stage` |
| Trial/data readout | "topline", "Phase", % weight loss, PK data | Append; update `current_status.data_point` |
| Manufacturing/capacity | "plant", "facility", capacity multiplier | Append, lower priority |
| Market reaction | stock %, analyst note, quarterly sales | **Not logged by runs** (out of scope since 2026-09-14). The type stays in the schema for findings already recorded |

A known company's deal can surface a brand-new partner organization. Log the deal itself under the known umbrella (that's Track A's job, since it was found via a known alias) — but the new partner org itself becomes a Track B candidate, not a footnote inside the known umbrella's history.

## Track B1 — daily wire skim (daily, cheap)

Skim fast wires (PR Newswire, BusinessWire, GlobeNewswire, general trade press) for LAI-adjacent terms that are **not tied to any known company name**. This is deliberately not company-scoped — a brand-new entrant's debut deal or data readout breaks here first, before it has any brand recognition to search for by name.

**Programs surface under development codes before they surface under molecule names.** Every semaglutide LAI program on this tracker was first reported by its code — PT403, GB-7001, AUL009, IVL3021, SYH9017, CAM2056, NPM-139 — while a query for "semaglutide long-acting" mostly returns market commentary instead of the article that names the code. A skim that only searches generic molecule names misses exactly the programs it exists to find, and the admin's own manual searches have confirmed that gap. So B1 has three fixed parts, all driven by [references/class-watchlist.md](references/class-watchlist.md):

1. **Class queries (fixed, every run).** Run the watchlist's daily query rows exactly as written, one per search: English and Korean rows for each of the four named molecules, the once-monthly multi-agonist rows for `other_incretin`, and the cross-class rows. They are phrased around dosing interval and formulation ("once-monthly formulation," 월 1회, 개량신약, 미립구) because that is how these programs are actually reported. In the 2026-09-14 gap test, "long-acting depot news" phrasing returned no programs, and neither did a Korean spelling the trade press doesn't use. Never improvise a spelling: 터제파타이드 and 티르제파타이드 are the same molecule but return different result sets. The watchlist's Sunday-only rows (alternate spellings, Chinese, conference abstracts) belong to the Sunday sweep's Track B2.
2. **Code harvest (every result, no extra searches).** Read every result title and snippet from parts 1 and 3 (a code query often names the same company's sibling codes: querying AUL016 is how AUL018 was found). Look for development codes, meaning a letter prefix followed by digits with or without a hyphen or space (`GB-7001`, `IVL3024`, `HRS9531`, `SYH 9017`), and for product or platform names that appear in the same sentence as a class term, a parent-molecule identifier from the watchlist, or an LAI qualifier. Resolve each one: a parent-molecule identifier (the originator's own code, INN or brand for the molecule, listed in the watchlist) is not a new program, so ignore it; a code already in the alias table or in an unresolved candidate's `detected_aliases` is already tracked; anything else is **unknown**. Normalize before comparing — case, hyphens and spaces don't make a code new (`GB7001` is `GB-7001`).
3. **Code queries (bounded).** Query unknown codes one at a time, at most 3 per run, and feed each through the candidate pipeline. An unknown code that co-occurs with a class term and an LAI qualifier but lacks a Tier 1/2 source becomes a `watch` candidate carrying the code in `detected_aliases`, so Track B3 keeps following it instead of it being forgotten. Then query up to 4 rows from the watchlist's rotation list, using each row's query exactly, resuming after the row whose `key` is stored in `coverage.daily_scan.watchlist_cursor` and wrapping at the end; the Sunday sweep queries the whole list.

Part 3 never outranks Track A's breadth pass. Record what the run did under `coverage.daily_scan`: `codes_harvested`, `codes_unknown`, `codes_queried`, and the updated `watchlist_cursor` (the `key` of the last rotation row queried). Runs never edit the watchlist file itself — a code worth adding permanently is proposed in the run report, and the admin adds it.

Anything found feeds the same candidate pipeline as Track B2 below (see Source tiering and Candidate pipeline).

## Primary sources available to every track

**clinicaltrials.gov and Google Patents are not B2-only.** Both are primary documents that routinely predate any press release, so restricting them to the Sunday sweep means finding things up to six days late. Track A may pair a due record's most distinctive alias with either source as one of its capped queries; Track B1 may query them by term with no company name attached; B2 continues its deeper sweep.

**Reach them through domain-scoped search, not direct fetch.** Both domains are blocked by the network policy — the gateway answers 403 to CONNECT — while search returns their content fine. A direct fetch is a bonus where the environment allows it and must never be the only route tried. Record them under `source_health` as reachable-via-search rather than flatly blocked, so a long blocked list does not read as a degrading tracker when it is working.

**They carry different kinds of fact, so they get different permissions:**

- **clinicaltrials.gov may advance `stage_label`.** It states recruitment status explicitly, which is what the stage rules require. The existing caution still applies: a study registered as not-yet-recruiting is `IND filed`, not `Phase 1`.
- **Google Patents may never advance `stage_label`.** A filing is intent and IP position, not clinical progress. It can establish a candidate, support a `molecule_class`, and evidence a `technology_family`, but it cannot move a program forward.
- **Patents carry their priority date, not their publication date.** An application publishes roughly eighteen months after priority, so a filing surfacing today describes work from a year and a half ago. Log it with the real priority date, which puts it outside the freshness window and into the digest's discovered-late note rather than the headline.

## Track B2 — weekly structural sweep (weekly, heavier)

These sources don't refresh daily, so checking them daily would just re-read unchanged data — that's why this runs weekly instead:

- Full conference **accepted-abstract indices** for ADA, EASD, ObesityWeek, ASCO, AAN, JPM Healthcare Conference — the actual abstract index, not news coverage about the conference
- Patent filings: **KIPRIS** (Korea), USPTO/WIPO (global), filtered to sustained-release/depot CPC classes — patents often post before any press release exists. Also one Google Patents query per named molecule, paired with a depot or sustained-release term
- **Every row of the watchlist's rotation list**, one query each — the full rotation the daily scan only samples
- **The watchlist's Sunday-only query rows** — alternate Korean spellings, Chinese and conference-abstract rows
- **Code harvest applies to every B2 result**, exactly as in Track B1 part 2, and unknown codes go through the same bounded resolution
- The **KOSDAQ 기술특례상장** (tech-special listing) pipeline — a company entering this pipeline is a strong watch signal even with no other news yet
- clinicaltrials.gov **new-registration feed**, scanned by intervention/title text, not company name — a new entrant may have no brand recognition to search for. For the named molecules, run only the watchlist's one clinicaltrials.gov row per molecule: the 2026-09-14 gap test found this source low-yield for long-acting incretin and amylin programs (it returned weekly trials), so don't expand it
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

- It goes in the digest's `escalations` array, never `candidates`, on every run until its `resolution` is non-null. Set `newlyEscalated: true` on the run where its `status` changed to `ready_for_promotion`. The renderer shows an escalation on that run and in every Sunday digest and holds repeats back on weekdays, so a repeat never inflates the subject line or reads as noise.
- On a digest where it appears, it leads the `leadIn`. A program that has cleared every evidence bar is the strongest *news* a run can produce: a program the tracker didn't know about, now documented well enough to stand on its own. **Write the sentence as that news, never as a decision waiting on the reader.** "Ready for promotion" is this skill's internal bookkeeping and never appears in the digest (see "The leadIn is news, not a work queue" below).
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

**`stage_label` describes the record's most advanced long-acting asset, never an oral, daily or weekly sibling.** Ascletis is the worked example: its once-daily oral ASC30 tablet is in Phase 3, but the record sits at `Phase 2` because that is where the once-monthly depot stands. Name the same asset in `stage_evidence`.

**When you may advance `stage_label` to a higher bucket:**

- Only when the source **explicitly and unambiguously states the current status** in a way that maps cleanly onto one of the eight buckets — never infer it from adjacent or contextual language, and never advance on a source's forward-looking language ("targeted," "planned," "expects to," "intends to," "aims to") no matter how confident it sounds.
- Only with the **same Tier 1/2 confirmation bar as a "confirmed" finding** (one Tier 1 source, or two independent Tier 2 sources). A Tier 3 or single-unverified-Tier-2 source can update the free-text `stage` description, but must never move `stage_label` forward on its own.
- **"IND filed" vs "Phase 1":** an IND submitted or filed but not yet cleared, or cleared but dosing not yet begun, is `IND filed` — not `Phase 1`. Only move to `Phase 1` once the source explicitly says dosing or enrollment has actually started.
- **Combined-phase designs (e.g. "Phase I/IIa"):** default to the *lower* bucket (`Phase 1`) even if the combined protocol is actively recruiting. Only advance to `Phase 2` once the source explicitly shows the higher portion itself is active — an expansion cohort dosing, a dose-expansion stage started, not merely that the joint-phase trial exists or is enrolling.
- If a finding's evidence is genuinely ambiguous against these rules, **do not guess** — leave `stage_label` at its current value, update `stage`'s prose if useful, and add a one-line note under `stage_evidence` flagging the ambiguity for the admin instead of silently picking a bucket.

**Demotions** (discontinued, paused, failed, clinical hold) need the same confirmation bar as an advance, and there's no dedicated bucket for "discontinued" in the eight values yet — keep the last accurate `stage_label`, but make the discontinuation unmistakable in `stage`'s text and flag it for the admin rather than leaving it to blend in as if the program were still progressing normally.

**Every time you change `stage_label`, write `stage_evidence`** — one sentence, in your own words, naming the specific fact from the source that justifies the new bucket (e.g. `"Phase 1 IND cleared and first patient dosed per the Aug 30 MFDS clearance letter."`). This is what lets a future review (human or otherwise) check your work without re-deriving it from scratch. Never invent a ninth value if nothing seems to fit cleanly — that has never actually happened across the registry; if it ever does, keep the closest-fitting existing value and flag the mismatch instead of coining a new one.

## Molecule classification — how `current_status.molecule_class` is assigned

This is the same discipline as stage scoring above, and it exists for the same reason. The dashboard used to recover a program's molecule by pattern-matching the record's canonical name, every alias, the status data point and the full text of every finding ever logged. That cannot distinguish a molecule a program *formulates* from one it is merely *measured against*, and with four named molecules the distinction stops being academic.

`molecule_class` is an array, and every value must be one of: `semaglutide`, `tirzepatide`, `retatrutide`, `amylin`, `other_incretin`, `non_incretin`. `scripts/build.mjs` fails the build on a missing field or an unknown value.

**Four tests, in order. Each has a named exit; none of them is a guess.**

1. **Does this program formulate it?** Not: compare against it, license a platform that could carry it, or mention it. A rival molecule named in a comparator arm, an analyst note, or an explicit denial is **not** a class. Peptron's own record states the Lilly collaboration does *not* include tirzepatide. Proteina's preclinical table names both semaglutide and tirzepatide purely as comparator arms for a GIPR antagonist. Camurus's Lilly licence was expanded to amylin agonists, and the record says that expansion is separate from CAM2056 itself. All three would be mis-tagged by any text rule.
2. **Does it meet the Tier 1/Tier 2 bar?** The same confirmation rule as a "confirmed" finding. If not, leave the class unset and update prose only.
3. **Does it map cleanly onto one of the six?** Never coin a seventh value. If nothing fits, that is what `other_incretin` and `non_incretin` are for.
4. **All three passed?** Assign the class and write `molecule_evidence` — one sentence, in your own words, naming the fact that justifies it.

**When the evidence is genuinely ambiguous, write an empty array.** That is a legal value meaning "the run declined to pick", and those records surface in the dashboard's review queue for the admin. `molecule_evidence` is still required and should say what was ambiguous. Dongkook is the standing example: one Korean-language trade source says both semaglutide and tirzepatide are under consideration for DKF-MB501, and no source names either for the candidate itself.

**A program may legitimately hold more than one class.** InventageLab formulates semaglutide (IVL3021) and tirzepatide (IVL3024) as separate assets; G2GBio's InnoLAMP platform data covers semaglutide, tirzepatide and retatrutide. Such a record appears on every matching board while remaining one file with one finding history — it is never duplicated.

**Platform breadth is not a class claim.** A platform stated to work with a molecule, without a named asset or data for it, does not earn that class. Adocia's AdoXLong is stated to work with GIP, amylin and dual or triple agonists, but only its semaglutide application is named, so only `semaglutide` is claimed.

## Calendar-aware bursts

Weight extra search effort around known disclosure clusters, since that's where yield concentrates: ADA (June), EASD (autumn, usually September), ObesityWeek (November), JPM Healthcare Conference (January), ASCO (June), AAN (April). Daily cadence shouldn't structurally miss anything, but it's worth spending more of the search budget in these windows than in a quiet month.

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
- **`summary`, `snippet` and `source.name` describe the world, not the run.** The dashboard shows them verbatim. How an item was found or checked ("discovered via this run's search", "fetch was EGRESS_BLOCKED", "read from a search snippet only", a scope note for the reviewer) goes in the optional `verification_note` on that finding or evidence entry. When a date comes from a URL ID, search metadata or anything other than the source stating it, set `date_basis: "inferred"`. `scripts/build.mjs` fails on pipeline narration in those fields.
- **Stamp dates with the script, not with Edit calls.** `node scripts/stamp.mjs checked <KST date> <umbrella-id>...` sets `current_status.last_checked` on every umbrella Track A queried, and `node scripts/stamp.mjs followup <KST date> <candidate-id>...` sets `follow_up.last_checked` and adds one to `checks_run` on every candidate Track B3 re-searched. Both edit in place, keep the file's formatting and refuse to write if anything else would change. Findings, candidates and status changes are still written with targeted Edit calls, never a bulk rewrite.
- **Write a new candidate complete.** It carries `created_date`, at least one evidence entry with `source.url` and `date`, `follow_up` as `{ "last_checked": null, "checks_run": 0, "near_bar": false }` (`near_bar: true` when it is one condition short), and a `promotion_bar` naming all four conditions. The build fails on an unresolved candidate missing any of these.

Update `meta.json`'s `last_run` and `source_health` at the end of every run, even a run that found nothing, using the run's single KST "now" value (see "Schedule and time zone") — an absent update is indistinguishable from a job that silently failed, which is exactly the failure mode this field exists to catch. Also record coverage: how many umbrellas were actually checked this run versus skipped (throttled quiet ones, or ones never reached because the search budget ran out) — a run that only covered 2 of 37 umbrellas needs to be visible as incomplete, not indistinguishable from a full run that just happened to find little. Record follow-up coverage the same way, under `coverage.candidate_follow_up` — how many unresolved candidates exist, how many Track B3 actually re-checked this run, and how many it escalated or stalled. A run that escalated nothing because it re-checked nothing must be distinguishable from a run that re-checked the whole queue and found nothing ready. If any domain returned `EGRESS_BLOCKED` this run, log it under `source_health` with status `blocked` so a pattern of unreachable sources shows up over time instead of silently degrading source quality run after run.

Commit to the GitHub repo with a clear message describing what changed and why (e.g. "Track A: 2 new findings for peptron-pt403, inventagelab-ivl3021" or "Weekly sweep: 3 new candidates"). Never touch the app's interface/UI code from this skill — if a run seems to require a UI change, stop and flag it instead of making it.

**The commit only counts once it is on `main`.** Vercel builds production from `main`, and nothing else: a run whose commit lands on any other branch produces a *preview* deployment, so the dashboard keeps serving the last state of `main` while the run's own summary says it pushed successfully. That is the same silent-failure shape `meta.json`'s `last_run` exists to prevent, one layer further out — the data is committed, the deployment is green, and the dashboard is still stale.

So publish to `main` explicitly, then confirm the commit actually landed there:

```bash
git fetch origin main && git rebase origin/main          # pick up anything committed since checkout
git push origin HEAD:main                                # works from a detached HEAD too
git fetch origin main && git branch -r --contains HEAD   # origin/main must be listed
```

- On `main`, with the push accepted: done, the dashboard rebuilds within the minute.
- On any other branch: **say so at the top of the run report** — name the branch, say production will not update until it is merged to `main`, and say it plainly enough that it reads as a problem, not as a routine note about where the work went. A scheduled run normally has no reason to be on a side branch; when it is, that is an environment or routine misconfiguration (typically an output branch set on the routine), and the admin is the only one who can fix it. Never treat it as normal, and never bury it under the findings.
- Never work around it from here: don't rewrite history on `main`, don't change `vercel.json` or any deployment setting to point production at a side branch, and don't open a PR and call the run finished. Report it and stop — that's the whole job at that point.

## Email digest

After a Daily scan or Weekly sweep, draft one bundled digest of what changed this run as a **Gmail draft**, not a sent email. This mirrors the promotion boundary above: drafting is this skill's job, sending is a decision only the admin makes, every time — there is no standing authorization to send mail unattended. If a future admin decision changes this policy, it will be written here explicitly; until then, draft-only is the rule, not a placeholder.

**Don't hand-write the HTML, and don't touch the template file.** `email/templates/daily-digest.html` and `scripts/render-email.mjs` are frozen infrastructure, exactly like the dashboard's `index.html`/`src/`/`scripts/build.mjs` — a routine run changes data, never design. Never edit the rendered HTML by hand, never improvise your own markup, and never modify the template file itself from this skill, even if the output looks like it could use a tweak — that's a deliberate, reviewed, one-off change the admin makes in conversation, not something a daily/weekly run does on its own. Your job every run is only to supply the input data, run the script unmodified, and hand its output to the Gmail draft tool unmodified.

**1. Build the input payload** as a JSON object (write it to a scratch path, e.g. `email/draft-input.json` — this file is gitignored, it's per-run scratch, not registry data):

```json
{
  "runDate": "2026-09-04",  /* KST calendar date of this run: TZ=Asia/Seoul date +%F */
  "leadIn": "One short sentence summarizing the run — findings + late items + candidates, in your own words.",
  "findings": [ /* one entry per finding inside the freshness window this run */ ],
  "escalations": [ /* every unresolved ready_for_promotion candidate; newlyEscalated: true on the run it escalated (see Track B3) */ ],
  "lateItems": [ /* real findings logged this run but dated outside the freshness window, each carrying its confidence */ ],
  "candidates": [ /* new Track B1/B2 candidates created this run, and nothing else */ ],
  "coverage": [ /* one row per molecule class, in MOLECULE_ORDER -- see below */ ]
}
```

**The renderer decides what gets emailed, so pass everything and let it filter:**

- Each `lateItems` entry carries `confidence` copied from the finding. Only a `confirmed` item dated within 90 days of `runDate` is emailed; older or unverified items stay logged and on the dashboard. A patent logged under its priority date is usually older than that, so it normally stays out of the digest while remaining tracked.
- `escalations` repeat on Sundays only unless `newlyEscalated` is true, as described in Track B3.
- The `leadIn` is linted. The renderer exits with an error naming the problem if the sentence contains internal or queue wording (umbrella, sweep, wire skim, promotion, awaiting or waiting on, pending, queue, coverage, "your decision/review/call") or an N/N count such as 37/37. Phase designations like "Phase 2/3" are fine. Rewrite the sentence and render again; never edit the renderer to get past it.

**`coverage` is what stops the tagged layout from implying a class was dropped.** The digest tags each row with its molecule class rather than splitting into one section per class, because on 96 of 111 recorded dates there was exactly one finding and six fixed sections would render five empty headings almost every day. The cost of tagging is that a class with no news is simply absent, so the coverage strip carries it instead: one compact row per class, always all six, at the foot of the digest.

Each row is `{ key, label, programs, daysSinceCheck, daysSinceNews }`:
- `programs` — how many records declare that class.
- `daysSinceCheck` — days since Track A last actually queried a record in that class, from `current_status.last_checked`. This is the coverage claim.
- `daysSinceNews` — days since the newest finding in that class, from `last_updated`. This is the news.
- Keep them separate. Under the quiet-umbrella throttle they diverge a lot, and collapsing them into one number would overstate what the run did. Use `null` for a class with no records or no finding yet.

**Writing the `leadIn`: this is a headline, not a summary.** Its job is to catch attention and earn the scroll down to the full list — not to account for everything that happened this run. Keep it short, one sentence.

The reader is not you: they don't know what an "umbrella" is, don't care that this was a "sweep" or a "wire skim," and a raw coverage fraction like "37/37" or "5 umbrellas due for a check" reads as an internal ops metric, not news. Those are all terms this skill uses for its *own* bookkeeping (Track A/B mechanics, `meta.json` coverage) — they belong in the commit message and `source_health`, never in the digest.

**When there's more than one finding, don't try to fold all of them into the sentence.** Pick the single most compelling one (two, at most, and only if both are genuinely strong) and lead with that — the rest are already listed in full right below, so the headline isn't the reader's only chance to see them. Trying to cram every item in produces a run-on that reads like a status report, not a headline. Judge "most compelling" the way a news editor would: a `ready_for_promotion` candidate outranks everything (see Track B3 — a program that just cleared every evidence bar is the biggest thing the tracker learned, though the sentence never says so in those words); then a regulatory filing or trial readout; then a new company entering the space, which beats a routine update to one already tracked; a plain new candidate is worth leading with only when there's no real finding that outranks it.

**The leadIn is news, not a work queue.** The digest exists to tell the reader what was found this run. It is not a task list, a queue status, or a request for a decision, so the admin's own workflow never appears in the wording: no count of what is pending or awaiting action ("one of five pending programs," "3 candidates in the queue"), no "ready for your promotion decision," "awaiting your review," "waiting on your call," and no imperative sending the reader off to go act on something. Promotion, merging, rejecting and snoozing are decisions the admin makes on the dashboard on their own schedule, and the dashboard already shows what is queued — a digest sentence that reports it is writing an internal ops tool's voice into what should read as news.

Write about the program instead: what it is, who is behind it, what stage it reached, what changed. Compare:

- ✗ "Two rival companies, Bostal and Anxo, are independently racing to build a long-acting injectable version of the antipsychotic cariprazine — one of five pending programs now ready for your promotion decision."
- ✓ "Two rival companies, Bostal and Anxo, are independently racing to build a long-acting injectable version of the antipsychotic cariprazine."
- ✗ "Bostal Drug Delivery's long-acting antipsychotic B2227, already in Phase 2/3 trials, is one of five programs that have now cleared every bar for a promotion decision — waiting on your call."
- ✓ "Bostal Drug Delivery's long-acting antipsychotic B2227 is already in Phase 2/3 trials, the furthest along of any cariprazine LAI on the tracker."

In both bad versions the news is the first clause and the clause after the dash is admin bookkeeping bolted on; deleting it loses the reader nothing. The same rule governs every `summary` row: describe the finding, never the reader's next action.

Write it the way you'd tell a colleague the one thing worth knowing today, and only mention that a run was quiet in plain terms ("no new developments today") without exposing the count of things checked. If nothing at all happened, a short plain sentence saying so is fine — don't manufacture drama, but don't narrate the scan process either.

**Every entry in all four item arrays uses the exact same shape** — the digest deliberately gives every item identical visual weight, not one highlighted story with extra sections and the rest as footnotes:

| Field | Source | Direct or synthesized |
|---|---|---|
| `headline` | The umbrella's `canonical_name` (findings/late items) or the candidate's `detected_name` | Direct |
| `date` | The finding's own `date` (findings/late items) or the candidate's most recent evidence `date` | Direct |
| `sourceUrl`, `sourceName` | The finding's or candidate evidence's `source` object | Direct |
| `summary` | — | **Synthesized, but only lightly.** One short 1–2 sentence summary of what happened and why it's worth noting — not a verbatim dump of the finding's full `summary` field, and not split across separate "why/impact/watch next" fields. `**bold**` the single most important clause if one stands out; don't force it. |

**Two fields are declared per item, both by the run that read the source, never re-derived from the summary afterwards:**

| Field | What it carries |
|---|---|
| `molecules` | The record's `molecule_class`, copied. Renders as the outline tags on the row. |
| `stageChange` | The new `stage_label`, but **only** when this finding is what moved the program — the same moment `stage_evidence` gets written. Otherwise `null`. Renders as the one filled dark marker, and sorts that row to the top. |

Also pass `sourcePublication` (the outlet on its own) when the finding's source carries it, so the row's label is a clean outlet name instead of a cut-down article title.

**Row order is handled by the renderer, not by you** — `orderItems()` sorts stage changes first, then by molecule class in the fixed order, then newest date, then headline. Supply the items in any order; don't try to pre-sort them.

There is no `type`, `confidence`, or evidence-tier badge in the digest — those live in the registry and the dashboard, not here. Keep `summary` genuinely short; if you find yourself writing more than two sentences, that belongs in the umbrella's `finding_history`, not the digest row.

**2. Run the renderer:**

```bash
node scripts/render-email.mjs email/draft-input.json email/draft-output.json
```

If nothing is left to report after its filters, the script prints a message and writes no output file — that's the signal to skip drafting an email entirely this run, not an error to work around.

**3. Read `email/draft-output.json`** — it has exactly `{ "subject": "...", "preheader": "...", "html": "..." }`. Pass `subject` and `html` to the Gmail draft tool as-is. Don't edit, re-wrap, or re-escape either value — the script already handles escaping and the light `**bold**` markup.

## Hard boundaries, recap

- Never promote, merge, reject, or snooze a candidate — proposal only, always. Escalating one to `ready_for_promotion` is the ceiling, and it is not a promotion.
- Never let an unresolved candidate go un-aged on a run — the date math is free and always runs, even when the search budget is gone.
- Never escalate a candidate with `fuzzy_match.score` 0.55 or higher — that's a merge decision for the admin, not a new umbrella.
- Never change a candidate's `status` without writing `promotion_bar.evidence` explaining why.
- Never drop a `ready_for_promotion` candidate out of the digest's `escalations` array until its `resolution` is non-null, and never put it in `candidates`.
- Never send the digest email — draft it and stop, every run.
- Never write the admin's queue or decision workflow into the digest copy — no pending/awaiting counts, no "ready for your promotion decision," no call to action. The digest informs; the dashboard is where decisions get made.
- Never run the Tier 3 full audit automatically from a Daily scan or Weekly sweep.
- Never blend multiple aliases into one search query.
- Never fire more than two query variants for a single alias.
- Never retry a domain that returned `EGRESS_BLOCKED` this run, and never WebFetch a host `source_health` already lists as `blocked` or `search_only`.
- Never spawn sub-agents; every track runs in the one session.
- Never log sales, share-price or analyst-note items, or news about an oral, daily or weekly program, as a finding.
- Never do a deep multi-query dive on any umbrella before every umbrella has had its first-pass query — breadth before depth.
- Never edit the app's interface/UI code, or the email digest template/renderer.
- Never log a claim as "confirmed" without meeting the Tier 1/Tier 2 source rule.
- Never advance `current_status.stage_label` without meeting that same Tier 1/Tier 2 bar, without the source explicitly (not inferentially) stating the current status, or without writing `stage_evidence` explaining why.
- Never leave `stage_label` unset or set it to anything outside the eight controlled values — the build fails on this by design; don't work around it, fix the value.
- Never assign a `molecule_class` for a molecule the program does not formulate — a comparator arm, a platform's stated breadth, or an explicit denial is never a class.
- Never guess a `molecule_class` to avoid an empty array; an empty array is the correct answer when the evidence is ambiguous, and `molecule_evidence` is required either way.
- Never advance `stage_label` on a patent filing, and never log a patent under its publication date when a priority date is available.
