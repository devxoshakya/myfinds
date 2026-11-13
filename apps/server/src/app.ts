import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";


import { placesRouter } from "./routes/places";
import { claimsRouter } from "./routes/claims";
import { createPhotosRouter } from "./routes/photos";
import { createReportStatusRouter } from "./routes/report-status";
import { reportsRouter } from "./routes/reports";
import { staffRouter } from "./routes/staff";
import { auth, db } from "./services";
import { createEnvPhotoStorage } from "./services/photos";

export const app = express();

app.set("trust proxy", true);

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin || requestOrigin === process.env.CORS_ORIGIN) {
        callback(null, true);
        return;
      }
      console.warn("CORS origin rejected", {
        origin: requestOrigin,
        allowedOrigin: process.env.CORS_ORIGIN,
      });
      callback(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    credentials: true,
  }),
);

app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use(express.json());
app.use("/api/places", placesRouter);
app.use("/api/reports/status", createReportStatusRouter());
app.use("/api/reports", reportsRouter);
app.use("/api/claims", claimsRouter);
app.use("/api/staff", staffRouter);
const photoStorage = createEnvPhotoStorage();
if (photoStorage) {
  app.use(
    "/api/photos",
    createPhotosRouter(db, photoStorage, (headers) => auth.api.getSession({ headers })),
  );
} else {
  app.use("/api/photos", (_request, response) => {
    response.status(503).json({
      error: { code: "PHOTO_STORAGE_UNAVAILABLE", message: "Photo uploads are unavailable." },
    });
  });
}

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// Vercel zero-config Express entry: the framework builds this file and
// wraps the default export as the handler for every route.
export default app;
