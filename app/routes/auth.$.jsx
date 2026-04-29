import {
  addDocumentResponseHeaders,
  authenticate,
} from "../shopify.server";

function htmlResponse(request, body) {
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
  });
  addDocumentResponseHeaders(request, headers);
  return new Response(body, { headers });
}

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  if (url.pathname === "/auth/session-token") {
    const reloadUrl = url.searchParams.get("shopify-reload") || "";
    return htmlResponse(
      request,
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="shopify-api-key" content="${apiKey}" />
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  </head>
  <body>
    <script>
      (async function () {
        try {
          const reloadUrl = ${JSON.stringify(reloadUrl)};
          if (!reloadUrl) {
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
          const target = new URL(reloadUrl);
          target.searchParams.set("id_token", token);
          window.location.replace(target.toString());
        } catch (error) {
          console.error(error);
          document.body.textContent = "Session token bootstrap failed.";
        }
      })();
    </script>
  </body>
</html>`,
    );
  }

  if (url.pathname === "/auth/exit-iframe") {
    const exitTarget = url.searchParams.get("exitIframe") || "";
    return htmlResponse(
      request,
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="shopify-api-key" content="${apiKey}" />
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  </head>
  <body>
    <script>
      const exitTarget = ${JSON.stringify(exitTarget)};
      if (exitTarget) {
        window.open(exitTarget, "_top");
      } else {
        document.body.textContent = "Missing exit iframe target.";
      }
    </script>
  </body>
</html>`,
    );
  }

  await authenticate.admin(request);
  return null;
};

export const action = loader;
