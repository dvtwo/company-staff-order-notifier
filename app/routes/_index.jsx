import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const hasShopifyParams =
    url.searchParams.has("shop") ||
    url.searchParams.has("host") ||
    url.searchParams.has("embedded") ||
    url.searchParams.has("id_token") ||
    url.searchParams.has("hmac") ||
    url.searchParams.has("session");

  if (hasShopifyParams) {
    const { redirect } = await authenticate.admin(request);
    return redirect("/app");
  }

  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
};
