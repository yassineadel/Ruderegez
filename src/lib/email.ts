import { Resend } from "resend";

/**
 * Email sending, with a console fallback.
 *
 * Until the client's domain is bought and verified in Resend, we can only
 * send to the account owner's address. When sending isn't possible, the
 * email is printed to the terminal so development is never blocked.
 */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "Ruderegez <onboarding@resend.dev>";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  if (!resend) {
    logToConsole(to, subject, html);
    return;
  }

 try {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("[email] send failed:", error.message);
    logToConsole(to, subject, html);
  }
} catch (err) {
  console.error("[email] send threw:", err);
  logToConsole(to, subject, html);
}
}

function logToConsole(to: string, subject: string, html: string) {
  console.log("\n────────── EMAIL (not sent) ──────────");
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  console.log("──────────────────────────────────────\n");
}