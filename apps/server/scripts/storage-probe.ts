// E2E probe of the real photo storage service against Supabase S3:
// presign upload -> PUT -> head-validate -> signed read -> delete.
// Run with: bun run scripts/storage-probe.ts
import { createPhotoStorage } from "../src/services/photos";
import { ENV } from "../src/env.server";

const storage = createPhotoStorage({
  endpoint: ENV.S3_ENDPOINT ?? "",
  region: ENV.S3_REGION || "auto",
  accessKeyId: ENV.S3_ACCESS_KEY_ID ?? "",
  secretAccessKey: ENV.S3_SECRET_ACCESS_KEY ?? "",
  bucketName: ENV.S3_BUCKET_NAME ?? "",
});

// 1x1 transparent PNG
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const contentType = "image/png";
const sizeBytes = png.length;

const upload = await storage.createUploadUrl({
  reportId: "probe-report",
  kind: "ITEM",
  contentType,
  sizeBytes,
});
console.log("presigned PUT ok, key:", upload.key);

const put = await fetch(upload.uploadUrl, {
  method: "PUT",
  body: png,
  headers: { "Content-Type": contentType },
});
console.log("PUT status:", put.status);
if (!put.ok) {
  console.log(await put.text());
  process.exit(1);
}

const confirmed = await storage.confirmUpload({
  reportId: "probe-report",
  photoId: upload.photoId,
  key: upload.key,
  kind: "ITEM",
  uploadedById: "probe",
  expectedContentType: contentType,
  expectedSizeBytes: sizeBytes,
});
console.log("head-validate ok:", confirmed.contentType, confirmed.sizeBytes, "bytes");

const readUrl = await storage.createReadUrl(upload.key);
const read = await fetch(readUrl);
console.log("signed GET status:", read.status, "bytes:", (await read.arrayBuffer()).byteLength);

await storage.deleteObject(upload.key);
console.log("delete ok — probe object removed");
