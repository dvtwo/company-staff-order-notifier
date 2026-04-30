ALTER TABLE "NotificationSetting"
ADD COLUMN "emailProvider" TEXT NOT NULL DEFAULT 'smtp',
ADD COLUMN "graphTenantId" TEXT,
ADD COLUMN "graphClientId" TEXT,
ADD COLUMN "graphClientSecret" TEXT,
ADD COLUMN "graphSenderEmail" TEXT;
