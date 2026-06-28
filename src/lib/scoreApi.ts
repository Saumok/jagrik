// Client for the Civic Score / leaderboard (mirrors server/lib/citizens.ts).

export interface Badge {
  id: string;
  label: string;
}

export interface CitizenView {
  id: string;
  handle: string;
  area?: string;
  score: number;
  reports: number;
  resolved: number;
  posts: number;
  comments: number;
  createdAt: number;
  updatedAt: number;
  level: string;
  nextLevelAt: number | null;
  badges: Badge[];
}

export interface RankedCitizen extends CitizenView {
  rank: number;
}

export interface AreaScore {
  area: string;
  score: number;
  citizens: number;
}

export interface Leaderboard {
  citizens: RankedCitizen[];
  areas: AreaScore[];
}

export async function fetchLeaderboard(signal?: AbortSignal): Promise<Leaderboard> {
  const res = await fetch("/api/leaderboard", { signal });
  if (!res.ok) throw new Error(`leaderboard ${res.status}`);
  return (await res.json()) as Leaderboard;
}

export async function fetchCitizen(id: string, signal?: AbortSignal): Promise<CitizenView | null> {
  const res = await fetch(`/api/citizen/${id}`, { signal });
  if (!res.ok) throw new Error(`citizen ${res.status}`);
  return ((await res.json()) as { citizen: CitizenView | null }).citizen;
}

// Level → an accent colour + short tagline (kept in sync with the server LEVELS).
export const LEVEL_META: Record<string, { tag: string; tint: string }> = {
  Citizen: { tag: "Just getting started", tint: "var(--color-nude-400, #b8a892)" },
  Guardian: { tag: "Watching the neighbourhood", tint: "var(--color-teal, #2f8f83)" },
  Champion: { tag: "Driving real change", tint: "var(--color-teal-deep, #1f6b62)" },
  "Civic Hero": { tag: "A force for the city", tint: "var(--color-amber, #c9852f)" },
};

// Progress 0–1 toward the next level (full bar at the top level).
export function levelProgress(score: number, nextLevelAt: number | null): number {
  if (nextLevelAt == null) return 1;
  const prev = LEVEL_FLOORS.filter((f) => f <= score).pop() ?? 0;
  const span = nextLevelAt - prev;
  return span <= 0 ? 1 : Math.min(1, Math.max(0, (score - prev) / span));
}

const LEVEL_FLOORS = [0, 50, 200, 500];
