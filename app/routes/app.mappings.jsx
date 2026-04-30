import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Badge,
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
import { getCompaniesWithStaff } from "../utils/shopifyQueries.server";
import { parseRecipientEmails } from "../utils/recipients";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const [companies, mappings] = await Promise.all([
    getCompaniesWithStaff(admin),
    prisma.companyRecipientMapping.findMany({
      where: { shop },
    }),
  ]);

  // Index mappings by companyLocationId for fast lookup
  const mappingByLocationId = Object.fromEntries(
    mappings
      .filter((m) => m.companyLocationId)
      .map((m) => [m.companyLocationId, m]),
  );

  return json({ companies, mappingByLocationId });
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
  const { companies, mappingByLocationId } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";

  return (
    <Page title="Company notifications">
      <BlockStack gap="500">
        <AppTabs />

        {actionData?.message ? (
          <Banner tone={actionData.ok === false ? "critical" : "success"}>
            {actionData.message}
          </Banner>
        ) : null}

        <Banner tone="info">
          Orders from B2B companies are automatically sent to the assigned staff
          member on that company location. Use the fallback emails below for
          locations that don't have an assigned staff member in Shopify.
        </Banner>

        <Layout>
          <Layout.Section>
            {isLoading ? (
              <InlineStack align="center">
                <Spinner size="large" />
              </InlineStack>
            ) : companies.length === 0 ? (
              <Card>
                <Text as="p" variant="bodyMd" tone="subdued">
                  No B2B companies found. Make sure your store has B2B companies
                  set up and the app has the <strong>read_companies</strong> scope.
                </Text>
              </Card>
            ) : (
              <BlockStack gap="400">
                {companies.map((company) => (
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

function LocationRow({ company, location, mapping }) {
  const [editing, setEditing] = useState(false);
  const [fallbackEmails, setFallbackEmails] = useState(
    mapping?.recipientEmails || "",
  );

  const hasAssignedStaff = location.assignedStaff.length > 0;

  return (
    <BlockStack gap="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingSm">
          {location.name}
        </Text>
      </InlineStack>

      {/* Assigned staff from Shopify */}
      <BlockStack gap="100">
        <Text as="p" variant="bodySm" tone="subdued">
          Assigned staff
        </Text>
        {hasAssignedStaff ? (
          <InlineStack gap="200" wrap>
            {location.assignedStaff.map((s) => (
              <Badge key={s.email} tone="success">
                {s.name ? `${s.name} <${s.email}>` : s.email}
              </Badge>
            ))}
          </InlineStack>
        ) : (
          <Text as="p" variant="bodySm" tone="caution">
            No assigned staff — fallback emails will be used if set.
          </Text>
        )}
      </BlockStack>

      {/* Fallback emails */}
      <BlockStack gap="200">
        <Text as="p" variant="bodySm" tone="subdued">
          Fallback emails {hasAssignedStaff ? "(unused while staff is assigned)" : ""}
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
                value={fallbackEmails}
                onChange={setFallbackEmails}
                placeholder="email1@example.com, email2@example.com"
                helpText="Comma-separated. Used only when no staff is assigned."
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
                    setFallbackEmails(mapping?.recipientEmails || "");
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
