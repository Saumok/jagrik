# 02 — TECHNICAL REQUIREMENTS DOCUMENT (TRD)

> *How* we build what `01_PRD.md` specifies. Exact integration details are in `07_API_INTEGRATIONS.md`; data shapes in `05_DATA_MODEL.md`; agent internals in `06_AGENT_ARCHITECTURE.md`.

## 1. Architecture overview

A thin React SPA talks to a small Node/Express backend on Cloud Run. The backend is the only thing that holds secrets and is the only thing that calls Gemini, sends email, and renders PDFs. Firestore is the realtime source of truth that both the client and backend read/write. BigQuery powers the predictive dashboard. Google Maps renders the live map.

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER (React SPA, Vite, TS)                                │
│  • capture photo / record voice                               │
│  • Google Maps live map + status timeline                     │
│  • War-room console (subscribes to agent_runs in Firestore)   │
│  • Dashboard (reads aggregated data via backend → BigQuery)   │
└───────────────┬───────────────────────────┬──────────────────┘
                │ HTTPS (REST)              │ Firestore SDK (realtime reads)
                ▼                           ▼
┌───────────────────────────────┐   ┌───────────────────────────┐
│  BACKEND (Express on Cloud Run)│   │  FIRESTORE (source of truth)│
│  POST /api/report  (orchestr.) │◄─►│  issues, agent_runs,        │
│  POST /api/verify  (before/aft)│   │  clusters, authorities      │
│  POST /api/email               │   └───────────────────────────┘
│  POST /api/pdf                 │
│  GET  /api/dashboard           │──► BigQuery (hotspot queries)
│  holds ALL secrets             │
└───────────────┬────────────────┘
                │ server-side calls
                ▼
   GEMINI API (multimodal: vision + audio + function calling)
   EMAIL provider (real send)   PDF renderer (real file)
```

**Why this topology:** keeps the Gemini key server-side (security + lets the key live on the billing-free project), keeps the client simple, and makes the agent run auditable (every step is written to `agent_runs`, which is also what the war-room renders — so the war-room is *real*, not animated).

## 2. Technology stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React + Vite + TypeScript** | Matches AI Studio output; fast. |
| Styling | **Tailwind CSS** + design tokens from `04` | Tokens defined as CSS variables; Tailwind config maps to them. |
| Maps | **Google Maps JavaScript API** (+ Geocoding) | Primary map. `04` covers styling. |
| Backend | **Node 20 + Express + TypeScript** | Single service on Cloud Run. Could be Cloud Functions; Express chosen for one clean deploy unit. |
| AI | **Gemini API** — multimodal Flash model | `⚠️ VERIFY` exact model string in AI Studio (see `07`). Vision + audio + function calling. |
| DB | **Firestore (Firebase, Spark/free)** | Realtime, source of truth. |
| Auth | **Firebase Anonymous Auth** | Lightweight; no login wall. A stable per-device id for reporter attribution + gamification. |
| Hosting | **Cloud Run (us-central1)** | Mandatory. Serves the built SPA + the API from one container, or two services. |
| Analytics store | **BigQuery (free tier)** | Backs the predictive dashboard. Seeded historical data. |
| Email | **Real transactional email** (see `07` for provider + free tier) | Must actually send. |
| PDF | **Server-side renderer** (see `07`) | Real downloadable file + stored copy. |
| Deploy tooling | **Google AI Studio deploy** and/or `gcloud run deploy` | Validate Day 1 (see `08`). |

**Forbidden substitutions:** Supabase/Postgres for Firestore; Mapbox/Leaflet as primary map; OpenAI/Anthropic for Gemini; Vercel/Netlify as final host. (Leaflet allowed only as an emergency fallback if Maps billing blocks you — but fix the billing first; see `07`.)

## 3. Google Cloud project & billing topology (the zero-cost spine)

Two projects (full rationale and steps in `07 §1`):

- **Project A — `jagrik-ai` (billing DISABLED):** holds the **Gemini API key**. Free tier stays intact. Never link billing here.
- **Project B — `jagrik-app` (billing ENABLED, card on file):** Cloud Run, Maps, Firebase/Firestore, BigQuery. Card is required by Google for these in 2026 but **stays at ₹0** under free tiers.

The Cloud Run backend in Project B calls Gemini using Project A's key (an API key is portable across projects). Set a **₹1 budget alert** on Project B (`07 §1`).

## 4. Environments

- **Local dev:** Vite dev server + `node server` locally; `.env.local` with all keys; Firestore can use the live free project (no emulator needed for a hackathon, but emulator is fine if preferred).
- **Production:** single Cloud Run service (preferred) serving the built static SPA and the `/api/*` routes. Env vars set in Cloud Run config (not committed).
- Provide a `README.md` with copy-paste setup + deploy commands. Provide `.env.example` listing every var from `07 §8`.

## 5. Non-functional requirements

- **Performance:** report → first war-room step visible **< 1.5 s**; full dispatch **< 10 s**. The map and dashboard load **< 2.5 s** on a mid-range phone over 4G. Lazy-load the dashboard and Maps SDK.
- **Reliability (demo-grade):** the happy path must be deterministic enough to demo live. Every external call (Gemini, email, PDF) has a typed error path and a visible, graceful failure state (`04` copy). Keep a **seeded fallback** so the demo can proceed even if a live call fails (see `09`).
- **Security:** no secret in the client bundle; verify via network tab. Anonymous-auth only; no PII collection beyond an optional reporter name. Strip/scrub EXIF GPS if you also collect manual location (avoid double location sources of truth — pick device geolocation, see `03`).
- **Privacy:** the Gemini free tier may train on inputs — do **not** send identifiable faces/number-plates. Add a one-line consent note and, if trivial, a client-side blur option; otherwise instruct demo photos to avoid faces (`09`).
- **Accessibility:** WCAG-AA-ish: contrast, focus, reduced motion, correct lang attributes for Bengali/Hindi text nodes.
- **Internationalization:** UI copy in English is fine for the hackathon, but the *intake* and the *generated complaint* must handle Bengali/Hindi input and produce a correct formal English complaint (the multilingual value prop).

## 6. Observability

Write every agent run to Firestore `agent_runs` with per-step status and timestamps (this doubles as the war-room data source). Log backend errors to Cloud Run logs. No heavy APM needed.

## 7. Key technical risks & mitigations

| Risk | Mitigation |
|---|---|
| Maps billing not enabled blocks the map | Enable billing on Project B Day 1; verify Maps loads before building features (`08` Phase 0). |
| Gemini free-tier rate limit during demo | Keep payloads small; cache the demo run; have a seeded fallback response. |
| Live voice flaky on stage | Pre-recorded clean Bengali audio sample as fallback input (`09`). |
| Cloud Run cold start adds latency | Set min-instances appropriately for the demo window (note: min-instances > 0 may incur cost — verify; otherwise warm it with a ping before pitching). |
| Model string changed/deprecated | `⚠️ VERIFY` model in AI Studio at build time (`07 §2`); never hardcode an unverified string. |
| Scope overrun | Follow `08` cut-line: drop clustering first, downgrade predictive to static seeded panel. |
