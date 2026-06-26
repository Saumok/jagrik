import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  CheckCircle,
  CircleNotch,
  FileText,
  EnvelopeSimple,
  Timer,
  Warning,
} from "@phosphor-icons/react";
import type { AgentStep, AgentName, Checkpoint } from "@/data/types";

const AGENT_LABEL: Record<AgentName, string> = {
  classifier: "CLASSIFIER",
  dedupe: "DEDUPE",
  router: "ROUTER",
  drafter: "DRAFTER",
  dispatcher: "DISPATCHER",
  escalator: "ESCALATOR",
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
  const verb =
    cp.kind === "pdf" ? "PDF generated" : cp.kind === "email" ? "Email sent" : "Escalation set";
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

function StepDot({ state }: { state: AgentStep["state"] }) {
  if (state === "error") return <Warning size={20} weight="fill" className="text-danger" />;
  if (state === "done")
    return (
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
        <CheckCircle size={20} weight="fill" className="text-[var(--color-ok)]" />
      </motion.span>
    );
  return (
    <span className="relative grid h-5 w-5 place-items-center">
      <span className="dot-live h-2.5 w-2.5 rounded-full bg-marigold" />
      <CircleNotch size={20} weight="bold" className="absolute animate-spin text-marigold/70" style={{ animationDuration: "1.1s" }} />
    </span>
  );
}

function StepRow({ step, index }: { step: AgentStep; index: number }) {
  const running = step.state === "running";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.02 * index }}
      className="relative pl-9"
    >
      <span className="absolute left-[6px] top-[2px] grid place-items-center">
        <StepDot state={step.state} />
      </span>

      <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-marigold/80">
        {AGENT_LABEL[step.agent]}
      </div>
      <div className="mt-0.5 text-[14px] font-medium leading-snug text-onink">{step.label}</div>
      {step.detail && (
        <div className="mt-1 max-w-[42ch] text-[12.5px] leading-snug text-onink/65">
          {running ? <Typewriter text={step.detail} /> : step.detail}
        </div>
      )}
      {step.state === "done" && step.checkpoint && <CheckpointRow cp={step.checkpoint} />}
    </motion.li>
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
  const pct = steps.length ? done / steps.length : 0;

  return (
    <section
      aria-live="polite"
      aria-label="Agent activity"
      className={`glass-smoke relative overflow-hidden p-5 md:p-6 ${className}`}
    >
      {/* slow scanline sheen across the instrument */}
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

      <header className="relative mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`h-2 w-2 rounded-full ${running ? "dot-live bg-marigold" : "bg-[var(--color-ok)]"}`} />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-onink/80">Agent War-room</span>
        </div>
        <span className="font-mono text-[11px] text-onink/45">{running ? "live" : "done"}</span>
      </header>

      {/* overall progress */}
      <div className="relative mb-5 h-[4px] overflow-hidden rounded-full bg-white/15">
        <motion.span
          className="block h-full rounded-full bg-gradient-to-r from-marigold to-marigold-deep
                     shadow-[0_0_8px_rgba(232,146,60,0.6)]"
          animate={{ width: `${pct * 100}%` }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
        />
      </div>

      <div className="relative">
        {visible.length > 1 && (
          <span className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-marigold/50 via-marigold/30 to-transparent" aria-hidden="true" />
        )}
        <ol className="grid gap-4">
          <AnimatePresence initial={false}>
            {visible.map((step, i) => (
              <StepRow key={`${step.agent}-${i}`} step={step} index={i} />
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </section>
  );
}
