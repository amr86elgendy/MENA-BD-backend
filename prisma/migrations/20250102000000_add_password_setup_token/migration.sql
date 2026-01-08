-- AlterTable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordSetupToken" TEXT,
ADD COLUMN "passwordSetupTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordSetupToken_key" ON "User"("passwordSetupToken");

-- CreateIndex
CREATE INDEX "User_passwordSetupToken_idx" ON "User"("passwordSetupToken");

