import type { Metadata } from "next";

import MatchesClient from "./matches-client";

export const metadata: Metadata = {
  title: "Possible matches",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MatchesPage({ params }: PageProps) {
  const { id } = await params;
  return <MatchesClient id={id} />;
}
