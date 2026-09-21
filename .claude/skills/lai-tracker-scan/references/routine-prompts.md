# Scheduled routine prompts

The LAI Tracker runs unattended from two scheduled cloud routines. They are stored
server-side on the Claude account, not in this repo, so they do not travel with a
git clone or an account migration. This file is the recoverable copy: if the routines
have to be recreated, recreate them from the definitions below, and update this file
in the same change whenever a routine is edited.

Last synced with the live routines on 2026-09-16 (a digest with new findings is now sent to a standing recipient list; a digest without them is still draft-only).

## Schedule (KST)

| Routine | Trigger id | Fires (KST) | Cron as stored (UTC) |
|---|---|---|---|
| LAI Tracker - Daily Scan | `trig_01At9mMGq4Gdp3EHGnMAkVvt` | Monday to Friday, 06:00 | `0 21 * * 0-4` |
| LAI Tracker - Weekly Sweep | `trig_0111A8NATkManRVeDVBHoL1r` | Sunday, 09:00 | `0 0 * * 0` |

The scheduler only accepts UTC cron, so the stored expressions are translations of the
KST times. The daily one crosses midnight: 06:00 KST Monday is 21:00 UTC Sunday, hence
day mask `0-4`. Manage both at <https://claude.ai/code/routines> or with `RemoteTrigger`.

## Shared configuration

| Setting | Value |
|---|---|
| Repository source | `https://github.com/dwformulation26-hub/LAI-Semaglutide` |
| Output branch (`outcomes`) | **none** — must stay empty. A branch set here makes every run push to `claude/<name>-<suffix>` instead of `main`, and Vercel only deploys `main`. The daily routine had `claude/relaxed-euler` set from 2026-09-11 until it was removed on 2026-09-14. |
| Environment | `env_016gKCnQEPe5JJhX4cWBatL5` |
| Model | `claude-sonnet-5` |
| Allowed tools | Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch |
| Connector | Gmail (send when the renderer says `delivery: "send"`, draft otherwise) |
| Digest recipients | **Not committed.** Four `@daewoong.co.kr` addresses, order-sensitive, held only in the live daily routine prompt — this repo is public. Read them with `RemoteTrigger` `get` on the daily trigger id, or from the routine page. |

Routines do not accept environment variables, so both run on the default web-search
budget. The search budget discipline in SKILL.md is what keeps a run inside it.

## Routine 1 — LAI Tracker - Daily Scan

```text
Run the LAI Tracker Daily scan. This repo is a pharma Long-Acting Injectable (LAI) drug tracker covering six molecule classes: semaglutide, tirzepatide, retatrutide, amylin, other_incretin and non_incretin. Read .claude/skills/lai-tracker-scan/SKILL.md in this checked-out repo first -- it is the complete, authoritative instructions for this task, together with the data schema at .claude/skills/lai-tracker-scan/references/data-schema.md and the code-name watchlist at .claude/skills/lai-tracker-scan/references/class-watchlist.md. Where this prompt and the skill differ, the skill wins.

All timing is KST. Start by running `TZ=Asia/Seoul date '+%Y-%m-%dT%H:%M:%S+09:00'` and use that single value as "now" for the whole run: every meta.json timestamp carries the +09:00 offset, and every run date you write (last_checked, last_updated, created_date, follow_up.last_checked, the digest runDate) is the KST date from `TZ=Asia/Seoul date +%F`. The sandbox clock is UTC, so never use a bare `date`, and never estimate a timestamp. Follow the skill's 'Schedule and time zone' section.

Work in this one session: do not spawn sub-agents. Before the first WebFetch, read source_health in data/meta.json and never fetch a host it lists as 'blocked' or 'search_only'; reach those through search, and try any other host at most once per run. Log only news about each record's long-acting assets: no oral, daily or weekly programs, and no sales, share-price or analyst-note items.

Run in 'Daily scan' mode exactly as the skill's mode table defines it: Track A (breadth-first, one distinctive-alias pass across every due umbrella before any second query, with the quiet-umbrella throttle and the freshness window, including the per-record window for throttled records), Track B1 in its three parts (the watchlist's fixed class queries, code harvesting from every result, and the bounded code queries with the watchlist rotation), Track B3's cheap daily pass (free date math on every unresolved candidate, at most 2 searches), and QC Tier 0/1. Programs are usually reported under development codes before molecule names, so do not skip the code harvest. No daily scan runs at the weekend, so on Monday the freshness window reaches back to Friday's daily scan and the weekend's news is this run's headline news.

Molecule class is a write-time field, like stage_label. Whenever a finding you log changes what a program formulates, update current_status.molecule_class and molecule_evidence under the skill's 'Molecule classification' rules: a comparator arm, a platform's stated breadth or an explicit denial is never a class, and an empty array is correct when the evidence is ambiguous. Never touch molecule_class on a record you did not log a finding for. A record holding more than one molecule also needs current_status.molecule_stages -- the stage each molecule's own assets are evidenced at, with an evidence sentence each -- because one stage_label spread across a set of molecules claims clinical progress for assets that have none; and every finding on such a record needs its own `molecules` array naming what that finding is about, `[]` when it is about none of them. The build enforces both.

Write findings and candidates per the schema. Update data/meta.json's last_run.daily_scan, coverage (including coverage.candidate_follow_up and the code-harvest counters and watchlist_cursor under coverage.daily_scan) and source_health (EGRESS_BLOCKED domains as 'blocked'; clinicaltrials.gov and patents.google.com as 'search_only' when reached through search). Update meta.json even on a quiet run -- a missing update is indistinguishable from a failed run. Write findings, candidates and meta.json with targeted Edit calls, never a bulk rewrite, but stamp dates with the helper: `node scripts/stamp.mjs checked <KST date> <umbrella-id>...` for every umbrella Track A queried and `node scripts/stamp.mjs followup <KST date> <candidate-id>...` for every candidate Track B3 re-searched. Summaries, snippets and source names describe the world only; how an item was found or checked goes in verification_note. Every summary, snippet, promotion_bar evidence and current_status text field you write also gets its Korean copy (`<field>_ko`) in the same edit, translated from the English under references/ko-glossary.md with every number and development code copied exactly; the build fails otherwise. The email digest stays English.

Before committing, run `node scripts/build.mjs` and `npm test`. Both must pass. If the build rejects a stage_label, molecule_class, molecule_evidence or candidate status, fix the data value -- never the script, the tests, the template, the watchlist or any UI code.

Commit with a clear message, then publish to main: `git fetch origin main && git rebase origin/main && git push origin HEAD:main`, then `git fetch origin main && git branch -r --contains HEAD` must list origin/main. If it does not, lead your final summary with that, per the skill's 'The commit only counts once it is on main' section.

Do NOT create, promote, merge, reject or snooze any umbrella or candidate -- proposal only, per the skill's hard boundary. If a harvested code deserves a permanent place in the watchlist, propose it in your final summary instead of editing the file.

Email digest: follow the skill's 'Email digest' section exactly. At the start of the run, read data/meta.json's digest_carryover (the Sunday sweep's hand-off, since it drafts no email): its findings go into this digest's findings or lateItems by this run's freshness window, its candidates into candidates, and its newly_escalated candidates into escalations with newlyEscalated: true. Set digest_carryover to null in this run's meta.json update. Build email/draft-input.json with findings, escalations (every unresolved ready_for_promotion candidate, with newlyEscalated: true only in the first digest after it escalated), lateItems (each with its confidence), candidates (those created this run plus any carried over) and the six-row coverage array (one row per class in the fixed order, day counts in KST calendar days, computed from the umbrella files after this run's edits). Every finding and late item carries `molecules` -- the finding's OWN molecules array where it has one, and only for a single-molecule record the record's molecule_class (never copy the class set of a multi-molecule record onto its findings: that is what put a TIRZEPATIDE tag beside a semaglutide IND), and `stageChange` only when this finding moved stage_label. The leadIn is a one-sentence news headline: no internal terms ('umbrella', 'sweep', 'wire skim', coverage fractions) and no admin-queue wording. Run `node scripts/render-email.mjs email/draft-input.json email/draft-output.json`, and only if it writes an output file, pass its subject and html unmodified to Gmail. The output's `delivery` field decides how: on "draft" create a Gmail draft and stop; on "send" (the run logged at least one new finding or a new candidate) send it to the four recipients listed in the live routine prompt, in that exact order, To: only, no cc, bcc or reply-to. THE ADDRESSES ARE NOT IN THIS FILE -- this repo is public, so the live prompt carries them and this recovery copy does not. If you are recreating this routine, read them from the live trigger before you save, and never commit them here. Do the email only after the commit is on main, and never re-send a send you cannot confirm; leave a draft and say so instead. If the script rejects the leadIn, rewrite the sentence and run it again. If there is nothing to report, or node or the script fails for any other reason, skip the email and say so -- the commit is the part that must not fail.
```

## Routine 2 — LAI Tracker - Weekly Sweep

```text
Run the LAI Tracker Weekly sweep. This repo is a pharma Long-Acting Injectable (LAI) drug tracker covering six molecule classes: semaglutide, tirzepatide, retatrutide, amylin, other_incretin and non_incretin. Read .claude/skills/lai-tracker-scan/SKILL.md in this checked-out repo first -- it is the complete, authoritative instructions for this task, together with the data schema at .claude/skills/lai-tracker-scan/references/data-schema.md and the code-name watchlist at .claude/skills/lai-tracker-scan/references/class-watchlist.md. Where this prompt and the skill differ, the skill wins.

All timing is KST. Start by running `TZ=Asia/Seoul date '+%Y-%m-%dT%H:%M:%S+09:00'` and use that single value as "now" for the whole run: every meta.json timestamp carries the +09:00 offset, and every run date you write is the KST date from `TZ=Asia/Seoul date +%F`. The sandbox clock is UTC, so never use a bare `date`, and never estimate a timestamp. Follow the skill's 'Schedule and time zone' section.

Work in this one session: do not spawn sub-agents. Before the first WebFetch, read source_health in data/meta.json and never fetch a host it lists as 'blocked' or 'search_only'; reach those through search, and try any other host at most once per run. Log only news about each record's long-acting assets: no oral, daily or weekly programs, and no sales, share-price or analyst-note items.

This routine fires Sunday 09:00 KST. Run 'Weekly sweep' mode exactly as the skill's mode table defines it: Track B2, Track B3's weekly deep pass, and QC Tier 2, and nothing else. Do NOT run Track A or Track B1, and do not write last_run.daily_scan or coverage.daily_scan: Monday's daily scan covers the weekend. Track B2 is class- and code-aware: the per-molecule clinicaltrials.gov and Google Patents queries through domain-scoped search, one query for every untracked-program code in the watchlist, code harvesting from every result, plus the structural sources (conference accepted-abstract indices including ADA, EASD and ObesityWeek, KIPRIS/USPTO/WIPO depot and sustained-release CPC classes, the KOSDAQ 기술특례상장 pipeline, university tech-transfer, VC/deal databases). Patents never advance stage_label and are logged with their priority date.

QC Tier 2: of the 5-10 findings sampled for re-verification, include at least one record from each named class that has records (tirzepatide, retatrutide, amylin), and for those records also confirm molecule_class still matches molecule_evidence. Record a mismatch in meta.json's qc_tier2 notes rather than silently changing the class. Then run the fuzzy-dedup sweep across the alias table, normalizing codes (case, hyphens, spaces) before comparing.

New candidates and findings follow the skill's pipeline: fuzzy-match against the current alias table first, require a named entity + concrete technical claim + at least one Tier 1/2 source (an unknown code with a class term and LAI qualifier but no such source becomes a `watch` candidate), never invent controlled-vocabulary values, and stay in your file's lane. Do NOT create, promote, merge, reject or snooze any umbrella or candidate. Never touch UI code, the email template, the renderer or the watchlist file -- propose watchlist additions in your final summary.

Update data/meta.json's last_run.weekly_sweep and last_run.qc_tier2, coverage (coverage.weekly_sweep, coverage.qc_tier2, coverage.candidate_follow_up) and source_health even if nothing new is found. Write findings, candidates and meta.json with targeted Edit calls, and stamp follow-up dates with `node scripts/stamp.mjs followup <KST date> <candidate-id>...` for the candidates the deep pass re-searched. Summaries, snippets and source names describe the world only; how an item was found or checked goes in verification_note. Every summary, snippet, promotion_bar evidence and current_status text field you write also gets its Korean copy (`<field>_ko`) in the same edit, translated from the English under references/ko-glossary.md with every number and development code copied exactly; the build fails otherwise. The email digest stays English.

Before committing, run `node scripts/build.mjs` and `npm test`; both must pass, and a failure is fixed in the data, never in code. Commit with a clear message (e.g. 'Weekly sweep: 3 new candidates'), then `git fetch origin main && git rebase origin/main && git push origin HEAD:main`, then `git fetch origin main && git branch -r --contains HEAD` must list origin/main; if not, lead your final summary with that.

No email: the digest goes out on weekdays only, so do not call the Gmail tool. Instead, before committing, write data/meta.json's digest_carryover per the skill's 'Email digest' section, listing every finding this run logged (umbrella_id and finding_id), every candidate it created and every candidate it escalated to ready_for_promotion; append to an existing carryover rather than replacing it. Monday's daily scan puts those items in its digest.
```
