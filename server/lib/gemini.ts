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

// Groq fallback (OpenAI-compatible, text-only). Returns parsed JSON or null.
// Used when Gemini errors or rate-limits, before the deterministic last resort.
async function groqJSON(prompt: string): Promise<unknown | null> {
  if (!flags.groqEnabled) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.groqApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.groqModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error("[groq] http", res.status, (await res.text()).slice(0, 140));
      return null;
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return JSON.parse(stripFences(j.choices?.[0]?.message?.content ?? ""));
  } catch (err) {
    console.error("[groq] failed:", (err as Error).message);
    return null;
  }
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

type ClassifyInput = {
  image?: Media;
  audio?: Media;
  note?: string;
  transcript?: string;
  area?: string;
};

// Tier 1: Gemini (multimodal). Returns null on error so the chain continues.
async function geminiClassify(input: ClassifyInput): Promise<Classification | null> {
  if (!ai) return null;
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
    return coerceClassification(JSON.parse(stripFences(res.text ?? "")));
  } catch (err) {
    console.error("[gemini] classify failed:", (err as Error).message);
    return null;
  }
}

// Tier 2: Groq (text only — uses note/transcript, can't see the image).
async function groqClassify(input: ClassifyInput): Promise<Classification | null> {
  const text = [input.area && `Location: ${input.area}`, input.note && `Note: ${input.note}`, input.transcript && `Citizen said: ${input.transcript}`]
    .filter(Boolean)
    .join(". ");
  if (!flags.groqEnabled || !text) return null;
  const raw = await groqJSON(`${CLASSIFY_PROMPT}\n\nText-only input (no image available): ${text}`);
  return raw ? coerceClassification(raw) : null;
}

// Gemini → Groq → deterministic heuristic.
export async function classifyIssue(input: ClassifyInput): Promise<Classification> {
  return (
    (await geminiClassify(input)) ??
    (await groqClassify(input)) ??
    mockClassify(input.note, input.transcript)
  );
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

// Plain-language hotspot predictions (Docs/05 §2, Docs/06 §6). One batched call
// for all hotspots; template fallback per item when Gemini is off.
export interface HotspotInput {
  area: string;
  issueType: string;
  count: number;
  unresolved: number;
}

export async function generateHotspotPredictions(
  hotspots: HotspotInput[],
): Promise<{ predictions: string[]; byGemini: boolean }> {
  const fallback = hotspots.map(
    (h) => `${h.count} ${h.issueType} reports in 90 days, ${h.unresolved} unresolved — rising civic risk.`,
  );
  if (hotspots.length === 0) return { predictions: fallback, byGemini: false };

  const base = `You are a civic-data analyst for Kolkata. For each hotspot below, write ONE short, plain-language prediction (max 16 words) of the civic risk if it stays unaddressed (e.g. monsoon flooding, accidents, disease), same order.\n${JSON.stringify(hotspots)}`;

  // Tier 1: Gemini (returns a JSON array)
  if (ai) {
    try {
      const res = await ai.models.generateContent({
        model: env.geminiModel,
        contents: [{ role: "user", parts: [{ text: `${base}\nReturn ONLY a JSON array of strings.` }] }],
        config: { temperature: 0.5, responseMimeType: "application/json" },
      });
      const arr = JSON.parse(stripFences(res.text ?? "")) as unknown;
      if (Array.isArray(arr) && arr.length === hotspots.length) {
        return { predictions: arr.map((s) => String(s)), byGemini: true };
      }
    } catch (err) {
      console.error("[gemini] predictions failed:", (err as Error).message);
    }
  }

  // Tier 2: Groq (json_object → { "predictions": [...] })
  if (flags.groqEnabled) {
    const o = (await groqJSON(`${base}\nReturn ONLY {"predictions": ["...", "..."]}.`)) as { predictions?: unknown[] } | null;
    if (o?.predictions && Array.isArray(o.predictions) && o.predictions.length === hotspots.length) {
      return { predictions: o.predictions.map((s) => String(s)), byGemini: true };
    }
  }

  return { predictions: fallback, byGemini: false };
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
  // Tier 1: Gemini
  if (ai) {
    try {
      const res = await ai.models.generateContent({
        model: env.geminiModel,
        contents: [{ role: "user", parts: [{ text: DRAFT_PROMPT(ctx) }] }],
        config: { temperature: 0.5, responseMimeType: "application/json" },
      });
      const o = JSON.parse(stripFences(res.text ?? "")) as { subject?: string; body?: string };
      if (o.subject && o.body) return { subject: o.subject, body: o.body };
    } catch (err) {
      console.error("[gemini] draft failed:", (err as Error).message);
    }
  }
  // Tier 2: Groq
  if (flags.groqEnabled) {
    const o = (await groqJSON(DRAFT_PROMPT(ctx))) as { subject?: string; body?: string } | null;
    if (o?.subject && o?.body) return { subject: o.subject, body: o.body };
  }
  // Tier 3: deterministic
  return fallbackDraft(ctx);
}

const LANG_NAME: Record<string, string> = { en: "English", hi: "Hindi", bn: "Bengali" };

// Translate a transcript into a target language for the pre-file preview.
// Gemini → Groq → returns the original unchanged (so the UI never breaks).
export async function translateText(text: string, target: "en" | "hi" | "bn"): Promise<string> {
  const langName = LANG_NAME[target] ?? "English";
  const prompt = `Translate the following text into ${langName}. Preserve the meaning and tone. Respond with ONLY the translation, no quotes, no notes.\n\nText: ${text}`;

  if (ai) {
    try {
      const res = await ai.models.generateContent({
        model: env.geminiModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { temperature: 0.2 },
      });
      const out = (res.text ?? "").trim();
      if (out) return out;
    } catch (err) {
      console.error("[gemini] translate failed:", (err as Error).message);
    }
  }
  if (flags.groqEnabled) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.groqApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: env.groqModel, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
      });
      if (res.ok) {
        const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const out = (j.choices?.[0]?.message?.content ?? "").trim();
        if (out) return out;
      }
    } catch (err) {
      console.error("[groq] translate failed:", (err as Error).message);
    }
  }
  return text; // no translator available → show the original
}
