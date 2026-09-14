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

| Code | What it is | Source |
|---|---|---|
| VRB-103 | Verdiva, amylin, oral/weekly | gap test 2026-09-14 |
| DD07 / MET-AMYo | D&D Pharmatech, oral amylin | https://www.mt.co.kr/thebio/2026/01/29/2026012820125862754 |

## 4. Rotation list — untracked programs and alias gaps

The daily scan queries up to 4 rows per run in order, resuming after the `key` stored in
`coverage.daily_scan.watchlist_cursor` and wrapping at the end. The Sunday sweep queries
every row. Query the **Query** column exactly. Remove a row once its code is an umbrella
alias or a candidate's `detected_aliases` entry.

| key | Query | Class | What it is | Gap | Source (date) |
|---|---|---|---|---|---|
| abbv-295 | `ABBV-295 GUB014295 amylin` | amylin | AbbVie (from Gubra) long-acting amylin analog. Phase 1 multiple-dose study tested weekly, every-2-weeks and monthly dosing | Untracked program | https://news.abbvie.com/2026-03-09-AbbVie-Announces-Positive-Topline-Results-from-a-Phase-1-Multiple-Ascending-Dose-Study-of-ABBV-295,-a-Long-Acting-Amylin-Analog,-in-Adults (2026-03-09) |
| met-233i | `MET-233i amylin monthly` | amylin | Pfizer (ex-Metsera) once-monthly amylin analog, Phase 1; combination Phase 1/2 with MET-097i | Alias gap on `pfizer-metsera-engineered-peptide` | https://www.biospace.com/press-releases/metsera-announces-positive-phase-1-data-of-first-in-class-once-monthly-amylin-candidate-met-233i |
| aul016 | `AUL016 아울바이오 터제파타이드` | tirzepatide | Aul Bio monthly tirzepatide microsphere (ExTenna) | Alias gap on `owlbio-kyungdong-xtina` | https://biz.heraldcorp.com/article/10772806 (2026-06-16) |
| aul018 | `AUL018 아울바이오 세마글루타이드 3개월` | semaglutide | Aul Bio every-3-months semaglutide microsphere; government-funded project to Phase 1, running to Dec 2028 | Alias gap on `owlbio-kyungdong-xtina` | https://www.asiae.co.kr/article/2026080613565692782 (2026-08-06) |
| pt404 | `PT404 펩트론 터제파타이드` | tirzepatide | Peptron SmartDepot tirzepatide, preclinical, ~70-day release in minipigs; may have stalled after the July 2026 statement that tirzepatide is outside the Lilly work | Alias gap on `peptron-pt403` | https://diabetesjournals.org/diabetes/article/72/Supplement_1/781-P/149936/ (ADA 2023) |
| dw-4321 | `DW-4321 대원제약` | other_incretin | Daewon four-target agonist, preclinical, monthly potential | Alias gap on `daewon-pharmus-quadagonist` | https://www.etoday.co.kr/news/view/2592271 (2026-06-15) |
| lilly-camurus | `Lilly Camurus FluidCrystal amylin triple agonist` | tirzepatide / retatrutide / amylin | Lilly–Camurus FluidCrystal deal covering a GLP-1/GIP dual, a triple agonist and an amylin agonist (amylin option exercised 2026-06-02) | Deal not captured as its own program | https://allsci.com/news/licensing-deals/eli-lilly-expands-camurus-fluidcrystal-collaboration-to-amylin-receptor-agonists-usd-870m-deal/ (2026-06-02) |
| alteogen-monthly | `알테오젠 월 1회 비만 플랫폼` | undetermined | Alteogen ultra-long-acting monthly protein platform, preclinical; molecule undisclosed, retatrutide only as comparator (so no class yet) | Untracked program | https://www.paxetv.com/news/articleView.html?idxno=261222 (2026-02-09) |
| biote-cn121154792a | `CN121154792A 替尔泊肽` | tirzepatide | Beijing Biote in-situ gel tirzepatide, 28+ days in vitro; patent only | Untracked program | https://patents.google.com/patent/CN121154792A/zh (published 2025-12-19) |
| yuhan-ivl3021 | `유한양행 인벤티지랩 IVL3021` | semaglutide | Yuhan as InventageLab's IVL3021 partner | Partner alias gap on `inventagelab-ivl3021` | https://biz.heraldcorp.com/article/10760770 (2026-06-01) |

### Seen but not queued (too thin)

- Lilly monthly candidate with SK pharmteco making clinical-trial drug substance: only industry *speculation* that it is tirzepatide-class. https://www.newswhoplus.com/news/articleView.html?idxno=56426 (2026-03-10)
