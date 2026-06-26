import type { Authority, IssueType, Priority, Classification } from "../types.js";

// The KMC routing map (Docs/06 §4) — the unfakeable local-authenticity layer.
// Deterministic code (not an LLM) chooses the authority; this is auditable and
// is exactly the "tool" the Router agent calls (lookup_authority).
// ⚠️ VERIFY exact department names/contacts against the KMC site at build time.
const DEMO_INBOX_FALLBACK = "jagrik-demo.in";

export const AUTHORITIES: Authority[] = [
  {
    id: "kmc-roads-b7",
    name: "KMC Roads Department — Borough VII",
    handles: ["pothole"],
    email: `roads.borough7@${DEMO_INBOX_FALLBACK}`,
    escalationParentId: "kmc-roads-hq",
    channelNote: "KMC grievance portal / 1800-345-3377",
  },
  {
    id: "kmc-drainage-b7",
    name: "KMC Drainage Department — Borough VII",
    handles: ["drainage"],
    email: `drainage.borough7@${DEMO_INBOX_FALLBACK}`,
    escalationParentId: "kmc-drainage-hq",
    channelNote: "KMC grievance portal",
  },
  {
    id: "kmc-water-b7",
    name: "KMC Water Supply Department — Borough VII",
    handles: ["water_supply"],
    email: `water.borough7@${DEMO_INBOX_FALLBACK}`,
    escalationParentId: "kmc-water-hq",
    channelNote: "KMC Water Supply control room",
  },
  {
    id: "kmc-lighting-b7",
    name: "KMC Lighting Department — Borough VII",
    handles: ["streetlight"],
    email: `lighting.borough7@${DEMO_INBOX_FALLBACK}`,
    escalationParentId: "cesc-grievance",
    channelNote: "KMC Lighting / escalates to CESC for power lines",
  },
  {
    id: "kmc-swm-b7",
    name: "KMC Solid Waste Management — Borough VII",
    handles: ["garbage"],
    email: `swm.borough7@${DEMO_INBOX_FALLBACK}`,
    escalationParentId: "kmc-swm-hq",
    channelNote: "KMC SWM control room",
  },
];

export function lookupAuthority(issueType: IssueType): Authority {
  return (
    AUTHORITIES.find((a) => a.handles.includes(issueType)) ??
    // Unclear/other holds for human triage; default to roads so the demo never dead-ends.
    AUTHORITIES[0]
  );
}

// Priority rule (Docs/06 §3): high if severity>=4 OR risk mentions people/safety.
export function computePriority(c: Classification): Priority {
  const risky = /school|child|accident|danger|safety|people|disease|dengue|flood|live wire|manhole/i.test(
    c.riskContext,
  );
  if (c.severity >= 4 || risky) return "high";
  if (c.severity === 3) return "medium";
  return "low";
}

export function slaDays(priority: Priority): number {
  return priority === "high" ? 3 : priority === "medium" ? 7 : 15;
}

export function trackingId(authorityId: string): string {
  const short = authorityId.includes("water")
    ? "WS"
    : authorityId.includes("drainage")
      ? "DR"
      : authorityId.includes("lighting")
        ? "LT"
        : authorityId.includes("swm")
          ? "SW"
          : "RD";
  return `KMC-${short}-${Math.floor(1000 + Math.random() * 8999)}`;
}
