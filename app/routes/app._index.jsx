import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Box,
  Card,
  Divider,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { AppTabs } from "../components/AppTabs";
import { prisma } from "../db.server";
import { authenticate } from "../shopify.server";
import { getNotificationSetting } from "../utils/notificationSettings.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [settings, recentLogs, groupedCounts, mappingCount] = await Promise.all([
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
    prisma.companyRecipientMapping.count({ where: { shop } }),
  ]);

  const counts = groupedCounts.reduce(
    (acc, item) => { acc[item.status] = item._count.status; return acc; },
    { sent: 0, failed: 0, no_recipients: 0 },
  );

  return json({ settings: { enabled: settings.enabled }, counts, recentLogs, mappingCount });
};

function statusTone(status) {
  if (status === "sent") return "success";
  if (status === "failed") return "critical";
  if (status === "no_recipients") return "warning";
  return "info";
}

function statusLabel(status) {
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  if (status === "no_recipients") return "No recipients";
  return status;
}

function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { settings, counts, recentLogs, mappingCount } = useLoaderData();
  const total = (counts.sent || 0) + (counts.failed || 0) + (counts.no_recipients || 0);

  return (
    <Page title="Dashboard">
      <BlockStack gap="500">
        <AppTabs />

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">

              {/* Status + stat cards */}
              <InlineStack gap="400" wrap>
                <Box minWidth="180px" flex="1">
                  <Card>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">Status</Text>
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone={settings.enabled ? "success" : "critical"}>
                          {settings.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                </Box>
                <Box minWidth="180px" flex="1">
                  <Card>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">Notifications sent</Text>
                      <Text as="p" variant="headingLg">{counts.sent || 0}</Text>
                    </BlockStack>
                  </Card>
                </Box>
                <Box minWidth="180px" flex="1">
                  <Card>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">Failed</Text>
                      <Text as="p" variant="headingLg" tone={counts.failed > 0 ? "critical" : undefined}>
                        {counts.failed || 0}
                      </Text>
                    </BlockStack>
                  </Card>
                </Box>
                <Box minWidth="180px" flex="1">
                  <Card>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">No recipients</Text>
                      <Text as="p" variant="headingLg" tone={counts.no_recipients > 0 ? "caution" : undefined}>
                        {counts.no_recipients || 0}
                      </Text>
                    </BlockStack>
                  </Card>
                </Box>
                <Box minWidth="180px" flex="1">
                  <Card>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">Company mappings</Text>
                      <Text as="p" variant="headingLg">{mappingCount}</Text>
                    </BlockStack>
                  </Card>
                </Box>
              </InlineStack>

              {/* Recent activity */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">Recent activity</Text>
                    {total > 0 && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        {total} total notifications
                      </Text>
                    )}
                  </InlineStack>

                  {recentLogs.length === 0 ? (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No notifications sent yet. Orders from B2B companies will appear here.
                    </Text>
                  ) : (
                    <BlockStack gap="0">
                      {recentLogs.map((log, idx) => (
                        <Box key={log.id}>
                          {idx > 0 && <Divider />}
                          <Box paddingBlock="300">
                            <InlineStack align="space-between" blockAlign="start" wrap={false}>
                              <BlockStack gap="100">
                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                                    {log.orderName || log.orderId}
                                  </Text>
                                  <Badge tone={statusTone(log.status)}>
                                    {statusLabel(log.status)}
                                  </Badge>
                                </InlineStack>
                                {(log.companyName || log.companyLocationName) && (
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    {[log.companyName, log.companyLocationName].filter(Boolean).join(" · ")}
                                  </Text>
                                )}
                                {log.recipients && (
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    → {log.recipients}
                                  </Text>
                                )}
                                {log.message && log.status === "failed" && (
                                  <Text as="p" variant="bodySm" tone="critical">
                                    {log.message}
                                  </Text>
                                )}
                              </BlockStack>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {relativeTime(log.createdAt)}
                              </Text>
                            </InlineStack>
                          </Box>
                        </Box>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
