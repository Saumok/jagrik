# 08 — IMPLEMENTATION PLAN

> The build order. Follow phases in sequence. **Ship a working vertical slice before adding breadth.** Each phase has an explicit Definition of Done (DoD); do not advance until it's met. Protect the final buffer — never schedule new building into it.

## Guiding rules

- **Vertical slice first:** get one report all the way to a dispatched email before polishing anything.
- **Deploy on Day 1**, not Day 5. A hello-world on Cloud Run de-risks the single biggest failure mode.
- **Cut-line when behind:** drop **duplicate-clustering (F8)** first → then downgrade **predictive dashboard (F9)** to a static seeded insight panel. **Never** cut the **war-room (F5)** or **before/after verification (F7)** — they're the signatures.
- Seed early (`05 §3`) so every feature has data to demo.

---

## PHASE 0 — Foundations & deploy proof (do before any feature)
**Goal:** prove the pipes.
- Create both GCP projects + billing split + ₹1 budget alert (`07 §1`).
- `⚠️ VERIFY` and lock the Gemini model id; one successful test call from a Node script.
- Scaffold repo per `00` folder layout: Vite+React+TS, Tailwind wired to `04` tokens, Express server, Firebase init, `.env.example`, `DECISIONS.md`, `README.md`.
- **Deploy a hello-world (SPA + `/api/health`) to Cloud Run us-central1.** Confirm the public URL works on a phone.
- Add Google Fonts (General Sans/Fontshare, Hanken Grotesk, JetBrains Mono, Noto Bengali/Devanagari).
**DoD:** public Cloud Run URL is live; a server test route returns a real Gemini response; tokens/fonts load.

## PHASE 1 — The spine, end to end (the vertical slice)
**Goal:** photo → classify → route → draft → **real PDF + real email** → issue saved → result card. (Voice added in Phase 3.)
- Firestore collections + `authorities` seed + KMC routing map (`05`,`06 §4`).
- Orchestrator `/api/report`; implement Classifier → Router(+lookup_authority tool) → Drafter → Dispatcher(PDF+email) → Escalator, each writing to `agent_runs` (`06`).
- Email really sends to the demo inbox; PDF really generates and is downloadable (`07 §5,§6`).
- Minimal UI: home with Report button → photo intake → a basic (unstyled) war-room reading `agent_runs` → result card with tracking ID + Download PDF.
**DoD:** from the deployed URL, a photo report produces a real email in the demo inbox + a downloadable PDF, and an `issues` doc, with each agent step visible.

## PHASE 2 — Map, issue detail, status timeline (F6)
- Google Maps on home with status-coloured pins from `issues` (`07 §4`, `04`).
- `/issue/:id` detail: photo, classification chips, authority card, complaint PDF, **status timeline**.
- Device geolocation in intake with draggable-pin fallback + Geocoding for area (`03 §3`).
**DoD:** a new report appears as a pin; tapping it opens a complete detail screen with a live timeline.

## PHASE 3 — Voice + multilingual intake (the HERO) ⭐
- Mic capture in the intake sheet (hold-to-speak + tap-to-toggle a11y), live waveform, language hint.
- Send audio to the Classifier; show the **original-language transcript** echo ("You said: …" in Noto font) and the resulting English complaint.
- Rehearse with a Bengali sample; wire a **pre-recorded fallback audio** path for the live demo (`09`).
**DoD:** speaking a complaint in Bengali produces a correct English filed complaint, with the transcript shown, no typing.

## PHASE 4 — Design pass to "award-winning" polish ⭐
- Implement the full `04` **liquid-glass** design system across every screen: the glass material tokens (§2), the luminous backdrop, "liquid glass taps", and the **war-room as smoked-glass signature** (streaming steps, pulsing dots, loud real-action checkpoints, connective marigold line).
- **Build the HERO landing at `/` (`04 §4`)** — the judge-catching centrepiece: the tilted liquid-glass panel sliding in from the right with layered cards showing the app's multiple workings, staggered side-text reveals, the entrance choreography, "how it works", and the future/roadmap band. CTA → `/app`. This is a primary deliverable, not optional polish.
- Enforce the **glass performance budget (`04 §8`)**: ≤3–4 blurred layers on screen, no animated `backdrop-filter`, `@supports` solid fallback, reduced-motion + reduced-transparency paths.
- Mobile-first QA at 360px. Focus states, contrast on glass (`04 §2.3`), `lang` attributes, `aria-live` war-room.
**DoD:** the hero stops a judge in their tracks and loads fast; every screen matches `04`; the war-room is genuinely impressive; nothing looks templated; clean and quick on a phone.

## PHASE 5 — The wow layer (aggressive scope)
Build in this order so the cut-line falls on the least critical first:
- **F7 Before/after verification** (signature — build this). `/api/verify`, split-slider UI, status→resolved, AI badge (`03 §5`,`06 §8`).
- **F9 Predictive dashboard.** BigQuery seed + `/api/dashboard` aggregation + Gemini-written prediction strings + dashboard UI (`05 §2`,`06 §6`). *(If behind: static seeded insight panel instead of live BigQuery.)*
- **F8 Duplicate-clustering.** `find_nearby_duplicates` tool + merge logic + "N citizens affected" UI (`06 §3`). *(First to cut if time runs out.)*
- **F10 Smart gamification.** Civic Score on resolution + leaderboard tile (`05`). *(Lightweight; only if comfortable.)*
**DoD:** the six Definition-of-Done items in `00` all pass.

## PHASE 6 — Demo hardening + submission (buffer — no new features)
- Seed the full demo dataset (the 12-report cluster, the hotspot street) (`05 §3`).
- Cache/scripted the demo report run; warm Cloud Run before pitching; verify the demo inbox.
- Write the demo script + record a backup demo video (`09`).
- Prepare the three submission artifacts: deployed link, clean GitHub repo, the Google Doc with all required fields (`09`). Final submit on BlockseBlock only when fully satisfied (irreversible).
**DoD:** a cold run of the demo script works end-to-end on a phone; all three artifacts submitted correctly.

---

## Milestone checklist (tick as you go)
- [ ] P0 Cloud Run hello-world live + Gemini call works
- [ ] P1 Real email + PDF from a photo report
- [ ] P2 Map + issue detail + timeline
- [ ] P3 Bengali voice → English complaint (hero)
- [ ] P4 Full design system + war-room polish
- [ ] P5 Verification → dashboard → clustering → gamification
- [ ] P6 Seeded, hardened, submitted (link + repo + doc)

## Definition of Done (whole project) — repeat from `00`
A judge, on a phone, with no instructions, can: report by photo/voice in Bengali and watch the war-room dispatch a real email+PDF live → see it on the map with a timeline → see a "12 citizens affected" merged ticket → verify a fix via before/after → open the predictive dashboard. Fast, intentional, unbroken. All three submission artifacts correct.
