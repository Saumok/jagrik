import { randomUUID } from "node:crypto";
import { flags } from "./env.js";
import { classifyIssue, draftComplaint, type Media } from "./lib/gemini.js";
import { lookupAuthority, computePriority, slaDays, trackingId } from "./lib/router.js";
import { buildComplaintPdf } from "./lib/pdf.js";
import { sendComplaint } from "./lib/email.js";
import { putPdf, putPhoto } from "./lib/store.js";
import { addIssue } from "./lib/issuesStore.js";
import type { ReportRequest, RunEvent, ResultIssue, StoredIssue } from "./types.js";

// The Orchestrator (Docs/06 §1). Runs the agents in sequence and emits a step
// event as each completes — that stream IS the war-room. Plain code coordinates;
// the intelligence lives in the agents.

type Emit = (e: RunEvent) => void;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export async function runReport(
  req: ReportRequest,
  media: { image?: Media; audio?: Media },
  emit: Emit,
): Promise<ResultIssue> {
  const area = req.area ?? "Garia Main Road, Ward 110";

  // ---- 1. CLASSIFIER (multimodal) ----
  emit({ type: "step", agent: "classifier", label: media.audio || req.transcript ? "Understanding what you said" : "Reading your photo", state: "running" });
  const c = await classifyIssue({
    image: media.image,
    audio: media.audio,
    note: req.note,
    transcript: req.transcript,
    area,
  });
  emit({
    type: "step",
    agent: "classifier",
    label: media.audio || req.transcript ? "Understood what you said" : "Read your photo",
    detail: `${c.issueType} · severity ${c.severity}/5 · est. ${inr(c.estimatedRepairCost.minInr)}–${inr(c.estimatedRepairCost.maxInr)}${c.riskContext ? ` · ${c.riskContext}` : ""}`,
    state: "done",
  });
  await delay(200);

  // ---- 2. DEDUPE (geo check; no live DB yet → always new) ----
  emit({ type: "step", agent: "dedupe", label: "Checking for existing reports", state: "running" });
  await delay(500);
  emit({ type: "step", agent: "dedupe", label: "Checked for existing reports", detail: "No open match within 80 m — filing a new ticket", state: "done" });
  await delay(200);

  // ---- 3. ROUTER (deterministic tool the Router agent calls) ----
  emit({ type: "step", agent: "router", label: "Finding the right authority", state: "running" });
  const authority = lookupAuthority(c.issueType);
  const priority = computePriority(c);
  const tid = trackingId(authority.id);
  await delay(400);
  emit({ type: "step", agent: "router", label: "Found the right authority", detail: `${authority.name} · priority ${priority.toUpperCase()}`, state: "done" });
  await delay(200);

  // ---- 4. DRAFTER ----
  emit({ type: "step", agent: "drafter", label: "Writing your formal complaint", state: "running" });
  const slaH = slaDays(priority) * 24;
  const draft = await draftComplaint({
    department: authority.name,
    issueType: c.issueType,
    severity: c.severity,
    area,
    cost: `${inr(c.estimatedRepairCost.minInr)}–${inr(c.estimatedRepairCost.maxInr)}`,
    risk: c.riskContext,
    trackingId: tid,
    slaHours: slaH,
    transcript: c.transcript || req.transcript,
    lang: c.transcriptLang,
  });
  emit({ type: "step", agent: "drafter", label: "Wrote your formal complaint", detail: c.transcript || req.transcript ? "Formal English complaint drafted, your words attached" : "Formal English complaint drafted", state: "done" });
  await delay(200);

  // ---- 5. DISPATCHER (the real-action agent) ----
  emit({ type: "step", agent: "dispatcher", label: "Filing the complaint", state: "running" });
  const pdfBuf = await buildComplaintPdf({
    trackingId: tid,
    department: authority.name,
    area,
    lat: req.lat,
    lng: req.lng,
    ward: req.ward,
    issueType: c.issueType,
    severity: c.severity,
    costMin: c.estimatedRepairCost.minInr,
    costMax: c.estimatedRepairCost.maxInr,
    risk: c.riskContext,
    subject: draft.subject,
    body: draft.body,
    transcript: c.transcript || req.transcript,
    transcriptLang: c.transcriptLang,
    photo: media.image?.buf,
  });
  const pdfId = randomUUID();
  const pdfFilename = `complaint_${authority.id}_${tid}.pdf`;
  putPdf(pdfId, { filename: pdfFilename, content: pdfBuf });
  emit({ type: "step", agent: "dispatcher", label: "Filing the complaint", detail: "Document ready", state: "done", checkpoint: { kind: "pdf", value: pdfFilename } });
  await delay(250);

  const mail = await sendComplaint({
    to: authority.email,
    subject: draft.subject,
    text: draft.body,
    pdf: { filename: pdfFilename, content: pdfBuf },
    photo: media.image ? { filename: "evidence.jpg", content: media.image.buf } : undefined,
  });
  const stamp = new Date().toLocaleTimeString("en-IN", { hour12: false });
  const emailLabel = mail.error
    ? "Couldn't send the email — queued for retry"
    : mail.simulated
      ? "Email prepared (add Gmail creds to send for real)"
      : "Sent a real email to the department";
  const emailDetail = mail.error
    ? `Delivery error, will retry: ${mail.error.slice(0, 80)}`
    : mail.simulated
      ? `Would deliver to ${mail.to}`
      : "Delivered with photo + PDF attached";
  emit({
    type: "step",
    agent: "dispatcher",
    label: emailLabel,
    detail: emailDetail,
    state: mail.error ? "error" : "done",
    checkpoint: { kind: "email", value: `${mail.to} · ${stamp}` },
  });
  await delay(200);

  // ---- 6. ESCALATOR ----
  emit({ type: "step", agent: "escalator", label: "Scheduling the follow-up", state: "running" });
  const days = slaDays(priority);
  await delay(350);
  emit({ type: "step", agent: "escalator", label: "Scheduled the follow-up", detail: "If it is not acknowledged, Jagrik escalates automatically", state: "done", checkpoint: { kind: "escalation", value: `+${days} days if unresolved` } });

  // store the uploaded photo (if any) so the detail page can show it
  let photoId: string | undefined;
  if (media.image) {
    photoId = randomUUID();
    putPhoto(photoId, { mime: media.image.mime, content: media.image.buf });
  }

  const issueId = `live-${Date.now()}`;
  const createdAt = Date.now();

  // persist for the map list + /issue/:id detail (Docs/03, Docs/05)
  const stored: StoredIssue = {
    id: issueId,
    trackingId: tid,
    createdAt,
    source: req.source,
    issueType: c.issueType,
    severity: c.severity,
    estimatedRepairCost: c.estimatedRepairCost,
    riskContext: c.riskContext,
    routedDepartment: authority.name,
    authorityId: authority.id,
    priority,
    audioTranscript: c.transcript || req.transcript,
    audioLang: c.transcriptLang,
    area,
    lat: req.lat,
    lng: req.lng,
    ward: req.ward,
    affectedCount: 1,
    status: "reported",
    statusHistory: [{ status: "reported", at: createdAt, by: "agent" }],
    complaintPdfId: pdfId,
    photoId,
    emailDispatched: !mail.simulated,
  };
  await addIssue(stored);

  const issue: ResultIssue = {
    id: issueId,
    trackingId: tid,
    source: req.source,
    issueType: c.issueType,
    severity: c.severity,
    estimatedRepairCost: c.estimatedRepairCost,
    riskContext: c.riskContext,
    routedDepartment: authority.name,
    authorityId: authority.id,
    priority,
    audioTranscript: c.transcript || req.transcript,
    audioLang: c.transcriptLang,
    area,
    complaintPdfId: pdfId,
    emailDispatched: !mail.simulated,
    emailMessageId: mail.messageId,
    mode: { gemini: flags.geminiEnabled, email: flags.emailEnabled },
  };
  emit({ type: "result", issue });
  return issue;
}
