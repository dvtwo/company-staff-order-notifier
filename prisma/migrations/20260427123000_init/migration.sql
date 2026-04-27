-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "emailSubjectTemplate" TEXT NOT NULL DEFAULT 'New order from {{companyName}}: {{orderName}}',
    "emailBodyTemplate" TEXT NOT NULL DEFAULT 'A new order has been placed.

Order: {{orderName}}
Customer: {{customerName}}
Company: {{companyName}}
Location: {{companyLocationName}}
Total: {{orderTotal}}

Items:
{{lineItems}}

View order:
{{orderAdminUrl}}',
    "smtpHost" TEXT,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRecipientMapping" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "companyId" TEXT,
    "companyName" TEXT NOT NULL,
    "companyLocationId" TEXT,
    "companyLocationName" TEXT,
    "recipientEmails" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRecipientMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderName" TEXT,
    "companyId" TEXT,
    "companyName" TEXT,
    "companyLocationId" TEXT,
    "companyLocationName" TEXT,
    "recipients" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_shop_key" ON "NotificationSetting"("shop");

-- CreateIndex
CREATE INDEX "CompanyRecipientMapping_shop_idx" ON "CompanyRecipientMapping"("shop");

-- CreateIndex
CREATE INDEX "CompanyRecipientMapping_shop_companyId_idx" ON "CompanyRecipientMapping"("shop", "companyId");

-- CreateIndex
CREATE INDEX "CompanyRecipientMapping_shop_companyLocationId_idx" ON "CompanyRecipientMapping"("shop", "companyLocationId");

-- CreateIndex
CREATE INDEX "NotificationLog_shop_createdAt_idx" ON "NotificationLog"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_shop_status_idx" ON "NotificationLog"("shop", "status");

