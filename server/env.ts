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
  // Real email via Resend HTTP API (works on hosts that block SMTP, e.g. Render free).
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM ?? "Jagrik <onboarding@resend.dev>",
  // Durable storage: base64 of a Firebase service-account JSON (Firestore).
  firebaseServiceAccountB64: process.env.FIREBASE_SERVICE_ACCOUNT_B64 ?? "",
};

export const flags = {
  geminiEnabled: env.geminiApiKey.length > 0,
  emailEnabled:
    env.resendApiKey.length > 0 || (env.gmailUser.length > 0 && env.gmailAppPassword.length > 0),
  firestoreEnabled: env.firebaseServiceAccountB64.length > 0,
};

export function startupBanner(): string {
  const emailMode = env.resendApiKey
    ? "LIVE (Resend HTTP)"
    : flags.emailEnabled
      ? `LIVE (Gmail SMTP ${env.gmailUser})`
      : "demo fallback";
  return [
    `Jagrik backend on :${env.port}`,
    `  Gemini  : ${flags.geminiEnabled ? `LIVE (${env.geminiModel})` : "demo fallback (no GEMINI_API_KEY)"}`,
    `  Email   : ${emailMode}`,
    `  Storage : ${flags.firestoreEnabled ? "Firestore (durable)" : "in-memory (resets on restart)"}`,
  ].join("\n");
}
