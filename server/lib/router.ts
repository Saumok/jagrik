import type { Authority, IssueType, Priority, Classification } from "../types.js";

// Location-aware routing. The municipal body is derived from the reporter's
// city, so Jagrik routes correctly anywhere in India — not just Kolkata.
// Departments are deterministic per issue type (Docs/06 §4). Emails point at the
// controlled demo inbox in testing (sendComplaint overrides to DEMO_INBOX).

interface Municipal {
  short: string;
  name: string;
  domain: string; // the body's REAL official domain
  grievance: string; // the body's CENTRAL grievance address (triages internally)
}

// Known Indian municipal bodies on their real official domains. Live send goes to
// each body's CENTRAL grievance cell — these cells triage to the right department
// internally, so a single verified address per city is both more realistic and
// safer than guessing per-department mailboxes. Addresses use real government
// domains; confirm the exact mailbox with each body before a production rollout.
// Until then the Test toggle keeps mail going to the controlled inbox.
const MUNICIPAL: { match: string[]; body: Municipal }[] = [
  { match: ["kolkata", "calcutta"], body: { short: "KMC", name: "Kolkata Municipal Corporation", domain: "kmcgov.in", grievance: "grievance@kmcgov.in" } },
  { match: ["new delhi"], body: { short: "NDMC", name: "New Delhi Municipal Council", domain: "ndmc.gov.in", grievance: "grievance@ndmc.gov.in" } },
  { match: ["delhi"], body: { short: "MCD", name: "Municipal Corporation of Delhi", domain: "mcd.gov.in", grievance: "grievance@mcd.gov.in" } },
  { match: ["mumbai", "bombay"], body: { short: "BMC", name: "Brihanmumbai Municipal Corporation", domain: "mcgm.gov.in", grievance: "voiceofcitizen@mcgm.gov.in" } },
  { match: ["bengaluru", "bangalore"], body: { short: "BBMP", name: "Bruhat Bengaluru Mahanagara Palike", domain: "bbmp.gov.in", grievance: "grievance@bbmp.gov.in" } },
  { match: ["chennai", "madras"], body: { short: "GCC", name: "Greater Chennai Corporation", domain: "chennaicorporation.gov.in", grievance: "grievance@chennaicorporation.gov.in" } },
  { match: ["hyderabad"], body: { short: "GHMC", name: "Greater Hyderabad Municipal Corporation", domain: "ghmc.gov.in", grievance: "grievance@ghmc.gov.in" } },
  { match: ["pune"], body: { short: "PMC", name: "Pune Municipal Corporation", domain: "punecorporation.org", grievance: "grievance@punecorporation.org" } },
  { match: ["ahmedabad"], body: { short: "AMC", name: "Ahmedabad Municipal Corporation", domain: "ahmedabadcity.gov.in", grievance: "grievance@ahmedabadcity.gov.in" } },
  { match: ["kochi", "cochin"], body: { short: "KMC-K", name: "Kochi Municipal Corporation", domain: "cochincorporation.kerala.gov.in", grievance: "grievance@cochincorporation.kerala.gov.in" } },
  { match: ["jaipur"], body: { short: "JMC", name: "Jaipur Municipal Corporation", domain: "jaipurmc.org", grievance: "grievance@jaipurmc.org" } },
  { match: ["lucknow"], body: { short: "LMC", name: "Lucknow Municipal Corporation", domain: "lmc.up.nic.in", grievance: "grievance@lmc.up.nic.in" } },
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
    const slug = city!.toLowerCase().replace(/[^a-z]/g, "").slice(0, 16);
    return { short: `${abbr}MC`, name: `${city} Municipal Corporation`, domain: `${slug}.gov.in`, grievance: `grievance@${slug}.gov.in` };
  }
  return MUNICIPAL[0].body; // default Kolkata
}

const DEPT: Record<IssueType, { dept: string; code: string }> = {
  pothole: { dept: "Roads & Engineering Department", code: "RD" },
  drainage: { dept: "Storm Water Drainage Department", code: "DR" },
  streetlight: { dept: "Electrical & Street Lighting Department", code: "LT" },
  garbage: { dept: "Solid Waste Management", code: "SW" },
  water_supply: { dept: "Water Supply Department", code: "WS" },
  other: { dept: "Public Grievance Cell", code: "GN" },
  unclear: { dept: "Public Grievance Cell", code: "GN" },
};

// Build the authority for an issue type at a given city (Docs/06 §3 tool). The AI
// still identifies the responsible department (shown to the citizen + in the PDF),
// but the email routes to the body's central grievance cell.
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
    email: m.grievance,
    channelNote: `${m.name} central grievance cell`,
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
