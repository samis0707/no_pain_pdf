-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "image" TEXT,
    "preferences" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintProject" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "html" TEXT NOT NULL,
    "css" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintItem" (
    "id" SERIAL NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageFormat" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "heightMm" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'CUSTOM',
    "isPreset" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PageFormat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSet" (
    "id" SERIAL NOT NULL,
    "printItemId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "rows" TEXT NOT NULL DEFAULT '[]',
    "columns" TEXT NOT NULL DEFAULT '[]',
    "mapping" TEXT NOT NULL DEFAULT '[]',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "printItemId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" TEXT NOT NULL DEFAULT '[]',
    "toolCalls" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "printItemId" INTEGER,
    "userId" INTEGER,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PageFormat_name_widthMm_heightMm_key" ON "PageFormat"("name", "widthMm", "heightMm");

-- CreateIndex
CREATE UNIQUE INDEX "DataSet_printItemId_name_key" ON "DataSet"("printItemId", "name");

-- AddForeignKey
ALTER TABLE "PrintProject" ADD CONSTRAINT "PrintProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintItem" ADD CONSTRAINT "PrintItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PrintProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintItem" ADD CONSTRAINT "PrintItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PrintTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintItem" ADD CONSTRAINT "PrintItem_pageFormatId_fkey" FOREIGN KEY ("pageFormatId") REFERENCES "PageFormat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSet" ADD CONSTRAINT "DataSet_printItemId_fkey" FOREIGN KEY ("printItemId") REFERENCES "PrintItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_printItemId_fkey" FOREIGN KEY ("printItemId") REFERENCES "PrintItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_printItemId_fkey" FOREIGN KEY ("printItemId") REFERENCES "PrintItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
