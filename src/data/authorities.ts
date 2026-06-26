import type { Authority } from "./types";

// The KMC routing map (Docs/06 §4). Real Kolkata civic structure is the
// unfakeable local-authenticity layer. Emails point at a controlled demo inbox
// in testing — never real municipal staff. ⚠️ VERIFY exact names/contacts at build.
export const AUTHORITIES: Authority[] = [
  {
    id: "kmc-roads-b7",
    name: "KMC Roads Department — Borough VII",
    handles: ["pothole"],
    email: "roads.borough7@jagrik-demo.in",
    escalationParentId: "kmc-roads-hq",
    channelNote: "KMC grievance portal / 1800-345-3377",
  },
  {
    id: "kmc-drainage-b7",
    name: "KMC Drainage Department — Borough VII",
    handles: ["drainage"],
    email: "drainage.borough7@jagrik-demo.in",
    escalationParentId: "kmc-drainage-hq",
    channelNote: "KMC grievance portal",
  },
  {
    id: "kmc-water-b7",
    name: "KMC Water Supply Department — Borough VII",
    handles: ["water_supply"],
    email: "water.borough7@jagrik-demo.in",
    escalationParentId: "kmc-water-hq",
    channelNote: "KMC Water Supply control room",
  },
  {
    id: "kmc-lighting-b7",
    name: "KMC Lighting Department — Borough VII",
    handles: ["streetlight"],
    email: "lighting.borough7@jagrik-demo.in",
    escalationParentId: "cesc-grievance",
    channelNote: "KMC Lighting / escalates to CESC for power lines",
  },
  {
    id: "kmc-swm-b7",
    name: "KMC Solid Waste Management — Borough VII",
    handles: ["garbage"],
    email: "swm.borough7@jagrik-demo.in",
    escalationParentId: "kmc-swm-hq",
    channelNote: "KMC SWM control room",
  },
];

export function authorityFor(id: string): Authority | undefined {
  return AUTHORITIES.find((a) => a.id === id);
}
