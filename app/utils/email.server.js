import nodemailer from "nodemailer";
import { parseRecipientEmails } from "./recipients";

async function sendViaSmtp(settings, cleanRecipients, renderedEmail) {
  if (!settings.smtpHost || !settings.smtpPort || !settings.fromEmail) {
    return {
      ok: false,
      message: "SMTP host, SMTP port, and from email are required.",
    };
  }

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
}

async function getGraphAccessToken(settings) {
  const tenantId = settings.graphTenantId;
  const clientId = settings.graphClientId;
  const clientSecret = settings.graphClientSecret;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Graph tenant ID, client ID, and client secret are required.");
  }

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Graph token request failed: ${errorText}`);
  }

  const tokenJson = await tokenResponse.json();
  if (!tokenJson.access_token) {
    throw new Error("Graph token response did not include an access token.");
  }

  return tokenJson.access_token;
}

async function sendViaMicrosoftGraph(settings, cleanRecipients, renderedEmail) {
  const senderEmail = settings.graphSenderEmail || settings.fromEmail;
  if (!senderEmail) {
    return {
      ok: false,
      message: "A sender email is required for Microsoft Graph.",
    };
  }

  const accessToken = await getGraphAccessToken(settings);
  const graphResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: renderedEmail.subject,
          body: {
            contentType: "Text",
            content: renderedEmail.body,
          },
          from: {
            emailAddress: {
              address: senderEmail,
              name: settings.fromName || undefined,
            },
          },
          toRecipients: cleanRecipients.map((address) => ({
            emailAddress: { address },
          })),
        },
        saveToSentItems: true,
      }),
    },
  );

  if (!graphResponse.ok) {
    const errorText = await graphResponse.text();
    throw new Error(`Graph sendMail failed: ${errorText}`);
  }

  return {
    ok: true,
    message: `Email sent to ${cleanRecipients.join(", ")} using Microsoft Graph`,
  };
}

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
    if (settings.emailProvider === "graph") {
      return await sendViaMicrosoftGraph(settings, cleanRecipients, renderedEmail);
    }

    return await sendViaSmtp(settings, cleanRecipients, renderedEmail);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown email error.",
    };
  }
}
