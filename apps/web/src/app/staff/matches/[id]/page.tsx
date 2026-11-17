import type { Metadata } from "next";

import StaffMatchClient from "./staff-match-client";

export const metadata: Metadata = {
  title: "Staff match details",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StaffMatchPage({ params }: PageProps) {
  const { id } = await params;
  return <StaffMatchClient id={id} />;
}
