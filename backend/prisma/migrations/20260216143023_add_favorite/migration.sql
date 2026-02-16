-- CreateTable
CREATE TABLE "user_plugin_favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_plugin_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_plugin_favorites_userId_pluginId_key" ON "user_plugin_favorites"("userId", "pluginId");

-- AddForeignKey
ALTER TABLE "user_plugin_favorites" ADD CONSTRAINT "user_plugin_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plugin_favorites" ADD CONSTRAINT "user_plugin_favorites_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
