import type { AgentStep, Issue, Lang } from "./types";

// The simulated multi-agent run that drives the war-room. In production this is
// replaced by a Firestore subscription to agent_runs/{runId} written by the
// real backend orchestrator (Docs/06). The SHAPE here matches that exactly, so
// the war-room component never changes when the live backend lands.

export interface ReportInput {
  source: "photo" | "voice";
  transcript?: string;
  transcriptLang?: Lang;
  area?: string;
}

interface BuiltRun {
  steps: AgentStep[];
  result: Issue;
}

const SAMPLE_TRANSCRIPT_BN = "বাড়ির সামনের ড্রেনটা কয়েকদিন ধরে উপচে পড়ছে";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function stamp(offsetMs = 0): string {
  const d = new Date(Date.now() + offsetMs);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Build the ordered pipeline + the resulting issue for a given intake.
export function buildRun(input: ReportInput): BuiltRun {
  const isVoice = input.source === "voice";
  const transcript = input.transcript || (isVoice ? SAMPLE_TRANSCRIPT_BN : undefined);
  const area = input.area ?? "Garia Main Road, Ward 110";

  // The demo scenario: an overflowing drain reported by voice in Bengali, OR a
  // pothole by photo. Both route through the real KMC structure.
  const drainage = isVoice;

  const trackingId = drainage ? "KMC-DR-4838" : "KMC-RD-5117";
  const pdfFile = drainage
    ? "complaint_KMC-Drainage_4838.pdf"
    : "complaint_KMC-Roads_5117.pdf";
  const toEmail = drainage
    ? "drainage.borough7@jagrik-demo.in"
    : "roads.borough7@jagrik-demo.in";

  const steps: AgentStep[] = [
    {
      agent: "classifier",
      label: isVoice ? "Understood what you said" : "Read your photo",
      detail: drainage
        ? "Drainage overflow · severity 4/5 · est. ₹6,000–12,000 · stagnant water, dengue risk"
        : "Pothole · severity 4/5 · est. ₹8,000–15,000 · on a school route, accident risk",
      state: "pending",
      durationMs: 2100,
    },
    {
      agent: "dedupe",
      label: "Checked for existing reports",
      detail: drainage
        ? "No open match within 80 m — filing a new ticket"
        : "No open match within 80 m — filing a new ticket",
      state: "pending",
      durationMs: 1300,
    },
    {
      agent: "router",
      label: "Found the right authority",
      detail: drainage
        ? "KMC Drainage Dept (Borough VII) · priority HIGH"
        : "KMC Roads Dept (Borough VII) · priority HIGH",
      state: "pending",
      durationMs: 1600,
    },
    {
      agent: "drafter",
      label: "Wrote your formal complaint",
      detail: transcript
        ? `Formal English complaint drafted, your words attached`
        : "Formal English complaint drafted",
      state: "pending",
      durationMs: 1800,
    },
    {
      agent: "dispatcher",
      label: "Filed the complaint",
      detail: "Generating the document and sending it now",
      state: "pending",
      durationMs: 2000,
      checkpoint: { kind: "pdf", value: pdfFile },
    },
    {
      agent: "dispatcher",
      label: "Sent a real email to the department",
      detail: `Delivered with photo + PDF attached`,
      state: "pending",
      durationMs: 1500,
      checkpoint: { kind: "email", value: `${toEmail} · ${stamp(9000)}` },
    },
    {
      agent: "escalator",
      label: "Scheduled the follow-up",
      detail: "If it is not acknowledged, Jagrik escalates automatically",
      state: "pending",
      durationMs: 1200,
      checkpoint: { kind: "escalation", value: "+5 days if unresolved" },
    },
  ];

  const result: Issue = {
    id: `live-${Date.now()}`,
    createdAt: Date.now(),
    reporterId: "anon-demo",
    affectedCount: 1,
    source: input.source,
    audioTranscript: transcript,
    audioLang: input.transcriptLang ?? (isVoice ? "bn" : undefined),
    photoSeed: drainage ? "garia-drain-overflow" : "kolkata-pothole-road",
    location: { lat: 22.4625, lng: 88.3911, area, ward: 110 },
    issueType: drainage ? "drainage" : "pothole",
    severity: 4,
    estimatedRepairCost: drainage
      ? { minInr: 6000, maxInr: 12000 }
      : { minInr: 8000, maxInr: 15000 },
    riskContext: drainage
      ? "Stagnant water on a market street, dengue risk"
      : "On a school route, high accident risk",
    routedDepartment: drainage
      ? "KMC Drainage Department — Borough VII"
      : "KMC Roads Department — Borough VII",
    authorityId: drainage ? "kmc-drainage-b7" : "kmc-roads-b7",
    priority: "high",
    trackingId,
    status: "reported",
  };

  return { steps, result };
}

// Play the run, advancing each step running -> done over its duration, calling
// onUpdate with a fresh array each transition. `instant` honors reduced motion.
export async function playRun(
  initial: AgentStep[],
  onUpdate: (steps: AgentStep[]) => void,
  opts: { instant?: boolean; signal?: AbortSignal } = {},
): Promise<void> {
  const steps = initial.map((s) => ({ ...s }));
  const sleep = (ms: number) =>
    new Promise<void>((res, rej) => {
      if (opts.signal?.aborted) return rej(new DOMException("aborted", "AbortError"));
      const t = setTimeout(res, ms);
      opts.signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          rej(new DOMException("aborted", "AbortError"));
        },
        { once: true },
      );
    });

  for (let i = 0; i < steps.length; i++) {
    steps[i] = { ...steps[i], state: "running" };
    onUpdate(steps.map((s) => ({ ...s })));
    await sleep(opts.instant ? 60 : steps[i].durationMs);
    steps[i] = { ...steps[i], state: "done" };
    onUpdate(steps.map((s) => ({ ...s })));
    if (!opts.instant) await sleep(360);
  }
}

export const SAMPLE_BENGALI = SAMPLE_TRANSCRIPT_BN;
