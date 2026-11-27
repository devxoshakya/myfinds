import {
  actionButton,
  appUrl,
  codeBlock,
  details,
  escapeHtml,
  firstName,
  formatCategory,
  formatDateTime,
  imageBlock,
  paragraph,
  renderLayout,
} from "./layout";

export type ClaimApprovedClaimantEmailInput = {
  claimantName: string;
  itemTitle: string;
  category: string;
  reportNumber: number;
  foundStation: string;
  foundCity: string;
  lostStation: string;
  lostCity: string;
  handoverCode: string;
  handoverExpiresAt: Date;
  custodyStationName: string | null;
  counterHours: string | null;
  reportId: string;
  imageUrl: string | null;
};

export function renderClaimApprovedClaimantEmail(
  input: ClaimApprovedClaimantEmailInput,
) {
  const title = escapeHtml(input.itemTitle);
  const station = `${input.foundStation}, ${input.foundCity}`;
  const body = [
    paragraph(`Hi ${escapeHtml(firstName(input.claimantName))},`),
    paragraph(
      `Your claim for <strong>${title}</strong> was approved. Show the code below when you collect the item.`,
    ),
    ...(input.imageUrl ? [imageBlock(input.imageUrl, input.itemTitle)] : []),
    codeBlock(
      input.handoverCode,
      `Valid until ${formatDateTime(input.handoverExpiresAt)}.`,
    ),
    details([
      ["Item", title],
      ["Category", escapeHtml(formatCategory(input.category))],
      ["Report", `MF-${input.reportNumber}`],
      ["Lost at", escapeHtml(`${input.lostStation}, ${input.lostCity}`)],
      ["Found at", escapeHtml(station)],
      ...(input.custodyStationName
        ? ([["Collection point", escapeHtml(input.custodyStationName)]] as Array<
            [string, string]
          >)
        : []),
      ...(input.counterHours
        ? ([["Counter hours", escapeHtml(input.counterHours)]] as Array<
            [string, string]
          >)
        : []),
    ]),
    actionButton("View your report", appUrl(`/reports/${input.reportId}`)),
    paragraph(
      input.custodyStationName
        ? "Bring a government ID to the station counter. Staff will check the code and record the ID type."
        : "Arrange the handover with the finder, and share the code only when you meet.",
    ),
  ].join("");

  return {
    subject: `Claim approved: collect "${input.itemTitle}" (MF-${input.reportNumber})`,
    html: renderLayout({
      preheader: `Your handover code for ${input.itemTitle} is inside.`,
      eyebrow: "Claim approved",
      heading: "Your claim was approved",
      body,
    }),
    text: [
      `Hi ${firstName(input.claimantName)},`,
      "",
      `Your claim for ${input.itemTitle} was approved.`,
      "",
      `Handover code: ${input.handoverCode}`,
      `Valid until ${formatDateTime(input.handoverExpiresAt)}.`,
      "",
      `Item: ${input.itemTitle}`,
      `Category: ${formatCategory(input.category)}`,
      `Report: MF-${input.reportNumber}`,
      `Lost at: ${input.lostStation}, ${input.lostCity}`,
      `Found at: ${station}`,
      ...(input.custodyStationName
        ? [`Collection point: ${input.custodyStationName}`]
        : []),
      ...(input.counterHours ? [`Counter hours: ${input.counterHours}`] : []),
      "",
      input.custodyStationName
        ? "Bring a government ID to the station counter. Staff will check the code and record the ID type."
        : "Arrange the handover with the finder, and share the code only when you meet.",
      "",
      `View your report: ${appUrl(`/reports/${input.reportId}`)}`,
      "",
      "MyFinds",
    ].join("\n"),
  };
}
