import { describe, expect, it } from "bun:test";
import type { AddressInfo } from "node:net";
import express from "express";
import type { Database } from "@myfinds/db";

import { createPlacesRouter } from "./places";

describe("GET /api/places", () => {
  it("returns active station IDs and public place labels", async () => {
    const database = {
      station: {
        findMany: async (query: { where: { active: boolean } }) => {
          expect(query.where.active).toBe(true);
          return [
            {
              id: "station-1",
              name: "Central",
              placeType: "METRO",
              city: {
                id: "city-1",
                name: "Metro City",
                state: { id: "state-1", name: "State" },
              },
            },
          ];
        },
      },
    } as unknown as Database;
    const app = express();
    app.use("/api/places", createPlacesRouter(database));
    const server = app.listen(0, "127.0.0.1");

    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/places`);
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("public, max-age=300");
      expect(await response.json()).toEqual({
        places: [
          {
            stationId: "station-1",
            station: "Central",
            placeType: "METRO",
            cityId: "city-1",
            city: "Metro City",
            stateId: "state-1",
            state: "State",
          },
        ],
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
