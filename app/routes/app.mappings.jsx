import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  InlineStack,
  Layout,
  Page,
  Spinner,
  Text,
  TextField,
} from "@shopify/polaris";
import { useState } from "react";
import { AppTabs } from "../components/AppTabs";
import { prisma } from "../db.server";
import { authenticate } from "../shopify.server";
import { getCompaniesWithLocations } from "../utils/shopifyQueries.server";
import { parseRecipientEmails } from "../utils/recipients";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  let companies = [];
  let companiesError = null;

  try {
    companies = await getCompaniesWithLocations(admin);
  } catch (err) {
    companiesError = err.message || "Unknown error fetching companies";
    console.error("[mappings loader] getCompaniesWithStaff error:", err);
  }

  const mappings = await prisma.companyRecipientMapping.findMany({
    where: { shop },
  });

  // Index mappings by companyLocationId for fast lookup
  const mappingByLocationId = Object.fromEntries(
    mappings
      .filter((m) => m.companyLocationId)
      .map((m) => [m.companyLocationId, m]),
  );

  return json({ companies, mappingByLocationId, companiesError });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "upsert");
  const id = String(formData.get("id") || "");

  if (intent === "delete" && id) {
    const existing = await prisma.companyRecipientMapping.findUnique({ where: { id } });
    if (!existing || existing.shop !== shop) {
      return json({ ok: false, message: "Mapping not found." }, { status: 404 });
    }
    await prisma.companyRecipientMapping.delete({ where: { id } });
    return redirect("/app/mappings");
  }

  const companyLocationId = String(formData.get("companyLocationId") || "");
  const companyId = String(formData.get("companyId") || "") || null;
  const companyName = String(formData.get("companyName") || "");
  const companyLocationName = String(formData.get("companyLocationName") || "") || null;
  const recipientEmails = parseRecipientEmails(
    String(formData.get("recipientEmails") || ""),
  ).join(", ");

  if (!companyLocationId) {
    return json({ ok: false, message: "Missing company location." }, { status: 400 });
  }

  const data = {
    shop,
    companyId,
    companyName,
    companyLocationId,
    companyLocationName,
    recipientEmails,
    enabled: true,
  };

  if (id) {
    await prisma.companyRecipientMapping.update({ where: { id }, data });
  } else {
    await prisma.companyRecipientMapping.create({ data });
  }

  return redirect("/app/mappings");
};

export default function MappingsPage() {
  const { companies, mappingByLocationId, companiesError } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const isLoading = navigation.state !== "idle";
  const importedCount = searchParams.get("imported");
  const skippedCount = searchParams.get("skipped");

  const q = query.trim().toLowerCase();
  const filteredCompanies = q
    ? companies
        .map((company) => {
          const nameMatch = company.name.toLowerCase().includes(q);
          const matchedLocations = company.locations.filter(
            (loc) =>
              nameMatch ||
              loc.name.toLowerCase().includes(q) ||
              (mappingByLocationId[loc.id]?.recipientEmails || "")
                .toLowerCase()
                .includes(q),
          );
          return matchedLocations.length > 0
            ? { ...company, locations: matchedLocations }
            : null;
        })
        .filter(Boolean)
    : companies;

  return (
    <Page title="Company notifications">
      <BlockStack gap="500">
        <AppTabs />

        {actionData?.message ? (
          <Banner tone={actionData.ok === false ? "critical" : "success"}>
            {actionData.message}
          </Banner>
        ) : null}

        {importedCount !== null ? (
          <Banner tone="success" onDismiss={() => {}}>
            Import complete — {importedCount} location{importedCount === "1" ? "" : "s"} updated
            {skippedCount > 0 ? `, ${skippedCount} skipped (no email or missing ID)` : ""}.
          </Banner>
        ) : null}

        <Banner tone="info">
          Assign notification emails to each B2B company location. When an order
          is placed from that location, the listed recipients will be notified.
        </Banner>

        <CsvImportExport />

        <Layout>
          <Layout.Section>
            {isLoading ? (
              <InlineStack align="center">
                <Spinner size="large" />
              </InlineStack>
            ) : companiesError ? (
              <Banner tone="critical">
                <Text as="p" variant="bodyMd">
                  <strong>Error loading companies:</strong> {companiesError}
                </Text>
              </Banner>
            ) : companies.length === 0 ? (
              <Card>
                <Text as="p" variant="bodyMd" tone="subdued">
                  No B2B companies found. Make sure your store has B2B companies
                  set up and the app has the <strong>read_companies</strong> scope.
                </Text>
              </Card>
            ) : (
              <BlockStack gap="400">
                <TextField
                  label="Search companies"
                  labelHidden
                  placeholder="Search by company name, location, or email…"
                  value={query}
                  onChange={setQuery}
                  clearButton
                  onClearButtonClick={() => setQuery("")}
                  autoComplete="off"
                  prefix={<span>🔍</span>}
                />
                {filteredCompanies.length === 0 ? (
                  <Card>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No companies match &ldquo;{query}&rdquo;.
                    </Text>
                  </Card>
                ) : null}
                {filteredCompanies.map((company) => (
                  <Card key={company.id}>
                    <BlockStack gap="300">
                      <Text as="h2" variant="headingMd">
                        {company.name}
                      </Text>
                      {company.locations.length === 0 ? (
                        <Text as="p" variant="bodyMd" tone="subdued">
                          No locations.
                        </Text>
                      ) : (
                        <BlockStack gap="400">
                          {company.locations.map((loc, idx) => (
                            <Box key={loc.id}>
                              {idx > 0 && <Divider />}
                              <Box paddingBlockStart={idx > 0 ? "400" : "0"}>
                                <LocationRow
                                  company={company}
                                  location={loc}
                                  mapping={mappingByLocationId[loc.id] || null}
                                  highlight={q}
                                />
                              </Box>
                            </Box>
                          ))}
                        </BlockStack>
                      )}
                    </BlockStack>
                  </Card>
                ))}

              </BlockStack>
            )}
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function CsvImportExport() {
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          Bulk import / export
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          Download the CSV template, fill in the <strong>recipient_emails</strong> column
          (comma-separated), then upload it back to set all mappings at once.
        </Text>
        <InlineStack gap="300" blockAlign="center">
          <Button url="/app/mappings/export" target="_blank">
            Download CSV template
          </Button>
          <Button onClick={() => setImporting((v) => !v)} variant="plain">
            {importing ? "Cancel import" : "Import CSV"}
          </Button>
        </InlineStack>

        {importing && (
          <form
            method="post"
            action="/app/mappings/import"
            encType="multipart/form-data"
            style={{ marginTop: "8px" }}
          >
            <BlockStack gap="200">
              <label
                htmlFor="csv-upload"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  border: "1px dashed #8c9196",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "#2c6ecb",
                  fontSize: "14px",
                }}
              >
                {fileName ? `📄 ${fileName}` : "Choose CSV file…"}
                <input
                  id="csv-upload"
                  type="file"
                  name="csv"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                />
              </label>
              {fileName && (
                <div>
                  <Button submit>Upload and import</Button>
                </div>
              )}
            </BlockStack>
          </form>
        )}
      </BlockStack>
    </Card>
  );
}

function LocationRow({ company, location, mapping }) {
  const [editing, setEditing] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState(
    mapping?.recipientEmails || "",
  );

  return (
    <BlockStack gap="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingSm">
          {location.name}
        </Text>
      </InlineStack>

      <BlockStack gap="200">
        <Text as="p" variant="bodySm" tone="subdued">
          Notification recipients
        </Text>

        {editing ? (
          <Form method="post">
            <input type="hidden" name="companyLocationId" value={location.id} />
            <input type="hidden" name="companyId" value={company.id} />
            <input type="hidden" name="companyName" value={company.name} />
            <input type="hidden" name="companyLocationName" value={location.name} />
            {mapping?.id && <input type="hidden" name="id" value={mapping.id} />}
            <BlockStack gap="200">
              <TextField
                label=""
                labelHidden
                name="recipientEmails"
                value={recipientEmails}
                onChange={setRecipientEmails}
                placeholder="email1@example.com, email2@example.com"
                helpText="Comma-separated list of emails to notify when this location places an order."
                autoComplete="off"
              />
              <InlineStack gap="200">
                <Button submit size="slim">
                  Save
                </Button>
                {mapping?.id && (
                  <Form method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={mapping.id} />
                    <Button submit size="slim" tone="critical" variant="plain">
                      Remove
                    </Button>
                  </Form>
                )}
                <Button
                  size="slim"
                  variant="plain"
                  onClick={() => {
                    setRecipientEmails(mapping?.recipientEmails || "");
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>
        ) : (
          <InlineStack gap="200" blockAlign="center">
            {mapping?.recipientEmails ? (
              <Text as="p" variant="bodySm">
                {mapping.recipientEmails}
              </Text>
            ) : (
              <Text as="p" variant="bodySm" tone="subdued">
                None set
              </Text>
            )}
            <Button size="slim" variant="plain" onClick={() => setEditing(true)}>
              {mapping?.recipientEmails ? "Edit" : "Add"}
            </Button>
          </InlineStack>
        )}
      </BlockStack>
    </BlockStack>
  );
}
