# LAI Tracker

A living tracker of Long-Acting Injectable (LAI) drug development — semaglutide depot/LAI technologies first, then broader peptide/protein LAI delivery tech. Tracks both Korean domestic and global players.

## Status

This repository contains the tracked data and a Vercel-native dashboard. Data is written and committed here automatically by Claude (via the `lai-tracker-scan` skill) as part of the LAI Tracker project's research pipeline. Every Vercel deployment rebuilds `data/umbrellas/*.json`, `data/candidates.json`, and `data/meta.json` into a browser-ready snapshot; routine data updates do not require dashboard-code changes.

The interface keeps three conditions distinct:

1. Tracked intelligence accepted into the umbrella record
2. Candidate entities pending analyst review, ordered by escalation level
3. Daily/weekly monitoring and quality-control status from `meta.json`

## Candidate escalation

A discovered entity is not a one-time report. Every scan re-checks the unresolved candidates in `candidates.json`, appends new evidence to them, and scores them against a fixed four-condition promotion bar (named entity, technical claim, confirmed source, and a second dated event). A candidate that clears all four moves to `ready_for_promotion`: it sorts to the top of the review queue, is counted separately on the dashboard, and leads the digest email on every run until an analyst resolves it. A candidate that goes 30+ days without new evidence moves to `stalled` and is flagged for reject-or-snooze instead of aging silently.

Promotion itself stays manual. The scan proposes and escalates; creating, merging, rejecting and snoozing are admin actions taken by hand. `scripts/build.mjs` fails the build on a candidate status outside the controlled list, or on an escalated candidate with no written rationale.

## Structure

```
data/
  umbrellas/    one JSON file per tracked entity (company/platform/asset)
  candidates.json   discovered entities with their evidence, follow-up record and escalation status
  meta.json     last-run timestamps and source health
src/            browser application and data-normalization logic
scripts/        dependency-free static build + email digest renderer
tests/          Node tests for normalization, repository counts, and the email renderer
email/templates/  tokenized HTML template for the daily/weekly digest email
index.html      Vercel dashboard entry point
vercel.json     explicit static build and output configuration
```

## Email digest

`scripts/render-email.mjs` fills `email/templates/daily-digest.html` from a per-run JSON input (see the `lai-tracker-scan` skill's "Email digest" section for the exact contract) and produces `{ subject, preheader, html, delivery }`.

`delivery` is the send decision, made here rather than left to the run's judgment: `"send"` when the run logged at least one new finding, `"draft"` for a digest carrying only repeated escalations, late items or new candidates. A `"send"` digest goes out unattended to a standing recipient list held in the daily routine's prompt — deliberately not in this repository, which is public. A `"draft"` digest waits in Gmail for a person. `email/draft-input.json` / `email/draft-output.json` are gitignored scratch files, regenerated every run.

## Local build

Requires Node.js 20 or newer. No third-party packages are required.

```bash
npm test
npm run build
npm run serve
```

`npm run serve` runs a dependency-free static server over the generated `dist/` directory at http://localhost:5173. Vercel runs the same build command and publishes `dist/` automatically.
