import type { StoredIssue } from "./issuesApi";

export interface Verdict {
  fixed: boolean;
  confidence: number;
  reason: string;
}

// Submit an after-photo for AI before/after verification (F7).
export async function verifyFix(
  issueId: string,
  after: Blob,
  signal?: AbortSignal,
): Promise<{ verdict: Verdict; issue: StoredIssue }> {
  const fd = new FormData();
  fd.set("issueId", issueId);
  fd.set("after", after, "after.jpg");
  const res = await fetch("/api/verify", { method: "POST", body: fd, signal });
  if (!res.ok) throw new Error(`verify ${res.status}`);
  return (await res.json()) as { verdict: Verdict; issue: StoredIssue };
}
