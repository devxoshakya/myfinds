# MyFinds: Architecture

> Read `PRD.md` first for behavior and rules (BR-xx, F-xx IDs are referenced here). Read `DESIGN.md` for UI.
> Library APIs change. Where this file names a library API (Better Auth plugins, Serwist, Prisma raw queries), **check the installed version's docs** before coding and keep the intent.

## 1. Overview

One Next.js app (UI plus API route handlers) in a Turborepo, deployed on Vercel. PostgreSQL via Prisma. Photos in Cloudflare R2 through presigned URLs. Redis for counters and rate limits. SendGrid for email, Twilio for SMS. Vercel Cron for scheduled jobs. No AI in the MVP.

```
Browser (Next.js PWA)
   |  HTTPS: route handlers + server actions (Better Auth session cookie)
   v
apps/web (Vercel serverless)
   |-- Prisma --------> PostgreSQL (pooled URL; direct URL for migrations)
   |-- S3 SDK --------> Cloudflare R2 (private bucket; browser uploads directly via presigned PUT)
   |-- Redis ---------> rate limits, OTP/answer/code attempt counters, short locks
   |-- SendGrid/Twilio -> email / SMS
Vercel Cron -> /api/cron/* (secret header) -> expiry, reminders, rematch, photo cleanup
```

## 2. Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Node 22 LTS, TypeScript (strict) | pnpm workspaces |
| Monorepo | Turborepo | See section 3 |
| Web | Next.js (App Router), React, Tailwind CSS, shadcn/ui | Pin versions in lockfile |
| Auth | Better Auth | Email+password, Google, phone-number OTP, role field |
| DB | PostgreSQL + Prisma | Raw SQL for search and matching; extensions `pg_trgm` |
| Storage | Cloudflare R2 via `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` | Private bucket |
| Cache/limits | Redis (Upstash, HTTP client) | Better Auth `secondaryStorage` can share it |
| Email / SMS | SendGrid / Twilio | SMS only for OTP and handover codes |
| Validation | Zod | Shared client and server schemas |
| Forms | React Hook Form + `@hookform/resolvers/zod` | |
| Data fetching | TanStack Query for client reads; server components for first load | |
| PWA | Serwist | Cache shell only |
| Tests | Vitest (unit, integration), Playwright (e2e) | |
| Lint/format | ESLint, Prettier | Enforced in CI |

## 3. Repository layout

```
myfinds/
  apps/
    web/
      src/
        app/
          (public)/page.tsx                 # Landing
          (auth)/login, signup, verify
          (app)/report/lost, report/found
          (app)/reports/page.tsx            # My Reports list
          (app)/reports/[id]/page.tsx       # Report Status
          (app)/reports/[id]/matches/page.tsx
          (app)/station/...                 # Staff dashboard
          (app)/admin/...                   # Admin
          api/...                           # Route handlers (section 7)
        server/
          services/                         # All business logic (reports, matching, claims, handover, notifications, photos)
          db.ts, redis.ts, r2.ts, mail.ts, sms.ts, auth.ts
        components/                         # App-specific components
        lib/                                # client helpers
      public/ (manifest, icons)
      sw.ts                                  # Serwist service worker
  packages/
    db/         prisma/schema.prisma, migrations, seed/ (places.csv, seed.ts)
    shared/     zod schemas, enums, config.ts, permissions.ts (can()), status machine, scoring helpers
    ui/         shadcn components and design tokens
    config/     tsconfig, eslint, tailwind preset
  turbo.json  pnpm-workspace.yaml  vercel.json  .env.example
```

**Rules.** Route handlers are thin: authenticate, validate with Zod, call a service, serialize. Business logic lives in `server/services`. Permission checks call `can()` from `packages/shared`. Serialization of any report or photo for a viewer goes through one `toViewerReport(report, viewer)` function (section 13).

## 4. Environment variables (`.env.example`)

```
DATABASE_URL=            # pooled connection
DIRECT_URL=              # direct connection, migrations only
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GOOGLE_CLIENT_ID= / GOOGLE_CLIENT_SECRET=
R2_ACCOUNT_ID= / R2_ACCESS_KEY_ID= / R2_SECRET_ACCESS_KEY= / R2_BUCKET= 
REDIS_URL= / REDIS_TOKEN=
SENDGRID_API_KEY= / EMAIL_FROM=
TWILIO_ACCOUNT_SID= / TWILIO_AUTH_TOKEN= / TWILIO_FROM= (or TWILIO_MESSAGING_SERVICE_SID=)
HANDOVER_CODE_KEY=       # 32 bytes base64, AES-256-GCM
CRON_SECRET=             # Vercel sends it as Authorization: Bearer
ADMIN_EMAIL=             # seed creates this admin
NEXT_PUBLIC_APP_URL=
```

## 5. Data model

Better Auth owns `user`, `session`, `account`, `verification`. Generate them with the Better Auth CLI, then keep the extensions below. Phone fields follow the phone-number plugin's names (verify against the installed version).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role { USER STATION_STAFF ADMIN }
enum PlaceType { METRO RAILWAY BUS_STOP }
enum ReportType { LOST FOUND }
enum Custodian { FINDER STATION }
enum Category { PHONE WALLET KEYS BAG ID_CARD LAPTOP HEADPHONES CLOTHING OTHER }
enum ReportStatus {
  SUBMITTED
  SUBMITTED_TO_STOP
  RECEIVED_BY_STOP
  MATCHING
  MATCH_FOUND
  CLAIMED
  VERIFIED
  RETURNED
  EXPIRED
  WITHDRAWN
}
enum MatchStatus { SUGGESTED CLAIMED REJECTED LOCKED DISMISSED VERIFIED COMPLETED }
enum ClaimDecision { PENDING APPROVED REJECTED }
enum PhotoKind { ITEM PROOF CLAIM_PROOF }
enum Channel { EMAIL SMS }
enum DeliveryStatus { QUEUED SENT FAILED }

model User {
  id                  String   @id
  name                String
  email               String   @unique
  emailVerified       Boolean  @default(false)
  image               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  role                Role     @default(USER)
  phoneNumber         String?  @unique
  phoneNumberVerified Boolean  @default(false)

  reports       Report[]
  claims        Claim[]
  staffAt       StationStaff[]
  history       StatusHistory[]
  notifications Notification[]
  // plus Better Auth relations (sessions, accounts)
}

model State {
  id     String @id @default(cuid())
  name   String @unique
  cities City[]
}

model City {
  id       String    @id @default(cuid())
  stateId  String
  name     String
  state    State     @relation(fields: [stateId], references: [id])
  stations Station[]
  @@unique([stateId, name])
}

model Station {
  id           String    @id @default(cuid())
  cityId       String
  placeType    PlaceType
  name         String
  counterHours String?
  addressNote  String?
  active       Boolean   @default(true)
  city         City      @relation(fields: [cityId], references: [id])
  staff        StationStaff[]
  reportsAt    Report[]  @relation("PlaceStation")
  reportsHeld  Report[]  @relation("CustodyStation")
  @@unique([cityId, placeType, name])
  @@index([cityId, placeType])
}

model StationStaff {
  userId    String
  stationId String
  addedById String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  station   Station  @relation(fields: [stationId], references: [id])
  @@id([userId, stationId])
}

model Report {
  id               String       @id @default(cuid())
  number           Int          @unique @default(autoincrement())   // shown as MF-<number>
  type             ReportType
  reporterId       String
  title            String
  category         Category
  description      String?
  color            String?
  brand            String?
  eventDate        DateTime     @db.Date
  eventTime        String?                                     // optional "HH:mm", informational only
  placeStationId   String
  placeNote        String?
  status           ReportStatus
  needsAttention   Boolean      @default(false)
  expiresAt        DateTime
  closedAt         DateTime?
  // found-only
  custodian        Custodian?
  custodyStationId String?
  receivedById     String?
  receivedAt       DateTime?
  storageRef       String?                                     // shelf or bin label, set by staff
  walkInNote       String?
  searchVector     Unsupported("tsvector")?                    // generated column, see raw migration
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  reporter         User         @relation(fields: [reporterId], references: [id])
  placeStation     Station      @relation("PlaceStation", fields: [placeStationId], references: [id])
  custodyStation   Station?     @relation("CustodyStation", fields: [custodyStationId], references: [id])
  photos           Photo[]
  questions        VerificationQuestion[]
  lostMatches      Match[]      @relation("LostSide")
  foundMatches     Match[]      @relation("FoundSide")
  history          StatusHistory[]

  @@index([type, category, status, expiresAt])
  @@index([reporterId])
  @@index([custodyStationId, status])
}

model Photo {
  id          String    @id @default(cuid())
  kind        PhotoKind
  reportId    String?
  claimId     String?
  r2Key       String    @unique
  contentType String
  sizeBytes   Int
  position    Int       @default(0)
  uploadedById String
  createdAt   DateTime  @default(now())
  deletedAt   DateTime?
  report      Report?   @relation(fields: [reportId], references: [id])
  claim       Claim?    @relation(fields: [claimId], references: [id])
}

model VerificationQuestion {
  id             String @id @default(cuid())
  reportId       String
  position       Int
  question       String
  expectedAnswer String          // visible only to custodian, station staff, admin
  report         Report @relation(fields: [reportId], references: [id])
  @@unique([reportId, position])
}

model Match {
  id             String      @id @default(cuid())
  lostReportId   String
  foundReportId  String
  score          Float
  scoreBreakdown Json        // { place, text, date, attributes }
  status         MatchStatus @default(SUGGESTED)
  attemptsUsed   Int         @default(0)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  lost           Report      @relation("LostSide", fields: [lostReportId], references: [id])
  found          Report      @relation("FoundSide", fields: [foundReportId], references: [id])
  claims         Claim[]
  @@unique([lostReportId, foundReportId])
  @@index([foundReportId, status])
}

model Claim {
  id                String        @id @default(cuid())
  matchId           String
  claimantId        String
  attemptNo         Int
  answers           Json          // [{ questionId | null, text }]
  decision          ClaimDecision @default(PENDING)
  decidedById       String?
  decidedAt         DateTime?
  decisionNote      String?
  handoverCodeEnc   String?       // AES-256-GCM ciphertext (see section 9)
  handoverExpiresAt DateTime?
  handedOverById    String?
  handedOverAt      DateTime?
  handoverIdType    String?       // station handover: type of ID checked, never the number
  createdAt         DateTime      @default(now())
  match             Match         @relation(fields: [matchId], references: [id])
  claimant          User          @relation(fields: [claimantId], references: [id])
  photos            Photo[]
  @@unique([matchId, attemptNo])
}

model StatusHistory {            // append-only, enforced by trigger
  id         String        @id @default(cuid())
  reportId   String
  fromStatus ReportStatus?
  toStatus   ReportStatus?
  actorId    String?                 // null for system
  actorRole  String                  // USER | STATION_STAFF | ADMIN | SYSTEM
  action     String                  // e.g. CREATED, RECEIPT_CONFIRMED, CLAIM_APPROVED, CUSTODY_REASSIGNED
  note       String?
  createdAt  DateTime      @default(now())
  report     Report        @relation(fields: [reportId], references: [id])
  actor      User?         @relation(fields: [actorId], references: [id])
  @@index([reportId, createdAt])
}

model Notification {
  id        String         @id @default(cuid())
  userId    String
  channel   Channel
  template  String
  providerMessageId String?
  status    DeliveryStatus @default(QUEUED)
  error     String?
  createdAt DateTime       @default(now())
  user      User           @relation(fields: [userId], references: [id])
}
```

**Raw SQL migration** (create with `prisma migrate dev --create-only`, then edit):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Report" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce("title",'')), 'A') ||
  setweight(to_tsvector('simple', coalesce("brand",'') || ' ' || coalesce("color",'')), 'B') ||
  setweight(to_tsvector('simple', coalesce("description",'')), 'C')
) STORED;
CREATE INDEX report_search_idx ON "Report" USING GIN ("searchVector");
CREATE INDEX report_title_trgm_idx ON "Report" USING GIN ("title" gin_trgm_ops);

CREATE FUNCTION forbid_update_delete() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'StatusHistory is append-only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER status_history_append_only
  BEFORE UPDATE OR DELETE ON "StatusHistory"
  FOR EACH ROW EXECUTE FUNCTION forbid_update_delete();
```

If Prisma's `Unsupported` column causes migration drift, keep the column only in the raw migration and mark it with `@ignore`-style handling per the Prisma version in use.

## 6. Auth and permissions

**Better Auth setup (intent).** Prisma adapter; email+password with email verification; Google provider; phone-number plugin with OTP sent through Twilio; `user.additionalFields.role` (default `USER`, `input: false` so clients cannot set it); the Next.js cookie plugin; Redis as secondary storage for sessions and rate limits. Session helper `requireUser()` returns `{ id, role, emailVerified, phoneNumberVerified, stationIds[] }` (stationIds loaded from `StationStaff`).

**Verified gate.** `requireVerifiedUser()` = `requireUser()` plus both verifications true, else 403 `NOT_VERIFIED`. Used by every mutating report or claim route (BR-14).

**`can(user, action, ctx)`** in `packages/shared/src/permissions.ts` is the only place permissions are decided. `ctx` carries the relevant report, match, claim, and station ids. Actions and rules:

| Action | USER | STATION_STAFF | ADMIN |
| --- | --- | --- | --- |
| `report:create` (lost, found-by-finder) | verified | verified | yes |
| `report:create_dropoff` | no | for own stations | yes |
| `report:read` | own reports; found report only when they own a lost report with an active match to it | own plus any report with `custodyStationId` or `placeStationId` in own stations | all |
| `report:update` / `report:withdraw` | own, before `VERIFIED` | own, plus held items (edit questions, `storageRef`) | all |
| `report:receive` | no | own custody stations | yes |
| `match:read` | matches of own lost report | matches of items held at own stations | all |
| `match:dismiss` | own lost report's match | no | yes |
| `claim:create` | owner of the lost report, match `SUGGESTED` | same as USER | yes |
| `claim:decide` | only when custodian is `FINDER` and they are that finder | own custody stations | yes |
| `claim:handover` | same as `claim:decide` | own custody stations | yes |
| `claim:reissue_code` | owner of the claim, or the custodian | own custody stations | yes |
| `match:unlock` | no | own custody stations | yes (only role for finder custody) |
| `photo:read` | per BR-13 | per BR-13 | all |
| `photo:remove` | own uploads before `VERIFIED` | held items | all |
| `custody:reassign` | no | no | yes |
| `places:manage`, `staff:manage` | no | no | yes |

Tests: one test per action and role combination, including negative cases.

## 7. API contract

All routes are under `apps/web/src/app/api`. JSON in and out. Validate with Zod schemas exported from `packages/shared`. Error body for every failure:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Human readable", "fields": { "title": "Required" } } }
```

Codes: `UNAUTHENTICATED` 401, `NOT_VERIFIED` 403, `FORBIDDEN` 403, `NOT_FOUND` 404, `VALIDATION_FAILED` 422, `CONFLICT` 409, `RATE_LIMITED` 429, `CLAIM_LOCKED` 423, `CODE_INVALID` 400, `CODE_EXPIRED` 410.

| Method and path | Who | Request (summary) | Response (summary) |
| --- | --- | --- | --- |
| `/api/auth/*` | public | Better Auth handler | |
| `GET /api/places?cityId=&placeType=&q=` | public | Query filters; no filters returns states and cities | States, cities, or stations (id, name, placeType, counterHours) |
| `POST /api/uploads/sign` | verified | `{ kind, contentType, sizeBytes, reportId? , claimId? }` | `{ uploadUrl, r2Key, expiresAt }` |
| `POST /api/uploads/confirm` | verified | `{ r2Key }` | Photo row (after server HEAD check) |
| `GET /api/photos/:id/url` | per BR-13 | none | `{ url, expiresAt }` (5 min) |
| `POST /api/reports` | verified, drop-off for staff | `CreateLostReport` or `CreateFoundReport` (includes place ids, custody choice, questions, photo keys) | `{ report, matchesCount }` |
| `GET /api/reports/mine` | user | `?status=&type=` | List of own reports (viewer-serialized) |
| `GET /api/reports/:id` | per `report:read` | none | Report, timeline, next action, custodian panel data (only if allowed) |
| `PATCH /api/reports/:id` | per `report:update` | Partial fields, or `{ withdraw: true }` | Updated report |
| `POST /api/reports/:id/receive` | staff, admin | `{ storageRef? }` | Updated report |
| `GET /api/reports/:id/matches` | owner, staff, admin | none | Matches with comparison data and breakdown |
| `POST /api/matches/:id/dismiss` | owner | none | Match |
| `POST /api/matches/:id/claim` | owner | `{ answers[], claimPhotoKeys[], confirm: true }` | Claim; 423 if locked |
| `POST /api/claims/:id/decision` | custodian | `{ decision: "APPROVED" \| "REJECTED", note? }` | Claim (+ code metadata if approved) |
| `POST /api/claims/:id/reissue-code` | owner, custodian | none | `{ expiresAt }` (code sent by SMS and email) |
| `POST /api/claims/:id/handover` | custodian | `{ code, idType? }` | Both reports `RETURNED` |
| `GET /api/station/items?tab=awaiting\|held\|claims` | staff | none | Items for own stations |
| `POST /api/matches/:id/unlock` | staff of station, admin | `{ note }` | Match back to `SUGGESTED`, attempts reset |
| `GET/POST/PATCH /api/admin/places`, `/api/admin/staff` | admin | CRUD | |
| `POST /api/admin/reports/:id/custody` | admin | `{ custodian, custodyStationId?, note }` | Report |
| `GET /api/stats/public` | public | none | `{ reported, returned, stations }` (cached 5 min) |
| `GET /api/cron/{expire,remind,rematch,cleanup}` | cron secret | none | `{ processed }` |

Rate limits (Redis): OTP resend 3 per 10 min per user; claim submit 10 per hour per user; handover code attempts 5 per hour per claim; uploads sign 60 per hour per user; auth endpoints per Better Auth defaults.

## 8. Core flows

**Create report (`POST /api/reports`).** One Prisma transaction: insert report with `expiresAt = now + REPORT_TTL_DAYS`, insert photos (from confirmed keys), insert questions, insert `StatusHistory` (`CREATED`). Set initial status per PRD section 6. After commit: if matchable, run matching (section 10), set `MATCHING` or `MATCH_FOUND` with history rows, send notifications. Notification failures never fail the request.

**Receive (`POST /api/reports/:id/receive`).** Check `report:receive`; set `RECEIVED_BY_STOP`, `receivedById`, `receivedAt`, `storageRef`; clear `needsAttention`; history; run matching.

**Claim.** In a transaction: lock the match row (`SELECT ... FOR UPDATE`); check status `SUGGESTED` or `CLAIMED`-with-attempts-left; check `attemptsUsed < MAX_CLAIM_ATTEMPTS`; insert `Claim` with `attemptNo = attemptsUsed + 1`; set match `CLAIMED`; set both reports `CLAIMED`; history; email custodian.

**Decide.**
- Approve: check no other claim on this found report is already `APPROVED`; set claim `APPROVED`; generate code (section 9); match `VERIFIED`; both reports `VERIFIED`; all other `SUGGESTED` or `CLAIMED` matches on the found report become `DISMISSED` and their lost reports return to `MATCHING` or `MATCH_FOUND`; notify; for finder custody release contact (BR-23).
- Reject: claim `REJECTED`; `attemptsUsed++`; if `attemptsUsed >= MAX_CLAIM_ATTEMPTS` match `LOCKED` and notify; else match `SUGGESTED`, reports back to `MATCH_FOUND`.

**Handover.** Check Redis attempt counter; decrypt and constant-time compare the code; check expiry; transaction: claim `handedOverAt/By/idType`, match `COMPLETED`, both reports `RETURNED` with `closedAt`, history, notify both.

All status writes go through one `transition(report, to, actor, action, note)` function that validates against the allowed-transition table from PRD section 6 and writes `StatusHistory`.

## 9. Handover code handling

- Generate with `crypto.randomInt(0, 1_000_000)`, zero-padded to 6 digits.
- Store `handoverCodeEnc` = AES-256-GCM(`HANDOVER_CODE_KEY`, code) with random IV; format `iv.tag.ciphertext` base64. Encryption (not a one-way hash) because the owner's Report Status page must show the code again. A 6-digit code is too small to protect with hashing anyway; protection comes from expiry, encryption at rest, and the attempt limit.
- Show the code only to the claimant (and only while `VERIFIED` and unexpired). Never log it. Send by SMS and email once on issue and on reissue.
- Verify with `crypto.timingSafeEqual`. Reissue replaces `handoverCodeEnc` and `handoverExpiresAt` and resets the Redis attempt counter.

## 10. Matching

Service `matchReport(reportId)`: load the report, compute the allowed date range, run the query below, and upsert `Match` rows (unique on the lost/found pair). Matches that no longer qualify and are still `SUGGESTED` are dismissed on rematch.

For a **lost** report the candidates are found reports; for a **found** report the candidates are lost reports. The app computes `$minDate` and `$maxDate` for the *candidate's* event date: for a lost report with date L candidates are found with date in `[L - 1 day, L + window]`; for a found report with date F candidates are lost with date in `[F - window, F + 1 day]`.

```sql
WITH me AS (
  SELECT r.id, r.title, r.category, r.color, r.brand, r."eventDate", s."cityId", s.id AS station_id, s."placeType"
  FROM "Report" r JOIN "Station" s ON s.id = r."placeStationId"
  WHERE r.id = $1
)
, scored AS (
  SELECT c.id AS candidate_id,
    CASE WHEN cs.id = me.station_id THEN 1.0
         WHEN cs."placeType" = me."placeType" THEN 0.5
         ELSE 0.2 END AS place_score,
    LEAST(1.0, 0.6 * similarity(c.title, me.title)
              + 0.4 * CASE WHEN $2 = '' THEN 0
                           ELSE ts_rank_cd(c."searchVector", to_tsquery('simple', $2), 32) END) AS text_score,
    GREATEST(0.0, 1.0 - ABS(c."eventDate" - me."eventDate")::float / $3) AS date_score,
    (CASE WHEN me.color IS NOT NULL AND lower(c.color) = lower(me.color) THEN 0.5 ELSE 0 END
   + CASE WHEN me.brand IS NOT NULL AND lower(c.brand) = lower(me.brand) THEN 0.5 ELSE 0 END) AS attr_score
  FROM me
  JOIN "Report" c ON c.type = $4::"ReportType" AND c.category = me.category
  JOIN "Station" cs ON cs.id = c."placeStationId" AND cs."cityId" = me."cityId"
  WHERE c.status IN ('SUBMITTED','MATCHING','MATCH_FOUND','RECEIVED_BY_STOP','CLAIMED')
    AND c."expiresAt" > now()
    AND c."eventDate" BETWEEN $5 AND $6
    AND c.id <> me.id
)
SELECT candidate_id, place_score, text_score, date_score, attr_score,
       0.30 * place_score + 0.30 * text_score + 0.20 * date_score + 0.20 * attr_score AS total
FROM scored
WHERE 0.30 * place_score + 0.30 * text_score + 0.20 * date_score + 0.20 * attr_score >= $7
ORDER BY total DESC
LIMIT $8;
```

Parameters: `$1` report id, `$2` tsquery string, `$3` `MATCH_DATE_WINDOW_DAYS`, `$4` opposite type (`LOST` or `FOUND`), `$5`/`$6` candidate date range, `$7` `MATCH_MIN_SCORE`, `$8` `MATCH_MAX_PER_REPORT`. `$2` is built in app code from sanitized tokens of the report's title, brand, color, and description joined with ` | ` (letters and digits only; pass an empty string when there are none). Use `$queryRaw` with parameters only; never string-interpolate. Store the four sub-scores in `Match.scoreBreakdown`. When the SQL is joined to the `me` CTE as written above, the first line of the block (`WITH me AS (...)`) is followed directly by `, scored AS (...)`.

Found reports in `SUBMITTED_TO_STOP` are excluded by the status filter, which implements BR-04.

Golden tests: fixtures under `packages/shared/test/match-fixtures.ts` with expected ordering and scores within 0.01.

## 11. Photos (R2)

- Key format: `reports/{reportId}/{kind}/{uuid}.{ext}` and `claims/{claimId}/{uuid}.{ext}`.
- `POST /api/uploads/sign` checks the permission, count limit for the kind, content type, and size, then returns a presigned PUT URL (5 min) with `Content-Type` and `Content-Length` constraints.
- Bucket CORS: allow `PUT` from the app origin only.
- `POST /api/uploads/confirm` does a `HeadObject`, verifies size and type, and creates the `Photo` row. Unconfirmed objects older than 24 h are deleted by the cleanup job.
- Client: resize to max 1600 px on the long edge and re-encode through canvas (this removes EXIF) before upload.
- Reads: `GET /api/photos/:id/url` runs `can('photo:read')` and returns a 5-minute signed GET URL. Never expose raw keys or bucket URLs.

## 12. Notifications and jobs

**Messaging.** `server/services/notify.ts` exposes `notify(event, payload)`. Each event maps to templates (React Email or plain HTML for SendGrid; short text for Twilio). Each send writes a `Notification` row. SMS templates exist only for OTP and handover code. If sending to Indian numbers, Twilio needs sender and template registration (DLT) before delivery works; start that early.

**Cron** (`vercel.json`, all `GET`, all check `Authorization: Bearer $CRON_SECRET`, all idempotent):

| Path | Schedule (UTC) | Does |
| --- | --- | --- |
| `/api/cron/expire` | daily 20:30 | Expire reports past `expiresAt` (not `VERIFIED`/`RETURNED`); dismiss their matches; send 7-day warnings |
| `/api/cron/remind` | daily 03:00 | Email station staff for items in `SUBMITTED_TO_STOP` older than 3 days; set `needsAttention` |
| `/api/cron/rematch` | daily 21:00 | Re-run matching for matchable reports created in the last `MATCH_DATE_WINDOW_DAYS` days |
| `/api/cron/cleanup` | daily 22:00 | Delete photos for reports closed more than 30 days ago; delete orphan uploads; retry `FAILED` notifications once |

Check the hosting plan's cron limits; if daily frequency is the maximum, this table is already within it.

## 13. Security and privacy checklist

1. **One serializer.** `toViewerReport(report, viewer)` is the only way reports leave the server. It strips `expectedAnswer`, `PROOF` photos, `handoverCodeEnc`, other users' email and phone, `walkInNote` (for non-staff), and internal fields unless `can()` allows them. Unit test that each role sees exactly the allowed fields.
2. **Contact release** happens in one function `getCounterpartContact(claim, viewer)` that returns data only for an `APPROVED` claim with finder custody (BR-23).
3. Server-side Zod validation on every input; never trust client-sent role, status, or custody fields.
4. Role is not client-settable. Only admin routes change `role` or `StationStaff`.
5. Every staff and admin mutation writes `StatusHistory` with actor and note.
6. Claim attempts, OTP tries, and code tries are counted server-side (DB for claim attempts, Redis for rate counters).
7. Cron routes reject requests without the secret.
8. Secrets only in env vars. No PII or codes in logs.
9. Security headers via `next.config` (CSP restricting script origins, `frame-ancestors 'none'`, `Referrer-Policy`).
10. Dependency audit in CI.

## 14. PWA

Serwist service worker: precache the app shell and static assets; stale-while-revalidate for `GET /api/places` only; network-only for everything else under `/api`; an offline fallback page. Never cache authenticated responses or photo URLs. Manifest: name "MyFinds", standalone display, monochrome icons (see DESIGN.md).

## 15. Errors, logging, observability

Structured JSON logs (request id, user id, route, duration; no PII). Central `AppError` class maps to the error body in section 7. Optional Sentry for browser and server errors. Health route `GET /api/health` checks DB and Redis.

## 16. Testing and seed data

- **Unit (Vitest):** `can()`, status transitions, scoring helpers, code encryption, serializer.
- **Integration (Vitest + test database):** matching golden tests, claim attempt locking, approve/dismiss side effects, handover.
- **E2E (Playwright):** (1) finder keeps item, owner claims, handover; (2) finder hands to station, staff confirm receipt, owner claims, staff handover; (3) three wrong claims lock the match; (4) role access denials.
- **Seed (`packages/db/seed/seed.ts`):** one state, city, ~15 stations across the three place types, one admin from `ADMIN_EMAIL`, one staff user linked to two stations, two normal users (verified), and 6 sample reports with photos stubs.

## 17. Build milestones (work packages for agents)

Each milestone ends with passing tests and a deployable app. Do them in order; milestones marked (parallel) can run concurrently after M1.

| # | Milestone | Done when |
| --- | --- | --- |
| M0 | Turborepo, Next.js, Tailwind, shadcn, Prisma, CI, Vercel project, `.env.example` | App deploys; `pnpm build`, lint, and tests run in CI |
| M1 | Schema and migrations (section 5), seed, `packages/shared` (enums, config, `can()`, status machine) | Seed runs; permission and transition tests pass |
| M2 | Better Auth: email, Google, phone OTP, roles, verified gate, login/signup/verify screens | A user can sign up, verify both, and sees role-aware nav |
| M3 (parallel) | Places API, place picker component, admin places screens | Picker works end to end; admin can add a station |
| M4 (parallel) | Photo pipeline: sign, upload, confirm, signed read, uploader component | Upload and view a photo; limits and visibility enforced |
| M5 | Report forms (lost, found, staff drop-off), create-report service, My Reports, Report Status (basic) | F-04, F-05 acceptance pass; history rows written |
| M6 | Matching service and SQL, rematch job, Potential Match screen | Golden tests pass; owner sees ranked matches |
| M7 | Claim, decision, lock, code issue, handover, reissue | F-10, F-11 acceptance pass; e2e flows 1 and 3 pass |
| M8 | Station staff dashboard (receive, held items, claims), custody reassign, admin tools | F-07, F-13 pass; e2e flow 2 passes |
| M9 | Notifications (SendGrid, Twilio, templates), cron jobs, rate limits | F-14, F-15 pass; every event in PRD section 9 sends |
| M10 | Landing page, public stats, PWA, accessibility and polish pass | F-16, F-17 pass; Lighthouse and axe checks clean |

## 18. Later: AI service (not in MVP)

If AI is added, it is a separate Hono service on Cloudflare Workers AI called by the Next.js app with a shared-secret header. Possible endpoints: `POST /embed` (text embedding for a pgvector signal) and `POST /describe` (photo to attributes). The main app must work with it fully disabled, and matching keeps its rule filters as the first stage.

## 19. Conventions for agents

- TypeScript strict; no `any` without a comment. Zod schemas are the single source of types (`z.infer`).
- No business logic in components or route handlers; call services.
- No permission logic outside `can()`. No report serialization outside `toViewerReport`.
- Every PR or change: tests for new rules, migrations for schema changes, and an update to these docs if a rule changes.
- If a rule is ambiguous, follow the **DEFAULT** in PRD section 11 and note the assumption in the PR description.