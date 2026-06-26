# 06 — AGENT ARCHITECTURE (the brain)

> This is the heart of the 20% Agentic Depth score. The agents must be **real, separate, and observable**. Each writes its step to `agent_runs` as it completes, which is what the war-room renders. Do not collapse this into one prompt that fakes steps.

## 1. Orchestration model

A backend **Orchestrator** (`/api/report`) runs the pipeline in sequence, persisting each step. Each "agent" is a focused Gemini call (or deterministic function) with a single responsibility and a typed output. The Orchestrator is plain code; the *intelligence* is in the agents. This is a pragmatic multi-agent pattern: specialized roles + a coordinator, which reads as genuine agentic design to judges while staying debuggable for a solo build.

```
/api/report receives {image?, audio?, lat, lng, note?}
  └─ create agent_runs/{runId} (status: running)
  └─ STEP 1  Classifier   (Gemini multimodal)   → writes step
  └─ STEP 2  Router        (function-calling)    → writes step  ┐ runs Dedupe check inside
  └─ STEP 2b Dedupe        (geo query)           → writes step  ┘ → may MERGE & stop
  └─ STEP 3  Drafter       (Gemini text)         → writes step
  └─ STEP 4  Dispatcher    (PDF + email tools)   → writes step + checkpoints
  └─ STEP 5  Escalator     (schedule writer)     → writes step + checkpoint
  └─ create issues/{id}, finish run (status: done)
```

Run agents **server-side only** (key stays private). Stream by writing each step to Firestore the moment it completes; the client's snapshot listener animates it.

## 2. Agent: CLASSIFIER (multimodal)

**Responsibility:** from photo and/or audio, produce a structured classification. For voice, it also transcribes + translates as part of its reasoning and returns the original-language transcript.

**Input:** image bytes and/or audio bytes + optional user note + coarse location/area.
**Output (strict JSON — instruct the model to return ONLY this):**
```json
{
  "issueType": "pothole|drainage|streetlight|garbage|water_supply|other|unclear",
  "severity": 1,
  "estimatedRepairCost": { "minInr": 0, "maxInr": 0 },
  "riskContext": "one plain-language line, or empty",
  "transcript": "original-language transcript if audio, else empty",
  "transcriptLang": "bn|hi|en|null",
  "confidence": 0.0
}
```

**System prompt (use verbatim, tune lightly):**
> You are the Classifier in a civic-issue triage system in Kolkata, India. You receive a photo and/or a voice recording of a public infrastructure problem. Identify the single most likely issue type from the allowed list. Rate severity 1–5 where 5 means immediate danger to people (e.g. an open manhole, a live exposed wire, a pothole on a fast school route) and 1 means cosmetic. Give a realistic Indian municipal repair-cost range in INR. Write one short, plain-language risk line a citizen would understand; omit if none. If audio is present, transcribe it in its original language and set transcriptLang. If the input does not clearly show a civic infrastructure issue, return issueType "unclear" with low confidence rather than guessing. Respond with ONLY the JSON object, no prose, no markdown.

**Guardrails:** if `confidence < 0.45` or `issueType == "unclear"`, the Orchestrator stops the pipeline and the war-room asks the user to retake/re-record (see `03 §3`). Never file an unclear issue.

## 3. Agent: ROUTER (function-calling) + DEDUPE

**Responsibility:** choose the correct authority and priority, and check for duplicates. This is the agent that most clearly "takes a decision," so expose it as **Gemini function-calling** with real tools — that visible tool-use is strong evidence of agentic depth.

**Tools to declare to the model:**
```json
[
  {
    "name": "lookup_authority",
    "description": "Find the municipal authority that handles a given issue type in a given ward/borough of Kolkata.",
    "parameters": { "type":"object", "properties": {
      "issueType": {"type":"string"},
      "ward": {"type":"integer"},
      "lat":{"type":"number"}, "lng":{"type":"number"}
    }, "required":["issueType","lat","lng"] }
  },
  {
    "name": "find_nearby_duplicates",
    "description": "Return existing open issues of the same type within a radius of a location.",
    "parameters": { "type":"object", "properties": {
      "issueType":{"type":"string"}, "lat":{"type":"number"}, "lng":{"type":"number"},
      "radiusMeters":{"type":"integer","default":80}
    }, "required":["issueType","lat","lng"] }
  }
]
```
The backend implements both tools (the first against the `authorities` seed + the KMC map below; the second as a Firestore geo query). The model calls `find_nearby_duplicates` → if matches exist, the Orchestrator **merges** (increment `affectedCount`, attach `clusterId`, return the existing issue, war-room shows "merged into existing ticket — N citizens affected", pipeline stops before re-dispatch). Otherwise it calls `lookup_authority` and returns:
```json
{ "authorityId":"kmc-roads-b7", "routedDepartment":"KMC Roads Dept — Borough VII",
  "priority":"high", "reason":"pothole on arterial road, severity 4" }
```

**Priority rule:** `high` if severity ≥4 OR riskContext mentions people/safety OR it's a recurring hotspot; `medium` if severity 3; else `low`.

## 4. THE KMC ROUTING MAP (seed this into `authorities`)

This is your unfakeable local-authenticity layer. Use real Kolkata civic structure. `⚠️ VERIFY` exact current department names/contacts against the KMC site at build time; the mapping logic below is what matters.

| Issue type | Primary authority | Escalates to |
|---|---|---|
| Pothole / road damage | **KMC Roads Department** (borough-wise) | Borough Executive Engineer → KMC HQ Roads DG |
| Drainage / waterlogging / sewer | **KMC Drainage Department** | Borough → KMC Drainage DG |
| Streetlight (dead/broken) | **KMC Lighting Dept**; if power-line/transformer → **CESC** | KMC Lighting → CESC grievance |
| Garbage / solid waste | **KMC Solid Waste Management Dept** | Borough SWM → KMC SWM DG |
| Water supply (leak/no supply) | **KMC Water Supply Department** | Borough → KMC Water Supply DG |
| Unclear / other | hold for human triage (do not auto-file) | — |

**Jurisdiction logic:** Kolkata is divided into **16 boroughs / 144 wards**. Map the report's lat/lng → ward → borough (use a seeded ward lookup; a coarse borough centroid table is fine for the demo). Pick the borough-level authority for that issue type. Each `authorities` doc carries `escalationParentId` to form the ladder. Every authority's `email` in the demo points to a **controlled demo inbox you own** (see `07 §5`) — never real overwhelmed municipal staff during testing.

## 5. Agent: DRAFTER

**Responsibility:** write a formal, correctly-addressed complaint in English, regardless of the input language. Professional municipal-grievance register.

**Output:** `{ subject, bodyText, bodyHtml }`.

**System prompt:**
> You are the Drafter in a civic-grievance system. Write a concise, formal complaint in English addressed to the specified Kolkata municipal department. Include: the issue type and severity, the exact location (area + coordinates), the date observed, the risk to the public, the tracking ID, and a polite, specific request for redressal within a stated timeframe based on priority (high=72h, medium=7d, low=15d). If the citizen reported in another language, include one line: 'Reported by a citizen in <language>; original statement: "<transcript>"'. Keep it under 180 words. Output subject and body only — no placeholders left unfilled.

The draft references real evidence (the photo is attached to the email/PDF). Never invent facts not present in the classification.

## 6. Agent: DISPATCHER (the real-action agent — earns the 20%)

**Responsibility:** take **real, observable actions**. Two checkpoints, both real:
1. **Generate a PDF** complaint (template below), upload to storage, set `complaintPdfUrl`. War-room checkpoint: `✓ PDF generated · <filename>`.
2. **Send a real email** to the routed authority's (demo) address with the PDF + photo attached. Capture the provider message id. War-room checkpoint: `✓ Email sent · <addr> · <time>`.

If email send fails, surface it honestly in the war-room with a retry — do not fake a success.

**PDF template (sections):** letterhead ("Jagrik — Citizen Civic Report"), Tracking ID + date, To: <department>, Location (area, ward, lat/lng, small static map image optional), Issue (type, severity, est. cost, risk), Citizen statement (+ original-language line if any), the formal request + SLA, the attached photo, footer "Filed via Jagrik on behalf of a citizen." Filename: `complaint_<authorityShort>_<trackingId>.pdf`.

## 7. Agent: ESCALATOR

**Responsibility:** schedule the follow-up. Write `escalation.scheduledFor = now + SLA(priority)` and `level: 1` on the issue. War-room checkpoint: `⏱ Escalation set · +<n> days if unresolved`.

**Firing mechanism:** a scheduled job (Cloud Scheduler → a `/api/escalate` endpoint, or a manual "advance time" trigger for the demo) checks for issues past `scheduledFor` still unresolved, and: bumps to the `escalationParentId` authority, re-drafts + re-dispatches to that higher rung, increments `level`. For the demo you may expose a hidden "simulate +5 days" control to show escalation live without waiting (document it as such). The *capability* is what's graded; be honest that the timer is fast-forwarded on stage.

## 8. Verification service (F7 — not in the main pipeline)

`/api/verify` takes the before-photo URL + a new after-photo. Gemini prompt:
> You are verifying whether a reported civic issue has been fixed. Compare the BEFORE and AFTER photos of the same location. Decide if the specific problem (<issueType>) is resolved. Return ONLY: {"fixed":bool,"confidence":0..1,"reason":"short plain explanation"}.
On `fixed:true` → status → `resolved`, complete timeline, award Civic Score to the reporter(s), badge "Verified by AI". On false → keep `in_progress`, show the reason.

## 9. Model & determinism notes

- Use the **multimodal Gemini Flash** model for Classifier/Verifier; a text Flash call for Drafter; function-calling for Router. `⚠️ VERIFY` the exact model string in AI Studio (`07 §2`).
- Set low temperature (≈0.2) for classification/routing (consistency for the demo); slightly higher (≈0.5) for the Drafter's prose.
- Always parse model JSON defensively (strip code fences, try/catch, one repair retry). A malformed model response must degrade to a graceful war-room error, never a crash.
- Keep each agent's prompt in `/src/agents/<agent>.prompt.ts` with a comment citing this section.
