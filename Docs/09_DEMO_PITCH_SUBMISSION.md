# 09 — DEMO, PITCH & SUBMISSION

> This is a **live-pitch-judged** event (top finalists present to an expert jury). The demo and story carry as much weight as the code. This doc makes the win legible.

## 1. The 90-second demo script (rehearse until automatic)

Open the deployed URL on a phone, screen mirrored.

1. **Hook (10s):** "In Kolkata, reporting a pothole means finding the right department, writing a formal complaint, and hoping. Most people just give up. Jagrik does all of it for you — watch." 
2. **The hero moment — voice (20s):** Hold the mic. Speak a complaint **in Bengali** ("the drain outside has been overflowing for days"). The transcript appears in Bengali; the war-room opens.
3. **The war-room (25s) — the agentic proof:** narrate as the agents fire: "It classified the issue, scored severity, found the right KMC department, drafted a formal English complaint — and look: it actually sent a real email and generated this PDF, and scheduled a follow-up." **Switch to the demo inbox and show the real email that just arrived.** Open the PDF.
4. **The loop closes (20s):** open the map (it's pinned), show the status timeline; open an issue that has **"12 citizens affected"** (clustering); upload an after-photo on a different issue and let the **AI verify the fix** flip it to Resolved.
5. **The intelligence (10s):** open the **dashboard** — "and across the ward, it predicts where the next problem is: this street, four drainage reports in 90 days, monsoon flood risk."
6. **Close (5s):** "From a spoken sentence to a tracked, verified resolution. See it. Say it. Solved." (Roadmap slide: "Next, the same agent on WhatsApp, where 500 million Indians already are.")

**Pacing rule:** the war-room + the real email arriving is the emotional peak — slow down there, let it land. Everything else is fast.

## 2. What must be seeded before the demo (see `05 §3`)
- 30–50 historical issues across wards/dates so the map and dashboard look alive.
- **The 12-report cluster** at one spot (the "12 citizens affected" moment).
- **The hotspot street** (≥4 unresolved drainage reports/90d) for the prediction.
- All `authorities` routing to your **demo inbox**; verify mail delivery the morning of.
- One issue staged at "In Progress" ready for the **before/after** verification (have the after-photo on the phone).

## 3. Live-demo safeguards (never get caught on stage)
- **Pre-recorded clean Bengali audio** loaded as a fallback if the mic/room is noisy.
- **Cached/scripted demo run:** if a live Gemini call rate-limits or lags, fall back to the cached run for the same input so the war-room still plays. (Be honest if asked; it's a network safeguard, not faked logic.)
- **Warm Cloud Run** with a ping right before presenting (avoid cold-start lag).
- **Backup demo video** (screen recording of a perfect run) in case live network dies entirely.
- Test the whole script on the actual phone + network you'll present on.

## 4. Pitch narrative (the story judges remember)
Lead with **Ashok** (the shopkeeper who can't type English) — the voice path isn't a feature, it's *inclusion*. Then the thesis: **most civic apps report; Jagrik acts.** Emphasize the three things that are genuinely hard and genuinely done: real autonomous dispatch, AI fix-verification, and local routing that knows the actual KMC structure. Name the Google stack explicitly (it's 15% and these judges care): "Gemini multimodal for vision and voice, Gemini function-calling for the routing agent, Firebase, BigQuery, all deployed on Cloud Run via AI Studio."

## 5. Map each rubric criterion to a demo beat (say the words)
- **Impact:** the Bengali voice inclusion story + closing the loop with verification.
- **Agentic Depth:** the war-room real-action checkpoints (email/PDF/escalation) + function-calling router.
- **Innovation:** voice intake, AI before/after verification, predictive hotspots, visible multi-agent orchestration.
- **Google tech:** name every Google service as you use it.
- **Design:** let the war-room and the clean mobile UI speak.
- **Completeness:** one unbroken flow, nothing crashes.

## 6. Submission artifacts (all three are mandatory — `01`/rules)
1. **Deployed link** — the public Cloud Run URL. Must stay live through judging. Test in incognito on mobile.
2. **GitHub repo** — clean history, a real README (setup + deploy + architecture summary + a link to this docs folder), `.env.example`, no secrets committed. Include a short architecture diagram.
3. **Project Description Google Doc** (link-accessible to anyone) containing exactly:
   - **Problem Statement Selected:** Problem Statement 2 — Community Hero.
   - **Solution Overview:** the thesis paragraph from `01 §2`.
   - **Key Features:** F1–F10 condensed.
   - **Technologies Used:** React/Vite/TS, Tailwind, Node/Express, Firestore, etc.
   - **Google Technologies Utilized:** Gemini (multimodal vision+audio, function calling), Firebase (Firestore, Anonymous Auth, Storage), Google Maps Platform, BigQuery, Cloud Run, Google AI Studio.
   - Keep it accessible and unchanged through evaluation (they may check version history).

## 7. Final submit (BlockseBlock) — irreversible
Submit on the platform only when the deployed link, repo, and doc are all final and verified. Steps: Create Project → name + select Problem Statement 2 → paste the three links → toggle the notes → Continue → **Final Submit**. Once final-submitted you cannot edit. Do it before the **29 June 2026, 2:00 PM** deadline with buffer — not at 1:55 PM.

## 8. Pre-submission smoke test (run this cold, start to finish)
- [ ] Incognito mobile: report by photo → real email arrives → PDF downloads.
- [ ] Report by Bengali voice → correct English complaint.
- [ ] Map pin + timeline render.
- [ ] "12 citizens affected" issue opens correctly.
- [ ] Before/after verification flips an issue to Resolved.
- [ ] Dashboard shows the predicted hotspot.
- [ ] No console errors; no key in the network tab.
- [ ] All three submission links open for a stranger.
