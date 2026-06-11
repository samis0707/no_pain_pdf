-- AlterTable
ALTER TABLE "PrintTemplate" ADD COLUMN     "projectId" INTEGER,
ADD COLUMN     "sourceItemId" INTEGER,
ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "PrintTemplate" ADD CONSTRAINT "PrintTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintTemplate" ADD CONSTRAINT "PrintTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PrintProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
