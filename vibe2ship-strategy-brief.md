# Vibe2Ship Hackathon — Full Strategy Brief & Build Context

> **Purpose of this file:** A complete, self-contained context dump so any LLM (or teammate) can pick up cold and have full understanding of the hackathon, the analysis done, the decision made, the winning architecture, and the verified zero-cost build plan. Read top to bottom.
>
> **Last updated:** 24 June 2026
> **Status:** Strategy locked (Problem Statement 2). Next step = detailed agent architecture build.

---

## 0. TL;DR (read this first)

- **Event:** Vibe2Ship hackathon. Build window **22 Jun 3:00 PM → 29 Jun 2026 2:00 PM**. Late = rejected.
- **Hard rule:** Final app **must be deployed on Google Cloud** (AI Studio → Cloud Run path).
- **Decision (locked):** Build **Problem Statement 2 — Community Hero (hyperlocal civic problem solver)**, NOT the productivity assistant.
- **Why:** PS1 ("AI productivity assistant") is structurally capped on the Innovation criterion (saturation ceiling you can't engineer away). PS2's only weakness (simulated actions / demo seeding) IS fixable. A fixable weakness beats an unfixable ceiling.
- **The winning move:** Don't build a CRUD reporting form. Build an **autonomous civic agent** that classifies a photo, auto-routes to the correct authority, **dispatches a REAL complaint (email + downloadable PDF)**, and **auto-escalates on a schedule**. Real, observable actions = top marks on Agentic Depth (20%, the event's whole theme).
- **Cost:** Achievable at **₹0 charged**, but **a credit card on file is required** (Cloud Run + Maps mandate billing enabled as of 2026; a linked card is a deposit, never withdrawn within free limits). Critical trick: keep Gemini on a separate **billing-free** project so its free tier survives.
- **Builder edge:** 2-person Kolkata team, strong in frontend/design + storytelling (Meta ads, reels) + AI automation. Local authenticity (real KMC departments, real Kolkata streets) is unfakeable by out-of-town teams.

---

## 1. Who is building this (team context)

- **Team:** Two-person agency ("Agentic Bros" / AgenticBro), based in **Kolkata, India**.
- **Strengths:** Fast, polished web/frontend builds; strong visual design taste; storytelling and creative (runs Meta ad campaigns + makes reels for a Himalayan trekking brand); AI automation (has built WhatsApp chatbot prototypes, RAG apps, compliance assistants).
- **Profile note:** NOT primarily deep-backend / ML researchers. Design + shipping speed + narrative is the competitive edge. Strategy is chosen to amplify that.
- **Working preference:** Dense, technical, inference-heavy outputs. Proactive. Minimal hand-holding. Will build fast.

This matters because the recommended problem statement is chosen to play to design/storytelling strength and local authenticity, not to a backend-heavy comfort zone.

---

## 2. The hackathon rules (verbatim-faithful summary of the official brief)

### 2.1 Build phase
- Choose **one of two** problem statements and build a **functional** solution within the window **(22 Jun 3:00 PM – 29 Jun 2026 2:00 PM)**.
- **Submission deadline: 29 June 2026, 2:00 PM.** Late entries are **not** accepted.
- The **final deployable link must be deployed on Google Cloud.** Allowed tooling includes Google AI Studio, Antigravity, etc.
- **Mentor session: 24 June 2026, 4:00–6:00 PM** (problem walkthroughs, recommended approaches, AI Studio deployment guidance). *(Note: this is TODAY relative to the last-updated date — attend it and validate the deploy path immediately after.)*
- Submissions accepted **only through the BlockseBlock platform** used at registration.
- AI tools, open-source libraries, and public resources are **allowed and encouraged**, but the submission **must reflect the participant's own work, understanding, and implementation.** (Translation: don't ship an agent you can't explain to the jury — they will ask.)

### 2.2 Mandatory submission requirements
1. **Deployed Application Link** — publicly accessible, fully functional, deployed on Google Cloud, must stay live through the evaluation period. (Ref: `https://ai.google.dev/gemini-api/docs/aistudio-deploying`)
2. **GitHub Repository Link** — source code + documentation.
3. **Project Description (Google Doc link)** — must contain:
   - Problem Statement Selected
   - Solution Overview
   - Key Features
   - Technologies Used
   - Google Technologies Utilized
   - Doc must be link-accessible to anyone and remain available; organizers may review version history.

### 2.3 Submission steps (BlockseBlock)
1. Dashboard (`https://blockseblock.com/dashboard`) → **Create Project**.
2. Enter unique Project Name → select chosen Problem Statement → **Save & Next**.
3. Provide mandatory links → **Submit Now**.
4. Toggle ON both notes → **Continue**.
5. **Final Submit** — irreversible. No edits/resubmits after this. Only do it when fully satisfied.

---

## 3. The evaluation matrix (this drives EVERY decision)

| Criteria | Weight |
|---|---|
| Problem Solving & Impact | 20% |
| **Agentic Depth** | **20%** |
| Innovation & Creativity | 20% |
| Usage of Google Technologies | 15% |
| Product Experience & Design | 10% |
| Technical Implementation | 10% |
| Completeness & Usability | 5% |

**Strategic reading of the rubric:**
- **60% sits in three "soft" criteria** — Problem & Impact, Agentic Depth, Innovation — all weighted equally at 20%. The winner must score HIGH on all three simultaneously.
- **Agentic Depth (20%) is the swing criterion.** The event is literally "Vibe2Ship" — judges want **agents that take autonomous action**, not a Gemini chatbot in a nice wrapper. This single criterion decides most winners.
- **Google Tech (15%)** is near-free points if you architect Google-native (Gemini + Maps + Firebase + Cloud Run + BigQuery + AI Studio deploy).
- **Design + Tech Impl + Completeness = only 25% combined.** Being merely polished-but-ordinary will NOT win. Novel + agentic + impactful wins.

---

## 4. Problem Statement 1 — The Last-Minute Life Saver

**Background:** People miss deadlines, meetings, bills, interviews. Existing tools use passive, ignorable reminders.

**Challenge:** Build an AI productivity companion that **proactively** helps users plan, prioritize, and **complete** tasks before deadlines are missed — beyond reminders, toward meaningful action.

**Example features listed:** intelligent task prioritization; AI scheduling; personalized productivity recommendations; context-aware reminders; calendar integration; goal/habit tracking; voice assistance; **autonomous task planning and execution.**

**Evaluation focus:** Show how AI improves productivity by helping users decide better and complete tasks.

### Honest critique of PS1
**Strengths**
- Naturally agentic — "autonomous task planning and execution" is in the brief itself; the Agentic Depth ceiling is high.
- Can take **real, verifiable actions** in a live demo (actually create a Google Calendar event, draft a real Gmail, reschedule) via Calendar/Gmail APIs + Gemini function-calling. Real tool execution is the most convincing possible proof of agency.
- **Single-user by nature → demos naturally with no faking.**
- Trivial, clean Google-tech fit (Calendar, Gmail, Tasks, Gemini).
- Easy to scope to "finished."

**Weaknesses**
- **Innovation (20%) is the killer.** "AI productivity assistant" is the single most saturated hackathon category on earth. Judges will have seen many. Novelty score is **structurally capped ~60–65% no matter how clean the build.** This is a ceiling you cannot engineer away.
- The brief sets a trap: "move beyond reminders." If the agent doesn't actually *execute*, it becomes the very thing the brief warns against.
- **Impact is abstract** — productivity gains are personal, invisible, hard to make a 2-minute demo "wow," no emotional hook for judges.

---

## 5. Problem Statement 2 — Community Hero (Hyperlocal Problem Solver)

**Background:** Communities face potholes, water leakages, broken streetlights, waste issues, infrastructure problems. Reporting is fragmented, hard to track, opaque.

**Challenge:** Build a platform letting citizens **identify, report, validate, track, and resolve** community issues through collaboration, data, and intelligent automation — encouraging transparency, accountability, participation.

**Example features listed:** image/video issue reporting; AI issue categorization; geo-location + mapping; community verification; real-time tracking; impact dashboards; predictive insights; gamification.

**Evaluation focus:** Show how AI helps communities address local challenges more efficiently via better reporting, verification, tracking, resolution.

### Honest critique of PS2
**Strengths**
- **Tangible, visceral, emotionally resonant impact (20%)** — civic problems photograph well and land emotionally. A pothole hits a judge in a way a to-do list never will.
- **Best-in-class Google fit** — Maps Platform + Gemini multimodal Vision + Firebase + BigQuery. Can nearly max the 15%.
- **Multimodal image categorization = instant visual wow** for Innovation.
- **Less saturated** as a *polished agentic* build than PS1.
- **Local authenticity is unfakeable** for a Kolkata team (real KMC departments, real streets).

**Weaknesses (and which are fixable)**
- **Agentic Depth trap (FIXABLE):** the *default* build is CRUD — upload photo → categorize → store → pin on map. That's a data flow, not an agent, and scores ~50–55% on the most important criterion. **Fix: add an autonomous routing + drafting + dispatch + escalation loop (see §8).**
- **Simulated-action weakness (FIXABLE):** you can't really file with Kolkata Municipal Corporation live on stage, so actions feel fake. **Fix: make at least one action REAL and observable — a real email dispatched + a real downloadable PDF complaint + a real scheduled follow-up.**
- **Scope creep (manage with discipline):** report + verify + track + dashboard + gamification = five features. Half-building all = broken demo. **Fix: one flawless vertical slice; seed/fake community + gamification data.**
- **Community features don't demo solo (manage):** can't show real multi-user verification with one person. Seed convincingly; do NOT build real multi-user verification in 5 days.

---

## 6. Head-to-head scoring (realistic ceilings for a strong 2-person team)

% of each criterion captured:

| Criterion (weight) | PS1 | PS2 (agentic-engineered) | PS2 (default CRUD) |
|---|---|---|---|
| Problem & Impact (20) | 65% | **88%** | 85% |
| Agentic Depth (20) | **88%** | 80% | 55% |
| Innovation (20) | 60% | 75% | 65% |
| Google Tech (15) | 85% | **92%** | 90% |
| Product/Design (10) | 78% | 85% | 80% |
| Tech Impl (10) | 78% | 72% | 70% |
| Completeness (5) | 95% | 65% | 70% |
| **Weighted total** | **~76%** | **~81%** | **~74%** |

**Reading:** PS2 has the higher ceiling and wins — **but only if the agentic layer is deliberately engineered.** Built the obvious (CRUD) way, PS2 drops *below* PS1. PS1 is the higher-*floor*, lower-variance play, permanently capped by innovation fatigue.

---

## 7. THE DECISION (and why it survived re-examination)

**Build Problem Statement 2 — Community Hero, engineered as an autonomous civic agent.**

This was deliberately stress-tested against flipping to PS1. The strongest case for PS1: real verifiable actions (real Calendar event / real Gmail) are the most convincing form of Agentic Depth, and a single-user app demos with zero faking. That argument is real and was taken seriously.

**Why the decision did NOT flip to PS1:**
- PS1's Innovation ceiling (category saturation) is a **hard cap you cannot raise** — no amount of engineering makes "AI to-do assistant" feel novel to a jury.
- PS2's only genuine weaknesses (simulated actions, demo seeding) are **engineerable away** — make the action real, seed the community data.
- **Principle: a weakness you can fix beats a ceiling you can't raise.**
- PS2 also maximizes the specific team's edge: design/dashboard polish, storytelling impact narrative, and unfakeable Kolkata locality.

Decision is **locked.** Do not relitigate unless a blocking technical constraint emerges.

---

## 8. The winning architecture — the autonomous civic agent loop

**Core principle:** Ship an *agent that acts*, not a *form that stores*. Every step below is an autonomous decision/action, not a passive CRUD operation.

```
Citizen submits PHOTO + LOCATION
        │
        ▼
[Gemini Vision]  → classify issue TYPE + SEVERITY (pothole / drainage / streetlight / waste …)
        │
        ▼
[Routing Agent — Gemini function-calling]  autonomously:
   1. Identify the CORRECT authority/department
        (e.g. KMC Roads vs. KMC Drainage vs. CESC for streetlights)
   2. DRAFT a formal grievance in the correct format
   3. Assign PRIORITY (from severity + type + recurrence)
   4. DISPATCH A REAL ACTION  ← this is what wins Agentic Depth
        • generate a real downloadable PDF complaint, AND
        • fire a real email to a tracked inbox (judge's / demo grievance inbox)
   5. SCHEDULE AUTO-ESCALATION if unresolved after N days
        │
        ▼
[Live Map]  pin issue, status tracking
        │
        ▼
[BigQuery hotspot dashboard]  flag recurring problem streets / predictive insights
```

**Why this configuration wins:**
- The **real email + real PDF + real scheduled follow-up** gives PS2 the "the agent actually DID something" credibility that PS1 normally owns — without giving up PS2's higher Impact and Innovation ceilings.
- **Multimodal vision categorization** is the instant visual wow for Innovation.
- **BigQuery hotspot prediction** adds an "intelligent automation / predictive insights" layer the brief explicitly rewards.
- **Local authenticity:** real Kolkata street → real KMC department → real escalation path. Out-of-town teams cannot fake this.

**The demo narrative (the ~90-second wow):** A real Kolkata pothole photo → ~8 seconds later the agent has categorized it, identified the responsible KMC department, drafted + dispatched a real complaint (email lands + PDF downloads on screen), pinned it live, and flagged the street as a recurring hotspot.

**Scope discipline (protects Completeness 5% AND the demo):**
- Build **ONE vertical slice flawlessly:** report → categorize → auto-route + real complaint dispatched → track → hotspot dashboard.
- **Seed** community verification + gamification numbers with fake data. Do **NOT** build real multi-user verification in 5 days.
- One unbroken demo flow beats five half-built features every time.

---

## 9. ZERO-COST BUILD PLAN (verified June 2026)

**Honest headline:** **Zero dollars *charged* — yes, achievable.** **Zero *card on file* — no.** The mandatory Google Cloud deployment (Cloud Run) and Maps both require billing enabled in 2026. **Linking a card is a deposit, never withdrawn while you stay under free limits.** If you refuse a card entirely, your only escape is dropping Cloud Run — which the rules forbid. So the card is non-negotiable; the charge is avoidable.

### 9.1 Component-by-component (verified)

| Piece | Free? | Verified detail (mid-2026) | Source |
|---|---|---|---|
| **Gemini API** (vision + agent brain) | Truly free, no card, no expiry | ~1,500 requests/day, 1M tokens/min, ~15 RPM. Multimodal image input + function calling included. Use **Gemini 3 Flash / 3.1 Flash-Lite**. | ai.google.dev rate-limits; tokenmix.ai |
| **Gemini Pro** | NOT free | Pro removed from free tier **April 2026**. You don't need it — Flash/Flash-Lite handle classify/route/draft fine. | apiyi.com; usagebox.com |
| **Deprecated models** | Avoid | Gemini **2.0 Flash / 2.0 Flash-Lite deprecated 1 June 2026**. Migrate to 2.5/3 Flash. | apiyi.com; findskill.ai |
| **Google Maps** | Free under caps | Essentials SKUs (Dynamic Maps, Geocoding) = **10,000 free events/month** each; Map Tiles = 100,000; **Maps Embed = unlimited free**. Card mandatory even if never charged. | developers.google.com/maps; nicolalazzari.ai |
| **Cloud Run** (mandatory deploy) | Free under caps | **2M requests/month + 180,000 vCPU-seconds**, never expires. **Must deploy in us-central1 / us-east1 / us-west1** or free tier doesn't apply. Billing must be enabled (Feb 2026 rule). | cloud.google.com/run/pricing; cloudchipr.com |
| **Firestore + Firebase Auth + Hosting** | Free (Spark) | Daily read/write caps reset midnight Pacific — fine for a demo. | Firebase Spark tier |
| **BigQuery** (hotspot dashboard) | Free | **1 TB querying/month + 10 GB storage** free. | cloud.google.com/free |
| **$300 / 90-day credit** | Bonus buffer | New accounts get $300 over 90 days as a safety net beyond Always Free. | cloud.google.com/free |

### 9.2 THE CRITICAL MONEY TRICK (do not skip)

Enabling billing on a Google Cloud project **deletes the Gemini free tier on that project** — every call becomes billable from the first token. So **split into two projects:**

- **Project A — NO billing.** Holds your **Gemini API key**. Free tier stays intact.
- **Project B — billing ON (card linked).** Runs **Cloud Run + Maps**.
- Your Cloud Run app (Project B) simply **calls Project A's Gemini key.** The API key determines quota/billing, not where the calling code runs → **Gemini stays free.**

Then on **Project B**, set a **₹1 budget alert** (thresholds 50% / 90% / 100%). If anything ever ticks, you get an email instantly. That architecture is the difference between "free" and a surprise bill.

### 9.3 Free-tier gotchas to remember
- Gemini free-tier **trains on your inputs/outputs** (paid + Vertex AI don't). For public-infrastructure photos this is low-risk; just avoid uploading identifiable faces / plates in the demo, or blur them.
- Gemini limits are **per project, not per API key** — extra keys in the same project do NOT add quota. Limits reset midnight Pacific.
- Cloud Run free tier is **per billing account, aggregated across projects.**
- Always-Free quotas are mostly **US-region only** — deploy in a free-tier US region.
- Google has cut free quotas before (Dec 2025, –50–80%) without notice. Treat limits as ballpark; check AI Studio for live caps.

### 9.4 Alternative if the card is a hard blocker
The only fully card-free path is dropping Cloud Run for something like Leaflet + OpenStreetMap (no key, no card) for the map — but **the rules mandate Google Cloud deployment**, so Cloud Run (and therefore a linked card) is effectively required. Accept the card; rely on the two-project split + budget alert to guarantee ₹0 charged.

---

## 10. Recommended Google-native stack (to name in the Project Description doc)

- **Gemini 3 Flash / 3.1 Flash-Lite** — multimodal vision classification + function-calling routing agent.
- **Google Maps Platform** — Dynamic Maps / Embed + Geocoding for location + live issue map.
- **Firebase** — Auth + Firestore (realtime issue DB) + Hosting.
- **Cloud Run** — mandatory deploy target (us-central1, free tier).
- **BigQuery** — hotspot / predictive recurrence dashboard.
- **Google AI Studio** — build + deploy path (per the brief's deploy doc).
- (Optional) **Cloud Functions / Cloud Scheduler** — the auto-escalation timer.

Naming these explicitly maximizes the **Usage of Google Technologies (15%)** score.

---

## 11. Risk checklist & cautions

- [ ] **Validate the AI Studio → Cloud Run deploy path on Day 1/2**, right after the mentor session. Deployment friction kills more submissions than bad code. Hit that wall early, not at 1 PM on the 29th.
- [ ] **Two-project billing split done + ₹1 budget alert set** before any heavy usage.
- [ ] **Deploy in a free-tier US region** (us-central1).
- [ ] **One vertical slice only** — resist scope creep; seed community/gamification data.
- [ ] **Make ≥1 agent action REAL** (email + PDF + scheduled escalation), not simulated.
- [ ] **Be able to explain the agent to the jury** — rules require own understanding; don't ship unexplainable vibe-code.
- [ ] **Keep the deployed link live** through the whole evaluation period.
- [ ] **Final Submit is irreversible** — only click when fully satisfied.

---

## 12. Open thread / next action

**Immediate next deliverable to request from the LLM:** the exact agent architecture —
- the **function-calling schema** for the routing agent,
- the **KMC department mapping** (issue type → correct authority + contact),
- the **system prompt** for the routing/drafting agent,
- the **PDF complaint template** + the **escalation scheduler** design.

That's the "start building tonight" package. Everything above is the locked context it should build on.

---

*End of brief.*
