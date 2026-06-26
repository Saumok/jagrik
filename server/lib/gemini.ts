import { GoogleGenAI } from "@google/genai";
import { env, flags } from "../env.js";
import type { Classification, IssueType } from "../types.js";

// The agent brains (Docs/06). Real Gemini multimodal calls when a key is set;
// otherwise a deterministic fallback so the pipeline still runs end-to-end.

const ai = flags.geminiEnabled ? new GoogleGenAI({ apiKey: env.geminiApiKey }) : null;

export interface Media {
  buf: Buffer;
  mime: string;
}

const ISSUE_TYPES: IssueType[] = [
  "pothole",
  "drainage",
  "streetlight",
  "garbage",
  "water_supply",
  "other",
  "unclear",
];

const CLASSIFY_PROMPT = `You are the Classifier in a civic-issue triage system in Kolkata, India. You receive a photo and/or a voice recording of a public infrastructure problem. Identify the single most likely issue type from: pothole, drainage, streetlight, garbage, water_supply, other, unclear. Rate severity 1-5 where 5 means immediate danger to people (open manhole, live wire, pothole on a fast school route) and 1 is cosmetic. Give a realistic Indian municipal repair-cost range in INR. Write one short plain-language risk line a citizen would understand; empty if none. If audio is present, transcribe it in its original language and set transcriptLang (bn/hi/en). If the input does not clearly show a civic infrastructure issue, return issueType "unclear" with low confidence. Respond with ONLY this JSON object, no prose, no markdown:
{"issueType":"","severity":1,"estimatedRepairCost":{"minInr":0,"maxInr":0},"riskContext":"","transcript":"","transcriptLang":null,"confidence":0.0}`;

function stripFences(s: string): string {
  return s
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function coerceClassification(raw: unknown): Classification {
  const o = (raw ?? {}) as Record<string, unknown>;
  const issueType = ISSUE_TYPES.includes(o.issueType as IssueType)
    ? (o.issueType as IssueType)
    : "unclear";
  const severity = Math.min(5, Math.max(1, Number(o.severity) || 1)) as Classification["severity"];
  const cost = (o.estimatedRepairCost ?? {}) as Record<string, unknown>;
  const lang = ["bn", "hi", "en"].includes(o.transcriptLang as string)
    ? (o.transcriptLang as Classification["transcriptLang"])
    : null;
  return {
    issueType,
    severity,
    estimatedRepairCost: {
      minInr: Math.max(0, Number(cost.minInr) || 0),
      maxInr: Math.max(0, Number(cost.maxInr) || 0),
    },
    riskContext: typeof o.riskContext === "string" ? o.riskContext : "",
    transcript: typeof o.transcript === "string" ? o.transcript : "",
    transcriptLang: lang,
    confidence: Math.min(1, Math.max(0, Number(o.confidence) || 0)),
  };
}

// Deterministic fallback when no Gemini key — keeps the whole flow working.
function mockClassify(note?: string, transcript?: string): Classification {
  const text = `${note ?? ""} ${transcript ?? ""}`.toLowerCase();
  let issueType: IssueType = "pothole";
  if (/drain|ড্রেন|নর্দমা|water log|overflow|উপচে|sewer/.test(text)) issueType = "drainage";
  else if (/light|আলো|बत्ती|lamp|streetlight/.test(text)) issueType = "streetlight";
  else if (/garbage|waste|আবর্জনা|कचरा|trash|vat/.test(text)) issueType = "garbage";
  else if (/water|जल|পানি|supply|leak/.test(text)) issueType = "water_supply";
  const drainage = issueType === "drainage";
  return {
    issueType,
    severity: 4,
    estimatedRepairCost: drainage ? { minInr: 6000, maxInr: 12000 } : { minInr: 8000, maxInr: 15000 },
    riskContext: drainage
      ? "Stagnant water on a market street, dengue risk"
      : "On a school route, high accident risk",
    transcript: transcript ?? "",
    transcriptLang: transcript ? "bn" : null,
    confidence: 0.82,
  };
}

export async function classifyIssue(input: {
  image?: Media;
  audio?: Media;
  note?: string;
  transcript?: string;
  area?: string;
}): Promise<Classification> {
  if (!ai) return mockClassify(input.note, input.transcript);

  const parts: Array<Record<string, unknown>> = [{ text: CLASSIFY_PROMPT }];
  if (input.area) parts.push({ text: `Approximate location: ${input.area}` });
  if (input.note) parts.push({ text: `Citizen note: ${input.note}` });
  if (input.transcript) parts.push({ text: `Citizen spoke (transcribed): ${input.transcript}` });
  if (input.image) parts.push({ inlineData: { mimeType: input.image.mime, data: input.image.buf.toString("base64") } });
  if (input.audio) parts.push({ inlineData: { mimeType: input.audio.mime, data: input.audio.buf.toString("base64") } });

  try {
    const res = await ai.models.generateContent({
      model: env.geminiModel,
      contents: [{ role: "user", parts }],
      config: { temperature: 0.2, responseMimeType: "application/json" },
    });
    const text = stripFences(res.text ?? "");
    return coerceClassification(JSON.parse(text));
  } catch (err) {
    console.error("[gemini] classify failed, using fallback:", (err as Error).message);
    return mockClassify(input.note, input.transcript);
  }
}

const DRAFT_PROMPT = (ctx: {
  department: string;
  issueType: string;
  severity: number;
  area: string;
  cost: string;
  risk: string;
  trackingId: string;
  slaHours: number;
  transcript?: string;
  lang?: string | null;
}) => `You are the Drafter in a civic-grievance system. Write a concise, formal complaint in English addressed to "${ctx.department}", Kolkata Municipal Corporation. Include: the issue type (${ctx.issueType}) and severity (${ctx.severity}/5), the location (${ctx.area}), the date observed (today), the risk to the public (${ctx.risk || "as applicable"}), the estimated repair cost (${ctx.cost}), and the tracking ID ${ctx.trackingId}. Make a polite, specific request for redressal within ${ctx.slaHours} hours.${ctx.transcript ? ` Include one line: 'Reported by a citizen in ${ctx.lang ?? "their language"}; original statement: "${ctx.transcript}"'.` : ""} Keep it under 180 words. Respond with ONLY this JSON: {"subject":"","body":""}`;

// Before/after verification (Docs/06 §8). Compares the two photos and decides
// if the specific issue is resolved. Falls back to a labelled demo verdict.
export interface Verdict {
  fixed: boolean;
  confidence: number;
  reason: string;
}

export async function verifyFix(
  before: Media | undefined,
  after: Media,
  issueType: string,
): Promise<Verdict> {
  if (!ai) {
    return {
      fixed: true,
      confidence: 0.6,
      reason: "Demo mode: marked resolved without model comparison (add a Gemini key for a real check).",
    };
  }
  const prompt = before
    ? `You are verifying whether a reported civic issue has been fixed. Compare the BEFORE and AFTER photos of the same location. Decide if the specific problem (${issueType}) is resolved. Return ONLY: {"fixed":bool,"confidence":0..1,"reason":"short plain explanation"}`
    : `You are verifying a civic issue fix. Assess whether the AFTER photo shows the location free of the problem (${issueType}). Return ONLY: {"fixed":bool,"confidence":0..1,"reason":"short plain explanation"}`;

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (before) {
    parts.push({ text: "BEFORE:" });
    parts.push({ inlineData: { mimeType: before.mime, data: before.buf.toString("base64") } });
  }
  parts.push({ text: "AFTER:" });
  parts.push({ inlineData: { mimeType: after.mime, data: after.buf.toString("base64") } });

  try {
    const res = await ai.models.generateContent({
      model: env.geminiModel,
      contents: [{ role: "user", parts }],
      config: { temperature: 0.2, responseMimeType: "application/json" },
    });
    const o = JSON.parse(stripFences(res.text ?? "")) as Partial<Verdict>;
    return {
      fixed: !!o.fixed,
      confidence: Math.min(1, Math.max(0, Number(o.confidence) || 0)),
      reason: typeof o.reason === "string" ? o.reason : "",
    };
  } catch (err) {
    console.error("[gemini] verify failed:", (err as Error).message);
    return { fixed: false, confidence: 0, reason: "Couldn't analyse the photos. Please try again." };
  }
}

function fallbackDraft(ctx: Parameters<typeof DRAFT_PROMPT>[0]): { subject: string; body: string } {
  return {
    subject: `Civic complaint — ${ctx.issueType} at ${ctx.area} [${ctx.trackingId}]`,
    body: `To the ${ctx.department},\n\nI wish to formally report a ${ctx.issueType} (severity ${ctx.severity}/5) at ${ctx.area}, observed today. ${ctx.risk ? ctx.risk + ". " : ""}Estimated repair cost is ${ctx.cost}. Tracking ID: ${ctx.trackingId}.\n\n${ctx.transcript ? `Reported by a citizen in ${ctx.lang ?? "their language"}; original statement: "${ctx.transcript}".\n\n` : ""}I request redressal within ${ctx.slaHours} hours. Photo evidence is attached.\n\nFiled via Jagrik on behalf of a citizen.`,
  };
}

export async function draftComplaint(
  ctx: Parameters<typeof DRAFT_PROMPT>[0],
): Promise<{ subject: string; body: string }> {
  if (!ai) return fallbackDraft(ctx);
  try {
    const res = await ai.models.generateContent({
      model: env.geminiModel,
      contents: [{ role: "user", parts: [{ text: DRAFT_PROMPT(ctx) }] }],
      config: { temperature: 0.5, responseMimeType: "application/json" },
    });
    const o = JSON.parse(stripFences(res.text ?? "")) as { subject?: string; body?: string };
    return { subject: o.subject || `Civic complaint [${ctx.trackingId}]`, body: o.body || fallbackDraft(ctx).body };
  } catch (err) {
    console.error("[gemini] draft failed, using fallback:", (err as Error).message);
    return fallbackDraft(ctx);
  }
}
