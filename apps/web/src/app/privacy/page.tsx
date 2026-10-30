import type { Metadata } from "next";

import DocPage, { DocSection } from "@/components/doc-page";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <DocPage
      eyebrow="Privacy"
      title="What we collect and who sees it"
      intro="Contact details and photos stay private until ownership is verified."
    >
      <DocSection title="Contact details">
        <p>
          A report uses the verified phone number and email on your account. No personal contact
          detail is shown to another user before a claim is approved.
        </p>
        <p>
          With finder custody, the owner and finder each see the other's first name and phone after
          approval. With station custody, nobody sees personal contact details.
        </p>
      </DocSection>

      <DocSection title="Photos">
        <p>
          Photos live in a private bucket and are served only through short-lived signed links. Item
          photos on a found report are visible to the finder, station staff, admins, and the owner of
          a lost report with an active match.
        </p>
        <p>
          A private proof photo is never shown to the person claiming the item. Uploads are
          re-encoded in the browser, which strips location data such as GPS.
        </p>
        <p>Photos are deleted 30 days after a report closes.</p>
      </DocSection>

      <DocSection title="Retention">
        <p>
          Reports expire 60 days after they are created unless they are verified or returned.
          Expired reports are read-only.
        </p>
        <p>
          Every status change and every staff or admin action writes an append-only audit record
          that names the actor and the note.
        </p>
      </DocSection>

      <DocSection title="What we never do">
        <p>
          We never publish item photos or names, never sell contact details, and never use item
          photos for matching in the MVP.
        </p>
      </DocSection>
    </DocPage>
  );
}
