import "dotenv/config";

// Central config + capability flags. The pipeline runs in three modes per
// capability: live (key present) or demo fallback (key absent). This lets the
// whole app run today and go fully live the moment keys are added (Docs/07).

export const env = {
  port: Number(process.env.PORT ?? 8787),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  // ⚠️ VERIFY the exact free-tier multimodal Flash id in AI Studio (Docs/07 §2).
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  gmailUser: process.env.GMAIL_USER ?? "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  mailFrom: process.env.MAIL_FROM ?? process.env.GMAIL_USER ?? "jagrik@demo.in",
  demoInbox: process.env.DEMO_INBOX ?? "",
  nodeEnv: process.env.NODE_ENV ?? "development",
};

export const flags = {
  geminiEnabled: env.geminiApiKey.length > 0,
  emailEnabled: env.gmailUser.length > 0 && env.gmailAppPassword.length > 0,
};

export function startupBanner(): string {
  return [
    `Jagrik backend on :${env.port}`,
    `  Gemini : ${flags.geminiEnabled ? `LIVE (${env.geminiModel})` : "demo fallback (no GEMINI_API_KEY)"}`,
    `  Email  : ${flags.emailEnabled ? `LIVE (${env.gmailUser})` : "demo fallback (no GMAIL_* creds)"}`,
  ].join("\n");
}
