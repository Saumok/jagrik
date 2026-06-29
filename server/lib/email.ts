import dns from "node:dns/promises";
import nodemailer from "nodemailer";
import { env, flags } from "../env.js";

// Render's free tier has no outbound IPv6; smtp.gmail.com resolves to IPv6
// first → ENETUNREACH. We resolve the IPv4 address ourselves and connect to it
// directly (with TLS servername for cert validation) so IPv6 is never attempted.

// Real email dispatch (Docs/07 §5) via Nodemailer + a Gmail app-password.
// The actual, observable action that earns the 20% Agentic Depth. When creds
// are absent it returns a clearly-marked simulated id so the flow still runs.

let transporter: nodemailer.Transporter | null = null;
async function getTransporter() {
  if (!flags.emailEnabled) return null;
  if (!transporter) {
    // resolve Gmail's IPv4 and connect to the literal IP (servername keeps the
    // TLS cert valid) — guarantees no IPv6 attempt on hosts without IPv6 egress.
    let host = "smtp.gmail.com";
    try {
      const { address } = await dns.lookup("smtp.gmail.com", { family: 4 });
      host = address;
    } catch {
      /* fall back to hostname */
    }
    transporter = nodemailer.createTransport({
      host,
      port: 465,
      secure: true,
      tls: { servername: "smtp.gmail.com" },
      auth: { user: env.gmailUser, pass: env.gmailAppPassword },
    });
  }
  return transporter;
}

export interface MailInput {
  to: string; // the real authority address
  subject: string;
  text: string;
  pdf?: { filename: string; content: Buffer };
  photo?: { filename: string; content: Buffer };
  live?: boolean; // true → actually deliver to `to`; false → controlled test inbox
}

export interface MailResult {
  messageId: string;
  simulated: boolean;
  to: string; // where it was actually delivered
  intendedTo: string; // the real authority it was routed to
  live: boolean; // whether it went live to the authority
  error?: string; // set when a real send was attempted but failed
}

// Resend HTTP API — works on hosts that block outbound SMTP (e.g. Render free).
async function sendViaResend(input: MailInput, to: string, intendedTo: string, live: boolean): Promise<MailResult> {
  const attachments: { filename: string; content: string }[] = [];
  if (input.pdf) attachments.push({ filename: input.pdf.filename, content: input.pdf.content.toString("base64") });
  if (input.photo) attachments.push({ filename: input.photo.filename, content: input.photo.content.toString("base64") });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.resendFrom, to, subject: input.subject, text: input.text, attachments }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[email] resend failed:", res.status, t.slice(0, 160));
      return { messageId: `failed-${Date.now()}`, simulated: true, to, intendedTo, live, error: `Resend ${res.status}: ${t.slice(0, 100)}` };
    }
    const j = (await res.json()) as { id?: string };
    return { messageId: j.id || "resend", simulated: false, to, intendedTo, live };
  } catch (err) {
    return { messageId: `failed-${Date.now()}`, simulated: true, to, intendedTo, live, error: (err as Error).message };
  }
}

export async function sendComplaint(input: MailInput): Promise<MailResult> {
  const intendedTo = input.to; // the real authority we routed to
  // Live mode → deliver to the real authority. Test mode (default) → the
  // controlled inbox, so municipal staff are never contacted during a demo.
  const live = !!input.live;
  const to = live ? intendedTo : env.demoInbox || intendedTo;

  // Prefer Resend (HTTP) when configured — reliable on SMTP-blocked hosts.
  if (env.resendApiKey) return sendViaResend(input, to, intendedTo, live);

  const t = await getTransporter();

  if (!t) {
    return { messageId: `simulated-${Date.now()}`, simulated: true, to, intendedTo, live };
  }

  const attachments = [];
  if (input.pdf) attachments.push({ filename: input.pdf.filename, content: input.pdf.content });
  if (input.photo) attachments.push({ filename: input.photo.filename, content: input.photo.content });

  // Never let a delivery failure crash the pipeline (Docs/06 §6 — surface
  // honestly, don't fake success). Returns an error-marked result instead.
  try {
    const info = await t.sendMail({
      from: `Jagrik (Citizen Report) <${env.mailFrom}>`,
      to,
      subject: input.subject,
      text: input.text,
      attachments,
    });
    return { messageId: info.messageId, simulated: false, to, intendedTo, live };
  } catch (err) {
    const msg = (err as Error).message || "send failed";
    console.error("[email] send failed:", msg);
    return { messageId: `failed-${Date.now()}`, simulated: true, to, intendedTo, live, error: msg };
  }
}
