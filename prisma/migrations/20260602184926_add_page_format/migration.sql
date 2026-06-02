-- CreateTable
CREATE TABLE "PageFormat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "widthMm" REAL NOT NULL,
    "heightMm" REAL NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'CUSTOM',
    "isPreset" BOOLEAN NOT NULL DEFAULT false
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PrintItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "templateId" INTEGER,
    "pageFormatId" INTEGER,
    "name" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "css" TEXT NOT NULL,
    "assetLinks" TEXT NOT NULL DEFAULT '[]',
    "exportSettings" TEXT NOT NULL DEFAULT '{}',
    "miscText" TEXT NOT NULL DEFAULT '{}',
    "thumbnailUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrintItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PrintProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrintItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PrintTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PrintItem_pageFormatId_fkey" FOREIGN KEY ("pageFormatId") REFERENCES "PageFormat" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PrintItem" ("assetLinks", "createdAt", "css", "exportSettings", "html", "id", "miscText", "name", "projectId", "templateId", "thumbnailUrl", "updatedAt", "version") SELECT "assetLinks", "createdAt", "css", "exportSettings", "html", "id", "miscText", "name", "projectId", "templateId", "thumbnailUrl", "updatedAt", "version" FROM "PrintItem";
DROP TABLE "PrintItem";
ALTER TABLE "new_PrintItem" RENAME TO "PrintItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PageFormat_name_widthMm_heightMm_key" ON "PageFormat"("name", "widthMm", "heightMm");
