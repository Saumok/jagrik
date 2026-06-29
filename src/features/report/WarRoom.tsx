import { useEffect, useState, type ComponentType } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  CheckCircle,
  FileText,
  EnvelopeSimple,
  Timer,
  Warning,
  Eye,
  MagnifyingGlass,
  Buildings,
  PenNib,
  PaperPlaneTilt,
  Alarm,
  Sparkle,
} from "@phosphor-icons/react";
import type { AgentStep, AgentName, Checkpoint } from "@/data/types";

type IconC = ComponentType<{ size?: number; weight?: "fill" | "bold" | "regular"; className?: string }>;

// Friendly identities for each agent — no jargon, no ALL-CAPS codes.
const AGENT: Record<AgentName, { name: string; Icon: IconC }> = {
  classifier: { name: "Understanding the problem", Icon: Eye },
  dedupe: { name: "Checking for duplicates", Icon: MagnifyingGlass },
  router: { name: "Finding the right office", Icon: Buildings },
  drafter: { name: "Writing your complaint", Icon: PenNib },
  dispatcher: { name: "Filing & sending it off", Icon: PaperPlaneTilt },
  escalator: { name: "Setting up follow-up", Icon: Alarm },
};

// Types out text while a step runs; instant under reduced motion.
function Typewriter({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) {
      setN(text.length);
      return;
    }
    setN(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) window.clearInterval(id);
    }, 16);
    return () => window.clearInterval(id);
  }, [text, reduce]);
  return <>{text.slice(0, n)}</>;
}

function CheckpointRow({ cp }: { cp: Checkpoint }) {
  const Icon = cp.kind === "pdf" ? FileText : cp.kind === "email" ? EnvelopeSimple : Timer;
  const verb = cp.kind === "pdf" ? "PDF generated" : cp.kind === "email" ? "Routed to" : "Escalation set";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 22 }}
      className="mt-2 flex items-center gap-2.5 overflow-hidden rounded-xl border border-[rgba(232,146,60,0.34)]
                 bg-[rgba(232,146,60,0.16)] px-3 py-2.5"
    >
      <motion.span
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.05 }}
      >
        <Icon size={17} weight="bold" className="shrink-0 text-marigold" />
      </motion.span>
      <span className="font-mono text-[12.5px] text-onink/95">
        <span className="font-medium text-marigold">{verb}</span>
        <span className="text-onink/55"> · </span>
        {cp.value}
      </span>
    </motion.div>
  );
}

// The agent's icon in a status disc: live (pulsing marigold), done (teal + check), error.
function AgentDisc({ step }: { step: AgentStep }) {
  const { Icon } = AGENT[step.agent];
  if (step.state === "error") {
    return (
      <span className="grid h-9 w-9 place-items-center rounded-full bg-danger/20 ring-1 ring-danger/40">
        <Warning size={18} weight="fill" className="text-danger" />
      </span>
    );
  }
  if (step.state === "done") {
    return (
      <motion.span
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 460, damping: 18 }}
        className="relative grid h-9 w-9 place-items-center rounded-full bg-[var(--color-ok)]/18 ring-1 ring-[var(--color-ok)]/40"
      >
        <Icon size={17} weight="fill" className="text-[var(--color-ok)]" />
        <CheckCircle size={14} weight="fill" className="absolute -bottom-0.5 -right-0.5 text-[var(--color-ok)] drop-shadow" />
      </motion.span>
    );
  }
  // running
  return (
    <span className="relative grid h-9 w-9 place-items-center rounded-full bg-marigold/18 ring-1 ring-marigold/50">
      <span className="absolute inset-0 animate-ping rounded-full bg-marigold/20" />
      <Icon size={17} weight="fill" className="relative text-marigold" />
    </span>
  );
}

function StepRow({ step, index, last }: { step: AgentStep; index: number; last: boolean }) {
  const running = step.state === "running";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.02 * index }}
      className="relative flex gap-3.5"
    >
      {/* connector */}
      {!last && (
        <span
          className="absolute left-[17px] top-10 bottom-[-14px] w-px"
          style={{ background: step.state === "done" ? "rgba(30,158,106,0.5)" : "rgba(243,235,223,0.18)" }}
          aria-hidden="true"
        />
      )}
      <div className="z-10 pt-0.5">
        <AgentDisc step={step} />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className={`text-[14.5px] font-medium leading-snug ${running ? "text-onink" : step.state === "done" ? "text-onink/90" : "text-onink"}`}>
          {AGENT[step.agent].name}
        </div>
        <div className="mt-0.5 text-[12.5px] leading-snug text-onink/60">{step.label}</div>
        {step.detail && (
          <div className="mt-1 max-w-[44ch] text-[12px] leading-snug text-onink/55">
            {running ? <Typewriter text={step.detail} /> : step.detail}
          </div>
        )}
        {step.state === "done" && step.checkpoint && <CheckpointRow cp={step.checkpoint} />}
      </div>
    </motion.li>
  );
}

// Small circular progress ring (done / total).
function Ring({ done, total }: { done: number; total: number }) {
  const pct = total ? done / total : 0;
  const r = 15;
  const c = 2 * Math.PI * r;
  const complete = done > 0 && done >= total;
  return (
    <span className="relative grid h-10 w-10 place-items-center">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(243,235,223,0.16)" strokeWidth="3" />
        <motion.circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={complete ? "var(--color-ok)" : "var(--color-marigold)"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
        />
      </svg>
      <span className="absolute font-mono text-[10px] font-semibold text-onink/80">
        {done}/{total}
      </span>
    </span>
  );
}

interface Props {
  steps: AgentStep[];
  running: boolean;
  className?: string;
}

export function WarRoom({ steps, running, className = "" }: Props) {
  const visible = steps.filter((s) => s.state !== "pending");
  const done = steps.filter((s) => s.state === "done").length;
  const allDone = !running && done > 0;

  return (
    <section
      aria-live="polite"
      aria-label="Live action on your report"
      className={`glass-smoke relative overflow-hidden p-5 md:p-6 ${className}`}
    >
      {/* slow scanline sheen while working */}
      {running && (
        <motion.span
          aria-hidden="true"
          initial={{ y: "-30%" }}
          animate={{ y: "130%" }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute inset-x-0 h-24"
          style={{ background: "linear-gradient(180deg, transparent, rgba(232,146,60,0.08), transparent)" }}
        />
      )}

      <header className="relative mb-5 flex items-center gap-3">
        <Ring done={done} total={steps.length || 6} />
        <div className="min-w-0">
          <div className="font-display text-[1.05rem] font-semibold leading-tight text-onink">
            {allDone ? "Done — it's filed" : "Action in motion"}
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-onink/55">
            <span className={`h-1.5 w-1.5 rounded-full ${running ? "dot-live bg-marigold" : "bg-[var(--color-ok)]"}`} />
            {running ? "Jagrik is acting on your report, live" : allDone ? "Every step completed" : "Ready"}
          </div>
        </div>
      </header>

      <div className="relative">
        <ol className="grid gap-3.5">
          <AnimatePresence initial={false}>
            {visible.map((step, i) => (
              <StepRow key={`${step.agent}-${i}`} step={step} index={i} last={i === visible.length - 1} />
            ))}
          </AnimatePresence>
        </ol>
      </div>

      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mt-4 flex items-center gap-2 rounded-[14px] bg-[var(--color-ok)]/14 px-3.5 py-2.5"
          >
            <Sparkle size={16} weight="fill" className="text-[var(--color-ok)]" />
            <span className="text-[12.5px] text-onink/85">Your complaint is filed and tracked. Jagrik takes it from here.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
