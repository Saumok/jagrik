// Server-side shapes. Mirror src/data/types.ts so the wire format matches what
// the war-room already renders (Docs/05, Docs/06).

export type IssueType =
  | "pothole"
  | "drainage"
  | "streetlight"
  | "garbage"
  | "water_supply"
  | "other"
  | "unclear";

export type Priority = "low" | "medium" | "high";

export interface Classification {
  issueType: IssueType;
  severity: 1 | 2 | 3 | 4 | 5;
  estimatedRepairCost: { minInr: number; maxInr: number };
  riskContext: string;
  transcript: string;
  transcriptLang: "bn" | "hi" | "en" | null;
  confidence: number;
}

export interface Authority {
  id: string;
  name: string;
  handles: IssueType[];
  email: string;
  escalationParentId?: string;
  channelNote?: string;
}

export interface ReportRequest {
  source: "photo" | "voice" | "photo+voice";
  note?: string;
  transcript?: string; // when the client already has text (demo voice path)
  lat?: number;
  lng?: number;
  area?: string;
  ward?: number;
}

// NDJSON events streamed from POST /api/report.
export type RunEvent =
  | { type: "step"; agent: string; label: string; detail?: string; state: "running" | "done" | "error"; checkpoint?: { kind: "pdf" | "email" | "escalation"; value: string } }
  | { type: "result"; issue: ResultIssue }
  | { type: "error"; message: string }
  | { type: "done" };

export type IssueStatus = "reported" | "acknowledged" | "in_progress" | "resolved";

export interface StatusEntry {
  status: IssueStatus;
  at: number;
  by: "agent" | "authority" | "seed" | "verification";
}

// The persisted record powering the map list and /issue/:id detail page.
export interface StoredIssue {
  id: string;
  trackingId: string;
  createdAt: number;
  source: ReportRequest["source"];
  issueType: IssueType;
  severity: number;
  estimatedRepairCost?: { minInr: number; maxInr: number };
  riskContext?: string;
  routedDepartment: string;
  authorityId: string;
  priority: Priority;
  audioTranscript?: string;
  audioLang?: "bn" | "hi" | "en" | null;
  area: string;
  lat?: number;
  lng?: number;
  ward?: number;
  affectedCount: number;
  status: IssueStatus;
  statusHistory: StatusEntry[];
  complaintPdfId?: string;
  photoId?: string; // served from /api/photo/:id
  photoUrl?: string; // for seeded demo images
  afterPhotoId?: string; // the "fixed" photo (F7)
  verification?: { fixed: boolean; confidence: number; reason: string; at: number };
  emailDispatched: boolean;
  isDemoSeed?: boolean;
}

export interface ResultIssue {
  id: string;
  trackingId: string;
  source: ReportRequest["source"];
  issueType: IssueType;
  severity: number;
  estimatedRepairCost?: { minInr: number; maxInr: number };
  riskContext?: string;
  routedDepartment: string;
  authorityId: string;
  priority: Priority;
  audioTranscript?: string;
  audioLang?: "bn" | "hi" | "en" | null;
  area: string;
  complaintPdfId?: string;
  emailDispatched: boolean;
  emailMessageId?: string;
  mode: { gemini: boolean; email: boolean };
}
