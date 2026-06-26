import { motion, useReducedMotion } from "motion/react";
import {
  Waveform,
  CheckCircle,
  FileText,
  EnvelopeSimple,
  Timer,
  Buildings,
  MapPin,
  TrendUp,
  ArrowRight,
} from "@phosphor-icons/react";
import { CountUp } from "@/components/motionPrimitives";

// The four live capability panels the hero glass morphs between, driven by the
// liquid tabs. Each is a real, self-contained mini-UI (not a fake screenshot).
// Consistent ~19rem footprint so the morph feels like one surface changing.

const card = "glass glass-edge rounded-[20px] p-4 w-[19rem]";

function SeeSayPanel() {
  const reduce = useReducedMotion();
  return (
    <div className={card}>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-marigold text-white">
          <Waveform size={18} weight="bold" />
        </span>
        <div className="flex items-end gap-1 h-7" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 rounded-full bg-marigold/80"
              initial={{ height: 6 }}
              animate={reduce ? { height: 16 } : { height: [8, 26, 12, 22, 8] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
            />
          ))}
        </div>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
          Listening
        </span>
      </div>

      <div className="mt-3 rounded-[14px] bg-nude-150/70 px-3.5 py-2.5">
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">You said</div>
        <p lang="bn" className="mt-0.5 text-ink text-[1.05rem] leading-snug">
          ড্রেনটা উপচে পড়ছে
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <CheckCircle size={16} weight="fill" className="text-[var(--color-ok)]" />
        <span className="text-[12.5px] text-text">
          Drainage <span className="text-muted">·</span> severity{" "}
          <span className="font-medium text-sev-4">4/5</span>
        </span>
      </div>
    </div>
  );
}

function RoutePanel() {
  return (
    <div className={card}>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-teal">
        Routing decision
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-full glass-teal text-teal-deep">
          <Buildings size={20} weight="fill" />
        </span>
        <div className="leading-tight">
          <div className="text-[13.5px] font-medium text-ink">KMC Drainage Dept</div>
          <div className="text-[11px] text-muted">Borough VII · Ward 110</div>
        </div>
        <span className="ml-auto rounded-full bg-sev-4/15 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-sev-4">
          HIGH
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {[
          "Matched authority by issue + ward",
          "No duplicate within 80 m",
          "Priority set from severity + risk",
        ].map((t) => (
          <div key={t} className="flex items-center gap-2">
            <CheckCircle size={14} weight="fill" className="shrink-0 text-teal" />
            <span className="text-[11.5px] text-text/85">{t}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 rounded-[12px] bg-nude-150/70 px-3 py-2 text-[11px] text-muted">
        <MapPin size={13} weight="fill" className="text-teal" />
        Garia Main Road
        <ArrowRight size={12} weight="bold" className="mx-0.5" />
        Borough VII office
      </div>
    </div>
  );
}

function DispatchPanel() {
  return (
    <div className="glass-smoke w-[19rem] rounded-[20px] p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="dot-live h-1.5 w-1.5 rounded-full bg-marigold" />
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-onink/70">
          Dispatching for real
        </span>
      </div>

      <div className="grid gap-2">
        <Checkpoint icon={FileText} label="PDF generated" value="complaint_KMC-Drainage_4838.pdf" />
        <Checkpoint icon={EnvelopeSimple} label="Email sent" value="drainage.borough7@… · 09:41" />
        <Checkpoint icon={Timer} label="Escalation set" value="+5 days if unresolved" muted />
      </div>
    </div>
  );
}

function Checkpoint({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2 rounded-[11px] px-2.5 py-2
        ${muted ? "bg-white/5" : "border border-[rgba(232,146,60,0.34)] bg-[rgba(232,146,60,0.16)]"}`}
    >
      <Icon size={14} weight="bold" className={muted ? "text-onink/60" : "text-marigold"} />
      <span className="font-mono text-[10px] text-onink/90">
        <span className={muted ? "text-onink/70" : "text-marigold"}>{label}</span>
        <span className="text-onink/45"> · </span>
        {value}
      </span>
    </motion.div>
  );
}

function PredictPanel() {
  const bars = [38, 52, 64, 88];
  return (
    <div className={card}>
      <div className="flex items-center gap-2">
        <TrendUp size={16} weight="bold" className="text-marigold-deep" />
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
          Hotspot forecast
        </span>
      </div>

      <div className="mt-3 flex h-[5.5rem] items-end gap-2">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            className="flex-1 rounded-t-md bg-gradient-to-t from-teal/70 to-teal-600"
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: 0.1 + i * 0.1, type: "spring", stiffness: 120, damping: 16 }}
          />
        ))}
      </div>

      <div className="mt-3 rounded-[12px] bg-nude-150/70 px-3 py-2.5 leading-snug">
        <div className="text-[12.5px] font-medium text-ink">Garia Main Road</div>
        <div className="text-[11px] text-muted">
          <CountUp to={4} className="font-medium text-marigold-deep" /> drainage reports / 90d →
          monsoon flood risk
        </div>
      </div>
    </div>
  );
}

export const SHOWCASE = [
  { id: "see-say", render: SeeSayPanel, caption: "Understands a photo or your voice" },
  { id: "route", render: RoutePanel, caption: "Finds the exact KMC department" },
  { id: "dispatch", render: DispatchPanel, caption: "Files a real complaint in seconds" },
  { id: "predict", render: PredictPanel, caption: "Predicts the next hotspot" },
] as const;
