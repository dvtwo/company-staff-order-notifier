import "@shopify/shopify-app-remix/server/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { prisma } from "./db.server";
import {
  DEFAULT_EMAIL_BODY_TEMPLATE,
  DEFAULT_EMAIL_SUBJECT_TEMPLATE,
} from "./utils/templates.server";

const apiVersion = process.env.SHOPIFY_API_VERSION || ApiVersion.April25;
const appUrl = process.env.SHOPIFY_APP_URL || process.env.RENDER_EXTERNAL_URL;

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_API_SECRET_KEY,
  appUrl,
  scopes: (process.env.SCOPES || "").split(",").map((scope) => scope.trim()).filter(Boolean),
  apiVersion,
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app_uninstalled",
    },
    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders_create",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      await shopify.registerWebhooks({ session });
      await prisma.notificationSetting.upsert({
        where: { shop: session.shop },
        update: {},
        create: {
          shop: session.shop,
          emailSubjectTemplate: DEFAULT_EMAIL_SUBJECT_TEMPLATE,
          emailBodyTemplate: DEFAULT_EMAIL_BODY_TEMPLATE,
        },
      });
    },
  },
});

export default shopify;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
