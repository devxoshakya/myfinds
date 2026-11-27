import {
  actionButton,
  appUrl,
  details,
  escapeHtml,
  firstName,
  formatCategory,
  formatDate,
  imageBlock,
  paragraph,
  renderLayout,
} from "./layout";

export type ClaimApprovedFinderEmailInput = {
  finderName: string;
  itemTitle: string;
  category: string;
  reportNumber: number;
  foundStation: string;
  foundCity: string;
  foundDate: Date;
  reportId: string;
  stationCustody: boolean;
  imageUrl: string | null;
};

export function renderClaimApprovedFinderEmail(
  input: ClaimApprovedFinderEmailInput,
) {
  const title = escapeHtml(input.itemTitle);
  const station = `${input.foundStation}, ${input.foundCity}`;
  const nextStep = input.stationCustody
    ? "Station staff will confirm the handover code at the counter when the owner collects the item."
    : "When you meet the owner, enter their 6-digit handover code in MyFinds to complete the return.";

  const body = [
    paragraph(`Hi ${escapeHtml(firstName(input.finderName))},`),
    paragraph(
      `A claim for <strong>${title}</strong>, the item you submitted, was accepted. The owner has a 6-digit handover code that confirms the item belongs to them.`,
    ),
    ...(input.imageUrl ? [imageBlock(input.imageUrl, input.itemTitle)] : []),
    details([
      ["Item", title],
      ["Category", escapeHtml(formatCategory(input.category))],
      ["Report", `MF-${input.reportNumber}`],
      ["Found at", escapeHtml(station)],
      ["Found on", escapeHtml(formatDate(input.foundDate))],
    ]),
    actionButton("Review the handover", appUrl(`/reports/${input.reportId}`)),
    paragraph(nextStep),
  ].join("");

  return {
    subject: `Claim accepted for "${input.itemTitle}" (MF-${input.reportNumber})`,
    html: renderLayout({
      preheader: `A claim for ${input.itemTitle} was accepted.`,
      eyebrow: "Claim accepted",
      heading: "A claim was accepted",
      body,
    }),
    text: [
      `Hi ${firstName(input.finderName)},`,
      "",
      `A claim for ${input.itemTitle}, the item you submitted, was accepted. The owner has a 6-digit handover code that confirms the item belongs to them.`,
      "",
      `Item: ${input.itemTitle}`,
      `Category: ${formatCategory(input.category)}`,
      `Report: MF-${input.reportNumber}`,
      `Found at: ${station}`,
      `Found on: ${formatDate(input.foundDate)}`,
      "",
      nextStep,
      "",
      `Review the handover: ${appUrl(`/reports/${input.reportId}`)}`,
      "",
      "MyFinds",
    ].join("\n"),
  };
}
