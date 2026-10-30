/**
 * Preview fixtures for the UI.
 *
 * The reports service (`POST /api/reports`, matching, claims) is not connected
 * in this build, so the report screens read from this module. Every screen that
 * uses it says so, and nothing here is written back to a database.
 * Shapes mirror the Prisma models so the screens can switch to real data later.
 */

export type ReportType = "LOST" | "FOUND";

export type ReportStatus =
  | "SUBMITTED"
  | "SUBMITTED_TO_STOP"
  | "RECEIVED_BY_STOP"
  | "MATCHING"
  | "MATCH_FOUND"
  | "CLAIMED"
  | "VERIFIED"
  | "RETURNED"
  | "EXPIRED"
  | "WITHDRAWN";

export type PlaceType = "Metro" | "Railway" | "Bus stop";

export type Place = {
  state: string;
  city: string;
  placeType: PlaceType;
  station: string;
  note?: string;
  counterHours?: string;
};

export type HistoryEntry = {
  at: string;
  actor: string;
  role: "You" | "System" | "Station staff" | "Admin";
  action: string;
};

export type PreviewClaim = {
  id: string;
  claimant: string;
  attempts: string;
  submittedAt: string;
  answer: string;
  similarity: number;
};

export type DirectoryEntry = {
  state: string;
  city: string;
  placeType: PlaceType;
  station: string;
};

/** Stand-in for `GET /api/places` until the places service is connected. */
export const placeDirectory: DirectoryEntry[] = [
  { state: "Demo State", city: "Sample City", placeType: "Metro", station: "Sample Central Metro" },
  { state: "Demo State", city: "Sample City", placeType: "Metro", station: "Sample Riverside Metro" },
  { state: "Demo State", city: "Sample City", placeType: "Railway", station: "Sample Central Railway" },
  { state: "Demo State", city: "Sample City", placeType: "Bus stop", station: "Sample Central Bus Stop" },
  { state: "Demo State", city: "Sample Coast City", placeType: "Metro", station: "Sample Coast Metro" },
  { state: "Demo State", city: "Sample Coast City", placeType: "Railway", station: "Sample Coast Railway" },
  { state: "Example State", city: "Example City", placeType: "Metro", station: "Example Main Metro" },
  { state: "Example State", city: "Example City", placeType: "Bus stop", station: "Example Main Bus Stop" },
];

export type PreviewReport = {
  id: string;
  number: string;
  type: ReportType;
  title: string;
  category: string;
  description: string;
  color: string;
  brand: string;
  eventDate: string;
  eventTime?: string;
  place: Place;
  status: ReportStatus;
  createdAt: string;
  expiresAt: string;
  photoCount: number;
  questions?: string[];
  custodian?: "FINDER" | "STATION";
  custodyStation?: Place;
  storageRef?: string;
  needsAttention?: boolean;
  handover?: { code: string; expiresAt: string };
  claims?: PreviewClaim[];
  history: HistoryEntry[];
};

export const statusLabels: Record<ReportStatus, string> = {
  SUBMITTED: "Submitted",
  SUBMITTED_TO_STOP: "Submitted to stop",
  RECEIVED_BY_STOP: "Received by stop",
  MATCHING: "Matching",
  MATCH_FOUND: "Match found",
  CLAIMED: "Claimed",
  VERIFIED: "Verified",
  RETURNED: "Returned",
  EXPIRED: "Expired",
  WITHDRAWN: "Withdrawn",
};

const centralMetro: Place = {
  state: "Demo State",
  city: "Sample City",
  placeType: "Metro",
  station: "Sample Central Metro",
  note: "Platform 3, near the ticket gate",
  counterHours: "06:00–23:00, daily",
};

const riversideMetro: Place = {
  state: "Demo State",
  city: "Sample City",
  placeType: "Metro",
  station: "Sample Riverside Metro",
  note: "Eastbound platform",
  counterHours: "05:30–23:30, daily",
};

const centralRailway: Place = {
  state: "Demo State",
  city: "Sample City",
  placeType: "Railway",
  station: "Sample Central Railway",
  counterHours: "05:00–00:00, daily",
};

export const previewReports: PreviewReport[] = [
  {
    id: "mf-1042",
    number: "MF-1042",
    type: "LOST",
    title: "Black leather wallet",
    category: "Wallet",
    description:
      "Black bi-fold wallet with a frayed stitched corner and a metro card in the front slot.",
    color: "Black",
    brand: "Baggit",
    eventDate: "2026-10-24",
    eventTime: "18:40",
    place: centralMetro,
    status: "VERIFIED",
    createdAt: "2026-10-24",
    expiresAt: "2026-12-23",
    photoCount: 1,
    custodian: "STATION",
    custodyStation: { ...centralMetro, station: "Sample Central Metro" },
    storageRef: "BIN-RAIL-0498",
    handover: {
      code: "482916",
      expiresAt: "2026-10-31T18:40:00",
    },
    history: [
      { at: "2026-10-24 18:44", actor: "You", role: "You", action: "Report created" },
      {
        at: "2026-10-24 18:44",
        actor: "System",
        role: "System",
        action: "Matched with a found item (92%)",
      },
      {
        at: "2026-10-25 09:12",
        actor: "Sample Central Metro",
        role: "Station staff",
        action: "Receipt confirmed, shelf BIN-RAIL-0498",
      },
      { at: "2026-10-25 09:14", actor: "System", role: "System", action: "Match re-run" },
      { at: "2026-10-26 11:02", actor: "You", role: "You", action: "Claim submitted" },
      {
        at: "2026-10-26 16:20",
        actor: "Sample Central Metro",
        role: "Station staff",
        action: "Claim approved, handover code issued",
      },
    ],
  },
  {
    id: "mf-1038",
    number: "MF-1038",
    type: "LOST",
    title: "Navy blue backpack",
    category: "Bag",
    description:
      "Navy canvas backpack, 24 litres, with a red zipper pull on the front pocket.",
    color: "Navy blue",
    brand: "Wildcraft",
    eventDate: "2026-10-26",
    eventTime: "08:15",
    place: riversideMetro,
    status: "MATCH_FOUND",
    createdAt: "2026-10-26",
    expiresAt: "2026-12-25",
    photoCount: 2,
    history: [
      { at: "2026-10-26 08:20", actor: "You", role: "You", action: "Report created" },
      {
        at: "2026-10-26 08:20",
        actor: "System",
        role: "System",
        action: "2 possible matches found",
      },
    ],
  },
  {
    id: "mf-1031",
    number: "MF-1031",
    type: "LOST",
    title: "Wireless earbuds",
    category: "Headphones",
    description: "White earbuds in a scuffed charging case with a small blue sticker on the lid.",
    color: "White",
    brand: "boAt",
    eventDate: "2026-10-22",
    place: centralRailway,
    status: "MATCHING",
    createdAt: "2026-10-22",
    expiresAt: "2026-12-21",
    photoCount: 0,
    history: [
      { at: "2026-10-22 20:05", actor: "You", role: "You", action: "Report created" },
      { at: "2026-10-22 20:05", actor: "System", role: "System", action: "Matching started" },
    ],
  },
  {
    id: "mf-1050",
    number: "MF-1050",
    type: "FOUND",
    title: "Brown leather satchel",
    category: "Bag",
    description:
      "Small brown satchel with a brass buckle. One strap keeper is missing. Found on a seat.",
    color: "Brown",
    brand: "Hidesign",
    eventDate: "2026-10-27",
    eventTime: "17:05",
    place: centralMetro,
    status: "CLAIMED",
    createdAt: "2026-10-27",
    expiresAt: "2026-12-26",
    photoCount: 2,
    custodian: "FINDER",
    questions: ["What is written on the paper inside the front pocket?"],
    claims: [
      {
        id: "claim-1",
        claimant: "A. Sharma",
        attempts: "1 of 3",
        submittedAt: "2026-10-28 10:15",
        answer: "A grocery list with a phone number in pencil.",
        similarity: 82,
      },
    ],
    history: [
      { at: "2026-10-27 17:10", actor: "You", role: "You", action: "Report created" },
      {
        at: "2026-10-27 17:10",
        actor: "System",
        role: "System",
        action: "Matched with a lost report (88%)",
      },
      { at: "2026-10-28 10:15", actor: "A. Sharma", role: "You", action: "Claim submitted" },
    ],
  },
  {
    id: "mf-1024",
    number: "MF-1024",
    type: "LOST",
    title: "Compact black umbrella",
    category: "Other",
    description: "Black folding umbrella with a wooden handle.",
    color: "Black",
    brand: "Unbranded",
    eventDate: "2026-10-12",
    place: centralMetro,
    status: "RETURNED",
    createdAt: "2026-10-12",
    expiresAt: "2026-12-11",
    photoCount: 0,
    history: [
      { at: "2026-10-12 19:00", actor: "You", role: "You", action: "Report created" },
      { at: "2026-10-13 12:30", actor: "System", role: "System", action: "Match found (81%)" },
      { at: "2026-10-14 08:45", actor: "You", role: "You", action: "Claim submitted" },
      {
        at: "2026-10-14 09:10",
        actor: "Sample Central Metro",
        role: "Station staff",
        action: "Handover code validated, item returned",
      },
    ],
  },
];

export type FoundItem = {
  id: string;
  title: string;
  category: string;
  brand: string;
  color: string;
  description: string;
  place: Place;
  eventDate: string;
  photoCount: number;
  custodian: "FINDER" | "STATION";
  storageRef?: string;
  questions?: string[];
};

export type PreviewMatch = {
  id: string;
  lostReportId: string;
  score: number;
  breakdown: { place: number; text: number; date: number; attributes: number };
  found: FoundItem;
};

export const previewMatches: PreviewMatch[] = [
  {
    id: "match-1",
    lostReportId: "mf-1038",
    score: 0.92,
    breakdown: { place: 1, text: 0.88, date: 0.97, attributes: 0.5 },
    found: {
      id: "mf-1047",
      title: "Navy backpack",
      category: "Bag",
      brand: "Wildcraft",
      color: "Navy blue",
      description:
        "Navy blue backpack found under a seat. Front pocket has a red zipper pull. Contains a notebook.",
      place: { ...riversideMetro, note: "Eastbound platform, bench near the lift" },
      eventDate: "2026-10-26",
      photoCount: 2,
      custodian: "STATION",
      storageRef: "BIN-MET-0241",
    },
  },
  {
    id: "match-2",
    lostReportId: "mf-1038",
    score: 0.71,
    breakdown: { place: 0.5, text: 0.74, date: 0.93, attributes: 0.5 },
    found: {
      id: "mf-1044",
      title: "Blue laptop bag",
      category: "Bag",
      brand: "Wildcraft",
      color: "Blue",
      description: "Blue shoulder bag with a padded laptop sleeve, found at the ticket counter.",
      place: { ...centralMetro, note: "Ticket counter" },
      eventDate: "2026-10-25",
      photoCount: 1,
      custodian: "FINDER",
      questions: ["What is written on the luggage tag?"],
    },
  },
];

export function getReport(id: string) {
  return previewReports.find((report) => report.id === id);
}

export function getReportByNumber(number?: string) {
  return previewReports.find((report) => report.number === number);
}

export function getMatches(lostReportId: string) {
  return previewMatches
    .filter((match) => match.lostReportId === lostReportId)
    .sort((a, b) => b.score - a.score);
}

export function getBestMatchScore(report: PreviewReport) {
  const matches = getMatches(report.id);
  return matches.length > 0 ? matches[0].score : null;
}

export const openReports = previewReports.filter(
  (report) => report.status !== "RETURNED" && report.status !== "EXPIRED" && report.status !== "WITHDRAWN",
);

export const previewStats = {
  reported: 1284,
  returned: 913,
  stations: 15,
};

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, options ?? { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00`),
  );
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value.replace(" ", "T")));
}
