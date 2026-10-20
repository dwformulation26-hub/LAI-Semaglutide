"""Product-level reference data carried over from the original Presbyopia Dashboard (June 2026),
with corrections/updates applied from the Oct 2026 research refresh."""

DRUGS = {
    "VUITY": {
        "brand":"VUITY®","generic":"Pilocarpine hydrochloride ophthalmic solution 1.25%",
        "company":"Allergan / AbbVie","approval_status":"FDA Approved",
        "approval_date":"October 29, 2021","approval_note":"First-ever FDA-approved presbyopia eye drop",
        "nda_number":"NDA 214028","application_type":"NDA — 505(b)(1)","rx_type":"Prescription (Rx only)",
        "active_ingredient":"Pilocarpine hydrochloride","concentration":"1.25% (12.5 mg/mL)",
        "free_base_equivalent":"1.06% (10.6 mg/mL) pilocarpine free-base",
        "iupac":"(3S,4R)-3-ethyl-4-[(1-methyl-1H-imidazol-5-yl)methyl]oxolan-2-one hydrochloride",
        "molecular_formula":"C₁₁H₁₆N₂O₂ · HCl","molecular_weight":"244.72 g/mol",
        "drug_class":"Cholinergic muscarinic M3 receptor agonist (partial)",
        "moa":("Partial M3 muscarinic receptor agonist. Activates M3 on iris sphincter → miosis (pinhole effect). "
               "Simultaneously activates M3 on ciliary muscle → zonule relaxation → lens thickening → accommodation. "
               "Partial-agonist ceiling self-limits spasm risk compared to carbachol."),
        "technology":"pH-buffered low-viscosity isotonic solution; BAK-preserved multi-dose bottle",
        "dosing":"1 drop each eye once daily. Second dose possible 3–6 h after first. Separate from other drops by ≥5 min.",
        "dosage_form":"2.5 mL multi-dose bottle","onset":"As early as 15 min","duration":"Up to 6 hours",
        "storage":"Room temperature 15–25°C","preservative":"BAK 0.0075%","ph_range":"3.5–5.5",
        "excipients":[
            {"name":"Benzalkonium chloride (BAK) 0.0075%","role":"Preservative",
             "function":"Antimicrobial for multi-dose bottle. Disrupts microbial cell membranes. Lowest BAK concentration among BAK-preserved ophthalmic products; risk of chronic corneal epithelial toxicity with long-term daily use."},
            {"name":"Boric acid","role":"Buffer",
             "function":"Maintains pH 3.5–5.5 preventing pilocarpine hydrolysis to inactive isopilocarpine. Mild antimicrobial."},
            {"name":"Sodium citrate dihydrate","role":"Buffer / Chelating",
             "function":"Chelates divalent metal ions (Ca²⁺, Fe²⁺) that catalyze oxidative degradation. Softens acidity sting on instillation."},
            {"name":"Sodium chloride","role":"Tonicity agent",
             "function":"Adjusts osmolality to ~280–320 mOsm/kg. Minimises instillation discomfort."},
            {"name":"Purified water","role":"Vehicle","function":"Aqueous vehicle, USP grade."},
            {"name":"HCl / NaOH","role":"pH adjuster","function":"Titrates final pH to 3.5–5.5 during manufacturing."},
        ],
        "key_trials":[
            {"name":"GEMINI 1 (Phase 3)","citation":"Waring GO et al. JAMA Ophthalmol. 2022;140:363–371",
             "design":"RCT, double-masked, vehicle-controlled, 30 days, n=354",
             "primary_endpoint":"≥3-line mesopic DCNVA gain + <5-letter BCDVA loss",
             "result":"~26% achieved ≥3-line gain vs ~9% vehicle. Onset Day 1. Peak ~1h. Duration up to 6h."},
            {"name":"GEMINI 2 (Phase 3)","citation":"Confirmatory — supported NDA submission",
             "design":"Identical design to GEMINI 1","primary_endpoint":"Same composite endpoint",
             "result":"Confirmed GEMINI 1 results. Both trials supported FDA approval Oct 2021."},
        ],
        "efficacy_summary":"~26% ≥3-line mesopic DCNVA gain vs ~9% vehicle. Onset 15 min, peak ~1h, duration up to 6h. Distance vision preserved.",
        "side_effects":[
            ("Headache / brow ache",">5%","Rapid ciliary muscle contraction (spasm). Most common discontinuation reason."),
            ("Conjunctival hyperemia",">5%","Cholinergic-mediated vasodilation."),
            ("Blurred vision","Common","Transient; shortly after instillation."),
            ("Dim / dark vision","Common","Miosis reduces light entry; worse in low-light settings."),
            ("Myopic shift","Up to −1.75 D","Over-accommodation; temporary distance blurring."),
            ("Retinal detachment / tear","Rare","Case reports post-approval. Higher risk in myopes. Retinal exam recommended before initiating therapy."),
        ],
        "contraindications":"Known hypersensitivity. Caution: iritis, narrow anterior chamber angle, history of retinal disease.",
    },
    "QLOSI": {
        "brand":"QLOSI™","generic":"Pilocarpine hydrochloride ophthalmic solution 0.4%",
        "company":"Orasis Pharmaceuticals / Optus Pharma (Korea)","approval_status":"FDA Approved",
        "approval_date":"October 16, 2023","approval_note":"Second approved; lowest-concentration pilocarpine; PF unit-dose. Korea: license Oct 2025 (₩24B), MFDS NDA not yet filed.",
        "nda_number":"NDA 215962","application_type":"NDA — 505(b)(1)","rx_type":"Prescription (Rx only)",
        "active_ingredient":"Pilocarpine hydrochloride","concentration":"0.4% (4 mg/mL)",
        "free_base_equivalent":"~0.34% pilocarpine free-base",
        "iupac":"(3S,4R)-3-ethyl-4-[(1-methyl-1H-imidazol-5-yl)methyl]oxolan-2-one hydrochloride",
        "molecular_formula":"C₁₁H₁₆N₂O₂ · HCl","molecular_weight":"244.72 g/mol",
        "drug_class":"Cholinergic muscarinic M3 receptor agonist (partial, low-dose)",
        "moa":("Same M3 agonism as Vuity but 0.4% concentration. Sits below the ciliary spasm threshold while above "
               "the miosis efficacy threshold. Polysorbate 80 enhances corneal penetration at this low concentration. "
               "PRN use possible — designed for on-demand dosing."),
        "technology":"Low-dose miotic; PF unit-dose vial; polysorbate 80 penetration enhancer system",
        "dosing":"1 drop each eye once daily or as needed. Single-use vial — discard after use.",
        "dosage_form":"0.3 mL PF unit-dose vials","onset":"Within 30 min","duration":"Up to 8 hours",
        "storage":"Room temperature 15–30°C","preservative":"None (PF)","ph_range":"~5.0–5.5",
        "excipients":[
            {"name":"Polysorbate 80","role":"Solubilizer / Penetration enhancer",
             "function":"Enhances corneal penetration at low pilocarpine concentration by loosening tight junctions and improving drug partitioning into corneal lipid layers. Critical for maintaining efficacy at 0.4%."},
            {"name":"Boric acid","role":"Buffer",
             "function":"Maintains acidic pH (5.0–5.5) stabilising pilocarpine against hydrolysis."},
            {"name":"Mannitol","role":"Tonicity agent / Stabiliser",
             "function":"Provides isotonicity without chloride ions. Avoids chloride-catalysed pilocarpine oxidation. Also mild antioxidant."},
            {"name":"Sodium chloride","role":"Tonicity co-agent","function":"Fine-tunes osmolality to physiological range."},
            {"name":"HCl / NaOH","role":"pH adjuster","function":"Titrates to pH 5.0–5.5."},
            {"name":"Water for injection","role":"Vehicle","function":"USP WFI — highest purity for sterile PF unit-dose."},
        ],
        "key_trials":[
            {"name":"NEAR-1 & NEAR-2 (Phase 3)","citation":"Holland E et al. Clin Ther. 2024;46:104–113",
             "design":"Two multicenter, double-masked, vehicle-controlled trials. Oct 2020–Feb 2022. 35 US sites.",
             "primary_endpoint":"≥3-line mesopic DCNVA + <5-letter BCDVA loss",
             "result":"Both trials met primary and secondary endpoints. Duration up to 8h. Lower brow ache vs 1.25% formulations."},
        ],
        "efficacy_summary":"Both NEAR-1 and NEAR-2 met primary endpoints. Duration up to 8h. Lower side effect burden vs Vuity due to reduced concentration.",
        "side_effects":[
            ("Headache / brow ache","Lower than Vuity","Reduced ciliary spasm at 0.4%."),
            ("Dim vision","Common (class)","Miosis reduces light entry."),
            ("Eye irritation","Mild","Less than BAK-preserved products."),
            ("Myopic shift","Reduced vs Vuity","Less ciliary stimulation."),
            ("Retinal detachment","Rare (class warning)","Retained for all miotics."),
        ],
        "contraindications":"Known hypersensitivity. Caution: iritis, narrow angle, retinal disease.",
    },
    "VIZZ": {
        "brand":"VIZZ™","generic":"Aceclidine ophthalmic solution 1.44%",
        "company":"LENZ Therapeutics (Nasdaq: LENZ)","approval_status":"FDA Approved",
        "approval_date":"July 31, 2025","approval_note":"First FDA-approved aceclidine; first once-daily drop with ≤10h efficacy; new chemical entity (NCE). Korea: Alvogen Korea license May 2025, MFDS NDA filed Dec 2025.",
        "nda_number":"NDA 218585","application_type":"NDA — 505(b)(1) — NCE","rx_type":"Prescription (Rx only)",
        "active_ingredient":"Aceclidine hydrochloride (≡ 1.44% aceclidine)","concentration":"1.75% aceclidine HCl (17.82 mg/mL)",
        "free_base_equivalent":"1.44% aceclidine (14.4 mg/mL)",
        "iupac":"3-Acetoxyquinuclidine hydrochloride (3-Quinuclidinyl Acetate Hydrochloride)",
        "molecular_formula":"C₉H₁₅NO₂ · HCl","molecular_weight":"205.68 g/mol",
        "drug_class":"Iris-selective cholinergic muscarinic M3 agonist (pupil-selective miotic)",
        "moa":("Aceclidine binds M3 receptors with preferential selectivity for iris sphincter over ciliary muscle. "
               "Stronger/longer pupil constriction (sub-2mm) than pilocarpine with markedly less ciliary stimulation. "
               "Hypromellose extends ocular surface residence time → 10h duration. No myopic shift, minimal brow ache."),
        "technology":"Iris-selective NCE; viscous solution with hypromellose for extended contact time; refrigerated PF unit-dose",
        "dosing":"1 drop each eye once daily. Effect within 30 min. Discard single-use vial after use.",
        "dosage_form":"PF unit-dose vials (refrigerated)","onset":"Within 30 min","duration":"Up to 10 hours",
        "storage":"Refrigerated 2–8°C. Do not freeze.","preservative":"None (PF)","ph_range":"4.5–5.5",
        "excipients":[
            {"name":"Polysorbate 80","role":"Solubilizer / Wetting",
             "function":"Solubilises aceclidine HCl, enhances corneal penetration. Wetting agent improving drug-ocular surface contact."},
            {"name":"Mannitol","role":"Tonicity / Stabiliser",
             "function":"Primary tonicity agent (~280–320 mOsm/kg). Lower metal ion-catalysed degradation risk vs NaCl. Mild antioxidant."},
            {"name":"Hypromellose (HPMC)","role":"Viscosity / Bioadhesive",
             "function":"KEY efficacy excipient. Increases viscosity (~15–25 cP), slows nasolacrimal drainage → extended ocular surface residence time → major contributor to 10h duration advantage. Also lubricates."},
            {"name":"Edetate disodium (EDTA·2Na)","role":"Chelating / Penetration aid",
             "function":"Sequesters divalent metals (Ca²⁺, Fe²⁺) preventing oxidative degradation. Chelates Ca²⁺ from tight junctions → increased corneal permeability."},
            {"name":"Sodium citrate dihydrate","role":"Buffer",
             "function":"Citrate buffer maintains pH 4.5–5.5. Better tolerated than phosphate at equivalent molarity."},
            {"name":"HCl / NaOH","role":"pH adjuster","function":"Titrates to 4.5–5.5. Aceclidine (pKa ~9.5) most stable at acidic pH."},
            {"name":"Water for injection","role":"Vehicle","function":"USP WFI for sterile PF unit-dose."},
        ],
        "key_trials":[
            {"name":"CLARITY 1 (Phase 3)","citation":"NCT05656027 · n=466 · 42 days",
             "design":"RCT, double-masked, vehicle-controlled, once daily, multicenter",
             "primary_endpoint":"≥3-line mesopic DCNVA + <5-letter BCDVA loss",
             "result":"Met all primary & secondary endpoints (p<0.0001). 71% gained ≥3 lines at 30 min and 3h. 40% maintained at 10h."},
            {"name":"CLARITY 2 (Phase 3)","citation":"NCT06045299 · n=466 · 42 days",
             "design":"Confirmatory RCT, double-masked, vehicle-controlled",
             "primary_endpoint":"Same composite","result":"All endpoints met. 70–75% pooled ≥3-line vs ~10–15% vehicle. No serious treatment-related AEs in 30,000+ treatment days."},
            {"name":"CLARITY 3 (6-month safety)","citation":"NCT05753189 · n=217",
             "design":"Open-label 6-month safety extension","primary_endpoint":"Long-term safety",
             "result":"Well-tolerated at 6 months. No tachyphylaxis. Sustained efficacy confirmed."},
        ],
        "efficacy_summary":"70–75% ≥3-line DCNVA gain vs ~10–15% vehicle. Onset 30 min. Duration up to 10h — longest approved. No myopic shift. No serious AEs in 30,000+ treatment days.",
        "side_effects":[
            ("Instillation site irritation","~20%","Transient, mild, self-resolving. Related to acidic pH."),
            ("Dim vision","~16%","Miosis reduces light entry; expected class effect."),
            ("Headache","~13%","Significantly lower than pilocarpine; minimal ciliary stimulation."),
            ("Eye redness","Low","Minimal hyperemia."),
            ("Myopic shift","Minimal to none","Iris-selective mechanism avoids significant ciliary stimulation."),
        ],
        "contraindications":"Known hypersensitivity to aceclidine or excipients. Caution: iritis, narrow anterior chamber angle.",
    },
    "YUVEZZI": {
        "brand":"YUVEZZI™","generic":"Carbachol 2.75% / Brimonidine tartrate 0.1% ophthalmic solution",
        "company":"Tenpoint Therapeutics / Kwangdong Pharma (Korea)","approval_status":"FDA Approved",
        "approval_date":"January 28, 2026","approval_note":"First FDA-approved dual-agent FDC for presbyopia. Korea: Kwangdong license Jan 2024, MFDS NDA filed Sep 2025 — first presbyopia NDA in Korea.",
        "nda_number":"NDA 218124","application_type":"NDA — 505(b)(2) — Fixed-dose combination","rx_type":"Prescription (Rx only)",
        "active_ingredient":"Carbachol 2.75% + Brimonidine tartrate 0.1%",
        "concentration":"Carbachol: 27.5 mg/mL (2.75%) | Brimonidine tartrate: 1.0 mg/mL (0.1%)",
        "free_base_equivalent":"N/A (marketed as salts)",
        "iupac":("Carbachol: 2-[(Aminocarbonyl)oxy]-N,N,N-trimethylethanaminium chloride\n"
                 "Brimonidine tartrate: 5-Bromo-N-(4,5-dihydro-1H-imidazol-2-yl)quinoxalin-6-amine L-tartrate"),
        "molecular_formula":"Carbachol: C₆H₁₅ClN₂O₂ (MW 182.65) | Brimonidine tartrate: C₁₁H₁₀BrN₅·C₄H₆O₆ (MW 442.24)",
        "molecular_weight":"Carbachol: 182.65 g/mol | Brimonidine tartrate: 442.24 g/mol",
        "drug_class":"FDC: Full muscarinic+nicotinic agonist (carbachol) + presynaptic α2-adrenergic agonist (brimonidine)",
        "moa":("CARBACHOL (full M3+nicotinic agonist): Directly contracts iris sphincter → strong miosis. Contracts ciliary muscle → accommodation. "
               "Full agonism gives stronger, longer miosis than pilocarpine.\n\n"
               "BRIMONIDINE (presynaptic α2 agonist): Blocks α2 receptors at iris dilator nerve terminals → inhibits NE release → "
               "dilator silenced. Also (1) relaxes tonic ciliary tension → reduces carbachol brow ache, (2) vasoconstricts conjunctiva → "
               "reduces redness (2.8% vs 10.7% carbachol alone), (3) increases cholinergic bioavailability in aqueous ~50%.\n\n"
               "Net: stronger sustained miosis than either drug alone, lower side effects than carbachol monotherapy."),
        "technology":"Dual-pathway FDC; parasympathetic (M3) + sympathetic (α2) simultaneous targeting; PF unit-dose",
        "dosing":"1 drop each eye once daily. Single-use vial — discard after opening.",
        "dosage_form":"0.3 mL PF unit-dose vials","onset":"30–60 min","duration":"Up to 8 hours",
        "storage":"Room temperature 20–25°C. Protect from light.","preservative":"None (PF)","ph_range":"~6.5–7.5",
        "excipients":[
            {"name":"Sodium chloride","role":"Tonicity agent",
             "function":"Adjusts osmolality (~280–320 mOsm/kg). Both APIs are stable in isotonic NaCl solution."},
            {"name":"Sodium phosphate monobasic","role":"Buffer",
             "function":"Maintains pH 6.5–7.5 where both carbachol and brimonidine tartrate are chemically stable. Phosphate buffer well-tolerated ophthalmically."},
            {"name":"HCl / NaOH","role":"pH adjuster","function":"Fine-tunes pH. Carbachol stable at pH 5–8; brimonidine at pH 6–8. pH chosen to satisfy both APIs."},
            {"name":"Water for injection","role":"Vehicle","function":"USP WFI for sterile PF unit-dose."},
        ],
        "key_trials":[
            {"name":"BRIO-I (Phase 3 — combination superiority)","citation":"NCT05270863 · Tenpoint Therapeutics",
             "design":"3-arm RCT: YUVEZZI vs carbachol alone vs brimonidine alone",
             "primary_endpoint":"Combination superiority over each active monotherapy (FDA FDC requirement)",
             "result":"YUVEZZI superior to both individual active components. Met FDA combination superiority requirement."},
            {"name":"BRIO-II (Phase 3 — 12-month safety)","citation":"NCT05270876 · 72,000+ treatment days",
             "design":"Vehicle-controlled, 12-month — longest presbyopia safety study to date",
             "primary_endpoint":"≥3-line BUNVA improvement; 12-month safety",
             "result":"All near vision endpoints met sustained over 8h. Hyperemia 2.8% vs 10.7% carbachol alone. No serious AEs in 72,000+ treatment days."},
        ],
        "efficacy_summary":"Superior to both monotherapies. ≥3-line BUNVA over 8h sustained. Lowest hyperemia (2.8%). 72,000+ treatment-day safety dataset — most extensive in category.",
        "side_effects":[
            ("Ocular hyperemia","2.8% — lowest of all drops","Brimonidine vasoconstriction offsets carbachol hyperemia."),
            ("Brow ache / headache","Reduced vs carbachol alone","Brimonidine dampens carbachol ciliary spasm."),
            ("Dim vision","Common (class)","Expected."),
            ("Myopic shift","Possible, reduced","Brimonidine's ciliary relaxation partially offsets carbachol-driven shift."),
            ("Dry mouth (brimonidine)","Uncommon","α2 effect on salivary glands; low risk at 0.1%."),
            ("CNS / hypotension","Rare at 0.1%","Monitor in elderly or antihypertensive users."),
            ("Young children","CONTRAINDICATED","Brimonidine crosses immature blood-brain barrier → CNS depression."),
        ],
        "contraindications":"Known hypersensitivity. CONTRAINDICATED in young children. Caution: antihypertensives, MAO inhibitors, iritis.",
    },
    "RYZUMVI": {
        "brand":"Ryzumvi®","generic":"Phentolamine mesylate ophthalmic solution 0.75%",
        "company":"Viatris / Opus Genetics","approval_status":"FDA Approved (mydriasis reversal) | Presbyopia: sNDA under review",
        "approval_date":"Sep 25, 2023 (mydriasis) | Presbyopia PDUFA: Oct 17, 2026",
        "approval_note":"Approved for mydriasis reversal (NDA 217064). sNDA for presbyopia accepted Feb 25, 2026 — PDUFA Oct 17, 2026. Same formulation; indication expansion only.",
        "nda_number":"NDA 217064","application_type":"NDA — 505(b)(2) (original); sNDA (presbyopia indication expansion)","rx_type":"Prescription (Rx only)",
        "active_ingredient":"Phentolamine mesylate","concentration":"0.75% (10 mg/mL mesylate ≡ 7.5 mg/mL free base)",
        "free_base_equivalent":"0.75% phentolamine free-base",
        "iupac":"3-[[(4,5-Dihydro-1H-imidazol-2-yl)methyl](4-methylphenyl)amino]phenol methanesulfonate",
        "molecular_formula":"C₁₇H₁₉N₃O · CH₃SO₃H (mesylate) | C₁₇H₁₉N₃O (free base)",
        "molecular_weight":"377.46 g/mol (mesylate) | 281.36 g/mol (free base)",
        "drug_class":"Non-selective α1/α2-adrenergic antagonist (alpha-blocker)",
        "moa":("PRIMARY — α1 postsynaptic blockade at iris dilator: Blocks α1 receptors on iris dilator → dilator cannot contract → "
               "sphincter acts unopposed → passive pupil constriction. NO direct sphincter activation. NO ciliary muscle involvement.\n\n"
               "SECONDARY — α2 blockade at sphincter: Blocks inhibitory α2 on sphincter → releases brake → adds indirect sphincter activation.\n\n"
               "CONSEQUENCE: No brow ache (no ciliary spasm), no myopic shift (no ciliary contraction), no retinal traction risk. "
               "Effect lasts up to 20h from a single EVENING dose."),
        "technology":"α1/α2 antagonist; ultra-minimalist PF formulation with nitrogen overlay to prevent oxidation; evening dosing; refrigerated",
        "dosing":"1 drop each eye once daily IN THE EVENING. 20h duration covers following morning/day. Nasolacrimal duct occlusion recommended.",
        "dosage_form":"0.31 mL PF unit-dose vials (5 per foil pouch, 6 pouches per carton)","onset":"60–90 min after evening instillation","duration":"Up to 20 hours",
        "storage":"Refrigerated 2–8°C. After opening pouch: up to 25°C for 14 days. Do not freeze.","preservative":"None (PF)","ph_range":"4.5–5.5",
        "excipients":[
            {"name":"Mannitol","role":"Tonicity / Antioxidant",
             "function":"Primary tonicity agent. CRITICAL: used instead of NaCl because chloride ions catalyse phentolamine oxidation. Mannitol also acts as mild hydroxyl radical scavenger — secondary antioxidant function preserving potency."},
            {"name":"Sodium acetate trihydrate","role":"Buffer",
             "function":"Acetate buffer maintains pH 4.5–5.5 where phentolamine is most chemically stable. Low-molarity acetate (5–25 mM) minimises instillation sting while providing adequate pH control."},
            {"name":"HCl / NaOH","role":"pH adjuster","function":"Titrates to 4.5–5.5 satisfying acetate buffer range and phentolamine stability simultaneously."},
            {"name":"Water for injection","role":"Vehicle","function":"Metal-ion free USP WFI — critical given phentolamine's metal-catalysed oxidation sensitivity."},
            {"name":"Nitrogen gas (headspace)","role":"Antioxidant atmosphere",
             "function":"UNIQUE FEATURE — vial headspace filled with nitrogen before sealing. Eliminates dissolved oxygen preventing phentolamine air oxidation. Only approved ophthalmic drug with this feature. Explains why unit-dose format is required: once opened, nitrogen atmosphere is lost."},
        ],
        "key_trials":[
            {"name":"VEGA-3 (Phase 3 presbyopia — primary pivotal)","citation":"Viatris/Opus Genetics · n=545 · 40 US sites",
             "design":"RCT, double-masked, placebo-controlled, once-daily EVENING dose, 6-week + 48-week safety follow-up",
             "primary_endpoint":"≥3-line DCNVA + <5-letter BCDVA loss at 12h post-dose, Day 8",
             "result":"MET: 27.2% vs 11.5% placebo (p<0.0001). Secondary: 20.6% vs 6.1% at 1h Day 1 (p=0.0002). Patient-reported outcomes significant at Days 3, 8, Week 6. No serious treatment-related AEs. No tachyphylaxis at 6 weeks."},
            {"name":"VEGA-2 (Phase 3 presbyopia — second pivotal)","citation":"n=333, ages 40–64",
             "design":"Phase 3 with phentolamine ± adjunctive pilocarpine arm","primary_endpoint":"Near VA improvement",
             "result":"Met primary endpoint. Phentolamine alone and with low-dose pilocarpine both significantly improved near VA."},
            {"name":"MIRA-2 + MIRA-3 (Phase 3 — mydriasis reversal, approved)","citation":"n=553 combined, age 12–80",
             "design":"Two pivotal RCTs for mydriasis reversal","primary_endpoint":"Return to baseline pupil at 60 and 90 min",
             "result":"Both met. Supported NDA 217064 approval Sep 2023. Established safety infrastructure for sNDA."},
        ],
        "efficacy_summary":("VEGA-3: 27.2% ≥3-line DCNVA at 12h Day 8 vs 11.5% placebo (p<0.0001). Evening dose provides up to 20h near vision — effect present on waking. No brow ache. No myopic shift. "
                            "NOTE: Presbyopia indication NOT YET APPROVED — PDUFA October 17, 2026."),
        "side_effects":[
            ("Systemic hypotension","Low risk at ophthalmic dose","α-blockade lowers BP; caution with antihypertensives. Nasolacrimal occlusion recommended."),
            ("Dim vision at night","Possible","Miosis reduces light; minimised by evening dosing (patient asleep during peak)."),
            ("Uveitis — CONTRAINDICATED","Absolute","Risk of synechiae in inflamed eyes."),
            ("Reflex tachycardia","Rare","Compensatory HR increase from α-blockade."),
            ("Refrigeration requirement","Compliance concern","Only presbyopia drug requiring cold-chain storage."),
        ],
        "contraindications":"Known hypersensitivity. Active uveitis/iritis. Caution: antihypertensives, cardiac conditions, MAO inhibitors. PRESBYOPIA USE INVESTIGATIONAL — PDUFA Oct 17, 2026.",
    },
}

DRUG_COLORS = {"VUITY":"#534AB7","QLOSI":"#0F6E56","VIZZ":"#BA7517","YUVEZZI":"#185FA5","RYZUMVI":"#A32D2D"}
DRUG_ORDER  = ["VUITY","QLOSI","VIZZ","YUVEZZI","RYZUMVI"]

# ─────────────────────────────────────────────
# NONCLINICAL / CLINICAL PK·PD STUDIES
# ─────────────────────────────────────────────
PKPD_STUDIES = [
    {"drug":"Pilocarpine","study":"28-day GLP ocular toxicology",
     "model":"NZW rabbit · 5–7/sex/group · BID × 28 days",
     "endpoint":"Ocular safety (Draize); histopathology; iris response",
     "result":"NOAEL = 1.0% pilocarpine BID. Slow iris responses observed at NOAEL — non-adverse and reversible. No histopathological findings at any dose.",
     "ref":"https://cdn.clinicaltrials.gov/large-docs/15/NCT02780115/Prot_001.pdf",
     "ref_short":"NCT02780115 Protocol"},
    {"drug":"Pilocarpine","study":"Single-dose ocular PK",
     "model":"Dutch-belted rabbit · Single bilateral dose · Fixed vs unfixed combo",
     "endpoint":"Ocular PK: Cmax, Tmax, AUC in aqueous humor and iris/ciliary body",
     "result":"Comparable ocular PK between fixed-combination and unfixed sequential dosing. Supports safety of 1.5% pilocarpine without hypromellose.",
     "ref":"https://cdn.clinicaltrials.gov/large-docs/15/NCT02780115/Prot_001.pdf",
     "ref_short":"NCT02780115 Protocol"},
    {"drug":"Pilocarpine","study":"Ocular tissue PK",
     "model":"NZW rabbit tolerability + PK arms · Single topical dose",
     "endpoint":"Pilocarpine detectability: aqueous humor, iris, lens; Draize scoring",
     "result":"Pilocarpine detectable in ocular tissues up to 8h post-dose. No corneal, iridial, or conjunctival adverse effects. Tmax ~0.5h in aqueous humor.",
     "ref":"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12629135/",
     "ref_short":"PMC12629135"},
    {"drug":"Pilocarpine","study":"Accommodation PD model",
     "model":"Young adult rhesus monkey · Topical 0.5% pilocarpine ± oxymetazoline",
     "endpoint":"Pupil diameter; accommodative amplitude (refractometry); time to peak accommodative response",
     "result":"0.5% pilocarpine caused measurable decrease in pupil size and increase in accommodative amplitude. Co-admin with oxymetazoline delayed time to peak accommodative response.",
     "ref":"https://cdn.clinicaltrials.gov/large-docs/28/NCT02595528/Prot_001.pdf",
     "ref_short":"NCT02595528 Protocol"},
    {"drug":"Pilocarpine","study":"Systemic PK — Vuity NDA (clinical)",
     "model":"Human n=22 presbyopes · 1 drop/eye QD × 30 days",
     "endpoint":"Plasma Cmax, AUC₀₋τ,ss, Tmax, t½ at steady state",
     "result":"Cmax,ss = 1.95 ng/mL; AUC₀₋τ,ss = 4.14 ng·hr/mL; median Tmax = 0.3h; t½ ~3–4h. Systemic exposure very low — not expected to contribute to efficacy or toxicity.",
     "ref":"https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/214028Orig1s003lbl.pdf",
     "ref_short":"FDA Label NDA 214028"},
    {"drug":"Brimonidine","study":"Comparative ocular PK",
     "model":"Albino rabbit + Dutch-belted (pigmented) · Single 35µL drop 0.5% ¹⁴C-brimonidine",
     "endpoint":"Aqueous humor Cmax, Tmax; iris-ciliary body concentration over time; melanin binding",
     "result":"Aqueous Cmax: 2.16 µg/mL (albino) vs 1.52 µg/mL (pigmented) at Tmax 0.67h. Aqueous t½ ~1h (albino). Pigmented iris-ciliary body: peak 20.1 µg-eq/g at 1.5h; terminal t½ = 160h (melanin depot effect).",
     "ref":"https://pubmed.ncbi.nlm.nih.gov/7587958/",
     "ref_short":"PMID 7587958"},
    {"drug":"Brimonidine","study":"Tissue distribution",
     "model":"Monkey, rabbit, rat · Single + multiple doses · 0.2% and 0.5% topical",
     "endpoint":"Drug concentration in cornea, aqueous humor, iris-ciliary body, vitreous, retina/choroid, optic nerve; radioactivity by tissue type",
     "result":"Higher and more prolonged drug levels in pigmented vs non-pigmented tissues across all species. Multiple dosing led to drug accumulation in pigmented tissues. Posterior segment levels adequate to activate α2 receptors without retinal vasoconstriction.",
     "ref":"https://pubmed.ncbi.nlm.nih.gov/11901096/",
     "ref_short":"PMID 11901096"},
    {"drug":"Brimonidine","study":"Selectivity pharmacology — receptor binding",
     "model":"In vitro receptor binding assays (multiple species tissues)",
     "endpoint":"α2 vs α1 binding selectivity ratio; comparison vs clonidine and apraclonidine",
     "result":"Brimonidine is 1,000× more selective for α2 vs α1. 7–12× more α2-selective than clonidine. 23–32× more selective than apraclonidine. Not mydriatic (unlike apraclonidine).",
     "ref":"https://www.sciencedirect.com/science/article/abs/pii/S0039625796820273",
     "ref_short":"ScienceDirect"},
    {"drug":"Brimonidine","study":"Systemic PK — Alphagan P label (clinical)",
     "model":"Human n=14 · Single drop 0.15%/eye",
     "endpoint":"Plasma Cmax, AUC₀₋∞, Tmax after single topical dose",
     "result":"Cmax = 73 ± 19 pg/mL; AUC₀₋∞ = 375 ± 89 pg·hr/mL; Tmax = 1.7 ± 0.7h. ~27× lower systemic exposure than pilocarpine on a mass basis.",
     "ref":"https://www.accessdata.fda.gov/drugsatfda_docs/label/2006/021262s018lbl.pdf",
     "ref_short":"FDA Label NDA 021262"},
    {"drug":"Carbachol + Brimonidine","study":"Nonclinical PK/PD of Brimochol — ARVO 2022",
     "model":"Dutch-belted rabbit · n=4/group · Single unilateral 35µL: Brimochol vs carbachol 2.75% alone vs PBS",
     "endpoint":"Pupil diameter by digital pupillometer under 4 lighting conditions (scotopic, low mesopic, high mesopic, photopic); carbachol concentration in iris/ciliary body",
     "result":"Brimochol sustained pupil reduction for 12h vs shorter duration with carbachol alone. Greater pupil reduction at all 4 lighting levels. Brimonidine increased carbachol concentration in iris/ciliary body (~50% higher AUC) — mechanistically explains enhanced and prolonged PD effect. Ocular tolerance profile also improved vs carbachol alone.",
     "ref":"https://iovs.arvojournals.org/article.aspx?articleid=2780074",
     "ref_short":"ARVO 2022 / IOVS"},
]

# ─────────────────────────────────────────────
# PATENT DATA
# ─────────────────────────────────────────────
PATENTS = [
    {"no":"US8299079","holder":"Visus Therapeutics (now Tenpoint)","status":"Active until 2030",
     "scope":"Method of treating presbyopia using parasympathomimetics (pilocarpine, carbachol) combined with alpha agonist (brimonidine 0.05–3.0%) — broad method-of-use claim.",
     "note":"Tenpoint now holds YUVEZZI + this foundational patent. May license, enforce, or both. Contact required before development.",
     "ref":"https://patents.google.com/patent/US8299079"},
    {"no":"US11857539","holder":"Somerset Therapeutics LLC","status":"Active until 2043",
     "scope":"Gel formulation — pilo >1% + brim 0.05–0.2% with polyethoxylated castor oil",
     "note":"","ref":"https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11857539"},
    {"no":"US11969410","holder":"Somerset Therapeutics LLC","status":"Active until 2043",
     "scope":"Low pH formulation — pH 3–5.5, pilo 1.15–3% + brim 0.05–0.18%, BAK 0.003–0.02%",
     "note":"","ref":"https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11969410"},
    {"no":"US12156868","holder":"Somerset Therapeutics LLC","status":"Active until 2043",
     "scope":"Solution formulation — pilo 1.15–2.5% + brim 0.05–0.18%, viscosity enhancer 0.1–1%",
     "note":"","ref":"https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12156868"},
    {"no":"WO2009/077736","holder":"Unknown","status":"Active until 2027–2028",
     "scope":"Combination of pilocarpine + brimonidine (or iopidine) for presbyopia, myopia, hypermetropia, low night vision. National phase status varies by country including Korea.",
     "note":"Check whether applied in Korean territory. Active time 1–2 years from now — inline with development timeline.",
     "ref":"https://patents.google.com/patent/WO2022103250A1"},
    {"no":"US8455494","holder":"Visus Therapeutics (now Tenpoint)","status":"Active until May 2030",
     "scope":"Brimonidine <0.2%; pilocarpine <0.5% or even <0.1%; also covers phentolamine as alpha antagonist. Continuation of US8299079 detailing chemical concentrations.",
     "note":"Explicit naming of very low pilocarpine concentrations (<0.1%) means Tenpoint IP potentially reaches micro-dose formulations that might otherwise seem safely distant from the claimed range.",
     "ref":"https://patents.google.com/patent/US8455494"},
]

# ─────────────────────────────────────────────
# MARKET DATA  (verified sources cited inline)
# ─────────────────────────────────────────────
MARKET_GLOBAL = {
    "total_treatment_2024": 10.17,   # Straits Research 2024
    "total_treatment_2033": 16.77,
    "total_cagr": 5.5,
    "eye_drops_2024": 1.31,          # Dataintelo 2024
    "eye_drops_2033": 2.86,
    "eye_drops_cagr": 9.2,
    "pharma_fastest_cagr": 12.8,     # Emergen Research
    "global_presbyopes_2024": 1.8,   # WHO / Fricke 2018 Ophthalmology meta-analysis
    "global_presbyopes_2030": 2.1,
    "apac_cagr": 11.2,
    "north_america_share_pct": 42,
    "europe_share_pct": 29,
    "apac_share_pct": 20,
    "row_share_pct": 9,
}

MARKET_KOREA = {
    # Derived from Statistics Korea 2024 population data + WHO presbyopia prevalence
    # Korea population 2024: ~51.7M (Statistics Korea / World Bank)
    # Population ≥40: approximately 58% of total = ~30M (UN World Population Prospects 2024)
    # WHO global presbyopia prevalence in 40+ pop: ~55–80% depending on study; conservative ~55% used
    # → 30M × 0.55 = ~16.5M; rounded to ~16–17M
    # This is a derived estimate — no single Korean epidemiological study has directly counted presbyopia patients
    "est_patients_derived": "~16–17M",
    "est_basis": ("Derived estimate: Korea population ≥40 years ~30M "
                  "(Statistics Korea 2024 / UN World Population Prospects 2024: "
                  "median age 46.2y, ~58% of 51.7M population aged ≥40). "
                  "Applied WHO global presbyopia prevalence ~55% in 40+ population "
                  "(Fricke TR et al. Ophthalmology. 2018;125:1492–1499). "
                  "No single peer-reviewed Korean-specific epidemiological study directly "
                  "reports the national presbyopia patient count as of 2026."),
    "market_2023": 411.7,   # Grand View Research / Horizon Databook (myopia+presbyopia combined)
    "market_2025": 631.63,  # Expert Market Research (EMR) — myopia+presbyopia combined
    "market_2030": 885.9,   # Grand View Research
    "market_2035": 1242.51, # EMR 2025 report
    "cagr_2024_2030": 11.6, # Grand View Research
    "cagr_2025_2035": 7.0,  # EMR
    "note_combined": "Korea market figures are for combined myopia + presbyopia treatment market. Presbyopia-only ophthalmic drop sub-segment is pre-commercial (no approved product as of June 2026).",
    "drivers": [
        "Super-aged society: >20% population ≥65 as of Dec 2024 (Statista 2024) — fastest aging in OECD",
        "Median age 46.2 years (Worldometer 2026) — presbyopia peak demographic",
        "Highest smartphone penetration globally → digital eye strain compounding demand",
        "High disposable income + willingness to spend on premium healthcare",
        "No approved presbyopia drop yet — virgin segment awaiting first MFDS approval",
    ],
    "approved_drops": 0,
    "ndas_under_review": 3,
    "expected_first_approval": "2026",
}
