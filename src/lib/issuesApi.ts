// Client for the issues endpoints. Mirrors server StoredIssue (server/types.ts).

export type IssueStatus = "reported" | "acknowledged" | "in_progress" | "resolved";

export interface StatusEntry {
  status: IssueStatus;
  at: number;
  by: "agent" | "authority" | "seed" | "verification";
}

export interface StoredIssue {
  id: string;
  trackingId: string;
  createdAt: number;
  source: "photo" | "voice" | "photo+voice";
  issueType: string;
  severity: number;
  estimatedRepairCost?: { minInr: number; maxInr: number };
  riskContext?: string;
  routedDepartment: string;
  authorityId: string;
  priority: "low" | "medium" | "high";
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
  photoId?: string;
  photoUrl?: string;
  afterPhotoId?: string;
  afterPhotoUrl?: string;
  verification?: { fixed: boolean; confidence: number; reason: string; at: number };
  emailDispatched: boolean;
  isDemoSeed?: boolean;
}

export const STATUS_LABEL: Record<IssueStatus, string> = {
  reported: "Reported",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const STATUS_VAR: Record<IssueStatus, string> = {
  reported: "var(--color-status-reported)",
  acknowledged: "var(--color-status-ack)",
  in_progress: "var(--color-status-progress)",
  resolved: "var(--color-status-resolved)",
};

export const ISSUE_LABEL: Record<string, string> = {
  pothole: "Pothole",
  drainage: "Drainage",
  streetlight: "Streetlight",
  garbage: "Garbage",
  water_supply: "Water supply",
  other: "Other",
  unclear: "Unclear",
};

export function photoSrc(i: Pick<StoredIssue, "photoId" | "photoUrl">): string | undefined {
  if (i.photoId) return `/api/photo/${i.photoId}`;
  return i.photoUrl;
}

export async function fetchIssues(signal?: AbortSignal): Promise<StoredIssue[]> {
  const res = await fetch("/api/issues", { signal });
  if (!res.ok) throw new Error(`issues ${res.status}`);
  const data = (await res.json()) as { issues: StoredIssue[] };
  return data.issues;
}

export async function fetchIssue(id: string, signal?: AbortSignal): Promise<StoredIssue> {
  const res = await fetch(`/api/issues/${id}`, { signal });
  if (!res.ok) throw new Error(`issue ${res.status}`);
  const data = (await res.json()) as { issue: StoredIssue };
  return data.issue;
}
