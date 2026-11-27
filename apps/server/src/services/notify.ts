import type { Database } from "@myfinds/db";

import { renderClaimApprovedClaimantEmail } from "../emails/claim-approved-claimant";
import { renderClaimApprovedFinderEmail } from "../emails/claim-approved-finder";
import {
  sendEmail,
  type EmailMessage,
  type EmailResult,
} from "./email";
import { createEnvPhotoStorage } from "./photos";

type SendEmail = (message: EmailMessage) => Promise<EmailResult>;

const CLAIMANT_TEMPLATE = "CLAIM_APPROVED_CLAIMANT";
const FINDER_TEMPLATE = "CLAIM_APPROVED_FINDER";

// The photo is private, but email clients fetch images when the message is
// opened, so 5 minutes is too short. One day is still scoped to this email.
const EMAIL_IMAGE_SECONDS = 24 * 60 * 60;

const photoStorage = createEnvPhotoStorage();

export type ClaimApprovedNotification = {
  claimId: string;
  handoverCode: string;
};

/**
 * Emails both sides after a claim approval commits. Never throws: a delivery
 * failure is recorded on the Notification row and the claim stays approved.
 * The handover code is passed in, never regenerated, and never logged.
 */
export async function notifyClaimApproved(
  database: Database,
  { claimId, handoverCode }: ClaimApprovedNotification,
  send: SendEmail = sendEmail,
): Promise<void> {
  try {
    const claim = await database.claim.findUnique({
      where: { id: claimId },
      select: {
        handoverExpiresAt: true,
        match: {
          select: {
            lost: {
              select: {
                id: true,
                placeStation: {
                  select: { name: true, city: { select: { name: true } } },
                },
                reporter: { select: { id: true, name: true, email: true } },
              },
            },
            found: {
              select: {
                id: true,
                number: true,
                title: true,
                category: true,
                eventDate: true,
                custodian: true,
                placeStation: {
                  select: { name: true, city: { select: { name: true } } },
                },
                custodyStation: {
                  select: { name: true, counterHours: true },
                },
                reporter: { select: { id: true, name: true, email: true } },
                photos: {
                  where: { kind: "ITEM", deletedAt: null },
                  orderBy: { position: "asc" },
                  take: 1,
                  select: { r2Key: true },
                },
              },
            },
          },
        },
      },
    });
    if (!claim?.handoverExpiresAt) return;

    const { lost, found } = claim.match;
    const stationCustody = found.custodian === "STATION";
    const imageUrl =
      photoStorage && found.photos[0]
        ? await photoStorage
            .createReadUrl(found.photos[0].r2Key, EMAIL_IMAGE_SECONDS)
            .catch(() => null)
        : null;
    const claimant = renderClaimApprovedClaimantEmail({
      claimantName: lost.reporter.name,
      itemTitle: found.title,
      category: found.category,
      reportNumber: found.number,
      foundStation: found.placeStation.name,
      foundCity: found.placeStation.city.name,
      lostStation: lost.placeStation.name,
      lostCity: lost.placeStation.city.name,
      handoverCode,
      handoverExpiresAt: claim.handoverExpiresAt,
      custodyStationName: stationCustody ? (found.custodyStation?.name ?? null) : null,
      counterHours: stationCustody ? (found.custodyStation?.counterHours ?? null) : null,
      reportId: lost.id,
      imageUrl,
    });
    const finder = renderClaimApprovedFinderEmail({
      finderName: found.reporter.name,
      itemTitle: found.title,
      category: found.category,
      reportNumber: found.number,
      foundStation: found.placeStation.name,
      foundCity: found.placeStation.city.name,
      foundDate: found.eventDate,
      reportId: found.id,
      stationCustody,
      imageUrl,
    });

    await Promise.allSettled([
      deliver(database, send, {
        userId: lost.reporter.id,
        template: CLAIMANT_TEMPLATE,
        message: {
          to: lost.reporter.email,
          ...claimant,
          idempotencyKey: `claim-approved/claimant/${claimId}`,
        },
      }),
      deliver(database, send, {
        userId: found.reporter.id,
        template: FINDER_TEMPLATE,
        message: {
          to: found.reporter.email,
          ...finder,
          idempotencyKey: `claim-approved/finder/${claimId}`,
        },
      }),
    ]);
  } catch (error) {
    // No payload or code in logs: only the error type is safe to record.
    console.error("Claim approval email failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
  }
}

async function deliver(
  database: Database,
  send: SendEmail,
  input: {
    userId: string;
    template: string;
    message: EmailMessage;
  },
): Promise<void> {
  let notificationId: string | null = null;
  try {
    const row = await database.notification.create({
      data: {
        userId: input.userId,
        channel: "EMAIL",
        template: input.template,
        status: "QUEUED",
      },
      select: { id: true },
    });
    notificationId = row.id;
  } catch {
    // Delivery still proceeds; only the observability row is lost.
  }

  const result = await send(input.message);
  if (!notificationId) return;

  try {
    await database.notification.update({
      where: { id: notificationId },
      data:
        "id" in result
          ? { status: "SENT", providerMessageId: result.id || null }
          : { status: "FAILED", error: result.error.slice(0, 500) },
    });
  } catch {
    // A logging failure must never fail delivery or the claim request.
  }
}
