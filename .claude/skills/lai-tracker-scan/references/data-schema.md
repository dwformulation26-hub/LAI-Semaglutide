# LAI Tracker data file schema

This is the locked schema for the LAI Tracker's data files. Everything here exists to prevent two kinds of problems: **naming drift** (two runs describing the same thing two different ways) and **write collisions** (two runs stepping on the same file or the same ID). Follow it exactly rather than improvising a field name or ID format that "seems reasonable" — the whole value of a schema is that every writer agrees on it without having to check with each other.

## File layout

```
data/
  umbrellas/
    <umbrella-id>.json      one file per tracked entity
  candidates.json           Track B's pending list
  meta.json                 last-run timestamps, per-source health
```

One file per umbrella, not one giant registry file, for two reasons: a daily update to one company only touches that company's file (clean, reviewable git diffs), and it structurally prevents Track A's per-umbrella writes from ever conflicting with Track B's candidate-list writes — they physically can't touch the same file.

**Scheduling note:** this only removes conflicts *between* Track A and Track B. It does not protect against two runs writing the *same* umbrella file concurrently (e.g. Daily scan and a QC Tier 2 sample both touching Peptron's file at once). Scheduled runs must not overlap — sequence them with real gaps, don't rely on the file split alone.

## Controlled vocabularies

Use these exact string values — never invent a variant, even one that reads more naturally. If nothing fits, use the literal value `other` and add a one-line note explaining what didn't fit, rather than inventing a new tag on the spot.

| Field | Allowed values |
|---|---|
| `origin` | `KR`, `Global` |
| `technology_family` | `plga_microsphere`, `in_situ_forming_depot`, `lipid_liquid_crystal_depot`, `molecular_engineering`, `prodrug_linker`, `subdermal_implant`, `other` |
| `entity_type` (array, pick all that apply) | `company`, `platform`, `asset` |
| `finding.type` | `deal_partnership`, `financing_investor`, `regulatory`, `trial_data_readout`, `manufacturing_capacity`, `market_reaction` (historical only: runs stopped logging sales and share-price items on 2026-09-14) |
| `date_basis` (optional, on a finding or evidence entry) | `stated`, `inferred` |
| `finding.confidence` | `confirmed`, `unverified` |
| `source.tier` | `1`, `2`, `3` (integer) |
| `candidate.status` | `watch`, `pending`, `ready_for_promotion`, `stalled`, `promoted`, `merged`, `rejected`, `snoozed` — see the escalation ladder below; the build fails on anything outside this list |
| `current_status.stage_label` | `Research`, `Preclinical`, `IND filed`, `Phase 1`, `Phase 2`, `Phase 3`, `Filed / review`, `Approved / marketed` — see the dedicated section below, this one has real teeth (the build fails without it) |
| `current_status.molecule_class` (array) | `semaglutide`, `tirzepatide`, `retatrutide`, `amylin`, `other_incretin`, `non_incretin` — see the dedicated section below; the build fails on a missing field or an unknown value, and an empty array is legal and means "ambiguous, left for review" |

Dates are always `YYYY-MM-DD`, and every date this tracker generates about its own runs (`last_checked`, `last_updated`, `created_date`, `follow_up.last_checked`) is the KST calendar date from `TZ=Asia/Seoul date +%F`. Source event dates (`finding.date`, `evidence.date`) are recorded as the source publishes them, never shifted. Timestamps (in `meta.json` only) are ISO 8601 with the KST offset: `YYYY-MM-DDTHH:MM:SS+09:00`. Timestamps written before 2026-09-14 end in `Z` (UTC) and remain valid instants; compare timestamps as instants, never as strings. See the skill's "Schedule and time zone" section.

## ID generation rules

IDs must be deterministic and collision-checked before writing — never just increment a counter you're guessing at.

- **Umbrella ID** — kebab-case slug from the canonical name, e.g. `peptron-pt403`. Generated once, at promotion time (by the admin, in conversation — this skill never creates one). Before creating the file, check `data/umbrellas/` for an existing file with that name; if it collides, append a disambiguating suffix (`-2`) rather than overwriting.
- **Finding ID** — `f-<YYYY-MM-DD>-<NNN>`, e.g. `f-2026-09-02-001`. `NNN` is a 3-digit sequence, unique *within that umbrella's own `finding_history` for that date* — read the existing entries for that date in that file and increment from the highest one found. Because each umbrella has its own file, this never needs to be globally unique, only unique within the file.
- **Candidate ID** — `cand-<YYYY-MM-DD>-<NNN>`, same rule, scoped to `candidates.json` for that date.

## `umbrella` object (one file per entity, `data/umbrellas/<id>.json`)

```json
{
  "id": "peptron-pt403",
  "canonical_name": "Peptron – PT403 (SmartDepot)",
  "origin": "KR",
  "entity_type": ["company", "platform", "asset"],
  "technology_family": "plga_microsphere",
  "aliases": ["Peptron", "펩트론", "PT403", "SmartDepot", "087010"],
  "current_status": {
    "stage": "Partnered w/ Lilly",
    "stage_ko": "Lilly와 파트너십",
    "stage_label": "Phase 1",
    "stage_evidence": "Phase 1 IND cleared and first patient dosed per the Aug 30 finding -- MFDS clearance letter directly cited.",
    "molecule_class": ["semaglutide"],
    "molecule_evidence": "PT403 is SmartDepot PLGA semaglutide. The Lilly collaboration explicitly does NOT include tirzepatide.",
    "dosing_target": "Monthly",
    "partner": "Eli Lilly",
    "data_point": "~30% body-weight reduction at week 4 (ADA 2026)",
    "last_updated": "2026-08-30",
    "last_checked": "2026-09-03"
  },
  "finding_history": [
    {
      "id": "f-2026-08-30-001",
      "date": "2026-08-30",
      "type": "trial_data_readout",
      "summary": "One or two sentences, plain language.",
      "summary_ko": "영문 요약의 한국어 번역.",
      "source": { "name": "ADA 2026 roundup", "publication": "Korea Biomedical Review", "url": "https://...", "tier": 2 },
      "confidence": "confirmed"
    }
  ]
}
```

Notes:
- `current_status` fields are only overwritten when a new finding actually addresses them — don't null out `partner` just because today's finding didn't mention it.
- `stage` is free-text, human-readable color (what you'd say out loud). `stage_label` is the controlled bucket the dashboard actually uses to sort, color, and rank programs — the two must describe the same reality, but only `stage_label` is machine-read. `stage_evidence` is one sentence, in your own words, naming the specific fact from the source that justifies `stage_label` — required every time `stage_label` changes, optional (but nice) otherwise. See the skill's "Stage scoring" section for the strict rules on when and how `stage_label` may change — this is not a field to set casually the way `stage`'s prose is; `scripts/build.mjs` fails the build if it's missing or not one of the eight listed values.
- `molecule_class` is the set of molecules this program **formulates**, and `molecule_evidence` is one sentence naming the fact behind that. It is assigned at write time under the same rules as `stage_label` — see the skill's "Molecule classification" section. Three things about it matter more than the field name:
  - **It records what a program formulates, never what it is measured against.** Rival molecule names enter a record through comparator arms, analyst commentary and outright denials, and all three look identical to a text search. Peptron's own record says the Lilly collaboration does *not* include tirzepatide; a pattern match would tag it tirzepatide anyway. This field exists precisely so nothing downstream has to guess.
  - **An empty array is a legal, meaningful value.** It means the run found the evidence genuinely ambiguous and declined to pick. Those records surface in the dashboard's review queue for the admin. `molecule_evidence` is still required and should say what was ambiguous.
  - **A program may hold more than one class**, and several do. InventageLab formulates semaglutide and tirzepatide as separate assets; G2GBio's platform data covers three. Such a record appears on every matching board but remains a single file with a single finding history.

- `source.publication` is the outlet on its own — "Fierce Biotech", not "Fierce Biotech – \"Pfizer axes ex-Metsera obesity asset\"". It is optional but write it whenever the outlet is clear. `source.name` is free-text and in practice holds a mix of publication, article title and corroboration clauses, which is fine for the record but unusable as a label; the digest needs a short outlet name and falls back to cutting `name` at the first dash, comma, slash or bracket when `publication` is absent.

- `verification_note` (optional, on a finding or a candidate evidence entry) records how the item was found or checked: a fetch that was refused, a search snippet read instead of the page, a scope note for the admin. `summary`, `snippet` and `source.name` describe the world only, because the dashboard shows them verbatim, and `scripts/build.mjs` fails on pipeline narration there.
- `date_basis` (optional) is `stated` or `inferred`. Use `inferred` when the date comes from a URL ID, search metadata, a month-only mention or anything other than the source stating the day. An absent value means stated. The build checks that every finding and evidence `date` is `YYYY-MM-DD`.

- `finding_history` is append-only. Never edit or remove a past entry, even to "clean it up" — if something logged earlier turns out wrong, append a new finding correcting it (this preserves the audit trail; git history plus this append-only log together are the record of what was known when).
- Staleness (`days_since_last_finding`) is computed by the app from `current_status.last_updated` at render time. Do not store it — a stored value goes stale itself.
- `last_checked` is updated by Track A (with `node scripts/stamp.mjs checked`) every time it actually queries this umbrella's aliases, regardless of whether anything new turned up — it's what powers the quiet-umbrella throttle in the skill (checking a consistently quiet umbrella every 3rd day instead of daily). This is deliberately separate from `last_updated`, which only moves when a real finding lands. A missing `last_checked` means "never checked under the throttle rule" — treat it as due for a check, not as quiet.

## Korean copy

Every text field the dashboard shows has a Korean sibling named `<field>_ko`, placed right after it:

| English field | Korean copy |
|---|---|
| finding `summary` | `summary_ko` |
| `current_status.stage`, `stage_evidence`, `molecule_evidence`, `dosing_target`, `partner`, `data_point` | the same name plus `_ko` |
| candidate evidence `snippet` | `snippet_ko` |
| candidate `promotion_bar.evidence` | `promotion_bar.evidence_ko` |

English is the source of truth; each Korean field is its translation under [ko-glossary.md](ko-glossary.md). A `null` or empty English field needs no Korean copy. `scripts/build.mjs` (through `scripts/ko-check.mjs`) fails when a Korean copy is missing, when a number or development code from the English is absent from it, or when a copy of four or more English words contains no Hangul. Not translated: `canonical_name`, `detected_name`, `aliases`, source names and `verification_note`. The email digest is English only. Adding or correcting the Korean copy of an old finding is allowed: it doesn't change the append-only English record.

## `candidate` object (an entry in the `candidates` array in `data/candidates.json`)

```json
{
  "id": "cand-2026-09-01-003",
  "detected_name": "Example Biosciences",
  "detected_aliases": ["Example Biosciences", "이그잼플바이오"],
  "entity_type_guess": ["company"],
  "evidence": [
    { "source": { "name": "...", "url": "...", "tier": 2 }, "snippet": "...", "date": "2026-09-01" }
  ],
  "fuzzy_match": { "closest_umbrella_id": "g2gbio-gb7001", "score": 0.42 },
  "status": "pending",
  "created_date": "2026-09-01",
  "follow_up": {
    "last_checked": "2026-09-14",
    "checks_run": 2,
    "near_bar": true
  },
  "promotion_bar": {
    "cleared": ["named_entity", "technical_claim", "confirmed_source"],
    "unmet": ["second_dated_event"],
    "evidence": "IND clearance confirmed by the MFDS disclosure, but all evidence still traces to the single 2026-09-01 announcement."
  },
  "resolution": null
}
```

- `fuzzy_match.score` is 0–1; include it even when the closest match is weak — a low score is still useful context for whoever reviews the candidate.
- An unresolved candidate (`watch`, `pending`, `ready_for_promotion`, `stalled`) must carry `created_date`, at least one evidence entry with `source.url` and `date`, `follow_up` and `promotion_bar`. A brand-new candidate starts with `"follow_up": { "last_checked": null, "checks_run": 0, "near_bar": false }`. `scripts/build.mjs` fails otherwise.
- `evidence` is **append-only**, exactly like an umbrella's `finding_history`. A follow-up check that finds something new appends an entry; it never rewrites or replaces an existing one. This is what turns a candidate from a one-time snapshot into a record of how the signal built up (or didn't).
- `resolution` stays `null` until the admin acts on it, then becomes e.g. `{ "action": "promoted", "umbrella_id": "example-biosciences", "date": "2026-09-05" }` or `{ "action": "rejected", "reason": "duplicate of existing umbrella", "date": "2026-09-05" }`. Rejected candidates are never deleted — the reason feeds the query-tuning feedback loop.

### `follow_up` — the re-check bookkeeping

This is the candidate-side mirror of an umbrella's `current_status.last_checked`, and it exists for the same reason: without it, nothing can tell a candidate that was re-checked and is genuinely quiet apart from one that has simply been forgotten.

- `last_checked` — the date Track B3 last re-searched this candidate, whether or not anything new turned up. `null` means "never followed up", which is due for a check, not quiet. Stamp it with `node scripts/stamp.mjs followup`, which also adds one to `checks_run`.
- `checks_run` — integer count of completed follow-up checks, incremented on every re-search. This is what the stall rule counts against, so a candidate can't be declared stalled before it has actually been looked at several times.
- `near_bar` — boolean, set by the weekly deep pass: true when the candidate clears every promotion-bar condition but one. The cheap daily pass uses this to decide the handful of candidates worth spending a search on before the next weekly sweep.

`days_pending` is never stored — the app computes it at render time from `created_date`, the same way it computes `days_since_last_finding`. A stored age is wrong the day after it's written.

### `promotion_bar` — why a candidate is or isn't ready

Written by Track B3 on every follow-up check, and the direct analogue of `stage_evidence` on an umbrella: the point is that a future reviewer can see *why* the escalation level is what it is without re-deriving it from the evidence list.

- `cleared` and `unmet` partition the four condition keys — `named_entity`, `technical_claim`, `confirmed_source`, `second_dated_event`. Every key appears in exactly one of the two arrays. Condition definitions live in the skill's Track B3 section, not here.
- `evidence` — one sentence, in your own words, naming the specific fact that moved (or is still missing). Required whenever `status` changes.
- When `unmet` is empty and `fuzzy_match.score` is below the merge threshold, `status` becomes `ready_for_promotion`. Those two facts together are the entire promotion rule; no separate numeric score is stored or invented.

### Escalation ladder (`status` for an unresolved candidate)

| Status | Meaning | Re-check cadence | Surfaced where |
|---|---|---|---|
| `watch` | Thin signal — a named entity with no concrete technical claim yet. The lower-priority queue. | Monthly (every 4th weekly sweep) | Dashboard watch count only, never the digest |
| `pending` | Cleared the creation bar, tracking toward the promotion bar | Weekly deep pass; daily if `near_bar` | Candidate queue, digest when first created |
| `ready_for_promotion` | Cleared all four promotion conditions and is not a merge case | Every run, until the admin resolves it | Top of the candidate queue; the digest's `escalations` section in the first digest after it escalates and in every Monday digest after |
| `stalled` | 30+ days old with no new evidence across 3+ follow-up checks | Monthly, same as `watch` | Candidate queue, flagged for reject-or-snooze |

`promoted`, `merged`, `rejected` and `snoozed` are terminal and admin-only — Track B3 never writes them, and never re-checks a candidate carrying one.

## `meta.json`

```json
{
  "last_run": {
    "daily_scan": "2026-09-15T06:04:12+09:00",
    "weekly_sweep": "2026-09-13T09:05:40+09:00",
    "qc_tier2": "2026-09-13T09:31:02+09:00",
    "qc_tier3": null
  },
  "coverage": {
    "daily_scan": { "umbrellas_checked": 41, "umbrellas_total": 41, "skipped_throttled": 0, "skipped_budget_exhausted": 0, "codes_harvested": 6, "codes_unknown": 1, "codes_queried": 5, "watchlist_cursor": "aul016" },
    "candidate_follow_up": { "unresolved_total": 15, "rechecked": 2, "escalated": 1, "stalled": 0, "aged": 15 }
  },
  "source_health": {
    "dart": { "last_success": "2026-09-15T06:04:12+09:00", "status": "ok" },
    "clinicaltrials.gov": { "last_success": "2026-09-15T06:04:12+09:00", "status": "search_only" },
    "kipris": { "last_success": "2026-09-06T09:12:00+09:00", "status": "stale" },
    "koreabiomed.com": { "last_success": null, "status": "blocked" }
  }
}
```

`source_health.status` is `ok`, `stale`, `search_only`, or `blocked` — `blocked` means a fetch returned a hard network error (e.g. `EGRESS_BLOCKED`) rather than just finding nothing; `stale` means it hasn't been checked recently, not that it failed. `search_only` means direct fetch is refused by the network policy but the domain's content is reachable through domain-scoped search and is still contributing findings — clinicaltrials.gov and patents.google.com are both in this state, and recording them as `blocked` would make a working tracker look like a degrading one. Never silently leave a failed source as `ok`.

`coverage.candidate_follow_up` is the Track B3 equivalent, and it exists for the same reason: `aged` should equal `unresolved_total` on every run, because aging is free date math that cannot be skipped, while `rechecked` is expected to be small on a daily run (at most 2) and large on a weekly sweep. `escalated` and `stalled` count status moves written this run. A run where `aged` falls short of `unresolved_total` means candidates were silently skipped, which is the exact failure this field is here to expose.

`digest_carryover` is `null` except between a weekly sweep and the next daily scan. Email goes out on weekdays only, so the Sunday sweep lists what it logged here instead of drafting a digest: `{ "from": <sweep timestamp>, "findings": [{ "umbrella_id", "finding_id" }], "candidates": [<candidate ids created>], "newly_escalated": [<candidate ids escalated>] }`. The next daily scan puts those items in its digest and sets the field back to `null`. The build fails if an id in it doesn't exist.

`coverage` is what makes an incomplete run visible instead of indistinguishable from a full one. `skipped_throttled` counts umbrellas deliberately skipped under the quiet-umbrella rule (expected, healthy); `skipped_budget_exhausted` counts umbrellas that never got checked because the run ran out of search budget first (not healthy — if this is ever nonzero, the run was materially incomplete and that should be obvious from this field alone, not something someone has to dig through logs to discover).
