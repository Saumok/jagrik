import { listIssues } from "./issuesStore.js";
import { generateHotspotPredictions, type HotspotInput } from "./gemini.js";
import type { IssueStatus, IssueType } from "../types.js";

// Predictive hotspot dashboard aggregation (Docs/05 §2, Docs/06 §6). Recurrence
// stats + a Gemini-written narrative is the "prediction" — no ML model needed.

const DAY = 1000 * 60 * 60 * 24;

export interface DashboardData {
  stats: {
    total: number;
    resolved: number;
    open: number;
    resolutionRate: number; // 0..1
    avgResolutionDays: number;
    totalAffected: number;
  };
  slowestDept: { name: string; openCount: number } | null;
  byType: { type: IssueType; count: number }[];
  byStatus: { status: IssueStatus; count: number }[];
  trend: { label: string; count: number }[];
  hotspots: { area: string; issueType: IssueType; count: number; unresolved: number; prediction: string }[];
  generatedByGemini: boolean;
}

export async function computeDashboard(): Promise<DashboardData> {
  const issues = listIssues();
  const total = issues.length;
  const resolvedIssues = issues.filter((i) => i.status === "resolved");
  const resolved = resolvedIssues.length;
  const open = total - resolved;
  const totalAffected = issues.reduce((s, i) => s + (i.affectedCount || 1), 0);

  // average resolution time (days) from the resolved status-history entry
  const resTimes = resolvedIssues
    .map((i) => {
      const r = i.statusHistory.find((h) => h.status === "resolved");
      return r ? (r.at - i.createdAt) / DAY : null;
    })
    .filter((d): d is number => d != null && d >= 0);
  const avgResolutionDays = resTimes.length
    ? Math.round((resTimes.reduce((a, b) => a + b, 0) / resTimes.length) * 10) / 10
    : 0;

  // counts by type / status
  const typeMap = new Map<IssueType, number>();
  const statusMap = new Map<IssueStatus, number>();
  for (const i of issues) {
    typeMap.set(i.issueType, (typeMap.get(i.issueType) ?? 0) + 1);
    statusMap.set(i.status, (statusMap.get(i.status) ?? 0) + 1);
  }
  const byType = [...typeMap.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  const statusOrder: IssueStatus[] = ["reported", "acknowledged", "in_progress", "resolved"];
  const byStatus = statusOrder.map((status) => ({ status, count: statusMap.get(status) ?? 0 }));

  // slowest department = most open (unresolved) complaints
  const openByDept = new Map<string, number>();
  for (const i of issues) if (i.status !== "resolved") openByDept.set(i.routedDepartment, (openByDept.get(i.routedDepartment) ?? 0) + 1);
  const slowestEntry = [...openByDept.entries()].sort((a, b) => b[1] - a[1])[0];
  const slowestDept = slowestEntry ? { name: slowestEntry[0], openCount: slowestEntry[1] } : null;

  // 8-week trend of new reports
  const trend: { label: string; count: number }[] = [];
  for (let k = 7; k >= 0; k--) {
    const start = Date.now() - (k + 1) * 7 * DAY;
    const end = Date.now() - k * 7 * DAY;
    const count = issues.filter((i) => i.createdAt >= start && i.createdAt < end).length;
    trend.push({ label: new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), count });
  }

  // hotspots: group by area over 90d; dominant type; unresolved count
  const cutoff = Date.now() - 90 * DAY;
  const areaMap = new Map<string, { count: number; unresolved: number; types: Map<IssueType, number> }>();
  for (const i of issues) {
    if (i.createdAt < cutoff) continue;
    const e = areaMap.get(i.area) ?? { count: 0, unresolved: 0, types: new Map() };
    e.count += 1;
    if (i.status !== "resolved") e.unresolved += 1;
    e.types.set(i.issueType, (e.types.get(i.issueType) ?? 0) + 1);
    areaMap.set(i.area, e);
  }
  const ranked = [...areaMap.entries()]
    .map(([area, e]) => {
      const issueType = [...e.types.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { area, issueType, count: e.count, unresolved: e.unresolved };
    })
    .sort((a, b) => b.unresolved - a.unresolved || b.count - a.count)
    .slice(0, 4);

  const { predictions, byGemini } = await generateHotspotPredictions(ranked as HotspotInput[]);
  const hotspots = ranked.map((h, idx) => ({ ...h, prediction: predictions[idx] ?? "" }));

  return {
    stats: {
      total,
      resolved,
      open,
      resolutionRate: total ? resolved / total : 0,
      avgResolutionDays,
      totalAffected,
    },
    slowestDept,
    byType,
    byStatus,
    trend,
    hotspots,
    generatedByGemini: byGemini,
  };
}
