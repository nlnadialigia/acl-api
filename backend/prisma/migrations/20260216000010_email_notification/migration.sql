/*
  Warnings:

  - A unique constraint covering the columns `[userId,pluginId]` on the table `plugin_permissions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "plugin_permissions_userId_pluginId_idx";

-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plugin_permissions_userId_pluginId_key" ON "plugin_permissions"("userId", "pluginId");
