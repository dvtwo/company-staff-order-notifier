import { prisma } from "../db.server";
import { parseRecipientEmails } from "./recipients";

export { parseRecipientEmails };

export async function getFallbackRecipients(
  shop,
  companyId,
  companyLocationId,
  companyName,
  companyLocationName,
) {
  const filters = [
    companyLocationId ? { companyLocationId } : null,
    companyId ? { companyId, companyLocationId: null } : null,
    companyLocationName
      ? {
          companyName: companyName || "",
          companyLocationName,
        }
      : null,
    companyName
      ? {
          companyName,
          companyLocationName: null,
        }
      : null,
  ].filter(Boolean);

  if (!filters.length) {
    return [];
  }

  const mappings = await prisma.companyRecipientMapping.findMany({
    where: {
      shop,
      enabled: true,
      OR: filters,
    },
    orderBy: [{ companyLocationId: "desc" }, { updatedAt: "desc" }],
  });

  const recipients = mappings.flatMap((mapping) =>
    parseRecipientEmails(mapping.recipientEmails),
  );

  return [...new Set(recipients)];
}
