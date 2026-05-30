-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "image" TEXT,
    "preferences" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PrintProject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrintProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrintTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "html" TEXT NOT NULL,
    "css" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PrintItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "templateId" INTEGER,
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
    CONSTRAINT "PrintItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PrintTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataSet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "printItemId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "rows" TEXT NOT NULL DEFAULT '[]',
    "columns" TEXT NOT NULL DEFAULT '[]',
    "mapping" TEXT NOT NULL DEFAULT '[]',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DataSet_printItemId_fkey" FOREIGN KEY ("printItemId") REFERENCES "PrintItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "printItemId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" TEXT NOT NULL DEFAULT '[]',
    "toolCalls" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_printItemId_fkey" FOREIGN KEY ("printItemId") REFERENCES "PrintItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "printItemId" INTEGER,
    "userId" INTEGER,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Asset_printItemId_fkey" FOREIGN KEY ("printItemId") REFERENCES "PrintItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DataSet_printItemId_name_key" ON "DataSet"("printItemId", "name");
