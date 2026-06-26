# DECISIONS

Running log of build decisions not pre-settled by the Docs, per `Docs/00 §When something is missing`.

## Frontend slice (Hero + Report flow)

- **Palette: warm-nude base + teal accent (light theme only).** Per the human's brief (nude colors, no dark theme). Re-keys `Docs/04`'s teal/marigold tokens onto a warm-nude backdrop instead of the cool `#EEF2F4` base. Teal is the single locked accent; **marigold is reserved strictly for the "agent is live / acting" semantic state** (war-room dots, real-action checkpoints) — not used as a second decorative accent. Avoids the AI-default beige+brass "premium-consumer" palette flagged by the design skill.
- **Display font fallback: Outfit (self-hosted).** `Docs/04` specifies General Sans (Fontshare `<link>`). To prevent the premium type degrading to a system face if Fontshare is blocked, the stack is `General Sans → Outfit Variable (self-hosted) → system`.
- **Primary CTA → `/report`, not `/app`.** `/app` (live map) is a later phase and not built yet; `/report` is the working demo centrepiece. CTA label is "Report a problem" everywhere (one intent, no duplicates).
- **War-room is data-driven from a simulated `agent_runs` stream** (`src/data/agentPipeline.ts`). The shape matches `Docs/05`'s `AgentRun`/`AgentStep` exactly, so swapping the simulator for a real Firestore subscription later requires no UI change.
- **Hero "show the app working" = real rendered mini-UI components** (`miniCards.tsx`), not stock photos or div-fake-screenshots (both are design tells).
- **Hero in-panel side-text labels dropped** in favor of the dedicated "How it works" section, to keep the hero within the max-4-text-elements discipline (low cognitive load was an explicit requirement).
- **Remotion not used.** It renders videos, not live in-app UI. In-app motion uses Motion (`motion/react`) + CSS transforms.

## Redesign pass (interactive, award-targeting)

- **Hero is now interactive and tab-driven.** Liquid-glass tabs (Capture / Route / File / Predict) drive a single tilted glass pane that **morphs** between four real mini-UIs (voice+transcript, routing decision, dispatch checkpoints, hotspot forecast). Auto-advances every 4.2s; dwelling on the panel pauses it; interacting with the tabs does not. Replaces the earlier static three-card panel.
- **Liquid-glass tabs** (`src/components/LiquidTabs.tsx`) adapted from a Magic (21st.dev) base into our tokens: morphing pill via `layoutId` spring, `fill` mode so all tabs fit < 640px, CSS-driven auto-advance ring (no per-frame React renders). Reused for the report Speak/Photo toggle.
- **Motion layer added:** `AuroraBackground` (drifting GPU blobs), `Magnetic` CTA wrapper (pointer-follow via motion values), `CountUp` (in-view number animation). War-room upgraded with a progress bar, typewriter detail streaming, spring checkpoint "seals", and a scanline sheen.
- **ui-ux-pro-max** generator validated the direction: Liquid Glass style + Bento pattern + teal primary. Watch-outs honored (text-on-glass contrast floor, reduced-motion paths, performance budget on blurred layers).

## Real backend (Phase 1 vertical slice — now live)

- **Express orchestrator streams NDJSON.** `POST /api/report` runs the agents in sequence and writes one JSON line per step as it completes; the client reduces that stream into the war-room's `AgentStep[]`. Chosen over SSE because it works with a `multipart` POST body (image/audio) in one request. Maps cleanly onto Firestore `agent_runs` later.
- **Graceful three-mode capability flags.** Each capability is live when its key is present, else a clearly-labelled fallback: Gemini → deterministic classify/draft; email → simulated message id ("demo mode" chip + war-room note). The whole app runs end-to-end with zero keys, and each key turns one capability real with no code change.
- **Deterministic Router, not an LLM.** `lookupAuthority`/`computePriority` are plain code (the exact tool the Router agent calls) — auditable and free. The LLM does classification and drafting only.
- **Real artifacts:** `pdfkit` generates a real complaint PDF (served from an in-memory store at `/api/pdf/:id`, swappable for Firebase Storage); Nodemailer + Gmail app-password sends the real email to the controlled `DEMO_INBOX`.
- **Real capture on the client:** `MediaRecorder` records actual audio (+ Web Speech API live transcript where supported); `<input capture>` for photos; best-effort geolocation. If the mic is unavailable, a "use a sample" path keeps the demo flowing.
- **Simulator kept as automatic fallback.** If `/api/report` is unreachable, `ReportFlow` falls back to the local `agentPipeline` simulator so a network blip never breaks a live demo.
- **Single Cloud Run unit.** `server/index.ts` serves `dist/` + `/api/*` from one container (the mandated deploy topology).

## Persistence + map list + detail (now live)

- **Water Supply split into its own authority** (`kmc-water-b7`, `KMC-WS-` tracking prefix) per Docs/06 §4; removed from the Drainage department's `handles`. Mirrored in the frontend data layer.
- **In-memory issue store, seeded** (`server/lib/issuesStore.ts`) with the Docs/05 §3 demo history (12-affected cluster, a resolved streetlight, mixed statuses). The orchestrator persists every filed report (status `reported` + timeline) and stores its photo, served from `/api/photo/:id`. `GET /api/issues` and `GET /api/issues/:id` back the new pages. Swaps to Firestore at the persistence phase with no client change.
- **`/app`** (issues list with liquid-tab status filters) and **`/issue/:id`** (photo, classification chips, routed-authority card + PDF, vertical status timeline, original-language transcript). Result card links into the detail page; landing nav links to `/app`.
- **Map deferred to the Maps-key step:** `/app` is a card grid now; a Google Map renders in place once `VITE_MAPS_API_KEY` is set (avoids a forbidden Leaflet substitution and needs billing project B).

## Live keys status

- **Gemini: LIVE** (verified doing real reasoning — classified a keyword-free "dry taps" report as `water_supply`). Key is in `.env` (git-ignored); rotate it since it appeared in chat.
- **Email: pending** the Gmail app-password only (sender/from/demo-inbox pre-filled to the account address). Stays simulated until the 16-char password is added.

## Hosting (zero-billing constraint)

- **Render free tier chosen over Cloud Run.** The user requires no billing / no card; Cloud Run + Maps require a card in 2026, and there is no card-free Google option that runs our Node backend (Firebase free hosting is static-only). Render free runs the full Express service with no card. Tradeoff: not "Google Cloud," so the hackathon's mandatory-GC rule isn't met by this host — flagged to the user. The same server runs unchanged on Cloud Run later if a card is ever added.
- **Single service:** `server/index.ts` serves `dist/` + `/api/*`; `render.yaml` blueprint, `npm start` = `tsx server/index.ts`, `tsx` moved to dependencies, `engines.node >=20`. Production build verified locally (SPA, deep-link fallback, API all 200).

## Before/after AI verification (F7 — now live)

- `POST /api/verify` (after-photo) → Gemini compares against the stored/seeded before-photo → `{fixed, confidence, reason}`; on `fixed` flips the issue to `resolved` with a verification timeline entry and a "Verified by AI" badge on `/issue/:id`. Verified with real Gemini vision (correctly refused two unrelated images).

## Open / deferred (next)

- GCP projects, billing split, Gemini key, model id: not started (Phase 0).
- Email: Nodemailer + Gmail app-password (chosen; backend, not yet wired).
- Real photo/voice capture, geolocation, Maps, Firestore, PDF: stubbed in the frontend behind shapes that match `Docs/05`.
