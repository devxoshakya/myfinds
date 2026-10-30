import { Button } from "@myfinds/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";

import DocPage, { DocSection } from "@/components/doc-page";

export const metadata: Metadata = {
  title: "Help",
};

export default function HelpPage() {
  return (
    <DocPage
      eyebrow="Help"
      title="How MyFinds works"
      intro="Short answers about reporting, matching, and collecting an item."
    >
      <DocSection title="I lost something">
        <p>
          Report the item with as much detail as you can: category, color, brand, place, and date.
          Matching only compares items in the same category and city, so the details matter.
        </p>
        <p>
          You will see possible matches on the report page. Open a match to compare it against your
          report before you start a claim.
        </p>
      </DocSection>

      <DocSection title="I found something">
        <p>
          Choose whether you keep the item or hand it to a station. If you keep it, set one or two
          questions only the owner could answer. If you hand it in, station staff confirm receipt
          and manage custody from there.
        </p>
        <p>
          Never type card numbers, passport details, or ID numbers into a report. Remove or hide
          identity details in photos before you upload them.
        </p>
      </DocSection>

      <DocSection title="Claims and handover codes">
        <p>
          A claim is one attempt. You get three attempts per match, and the match locks after the
          third rejection. On approval you receive a 6-digit handover code that expires after 48
          hours.
        </p>
        <p>
          For a station handover, bring a government ID and the code. Staff record the type of ID,
          never the number.
        </p>
      </DocSection>

      <DocSection title="Station staff accounts">
        <p>
          Staff accounts are created by an admin and linked to one or more stations. There is no
          self sign-up for staff.
        </p>
        <div className="pt-2">
          <Button variant="outline" className="h-11 border-foreground" render={<Link href="/login" />} nativeButton={false}>
            Station staff log in
          </Button>
        </div>
      </DocSection>
    </DocPage>
  );
}
