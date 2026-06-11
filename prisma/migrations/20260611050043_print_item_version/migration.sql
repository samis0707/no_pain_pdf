-- CreateTable
CREATE TABLE "PrintItemVersion" (
    "id" SERIAL NOT NULL,
    "printItemId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "html" TEXT NOT NULL,
    "css" TEXT NOT NULL,
    "miscText" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintItemVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintItemVersion_printItemId_version_key" ON "PrintItemVersion"("printItemId", "version");

-- AddForeignKey
ALTER TABLE "PrintItemVersion" ADD CONSTRAINT "PrintItemVersion_printItemId_fkey" FOREIGN KEY ("printItemId") REFERENCES "PrintItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
