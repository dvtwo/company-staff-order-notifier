import {
  DEFAULT_EMAIL_BODY_TEMPLATE,
  DEFAULT_EMAIL_SUBJECT_TEMPLATE,
} from "./templateConstants";

export { DEFAULT_EMAIL_BODY_TEMPLATE, DEFAULT_EMAIL_SUBJECT_TEMPLATE };

export function buildLineItemsSummary(lineItems = []) {
  if (!lineItems.length) {
    return "No line items available.";
  }

  return lineItems
    .map((item) => {
      const parts = [`- ${item.name || "Unnamed item"}`, `qty ${item.quantity || 0}`];
      if (item.sku) {
        parts.push(`sku ${item.sku}`);
      }
      if (item.originalTotal) {
        parts.push(item.originalTotal);
      }
      return parts.join(" | ");
    })
    .join("\n");
}

export function renderTemplate(template, variables) {
  return (template || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return variables[key] ?? "";
  });
}

export function renderOrderNotification({ settings, order, recipients }) {
  const variables = {
    orderName: order.name || "",
    customerName: order.customerName || "",
    companyName: order.companyName || "Company",
    companyLocationName: order.companyLocationName || "",
    orderTotal: order.totalPrice || "",
    orderAdminUrl: order.adminUrl || "",
    lineItems: buildLineItemsSummary(order.lineItems),
    recipients: recipients.join(", "),
  };

  const subject = renderTemplate(
    settings.emailSubjectTemplate || DEFAULT_EMAIL_SUBJECT_TEMPLATE,
    variables,
  );
  const body = renderTemplate(
    settings.emailBodyTemplate || DEFAULT_EMAIL_BODY_TEMPLATE,
    variables,
  );

  return { subject, body, variables };
}
