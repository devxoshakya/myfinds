import { createPrismaClient } from "../src";
import { ENV } from "../src/env";

const db = createPrismaClient(ENV);

const stations: readonly (readonly ["METRO" | "RAILWAY" | "BUS_STOP", string])[] = [
  ["METRO", "Rajiv Chowk Metro"],
  ["METRO", "Central Secretariat Metro"],
  ["METRO", "Kashmere Gate Metro"],
  ["METRO", "Hauz Khas Metro"],
  ["METRO", "Dwarka Sector 21 Metro"],
  ["METRO", "New Delhi Metro"],
  ["METRO", "Chandni Chowk Metro"],
  ["METRO", "Saket Metro"],
  ["METRO", "Noida Sector 18 Metro"],
  ["METRO", "Karol Bagh Metro"],
  ["RAILWAY", "New Delhi Railway Station"],
  ["RAILWAY", "Old Delhi Railway Station"],
  ["RAILWAY", "Hazrat Nizamuddin Railway Station"],
  ["RAILWAY", "Anand Vihar Terminal"],
  ["RAILWAY", "Delhi Cantt Railway Station"],
  ["RAILWAY", "Sabzi Mandi Railway Station"],
  ["BUS_STOP", "Kashmere Gate ISBT"],
  ["BUS_STOP", "Anand Vihar ISBT"],
  ["BUS_STOP", "Sarai Kale Khan ISBT"],
  ["BUS_STOP", "Mori Gate Bus Stop"],
] as const;

const items: readonly (readonly ["PHONE" | "WALLET" | "KEYS" | "BAG" | "ID_CARD" | "LAPTOP" | "HEADPHONES" | "CLOTHING" | "OTHER", string, string, string | null])[] = [
  ["PHONE", "black Android phone", "black", "Samsung"],
  ["PHONE", "blue iPhone", "blue", "Apple"],
  ["WALLET", "brown leather wallet", "brown", "Fossil"],
  ["WALLET", "black card wallet", "black", "Wildhorn"],
  ["KEYS", "ring of house keys", "silver", "Yale"],
  ["BAG", "navy backpack", "navy", "Skybags"],
  ["BAG", "red laptop bag", "red", "American Tourister"],
  ["ID_CARD", "college identity card", "white", null],
  ["LAPTOP", "silver laptop", "silver", "Lenovo"],
  ["HEADPHONES", "wireless headphones", "white", "Sony"],
  ["CLOTHING", "grey hoodie", "grey", "Uniqlo"],
  ["OTHER", "stainless steel water bottle", "silver", "Milton"],
] as const;

const reportUsers: readonly (readonly [string, string, string])[] = [
  ["seed-owner-1", "Asha Sharma", "asha.seed@example.test"],
  ["seed-owner-2", "Rohan Mehta", "rohan.seed@example.test"],
  ["seed-owner-3", "Ishita Rao", "ishita.seed@example.test"],
  ["seed-owner-4", "Kabir Singh", "kabir.seed@example.test"],
] as const;

function dateFor(index: number) {
  const date = new Date(Date.UTC(2026, 9, 20 + (index % 17)));
  return date;
}

async function main() {
  const state = await db.state.upsert({
    where: { name: "Delhi" },
    update: {},
    create: { name: "Delhi" },
  });
  const city = await db.city.upsert({
    where: { stateId_name: { stateId: state.id, name: "New Delhi" } },
    update: {},
    create: { stateId: state.id, name: "New Delhi" },
  });

  const stationRecords = [];
  for (const [placeType, name] of stations) {
    stationRecords.push(
      await db.station.upsert({
        where: { cityId_placeType_name: { cityId: city.id, placeType, name } },
        update: { active: true },
        create: {
          cityId: city.id,
          placeType,
          name,
          counterHours: placeType === "RAILWAY" ? "06:00-22:00" : "06:00-23:00",
          addressNote: "Delhi demonstration directory",
        },
      }),
    );
  }

  const users = [];
  for (const [id, name, email] of reportUsers) {
    users.push(
      await db.user.upsert({
        where: { email },
        update: { name, emailVerified: true, role: "USER" },
        create: { id, name, email, emailVerified: true, role: "USER" },
      }),
    );
  }

  const statuses = ["SUBMITTED", "MATCHING", "MATCH_FOUND", "SUBMITTED_TO_STOP"] as const;
  for (let index = 0; index < 60; index += 1) {
    const [category, title, color, brand] = items[index % items.length]!;
    const station = stationRecords[index % stationRecords.length]!;
    const type = index % 3 === 0 ? "FOUND" : "LOST";
    const status =
      type === "FOUND" && index % 4 === 0
        ? "SUBMITTED_TO_STOP"
        : statuses[index % 3]!;
    const reporter = users[index % users.length]!;
    const reportId = `seed-report-${String(index + 1).padStart(3, "0")}`;
    const report = await db.report.upsert({
      where: { id: reportId },
      update: { status, title, category, color, brand, placeStationId: station.id },
      create: {
        id: reportId,
        type,
        reporterId: reporter.id,
        title,
        category,
        description: `Demonstration ${type.toLowerCase()} report for seed scenario ${index + 1}.`,
        color,
        brand,
        eventDate: dateFor(index),
        eventTime: `${String(8 + (index % 10)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
        placeStationId: station.id,
        placeNote: ["Platform 1", "Gate 2", "Coach C", "Near the ticket counter"][index % 4],
        status,
        expiresAt: new Date(dateFor(index).getTime() + 60 * 24 * 60 * 60 * 1000),
        custodian: type === "FOUND" ? (index % 2 ? "FINDER" : "STATION") : null,
        custodyStationId: type === "FOUND" && index % 2 === 0 ? station.id : null,
      },
    });

    const history = await db.statusHistory.findFirst({ where: { reportId: report.id } });
    if (!history) {
      await db.statusHistory.create({
        data: {
          reportId: report.id,
          fromStatus: null,
          toStatus: status,
          actorId: reporter.id,
          actorRole: "USER",
          action: "CREATED",
          note: "Seed demonstration record",
        },
      });
    }
  }

  console.log(`Seeded Delhi directory and ${60} reports.`);
}

try {
  await main();
} finally {
  await db.$disconnect();
}
