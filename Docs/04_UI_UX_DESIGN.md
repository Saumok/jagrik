# 04 — UI / UX DESIGN SYSTEM (Liquid-Glass edition)

> A specific, opinionated design language for Jagrik. Build to *this*, not to a generic default. Every token below is deliberate; derive all UI from them. Implement tokens as CSS variables; map Tailwind to them.

## 0. Design thesis

Jagrik should feel like a **premium, calm, transparent SaaS product** — the kind of interface that looks expensive and trustworthy at a glance, with **near-zero cognitive load**: lots of air, one clear action per screen, a restrained palette, and depth created by **liquid glass** rather than by clutter.

The glass is not decoration — it is the **thesis made visible**. Civic systems are usually opaque; Jagrik is *transparent* — you can literally see through it to watch the agents work and watch status change. Frosted, layered glass over a soft luminous backdrop is how we say "a system you can see into." Spend the boldness in two showpiece moments that share this one material language: the **hero's tilted liquid-glass panel** (first impression, catches the judge's eye) and the in-app **war-room console** (proof of agentic depth). Everything else stays quiet so those two land.

**Three non-negotiables:** (1) low cognitive load — if a screen has more than one primary action or more than ~3 glass layers competing, simplify it; (2) fast — glass is GPU-heavy, so honor the performance budget in §8; (3) legible — text on glass must always clear AA via a tint floor (§2.3). Premium means *restraint executed precisely*, not more effects.

## 1. Colour tokens

```css
:root {
  /* Brand */
  --teal:        #0F6E66;  /* trust, resolution, primary actions, links */
  --teal-deep:   #0A4F49;
  --teal-glow:   rgba(15,110,102,.28);  /* light bloom behind glass */
  --marigold:    #F2A33C;  /* ACTION / in-progress / agent activity / accent glow */
  --marigold-deep:#D6831C;
  --marigold-glow:rgba(242,163,60,.26);

  /* Luminous backdrop (the world behind the glass) */
  --bg-0:        #EEF2F4;  /* base */
  --bg-1:        #E7EDF0;  /* secondary */
  --ink:         #14161B;  /* primary text, smoked-glass shell */
  --text:        #14161B;
  --text-muted:  #5B6270;
  --text-onglass:#1A1D23;  /* text on light glass (see §2.3 contrast rule) */
  --text-onink:  #EFEAE0;  /* text on smoked glass */

  /* Status lifecycle */
  --status-reported:#F2A33C; --status-ack:#3B82C4; --status-progress:#6C5CE0; --status-resolved:#1E9E6A;
  /* Severity 1..5 */
  --sev-1:#1E9E6A; --sev-2:#7FB069; --sev-3:#F2A33C; --sev-4:#E8743B; --sev-5:#E5484D;
  /* Feedback */
  --danger:#E5484D; --warn:#E8A33D; --ok:#1E9E6A;
}
```

Marigold and teal appear mostly as **light blooms behind glass** and as small solid accents (CTA, status dots), never as large body-text colours.

## 2. The GLASS MATERIAL SYSTEM (the core of this redesign)

Define glass as reusable tokens/utilities, not ad-hoc per component. Four materials:

### 2.1 Material tokens
```css
:root {
  /* LIGHT GLASS — default surface (cards, nav, sheets) */
  --glass-bg:        rgba(255,255,255,0.55);
  --glass-blur:      22px;
  --glass-saturate:  1.4;
  --glass-border:    1px solid rgba(255,255,255,0.65);   /* top/left highlight edge */
  --glass-shadow:    0 1px 1px rgba(20,22,27,.04), 0 12px 40px rgba(20,22,27,.10);
  --glass-radius:    22px;

  /* TEAL GLASS — trust/primary surfaces (authority card, primary CTA bg) */
  --glass-teal-bg:   rgba(15,110,102,0.14);

  /* MARIGOLD GLASS — action highlights (live/agent surfaces) */
  --glass-marigold-bg: rgba(242,163,60,0.16);

  /* SMOKED GLASS — the war-room instrument (one dark surface) */
  --glass-smoke-bg:  rgba(18,20,25,0.55);
  --glass-smoke-border: 1px solid rgba(242,163,60,0.22);  /* faint marigold "live" edge */
}
```
Standard glass utility:
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: var(--glass-border);
  border-radius: var(--glass-radius);
  box-shadow: var(--glass-shadow);
}
```

### 2.2 The "liquid" specular highlight (use sparingly — hero panel, primary CTA only)
A thin diagonal sheen + a soft top edge-light give the wet/liquid quality. Implement as a `::before` pseudo-element, animated on hover/idle with **transform/opacity only** (never animate `backdrop-filter`):
```css
.liquid::before{
  content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background:linear-gradient(120deg, rgba(255,255,255,.0) 30%, rgba(255,255,255,.45) 48%, rgba(255,255,255,0) 60%);
  transform:translateX(-30%); transition:transform .9s ease;
}
.liquid:hover::before{ transform:translateX(30%); }
```

### 2.3 Contrast floor (accessibility — mandatory)
Text on glass can fail contrast over busy backdrops. Rule: any glass panel carrying body text must keep `--glass-bg` opacity **≥ 0.5** (light) or **≥ 0.55** (smoked), and the backdrop directly behind text-bearing glass must avoid high-frequency imagery. Verify `--text-onglass` on the actual rendered panel clears **AA (4.5:1)**. If it can't, raise the tint opacity — legibility wins over translucency every time.

### 2.4 Backdrop (the luminous world)
A soft, static gradient-mesh — cheap (CSS radial-gradients, not canvas/WebGL) to protect load time:
```css
body{
  background:
    radial-gradient(60vmax 60vmax at 12% -8%, var(--teal-glow), transparent 60%),
    radial-gradient(50vmax 50vmax at 110% 20%, var(--marigold-glow), transparent 55%),
    linear-gradient(180deg, var(--bg-0), var(--bg-1));
  background-attachment: fixed;
}
```
Optional: very slow (30–60s) drift of the blooms via `transform` on a wrapper — but only if it costs nothing perceptible; otherwise keep it static.

## 3. "Liquid glass taps" (interactive elements)

- **Primary CTA / taps:** glass pill, `--glass-radius` 999px, the `.liquid` sheen, teal-glass tint for primary or marigold-glass for "report/act". Press = scale .98 + a brief highlight shift (transform/opacity only), ~120ms. Min height 52px, big tap target.
- **Secondary:** plain light-glass pill, no sheen.
- **Chips/toggles:** small glass pills; selected state gets a teal inner ring + slightly higher opacity (never colour-only — pair with a check/label).
- All taps: visible focus ring (2px `--teal`, 2px offset). Hover sheen is decorative only; never required to understand state.

## 4. THE HERO (the judge-catching centrepiece)

Route `/` is a **showcase landing** that explains the product, shows it working, and gestures at the future — then drops the judge into the live app. (The live map app lives at `/app`; see `03`.)

### 4.1 Layout (desktop)
```
┌──────────────────────────────────────────────────────────────┐
│  luminous gradient-mesh backdrop (teal + marigold blooms)      │
│                                                                │
│   See it. Say it. Solved.            ╱───────────────────────╮ │
│   A photo or a spoken word becomes  ╱  TILTED LIQUID-GLASS   ╱ │
│   a filed, tracked, AI-verified     │  PANEL slides in from  ╱  │
│   civic complaint — automatically.  │  the right, at a tilt  ╱   │
│                                     │  ┌──────────────────┐ ╱    │
│   [ Open the live app ]  (liquid)   │  │ war-room mid-run │╱     │
│   [ Watch how it works ]            │  └──────────────────┘      │
│                                     │  ┌────────┐ ┌─────────┐    │
│                                     │  │ map+pins│ │12 affected│  │
│                                     │  └────────┘ └─────────┘    │
│                                     ╰────── specular sheen ──────╯ │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 The tilted liquid-glass panel (exact intent)
- A large rounded glass panel that **enters from the right** on load, **tilted in 3D** (≈ `rotateY(-14deg) rotateZ(-3deg)` with perspective on the parent ~1200px), settling to a gentle resting tilt (not flat — keep ~6–8° so it reads as a "pane of glass catching light").
- It carries **layered glass cards at different depths** showing the app's *multiple workings* — each a real snapshot of a feature:
  1. the **war-room** mid-run (a few streaming agent rows + a green "✓ Email sent" checkpoint),
  2. the **live map** with status-coloured pins,
  3. a **"12 citizens affected"** merged ticket,
  4. the **predictive dashboard** hotspot line.
- **Text labels reveal beside each card**, staggered, as the panel settles: "Understands a photo or your voice" · "Files a real complaint in seconds" · "Tracks & verifies the fix" · "Predicts the next hotspot." This is how the hero *shows how it works* without a wall of text.
- The `.liquid` specular sheen sweeps across the panel once on entrance, then on hover. Cards have parallax: on scroll/pointer-move they drift at slightly different rates (transform only) for a sense of physical depth.

### 4.3 Entrance choreography (load sequence, ~1.2s total, transform/opacity only)
1. backdrop fades up (200ms) → 2. headline + subhead rise/stagger (300ms) → 3. the tilted panel slides + rotates in from the right (450ms, ease-out) → 4. the inner cards settle with a tiny stagger and the sheen sweeps → 5. the side text labels fade in. Under `prefers-reduced-motion`: everything appears in place, no slide/sweep, panel at its resting tilt immediately.

### 4.4 Below the fold (still low cognitive load — one idea per band)
- **How it works** — 3 glass step-cards: *Report (photo/voice)* → *Agents act (route, file, escalate)* → *Track & verify*. One sentence each.
- **Why it's different** — three quiet stat/feature cards (real autonomous dispatch · AI fix-verification · knows the real KMC structure).
- **Where it goes next (the future)** — a forward-looking band: the **WhatsApp roadmap** ("the same agent where 500M Indians already are"), more languages, more cities, citizen+authority dashboards. This satisfies "how it can be better for the future" and gives judges the scale story.
- **Final CTA** — one liquid-glass button: "Open the live app."

Keep each band to a single message, generous vertical rhythm, max ~3 cards visible at once. Air is the luxury.

## 5. Typography

Premium, deliberate pairing (not Playfair/Inter). Indic support is mandatory for the voice angle.
```
Display  → "General Sans" (Fontshare) — geometric, confident, modern. Hero headline, screen titles, big numbers. Weights 500–600, letter-spacing −0.01em.
Body     → "Hanken Grotesk" (Google) — warm, clean, legible. 400/500, line-height 1.55.
Data/Mono→ "JetBrains Mono" — war-room console, tracking IDs, dashboard figures. +0.02em on labels.
Indic    → "Noto Sans Bengali" + "Noto Sans Devanagari" (Google) — all Bengali/Hindi text, applied via :lang(bn)/:lang(hi) so glyphs never box.
```
Type scale (rem): 3.25 / 2.5 / 1.875 / 1.5 / 1.25 / 1.125 / 1.0 / 0.875 / 0.75. The hero headline may go larger (clamp up to ~4rem) but stays the only oversized element.

## 6. Layout & spacing
- 8px system: 4/8/12/16/24/32/48/64/96. Use the larger end — this is a spacious product.
- Radius: 22px glass cards, 999px pills, 16px inputs. War-room slightly tighter (16px) to read as instrument.
- Mobile-first single column → 12-col ≥1024px. Max content width 1200px. On mobile the hero panel sits **below** the text, still tilted and sliding in from the right, cards stacked.
- One primary action per screen. Don't fill the air; let glass float in it.

## 7. Signature component — the AGENT WAR-ROOM (smoked-glass instrument)

Same intent as before, now in the glass language: a **smoked-glass** panel (`--glass-smoke-bg`, faint marigold "live" edge), mono type, bottom sheet on mobile / right rail on desktop.
- Each agent step = a row: pulsing `--marigold` status dot (running) → solid `--teal`/`--ok` (done) → `--danger` (error); agent name in mono uppercase; streamed `detail` text (typewriter while running, instant under reduced-motion); timing on the right.
- A thin vertical marigold line links the dots (encodes the real sequence — structure, not decor).
- **Real-action checkpoints get the most visual weight** (they earn the 20%): full-width inset rows with a check —
  `✓ PDF generated · complaint_KMC-Roads_4821.pdf` / `✓ Email sent · roads.borough7@… · 09:41:23` / `⏱ Escalation set · +5 days`.
- Data source is Firestore `agent_runs` (`05`,`06`) — the war-room is *real*, never a hardcoded animation.

## 8. PERFORMANCE BUDGET for glass (mandatory — protects load time)
- **Cap simultaneous blurred layers to ~3–4 on screen.** Glass is for hero/war-room/nav/key cards — NOT every list item. Long lists use flat translucent fills (no per-row backdrop-filter).
- **Never animate `backdrop-filter`** (forces re-rasterization). Animate `transform`/`opacity` only. Entrance/parallax use transforms.
- **Fallback:** `@supports not (backdrop-filter: blur())` → solid `rgba(255,255,255,.9)` fills, keep borders/shadows. App must look intentional with zero blur.
- **Low-end / data-saver:** detect and reduce — drop blur radius (22→10px) or switch to solid fills. Respect `prefers-reduced-transparency` where supported.
- Backdrop mesh is **static CSS gradients** (no canvas/WebGL). Hero panel is **DOM/CSS** (no heavy 3D lib); the tilt is CSS `transform` + `perspective`.
- Keep the map to one instance; lazy-load Maps SDK and the dashboard. Target: hero interactive < 2.5s on a mid-range phone over 4G; first war-room step < 1.5s.

## 9. Copy & voice (graded under Product Experience)
- Active voice; the button names the action and the toast matches it ("Report" → "Reported", "Mark as fixed" → "Resolved").
- Name things by what the citizen controls, never system internals ("Routed to KMC Roads Dept", not "router agent output").
- Errors say what happened + the next step, in the product's voice, no apology-spam: "Couldn't reach the camera. Check permissions, or report by voice instead."
- Empty map: "No reports here yet. Be the first — tap Report."
- Show the citizen's own words back in their language ("You said: …" in Noto) — it builds trust that they were understood.
- Hero copy stays short and concrete: a promise + how, never marketing fluff.

## 10. Accessibility checklist
- AA contrast on every text-bearing surface, verified on the rendered glass (§2.3). Never status-by-colour-alone — pair with label/icon.
- Visible focus rings everywhere; full keyboard path through report → result. Tap targets ≥44px; mic offers tap-to-toggle as well as hold.
- `lang` attributes on Indic nodes; `aria-live="polite"` on the war-room so each agent step is announced.
- `prefers-reduced-motion` (no slides/sheen/parallax) AND `prefers-reduced-transparency` (solid fills) both fully supported. Images have alt text (the issue type).

## 11. The mirror cut
Before shipping any screen, remove one thing. If anything competes with the hero panel, the Report CTA, or the war-room, quiet it. Premium = the fewest, most confident elements, floating in air, executed precisely.
