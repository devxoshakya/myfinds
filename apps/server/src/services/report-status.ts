import { createHash, timingSafeEqual } from "node:crypto";
import type { Database } from "@myfinds/db";

export async function lookupReportStatus(database: Database, token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const report = await database.report.findUnique({
    where: { statusTokenHash: tokenHash },
    select: {
      number: true,
      statusTokenHash: true,
      category: true,
      status: true,
      eventDate: true,
      history: {
        orderBy: { createdAt: "asc" },
        select: { toStatus: true, createdAt: true },
      },
    },
  });

  if (!report?.statusTokenHash) return null;
  const storedHash = Buffer.from(report.statusTokenHash, "hex");
  const incomingHash = Buffer.from(tokenHash, "hex");
  if (storedHash.length !== incomingHash.length || !timingSafeEqual(storedHash, incomingHash)) {
    return null;
  }

  return {
    reportNumber: `MF-${report.number}`,
    category: report.category,
    status: report.status,
    eventDate: report.eventDate.toISOString().slice(0, 10),
    timeline: report.history.flatMap((entry) =>
      entry.toStatus
        ? [{ status: entry.toStatus, date: entry.createdAt.toISOString() }]
        : [],
    ),
  };
}
