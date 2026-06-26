# 00 — AGENT GUIDE (READ THIS FIRST, IN FULL)

> **You are an autonomous build agent.** This folder is your complete source of truth for building the application. Treat these documents as binding specification, not suggestion. **Do not invent product decisions, schemas, names, colors, copy, or architecture that contradict these files.** If something is genuinely unspecified, follow the "When something is missing" protocol below — do not silently guess.

---

## What you are building (one paragraph)

**Jagrik** *(working product name — coined from Jagruk "aware" + Nagrik "citizen"; may be renamed by the human)* is a hyperlocal civic-action web app for the **Vibe2Ship hackathon (Problem Statement 2 — Community Hero)**. A citizen reports a neighborhood problem (pothole, drainage, broken streetlight, garbage) by **photo or by voice in their own language (Bengali/Hindi/English)**. An **autonomous multi-agent system** built on Google's Gemini then classifies the issue, scores its severity and estimated repair cost, identifies the correct municipal authority, **drafts and dispatches a real formal complaint (email + downloadable PDF)**, and **schedules an auto-escalation** if it goes unresolved. Issues appear on a **live map**, get a public **status timeline**, can be **verified as fixed** via an AI before/after photo comparison, are **de-duplicated** so repeat reports of one problem merge into a single "N citizens affected" ticket, and feed a **predictive hotspot dashboard**. The signature on-screen element is a live **agent war-room console** where the user watches the agents think and act in real time. This is the core thesis: **it does not just report problems — it autonomously acts to get them resolved.**

---

## Read order (do not skip; each builds on the last)

1. `00_AGENT_GUIDE.md` — this file. Rules, guardrails, conventions, definition of done.
2. `01_PRD.md` — product requirements: who, why, what, success criteria, scope, rubric mapping.
3. `02_TRD.md` — technical requirements: architecture, stack, GCP setup, environments, non-functionals.
4. `03_APP_FLOW.md` — every screen, route, state, and user journey end to end.
5. `04_UI_UX_DESIGN.md` — the design system: tokens, type, components, the war-room, motion, accessibility.
6. `05_DATA_MODEL.md` — Firestore + BigQuery schemas, seed data, exact field names and types.
7. `06_AGENT_ARCHITECTURE.md` — the multi-agent brain: roles, system prompts, function/tool schemas, KMC routing map, escalation ladder, PDF + email specs.
8. `07_API_INTEGRATIONS.md` — exact integration specs and setup for every external service, with zero-cost guardrails.
9. `08_IMPLEMENTATION_PLAN.md` — the phased, ordered build plan with milestones, dependencies, and definition of done per phase.
10. `09_DEMO_PITCH_SUBMISSION.md` — demo script, seed data for the demo, judging-rubric tactics, and the submission checklist.

**Before writing any code, confirm you have read files 01–08.** State, in one line, the phase from `08` you are starting.

---

## Hard constraints (NON-NEGOTIABLE — violating any of these fails the project)

1. **Deployment target is Google Cloud.** The final app MUST be a live, public URL deployed on **Cloud Run** (via Google AI Studio's deploy path or `gcloud run deploy`). Region: **us-central1** (free-tier eligible). No Vercel/Netlify/Render as the final submission host.
2. **Zero cost.** Stay inside documented free tiers. Honor the **two-project billing split** in `07`: Gemini API key lives on a project with **billing disabled** (free tier intact); Cloud Run + Maps live on a project with **billing enabled**. Never enable billing on the Gemini project.
3. **Google-native stack is mandatory and scored (15%).** Gemini (multimodal), Firebase, Cloud Run, Google Maps, BigQuery, AI Studio. Do not substitute non-Google equivalents for these (e.g. no Supabase, no Mapbox as primary, no OpenAI).
4. **Agentic depth is the whole point (20%).** Every issue must pass through *real, separate, observable* agent steps that take *real actions* (real email sent, real PDF generated, real scheduled escalation). A single monolithic prompt that fakes steps is a failure. The war-room must reflect actual agent execution, not a hardcoded animation.
5. **Solo-builder reality.** One human is driving you. Build in the phase order of `08`. Ship a working vertical slice before adding breadth.
6. **Do not fabricate the human's own work as the judge's.** Real complaints in the demo go to a **controlled demo inbox** the human owns (see `07`), never to real overwhelmed municipal staff during testing.

---

## When something is missing or ambiguous

Follow this order. Never silently invent a contradicting decision.

1. **Re-read** the relevant doc — the answer is usually there.
2. **Infer from precedent** already established in these docs (naming, patterns, tokens) and stay consistent.
3. If it's a **volatile external fact** (exact Gemini model string, a free-tier quota number, an API field name), **do not trust these docs or your training data — verify against the official source at build time** and use what you find. These docs flag every such item with `⚠️ VERIFY`.
4. If it's a **genuine product decision** not covered anywhere, choose the option most aligned with the PRD thesis and the rubric, **implement it behind a clearly labeled `// DECISION:` comment**, and list it in a running `DECISIONS.md` you maintain at repo root so the human can review.
5. Only stop and ask the human if the decision is **expensive to reverse** (data model shape, auth model, deployment topology) and not inferable.

---

## Engineering conventions

- **Framework:** React (Vite) single-page app — this matches Google AI Studio's default output and deploys cleanly to Cloud Run behind a tiny server. If the human has stated a different preference, that wins.
- **Language:** TypeScript everywhere. No `any` without a `// reason:` comment.
- **Backend:** lightweight Node/Express service (or Cloud Functions) on Cloud Run that holds all secrets and proxies Gemini + email + PDF. **Never call the Gemini API directly from the browser** — the key must stay server-side.
- **State:** Firestore is the source of truth. The client subscribes to realtime updates; do not hold critical state only in React.
- **Secrets:** all keys in environment variables, never committed. Provide a `.env.example`. List every required var in `07`.
- **Folder layout:**
  ```
  /src
    /components      reusable UI (see 04 for component list)
    /features        report, map, war-room, dashboard, verify
    /agents          agent definitions, prompts, tool schemas (see 06)
    /lib             gemini client, firebase client, maps, pdf, email
    /data            seed data, KMC routing map (see 05/06)
    /styles          design tokens (see 04)
  /server            express app: routes for /api/agent, /api/email, /api/pdf
  /scripts           seed-firestore, seed-bigquery
  DECISIONS.md
  README.md          (human-facing: setup + deploy steps)
  .env.example
  ```
- **Commits:** small, conventional (`feat:`, `fix:`, `chore:`), one logical change each. The GitHub repo is a graded submission artifact — keep history clean and readable.
- **Comments:** explain *why*, not *what*. Every agent prompt and every routing rule gets a comment citing which doc section it implements.

## Quality floor (build to this without being told)

- Mobile-first and fully responsive (most Indian users are on phones). Test at 360px width.
- Visible keyboard focus states; all interactive elements reachable by keyboard.
- `prefers-reduced-motion` respected — the war-room still works, just without the typewriter animation.
- Bengali/Hindi/English render correctly (Noto fonts — see `04`). Never let a missing glyph become a box.
- Loading, empty, and error states designed for every async surface (see `04` copy rules). Errors say what happened and what to do — they never just spin forever.
- No console errors in the deployed build. No leaked keys in the bundle (verify the network tab shows no API key).

## Definition of Done for the whole project

A judge can open the public Cloud Run URL on a phone and, with no instructions:
1. Report a pothole by **photo or voice in Bengali**, and watch the **war-room** classify → route → draft → **dispatch a real email + downloadable PDF** in real time.
2. See it appear on the **live map** with a **status timeline**.
3. See a seeded **"12 citizens affected"** merged ticket (duplicate-clustering).
4. Mark one issue fixed via **before/after AI verification** and see it flip to Resolved.
5. Open the **predictive hotspot dashboard** and see a flagged recurring-problem street.
6. Everything is fast, looks intentional, and never breaks. The three required submission artifacts (deployed link, GitHub repo, Google Doc) exist and are correct per `09`.

If all six are true, you are done. Until they are, keep going in `08` order.
