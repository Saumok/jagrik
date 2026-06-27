# Jagrik — Test Report

**Date:** 27 Jun 2026
**Live URL:** https://jagrik.onrender.com · **Repo:** https://github.com/Saumok/jagrik
**Test method:** automated suite `scripts/smoke-test.mjs` (31 assertions) against the local server, plus a focused live test against the deployed Render site.

---

## 1. Where is data stored? (storage architecture)

**There is currently no database. All state is in-memory inside the Node process.**

| Data | Where it lives | File | Durable? |
|---|---|---|---|
| Issues (seed + filed) | `Map<id, StoredIssue>` in process memory | `server/lib/issuesStore.ts` | No |
| Complaint PDFs | `Map<id, Buffer>` (bounded to 50) | `server/lib/store.ts` | No |
| Photos (uploaded + after) | `Map<id, Buffer>` (bounded to 50) | `server/lib/store.ts` | No |

**Implications**
- **Within a running session:** everything works — filed reports persist, appear on `/app`, open at `/issue/:id`, feed `/dashboard`, PDFs/photos serve.
- **Across restarts / Render sleep:** **data resets.** Render's free tier stops the instance after ~15 min idle; the next visit cold-starts a fresh process that **re-seeds the ~36 demo issues and loses any live-filed reports/PDFs/photos.**
- This was a deliberate deferral: the spec (`Docs/05`, `Docs/07`) planned **Firestore**, but on the billing-enabled GCP project, which the no-billing constraint ruled out.

**Recommendation — add Firestore (free, no card, Google-native).**
Firestore's **Spark plan is free and does NOT require billing** (only Cloud Run/Maps did). It is the ideal fit: durable, real-time, and it adds Google-tech credit for the rubric. Plan:
- Create a Firebase project (Spark, no card) → service-account creds in an env var.
- Swap the three in-memory `Map`s for Firestore collections (`issues`, and Storage or base64 for media). The client/API shapes already match `Docs/05`, so **no UI changes** are needed.
- Alternatives if Firebase is unwanted: Supabase / MongoDB Atlas / Neon — all free, no card.

---

## 2. Automated suite — 31 / 31 passed (local)

Run: `node scripts/smoke-test.mjs` against `http://localhost:8787` (Gemini live, email in demo mode to avoid sending real test emails).

| # | Area | Result |
|---|---|---|
| 1 | `/api/health` responds, gemini=true | PASS |
| 2 | Issues list seeded (36) | PASS |
| 3 | GET issue by id | PASS |
| 4 | Unknown issue → 404 | PASS |
| 5 | Voice report streams 200 (NDJSON) | PASS |
| 6 | All 6 agents present (classifier→escalator) | PASS |
| 7 | Bengali voice classified as **drainage** | PASS |
| 8 | Routed to KMC Drainage Dept | PASS |
| 9 | PDF checkpoint emitted | PASS |
| 10 | Email checkpoint emitted | PASS |
| 11 | Escalation checkpoint emitted | PASS |
| 12 | Result has `KMC-` tracking id | PASS |
| 13 | Filed report persisted (session) | PASS |
| 14 | PDF downloadable, 200 `application/pdf` | PASS |
| 15 | Photo report streams 200 | PASS |
| 16 | Photo issue has photoId | PASS |
| 17 | Photo served, `image/*` | PASS |
| 18 | Verify without photo → 400 | PASS |
| 19 | Verify returns a verdict | PASS |
| 20 | Verify status consistent (fixed⇒resolved) | PASS |
| 21 | Classify → **streetlight** (no keyword) | PASS |
| 22 | Classify → **garbage** (no keyword) | PASS |
| 23 | Classify → **water_supply** (no keyword) | PASS |
| 24 | Unknown PDF → 404 | PASS |
| 25 | Verify unknown issue → 404 | PASS |
| 26 | Dashboard total == issues count | PASS |
| 27 | byType sums to total | PASS |
| 28 | Trend has 8 weeks | PASS |
| 29 | Hotspots have Gemini predictions | PASS |
| 30 | Resolution rate within 0..1 | PASS |
| 31 | Volume injection grows the store (+6) | PASS |

**Notable proofs**
- **Gemini is genuinely reasoning, not the fallback:** three discriminator prompts with *no keyword the fallback could match* were each classified correctly and routed to the right KMC department (streetlight → Lighting, garbage → SWM, water → Water Supply).
- **Edge cases handled:** 404s for unknown issue/PDF/verify, 400 for verify without a photo.
- **Dashboard math is consistent:** totals and per-type sums reconcile against the issue list.

**One honest nuance:** a *random* test image (picsum) is correctly classified `unclear` — Gemini won't invent a civic issue from a non-civic photo. Real civic photos classify correctly (as the seeded/real flows show).

---

## 3. Live deployment test — bug found and fixed

Testing the **live** Render site surfaced a real production bug the local run could not (local email is in demo mode):

**Bug:** filing a report on Render **failed at the email step** with
`connect ENETUNREACH 2404:6800:4003:c01::6d:465`.
Render's free tier has **no outbound IPv6**, but `smtp.gmail.com` resolves to an IPv6 address first. Worse, the failure was **fatal** — it crashed the whole pipeline, so no result/issue was produced.

**Fix (shipped, commit `8e8a97c`):**
1. `dns.setDefaultResultOrder("ipv4first")` + explicit `smtp.gmail.com:465` so the SMTP connection uses IPv4.
2. Wrapped the send in try/catch so a delivery failure is **non-fatal** — the report always completes; the war-room shows an honest "queued for retry" row instead of crashing (per `Docs/06 §6`).

**Re-verification:** _(appended after the Render redeploy — see below)_

---

## 4. Verdict

- Core product (intake → classify → route → draft → PDF → email → escalate → persist → map → detail → AI verify → dashboard) is **functionally correct end-to-end**, with real Gemini intelligence.
- **Highest-priority follow-up:** durable storage (Firestore Spark, free) so data survives restarts.
- Email on Render fixed; pending live re-confirmation post-deploy.
