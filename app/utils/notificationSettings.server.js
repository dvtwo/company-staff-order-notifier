import { prisma } from "../db.server";
import {
  DEFAULT_EMAIL_BODY_TEMPLATE,
  DEFAULT_EMAIL_SUBJECT_TEMPLATE,
} from "./templates.server";

export async function getNotificationSetting(shop) {
  const setting = await prisma.notificationSetting.findUnique({
    where: { shop },
  });

  if (setting) {
    return setting;
  }

  return prisma.notificationSetting.create({
    data: {
      shop,
      emailSubjectTemplate: DEFAULT_EMAIL_SUBJECT_TEMPLATE,
      emailBodyTemplate: DEFAULT_EMAIL_BODY_TEMPLATE,
    },
  });
}
