import { json } from "@remix-run/node";
import { NavMenu } from "@shopify/app-bridge-react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import { Outlet, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
  });
};

export default function AppLayout() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey} i18n={polarisTranslations}>
      <NavMenu>
        <a href="/app">Dashboard</a>
        <a href="/app/settings">Settings</a>
        <a href="/app/mappings">Company mappings</a>
        <a href="/app/logs">Logs</a>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}
