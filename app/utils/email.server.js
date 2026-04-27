import nodemailer from "nodemailer";
import { parseRecipientEmails } from "./recipients";

export async function sendOrderNotificationEmail(settings, recipients, renderedEmail) {
  const cleanRecipients = parseRecipientEmails(recipients.join(","));

  if (!cleanRecipients.length) {
    return {
      ok: false,
      message: "No valid recipient emails were provided.",
    };
  }

  if (!settings.smtpHost || !settings.smtpPort || !settings.fromEmail) {
    return {
      ok: false,
      message: "SMTP host, SMTP port, and from email are required.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: Number(settings.smtpPort),
      secure: Boolean(settings.smtpSecure),
      auth: settings.smtpUser
        ? {
            user: settings.smtpUser,
            pass: settings.smtpPassword || undefined,
          }
        : undefined,
    });

    await transporter.sendMail({
      from: settings.fromName
        ? `"${settings.fromName}" <${settings.fromEmail}>`
        : settings.fromEmail,
      to: cleanRecipients.join(", "),
      subject: renderedEmail.subject,
      text: renderedEmail.body,
    });

    return {
      ok: true,
      message: `Email sent to ${cleanRecipients.join(", ")}`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown email error.",
    };
  }
}
