# Class watchlist — query terms and development codes

This file drives Track B1 and the class-aware half of Track B2 (see SKILL.md, "Track B1").
It exists because long-acting programs are reported under development codes, and in
dosing-interval language (once-monthly, 월 1회), long before anyone writes "long-acting
tirzepatide." A skim built only on generic molecule names misses them.

**Runs read this file and never edit it.** A run that finds a code worth adding proposes
it in its report; the admin adds it here. Every code below was seen in the cited source.
Nothing is inferred.

Built 2026-09-14 from a 58-query gap test. Key results, which shape the rows below:

- `tirzepatide long-acting depot news` (the old phrasing) returned no programs. `tirzepatide once-monthly formulation preclinical microsphere company` returned Peptron PT404.
- `티르제파타이드 지속형 개발` returned no programs. `터제파타이드 장기지속형 주사제` immediately returned G2GBio's monthly tirzepatide data. Korean trade press (dailypharm, edaily, Herald) mostly writes 터제파타이드.
- Korean coverage is framed around 월 1회 / 1개월 제형 / 초장기 지속형 / 미립구. Roundup articles phrased that way listed 6–7 codes each.
- Querying one code surfaces the company's sibling codes: `AUL016` led to AUL018, which no molecule query found.
- `amylin long-acting` works in English ("long-acting amylin analog" is the standard term). Retatrutide LAI queries found no disclosed program anywhere.
- Chinese queries and clinicaltrials.gov searches were low-yield for these classes (mostly weekly biosimilars and weekly trials), so they run on Sunday only.
- Comparing against the admin's own triple-agonist briefing showed that once-monthly multi-agonists sit in `other_incretin`, which the four molecule rows never search. Ascletis is tracked, yet its once-monthly triple agonist ASC37 (July 2026) was never logged. Rows 13–14 and the ASC37 alias now on `ascletis-asc30` close that gap.

## 1. Daily query rows (Track B1 part 1 — every run, exactly as written)

| # | Class | Lang | Query |
|---|---|---|---|
| 1 | semaglutide | EN | `semaglutide once-monthly formulation company` |
| 2 | semaglutide | KR | `세마글루타이드 월 1회 제형 개발` |
| 3 | tirzepatide | EN | `tirzepatide once-monthly formulation preclinical microsphere` |
| 4 | tirzepatide | KR | `터제파타이드 월 1회 장기지속형 주사제` |
| 5 | tirzepatide | KR | `티르제파타이드 월 1회 제형 개량신약` |
| 6 | retatrutide | EN | `retatrutide once-monthly long-acting formulation` |
| 7 | retatrutide | KR | `레타트루타이드 월 1회 제형` |
| 8 | amylin | EN | `long-acting amylin analog once-monthly` |
| 9 | amylin | KR | `아밀린 유사체 월 1회 개발` |
| 10 | cross-class | KR | `초장기 지속형 비만 주사제 미립구` |
| 11 | cross-class | EN | `"long-acting injectable" GLP-1 depot` |
| 12 | cross-class | EN | `sustained-release microsphere peptide obesity` |
| 13 | other_incretin | EN | `once-monthly triple agonist GLP-1 GIP glucagon` |
| 14 | other_incretin | KR | `삼중작용제 월 1회 주사` |

## 2. Sunday-only query rows (Track B2)

| # | Class | Lang | Query |
|---|---|---|---|
| S1 | semaglutide | KR | `세마글루티드 장기지속형` |
| S2 | retatrutide | KR | `레타트루티드 지속형` |
| S3 | tirzepatide | KR | `트리제파타이드 월 1회` (a misspelling seen in press; cheap to cover) |
| S4 | amylin | KR | `카그릴린타이드 지속형 주사제` |
| S5 | semaglutide | CN | `司美格鲁肽 长效注射液 研发代号` |
| S6 | tirzepatide | CN | `替尔泊肽 长效 注射液` |
| S7 | amylin | CN | `胰淀素类似物 长效` |
| S8 | tirzepatide | EN | `ADA EASD abstract once-monthly tirzepatide microsphere` |
| S9 | amylin | EN | `ADA EASD abstract long-acting amylin analog` |
| S10–S13 | each named molecule | EN | `site:clinicaltrials.gov <molecule> once-monthly` (low yield; one each, no more) |

## 3. Parent-molecule identifiers (code harvest: not a new program)

A harvested term that matches this table names the molecule itself, not someone's
long-acting program. Ignore it. Identifiers that belong to a tracked umbrella (e.g.
eloralintide) resolve as tracked, through the alias table.

| Class | Codes | INN / brands | Korean spellings in use | Chinese |
|---|---|---|---|---|
| semaglutide | — (Novo's code not confirmed in a source; don't rely on one) | semaglutide; Ozempic, Wegovy, Rybelsus | 세마글루타이드, 세마글루티드 | 司美格鲁肽; 诺和忻 |
| tirzepatide | LY3298176; Lilly protocol prefix I8F- | tirzepatide; Mounjaro, Zepbound | 터제파타이드 (trade press), 티르제파타이드, 트리제파타이드 (misspelling) | 替尔泊肽; 穆峰达 |
| retatrutide | LY3437943 (also written LY-3437943) | retatrutide | 레타트루타이드, 레타트루티드 | 瑞他鲁肽 |
| amylin | cagrilintide AM833 (low-quality source); eloralintide LY3841136; petrelintide ZP8396 | cagrilintide, CagriSema, amycretin, eloralintide, petrelintide, pramlintide | 아밀린, 카그릴린타이드, 카그리세마, 아미크레틴, 엘로랄린타이드, 페트렐린타이드 | 胰淀素类似物; 卡格列肽; 普兰林肽 |

### Non-LAI decoys (known, out of scope — don't queue these)

The tracker follows long-acting delivery technology. For incretins and amylin, once-weekly dosing is the class baseline, not an extension of it. A weekly injection, a daily or weekly oral, or a transdermal patch is out of scope, however new the molecule. Codes below are decoys **only in the format listed**. If a source reports a depot, an implant, or a monthly-or-longer interval for one of these molecules, that is a new long-acting program: resolve it like any unknown code.

| Code | What it is | Source |
|---|---|---|
| VRB-103 | Verdiva, amylin, oral/weekly | gap test 2026-09-14 |
| DD07 / MET-AMYo | D&D Pharmatech, oral amylin | https://www.mt.co.kr/thebio/2026/01/29/2026012820125862754 |
| HM15275 | Hanmi GLP-1/GIP/GCG triple agonist, once-weekly SC | https://hanmipharm.com/science/pipeline/focused/hm15275.hm |
| MWN-109 / MWN109 | Shanghai Minwei triple agonist, once-weekly SC plus oral | https://clinicaltrials.gov/study/NCT06859853 ; https://diabetesjournals.org/diabetes/article/74/Supplement_1/1967-LB/158767/1967-LB-MWN109-A-Novel-Fatty-Acid-Modified-GLP-1 |
| PN-477 (PN-477o, PN-477sc) | Protagonist triple agonist, once-daily oral and once-weekly SC | https://www.biospace.com/press-releases/protagonist-announces-nomination-of-pn-477-an-oral-and-injectable-glp-1r-gipr-and-gcgr-triple-agonist-peptide-development-candidate-for-obesity |
| DWRX5003 | Daewoong semaglutide dissolving-microneedle patch, once-weekly (Phase 1) — a patch, not an injectable | https://m.medigatenews.com/news/2089678647 |
| HRS-4729 / KAI-4729 | Hengrui / Kailera GLP-1/GIP/GCG triple agonist, once-weekly SC (4–5 day half-life) | https://synapse.patsnap.com/drug/15f9cccfc47f4af683eaa7f47f4bf4c3 ; https://investors.kailera.com/news-releases/news-release-details/kailera-reports-first-quarter-2026-financial-results-and |
| UBT251 | United Laboratories / Novo Nordisk GLP-1/GIP/GCG triple agonist, once-weekly SC | https://www.globenewswire.com/news-release/2026/02/24/3243205/0/en/Novo-Nordisk-Triple-agonist-UBT251-delivers-up-to-19-7-mean-weight-loss-after-24-weeks-in-phase-2-trial-in-China.html |

## 4. Rotation list — untracked programs and alias gaps

The daily scan queries up to 4 rows per run in order, resuming after the `key` stored in
`coverage.daily_scan.watchlist_cursor` and wrapping at the end. The Sunday sweep queries
every row. Query the **Query** column exactly. Remove a row once its code is an umbrella
alias or a candidate's `detected_aliases` entry.

Moved to umbrella aliases by the admin on 2026-09-14, so no longer rotated: ASC37 (`ascletis-asc30`),
MET-233i (`pfizer-metsera-engineered-peptide`), AUL016 and AUL018 (`owlbio-kyungdong-xtina`), DW-4321
(`daewon-pharmus-quadagonist`), and Yuhan (`inventagelab-ivl3021`). PT404 stays in rotation: Peptron's record states
tirzepatide is outside the Lilly work, and the program looks dormant.

| key | Query | Class | What it is | Gap | Source (date) |
|---|---|---|---|---|---|
| abbv-295 | `ABBV-295 GUB014295 amylin` | amylin | AbbVie (from Gubra) long-acting amylin analog. Phase 1 multiple-dose study tested weekly, every-2-weeks and monthly dosing | Untracked program | https://news.abbvie.com/2026-03-09-AbbVie-Announces-Positive-Topline-Results-from-a-Phase-1-Multiple-Ascending-Dose-Study-of-ABBV-295,-a-Long-Acting-Amylin-Analog,-in-Adults (2026-03-09) |
| pt404 | `PT404 펩트론 터제파타이드` | tirzepatide | Peptron SmartDepot tirzepatide, preclinical, ~70-day release in minipigs; may have stalled after the July 2026 statement that tirzepatide is outside the Lilly work | Alias gap on `peptron-pt403` | https://diabetesjournals.org/diabetes/article/72/Supplement_1/781-P/149936/ (ADA 2023) |
| lilly-camurus | `Lilly Camurus FluidCrystal amylin triple agonist` | tirzepatide / retatrutide / amylin | Lilly–Camurus FluidCrystal deal covering a GLP-1/GIP dual, a triple agonist and an amylin agonist (amylin option exercised 2026-06-02) | Deal not captured as its own program | https://allsci.com/news/licensing-deals/eli-lilly-expands-camurus-fluidcrystal-collaboration-to-amylin-receptor-agonists-usd-870m-deal/ (2026-06-02) |
| alteogen-monthly | `알테오젠 월 1회 비만 플랫폼` | undetermined | Alteogen ultra-long-acting monthly protein platform, preclinical; molecule undisclosed, retatrutide only as comparator (so no class yet) | Untracked program | https://www.paxetv.com/news/articleView.html?idxno=261222 (2026-02-09) |
| biote-cn121154792a | `CN121154792A 替尔泊肽` | tirzepatide | Beijing Biote in-situ gel tirzepatide, 28+ days in vitro; patent only | Untracked program | https://patents.google.com/patent/CN121154792A/zh (published 2025-12-19) |
| ct-g32 | `셀트리온 CT-G32 4중 작용 비만` | undetermined | Celltrion GLP-1-based quadruple-agonist injection, run alongside an oral program; animal-efficacy stage with an IND planned. **Dosing interval not disclosed** — it becomes a candidate only once a source shows a monthly-or-longer interval or a depot formulation | Untracked program (watch) | https://www.ebn.co.kr/news/articleView.html?idxno=1710549 ; https://www.khan.co.kr/article/202602241439001 (2026-02-24) |

### Seen but not queued (too thin)

- Lilly monthly candidate with SK pharmteco making clinical-trial drug substance: only industry *speculation* that it is tirzepatide-class. https://www.newswhoplus.com/news/articleView.html?idxno=56426 (2026-03-10)
