// Generates the documentation diagrams (warm-nude + teal brand) into public/docs/.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/docs");
mkdirSync(outDir, { recursive: true });

const FONT = "'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif";
const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#faf4ec"/><stop offset="1" stop-color="#efe1d2"/>
    </linearGradient>
    <filter id="card" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#241b12" flood-opacity="0.08"/>
    </filter>
  </defs>`;

const TEAL = "#0f6e66", DEEP = "#0a4f49", GOLD = "#c9741f", OK = "#1e9e6a", INK = "#241b12", MUT = "#6f6052";

// ---------- 1. USER JOURNEY ----------
function journey() {
  const W = 1240, H = 360;
  const stages = [
    { n: "1", t: "Report it", d: ["Snap a photo or", "speak in your language"], c: TEAL },
    { n: "2", t: "AI agents act", d: ["Classify · route · draft", "· file · follow-up"], c: GOLD },
    { n: "3", t: "Filed for real", d: ["PDF + email to the", "grievance cell + tracking ID"], c: TEAL },
    { n: "4", t: "Verified fixed", d: ["AI before/after check", "flips it to Resolved"], c: OK },
    { n: "5", t: "Rewarded", d: ["Civic Score, badges,", "community celebrates"], c: GOLD },
  ];
  const cw = 210, gap = 25, x0 = 30, y = 132, h = 168;
  let body = "";
  stages.forEach((s, i) => {
    const x = x0 + i * (cw + gap);
    body += `<g filter="url(#card)">
      <rect x="${x}" y="${y}" width="${cw}" height="${h}" rx="20" fill="#ffffff" fill-opacity="0.72" stroke="${s.c}" stroke-opacity="0.28"/></g>
      <circle cx="${x + 34}" cy="${y + 36}" r="18" fill="${s.c}"/>
      <text x="${x + 34}" y="${y + 42}" font-size="19" font-weight="700" fill="#fff" text-anchor="middle">${s.n}</text>
      <text x="${x + 64}" y="${y + 42}" font-size="20" font-weight="700" fill="${INK}">${s.t}</text>
      <text x="${x + 22}" y="${y + 86}" font-size="14.5" fill="${MUT}">${s.d[0]}</text>
      <text x="${x + 22}" y="${y + 108}" font-size="14.5" fill="${MUT}">${s.d[1]}</text>`;
    if (i < stages.length - 1) {
      const ax = x + cw + 4;
      body += `<path d="M${ax} ${y + h / 2} l16 0 m-6 -6 l6 6 l-6 6" stroke="#9a8a79" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">${defs}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="30" y="58" font-size="30" font-weight="700" fill="${INK}">From a photo to a fixed neighbourhood</text>
    <text x="30" y="92" font-size="17" fill="${MUT}">The citizen does the easy part. AI agents do everything else — and the loop closes publicly.</text>
    ${body}</svg>`;
}

// ---------- 2. GAMIFICATION ----------
function gamification() {
  const W = 1240, H = 540;
  const pts = [
    ["Get an issue fixed", "+50", OK],
    ["Host a clean-up / drive", "+20", GOLD],
    ["Report an issue", "+10", TEAL],
    ["Post in the community", "+5", TEAL],
    ["Comment / help", "+2", MUT],
  ];
  const levels = [
    ["Citizen", "0"],
    ["Guardian", "50"],
    ["Champion", "200"],
    ["Civic Hero", "500"],
  ];
  const badges = ["First Report", "Watchdog", "Fixer", "Loop Closer", "Changemaker", "Force of Nature", "Organiser", "Connector", "Civic Hero"];

  let ptsRows = "";
  pts.forEach((p, i) => {
    const y = 150 + i * 56;
    ptsRows += `<rect x="40" y="${y}" width="520" height="44" rx="12" fill="#ffffff" fill-opacity="0.7"/>
      <circle cx="66" cy="${y + 22}" r="6" fill="${p[2]}"/>
      <text x="86" y="${y + 28}" font-size="17" fill="${INK}">${p[0]}</text>
      <text x="540" y="${y + 28}" font-size="18" font-weight="700" fill="${p[2]}" text-anchor="end">${p[1]}</text>`;
  });

  // level track
  const lx = 620, lw = 580;
  let lvl = `<rect x="${lx}" y="174" width="${lw}" height="8" rx="4" fill="#e7d8c9"/>`;
  const stops = [0, 0.18, 0.5, 1];
  levels.forEach((l, i) => {
    const cx = lx + stops[i] * lw;
    const col = i === 3 ? GOLD : i >= 2 ? DEEP : i === 1 ? TEAL : "#b8a892";
    lvl += `<circle cx="${cx}" cy="178" r="9" fill="${col}"/>
      <text x="${cx}" y="150" font-size="15" font-weight="700" fill="${INK}" text-anchor="middle">${l[0]}</text>
      <text x="${cx}" y="208" font-size="12.5" fill="${MUT}" text-anchor="middle">${l[1]} pts</text>`;
  });

  let badgeChips = "";
  badges.forEach((b, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = lx + col * 145, y = 260 + row * 48;
    badgeChips += `<rect x="${x}" y="${y}" width="135" height="36" rx="18" fill="${OK}" fill-opacity="0.12"/>
      <circle cx="${x + 20}" cy="${y + 18}" r="6" fill="${OK}"/>
      <text x="${x + 34}" y="${y + 23}" font-size="13" font-weight="600" fill="${DEEP}">${b}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">${defs}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="40" y="58" font-size="30" font-weight="700" fill="${INK}">Gamification that rewards outcomes, not noise</text>
    <text x="40" y="92" font-size="17" fill="${MUT}">Points favour real impact — fixing &amp; organising beat posting. Levels and badges make progress visible.</text>
    <text x="40" y="132" font-size="14" font-weight="700" letter-spacing="1.5" fill="#9a8a79">POINTS</text>
    ${ptsRows}
    <text x="620" y="132" font-size="14" font-weight="700" letter-spacing="1.5" fill="#9a8a79">LEVELS</text>
    ${lvl}
    <text x="620" y="244" font-size="14" font-weight="700" letter-spacing="1.5" fill="#9a8a79">BADGES</text>
    ${badgeChips}
    <rect x="40" y="452" width="1160" height="52" rx="14" fill="${DEEP}" fill-opacity="0.06"/>
    <text x="62" y="484" font-size="15.5" fill="${INK}" xml:space="preserve"><tspan font-weight="700" fill="${DEEP}">Anti-cheat built in:</tspan>  deleting a report claws back its points · duplicate reports of the same spot earn 0.</text>
  </svg>`;
}

// ---------- 3. TECH STACK ----------
function stack() {
  const W = 1240, H = 540;
  const layers = [
    ["FRONTEND", "React 19 · Vite · TypeScript · Tailwind v4 · Motion — a bespoke warm-nude liquid-glass design system, mobile-first", TEAL],
    ["BACKEND", "Node · Express · NDJSON streaming · tsx — a thin orchestrator coordinating six specialist agents", GOLD],
    ["INTELLIGENCE", "Gemini 2.5 Flash (multimodal) → Groq Llama-3.3-70B → deterministic heuristic · ElevenLabs Scribe (speech-to-text)", DEEP],
    ["DATA &amp; ROUTING", "Firebase Firestore (durable) · OpenStreetMap geocoding · location-aware municipal routing + CPGRAMS national fallback", TEAL],
    ["CLOUD", "Google Cloud Run (one container: SPA + API) · Cloud Build · Artifact Registry — same project as Firestore", GOLD],
  ];
  let body = "";
  layers.forEach((l, i) => {
    const y = 132 + i * 78;
    body += `<g filter="url(#card)"><rect x="40" y="${y}" width="1160" height="64" rx="16" fill="#ffffff" fill-opacity="0.74" stroke="${l[2]}" stroke-opacity="0.25"/></g>
      <rect x="40" y="${y}" width="6" height="64" rx="3" fill="${l[2]}"/>
      <text x="68" y="${y + 28}" font-size="13" font-weight="700" letter-spacing="1.5" fill="${l[2]}">${l[0]}</text>
      <text x="68" y="${y + 50}" font-size="15.5" fill="${INK}">${l[1]}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">${defs}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="40" y="58" font-size="30" font-weight="700" fill="${INK}">The stack — production-grade, zero-billing tiers</text>
    <text x="40" y="92" font-size="17" fill="${MUT}">Every layer degrades gracefully: the whole product runs end-to-end even with no API keys configured.</text>
    ${body}</svg>`;
}

writeFileSync(path.join(outDir, "user-journey.svg"), journey());
writeFileSync(path.join(outDir, "gamification.svg"), gamification());
writeFileSync(path.join(outDir, "tech-stack.svg"), stack());
console.log("Wrote 3 documentation diagrams to public/docs/");
