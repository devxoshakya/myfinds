import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export type EmailResult = { id: string } | { error: string };

let client: { apiKey: string; resend: Resend } | null = null;

function getClient(apiKey: string): Resend {
  if (client?.apiKey === apiKey) return client.resend;
  const resend = new Resend(apiKey);
  client = { apiKey, resend };
  return resend;
}

/**
 * Sends one transactional email. Never throws: callers get `{ error }` so a
 * failed notification can be recorded without failing the request that caused
 * it. The message body is never logged (it can contain the handover code).
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: "RESEND_API_KEY is not configured." };

  try {
    const { data, error } = await getClient(apiKey).emails.send(
      {
        from: process.env.EMAIL_FROM ?? "MyFinds <onboarding@resend.dev>",
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      },
      { idempotencyKey: message.idempotencyKey },
    );
    if (error) return { error: error.message };
    return { id: data?.id ?? "" };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Email provider request failed.",
    };
  }
}
