import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { parseRecipientEmails } from "../utils/recipients";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const file = formData.get("csv");

  if (!file || typeof file === "string") {
    return json({ ok: false, message: "No file uploaded." }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    return json({ ok: false, message: "CSV is empty or missing data rows." }, { status: 400 });
  }

  // Parse header row to find column indices
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const locationIdCol = headers.indexOf("location_id");
  const companyNameCol = headers.indexOf("company_name");
  const locationNameCol = headers.indexOf("location_name");
  const emailsCol = headers.indexOf("recipient_emails");

  if (locationIdCol === -1 || emailsCol === -1) {
    return json(
      { ok: false, message: 'CSV must have "location_id" and "recipient_emails" columns.' },
      { status: 400 },
    );
  }

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const locationId = cols[locationIdCol]?.trim();
    const rawEmails = cols[emailsCol]?.trim() || "";
    const companyName = companyNameCol !== -1 ? (cols[companyNameCol]?.trim() || "") : "";
    const locationName = locationNameCol !== -1 ? (cols[locationNameCol]?.trim() || null) : null;

    if (!locationId) {
      skipped++;
      continue;
    }

    const recipientEmails = parseRecipientEmails(rawEmails).join(", ");

    if (!recipientEmails) {
      // Empty emails — remove mapping if it exists
      await prisma.companyRecipientMapping.deleteMany({
        where: { shop, companyLocationId: locationId },
      });
      skipped++;
      continue;
    }

    const existing = await prisma.companyRecipientMapping.findFirst({
      where: { shop, companyLocationId: locationId },
    });

    if (existing) {
      await prisma.companyRecipientMapping.update({
        where: { id: existing.id },
        data: { recipientEmails, companyName, companyLocationName: locationName, enabled: true },
      });
    } else {
      await prisma.companyRecipientMapping.create({
        data: {
          shop,
          companyLocationId: locationId,
          companyName,
          companyLocationName: locationName,
          recipientEmails,
          enabled: true,
        },
      });
    }

    imported++;
  }

  return redirect(`/app/mappings?imported=${imported}&skipped=${skipped}`);
};

// Simple CSV line parser that handles quoted fields
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
