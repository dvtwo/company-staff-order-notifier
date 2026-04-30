import { Link, useLocation } from "@remix-run/react";

const TABS = [
  { id: "dashboard", content: "Dashboard", url: "/app" },
  { id: "settings", content: "Settings", url: "/app/settings" },
  { id: "mappings", content: "Company mappings", url: "/app/mappings" },
  { id: "logs", content: "Logs", url: "/app/logs" },
];

export function AppTabs() {
  const location = useLocation();

  const isActive = (tab) => {
    if (tab.url === "/app") {
      return location.pathname === "/app" || location.pathname === "/app/";
    }
    return location.pathname.startsWith(tab.url);
  };

  return (
    <div style={{ borderBottom: "1px solid #e1e3e5", marginBottom: "4px" }}>
      <div style={{ display: "flex", gap: "0" }}>
        {TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.id}
              to={tab.url}
              style={{
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: active ? "600" : "400",
                color: active ? "#202223" : "#6d7175",
                textDecoration: "none",
                borderBottom: active ? "3px solid #202223" : "3px solid transparent",
                marginBottom: "-1px",
                whiteSpace: "nowrap",
              }}
            >
              {tab.content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
