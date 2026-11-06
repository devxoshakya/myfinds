import { Router } from "express";
import type { Database } from "@myfinds/db";

import { db } from "../services";

export function createPlacesRouter(database: Database = db) {
  const router = Router();

  router.get("/", async (_request, response) => {
    response.setHeader("Cache-Control", "public, max-age=300");

    try {
      const stations = await database.station.findMany({
        where: { active: true },
        orderBy: [{ city: { state: { name: "asc" } } }, { city: { name: "asc" } }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          placeType: true,
          city: {
            select: {
              id: true,
              name: true,
              state: { select: { id: true, name: true } },
            },
          },
        },
      });

      response.json({
        places: stations.map((station) => ({
          stationId: station.id,
          station: station.name,
          placeType: station.placeType,
          cityId: station.city.id,
          city: station.city.name,
          stateId: station.city.state.id,
          state: station.city.state.name,
        })),
      });
    } catch (error) {
      console.error("Place directory request failed", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "The place directory is unavailable." },
      });
    }
  });

  return router;
}

export const placesRouter = createPlacesRouter();
