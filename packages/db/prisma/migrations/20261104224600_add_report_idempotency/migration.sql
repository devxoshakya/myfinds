CREATE TABLE "ReportIdempotency" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "encryptedStatusToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportIdempotency_reporterId_keyHash_key"
ON "ReportIdempotency"("reporterId", "keyHash");

CREATE UNIQUE INDEX "ReportIdempotency_reportId_key"
ON "ReportIdempotency"("reportId");

CREATE INDEX "ReportIdempotency_reporterId_createdAt_idx"
ON "ReportIdempotency"("reporterId", "createdAt");

ALTER TABLE "ReportIdempotency"
ADD CONSTRAINT "ReportIdempotency_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportIdempotency"
ADD CONSTRAINT "ReportIdempotency_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "Report"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
