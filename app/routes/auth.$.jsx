import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  if (url.pathname === "/auth/session-token") {
    const reloadUrl = url.searchParams.get("shopify-reload") || "";
    return json({ mode: "session-token", apiKey, reloadUrl });
  }

  if (url.pathname === "/auth/exit-iframe") {
    const exitTarget = url.searchParams.get("exitIframe") || "";
    return json({ mode: "exit-iframe", apiKey, exitTarget });
  }

  await authenticate.admin(request);
  return null;
};

export default function AuthRoute() {
  const data = useLoaderData();

  if (!data?.mode) {
    return null;
  }

  const script = `
    (function () {
      const data = ${JSON.stringify(data)};

      function setMessage(message) {
        const el = document.getElementById("auth-status");
        if (el) el.textContent = message;
      }

      function ensureMeta() {
        let meta = document.querySelector('meta[name="shopify-api-key"]');
        if (!meta) {
          meta = document.createElement("meta");
          meta.name = "shopify-api-key";
          document.head.appendChild(meta);
        }
        meta.content = data.apiKey || "";
      }

      function loadAppBridge() {
        return new Promise((resolve, reject) => {
          if (window.shopify) {
            resolve();
            return;
          }

          const existing = document.querySelector('script[data-auth-app-bridge="true"]');
          if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("App Bridge failed to load")), { once: true });
            return;
          }

          const script = document.createElement("script");
          script.src = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
          script.dataset.authAppBridge = "true";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("App Bridge failed to load"));
          document.head.appendChild(script);
        });
      }

      async function run() {
        try {
          ensureMeta();
          await loadAppBridge();

          if (data.mode === "exit-iframe") {
            if (!data.exitTarget) {
              throw new Error("Missing exit iframe target");
            }
            window.open(data.exitTarget, "_top");
            return;
          }

          if (data.mode === "session-token") {
            if (!data.reloadUrl) {
              throw new Error("Missing shopify-reload parameter");
            }
            const shopify = window.shopify;
            if (!shopify || typeof shopify.idToken !== "function") {
              throw new Error("Shopify App Bridge did not initialize");
            }
            if (typeof shopify.ready === "function") {
              await shopify.ready();
            }
            const token = await shopify.idToken();
            const target = new URL(data.reloadUrl);
            target.searchParams.set("id_token", token);
            window.location.replace(target.toString());
            return;
          }
        } catch (error) {
          console.error(error);
          setMessage(error instanceof Error ? error.message : "Authentication bootstrap failed");
        }
      }

      setMessage("Authenticating…");
      run();
    })();
  `;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <p id="auth-status">Authenticating...</p>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </div>
  );
}

export const action = loader;
