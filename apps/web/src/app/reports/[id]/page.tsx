import type { Metadata } from "next";

import ReportDetailClient from "./report-detail-client";

export const metadata: Metadata = {
  title: "Report status",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  return <ReportDetailClient id={id} />;
}
