import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

import { ENV } from "./env.server";
import { placesRouter } from "./routes/places";
import { createPhotosRouter } from "./routes/photos";
import { createReportStatusRouter } from "./routes/report-status";
import { reportsRouter } from "./routes/reports";
import { auth, db } from "./services";
import { createPhotoStorage } from "./services/photos";

const app = express();

app.use(
  cors({
    origin: ENV.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use(express.json());
app.use("/api/places", placesRouter);
app.use("/api/reports/status", createReportStatusRouter());
app.use("/api/reports", reportsRouter);
const photoConfig = {
  accountId: ENV.R2_ACCOUNT_ID,
  accessKeyId: ENV.R2_ACCESS_KEY_ID,
  secretAccessKey: ENV.R2_SECRET_ACCESS_KEY,
  bucketName: ENV.R2_BUCKET_NAME,
};
if (
  photoConfig.accountId &&
  photoConfig.accessKeyId &&
  photoConfig.secretAccessKey &&
  photoConfig.bucketName
) {
  const configuredPhotoStorage = {
    accountId: photoConfig.accountId,
    accessKeyId: photoConfig.accessKeyId,
    secretAccessKey: photoConfig.secretAccessKey,
    bucketName: photoConfig.bucketName,
  };
  app.use(
    "/api/photos",
    createPhotosRouter(
      db,
      createPhotoStorage(configuredPhotoStorage),
      (headers) => auth.api.getSession({ headers }),
    ),
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

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
