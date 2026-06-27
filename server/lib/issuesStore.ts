import type { StoredIssue, IssueType, IssueStatus, Priority } from "../types.js";
import { lookupAuthority, trackingId } from "./router.js";
import { firestore } from "./firebase.js";

// In-memory issues store: a seeded demo history + live filed reports. Mirrors
// Docs/05 §3 (12-affected cluster, a recurring hotspot, ~35 issues over 90 days
// with mixed statuses) so the map/list/dashboard look alive. Production → Firestore.

const DAY = 1000 * 60 * 60 * 24;
const now = Date.now();

// deterministic PRNG so the seed is stable across restarts
let _s = 1337;
function rnd() {
  _s = (_s * 1664525 + 1013904223) % 4294967296;
  return _s / 4294967296;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

const AREAS: { area: string; ward: number; lat: number; lng: number }[] = [
  { area: "Garia Main Road", ward: 110, lat: 22.4625, lng: 88.3911 },
  { area: "Rashbehari Avenue", ward: 85, lat: 22.5121, lng: 88.3702 },
  { area: "Jadavpur 8B", ward: 96, lat: 22.4951, lng: 88.3712 },
  { area: "Lake Gardens", ward: 89, lat: 22.5043, lng: 88.3589 },
  { area: "Gariahat Road", ward: 87, lat: 22.519, lng: 88.365 },
  { area: "Behala Chowrasta", ward: 124, lat: 22.498, lng: 88.312 },
  { area: "Tollygunge Circular Rd", ward: 93, lat: 22.49, lng: 88.346 },
  { area: "Dhakuria Station Rd", ward: 92, lat: 22.499, lng: 88.366 },
];

const TYPE_META: Record<Exclude<IssueType, "other" | "unclear">, { min: number; max: number; risk: string; seed: string }> = {
  pothole: { min: 8000, max: 15000, risk: "On a busy road, accident risk", seed: "kolkata-pothole" },
  drainage: { min: 6000, max: 12000, risk: "Stagnant water, dengue risk", seed: "kolkata-drain" },
  streetlight: { min: 1500, max: 4000, risk: "Dark stretch at night", seed: "streetlight-night" },
  garbage: { min: 2000, max: 5000, risk: "Overflowing vat, hygiene risk", seed: "kolkata-garbage" },
  water_supply: { min: 5000, max: 50000, risk: "Supply disruption, health risk", seed: "water-pipe" },
};
const TYPES = Object.keys(TYPE_META) as (keyof typeof TYPE_META)[];

function sevFor(t: keyof typeof TYPE_META): 1 | 2 | 3 | 4 | 5 {
  if (t === "streetlight" || t === "garbage") return (pick([2, 3, 3, 4]) as 2 | 3 | 4);
  return (pick([3, 4, 4, 5]) as 3 | 4 | 5);
}
function prioFor(sev: number): Priority {
  return sev >= 4 ? "high" : sev === 3 ? "medium" : "low";
}

function makeIssue(
  id: string,
  type: keyof typeof TYPE_META,
  loc: { area: string; ward: number; lat: number; lng: number },
  ageDays: number,
  status: IssueStatus,
  affectedCount = 1,
): StoredIssue {
  const meta = TYPE_META[type];
  const createdAt = now - ageDays * DAY;
  const sev = sevFor(type);
  const auth = lookupAuthority(type);
  const history: StoredIssue["statusHistory"] = [{ status: "reported", at: createdAt, by: "agent" }];
  if (status !== "reported") history.push({ status: "acknowledged", at: createdAt + 1 * DAY, by: "authority" });
  if (status === "in_progress" || status === "resolved")
    history.push({ status: "in_progress", at: createdAt + 2 * DAY, by: "authority" });
  if (status === "resolved")
    history.push({ status: "resolved", at: createdAt + Math.ceil(2 + rnd() * 6) * DAY, by: "verification" });

  return {
    id,
    trackingId: trackingId(auth.short, type),
    createdAt,
    source: rnd() > 0.5 ? "photo" : "voice",
    issueType: type,
    severity: sev,
    estimatedRepairCost: { minInr: meta.min, maxInr: meta.max },
    riskContext: meta.risk,
    routedDepartment: auth.name,
    authorityId: auth.id,
    priority: prioFor(sev),
    area: loc.area,
    lat: loc.lat,
    lng: loc.lng,
    ward: loc.ward,
    affectedCount,
    status,
    statusHistory: history,
    photoUrl: `https://picsum.photos/seed/${meta.seed}-${id}/640/420`,
    emailDispatched: true,
    isDemoSeed: true,
  };
}

function buildSeed(): StoredIssue[] {
  const list: StoredIssue[] = [];

  // The 12-affected cluster + recurring drainage hotspot on Garia Main Road.
  list.push(makeIssue("seed-cluster-001", "drainage", AREAS[0], 6, "in_progress", 12));
  for (let i = 0; i < 4; i++) {
    list.push(makeIssue(`seed-garia-drain-${i}`, "drainage", AREAS[0], 8 + i * 16, i === 3 ? "resolved" : "reported"));
  }

  // A clean resolved streetlight (the before/after demo target) with Bengali voice.
  const light = makeIssue("seed-light-061", "streetlight", AREAS[2], 9, "resolved");
  light.audioTranscript = "দোকানের সামনের আলোটা এক সপ্তাহ ধরে জ্বলছে না";
  light.audioLang = "bn";
  list.push(light);

  // ~30 issues spread across areas / types / dates / statuses.
  const statuses: IssueStatus[] = ["reported", "acknowledged", "in_progress", "resolved"];
  for (let i = 0; i < 30; i++) {
    const type = pick(TYPES);
    const loc = pick(AREAS.slice(1)); // keep Garia weighted by the forced drainage above
    const age = Math.floor(rnd() * 88) + 1;
    const status = pick(statuses);
    list.push(makeIssue(`seed-gen-${i}`, type, loc, age, status));
  }
  return list;
}

// Backend: Firestore when configured (durable), else an in-memory Map.
const COL = "issues";
const memory = new Map<string, StoredIssue>();
if (!firestore) for (const i of buildSeed()) memory.set(i.id, i);

// Seed the demo history once if the store is empty (called at startup).
export async function seedIfEmpty(): Promise<void> {
  if (!firestore) return; // memory is seeded synchronously above
  const snap = await firestore.collection(COL).limit(1).get();
  if (!snap.empty) return;
  const batch = firestore.batch();
  for (const i of buildSeed()) batch.set(firestore.collection(COL).doc(i.id), i);
  await batch.commit();
  console.log("[firestore] seeded demo issues");
}

export async function addIssue(issue: StoredIssue): Promise<void> {
  if (firestore) await firestore.collection(COL).doc(issue.id).set(issue);
  else memory.set(issue.id, issue);
}

export async function getIssue(id: string): Promise<StoredIssue | undefined> {
  if (firestore) {
    const d = await firestore.collection(COL).doc(id).get();
    return d.exists ? (d.data() as StoredIssue) : undefined;
  }
  return memory.get(id);
}

export async function updateIssue(id: string, patch: Partial<StoredIssue>): Promise<StoredIssue | undefined> {
  if (firestore) {
    const ref = firestore.collection(COL).doc(id);
    if (!(await ref.get()).exists) return undefined;
    await ref.set(patch, { merge: true });
    return (await ref.get()).data() as StoredIssue;
  }
  const cur = memory.get(id);
  if (!cur) return undefined;
  const next = { ...cur, ...patch };
  memory.set(id, next);
  return next;
}

export async function listIssues(): Promise<StoredIssue[]> {
  if (firestore) {
    const snap = await firestore.collection(COL).orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => d.data() as StoredIssue);
  }
  return [...memory.values()].sort((a, b) => b.createdAt - a.createdAt);
}
