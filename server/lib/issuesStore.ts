import type { StoredIssue } from "../types.js";

// In-memory issues store: seeded demo history + live filed reports. Mirrors
// Docs/05 §3 (the 12-affected cluster, a resolved one, mixed statuses) so the
// map/list look alive. Production swaps this for Firestore (Docs/07 §3).

const DAY = 1000 * 60 * 60 * 24;
const now = Date.now();

const SEED: StoredIssue[] = [
  {
    id: "seed-cluster-001",
    trackingId: "KMC-DR-4821",
    createdAt: now - 6 * DAY,
    source: "photo",
    issueType: "drainage",
    severity: 4,
    estimatedRepairCost: { minInr: 6000, maxInr: 12000 },
    riskContext: "Stagnant water on a market street, dengue risk",
    routedDepartment: "KMC Drainage Department — Borough VII",
    authorityId: "kmc-drainage-b7",
    priority: "high",
    area: "Garia Main Road",
    lat: 22.4625,
    lng: 88.3911,
    ward: 110,
    affectedCount: 12,
    status: "in_progress",
    statusHistory: [
      { status: "reported", at: now - 6 * DAY, by: "agent" },
      { status: "acknowledged", at: now - 5 * DAY, by: "authority" },
      { status: "in_progress", at: now - 3 * DAY, by: "authority" },
    ],
    photoUrl: "https://picsum.photos/seed/garia-drain-overflow/640/420",
    emailDispatched: true,
    isDemoSeed: true,
  },
  {
    id: "seed-pothole-204",
    trackingId: "KMC-RD-5093",
    createdAt: now - 2 * DAY,
    source: "photo",
    issueType: "pothole",
    severity: 4,
    estimatedRepairCost: { minInr: 8000, maxInr: 15000 },
    riskContext: "On a school route, high accident risk",
    routedDepartment: "KMC Roads Department — Borough VII",
    authorityId: "kmc-roads-b7",
    priority: "high",
    area: "Rashbehari Avenue",
    lat: 22.5121,
    lng: 88.3702,
    ward: 85,
    affectedCount: 3,
    status: "acknowledged",
    statusHistory: [
      { status: "reported", at: now - 2 * DAY, by: "agent" },
      { status: "acknowledged", at: now - 1 * DAY, by: "authority" },
    ],
    photoUrl: "https://picsum.photos/seed/kolkata-pothole-road/640/420",
    emailDispatched: true,
    isDemoSeed: true,
  },
  {
    id: "seed-light-061",
    trackingId: "KMC-LT-3310",
    createdAt: now - 9 * DAY,
    source: "voice",
    issueType: "streetlight",
    severity: 2,
    estimatedRepairCost: { minInr: 1500, maxInr: 4000 },
    riskContext: "Dark stretch near a bus stop",
    routedDepartment: "KMC Lighting Department — Borough VII",
    authorityId: "kmc-lighting-b7",
    priority: "low",
    audioTranscript: "দোকানের সামনের আলোটা এক সপ্তাহ ধরে জ্বলছে না",
    audioLang: "bn",
    area: "Jadavpur 8B",
    lat: 22.4951,
    lng: 88.3712,
    ward: 96,
    affectedCount: 1,
    status: "resolved",
    statusHistory: [
      { status: "reported", at: now - 9 * DAY, by: "agent" },
      { status: "acknowledged", at: now - 8 * DAY, by: "authority" },
      { status: "in_progress", at: now - 6 * DAY, by: "authority" },
      { status: "resolved", at: now - 4 * DAY, by: "verification" },
    ],
    photoUrl: "https://picsum.photos/seed/streetlight-night/640/420",
    emailDispatched: true,
    isDemoSeed: true,
  },
  {
    id: "seed-garbage-118",
    trackingId: "KMC-SW-2274",
    createdAt: now - 1 * DAY,
    source: "photo",
    issueType: "garbage",
    severity: 3,
    estimatedRepairCost: { minInr: 2000, maxInr: 5000 },
    riskContext: "Overflowing vat beside a tea stall",
    routedDepartment: "KMC Solid Waste Management — Borough VII",
    authorityId: "kmc-swm-b7",
    priority: "medium",
    area: "Lake Gardens",
    lat: 22.5043,
    lng: 88.3589,
    ward: 89,
    affectedCount: 5,
    status: "reported",
    statusHistory: [{ status: "reported", at: now - 1 * DAY, by: "agent" }],
    photoUrl: "https://picsum.photos/seed/kolkata-garbage-pile/640/420",
    emailDispatched: true,
    isDemoSeed: true,
  },
];

const issues = new Map<string, StoredIssue>(SEED.map((i) => [i.id, i]));

export function addIssue(issue: StoredIssue) {
  issues.set(issue.id, issue);
}

export function getIssue(id: string): StoredIssue | undefined {
  return issues.get(id);
}

export function updateIssue(id: string, patch: Partial<StoredIssue>): StoredIssue | undefined {
  const cur = issues.get(id);
  if (!cur) return undefined;
  const next = { ...cur, ...patch };
  issues.set(id, next);
  return next;
}

export function listIssues(): StoredIssue[] {
  return [...issues.values()].sort((a, b) => b.createdAt - a.createdAt);
}
