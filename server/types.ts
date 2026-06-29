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
  short: string;
  name: string;
  municipalName?: string;
  handles: IssueType[];
  email: string;
  portal?: string; // real complaint-portal URL (verified channel)
  helpline?: string; // real civic helpline number
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
  reporterId?: string;
  reporterHandle?: string;
  liveMode?: boolean; // true → email the real authority; false → controlled test inbox
}

// ---- Civic Score / gamification ----
export interface Citizen {
  id: string;
  handle: string;
  area?: string;
  score: number;
  reports: number;
  resolved: number;
  posts: number;
  comments: number;
  events: number;
  createdAt: number;
  updatedAt: number;
}

export type ScoreAction = "report" | "resolve" | "post" | "comment" | "event";

// ---- Community Hub (the social space) ----
export type PostType = "announcement" | "help" | "alert" | "poll" | "event" | "general";

export interface PollOption {
  text: string;
  votes: number;
  votedBy: string[];
}

export interface Post {
  id: string;
  createdAt: number;
  authorId: string;
  authorHandle: string;
  type: PostType;
  title?: string;
  body: string;
  area: string;
  upvotes: number;
  upvotedBy: string[];
  commentCount: number;
  pollOptions?: PollOption[];
  isDemoSeed?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  createdAt: number;
  authorId: string;
  authorHandle: string;
  body: string;
}

// NDJSON events streamed from POST /api/report.
export type RunEvent =
  | { type: "step"; agent: string; label: string; detail?: string; state: "running" | "done" | "error"; checkpoint?: { kind: "pdf" | "email" | "escalation"; value: string } }
  | { type: "result"; issue: ResultIssue }
  | { type: "score"; action: ScoreAction; points: number; citizen: { score: number; level: string }; duplicate?: boolean }
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
  afterPhotoUrl?: string; // seeded demo after-photo (no in-memory bytes)
  verification?: { fixed: boolean; confidence: number; reason: string; at: number };
  emailDispatched: boolean;
  reporterId?: string;
  reporterHandle?: string;
  scored?: boolean; // true → report points were awarded (revoked on delete)
  resolveScored?: boolean; // true → resolve points were awarded (revoked on delete)
  duplicateOf?: string; // set when this repeats an existing report by the same citizen
  routedEmail?: string; // the real authority address it was routed to
  routedPortal?: string; // verified complaint-portal URL
  routedHelpline?: string; // verified civic helpline
  liveMode?: boolean; // whether it was actually sent live vs to the test inbox
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
  routedEmail?: string;
  routedPortal?: string;
  routedHelpline?: string;
  liveMode?: boolean;
  mode: { gemini: boolean; email: boolean };
}
