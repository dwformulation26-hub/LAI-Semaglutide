# Korean copy — rules and glossary

Every text field the dashboard shows carries a Korean copy in a sibling `_ko` field
(see data-schema.md, "Korean copy"). This file fixes how that copy is written, so a
year of unattended runs produces one consistent Korean vocabulary instead of five.

## The rules

1. **English is the source of truth.** The Korean field is a faithful translation of
   the English field next to it — never a separate write-up from the source, even when
   the source itself is Korean. Write the English first, check it against the source,
   then translate the English.
2. **Same facts, nothing added, nothing dropped.** Keep every hedge the English has:
   "unverified", "reported", "expected", "planned", "not independently confirmed". A
   forward-looking English sentence stays forward-looking in Korean (예정, 계획, 목표).
3. **Numbers, codes and identifiers are copied character for character.** Doses,
   percentages, counts, dates' digits, drug codes, trial IDs, patent numbers and tickers
   appear in the Korean exactly as in the English. `scripts/build.mjs` fails the build
   when one is missing (see "What the build checks" below).
4. **Style:** Korean trade-press 기사체 (`~했다`, `~이다`, `~로 나타났다`), one or two
   sentences where the English has one or two. No honorific 합니다체.
5. **A wording fix to a Korean field may be edited in place**, because it doesn't change
   the fact. A change of fact goes into the English as a new finding, then into Korean.

## Keep in Latin script, exactly as written

- Development and program codes: `PT403`, `GB-7001`, `ASC30`, `SYH9017`, `LY3841136`
- Trial and patent identifiers: `NCT07722728`, `US12303606B2`, `KR102792620B1`
- Product brands and platform names: Ozempic, Vivitrol®, Sublocade®, SmartDepot™,
  FluidCrystal®, InnoLAMP™, NanoCIP, Atrigel®, LiquidGel™
- **Global company names:** Eli Lilly, Novo Nordisk, Pfizer, AstraZeneca, Camurus, Ipsen,
  Alkermes, Teva, MedinCell, Ascletis, CSPC, Hengrui, Bostal, Anxo — program names on the
  dashboard stay English, so company names inside the text match them
- Publications and sources: Korea Biomedical Review, Fierce Biotech, ClinicalTrials.gov
- Units: mg, mL, ng/mL, kg
- **Money in its original notation:** `$1.2B`, `$159.8M`, `KRW 373B`, `EUR 55M`,
  `€60M`. Don't convert to 억/조 — the build compares the digits.
- Half-year labels: `H1`, `H2` (e.g. `2026년 H1 매출`). Quarters may be written 3분기.
- Regulators and meetings keep their acronym: FDA, EMA, NMPA, CHMP, PDUFA, ADA, EASD,
  ObesityWeek. MFDS may be written 식약처.

## Korean companies — official Korean names

| English | Korean |
|---|---|
| Peptron | 펩트론 |
| InventageLab | 인벤티지랩 |
| G2GBio | 지투지바이오 |
| Samsung Bioepis | 삼성바이오에피스 |
| Daewoong Pharmaceutical | 대웅제약 |
| TionLab Therapeutics | 티온랩테라퓨틱스 |
| Daewon Pharmaceutical | 대원제약 |
| Pharmus Biosciences | 파머스 |
| Dongkook Pharmaceutical | 동국제약 |
| Genexine | 제넥신 |
| Handok | 한독 |
| Owl Bio / Aul Bio | 아울바이오 |
| Kyungdong Pharmaceutical | 경동제약 |
| Proteina | 프로티나 |
| Yuhan | 유한양행 |
| Korea BioNC | 한국비엔씨 |
| ProAptec | 프로앱텍 |
| Samchundang Pharmaceutical | 삼천당제약 |
| SpiderCore | 스파이더코어 |
| Alteogen | 알테오젠 |
| Celltrion | 셀트리온 |
| Hanmi Pharmaceutical | 한미약품 |

A Korean company not listed here: use the name it uses in Korean press, and propose the
row in the run report.

## Molecules (INN) — one spelling each

| English | Korean |
|---|---|
| semaglutide | 세마글루타이드 |
| tirzepatide | 터제파타이드 |
| retatrutide | 레타트루타이드 |
| liraglutide | 리라글루타이드 |
| cagrilintide | 카그릴린타이드 |
| amycretin | 아미크레틴 |
| eloralintide | 엘로랄린타이드 |
| petrelintide | 페트렐린타이드 |
| amylin | 아밀린 |
| leuprorelin / leuprolide | 류프로렐린 |
| octreotide | 옥트레오타이드 |
| lanreotide | 란레오타이드 |
| triptorelin | 트립토렐린 |
| goserelin | 고세렐린 |
| naltrexone | 날트렉손 |
| buprenorphine | 부프레노르핀 |
| bupropion | 부프로피온 |
| risperidone | 리스페리돈 |
| paliperidone | 팔리페리돈 |
| aripiprazole | 아리피프라졸 |
| olanzapine | 올란자핀 |
| cariprazine | 카리프라진 |
| donepezil | 도네페질 |
| glatiramer acetate | 글라티라머아세테이트 |
| somatropin | 소마트로핀 |
| somapacitan | 소마파시탄 |
| lonapegsomatropin | 로나페그소마트로핀 |
| eftansomatropin alfa | 에프탄소마트로핀 알파 |

Newer INNs without a settled Korean spelling stay in English: berobenatide, zenagamtide,
felcorekibart, ribupatide, zovaglutide, maridebart cafraglutide.

Classes: GLP-1 수용체 작용제 · GLP-1/GIP 이중 작용제 · GLP-1/GIP/글루카곤 삼중 작용제 ·
아밀린 유사체 · 소분자 GLP-1 작용제.

## Development and regulatory terms

| English | Korean |
|---|---|
| Research | 연구 |
| Preclinical | 전임상 |
| IND filed / IND submitted | IND 신청 |
| IND clearance / cleared | IND 승인 |
| Phase 1 / Phase I | 임상 1상 |
| Phase 1b / Phase Ib | 임상 1b상 |
| Phase I/IIa | 임상 1/2a상 |
| Phase 2 / Phase II | 임상 2상 |
| Phase 2/3 | 임상 2/3상 |
| Phase 3 / Phase III | 임상 3상 |
| pivotal trial | 허가용 임상(피보탈) |
| first patient / participant dosed | 첫 환자 투여 |
| topline results | 톱라인 결과 |
| recruiting | 모집 중 |
| not yet recruiting | 모집 전 |
| enrollment completed | 등록 완료 |
| registered (a trial) | 등록 |
| NDA / BLA | 신약허가신청(NDA) / 생물의약품허가신청(BLA) |
| MAA | 판매허가신청(MAA) |
| filed / under review | 허가 심사 중 |
| approved | 승인 |
| marketed / launched | 시판 / 출시 |
| CHMP positive opinion | CHMP 긍정 의견 |
| PDUFA date | PDUFA 목표일 |
| label expansion | 적응증 확대 |
| expanded access | 확대 접근 |
| generic entry | 제네릭 진입 |
| patent granted / issued | 특허 등록 |
| patent application filed | 특허 출원 |
| priority date | 우선일 |

## Formulation and deal terms

| English | Korean |
|---|---|
| long-acting injectable (LAI) | 장기지속형 주사제(LAI) |
| ultra-long-acting | 초장기 지속형 |
| depot | 데포 |
| microsphere | 미립구 |
| in-situ forming depot / gel | 체내 형성형 데포 / 인시투 겔 |
| implant | 임플란트 |
| nanocrystal suspension | 나노결정 현탁액 |
| extended-release | 서방형 |
| subcutaneous (SC) | 피하(SC) |
| intramuscular (IM) | 근육(IM) |
| once-daily / once-weekly | 1일 1회 / 주 1회 |
| once-monthly | 월 1회 |
| every 3 months / quarterly | 3개월 1회 |
| half-life | 반감기 |
| pharmacokinetics (PK) / pharmacodynamics (PD) | 약동학(PK) / 약력학(PD) |
| dose escalation | 용량 증량 |
| placebo-adjusted weight loss | 위약 대비 체중 감소율 |
| body-weight reduction | 체중 감소 |
| tolerability | 내약성 |
| comparator | 대조약 |
| license / licensing agreement | 기술이전(라이선스) 계약 |
| option agreement | 옵션 계약 |
| upfront payment | 계약금 |
| milestones | 마일스톤 |
| royalties | 로열티 |
| collaboration | 공동 개발 |
| Series A / B / C | 시리즈 A / B / C |
| convertible bond | 전환사채 |
| CDMO | CDMO |

## More terms (added from the 2026-09-14 translation of the registry)

| English | Korean |
|---|---|
| Epis NexLab | 에피스넥스랩 |
| Samsung Epis Holdings | 삼성에피스홀딩스 |
| Phase Ia / Phase 2a | 임상 1a상 / 임상 2a상 |
| Complete Response Letter (CRL) | 보완요구서한(CRL) |
| authorized generic | 위임 제네릭 |
| opioid use disorder (OUD) | 오피오이드 사용장애(OUD) |
| central precocious puberty (CPP) | 중추성 성조숙증 |
| growth hormone deficiency (GHD) | 성장호르몬 결핍증 |
| GIPR antagonist | GIPR 길항제 |
| leuprolide mesylate | 류프로렐린 메실산염 |
| aripiprazole lauroxil | 아리피프라졸 라우록실 |
| lonapegsomatropin-tcgd | 로나페그소마트로핀-tcgd |
| glatiramer | 글라티라머 |
| tacrolimus | 타크로리무스 |
| gentamicin / clindamycin | 겐타마이신 / 클린다마이신 |
| mid-2027 / end-2025 | 2027년 중반 / 2025년 말 |
| LG Chem | LG화학 |
| Chong Kun Dang | 종근당 |
| paliperidone palmitate | 팔리페리돈 팔미테이트 |
| triptorelin pamoate | 트립토렐린 파모에이트 |
| leuprolide acetate | 류프로렐린 아세테이트 |
| valproate | 발프로에이트 |
| supplemental NDA (sNDA) | 보충 신약허가신청(sNDA) |
| burst release | 초기 과다 방출(burst) |
| acromegaly | 말단비대증 |
| Noonan syndrome / Turner syndrome | 누난 증후군 / 터너 증후군 |
| small for gestational age (SGA) | 부당경량아 |
| idiopathic short stature | 특발성 저신장 |
| Chungnam National University Hospital | 충남대학교병원 |

Chinese companies and institutions (Zhuhai Huahaikang, Third Xiangya Hospital, Central
South University) stay in English. Amounts written with `₩` keep their original notation,
like any other currency.

Candidate rationale (`promotion_bar.evidence_ko`) is read only by the admin, so the
tracker's own vocabulary may appear there: umbrella → 엄브렐라, sweep → 스윕, fuzzy match →
퍼지 매칭, merge threshold → 병합 임계값, stage-bearing event → 개발 단계를 나타내는 이벤트.
The four promotion conditions: named_entity → 명확한 주체, technical_claim → 구체적 기술 근거,
confirmed_source → 확인된 출처, second_dated_event → 두 번째 날짜 이벤트.

## What the build checks

For every non-empty English field that has a Korean copy, `scripts/ko-check.mjs`:

- fails when the `_ko` field is missing or empty;
- fails when a development code from the English is not in the Korean exactly. A code is
  a token with two or more digits and an uppercase letter (`PT403`, `NCT07722728`,
  `GB-7001`) or a tracker id (`cand-2026-09-02-007`). `FY2026`, `Q3`, `H1` and lowercase
  prose like `mid-2027` are not codes;
- fails when a number from the English is not in the Korean. Thousands separators and
  leading zeros are ignored (`2024-06-03` matches 2024년 6월 3일), half-year labels are
  exempt, and digits inside a name (the 2 in G2GBio) don't count;
- fails when the English is four words or longer and the Korean contains no Hangul,
  which is what an accidentally copied English sentence looks like.
