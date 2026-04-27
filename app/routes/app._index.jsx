import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
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

export default function DashboardPage() {
  const { settings, counts, recentLogs } = useLoaderData();

  return (
    <main style={{ padding: "24px", color: "#111", background: "#fff", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <h1>Company Staff Order Notifier</h1>
      <p>Status: {settings.enabled ? "Enabled" : "Disabled"}</p>
      <p>Sent: {counts.sent || 0}</p>
      <p>Failed: {counts.failed || 0}</p>
      <p>No recipients: {counts.no_recipients || 0}</p>
      <nav style={{ display: "flex", gap: "16px", margin: "16px 0" }}>
        <Link to="/app">Dashboard</Link>
        <Link to="/app/settings">Settings</Link>
        <Link to="/app/mappings">Company mappings</Link>
        <Link to="/app/logs">Logs</Link>
      </nav>
      <h2>Recent logs</h2>
      <ul>
        {recentLogs.map((log) => (
          <li key={log.id}>
            {(log.orderName || log.orderId) + " | " + (log.status || "")}
          </li>
        ))}
      </ul>
    </main>
  );
}
