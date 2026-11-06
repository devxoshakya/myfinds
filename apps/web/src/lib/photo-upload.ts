import { z } from "zod";

const photoResponseSchema = z.object({
  photo: z.object({
    id: z.string(),
    kind: z.enum(["ITEM", "PROOF"]),
    contentType: z.string(),
    sizeBytes: z.number(),
  }),
});

const uploadResponseSchema = z.object({
  photoId: z.string().uuid(),
  key: z.string(),
  uploadUrl: z.string().url(),
});

function getApiUrl(path: string) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  if (!serverUrl) throw new Error("The report service URL is not configured.");
  return `${serverUrl.replace(/\/$/, "")}${path}`;
}

async function stripMetadata(file: File) {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, file.type, file.type === "image/jpeg" ? 0.9 : undefined),
  );
  if (!blob) throw new Error(`Could not process ${file.name}.`);
  return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
}

async function parseResponse(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null &&
      "message" in body.error &&
      typeof body.error.message === "string"
        ? body.error.message
        : "Photo upload failed.";
    throw new Error(message);
  }
  return body;
}

export async function uploadReportPhoto(
  reportId: string,
  file: File,
  kind: "ITEM" | "PROOF",
  request: typeof fetch = fetch,
) {
  const processed = await stripMetadata(file);
  const presignResponse = await request(getApiUrl("/api/photos/presign"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportId,
      kind,
      contentType: processed.type,
      sizeBytes: processed.size,
    }),
  });
  const presigned = uploadResponseSchema.parse(await parseResponse(presignResponse));

  const uploadResponse = await request(presigned.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": processed.type,
      "Content-Length": String(processed.size),
    },
    body: processed,
  });
  if (!uploadResponse.ok) throw new Error(`Could not upload ${file.name}.`);

  const confirmResponse = await request(getApiUrl("/api/photos/confirm"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportId,
      photoId: presigned.photoId,
      key: presigned.key,
      kind,
      contentType: processed.type,
      sizeBytes: processed.size,
    }),
  });
  return photoResponseSchema.parse(await parseResponse(confirmResponse)).photo;
}
