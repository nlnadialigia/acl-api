/*
  Warnings:

  - A unique constraint covering the columns `[userId,pluginId,scopeType,scopeId]` on the table `plugin_permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `roleId` to the `access_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `plugin_permissions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "plugin_permissions_userId_pluginId_key";

-- AlterTable
ALTER TABLE "access_requests" ADD COLUMN     "roleId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "plugin_permissions" ADD COLUMN     "roleId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "plugin_permission_definitions" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_permission_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_roles" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RoleToDefinition" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RoleToDefinition_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "plugin_permission_definitions_pluginId_name_key" ON "plugin_permission_definitions"("pluginId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_roles_pluginId_name_key" ON "plugin_roles"("pluginId", "name");

-- CreateIndex
CREATE INDEX "_RoleToDefinition_B_index" ON "_RoleToDefinition"("B");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_permissions_userId_pluginId_scopeType_scopeId_key" ON "plugin_permissions"("userId", "pluginId", "scopeType", "scopeId");

-- AddForeignKey
ALTER TABLE "plugin_permission_definitions" ADD CONSTRAINT "plugin_permission_definitions_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_roles" ADD CONSTRAINT "plugin_roles_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_permissions" ADD CONSTRAINT "plugin_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "plugin_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "plugin_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoleToDefinition" ADD CONSTRAINT "_RoleToDefinition_A_fkey" FOREIGN KEY ("A") REFERENCES "plugin_permission_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoleToDefinition" ADD CONSTRAINT "_RoleToDefinition_B_fkey" FOREIGN KEY ("B") REFERENCES "plugin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
