import { Link, useLocation, useNavigation } from "@remix-run/react";

const TABS = [
  { id: "dashboard", content: "Dashboard", url: "/app" },
  { id: "settings", content: "Settings", url: "/app/settings" },
  { id: "mappings", content: "Company mappings", url: "/app/mappings" },
  { id: "logs", content: "Logs", url: "/app/logs" },
];

export function AppTabs() {
  const location = useLocation();
  const navigation = useNavigation();
  const navigatingTo = navigation.state === "loading" ? navigation.location?.pathname : null;

  const isActive = (tab) => {
    // If navigating, show destination tab as active immediately
    const effectivePath = navigatingTo ?? location.pathname;
    if (tab.url === "/app") {
      return effectivePath === "/app" || effectivePath === "/app/";
    }
    return effectivePath.startsWith(tab.url);
  };

  const isLoading = (tab) => {
    if (!navigatingTo) return false;
    if (tab.url === "/app") return navigatingTo === "/app" || navigatingTo === "/app/";
    return navigatingTo.startsWith(tab.url);
  };

  return (
    <div style={{ borderBottom: "1px solid #e1e3e5", marginBottom: "4px" }}>
      <div style={{ display: "flex", gap: "0" }}>
        {TABS.map((tab) => {
          const active = isActive(tab);
          const loading = isLoading(tab);
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
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {tab.content}
              {loading && (
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    border: "2px solid #e1e3e5",
                    borderTopColor: "#202223",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "tab-spin 0.7s linear infinite",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
      <style>{`@keyframes tab-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
