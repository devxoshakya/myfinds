export const MATCH_MIN_SCORE = 0.65;
export const MATCH_DATE_WINDOW_DAYS = 14;
export const MATCH_MAX_PER_REPORT = 5;

export type MatchableStatus =
  | "SUBMITTED"
  | "MATCHING"
  | "MATCH_FOUND"
  | "RECEIVED_BY_STOP"
  | "CLAIMED";

export type MatchReport = {
  id: string;
  type: "LOST" | "FOUND";
  category: string;
  title: string;
  description?: string | null;
  brand?: string | null;
  color?: string | null;
  eventDate: Date;
  expiresAt: Date;
  status: string;
  stationId: string;
  cityId: string;
  placeType: string;
};

export type MatchBreakdown = {
  place: number;
  text: number;
  date: number;
  attributes: number;
};

export type ScoredMatch = {
  score: number;
  breakdown: MatchBreakdown;
  reasons: string[];
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trigrams(value: string) {
  const padded = `  ${normalize(value)}  `;
  return new Set(
    Array.from({ length: Math.max(0, padded.length - 2) }, (_, index) =>
      padded.slice(index, index + 3),
    ),
  );
}

function similarity(left: string, right: string) {
  const a = trigrams(left);
  const b = trigrams(right);
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((value) => b.has(value)).length;
  return (2 * intersection) / (a.size + b.size);
}

function tokenOverlap(left: string, right: string) {
  const a = new Set(normalize(left).split(" ").filter(Boolean));
  const b = new Set(normalize(right).split(" ").filter(Boolean));
  if (a.size === 0 || b.size === 0) return 0;
  return [...a].filter((value) => b.has(value)).length / Math.max(a.size, b.size);
}

function textScore(lost: MatchReport, found: MatchReport) {
  const lostText = [lost.title, lost.description, lost.brand, lost.color].filter(Boolean).join(" ");
  const foundText = [found.title, found.description, found.brand, found.color].filter(Boolean).join(" ");
  return 0.6 * similarity(lostText, foundText) + 0.4 * tokenOverlap(lostText, foundText);
}

function placeScore(lost: MatchReport, found: MatchReport) {
  if (lost.stationId === found.stationId) return 1;
  if (lost.cityId === found.cityId && lost.placeType === found.placeType) return 0.5;
  if (lost.cityId === found.cityId) return 0.2;
  return 0;
}

function dateScore(lost: MatchReport, found: MatchReport) {
  const daysApart = Math.abs(lost.eventDate.getTime() - found.eventDate.getTime()) / 86_400_000;
  return Math.max(0, Math.min(1, 1 - daysApart / MATCH_DATE_WINDOW_DAYS));
}

function attributesScore(lost: MatchReport, found: MatchReport) {
  const color = Boolean(lost.color && found.color) && normalize(lost.color) === normalize(found.color);
  const brand = Boolean(lost.brand && found.brand) && normalize(lost.brand) === normalize(found.brand);
  return (Number(color) + Number(brand)) / 2;
}

export function getMatchReasons(breakdown: MatchBreakdown, lost: MatchReport, found: MatchReport) {
  const reasons = [];
  if (breakdown.place === 1) reasons.push("Same station");
  else if (breakdown.place === 0.5) reasons.push("Same city and place type");
  else if (breakdown.place === 0.2) reasons.push("Same city");
  if (breakdown.text >= 0.5) reasons.push("Similar item details");
  if (breakdown.date >= 0.75) reasons.push("Close report dates");
  if (lost.color && found.color && normalize(lost.color) === normalize(found.color)) {
    reasons.push("Same color");
  }
  if (lost.brand && found.brand && normalize(lost.brand) === normalize(found.brand)) {
    reasons.push("Same brand");
  }
  return reasons;
}

export function scoreMatch(lost: MatchReport, found: MatchReport): ScoredMatch {
  const breakdown = {
    place: placeScore(lost, found),
    text: textScore(lost, found),
    date: dateScore(lost, found),
    attributes: attributesScore(lost, found),
  };
  const score =
    0.3 * breakdown.place +
    0.3 * breakdown.text +
    0.2 * breakdown.date +
    0.2 * breakdown.attributes;
  return { score, breakdown, reasons: getMatchReasons(breakdown, lost, found) };
}

export function canMatch(lost: MatchReport, found: MatchReport, now = new Date()) {
  if (lost.type !== "LOST" || found.type !== "FOUND") return false;
  if (lost.category !== found.category || lost.cityId !== found.cityId) return false;
  if (!["SUBMITTED", "MATCHING", "MATCH_FOUND", "RECEIVED_BY_STOP", "CLAIMED"].includes(found.status)) {
    return false;
  }
  if (lost.expiresAt <= now || found.expiresAt <= now) return false;
  const daysApart = (found.eventDate.getTime() - lost.eventDate.getTime()) / 86_400_000;
  return daysApart >= -1 && daysApart <= MATCH_DATE_WINDOW_DAYS;
}

export function findMatches(
  report: MatchReport,
  candidates: MatchReport[],
  now = new Date(),
) {
  const lost = report.type === "LOST" ? report : undefined;
  const found = report.type === "FOUND" ? report : undefined;
  if (!lost && !found) return [];

  return candidates
    .filter((candidate) => candidate.id !== report.id)
    .map((candidate) => ({
      candidate,
      scored: lost ? (canMatch(lost, candidate, now) ? scoreMatch(lost, candidate) : null) : null,
    }))
    .map((entry) => ({
      candidate: entry.candidate,
      scored: found && entry.candidate.type === "LOST" && canMatch(entry.candidate, found, now)
        ? scoreMatch(entry.candidate, found)
        : entry.scored,
    }))
    .filter((entry): entry is { candidate: MatchReport; scored: ScoredMatch } =>
      entry.scored !== null && entry.scored.score >= MATCH_MIN_SCORE,
    )
    .sort((left, right) => right.scored.score - left.scored.score)
    .slice(0, MATCH_MAX_PER_REPORT);
}
