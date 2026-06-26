# Jagrik — See it. Say it. Solved.

A hyperlocal civic-action agent (Vibe2Ship, Problem Statement 2). A citizen reports a
neighbourhood problem by **photo or voice in their own language**; an autonomous
multi-agent system classifies it, routes it to the correct KMC department, drafts and
**dispatches a real complaint (PDF + email)**, and schedules an auto-escalation — streamed
live in an on-screen **agent war-room**.

Full product/spec docs live in [`/Docs`](./Docs). Build decisions in [`DECISIONS.md`](./DECISIONS.md).

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind v4 + Motion. Bespoke warm-nude
  liquid-glass design system.
- **Backend:** Node + Express (TypeScript), streaming NDJSON. Gemini (multimodal classify +
  draft), `pdfkit` (real PDF), Nodemailer + Gmail (real email).
- **Deploy target:** Cloud Run (us-central1) serving the built SPA + the `/api/*` routes from
  one container (`server/index.ts` serves `dist/` in production).

## Run locally

```bash
npm install
cp .env.example .env     # optional — app runs without keys (demo fallback)
npm run dev              # web on :5173, api on :8787 (Vite proxies /api → 8787)
```

Open http://localhost:5173 . The report flow (`/report`) calls the real backend; if the
backend is down it falls back to a local simulator so the demo never breaks.

- `npm run dev:web` / `npm run dev:server` — run either half alone
- `npm run build` — typecheck + build the SPA to `dist/`
- `npm run start` — run the Express server (serves `dist/` if built); used on Cloud Run
- `npm run typecheck:server` — typecheck the backend

## Going from demo to fully live

The app runs today with **zero keys** (classification/draft use a deterministic fallback;
email is simulated and labelled "demo mode"). Add keys in `.env` to make each capability real:

| Capability | Key(s) | Effect |
|---|---|---|
| Real Gemini classification + drafting | `GEMINI_API_KEY`, `GEMINI_MODEL` | photo/audio understood by the model |
| Real email dispatch | `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `DEMO_INBOX` | a real email lands in the demo inbox |

See `.env.example` and `Docs/07_API_INTEGRATIONS.md` for the zero-cost two-project GCP setup.

## Architecture (request flow)

```
Browser (React)  ──POST /api/report (multipart: image|audio + lat/lng)──►  Express
   │                                                                          │
   │  ◄──────────── NDJSON stream: one agent step per line ───────────────────┤
   │                                                                          ▼
War-room renders                         Orchestrator: Classifier(Gemini) → Dedupe
each step live                            → Router(KMC map) → Drafter(Gemini)
                                          → Dispatcher(PDF + email) → Escalator
```

The NDJSON step stream is the war-room's data source — so the war-room is **real**, not an
animation. The same wire shape maps onto Firestore `agent_runs` for the later persistence phase.
