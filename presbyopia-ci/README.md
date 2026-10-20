# Presbyopia Drop Intelligence · 노안 점안제 경쟁 인텔리전스

A static competitor-intelligence dashboard for pharmacological presbyopia eye drops, covering Korea and global competitors. It is available in English and Korean (EN / 한국어). It has no build step and no dependencies: `index.html`, `styles.css`, `i18n.js`, `app.js`, `data.json` (English) and `data.ko.json` (Korean).

## Language

The **EN / 한국어** switch in the header changes both the interface and every research record. The page remembers the choice per browser.

To share a link in a set language, add `?lang=ko` or `?lang=en`, for example `https://<your-app>.vercel.app/?lang=ko#korea`. Without a setting, Korean-language browsers open in Korean.

## Tabs

- **Overview**: headline numbers, a threat map, what has changed since the June 2026 build, takeaways, and US commercial traction.
- **Korea**: the race to the first MFDS approval, profiles of seven companies (Taejoon highlighted), licence chains and a timeline.
- **Competitors**: all 33 tracked assets, with filters, search, an expandable detail row per asset and a CSV export.
- **Products**: head-to-head duration and responder comparison, a positioning table, and deep-dives on the five FDA-approved drops (excipients, trials, safety, PK/PD).
- **Deals & IP**: a territory rights matrix, a deal log, patent and exclusivity runway, and IP notes.
- **Sources**: method, open questions, a full event log and a source index.

Every record carries source links and one of four confidence tags: Verified, Reported, Estimate or Unverified.

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import this GitHub repository.
2. Set **Root Directory** to `presbyopia-ci`. The framework preset is "Other", and you can leave the build and output settings empty because `vercel.json` handles them.
3. Click **Deploy**.

This project is separate from the LAI Tracker Vercel project in the repository root, and neither affects the other.

## Run locally

```bash
cd presbyopia-ci && python3 -m http.server 8000   # open http://localhost:8000
```

## Update the data

Edit `data.json` (English) and `data.ko.json` (Korean) together, then redeploy. The two files share the same structure: IDs, dates, numbers, stages and source links are identical, and only the display text differs. Interface labels are in `i18n.js`. The page renders whatever the file contains. The main collections are:

- `competitors`: one record per asset, with `threat` scored 1–5 (threat to a new entrant in Korea)
- `korea.race`: rows for the Gantt chart; any phase starting with "Expected" is drawn as an estimate
- `korea.companies`, `deals`, `rights`, `ip`, `events`, `products`

Data as of 20 Oct 2026. This is for internal research use only and is not legal or investment advice.
