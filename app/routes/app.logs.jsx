import { json } from "@remix-run/node";
import {
  Badge,
  BlockStack,
  Card,
  DataTable,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import { AppTabs } from "../components/AppTabs";
import { prisma } from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const logs = await prisma.notificationLog.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return json({ logs });
};

function statusTone(status) {
  if (status === "sent") return "success";
  if (status === "failed") return "critical";
  if (status === "no_recipients") return "warning";
  return "info";
}

export default function LogsPage() {
  const { logs } = useLoaderData();

  return (
    <Page title="Logs">
      <BlockStack gap="500">
        <AppTabs />
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Recent webhook and email attempts
                </Text>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                  headings={["Order", "Company", "Recipients", "Status", "Message", "Created"]}
                  rows={logs.map((log) => [
                    log.orderName || log.orderId,
                    [log.companyName, log.companyLocationName].filter(Boolean).join(" / ") || "N/A",
                    log.recipients || "N/A",
                    <Badge key={log.id} tone={statusTone(log.status)}>
                      {log.status}
                    </Badge>,
                    log.message || "",
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
