import { prisma } from "../db.server";
import { authenticate } from "../shopify.server";
import { sendOrderNotificationEmail } from "../utils/email.server";
import { getNotificationSetting } from "../utils/notificationSettings.server";
import { getFallbackRecipients, parseRecipientEmails } from "../utils/recipients.server";
import {
  getCompanyLocationAssignedStaff,
  getOrderDetails,
} from "../utils/shopifyQueries.server";
import { renderOrderNotification } from "../utils/templates.server";

export const action = async ({ request }) => {
  const { admin, payload, shop, topic } = await authenticate.webhook(request);

  if (topic !== "ORDERS_CREATE" || !shop) {
    return new Response(null, { status: 200 });
  }

  const orderIdFromPayload = payload?.admin_graphql_api_id
    ? String(payload.admin_graphql_api_id)
    : payload?.id
      ? `gid://shopify/Order/${payload.id}`
      : null;

  if (!orderIdFromPayload) {
    await prisma.notificationLog.create({
      data: {
        shop,
        orderId: "unknown",
        status: "failed",
        message: "Webhook payload did not include an order ID.",
      },
    });
    return new Response(null, { status: 200 });
  }

  try {
    const settings = await getNotificationSetting(shop);

    if (!settings.enabled) {
      await prisma.notificationLog.create({
        data: {
          shop,
          orderId: orderIdFromPayload,
          status: "skipped",
          message: "Notifications are disabled.",
        },
      });
      return new Response(null, { status: 200 });
    }

    if (!admin) {
      await prisma.notificationLog.create({
        data: {
          shop,
          orderId: orderIdFromPayload,
          status: "failed",
          message: "Webhook session did not include an admin client.",
        },
      });
      return new Response(null, { status: 200 });
    }

    const order = await getOrderDetails(admin, orderIdFromPayload);

    if (!order) {
      await prisma.notificationLog.create({
        data: {
          shop,
          orderId: orderIdFromPayload,
          status: "failed",
          message: "Order lookup returned no data.",
        },
      });
      return new Response(null, { status: 200 });
    }

    const assignedStaffRecipients = parseRecipientEmails(
      (
        await getCompanyLocationAssignedStaff(admin, order.companyLocationId)
      ).join(","),
    );

    const fallbackRecipients =
      assignedStaffRecipients.length > 0
        ? []
        : await getFallbackRecipients(
            shop,
            order.companyId,
            order.companyLocationId,
            order.companyName,
            order.companyLocationName,
          );

    const recipients = [...new Set([...assignedStaffRecipients, ...fallbackRecipients])];

    if (!recipients.length) {
      await prisma.notificationLog.create({
        data: {
          shop,
          orderId: order.id,
          orderName: order.name,
          companyId: order.companyId,
          companyName: order.companyName,
          companyLocationId: order.companyLocationId,
          companyLocationName: order.companyLocationName,
          status: "no_recipients",
          message: "No assigned staff emails or fallback mapping recipients were found.",
        },
      });
      return new Response(null, { status: 200 });
    }

    const renderedEmail = renderOrderNotification({
      settings,
      recipients,
      order: {
        ...order,
        adminUrl: `https://${shop}/admin/orders/${order.legacyResourceId}`,
      },
    });

    const emailResult = await sendOrderNotificationEmail(
      settings,
      recipients,
      renderedEmail,
    );

    await prisma.notificationLog.create({
      data: {
        shop,
        orderId: order.id,
        orderName: order.name,
        companyId: order.companyId,
        companyName: order.companyName,
        companyLocationId: order.companyLocationId,
        companyLocationName: order.companyLocationName,
        recipients: recipients.join(", "),
        status: emailResult.ok ? "sent" : "failed",
        message: emailResult.message,
      },
    });
  } catch (error) {
    await prisma.notificationLog.create({
      data: {
        shop,
        orderId: orderIdFromPayload,
        status: "failed",
        message: error instanceof Error ? error.message : "Unexpected webhook error.",
      },
    });
  }

  return new Response(null, { status: 200 });
};
