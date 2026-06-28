import { firestore } from "./firebase.js";
import type { Citizen, ScoreAction } from "../types.js";

// Civic Score engine. Points reward OUTCOMES and helping, not spam — so cheap
// actions (upvotes/votes) earn nothing. Resolution is worth the most. Tracks
// per-citizen scores + per-area scores for the neighbourhood leaderboard.

const COL = "citizens";
const mem = new Map<string, Citizen>();

const POINTS: Record<ScoreAction, number> = {
  report: 10,
  resolve: 50, // getting an issue verified-fixed is the big one
  post: 5, // organising / helping the community
  comment: 2,
};

const COUNTER: Record<ScoreAction, keyof Pick<Citizen, "reports" | "resolved" | "posts" | "comments">> = {
  report: "reports",
  resolve: "resolved",
  post: "posts",
  comment: "comments",
};

export interface Badge {
  id: string;
  label: string;
}
export interface CitizenView extends Citizen {
  level: string;
  nextLevelAt: number | null;
  badges: Badge[];
}

const LEVELS = [
  { at: 0, name: "Citizen" },
  { at: 50, name: "Guardian" },
  { at: 200, name: "Champion" },
  { at: 500, name: "Civic Hero" },
];

export function levelFor(score: number): { level: string; nextLevelAt: number | null } {
  let level = LEVELS[0].name;
  let nextLevelAt: number | null = LEVELS[1].at;
  for (let i = 0; i < LEVELS.length; i++) {
    if (score >= LEVELS[i].at) {
      level = LEVELS[i].name;
      nextLevelAt = LEVELS[i + 1]?.at ?? null;
    }
  }
  return { level, nextLevelAt };
}

export function badgesFor(c: Citizen): Badge[] {
  const b: Badge[] = [];
  if (c.reports >= 1) b.push({ id: "first-report", label: "First Report" });
  if (c.reports >= 5) b.push({ id: "watchdog", label: "Watchdog" });
  if (c.resolved >= 1) b.push({ id: "fixer", label: "Fixer" });
  if (c.resolved >= 3) b.push({ id: "closer", label: "Loop Closer" });
  if (c.posts >= 3) b.push({ id: "organiser", label: "Organiser" });
  if (c.comments >= 5) b.push({ id: "connector", label: "Connector" });
  if (c.score >= 500) b.push({ id: "hero", label: "Civic Hero" });
  return b;
}

export function toView(c: Citizen): CitizenView {
  return { ...c, ...levelFor(c.score), badges: badgesFor(c) };
}

async function read(id: string): Promise<Citizen | undefined> {
  if (firestore) {
    const d = await firestore.collection(COL).doc(id).get();
    return d.exists ? (d.data() as Citizen) : undefined;
  }
  return mem.get(id);
}
async function write(c: Citizen): Promise<void> {
  if (firestore) await firestore.collection(COL).doc(c.id).set(c);
  else mem.set(c.id, c);
}

export async function award(id: string, handle: string, action: ScoreAction, area?: string): Promise<Citizen> {
  const now = Date.now();
  const cur: Citizen =
    (await read(id)) ??
    { id, handle, area, score: 0, reports: 0, resolved: 0, posts: 0, comments: 0, createdAt: now, updatedAt: now };
  cur.handle = handle || cur.handle;
  if (area) cur.area = area;
  cur.score += POINTS[action];
  cur[COUNTER[action]] += 1;
  cur.updatedAt = now;
  await write(cur);
  return cur;
}

export async function getCitizen(id: string): Promise<CitizenView | undefined> {
  const c = await read(id);
  return c ? toView(c) : undefined;
}

// Seed a believable leaderboard for the demo so the board never opens empty.
// Idempotent: no-op once any citizen exists (real or seeded).
export async function seedCitizensIfEmpty(): Promise<void> {
  if (firestore) {
    const snap = await firestore.collection(COL).limit(1).get();
    if (!snap.empty) return;
  } else if (mem.size > 0) {
    return;
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  // score is derived from the counters so the profile math always reconciles.
  const mk = (
    handle: string,
    area: string,
    reports: number,
    resolved: number,
    posts: number,
    comments: number,
    ageDays: number,
  ): Citizen => ({
    id: `seed-citizen-${handle.toLowerCase().replace(/\W+/g, "-")}`,
    handle,
    area,
    score: reports * POINTS.report + resolved * POINTS.resolve + posts * POINTS.post + comments * POINTS.comment,
    reports,
    resolved,
    posts,
    comments,
    createdAt: now - ageDays * day,
    updatedAt: now - Math.floor(Math.random() * 2) * day,
  });

  const seeds: Citizen[] = [
    mk("Ananya Sen", "Salt Lake, Kolkata", 10, 7, 6, 15, 40), // Civic Hero (510)
    mk("Rohan Mehta", "Garia, Kolkata", 12, 4, 3, 9, 32), // Champion
    mk("Priya Nair", "Jadavpur, Kolkata", 7, 3, 5, 11, 28), // Champion
    mk("Imran Khan", "New Town, Kolkata", 6, 2, 2, 6, 21), // Guardian+
    mk("Sneha Roy", "Behala, Kolkata", 5, 1, 4, 8, 18), // Guardian
    mk("Dev Bose", "Tollygunge, Kolkata", 4, 1, 1, 3, 12), // Guardian
    mk("Meera Das", "Park Circus, Kolkata", 3, 0, 2, 5, 9), // Citizen
    mk("Arjun Pal", "Dum Dum, Kolkata", 2, 0, 1, 2, 5), // Citizen
  ];

  for (const c of seeds) await write(c);
}

export async function leaderboard(): Promise<{
  citizens: (CitizenView & { rank: number })[];
  areas: { area: string; score: number; citizens: number }[];
}> {
  let all: Citizen[];
  if (firestore) {
    const snap = await firestore.collection(COL).get();
    all = snap.docs.map((d) => d.data() as Citizen);
  } else {
    all = [...mem.values()];
  }
  const citizens = all
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((c, i) => ({ ...toView(c), rank: i + 1 }));

  const areaMap = new Map<string, { score: number; citizens: number }>();
  for (const c of all) {
    if (!c.area) continue;
    const e = areaMap.get(c.area) ?? { score: 0, citizens: 0 };
    e.score += c.score;
    e.citizens += 1;
    areaMap.set(c.area, e);
  }
  const areas = [...areaMap.entries()]
    .map(([area, e]) => ({ area, ...e }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return { citizens, areas };
}
