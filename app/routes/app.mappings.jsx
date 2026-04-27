import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { useState } from "react";
import { AppTabs } from "../components/AppTabs";
import { prisma } from "../db.server";
import { authenticate } from "../shopify.server";
import { parseRecipientEmails } from "../utils/recipients";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const mappings = await prisma.companyRecipientMapping.findMany({
    where: { shop: session.shop },
    orderBy: { updatedAt: "desc" },
  });

  return json({ mappings });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "create");
  const id = String(formData.get("id") || "");

  if (intent === "delete" && id) {
    const existingMapping = await prisma.companyRecipientMapping.findUnique({
      where: { id },
    });

    if (!existingMapping || existingMapping.shop !== session.shop) {
      return json({ ok: false, message: "Mapping not found." }, { status: 404 });
    }

    await prisma.companyRecipientMapping.delete({
      where: { id },
    });
    return redirect("/app/mappings");
  }

  const data = {
    shop: session.shop,
    companyName: String(formData.get("companyName") || ""),
    companyId: String(formData.get("companyId") || "") || null,
    companyLocationName: String(formData.get("companyLocationName") || "") || null,
    companyLocationId: String(formData.get("companyLocationId") || "") || null,
    recipientEmails: parseRecipientEmails(
      String(formData.get("recipientEmails") || ""),
    ).join(", "),
    enabled: formData.get("enabled") === "true",
  };

  if (!data.companyName) {
    return json(
      { ok: false, message: "Company name is required." },
      { status: 400 },
    );
  }

  if (!data.recipientEmails) {
    return json(
      {
        ok: false,
        message: "Enter at least one valid recipient email address.",
      },
      { status: 400 },
    );
  }

  if (intent === "update" && id) {
    const existingMapping = await prisma.companyRecipientMapping.findUnique({
      where: { id },
    });

    if (!existingMapping || existingMapping.shop !== session.shop) {
      return json({ ok: false, message: "Mapping not found." }, { status: 404 });
    }

    await prisma.companyRecipientMapping.update({
      where: { id },
      data,
    });
  } else {
    await prisma.companyRecipientMapping.create({
      data,
    });
  }

  return redirect("/app/mappings");
};

export default function MappingsPage() {
  const { mappings } = useLoaderData();
  const actionData = useActionData();
  const [newMappingEnabled, setNewMappingEnabled] = useState(true);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyId, setNewCompanyId] = useState("");
  const [newCompanyLocationName, setNewCompanyLocationName] = useState("");
  const [newCompanyLocationId, setNewCompanyLocationId] = useState("");
  const [newRecipientEmails, setNewRecipientEmails] = useState("");

  return (
    <Page title="Company mappings">
      <BlockStack gap="500">
        <AppTabs />
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Add mapping
                </Text>
                {actionData?.message ? (
                  <Banner tone={actionData.ok ? "success" : "critical"}>
                    {actionData.message}
                  </Banner>
                ) : null}
                <Form method="post">
                  <FormLayout>
                    <TextField
                      label="Company name"
                      name="companyName"
                      value={newCompanyName}
                      onChange={setNewCompanyName}
                      autoComplete="off"
                    />
                    <TextField
                      label="Company ID"
                      name="companyId"
                      value={newCompanyId}
                      onChange={setNewCompanyId}
                      autoComplete="off"
                    />
                    <TextField
                      label="Company location name"
                      name="companyLocationName"
                      value={newCompanyLocationName}
                      onChange={setNewCompanyLocationName}
                      autoComplete="off"
                    />
                    <TextField
                      label="Company location ID"
                      name="companyLocationId"
                      value={newCompanyLocationId}
                      onChange={setNewCompanyLocationId}
                      autoComplete="off"
                    />
                    <TextField
                      label="Recipient emails"
                      name="recipientEmails"
                      value={newRecipientEmails}
                      onChange={setNewRecipientEmails}
                      autoComplete="off"
                      helpText="Comma-separated email addresses."
                    />
                    <input
                      type="hidden"
                      name="enabled"
                      value={String(newMappingEnabled)}
                    />
                    <Checkbox
                      label="Enabled"
                      checked={newMappingEnabled}
                      onChange={setNewMappingEnabled}
                    />
                    <Button submit>Add mapping</Button>
                  </FormLayout>
                </Form>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Existing mappings
                </Text>
                <BlockStack gap="400">
                  {mappings.map((mapping) => (
                    <Card key={mapping.id}>
                      <EditableMapping mapping={mapping} />
                    </Card>
                  ))}
                  {!mappings.length ? (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No mappings yet.
                    </Text>
                  ) : null}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function EditableMapping({ mapping }) {
  const [enabled, setEnabled] = useState(Boolean(mapping.enabled));
  const [companyName, setCompanyName] = useState(mapping.companyName);
  const [companyId, setCompanyId] = useState(mapping.companyId || "");
  const [companyLocationName, setCompanyLocationName] = useState(
    mapping.companyLocationName || "",
  );
  const [companyLocationId, setCompanyLocationId] = useState(
    mapping.companyLocationId || "",
  );
  const [recipientEmails, setRecipientEmails] = useState(mapping.recipientEmails);

  return (
    <Form method="post">
      <FormLayout>
        <input type="hidden" name="id" value={mapping.id} />
        <TextField
          label="Company name"
          name="companyName"
          value={companyName}
          onChange={setCompanyName}
          autoComplete="off"
        />
        <TextField
          label="Company ID"
          name="companyId"
          value={companyId}
          onChange={setCompanyId}
          autoComplete="off"
        />
        <TextField
          label="Company location name"
          name="companyLocationName"
          value={companyLocationName}
          onChange={setCompanyLocationName}
          autoComplete="off"
        />
        <TextField
          label="Company location ID"
          name="companyLocationId"
          value={companyLocationId}
          onChange={setCompanyLocationId}
          autoComplete="off"
        />
        <TextField
          label="Recipient emails"
          name="recipientEmails"
          value={recipientEmails}
          onChange={setRecipientEmails}
          autoComplete="off"
        />
        <input type="hidden" name="enabled" value={String(enabled)} />
        <Checkbox label="Enabled" checked={enabled} onChange={setEnabled} />
        <InlineStack gap="300">
          <Button submit name="intent" value="update">
            Save changes
          </Button>
          <Button submit name="intent" value="delete" tone="critical" variant="secondary">
            Delete
          </Button>
        </InlineStack>
      </FormLayout>
    </Form>
  );
}
