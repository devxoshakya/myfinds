ALTER TABLE "Report"
ADD COLUMN "statusTokenHash" TEXT;

CREATE UNIQUE INDEX "Report_statusTokenHash_key"
ON "Report"("statusTokenHash");
