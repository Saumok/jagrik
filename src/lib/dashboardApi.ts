// Client for the predictive dashboard (mirrors server/lib/dashboard.ts).

export interface DashboardData {
  stats: {
    total: number;
    resolved: number;
    open: number;
    resolutionRate: number;
    avgResolutionDays: number;
    totalAffected: number;
  };
  slowestDept: { name: string; openCount: number } | null;
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
  trend: { label: string; count: number }[];
  hotspots: { area: string; issueType: string; count: number; unresolved: number; prediction: string }[];
  generatedByGemini: boolean;
}

export async function fetchDashboard(signal?: AbortSignal): Promise<DashboardData> {
  const res = await fetch("/api/dashboard", { signal });
  if (!res.ok) throw new Error(`dashboard ${res.status}`);
  return (await res.json()) as DashboardData;
}
