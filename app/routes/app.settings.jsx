import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
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
import { sendOrderNotificationEmail } from "../utils/email.server";
import { getNotificationSetting } from "../utils/notificationSettings.server";
import {
  DEFAULT_EMAIL_BODY_TEMPLATE,
  DEFAULT_EMAIL_SUBJECT_TEMPLATE,
} from "../utils/templateConstants";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await getNotificationSetting(session.shop);

  return json({
    settings: {
      ...settings,
      smtpPassword: undefined,
      hasSmtpPassword: Boolean(settings.smtpPassword),
    },
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "save");

  const nextValues = {
    enabled: formData.get("enabled") === "true",
    fromName: String(formData.get("fromName") || ""),
    fromEmail: String(formData.get("fromEmail") || ""),
    smtpHost: String(formData.get("smtpHost") || ""),
    smtpPort: Number(formData.get("smtpPort") || 587),
    smtpUser: String(formData.get("smtpUser") || ""),
    smtpSecure: formData.get("smtpSecure") === "true",
    emailSubjectTemplate:
      String(formData.get("emailSubjectTemplate") || "") ||
      DEFAULT_EMAIL_SUBJECT_TEMPLATE,
    emailBodyTemplate:
      String(formData.get("emailBodyTemplate") || "") || DEFAULT_EMAIL_BODY_TEMPLATE,
  };

  const newSmtpPassword = String(formData.get("smtpPassword") || "");

  const updatedSettings = await getNotificationSetting(session.shop);

  const persistedSettings = await prisma.notificationSetting.update({
    where: { shop: session.shop },
    data: {
      ...nextValues,
      // Dev-only plain storage is acceptable here. Replace this with encryption
      // before storing SMTP credentials in production.
      smtpPassword: newSmtpPassword || updatedSettings.smtpPassword || null,
    },
  });

  if (intent === "send_test_email") {
    const testRecipient = String(formData.get("testRecipientEmail") || "").trim();

    if (!testRecipient) {
      return json(
        { ok: false, message: "Enter a test recipient email before sending." },
        { status: 400 },
      );
    }

    const result = await sendOrderNotificationEmail(
      persistedSettings,
      [testRecipient],
      {
        subject: "Test notification from Company Staff Order Notifier",
        body: "This is a test email from the Company Staff Order Notifier app.",
      },
    );

    return json(result, { status: result.ok ? 200 : 400 });
  }

  return json({ ok: true, message: "Settings saved." });
};

export default function SettingsPage() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";
  const [enabled, setEnabled] = useState(Boolean(settings.enabled));
  const [smtpSecure, setSmtpSecure] = useState(Boolean(settings.smtpSecure));
  const [fromName, setFromName] = useState(settings.fromName || "");
  const [fromEmail, setFromEmail] = useState(settings.fromEmail || "");
  const [smtpHost, setSmtpHost] = useState(settings.smtpHost || "");
  const [smtpPort, setSmtpPort] = useState(String(settings.smtpPort || 587));
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser || "");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState(
    settings.emailSubjectTemplate || DEFAULT_EMAIL_SUBJECT_TEMPLATE,
  );
  const [emailBodyTemplate, setEmailBodyTemplate] = useState(
    settings.emailBodyTemplate || DEFAULT_EMAIL_BODY_TEMPLATE,
  );
  const [testRecipientEmail, setTestRecipientEmail] = useState("");

  return (
    <Page title="Settings">
      <BlockStack gap="500">
        <AppTabs />
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Notification settings
                </Text>
                {actionData?.message ? (
                  <Banner tone={actionData.ok ? "success" : "critical"}>
                    {actionData.message}
                  </Banner>
                ) : null}
                <Form method="post">
                  <FormLayout>
                    <input
                      type="hidden"
                      name="enabled"
                      value={String(enabled)}
                    />
                    <Checkbox
                      label="Enable notifications"
                      checked={enabled}
                      onChange={setEnabled}
                    />
                    <TextField
                      label="From name"
                      name="fromName"
                      value={fromName}
                      onChange={setFromName}
                      autoComplete="off"
                    />
                    <TextField
                      label="From email"
                      name="fromEmail"
                      type="email"
                      value={fromEmail}
                      onChange={setFromEmail}
                      autoComplete="email"
                    />
                    <TextField
                      label="SMTP host"
                      name="smtpHost"
                      value={smtpHost}
                      onChange={setSmtpHost}
                      autoComplete="off"
                    />
                    <TextField
                      label="SMTP port"
                      name="smtpPort"
                      type="number"
                      value={smtpPort}
                      onChange={setSmtpPort}
                      autoComplete="off"
                    />
                    <TextField
                      label="SMTP username"
                      name="smtpUser"
                      value={smtpUser}
                      onChange={setSmtpUser}
                      autoComplete="username"
                    />
                    <TextField
                      label="SMTP password"
                      name="smtpPassword"
                      type="password"
                      value={smtpPassword}
                      onChange={setSmtpPassword}
                      autoComplete="new-password"
                      helpText={settings.hasSmtpPassword ? "Leave blank to keep the saved password." : "Saved for development in plain text. Add encryption before production."}
                    />
                    <input
                      type="hidden"
                      name="smtpSecure"
                      value={String(smtpSecure)}
                    />
                    <Checkbox
                      label="Use secure SMTP (TLS/SSL)"
                      checked={smtpSecure}
                      onChange={setSmtpSecure}
                    />
                    <TextField
                      label="Email subject template"
                      name="emailSubjectTemplate"
                      value={emailSubjectTemplate}
                      onChange={setEmailSubjectTemplate}
                      autoComplete="off"
                    />
                    <TextField
                      label="Email body template"
                      name="emailBodyTemplate"
                      value={emailBodyTemplate}
                      onChange={setEmailBodyTemplate}
                      multiline={10}
                      autoComplete="off"
                    />
                    <TextField
                      label="Test recipient email"
                      name="testRecipientEmail"
                      value={testRecipientEmail}
                      onChange={setTestRecipientEmail}
                      autoComplete="email"
                      helpText="Used only when you click Send test email."
                    />
                    <InlineStack gap="300">
                      <Button submit loading={isSaving}>
                        Save
                      </Button>
                      <Button submit name="intent" value="send_test_email" variant="secondary">
                        Send test email
                      </Button>
                    </InlineStack>
                  </FormLayout>
                </Form>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
