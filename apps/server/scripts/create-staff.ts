// One-off CLI to bootstrap staff accounts for demos (only admin adds staff,
// PRD §11 — until an admin UI exists, this script stands in for it).
//
// Usage:
//   bun run scripts/create-staff.ts \
//     --email staff@example.test --password "<min 8 chars>" \
//     --name "Ravi Kumar" --role STATION_STAFF \
//     --station "Rajiv Chowk Metro Station" --station "Central Secretariat"
//
//   --role ADMIN skips --station (admins act on all stations).
//   If the email already exists, the user is promoted/linked without touching
//   the password.
import { auth, db } from "../src/services";

function parseArgs(argv: string[]) {
  const values = new Map<string, string[]>();
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index]?.startsWith("--")) continue;
    const key = argv[index]!.slice(2);
    const value = argv[++index];
    if (!value) throw new Error(`--${key} requires a value.`);
    values.set(key, [...(values.get(key) ?? []), value]);
  }
  const take = (key: string) => values.get(key)?.[0];
  const email = take("email");
  const password = take("password");
  const name = take("name");
  const role = (take("role") ?? "STATION_STAFF") as string;
  const stations = values.get("station") ?? [];
  if (!email || !password || !name) {
    throw new Error("--email, --password and --name are required.");
  }
  if (role !== "STATION_STAFF" && role !== "ADMIN") {
    throw new Error("--role must be STATION_STAFF or ADMIN.");
  }
  if (role === "STATION_STAFF" && (!Array.isArray(stations) || stations.length === 0)) {
    throw new Error("STATION_STAFF requires at least one --station.");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("--password must be at least 8 characters.");
  }
  return { email, password, name, role, stations: Array.isArray(stations) ? stations : [stations] };
}

async function main() {
  const { email, password, name, role, stations } = parseArgs(process.argv.slice(2));

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  let userId: string;
  if (existing) {
    userId = existing.id;
    console.log(`User ${email} already exists — promoting instead of recreating.`);
  } else {
    // Let Better Auth create the user + credential account so the password is
    // hashed exactly the way login expects.
    const signUp = await auth.api.signUpEmail({ body: { email, password, name } });
    userId = signUp.user.id;
    console.log(`Created user ${email} (${userId}).`);
  }

  await db.user.update({ where: { id: userId }, data: { role } });

  if (stations.length > 0) {
    const stationRows = await db.station.findMany({
      where: { name: { in: stations }, active: true },
      select: { id: true, name: true },
    });
    const missing = stations.filter(
      (station) => !stationRows.some((row) => row.name === station),
    );
    if (missing.length > 0) {
      throw new Error(`Unknown or inactive stations: ${missing.join(", ")}`);
    }
    // Admin rows need an actor; the staff user links itself in this demo path.
    await db.stationStaff.createMany({
      data: stationRows.map((station) => ({
        userId,
        stationId: station.id,
        addedById: userId,
      })),
      skipDuplicates: true,
    });
    console.log(`Linked ${stationRows.length} station(s) to ${email}.`);
  }

  console.log(`Done: ${email} is ${role}.`);
}

try {
  await main();
} finally {
  await db.$disconnect();
}
