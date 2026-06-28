import type { AgentStep, AgentName } from "@/data/types";

// Client for the live backend orchestrator. POSTs the report and reads the
// NDJSON stream, surfacing each agent step as the war-room renders it. Mirrors
// the server's RunEvent shape (server/types.ts).

export interface ResultView {
  id: string;
  trackingId: string;
  routedDepartment: string;
  priority: "low" | "medium" | "high";
  estimatedRepairCost?: { minInr: number; maxInr: number };
  audioTranscript?: string;
  audioLang?: "bn" | "hi" | "en" | null;
  complaintPdfId?: string;
  emailDispatched: boolean;
  mode: { gemini: boolean; email: boolean };
}

export interface ScoreEvent {
  action: "report" | "resolve" | "post" | "comment";
  points: number;
  citizen: { score: number; level: string };
}

type RunEvent =
  | { type: "step"; agent: AgentName; label: string; detail?: string; state: "running" | "done" | "error"; checkpoint?: AgentStep["checkpoint"] }
  | { type: "result"; issue: ResultView }
  | { type: "score"; action: ScoreEvent["action"]; points: number; citizen: ScoreEvent["citizen"] }
  | { type: "error"; message: string }
  | { type: "done" };

export interface ReportInput {
  source: "photo" | "voice";
  transcript?: string;
  note?: string;
  area?: string;
  ward?: number;
  lat?: number;
  lng?: number;
  imageFile?: Blob;
  audioBlob?: Blob;
  reporterId?: string;
  reporterHandle?: string;
}

export interface StreamHandlers {
  onSteps: (steps: AgentStep[]) => void;
  onResult: (r: ResultView) => void;
  onScore?: (s: ScoreEvent) => void;
}

// Reduce the event stream into the AgentStep[] the war-room consumes.
function makeReducer(onSteps: (s: AgentStep[]) => void) {
  const steps: AgentStep[] = [];
  return (e: Extract<RunEvent, { type: "step" }>) => {
    if (e.state === "running") {
      steps.push({ agent: e.agent, label: e.label, detail: e.detail, state: "running", durationMs: 0, checkpoint: e.checkpoint });
    } else {
      // find the last running step from the same agent; else append a new done row
      let idx = -1;
      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].agent === e.agent && steps[i].state === "running") {
          idx = i;
          break;
        }
      }
      const row: AgentStep = { agent: e.agent, label: e.label, detail: e.detail, state: e.state, durationMs: 0, checkpoint: e.checkpoint };
      if (idx >= 0) steps[idx] = row;
      else steps.push(row);
    }
    onSteps(steps.map((s) => ({ ...s })));
  };
}

export type Lang = "bn" | "hi" | "en";

// Transcribe recorded audio so the citizen can verify it before filing.
export async function transcribeAudio(blob: Blob, signal?: AbortSignal): Promise<{ transcript: string | null; lang: Lang | null }> {
  const fd = new FormData();
  fd.set("audio", blob, "audio.webm");
  const res = await fetch("/api/transcribe", { method: "POST", body: fd, signal });
  if (!res.ok) throw new Error(`transcribe ${res.status}`);
  return (await res.json()) as { transcript: string | null; lang: Lang | null };
}

// Translate a transcript for the language toggle.
export async function translateText(text: string, target: Lang, signal?: AbortSignal): Promise<string> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target }),
    signal,
  });
  if (!res.ok) throw new Error(`translate ${res.status}`);
  return ((await res.json()) as { text: string }).text;
}

export async function streamReport(
  input: ReportInput,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const fd = new FormData();
  fd.set("source", input.source);
  if (input.transcript) fd.set("transcript", input.transcript);
  if (input.note) fd.set("note", input.note);
  if (input.area) fd.set("area", input.area);
  if (input.ward != null) fd.set("ward", String(input.ward));
  if (input.lat != null) fd.set("lat", String(input.lat));
  if (input.lng != null) fd.set("lng", String(input.lng));
  if (input.imageFile) fd.set("image", input.imageFile, "evidence.jpg");
  if (input.audioBlob) fd.set("audio", input.audioBlob, "audio.webm");
  if (input.reporterId) fd.set("reporterId", input.reporterId);
  if (input.reporterHandle) fd.set("reporterHandle", input.reporterHandle);

  const res = await fetch("/api/report", { method: "POST", body: fd, signal });
  if (!res.ok || !res.body) throw new Error(`report failed: ${res.status}`);

  const reduce = makeReducer(handlers.onSteps);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";

  const handle = (line: string) => {
    if (!line.trim()) return;
    const e = JSON.parse(line) as RunEvent;
    if (e.type === "step") reduce(e);
    else if (e.type === "result") handlers.onResult(e.issue);
    else if (e.type === "score") handlers.onScore?.({ action: e.action, points: e.points, citizen: e.citizen });
    else if (e.type === "error") throw new Error(e.message);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      handle(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
    }
  }
  if (buf.trim()) handle(buf);
}
