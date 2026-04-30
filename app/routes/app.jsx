import { json } from "@remix-run/node";
import { Outlet, useLoaderData, useNavigation } from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function AppLayout() {
  const { apiKey } = useLoaderData();
  const navigation = useNavigation();
  const isNavigating = navigation.state === "loading";

  return (
    <AppProvider apiKey={apiKey} isEmbeddedApp>
      {isNavigating && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            zIndex: 9999,
            background: "#e1e3e5",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "#2c6ecb",
              animation: "loading-bar 1.2s ease-in-out infinite",
            }}
          />
          <style>{`
            @keyframes loading-bar {
              0%   { width: 0%;   margin-left: 0%; }
              50%  { width: 60%;  margin-left: 20%; }
              100% { width: 0%;   margin-left: 100%; }
            }
          `}</style>
        </div>
      )}
      <Outlet />
    </AppProvider>
  );
}
