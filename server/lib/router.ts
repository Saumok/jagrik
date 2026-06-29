import type { Authority, IssueType, Priority, Classification } from "../types.js";

// Location-aware routing. The municipal body is derived from the reporter's
// city, so Jagrik routes correctly anywhere in India — not just Kolkata.
// Departments are deterministic per issue type (Docs/06 §4). Emails point at the
// controlled demo inbox in testing (sendComplaint overrides to DEMO_INBOX).

interface Municipal {
  short: string;
  name: string;
  domain: string; // the body's REAL official domain
  grievance: string; // best-effort grievance email (most bodies use portals, not email)
  portal: string; // VERIFIED real complaint-portal URL — the authoritative channel
  helpline: string; // VERIFIED real civic helpline number
}

// India's civic-grievance reality: most municipal bodies take complaints through
// PORTALS, apps, WhatsApp and HELPLINES — not a single public email. So the
// verified, authoritative channels here are `portal` + `helpline` (these are
// real). `grievance` is a best-effort email on the body's real domain, used only
// when the citizen opts into Live email; the portal/helpline are what we surface.
// Any city we don't recognise falls back to CPGRAMS (pgportal.gov.in) — the
// national system linked to all 36 states/UTs — so no location goes unheard.
const MUNICIPAL: { match: string[]; body: Municipal }[] = [
  { match: ["kolkata", "calcutta"], body: { short: "KMC", name: "Kolkata Municipal Corporation", domain: "kmcgov.in", grievance: "grievance@kmcgov.in", portal: "https://www.kmcgov.in/KMCPortal/ComplaintFormAction.do", helpline: "18003453375" } },
  { match: ["new delhi"], body: { short: "NDMC", name: "New Delhi Municipal Council", domain: "ndmc.gov.in", grievance: "grievance@ndmc.gov.in", portal: "https://www.ndmc.gov.in", helpline: "1533" } },
  { match: ["delhi"], body: { short: "MCD", name: "Municipal Corporation of Delhi", domain: "mcd.gov.in", grievance: "grievance@mcd.gov.in", portal: "https://mcdonline.nic.in", helpline: "18001100093" } },
  { match: ["mumbai", "bombay"], body: { short: "BMC", name: "Brihanmumbai Municipal Corporation", domain: "mcgm.gov.in", grievance: "voiceofcitizen@mcgm.gov.in", portal: "https://portal.mcgm.gov.in/irj/portal/anonymous/qlcomplaintreg", helpline: "1916" } },
  { match: ["bengaluru", "bangalore"], body: { short: "BBMP", name: "Bruhat Bengaluru Mahanagara Palike", domain: "bbmp.gov.in", grievance: "comm@bbmp.gov.in", portal: "https://site.bbmp.gov.in", helpline: "1533" } },
  { match: ["chennai", "madras"], body: { short: "GCC", name: "Greater Chennai Corporation", domain: "chennaicorporation.gov.in", grievance: "commissioner@chennaicorporation.gov.in", portal: "https://chennaicorporation.gov.in/gcc/online-civic-services/grievance/", helpline: "1913" } },
  { match: ["hyderabad"], body: { short: "GHMC", name: "Greater Hyderabad Municipal Corporation", domain: "ghmc.gov.in", grievance: "grievance@ghmc.gov.in", portal: "https://www.ghmc.gov.in", helpline: "04021111111" } },
  { match: ["pune"], body: { short: "PMC", name: "Pune Municipal Corporation", domain: "pmc.gov.in", grievance: "grievance@punecorporation.org", portal: "https://www.pmc.gov.in", helpline: "18001030222" } },
  { match: ["ahmedabad"], body: { short: "AMC", name: "Ahmedabad Municipal Corporation", domain: "ahmedabadcity.gov.in", grievance: "grievance@ahmedabadcity.gov.in", portal: "https://ahmedabadcity.gov.in", helpline: "155303" } },
  { match: ["kochi", "cochin"], body: { short: "KMC-K", name: "Kochi Municipal Corporation", domain: "cochincorporation.kerala.gov.in", grievance: "info@cochincorporation.kerala.gov.in", portal: "https://cochinmunicipalcorporation.kerala.gov.in", helpline: "04842353674" } },
  { match: ["jaipur"], body: { short: "JMC", name: "Jaipur Municipal Corporation", domain: "jaipurmc.org", grievance: "grievance@jaipurmc.org", portal: "https://jaipurmc.org", helpline: "141" } },
  { match: ["lucknow"], body: { short: "LMC", name: "Lucknow Municipal Corporation", domain: "lmc.up.nic.in", grievance: "grievance@lmc.up.nic.in", portal: "https://lmc.up.nic.in", helpline: "180030001817" } },
];

// National fallback — CPGRAMS covers every state/UT, so unknown cities still route
// to a real, monitored channel.
const CPGRAMS: Municipal = {
  short: "CPGRAMS",
  name: "CPGRAMS — National Public Grievance Portal",
  domain: "pgportal.gov.in",
  grievance: "cpgrams-darpg@nic.in",
  portal: "https://pgportal.gov.in",
  helpline: "18001801322",
};

function municipalFor(city?: string): Municipal {
  const key = (city ?? "").toLowerCase();
  if (key) {
    for (const m of MUNICIPAL) if (m.match.some((w) => key.includes(w))) return m.body;
    // unknown city → name a local corporation but route follow-up via CPGRAMS
    // (national, covers all states) so the complaint is never a dead end.
    const abbr = city!
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 4);
    return {
      short: `${abbr}MC`,
      name: `${city} Municipal Corporation`,
      domain: CPGRAMS.domain,
      grievance: CPGRAMS.grievance,
      portal: CPGRAMS.portal,
      helpline: CPGRAMS.helpline,
    };
  }
  return CPGRAMS; // no location at all → national portal
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
    portal: m.portal,
    helpline: m.helpline,
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
