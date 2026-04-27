import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (shop) {
    return redirect(`/app?shop=${encodeURIComponent(shop)}`);
  }

  return new Response(
    "Company Staff Order Notifier is a Shopify embedded app. Open it from Shopify admin or include a ?shop= parameter.",
    { status: 200, headers: { "Content-Type": "text/plain" } },
  );
};
