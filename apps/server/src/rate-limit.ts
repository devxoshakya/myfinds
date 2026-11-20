const REPORTS_PER_IP = 10;
const REPORT_WINDOW_MS = 60 * 60 * 1000;
const REPORT_STATUS_LOOKUPS_PER_IP = 30;
const REPORT_STATUS_WINDOW_MS = 60 * 1000;
const CLAIM_SUBMITS_PER_USER = 10;
const CLAIM_SUBMIT_WINDOW_MS = 60 * 60 * 1000;
const HANDOVER_ATTEMPTS_PER_CLAIM = 5;
const HANDOVER_WINDOW_MS = 60 * 60 * 1000;

// shortcut: process-local and socket-IP scoped; replace with shared storage before horizontal scaling.
type RateWindow = {
  count: number;
  resetAt: number;
};

const rateWindows = new Map<string, RateWindow>();
let requestsSinceCleanup = 0;

function consumeLimit(
  namespace: string,
  subject: string,
  limit: number,
  windowMs: number,
  now: number,
) {
  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= 100) {
    for (const [rateKey, window] of rateWindows) {
      if (window.resetAt <= now) rateWindows.delete(rateKey);
    }
    requestsSinceCleanup = 0;
  }

  const rateKey = `${namespace}:${subject}`;
  const current = rateWindows.get(rateKey);
  if (!current || current.resetAt <= now) {
    rateWindows.set(rateKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function consumeReportIpLimit(ipAddress: string, now = Date.now()) {
  return consumeLimit("report", ipAddress, REPORTS_PER_IP, REPORT_WINDOW_MS, now);
}

export function consumeReportStatusIpLimit(ipAddress: string, now = Date.now()) {
  return consumeLimit(
    "report-status",
    ipAddress,
    REPORT_STATUS_LOOKUPS_PER_IP,
    REPORT_STATUS_WINDOW_MS,
    now,
  );
}

export function consumeClaimSubmitLimit(userId: string, now = Date.now()) {
  return consumeLimit("claim-submit", userId, CLAIM_SUBMITS_PER_USER, CLAIM_SUBMIT_WINDOW_MS, now);
}

export function consumeHandoverAttemptLimit(claimId: string, now = Date.now()) {
  return consumeLimit(
    "handover",
    claimId,
    HANDOVER_ATTEMPTS_PER_CLAIM,
    HANDOVER_WINDOW_MS,
    now,
  );
}
