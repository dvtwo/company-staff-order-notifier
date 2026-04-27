import { json } from "@remix-run/node";
import {
  Badge,
  BlockStack,
  Card,
  DataTable,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import { AppTabs } from "../components/AppTabs";
import { prisma } from "../db.server";
import { authenticate } from "../shopify.server";
import { getNotificationSetting } from "../utils/notificationSettings.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [settings, recentLogs, groupedCounts] = await Promise.all([
    getNotificationSetting(shop),
    prisma.notificationLog.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.notificationLog.groupBy({
      by: ["status"],
      where: { shop },
      _count: { status: true },
    }),
  ]);

  const counts = groupedCounts.reduce(
    (accumulator, item) => {
      accumulator[item.status] = item._count.status;
      return accumulator;
    },
    { sent: 0, failed: 0, no_recipients: 0 },
  );

  return json({
    settings: {
      enabled: settings.enabled,
    },
    counts,
    recentLogs,
  });
};

function statusTone(status) {
  if (status === "sent") return "success";
  if (status === "failed") return "critical";
  if (status === "no_recipients") return "warning";
  return "info";
}

export default function DashboardPage() {
  const { settings, counts, recentLogs } = useLoaderData();

  return (
    <Page title="Company Staff Order Notifier">
      <BlockStack gap="500">
        <AppTabs />
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    App status
                  </Text>
                  <Badge tone={settings.enabled ? "success" : "critical"}>
                    {settings.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </InlineStack>
                <InlineStack gap="400" wrap>
                  <Card>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Sent
                      </Text>
                      <Text as="p" variant="headingLg">
                        {counts.sent || 0}
                      </Text>
                    </BlockStack>
                  </Card>
                  <Card>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Failed
                      </Text>
                      <Text as="p" variant="headingLg">
                        {counts.failed || 0}
                      </Text>
                    </BlockStack>
                  </Card>
                  <Card>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">
                        No recipients
                      </Text>
                      <Text as="p" variant="headingLg">
                        {counts.no_recipients || 0}
                      </Text>
                    </BlockStack>
                  </Card>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Last 10 notification logs
                </Text>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text"]}
                  headings={["Order", "Company", "Recipients", "Status", "Created"]}
                  rows={recentLogs.map((log) => [
                    log.orderName || log.orderId,
                    log.companyName || "N/A",
                    log.recipients || "N/A",
                    <Badge key={log.id} tone={statusTone(log.status)}>
                      {log.status}
                    </Badge>,
                    new Date(log.createdAt).toLocaleString(),
                  ])}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
