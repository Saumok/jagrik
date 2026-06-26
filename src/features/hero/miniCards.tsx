import { CheckCircle, EnvelopeSimple, MapPin, UsersThree } from "@phosphor-icons/react";

// Real mini-UI snapshots shown inside the hero panel. These are actual rendered
// components (not stock photos, not div-fake screenshots) — the most convincing
// way to "show the app working" per the taste skill.

export function MiniWarRoom() {
  const rows = [
    { name: "CLASSIFIER", text: "Drainage · severity 4/5" },
    { name: "ROUTER", text: "KMC Drainage · Borough VII" },
    { name: "DRAFTER", text: "Formal complaint written" },
  ];
  return (
    <div className="glass-smoke w-[16rem] p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="dot-live h-1.5 w-1.5 rounded-full bg-marigold" />
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-onink/70">
          Agent War-room
        </span>
      </div>
      <ul className="grid gap-2.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-start gap-2">
            <CheckCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-[var(--color-ok)]" />
            <div className="leading-tight">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-marigold/80">
                {r.name}
              </div>
              <div className="text-[11px] text-onink/90">{r.text}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-[rgba(232,146,60,0.34)] bg-[rgba(232,146,60,0.16)] px-2.5 py-1.5">
        <EnvelopeSimple size={13} weight="bold" className="text-marigold" />
        <span className="font-mono text-[9.5px] text-onink/90">
          <span className="text-marigold">Email sent</span> · 09:41:23
        </span>
      </div>
    </div>
  );
}

export function MiniMap() {
  const pins = [
    { top: "28%", left: "22%", c: "var(--color-status-resolved)" },
    { top: "52%", left: "58%", c: "var(--color-status-progress)" },
    { top: "38%", left: "74%", c: "var(--color-status-reported)" },
    { top: "68%", left: "34%", c: "var(--color-status-ack)" },
  ];
  return (
    <div className="glass glass-edge w-[13rem] overflow-hidden rounded-[18px]">
      <div
        className="relative h-[8.5rem]"
        style={{
          background:
            "linear-gradient(115deg,#e9ddcf,#f1e7da)," +
            "repeating-linear-gradient(58deg, rgba(15,110,102,.10) 0 1px, transparent 1px 26px)," +
            "repeating-linear-gradient(150deg, rgba(36,27,18,.06) 0 1px, transparent 1px 30px)",
        }}
      >
        {/* a soft "main road" */}
        <span className="absolute left-[-10%] top-1/2 h-2 w-[120%] -rotate-[18deg] rounded-full bg-nude-50/70" />
        {pins.map((p, i) => (
          <span
            key={i}
            className="absolute grid -translate-x-1/2 -translate-y-full place-items-center"
            style={{ top: p.top, left: p.left }}
          >
            <MapPin size={20} weight="fill" style={{ color: p.c }} />
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[10.5px] font-medium text-ink">Ward 110 · live</span>
        <span className="font-mono text-[9.5px] text-muted">31 issues</span>
      </div>
    </div>
  );
}

export function MiniCluster() {
  return (
    <div className="glass glass-edge flex items-center gap-3 rounded-[16px] px-4 py-3">
      <span className="grid h-10 w-10 place-items-center rounded-full glass-teal text-teal-deep">
        <UsersThree size={20} weight="fill" />
      </span>
      <div className="leading-tight">
        <div className="font-display text-[1.35rem] font-semibold text-ink">12</div>
        <div className="text-[11px] text-muted">citizens affected</div>
      </div>
    </div>
  );
}
