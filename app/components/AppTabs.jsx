import { Tabs } from "@shopify/polaris";
import { useLocation, useNavigate } from "@remix-run/react";

const TABS = [
  { id: "dashboard", content: "Dashboard", url: "/app" },
  { id: "settings", content: "Settings", url: "/app/settings" },
  { id: "mappings", content: "Company mappings", url: "/app/mappings" },
  { id: "logs", content: "Logs", url: "/app/logs" },
];

export function AppTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const selected = Math.max(
    TABS.findIndex((tab) => tab.url === location.pathname),
    0,
  );

  return (
    <Tabs
      tabs={TABS}
      selected={selected}
      onSelect={(index) => navigate(TABS[index].url)}
    />
  );
}
