import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

import { ENV } from "./env.server";
import { placesRouter } from "./routes/places";
import { createReportStatusRouter } from "./routes/report-status";
import { reportsRouter } from "./routes/reports";
import { auth } from "./services";

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

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
