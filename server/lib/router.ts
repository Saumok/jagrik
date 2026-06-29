import type { Authority, IssueType, Priority, Classification } from "../types.js";

// Location-aware routing. The municipal body is derived from the reporter's
// city, so Jagrik routes correctly anywhere in India — not just Kolkata.
// Departments are deterministic per issue type (Docs/06 §4). Emails point at the
// controlled demo inbox in testing (sendComplaint overrides to DEMO_INBOX).

interface Municipal {
  short: string;
  name: string;
  domain: string; // the body's REAL official domain (used to build dept addresses)
}

// Known Indian municipal bodies and their real official domains. The per-issue
// department mailbox is built from the body's domain + a department local-part
// (e.g. roads@mcgm.gov.in). Domains are real published government domains; exact
// mailboxes should be verified before enabling Live send for production — until
// then the Test toggle keeps mail going to the controlled inbox.
const MUNICIPAL: { match: string[]; body: Municipal }[] = [
  { match: ["kolkata", "calcutta"], body: { short: "KMC", name: "Kolkata Municipal Corporation", domain: "kmcgov.in" } },
  { match: ["new delhi"], body: { short: "NDMC", name: "New Delhi Municipal Council", domain: "ndmc.gov.in" } },
  { match: ["delhi"], body: { short: "MCD", name: "Municipal Corporation of Delhi", domain: "mcdonline.nic.in" } },
  { match: ["mumbai", "bombay"], body: { short: "BMC", name: "Brihanmumbai Municipal Corporation", domain: "mcgm.gov.in" } },
  { match: ["bengaluru", "bangalore"], body: { short: "BBMP", name: "Bruhat Bengaluru Mahanagara Palike", domain: "bbmp.gov.in" } },
  { match: ["chennai", "madras"], body: { short: "GCC", name: "Greater Chennai Corporation", domain: "chennaicorporation.gov.in" } },
  { match: ["hyderabad"], body: { short: "GHMC", name: "Greater Hyderabad Municipal Corporation", domain: "ghmc.gov.in" } },
  { match: ["pune"], body: { short: "PMC", name: "Pune Municipal Corporation", domain: "punecorporation.org" } },
  { match: ["ahmedabad"], body: { short: "AMC", name: "Ahmedabad Municipal Corporation", domain: "ahmedabadcity.gov.in" } },
  { match: ["kochi", "cochin"], body: { short: "KMC-K", name: "Kochi Municipal Corporation", domain: "cochincorporation.kerala.gov.in" } },
  { match: ["jaipur"], body: { short: "JMC", name: "Jaipur Municipal Corporation", domain: "jaipurmc.org" } },
  { match: ["lucknow"], body: { short: "LMC", name: "Lucknow Municipal Corporation", domain: "lmc.up.nic.in" } },
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
    return { short: `${abbr}MC`, name: `${city} Municipal Corporation`, domain: `${slug}.gov.in` };
  }
  return MUNICIPAL[0].body; // default Kolkata
}

const DEPT: Record<IssueType, { dept: string; code: string; mailbox: string }> = {
  pothole: { dept: "Roads & Engineering Department", code: "RD", mailbox: "roads" },
  drainage: { dept: "Storm Water Drainage Department", code: "DR", mailbox: "drainage" },
  streetlight: { dept: "Electrical & Street Lighting Department", code: "LT", mailbox: "streetlight" },
  garbage: { dept: "Solid Waste Management", code: "SW", mailbox: "swm" },
  water_supply: { dept: "Water Supply Department", code: "WS", mailbox: "watersupply" },
  other: { dept: "Public Grievance Cell", code: "GN", mailbox: "grievance" },
  unclear: { dept: "Public Grievance Cell", code: "GN", mailbox: "grievance" },
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
    email: `${d.mailbox}@${m.domain}`,
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
