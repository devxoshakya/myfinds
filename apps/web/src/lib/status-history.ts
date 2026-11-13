const historyLabels: Record<string, string> = {
  CREATED: "Report created",
  MATCHING_STARTED: "Matching started",
  MATCH_FOUND: "Possible match found",
  RECEIPT_CONFIRMED: "Station receipt confirmed",
  RECEIVED_BY_STOP: "Station receipt confirmed",
  CLAIM_SUBMITTED: "Claim submitted",
  CLAIM_APPROVED: "Claim approved",
  CLAIM_REJECTED: "Claim rejected",
  HANDOVER_COMPLETED: "Item handed over",
};

export function getStatusHistoryLabel(action: string) {
  return historyLabels[action] ?? "Report updated";
}

export function isRejectedHistoryAction(action: string) {
  return action === "CLAIM_REJECTED" || action.toLowerCase().includes("rejected");
}
