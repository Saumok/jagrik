# 03 — APP FLOW

> Every route, screen, state, and journey. Visuals/components are specified in `04`; data in `05`.

## 1. Information architecture (routes)

| Route | Screen | Purpose |
|---|---|---|
| `/` | **Hero / landing** | The judge-catching showcase: thesis, the tilted liquid-glass panel showing the app's multiple workings, "how it works", and the future/roadmap band. Primary CTA → `/app`. Full spec in `04 §4`. |
| `/app` | **Live map** | Live map of issues + a prominent "Report" action. The working app home. |
| `/report` | **Report flow** (modal/sheet over map) | Photo or voice intake → live war-room → result. |
| `/issue/:id` | **Issue detail** | Photo, classification, routed authority, complaint PDF, status timeline, verify-fix action. |
| `/dashboard` | **Hotspot dashboard** | Predictive insights, ward report card, leaderboard. |

Navigation: the landing (`/`) is a marketing-style showcase with one clear "Open the live app" CTA into `/app`. Inside the app, a bottom tab bar on mobile (Map · Report · Dashboard), top bar on desktop. "Report" is the visually dominant action everywhere inside the app. (The hero doubles as the "about/pitch" surface judges land on — no separate `/about` needed.)

## 2. The core journey — Report → Dispatch (the money flow)

This is the flow judges watch. It must be flawless. Steps map to agents in `06`.

```
[Home/Map]
   │  user taps the big "Report" button
   ▼
[Intake] choose ONE:
   ├─ 📷 Photo: capture or upload  ─┐
   └─ 🎤 Voice: hold to record (Bengali/Hindi/English) ─┐
                                                         │
   • device geolocation captured automatically (with permission)
   • optional one-line text note
                                                         ▼
[Submit] → POST /api/report  (multipart: image and/or audio + lat/lng + note)
   ▼
[WAR-ROOM opens] live console streams real agent steps (subscribes to agent_runs/{runId}):
   1. 🧠 CLASSIFIER  → "Pothole detected · severity 4/5 · est. ₹8–15k · on a school route"
        (for voice: first transcribes + translates, shown as a step)
   2. 🗺️ ROUTER     → "Routed to KMC Roads Dept (Borough VII) · priority HIGH"
        → also runs DUP-CHECK: "Matched 11 existing reports within 80m → merging"
   3. ✍️ DRAFTER    → "Formal complaint drafted (EN) + evidence attached"
   4. 📤 DISPATCHER → "PDF generated ✓   Email sent to roads.borough7@demo ✓"
   5. ⏱️ ESCALATOR  → "Auto-escalation scheduled: +5 days if unresolved"
   ▼
[Result card]
   • Tracking ID, status = Reported (or "12 citizens affected" if merged)
   • buttons: View on map · Download PDF · View timeline
   ▼
[Issue detail /issue/:id]
```

**War-room behavior:** each step appears as the backend completes it (steps are written to Firestore as they finish; client renders on snapshot). Under `prefers-reduced-motion`, steps appear instantly instead of typewriter-streaming. If a step errors, it renders in the error style with a retry affordance and the run halts gracefully (no silent hang).

## 3. Intake states & edge cases

- **No geolocation permission:** fall back to a draggable map pin + Geocoding to name the area. Never block reporting on location.
- **Photo unclear / not a civic issue:** Classifier returns low `confidence` or `issueType: "unclear"` → war-room asks the user to retake or add a voice note, rather than filing garbage.
- **Voice not understood / silence:** prompt to re-record; offer photo or text fallback.
- **Duplicate detected:** result shows the merged ticket ("You're the 12th person to report this") and links to the existing issue rather than creating a new one.
- **Offline / network drop mid-run:** show a clear retry; the partial run in `agent_runs` is resumable or restartable.

## 4. Issue detail flow

```
[Issue detail]
  • hero: the reported photo + map pin
  • classification chips: type · severity · est. cost · risk line
  • routed authority card: department, channel, the sent complaint (View PDF)
  • STATUS TIMELINE (vertical):
        Reported ──● (agent)
        Acknowledged ──○      ← demo: operator/seed can advance these
        In Progress ──○
        Resolved ──○
  • "Mark as fixed" → opens VERIFY flow
  • affected-count + "me too" (increments cluster, no new ticket)
```

## 5. Before/after verification flow (F7)

```
[Issue detail] → "Mark as fixed"
   ▼
[Upload after-photo]  (capture/upload of the same spot, now repaired)
   ▼
POST /api/verify  (before-photo URL + after-photo)
   ▼
[Gemini compares] → returns { fixed: true|false, confidence, reason }
   ▼
  fixed=true  → status flips to RESOLVED, timeline completes, reporter earns Civic Score points,
                a "verified by AI" badge shows on the issue
  fixed=false → stays In Progress, shows the AI's reason ("debris still present"),
                offers to re-submit later
```

## 6. Dashboard flow (F9 + F10)

```
[Dashboard]
  • Predictive hotspots: ranked list/map heat of streets/wards with a plain-language
    prediction per hotspot ("Garia Main Rd: 4 drainage reports/90d → monsoon flood risk").
    Data via GET /api/dashboard → BigQuery aggregation over seeded + live issues.
  • Ward report card: total reported / resolved / avg resolution time / slowest department.
  • Leaderboard (gamification): top neighborhoods/citizens by Civic Score
    (points awarded on RESOLUTION, not reporting).
```

## 7. Global states to design (don't skip — see `04` for copy)

- First-load empty map (no issues yet) → invites the first report.
- Loading skeletons for map, war-room, dashboard.
- Error states for each `/api/*` call.
- Permission-denied (camera / mic / location) explainer with a path forward.
- Success toasts that use the same verb as the action ("Reported", "Resolved").

## 8. What advances status in the demo

To keep the demo honest but controllable: the **agent** sets `Reported` and (on verification) `Resolved`. `Acknowledged`/`In Progress` are advanced by **seeded data** for pre-existing demo issues, or by a hidden operator action, so the timeline looks alive without claiming a fake government integration. Document this clearly in code comments and in `09`.
