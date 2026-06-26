import { motion, useReducedMotion } from "motion/react";
import { Path, Drop, DropHalf, Lightbulb, Trash, Question } from "@phosphor-icons/react";
import type { ComponentType } from "react";

// Per-type icon + colour, used across the dashboard (bento colour diversity).
export const TYPE_META: Record<string, { label: string; color: string; icon: ComponentType<{ size?: number; weight?: "fill" | "bold" | "regular" }> }> = {
  pothole: { label: "Pothole", color: "var(--color-marigold-deep)", icon: Path },
  drainage: { label: "Drainage", color: "var(--color-teal)", icon: Drop },
  streetlight: { label: "Streetlight", color: "var(--color-status-progress)", icon: Lightbulb },
  garbage: { label: "Garbage", color: "var(--color-status-resolved)", icon: Trash },
  water_supply: { label: "Water supply", color: "var(--color-status-ack)", icon: DropHalf },
  other: { label: "Other", color: "var(--color-faint)", icon: Question },
  unclear: { label: "Unclear", color: "var(--color-faint)", icon: Question },
};

export function typeMeta(t: string) {
  return TYPE_META[t] ?? TYPE_META.other;
}

// ---- Resolution donut ----
export function Donut({ rate, resolved, open }: { rate: number; resolved: number; open: number }) {
  const reduce = useReducedMotion();
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.round(rate * 100);
  return (
    <div className="flex items-center gap-5">
      <svg width="132" height="132" viewBox="0 0 132 132" className="shrink-0 -rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--color-nude-200)" strokeWidth="12" />
        <motion.circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="var(--color-teal)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: reduce ? circ * (1 - rate) : circ }}
          whileInView={{ strokeDashoffset: circ * (1 - rate) }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        <text x="66" y="60" textAnchor="middle" className="rotate-90" transform="rotate(90 66 66)" style={{ fill: "var(--color-ink)", font: "600 26px var(--font-display)" }}>
          {pct}%
        </text>
        <text x="66" y="82" textAnchor="middle" transform="rotate(90 66 66)" style={{ fill: "var(--color-muted)", font: "500 11px var(--font-mono)" }}>
          RESOLVED
        </text>
      </svg>
      <div className="grid gap-2.5">
        <Legend color="var(--color-teal)" label="Resolved" value={resolved} />
        <Legend color="var(--color-nude-300)" label="Still open" value={open} />
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="text-[0.92rem] text-muted">{label}</span>
      <span className="ml-auto font-mono text-[0.95rem] font-medium text-ink">{value}</span>
    </div>
  );
}

// ---- Reports-by-type animated bars ----
export function BarList({ items }: { items: { type: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="grid gap-3">
      {items.map((it, idx) => {
        const m = typeMeta(it.type);
        const Icon = m.icon;
        return (
          <li key={it.type} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${m.color} 16%, transparent)`, color: m.color }}>
              <Icon size={15} weight="fill" />
            </span>
            <span className="relative h-3 overflow-hidden rounded-full bg-nude-200/70">
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: m.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${(it.count / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: idx * 0.06 }}
              />
            </span>
            <span className="w-6 text-right font-mono text-[0.9rem] font-medium text-ink">{it.count}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ---- 8-week trend area chart (SVG, animated draw) ----
export function TrendArea({ data }: { data: { label: string; count: number }[] }) {
  const reduce = useReducedMotion();
  const W = 100;
  const H = 42;
  const pad = 3;
  const max = Math.max(1, ...data.map((d) => d.count));
  const n = data.length;
  const pts = data.map((d, i) => {
    const x = pad + (i / (n - 1)) * (W - pad * 2);
    const y = H - pad - (d.count / max) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-32 w-full overflow-visible">
        <defs>
          <linearGradient id="trendfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-teal)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-teal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={area} fill="url(#trendfill)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.5 }} />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--color-teal)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
        {pts.map(([x, y], i) => (
          <motion.circle key={i} cx={x} cy={y} r={i === n - 1 ? 1.8 : 1.1} fill="var(--color-teal)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.6 + i * 0.05 }} />
        ))}
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-faint">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
