import type { Metadata } from "next";

import DocPage, { DocSection } from "@/components/doc-page";

export const metadata: Metadata = {
  title: "Terms",
};

export default function TermsPage() {
  return (
    <DocPage
      eyebrow="Terms"
      title="Using MyFinds"
      intro="The rules that keep the custody chain trustworthy for owners, finders, and stations."
    >
      <DocSection title="Accurate reports">
        <p>
          Report only items you lost or found. Do not include card numbers, passport details, or ID
          numbers in a description or photo.
        </p>
        <p>
          Claim an item only if it is yours. Three rejected claims lock the match, and only station
          staff or an admin can unlock it.
        </p>
      </DocSection>

      <DocSection title="Custody">
        <p>
          Whoever holds a found item decides who receives it. When an item is handed to a station,
          that station is responsible for it until handover.
        </p>
        <p>
          Handover codes are single-use and expire after 48 hours. Reissuing a code invalidates the
          previous one.
        </p>
      </DocSection>

      <DocSection title="No public browsing">
        <p>
          Found items are not a public catalogue. A found report is visible only to its reporter,
          station staff, admins, and the owner of a lost report with an active match.
        </p>
      </DocSection>

      <DocSection title="Expiry">
        <p>
          Reports expire 60 days after they are created unless they are verified or returned.
          Unclaimed items after expiry follow the station's own policy.
        </p>
      </DocSection>
    </DocPage>
  );
}
