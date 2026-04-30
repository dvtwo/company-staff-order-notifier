import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { getCompaniesWithLocations } from "../utils/shopifyQueries.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const [companies, mappings] = await Promise.all([
    getCompaniesWithLocations(admin),
    prisma.companyRecipientMapping.findMany({ where: { shop } }),
  ]);

  const mappingByLocationId = Object.fromEntries(
    mappings.filter((m) => m.companyLocationId).map((m) => [m.companyLocationId, m]),
  );

  const rows = [["company_name", "location_name", "location_id", "recipient_emails"]];

  for (const company of companies) {
    for (const loc of company.locations) {
      const mapping = mappingByLocationId[loc.id];
      rows.push([
        csvEscape(company.name),
        csvEscape(loc.name),
        csvEscape(loc.id),
        csvEscape(mapping?.recipientEmails || ""),
      ]);
    }
  }

  const csv = rows.map((r) => r.join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="company-mappings.csv"',
    },
  });
};

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
