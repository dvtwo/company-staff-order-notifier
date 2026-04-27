import { prisma } from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  if (topic === "APP_UNINSTALLED" && shop) {
    await Promise.all([
      prisma.session.deleteMany({
        where: { shop },
      }),
      prisma.notificationSetting.deleteMany({
        where: { shop },
      }),
      prisma.companyRecipientMapping.deleteMany({
        where: { shop },
      }),
      prisma.notificationLog.deleteMany({
        where: { shop },
      }),
    ]);
  }

  return new Response(null, { status: 200 });
};
