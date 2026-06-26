# 07 — API INTEGRATIONS & SETUP

> Exact setup for every external dependency, with the zero-cost guardrails baked in. Items marked `⚠️ VERIFY` change over time — confirm against the official source at build time; do not trust a hardcoded value from this doc or from training data.

## 1. Google Cloud projects & billing (do this FIRST — `08` Phase 0)

**Two projects (the zero-cost spine):**

1. **`jagrik-ai` — billing DISABLED.** Create it, do NOT link a card. Generate the **Gemini API key** here (AI Studio → Get API key → select this project). This keeps the Gemini free tier intact. `⚠️ VERIFY` free-tier limits in AI Studio.
2. **`jagrik-app` — billing ENABLED.** Link a card (required by Google in 2026 for Cloud Run/Maps even on free tier — you will not be charged under free limits). Enable APIs here: Cloud Run, Maps JavaScript + Geocoding, Firebase/Firestore, BigQuery, (optional) Cloud Scheduler.
3. **Budget alert:** in `jagrik-app`, Billing → Budgets → create a budget of **₹1** (or smallest allowed) with alerts at 50/90/100%. If it ever fires, something left the free tier — investigate immediately.

> Why split: enabling billing on a project removes the Gemini free tier on that project (every call becomes billable). The API key is portable, so the Cloud Run service in `jagrik-app` simply uses the key minted in `jagrik-ai`. `⚠️ VERIFY` this behavior still holds.

## 2. Gemini API

- **Access:** server-side only, via the official Google GenAI SDK for Node. Key from env `GEMINI_API_KEY` (the `jagrik-ai` key).
- **Model:** a current **multimodal Flash** model. `⚠️ VERIFY` the exact string in AI Studio before coding (the free-tier multimodal Flash id; do NOT assume — earlier Flash ids like the 2.0 line were deprecated mid-2026 and Pro was removed from free). Centralize the model id in one config constant so a change is one edit.
- **Capabilities used:** image input (Classifier/Verifier), audio input (voice intake), function calling (Router), JSON-mode/structured output (all). Prefer the SDK's structured-output/JSON mode; otherwise instruct "respond with ONLY JSON" and parse defensively.
- **Free-tier guardrails:** keep requests/min modest; compress images before sending (resize to ~1024px max edge); don't send video. Cache the scripted demo run so a live rate-limit can't break the pitch (`09`). `⚠️ VERIFY` current RPM/RPD.
- **Privacy:** free tier may train on inputs — avoid identifiable faces/plates in submitted media (`02 §5`).

## 3. Firebase / Firestore (Project `jagrik-app`, Spark/free)

- Register a Web App; put config in client env (`VITE_FIREBASE_*` — these are public by design).
- **Firestore:** create in the same region family as Cloud Run (us-central). Collections per `05`.
- **Auth:** enable **Anonymous** sign-in. Client signs in anonymously on first load → stable `uid`.
- **Storage:** enable for photo uploads (issue photos, after-photos, PDFs) `⚠️ VERIFY` Storage is on the free tier for your usage; if not, store small images as compressed data in Firestore or skip storage and email the photo directly from the backend buffer.
- **Security rules:** lock writes to the backend where possible; allow client reads on `issues`, `agent_runs`, `clusters`, `authorities` (public civic data), and authenticated writes for "me too"/verification. Don't ship open `allow read, write: if true;` to production.

## 4. Google Maps (Project `jagrik-app`)

- Enable **Maps JavaScript API** + **Geocoding API**. Restrict the browser key by HTTP referrer (your Cloud Run domain + localhost). Env `VITE_MAPS_API_KEY`.
- Free tier: generous monthly free events per SKU — a demo is far under. `⚠️ VERIFY` current caps.
- Use a custom map style aligned to `04` (muted, paper-like) so the map matches the brand. Markers coloured by status (`04 §1`).
- **Fallback only if Maps is blocked:** Leaflet + OSM (no key) — but solve the billing first; Maps earns Google-tech credit, Leaflet doesn't.

## 5. Email (must really send)

Pick a free transactional provider and actually send. `⚠️ VERIFY` current free-tier terms.
- **Primary option — Resend** (free tier ~100 emails/day): simple API, server-side, attach the PDF + photo. Env `RESEND_API_KEY`, `MAIL_FROM`.
- **Alternative — Nodemailer + Gmail** (an app-password on a throwaway Gmail): zero extra signup, sends real mail. Env `GMAIL_USER`, `GMAIL_APP_PASSWORD`.
- **Most Google-native option — Gmail API** (OAuth) if you want to maximize the Google-tech story; more setup.
- **Demo inbox:** create a dedicated address you control (e.g. `kmc-demo@yourdomain` or a Gmail) and point ALL seeded `authorities.email` to it (or per-department aliases). During the pitch you open this inbox to show the real email arriving. NEVER send test mail to real municipal addresses.

## 6. PDF generation (must really produce a file)

- **Server-side (preferred):** `pdfkit` or `puppeteer`-render-HTML on Cloud Run. Build the template from `06 §6`. Upload to Storage → `complaintPdfUrl`, and attach to the email.
- **Client-side fallback:** `jsPDF` / `pdfmake` if server rendering is heavy. Either is fine as long as the file is real and downloadable.

## 7. Cloud Run deploy (the mandatory submission host)

- Containerize: one image serving the built Vite SPA (static) + the Express `/api/*` routes. (A single service is simplest; two services—static + api—also fine.)
- Deploy to **us-central1** (free-tier region). `gcloud run deploy jagrik --source . --region us-central1 --allow-unauthenticated` or use **AI Studio's deploy** flow per the hackathon's referenced doc.
- Set all server env vars in Cloud Run config (`GEMINI_API_KEY`, email keys, Firebase admin creds, BigQuery access). Never bake secrets into the image.
- `⚠️ VERIFY` cold-start behavior; warm the service with a ping right before the live demo. Min-instances>0 may cost money — verify before enabling.
- **Validate this whole path on Day 1 with a hello-world**, before building features (`08` Phase 0). Deployment friction is the #1 hackathon killer.

## 8. Environment variables (provide `.env.example`)

```
# server (Cloud Run) — secret
GEMINI_API_KEY=            # from project jagrik-ai (billing OFF)
GEMINI_MODEL=              # ⚠️ VERIFY exact multimodal Flash id in AI Studio
RESEND_API_KEY=            # or GMAIL_USER / GMAIL_APP_PASSWORD
MAIL_FROM=
DEMO_INBOX=                # the controlled address authorities route to
FIREBASE_ADMIN_CREDENTIALS=# service account JSON (server)
BIGQUERY_DATASET=jagrik

# client (public, VITE_-prefixed)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_MAPS_API_KEY=         # referrer-restricted
VITE_API_BASE=             # Cloud Run URL
```

## 9. Cost guardrail summary (keep ₹0)

| Service | Free lever | Hard rule |
|---|---|---|
| Gemini | free tier on billing-OFF project | never enable billing on `jagrik-ai`; compress images; cache demo run |
| Cloud Run | always-free quota, us-central1 | deploy only in free region; watch min-instances |
| Firestore/Storage | Spark free quotas | don't loop unbounded reads; `⚠️ VERIFY` Storage free |
| Maps | monthly free events | referrer-restrict key; one map instance |
| BigQuery | 1TB query/mo free | small seeded dataset; simple aggregations |
| Email | provider free tier | stay under daily cap; demo inbox only |

Set the ₹1 budget alert (§1.3) and you'll know instantly if anything escapes the free tier.
