import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Database } from "@myfinds/db";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const SIGNED_READ_SECONDS = 5 * 60;
const SIGNED_UPLOAD_SECONDS = 15 * 60;

const allowedTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type PhotoContentType = keyof typeof allowedTypes;
export type PhotoKind = "ITEM" | "PROOF";

export class InvalidPhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPhotoError";
  }
}

export class PhotoNotFoundError extends Error {
  constructor() {
    super("Photo not found.");
    this.name = "PhotoNotFoundError";
  }
}

type PhotoStorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

function createStorageClient(config: PhotoStorageConfig) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    // Supabase (and most S3-compatible stores) only serve path-style URLs;
    // virtual-hosted-style addressing fails TLS/DNS on their hosts.
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function validatePhotoInput(
  kind: string,
  contentType: string,
  sizeBytes: number,
): asserts contentType is PhotoContentType {
  if (kind !== "ITEM" && kind !== "PROOF") {
    throw new InvalidPhotoError("Unsupported photo kind.");
  }
  if (!(contentType in allowedTypes)) {
    throw new InvalidPhotoError("Choose a JPEG, PNG, or WebP image.");
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_PHOTO_BYTES) {
    throw new InvalidPhotoError("Each photo must be between 1 byte and 5 MB.");
  }
}

function extensionFor(contentType: PhotoContentType) {
  return allowedTypes[contentType];
}

export function createPhotoStorage(config: PhotoStorageConfig) {
  const client = createStorageClient(config);

  return {
    async createUploadUrl(input: {
      reportId: string;
      kind: PhotoKind;
      contentType: string;
      sizeBytes: number;
    }) {
      validatePhotoInput(input.kind, input.contentType, input.sizeBytes);
      const photoId = randomUUID();
      const key = `reports/${input.reportId}/${input.kind.toLowerCase()}/${photoId}.${extensionFor(input.contentType)}`;
      const command = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        ContentType: input.contentType,
        ContentLength: input.sizeBytes,
      });

      return {
        photoId,
        key,
        uploadUrl: await getSignedUrl(client, command, { expiresIn: SIGNED_UPLOAD_SECONDS }),
        expiresIn: SIGNED_UPLOAD_SECONDS,
      };
    },

    async confirmUpload(input: {
      reportId: string;
      photoId: string;
      key: string;
      kind: PhotoKind;
      uploadedById: string;
      expectedContentType: PhotoContentType;
      expectedSizeBytes: number;
    }) {
      validatePhotoInput(input.kind, input.expectedContentType, input.expectedSizeBytes);
      if (!input.key.startsWith(`reports/${input.reportId}/${input.kind.toLowerCase()}/`)) {
        throw new InvalidPhotoError("The upload does not belong to this report.");
      }
      if (!input.key.includes(`/${input.photoId}.`)) {
        throw new InvalidPhotoError("The upload identifier does not match the requested photo.");
      }

      const head = await client.send(
        new HeadObjectCommand({ Bucket: config.bucketName, Key: input.key }),
      );
      if (
        head.ContentType !== input.expectedContentType ||
        head.ContentLength !== input.expectedSizeBytes
      ) {
        throw new InvalidPhotoError("The uploaded file failed validation.");
      }

      return { key: input.key, contentType: head.ContentType, sizeBytes: head.ContentLength };
    },

    async createReadUrl(key: string) {
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: config.bucketName, Key: key }),
        { expiresIn: SIGNED_READ_SECONDS },
      );
    },

    async deleteObject(key: string) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }));
    },
  };
}

export type PhotoStorage = ReturnType<typeof createPhotoStorage>;

import { ENV } from "../env.server";

/**
 * Storage built straight from env, for routers that need to sign read URLs
 * (photo display) without plumbing a client through app.ts. Null when photo
 * storage is not configured.
 */
export function createEnvPhotoStorage(): PhotoStorage | null {
  return ENV.S3_ENDPOINT &&
    ENV.S3_ACCESS_KEY_ID &&
    ENV.S3_SECRET_ACCESS_KEY &&
    ENV.S3_BUCKET_NAME
    ? createPhotoStorage({
        endpoint: ENV.S3_ENDPOINT,
        region: ENV.S3_REGION || "auto",
        accessKeyId: ENV.S3_ACCESS_KEY_ID,
        secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
        bucketName: ENV.S3_BUCKET_NAME,
      })
    : null;
}

export async function assertReportPhotoAccess(
  database: Database,
  reportId: string,
  userId: string,
) {
  const report = await database.report.findUnique({
    where: { id: reportId },
    select: { reporterId: true },
  });
  if (!report || report.reporterId !== userId) throw new PhotoNotFoundError();
}
