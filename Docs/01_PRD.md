# 01 — PRODUCT REQUIREMENTS DOCUMENT (PRD)

> Source of truth for *what* we are building and *why*. Technical "how" lives in `02_TRD.md`.

## 1. Problem

Reporting civic problems in Indian cities is fragmented, opaque, and discouraging. A citizen who sees a pothole, an overflowing drain, or a dead streetlight has no single, simple way to (a) reach the *correct* department, (b) file it in a form that authority will act on, (c) track whether anything happened, or (d) prove it was fixed. The friction is highest for the people most affected: those who can't easily type formal English complaints or navigate government grievance portals. The result is learned helplessness — people stop reporting because reporting feels pointless.

## 2. Product thesis

**Jagrik turns a single photo or spoken sentence into a formal, correctly-routed, tracked complaint — and then autonomously chases it to resolution.** It is not a reporting form. It is an *agent that acts on the citizen's behalf*: it writes the complaint, sends it to the right authority, follows up, escalates, and verifies the fix. The citizen's only job is to point and speak.

One line for the pitch: **"See it. Say it. Solved."**

## 3. Target users & personas

- **Riya, 34, working professional, Kolkata.** Comfortable on a phone, no patience for government portals. Wants to report and forget, and get notified when it's fixed. Primary happy-path user.
- **Ashok, 58, shopkeeper, limited English typing.** Will *speak* a complaint in Bengali but would never fill an English form. The **voice + multilingual** path exists for him. He is the impact story.
- **The Ward, as a whole.** The dashboard treats the neighborhood as the "user" — surfacing where problems cluster and which authorities are slow. Useful to active citizens, RWAs, and councillors.
- **(Secondary) Municipal staff.** Receive clean, structured, correctly-addressed complaints with photo evidence and location — easier to act on than a vague phone call.

## 4. Goals & success metrics

**Product goals**
- G1: Reduce "I saw a problem" → "the right authority has been formally notified" to **under 30 seconds**.
- G2: Make reporting possible **without typing and without English** (voice + multilingual).
- G3: Make the system's *action* **visible and trustworthy** (the war-room + status timeline).
- G4: Close the loop — **verify** fixes, don't just collect reports.

**Demo success metrics (what we prove on stage)**
- Photo/voice → dispatched complaint in **≤ 10 seconds**, live, no edits.
- A real email lands in the demo inbox and a real PDF downloads, in front of the judges.
- The before/after verification visibly flips an issue to Resolved.
- The dashboard shows a real predicted hotspot from seeded data.

## 5. Scope — features (MoSCoW)

### MUST (the spine — ship first, in `08` Phase order)
- **F1 Multimodal intake:** report via photo upload/capture **and** via voice (record → transcribe → understand). Language: Bengali, Hindi, English auto-detected.
- **F2 AI classification:** Gemini returns `issueType`, `severity` (1–5), `estimatedRepairCost` (range), `riskContext` (one plain-language line, e.g. "on a school route — high accident risk"), and `confidence`.
- **F3 Autonomous routing:** map issue → correct authority/department using the KMC routing map (`06`). Output the department, the contact channel, and the priority.
- **F4 Real complaint dispatch:** generate a formal complaint, render a **downloadable PDF**, and **send a real email** to the routed authority address (a controlled demo inbox in testing). Persist the artifact + a tracking ID.
- **F5 Visible multi-agent war-room:** a live console that streams the agents' actual steps and the real-action checkpoints (email sent ✓, PDF ready ✓). **Signature feature.**
- **F6 Live map + status timeline:** every issue pinned by gelocation; a public timeline (Reported → Acknowledged → In Progress → Resolved) the agent updates.

### SHOULD (the wow layer — Phase 4+, all four are in scope for the aggressive build)
- **F7 AI before/after verification:** on "mark fixed," citizen uploads an after-photo; Gemini compares and confirms or rejects the fix.
- **F8 Duplicate-clustering:** reports within a geo radius of the same type merge into one ticket with an "N citizens affected" count.
- **F9 Predictive hotspot dashboard:** BigQuery-backed view that flags streets/wards with recurring issues and a plain-language prediction ("4 drainage reports in 90 days → monsoon flood risk").
- **F10 Smart gamification:** a Civic Score and neighborhood leaderboard where points are awarded on **resolution**, not on reporting (anti-spam).

### COULD (only if everything above is flawless)
- Push/email notifications to the reporter on status change.
- Shareable public "accountability card" auto-generated when an issue breaches its SLA.

### WON'T (explicitly out of scope — do not build)
- **Real multi-user accounts / real community verification at scale.** Seed this data instead (see `05`). One solo builder cannot generate organic civic traffic in the build window.
- **A native mobile app.** Web only (responsive).
- **A real WhatsApp channel.** It is a *roadmap slide* in the pitch, not built. (Rationale in the master brief: separate channel, live Meta dependency, zero Google-tech credit.)
- **Real integration with live government APIs.** We send real email + PDF to a controlled address and simulate the authority's acknowledgement via the demo seed/operator action.

## 6. Key user stories (acceptance-test these)

- *As Ashok,* I tap the mic, say in Bengali "the streetlight outside my shop has been dead for a week," and within seconds I see a formal English complaint addressed to the right department, with a tracking ID — **without typing anything.**
- *As Riya,* I photograph a pothole; the app tells me how severe it is, who's responsible, files it, and shows me a live timeline I can return to.
- *As a judge,* I watch the war-room narrate real agent steps and see a real email + PDF produced live.
- *As a ward-watcher,* I open the dashboard and immediately see which street is a recurring problem and what's predicted next.
- *As any reporter,* when the issue is fixed I upload an after-photo and the AI confirms the fix, flipping the ticket to Resolved.

## 7. How this maps to the judging rubric (build toward these weights)

| Criterion | Weight | How Jagrik wins it |
|---|---|---|
| Problem Solving & Impact | 20% | Real, visceral civic problem; voice+multilingual unlocks the underserved; closes the loop with verification. |
| **Agentic Depth** | **20%** | Real separate agents taking *real actions* (email/PDF/escalation), shown live in the war-room. |
| Innovation & Creativity | 20% | Multimodal voice intake, AI before/after verification, predictive hotspots, visible agent orchestration. |
| Usage of Google Technologies | 15% | Gemini multimodal (vision+audio) + function calling, Firebase, Cloud Run, Maps, BigQuery, AI Studio deploy. |
| Product Experience & Design | 10% | Distinctive, polished, mobile-first design system (`04`); the war-room as signature. |
| Technical Implementation | 10% | Clean multi-agent architecture, realtime data, solid deploy. |
| Completeness & Usability | 5% | One flawless end-to-end vertical slice; nothing broken on stage. |

## 8. Non-goals for the demo (protect focus)

Do not spend effort on: account management UIs, settings screens, admin panels, onboarding tutorials, dark-mode toggles, or anything a judge won't see in the 90-second flow. Every hour goes into the six Definition-of-Done items in `00`.
