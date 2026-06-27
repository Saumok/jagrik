import type { Authority, IssueType, Priority, Classification } from "../types.js";

// Location-aware routing. The municipal body is derived from the reporter's
// city, so Jagrik routes correctly anywhere in India — not just Kolkata.
// Departments are deterministic per issue type (Docs/06 §4). Emails point at the
// controlled demo inbox in testing (sendComplaint overrides to DEMO_INBOX).

interface Municipal {
  short: string;
  name: string;
}

// Known Indian municipal bodies; unknown cities get a generic corporation.
const MUNICIPAL: { match: string[]; body: Municipal }[] = [
  { match: ["kolkata", "calcutta"], body: { short: "KMC", name: "Kolkata Municipal Corporation" } },
  { match: ["new delhi"], body: { short: "NDMC", name: "New Delhi Municipal Council" } },
  { match: ["delhi"], body: { short: "MCD", name: "Municipal Corporation of Delhi" } },
  { match: ["mumbai", "bombay"], body: { short: "BMC", name: "Brihanmumbai Municipal Corporation" } },
  { match: ["bengaluru", "bangalore"], body: { short: "BBMP", name: "Bruhat Bengaluru Mahanagara Palike" } },
  { match: ["chennai", "madras"], body: { short: "GCC", name: "Greater Chennai Corporation" } },
  { match: ["hyderabad"], body: { short: "GHMC", name: "Greater Hyderabad Municipal Corporation" } },
  { match: ["pune"], body: { short: "PMC", name: "Pune Municipal Corporation" } },
  { match: ["ahmedabad"], body: { short: "AMC", name: "Ahmedabad Municipal Corporation" } },
  { match: ["kochi", "cochin"], body: { short: "KMC-K", name: "Kochi Municipal Corporation" } },
  { match: ["jaipur"], body: { short: "JMC", name: "Jaipur Municipal Corporation" } },
  { match: ["lucknow"], body: { short: "LMC", name: "Lucknow Municipal Corporation" } },
];

function municipalFor(city?: string): Municipal {
  const key = (city ?? "").toLowerCase();
  if (key) {
    for (const m of MUNICIPAL) if (m.match.some((w) => key.includes(w))) return m.body;
    // unknown city → generic corporation, abbreviated
    const abbr = city!
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 4);
    return { short: `${abbr}MC`, name: `${city} Municipal Corporation` };
  }
  return MUNICIPAL[0].body; // default Kolkata
}

const DEPT: Record<IssueType, { dept: string; code: string }> = {
  pothole: { dept: "Roads Department", code: "RD" },
  drainage: { dept: "Drainage Department", code: "DR" },
  streetlight: { dept: "Lighting Department", code: "LT" },
  garbage: { dept: "Solid Waste Management", code: "SW" },
  water_supply: { dept: "Water Supply Department", code: "WS" },
  other: { dept: "Public Grievance Cell", code: "GN" },
  unclear: { dept: "Public Grievance Cell", code: "GN" },
};

// Build the authority for an issue type at a given city (Docs/06 §3 tool).
export function lookupAuthority(issueType: IssueType, city?: string): Authority {
  const m = municipalFor(city);
  const d = DEPT[issueType] ?? DEPT.other;
  const slug = `${m.short.toLowerCase().replace(/[^a-z0-9]/g, "")}-${issueType}`;
  return {
    id: slug,
    short: m.short,
    name: `${m.short} ${d.dept}`,
    municipalName: m.name,
    handles: [issueType],
    email: `${issueType}@${m.short.toLowerCase().replace(/[^a-z0-9]/g, "")}-demo.in`,
    channelNote: `${m.name} grievance portal`,
  };
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

export function trackingId(short: string, issueType: IssueType): string {
  const code = DEPT[issueType]?.code ?? "GN";
  const clean = short.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return `${clean}-${code}-${Math.floor(1000 + Math.random() * 8999)}`;
}
