import dns from "node:dns";
import nodemailer from "nodemailer";
import { env, flags } from "../env.js";

// Render's free tier has no outbound IPv6; smtp.gmail.com resolves to IPv6
// first → ENETUNREACH. Prefer IPv4 so the SMTP connection succeeds.
dns.setDefaultResultOrder("ipv4first");

// Real email dispatch (Docs/07 §5) via Nodemailer + a Gmail app-password.
// The actual, observable action that earns the 20% Agentic Depth. When creds
// are absent it returns a clearly-marked simulated id so the flow still runs.

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!flags.emailEnabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: env.gmailUser, pass: env.gmailAppPassword },
    });
  }
  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  pdf?: { filename: string; content: Buffer };
  photo?: { filename: string; content: Buffer };
}

export interface MailResult {
  messageId: string;
  simulated: boolean;
  to: string;
  error?: string; // set when a real send was attempted but failed
}

export async function sendComplaint(input: MailInput): Promise<MailResult> {
  // Always route to the controlled demo inbox if one is set — never real
  // municipal staff during testing (Docs/00, Docs/07 §5).
  const to = env.demoInbox || input.to;
  const t = getTransporter();

  if (!t) {
    return { messageId: `simulated-${Date.now()}`, simulated: true, to };
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
    return { messageId: info.messageId, simulated: false, to };
  } catch (err) {
    const msg = (err as Error).message || "send failed";
    console.error("[email] send failed:", msg);
    return { messageId: `failed-${Date.now()}`, simulated: true, to, error: msg };
  }
}
