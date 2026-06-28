// Generates on-brand, instant-loading issue illustrations (warm-nude + teal) for
// the Live Issues cards — replacing slow remote picsum photos. One "before" and
// one "fixed" scene per issue type, written to public/issues/*.svg.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/issues");
mkdirSync(outDir, { recursive: true });

const W = 640, H = 420;

// shared scaffold: sky + ground, with a per-scene accent
function frame(sky, ground, body, { fixed = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect y="262" width="${W}" height="158" fill="${ground}"/>
  ${body}
  ${fixed ? `<g transform="translate(556,40)"><circle r="30" fill="#1e9e6a"/><path d="M-13 0l9 9L16 -12" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>` : ""}
</svg>`;
}

const sun = `<circle cx="86" cy="78" r="34" fill="#f4c66a" opacity="0.85"/>`;
const cloud = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})" fill="#ffffff" opacity="0.7"><ellipse cx="0" cy="0" rx="34" ry="18"/><ellipse cx="30" cy="6" rx="26" ry="15"/><ellipse cx="-28" cy="6" rx="24" ry="14"/></g>`;

const scenes = {
  pothole: {
    sky: ["#dfeaf0", "#f3ece2"], ground: "#5b5650",
    before: `${cloud(470, 90, 0.9)}
      <rect y="262" width="640" height="158" fill="#5b5650"/>
      <rect x="300" y="262" width="40" height="158" fill="#cfc6b6" opacity="0.5"/>
      <g><path d="M250 360c-10-26 30-46 70-40 36 6 70-4 78 18 8 22-28 40-78 40-44 0-60-2-70-18Z" fill="#211d18"/>
      <path d="M268 352c30-10 86-8 120 6" stroke="#3a342c" stroke-width="4" fill="none"/>
      <path d="M360 300l-8 40M440 312l-14 30" stroke="#6e675c" stroke-width="3"/></g>`,
    fixed: `${cloud(470, 90, 0.9)}
      <rect y="262" width="640" height="158" fill="#5b5650"/>
      <rect x="300" y="262" width="40" height="158" fill="#f0e7d6" opacity="0.7"/>
      <ellipse cx="350" cy="360" rx="120" ry="34" fill="#46423b"/>`,
  },
  drainage: {
    sky: ["#d8e7e6", "#eef0e6"], ground: "#6a6a62",
    before: `${cloud(440, 84, 0.8)}
      <ellipse cx="360" cy="372" rx="190" ry="40" fill="#7c8a6f" opacity="0.7"/>
      <ellipse cx="360" cy="368" rx="150" ry="30" fill="#9bb07f" opacity="0.6"/>
      <g transform="translate(300,330)"><rect width="120" height="58" rx="6" fill="#3c3b35"/>
      ${[0,1,2,3,4].map(i=>`<rect x="${12+i*22}" y="8" width="9" height="42" rx="3" fill="#22221e"/>`).join("")}</g>
      <path d="M250 396q110 18 220 0" stroke="#6f8a5f" stroke-width="5" fill="none" opacity="0.7"/>`,
    fixed: `${cloud(440, 84, 0.8)}
      <rect x="300" y="330" width="120" height="58" rx="6" fill="#46453d"/>
      ${[0,1,2,3,4].map(i=>`<rect x="${312+i*22}" y="338" width="9" height="42" rx="3" fill="#2c2b26"/>`).join("")}
      <path d="M250 400q110 -8 220 0" stroke="#0f6e66" stroke-width="4" fill="none" opacity="0.5"/>`,
  },
  streetlight: {
    sky: ["#2b3550", "#46506a"], ground: "#2f3242",
    before: `<circle cx="540" cy="70" r="26" fill="#e9edf5" opacity="0.85"/>
      ${[120,210,330,470,560].map(x=>`<circle cx="${x}" cy="${40+(x%70)}" r="2.2" fill="#fff" opacity="0.7"/>`).join("")}
      <g transform="translate(300,120)"><rect x="-6" y="0" width="12" height="250" rx="5" fill="#1c1f2b"/>
      <path d="M6 14h70a18 18 0 0 1 18 18v6" stroke="#1c1f2b" stroke-width="11" fill="none"/>
      <ellipse cx="98" cy="44" rx="17" ry="9" fill="#3a3e4d"/></g>`,
    fixed: `<circle cx="540" cy="70" r="26" fill="#e9edf5" opacity="0.85"/>
      <g transform="translate(300,120)"><rect x="-6" y="0" width="12" height="250" rx="5" fill="#1c1f2b"/>
      <path d="M6 14h70a18 18 0 0 1 18 18v6" stroke="#1c1f2b" stroke-width="11" fill="none"/>
      <circle cx="98" cy="48" r="60" fill="#f4c66a" opacity="0.28"/>
      <ellipse cx="98" cy="44" rx="17" ry="9" fill="#ffd97a"/>
      <path d="M98 54 L70 150 L126 150 Z" fill="#ffe6a3" opacity="0.45"/></g>`,
  },
  garbage: {
    sky: ["#e7e0d2", "#f3ece2"], ground: "#6d6a60",
    before: `${cloud(470, 84, 0.8)}
      <g transform="translate(266,250)"><rect width="108" height="120" rx="8" fill="#3f6b52"/>
      <rect x="-10" y="-14" width="128" height="18" rx="6" fill="#345a44"/>
      <g fill="#b9a98c"><circle cx="20" cy="-22" r="16"/><circle cx="54" cy="-30" r="18"/><circle cx="88" cy="-20" r="15"/><circle cx="40" cy="-36" r="12"/><circle cx="74" cy="-40" r="11"/></g>
      <g fill="#c98b5a"><circle cx="120" cy="84" r="14"/><circle cx="-6" cy="96" r="12"/></g></g>`,
    fixed: `${cloud(470, 84, 0.8)}
      <g transform="translate(266,250)"><rect width="108" height="120" rx="8" fill="#43745a"/>
      <rect x="-10" y="-16" width="128" height="18" rx="6" fill="#386049"/>
      <rect x="46" y="-30" width="16" height="16" rx="3" fill="#386049"/></g>`,
  },
  water_supply: {
    sky: ["#dde9ec", "#eff1e8"], ground: "#6a665d",
    before: `${cloud(450, 88, 0.8)}
      <ellipse cx="330" cy="382" rx="170" ry="34" fill="#6fa8c7" opacity="0.55"/>
      <g transform="translate(250,300)"><rect width="170" height="22" rx="11" fill="#7a7670"/>
      <rect x="150" width="22" height="22" rx="6" fill="#5f5b55"/>
      <g stroke="#5aa6d6" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9">
      <path d="M150 6q40 -50 70 -10"/><path d="M150 14q52 -34 84 6"/><path d="M150 20q44 -10 70 26"/></g></g>`,
    fixed: `${cloud(450, 88, 0.8)}
      <g transform="translate(250,300)"><rect width="170" height="22" rx="11" fill="#827e77"/>
      <rect x="150" width="30" height="22" rx="6" fill="#0f6e66"/></g>`,
  },
};

let n = 0;
for (const [type, s] of Object.entries(scenes)) {
  writeFileSync(path.join(outDir, `${type}.svg`), frame(s.sky, s.ground, s.before));
  writeFileSync(path.join(outDir, `${type}-fixed.svg`), frame(s.sky, s.ground, s.fixed, { fixed: true }));
  n += 2;
}
console.log(`Wrote ${n} issue illustrations to public/issues/`);
