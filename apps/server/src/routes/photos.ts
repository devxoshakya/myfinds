import { Router, type Request } from "express";
import type { Session } from "@myfinds/auth";
import type { Database } from "@myfinds/db";
import { z } from "zod";

import {
  assertReportPhotoAccess,
  InvalidPhotoError,
  PhotoNotFoundError,
  type PhotoStorage,
} from "../services/photos";

type PhotoSession = {
  user: Pick<Session["user"], "id">;
};

const photoInputSchema = z.object({
  reportId: z.string().min(1),
  kind: z.enum(["ITEM", "PROOF"]),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
});

const confirmSchema = photoInputSchema.extend({
  photoId: z.string().uuid(),
  key: z.string().min(1),
});

export function createPhotosRouter(
  database: Database,
  storage: PhotoStorage,
  getSession: (headers: Request["headers"]) => Promise<PhotoSession | null>,
) {
  const router = Router();

  router.post("/presign", async (request, response) => {
    const session = await getSession(request.headers);
    if (!session) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in first." } });
      return;
    }
    const parsed = photoInputSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(422).json({ error: { code: "VALIDATION_FAILED", message: "Invalid photo." } });
      return;
    }

    try {
      await assertReportPhotoAccess(database, parsed.data.reportId, session.user.id);
      response.status(201).json(await storage.createUploadUrl(parsed.data));
    } catch (error) {
      if (response.headersSent) return;
      if (error instanceof PhotoNotFoundError || error instanceof InvalidPhotoError) {
        response.status(422).json({ error: { code: "VALIDATION_FAILED", message: error.message } });
        return;
      }
      console.error("Photo presign failed", { errorName: error instanceof Error ? error.name : "unknown" });
      response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Photo upload is unavailable." } });
    }
  });

  router.post("/confirm", async (request, response) => {
    const session = await getSession(request.headers);
    if (!session) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in first." } });
      return;
    }
    const parsed = confirmSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(422).json({ error: { code: "VALIDATION_FAILED", message: "Invalid photo." } });
      return;
    }

    try {
      await assertReportPhotoAccess(database, parsed.data.reportId, session.user.id);
      const uploaded = await storage.confirmUpload({
        ...parsed.data,
        uploadedById: session.user.id,
        expectedContentType: parsed.data.contentType,
        expectedSizeBytes: parsed.data.sizeBytes,
      });
      const photo = await database.photo.create({
        data: {
          reportId: parsed.data.reportId,
          kind: parsed.data.kind,
          r2Key: uploaded.key,
          contentType: uploaded.contentType ?? parsed.data.contentType,
          sizeBytes: uploaded.sizeBytes ?? parsed.data.sizeBytes,
          uploadedById: session.user.id,
        },
        select: { id: true, kind: true, contentType: true, sizeBytes: true },
      });
      response.status(201).json({ photo });
    } catch (error) {
      if (response.headersSent) return;
      if (error instanceof PhotoNotFoundError || error instanceof InvalidPhotoError) {
        response.status(422).json({ error: { code: "VALIDATION_FAILED", message: error.message } });
        return;
      }
      console.error("Photo confirmation failed", { errorName: error instanceof Error ? error.name : "unknown" });
      response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Photo confirmation failed." } });
    }
  });

  router.get("/:id/url", async (request, response) => {
    const session = await getSession(request.headers);
    if (!session) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in first." } });
      return;
    }
    try {
      const photo = await database.photo.findUnique({
        where: { id: request.params.id },
        select: { r2Key: true, reportId: true },
      });
      if (!photo?.reportId) throw new PhotoNotFoundError();
      await assertReportPhotoAccess(database, photo.reportId, session.user.id);
      response.json({ url: await storage.createReadUrl(photo.r2Key), expiresIn: 300 });
    } catch (error) {
      if (response.headersSent) return;
      if (error instanceof PhotoNotFoundError) {
        response.status(404).json({ error: { code: "NOT_FOUND", message: "Photo not found." } });
        return;
      }
      console.error("Photo URL request failed", { errorName: error instanceof Error ? error.name : "unknown" });
      response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Photo is unavailable." } });
    }
  });

  return router;
}
