# 05 — DATA MODEL

> Exact shapes. Do not invent field names or types elsewhere — import them from here. Firestore is the source of truth; BigQuery is a derived analytics store for the dashboard.

## 1. Firestore collections

### `issues/{issueId}`
The central record. One per *distinct* civic problem (duplicates merge into one — see `clusters`).

```ts
interface Issue {
  id: string;                 // doc id
  createdAt: Timestamp;
  updatedAt: Timestamp;
  reporterId: string;         // Firebase anon uid
  affectedCount: number;      // 1, increments on dedupe "me too"

  // intake
  source: "photo" | "voice" | "photo+voice";
  photoUrl?: string;          // Firebase Storage or data ref
  afterPhotoUrl?: string;     // for verification
  audioTranscript?: string;   // original-language transcript (if voice)
  audioLang?: "bn" | "hi" | "en";
  userNote?: string;
  location: { lat: number; lng: number; area?: string }; // area from Geocoding

  // classification (from Classifier agent)
  issueType: "pothole" | "drainage" | "streetlight" | "garbage"
           | "water_supply" | "other" | "unclear";
  severity: 1|2|3|4|5;
  estimatedRepairCost?: { minInr: number; maxInr: number };
  riskContext?: string;       // plain-language one-liner
  classifyConfidence: number; // 0..1

  // routing (from Router agent)
  authorityId: string;        // → authorities/{id}
  routedDepartment: string;   // denormalized for display
  priority: "low" | "medium" | "high";

  // dispatch (from Dispatcher agent)
  trackingId: string;         // human-facing e.g. "KMC-RD-4821"
  complaintPdfUrl?: string;
  emailDispatched: boolean;
  emailMessageId?: string;
  dispatchedAt?: Timestamp;

  // lifecycle
  status: "reported" | "acknowledged" | "in_progress" | "resolved";
  statusHistory: { status: string; at: Timestamp; by: "agent"|"authority"|"seed"|"verification" }[];

  // escalation (from Escalator agent)
  escalation?: { scheduledFor: Timestamp; level: number; fired: boolean };

  // verification (F7)
  verification?: { fixed: boolean; confidence: number; reason: string; at: Timestamp };

  clusterId?: string;         // → clusters/{id} if part of a merge
  isDemoSeed?: boolean;       // true for pre-seeded demo issues
}
```

### `agent_runs/{runId}`
The audit log of one report's agent pipeline. **This is also the war-room's data source** — the UI subscribes to it, so it is real, not animated.

```ts
interface AgentRun {
  id: string;
  issueId?: string;           // set once the issue doc exists
  startedAt: Timestamp;
  finishedAt?: Timestamp;
  status: "running" | "done" | "error";
  steps: AgentStep[];
}
interface AgentStep {
  agent: "classifier" | "router" | "dedupe" | "drafter" | "dispatcher" | "escalator";
  label: string;              // what to show in the war-room
  detail?: string;            // streamed text (classification line, routing line…)
  state: "running" | "done" | "error";
  startedAt: Timestamp;
  finishedAt?: Timestamp;
  checkpoint?: {              // the loud "real action" rows
    kind: "pdf" | "email" | "escalation";
    value: string;            // filename / address+time / "+5 days"
  };
  errorMessage?: string;
}
```

### `authorities/{authorityId}`
The municipal routing targets. Seeded from the KMC map in `06`.

```ts
interface Authority {
  id: string;                 // e.g. "kmc-roads-b7"
  name: string;               // "KMC Roads Department — Borough VII"
  handles: string[];          // issueTypes it owns, e.g. ["pothole","road_damage"]
  jurisdiction: { wards: number[]; boroughs?: number[] };
  email: string;              // DEMO inbox in testing (see 07)
  escalationParentId?: string;// next rung up the ladder
  channelNote?: string;       // e.g. "KMC grievance portal / 18003453377"
}
```

### `clusters/{clusterId}`
Groups duplicate reports of one physical problem (F8).

```ts
interface Cluster {
  id: string;
  primaryIssueId: string;
  issueIds: string[];
  issueType: string;
  centroid: { lat: number; lng: number };
  radiusMeters: number;       // matching radius used
  affectedCount: number;
}
```

### `citizens/{uid}` (gamification, F10)
```ts
interface Citizen {
  uid: string;
  displayName?: string;
  area?: string;
  civicScore: number;         // points awarded on RESOLUTION, not reporting
  resolvedCount: number;
  reportedCount: number;
}
```

## 2. BigQuery (predictive dashboard, F9)

Dataset `jagrik` (Project B). One table, append-only, mirrored from resolved/active issues + the seed history.

**Table `issue_events`:**
| column | type | notes |
|---|---|---|
| issue_id | STRING | |
| issue_type | STRING | |
| ward | INTEGER | |
| area | STRING | street/locality label |
| lat | FLOAT | |
| lng | FLOAT | |
| severity | INTEGER | |
| reported_at | TIMESTAMP | |
| resolved_at | TIMESTAMP | nullable |
| status | STRING | |

**Hotspot query (concept):** group by `area`/`ward` + `issue_type` over a rolling 90-day window, count reports, compute recurrence and avg resolution time; flag areas above a threshold. The plain-language "prediction" string is generated by Gemini from the aggregated row (e.g. "Garia Main Rd: 4 drainage reports in 90 days, none resolved → high monsoon flood risk"). Backend exposes this via `GET /api/dashboard`. **You do not need a real ML model — recurrence stats + a Gemini-written narrative is the "prediction".** (See `06 §6`.)

## 3. Seed data (REQUIRED for a credible demo)

A solo builder can't generate organic civic traffic, so seed it. Provide `scripts/seed-firestore.ts` and `scripts/seed-bigquery.ts`.

Seed:
- **~30–50 issues** across Kolkata wards, realistic coordinates, mixed types, mixed statuses (some resolved with `resolved_at`), spread over the last ~90 days so the dashboard has history.
- **One strong cluster:** ~12 reports of the same pothole/drain at one location → drives the "12 citizens affected" moment. Set `affectedCount`, `clusterId`, primary issue.
- **One clear hotspot:** ≥4 drainage reports on one street in 90 days, unresolved → drives the predictive flag.
- **`authorities`:** the full KMC routing set from `06` (roads, drainage, streetlights/CESC, solid waste, water), each with the **demo inbox** email and the escalation parent.
- **A few `citizens`** with civic scores for the leaderboard.
- Mark all of the above `isDemoSeed: true` so it's distinguishable from live demo reports.

Keep seed photos free of identifiable faces/plates (privacy + Gemini free-tier training note in `02 §5`).
