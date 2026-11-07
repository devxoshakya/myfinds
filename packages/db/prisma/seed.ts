import { createPrismaClient } from "../src";
import { ENV } from "../src/env";
import { DELHI_NCR_TRANSPORT_PLACES } from "@myfinds/shared";

const db = createPrismaClient(ENV);

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
  const stateNames = [...new Set(DELHI_NCR_TRANSPORT_PLACES.map((place) => place.state))];
  await db.state.createMany({
    data: stateNames.map((name) => ({ name })),
    skipDuplicates: true,
  });
  const states = await db.state.findMany({ where: { name: { in: stateNames } } });
  const stateIds = new Map(states.map((state) => [state.name, state.id]));
  const cityKeys = [
    ...new Map(
      DELHI_NCR_TRANSPORT_PLACES.map((place) => [
        `${place.state}:${place.city}`,
        { stateId: stateIds.get(place.state)!, name: place.city },
      ]),
    ).values(),
  ];
  await db.city.createMany({ data: cityKeys, skipDuplicates: true });
  const cities = await db.city.findMany({
    where: { OR: cityKeys.map((city) => ({ stateId: city.stateId, name: city.name })) },
  });
  const cityIds = new Map(cities.map((city) => [`${city.stateId}:${city.name}`, city.id]));
  await db.station.createMany({
    data: DELHI_NCR_TRANSPORT_PLACES.map((place) => ({
      cityId: cityIds.get(`${stateIds.get(place.state)}:${place.city}`)!,
      placeType: place.placeType,
      name: place.name,
      counterHours: place.placeType === "RAILWAY" ? "06:00-22:00" : "06:00-23:00",
      addressNote: "Delhi demonstration directory",
    })),
    skipDuplicates: true,
  });
  const stationRecords = await db.station.findMany({
    where: {
      OR: DELHI_NCR_TRANSPORT_PLACES.map((place) => ({
        cityId: cityIds.get(`${stateIds.get(place.state)}:${place.city}`)!,
        placeType: place.placeType,
        name: place.name,
      })),
    },
  });

  const users = [];
  for (const [id, name, email] of reportUsers) {
    users.push(
      await db.user.upsert({
        where: { email },
        update: { name, role: "USER" },
        create: { id, name, email, role: "USER" },
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
