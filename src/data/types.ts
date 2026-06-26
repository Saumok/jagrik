// Shared shapes for the frontend slice. Field names mirror Docs/05_DATA_MODEL.md
// so the eventual Firestore swap is a drop-in (no client-side renames later).

export type IssueType =
  | "pothole"
  | "drainage"
  | "streetlight"
  | "garbage"
  | "water_supply"
  | "other"
  | "unclear";

export type IssueStatus = "reported" | "acknowledged" | "in_progress" | "resolved";
export type Priority = "low" | "medium" | "high";
export type Lang = "bn" | "hi" | "en";

export interface Authority {
  id: string;
  name: string;
  handles: IssueType[];
  email: string; // demo inbox in testing (Docs/07 §5)
  escalationParentId?: string;
  channelNote?: string;
}

export interface Issue {
  id: string;
  createdAt: number;
  reporterId: string;
  affectedCount: number;
  source: "photo" | "voice" | "photo+voice";
  photoSeed?: string; // picsum seed for the demo image
  audioTranscript?: string;
  audioLang?: Lang;
  location: { lat: number; lng: number; area: string; ward: number };
  issueType: IssueType;
  severity: 1 | 2 | 3 | 4 | 5;
  estimatedRepairCost?: { minInr: number; maxInr: number };
  riskContext?: string;
  routedDepartment: string;
  authorityId: string;
  priority: Priority;
  trackingId: string;
  status: IssueStatus;
  clusterId?: string;
  isDemoSeed?: boolean;
}

// ---- Agent pipeline (Docs/05 agent_runs + Docs/06). Drives the war-room. ----

export type AgentName =
  | "classifier"
  | "router"
  | "dedupe"
  | "drafter"
  | "dispatcher"
  | "escalator";

export type StepState = "pending" | "running" | "done" | "error";

export interface Checkpoint {
  kind: "pdf" | "email" | "escalation";
  value: string; // filename / address+time / "+5 days"
}

export interface AgentStep {
  agent: AgentName;
  label: string; // citizen-facing line, names what they control (Docs/04 §9)
  detail?: string; // streamed text
  state: StepState;
  durationMs: number; // how long "running" lasts in the simulation
  checkpoint?: Checkpoint;
}
