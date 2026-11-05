# MyFinds: Data Model & Acceptance Criteria

> Companion to `PRD.md` (behavior) and `ARCHITECTURE.md` (structure). This file is the **data
> model documentation** drafted for the Nov 2 plan item: tables, secrets, and field permissions.
> It also collects the **testable acceptance criteria** for the MVP (the plan's example:
> "finder never sees owner's hidden detail" lives in section 4 as AC-PRIV-01).
>
> Adaptation note: this repo uses a bun + Turborepo layout (`apps/web`, `apps/server`,
> `packages/db` with a multi-file Prisma schema at `packages/db/prisma/schema/`). Better Auth
> owns its tables (`user`, `session`, `account`, `verification` — see `auth.prisma`). Where
> ARCHITECTURE.md names a `packages/shared` module, implement the equivalent in this repo
> (`packages/auth` / `apps/server/src/services`).

---

## 1. Overview

Two layers:

1. **Auth layer (owned by Better Auth)** — `user`, `session`, `account`, `verification`. Already
   present in `packages/db/prisma/schema/auth.prisma`. We extend `user` with app fields
   (`role`) via Better Auth `additionalFields`
   (`input: false`, so no client can ever set the role).
2. **App layer (owned by us)** — everything about places, reports, photos, questions, matches,
   claims, history, and notifications.

Core relationships (one line each):

```
State 1—* City 1—* Station 1—* Report (place and/or custody)
User 1—* Report ... Report 1—* Photo / VerificationQuestion / StatusHistory
Report(lost) *—* Report(found) via Match 1—* Claim 1—1 Handover code
User *—* Station via StationStaff (staff scope)
```

---

## 2. Tables

### 2.1 Places (admin-managed, no free text — BR-01)

| Table | Purpose | Key fields | Notes |
| --- | --- | --- | --- |
| `State` | Top of the 4-step place picker | `name` (unique) | |
| `City` | Second step | `stateId`, `name` | unique on `(stateId, name)` |
| `Station` | Metro / railway / bus stop | `cityId`, `placeType` (`METRO`/`RAILWAY`/`BUS_STOP`), `name`, `counterHours`, `addressNote`, `active` | unique on `(cityId, placeType, name)`; inactive stations hidden from pickers |

### 2.2 People and scope

| Table | Purpose | Key fields | Notes |
| --- | --- | --- | --- |
| `user` (Better Auth) | Accounts | `role` (`USER`/`STATION_STAFF`/`ADMIN`, default `USER`, **not client-settable**), `email`, `emailVerified` | Contact details are never exposed cross-user before approval (BR-22) |
| `StationStaff` | Links staff accounts to stations | `(userId, stationId)` PK, `addedById`, `active` | One staff member may belong to several stations; only admin adds staff (PRD §11) |

### 2.3 Reports (the central table)

`Report` — one row per lost or found item.

- Identity: `id` (cuid), `number` (autoincrement, shown to users as `MF-<number>`), `type` (`LOST`/`FOUND`), `reporterId`.
- Private status lookup: `statusTokenHash` (unique SHA-256 hash; nullable for reports created before token support). The raw token is returned only at creation and is never stored or logged.
- Submission idempotency: `ReportIdempotency` stores a reporter-scoped key hash, keyed request fingerprint, linked report, and authenticated ciphertext for the status token so retries can return the original result without storing the bearer token in plaintext. It is committed in the same transaction as the report.
- Item: `title`, `category` (`PHONE`/`WALLET`/`KEYS`/`BAG`/`ID_CARD`/`LAPTOP`/`HEADPHONES`/`CLOTHING`/`OTHER`), `description`, `color`, `brand`, `eventDate` (date), `eventTime` (optional `HH:mm`, informational only).
- Place: `placeStationId` (required), `placeNote` (≤120 chars — platform/gate/coach, BR-01). Never a free-text place.
- Lifecycle: `status` (see below), `needsAttention`, `expiresAt` (creation + `REPORT_TTL_DAYS` = 60, BR-25), `closedAt`.
- Custody (found only): `custodian` (`FINDER`/`STATION`), `custodyStationId`, `receivedById`, `receivedAt`, `storageRef` (shelf/bin label set by staff), `walkInNote` (counter drop-off note, no finder account involved — BR-05).
- Search: `searchVector` (tsvector **generated column**, added by a raw SQL migration alongside `pg_trgm`; keep it out of the Prisma schema if the Prisma version in use drifts).
- History: append-only `StatusHistory` (`fromStatus`, `toStatus`, `actorId`, `actorRole`, `action`, `note`), protected by an append-only trigger. **Never updated or deleted** (explicit constraint).

`Report.status` machine (PRD §6): `SUBMITTED` → `MATCHING`/`SUBMITTED_TO_STOP` → `RECEIVED_BY_STOP` → `MATCH_FOUND` ⇄ `MATCHING` → `CLAIMED` → `VERIFIED` → `RETURNED`; plus `EXPIRED`, `WITHDRAWN`. All writes go through one `transition()` helper validating against the allowed table.

Indexes: `(type, category, status, expiresAt)` for the matching query; `reporterId`; `(custodyStationId, status)` for staff queues.

### 2.4 Photos (private R2, BR-12/BR-13)

| Field | Notes |
| --- | --- |
| `kind` | `ITEM` (≤4, max 1 per claim/report per kind rules), `PROOF` (≤1, found reports only, private), `CLAIM_PROOF` (≤2 per claim) |
| `reportId` / `claimId` | exactly one set |
| `r2Key` | `reports/{reportId}/{kind}/{uuid}.{ext}` or `claims/{claimId}/{uuid}.{ext}` — **never sent to the client** |
| `contentType`, `sizeBytes` | validated against HEAD result on confirm; JPEG/PNG/WebP, ≤5 MB |

Bucket is strictly private. Reads only via `GET /api/photos/:id/url` → 5-minute presigned GET, after a `photo:read` permission check. Upload entry EXIF is stripped by client-side re-encode before upload.

### 2.5 Verification questions (the "hidden detail" store — BR-16)

`VerificationQuestion`: `reportId`, `position` (1–2), `question`, `expectedAnswer`.
- Required when custodian is `FINDER`, optional (staff-editable) when `STATION`.
- If a found report has no questions, the claim form substitutes one required free-text answer ("Describe something only the owner would know").
- `expectedAnswer` is the most sensitive per-row secret; see §3 and the matrix in §5.

### 2.6 Matches and claims

`Match` — unique on `(lostReportId, foundReportId)`.

| Field | Meaning |
| --- | --- |
| `score` | Total weighted score, 0..1 |
| `scoreBreakdown` | JSON `{ place, text, date, attributes }` per BR-09 |
| `status` | `SUGGESTED` → `CLAIMED` → `VERIFIED` → `COMPLETED`; branches: `REJECTED`, `LOCKED`, `DISMISSED` |

Scoring: `0.30 place + 0.30 text + 0.20 date + 0.20 attributes`; keep ≥ `MATCH_MIN_SCORE` (0.50), top `MATCH_MAX_PER_REPORT` (5). Hard filters first (BR-08): opposite type, same category, same city, matchable status set, not expired, date window. Rule-based only — **no AI/vectors in the MVP**.

`Claim` — unique on `(matchId, attemptNo)`.

| Field | Meaning |
| --- | --- |
| `answers` | JSON `[{ questionId | null, text }]` for the submitted attempt |
| `decision` | `PENDING` → `APPROVED` / `REJECTED` |
| `attemptNo` | Server-generated; `MAX_CLAIM_ATTEMPTS` = 3 rejections ⇒ match `LOCKED` (BR-17) |
| `handoverCodeEnc` | 🔒 AES-256-GCM ciphertext of the 6-digit code (§3) |
| `handoverExpiresAt` | Issue + `HANDOVER_CODE_TTL_HOURS` = 48 (BR-19) |
| `handoverIdType` | ID **type** recorded at station handover — never the number (BR-21) |

### 2.7 Notification log

`Notification`: `userId`, `channel` (`EMAIL`), `template`, `providerMessageId`, `status` (`QUEUED`/`SENT`/`FAILED`), `error`. Append-only log for observability; failures never block the request that triggered them. No SMS channel in the MVP.

---

## 3. Secrets inventory & handling rules

| # | Secret | Where it lives | Rules |
| --- | --- | --- | --- |
| S1 | Handover code (6-digit plaintext) | **Never stored.** Generated `crypto.randomInt(0, 1_000_000)`, zero-padded | Shown only to the claimant, only while claim `APPROVED`, match `VERIFIED`, and unexpired. Sent by email at issue/reissue. Never logged, never in any API response for other viewers |
| S2 | `handoverCodeEnc` | `Claim` row | AES-256-GCM with `HANDOVER_CODE_KEY` (32-byte base64 env var), random IV, format `iv.tag.ciphertext` base64. Encrypt-and-decrypt (not hash) because the owner's status page must re-display the code. Verified with `crypto.timingSafeEqual`. Reissue overwrites ciphertext + expiry and resets the Redis attempt counter. **Stripped by the serializer for everyone** |
| S3 | `expectedAnswer` | `VerificationQuestion` row | Visible only to: custodian (finder) of the found report, staff of the custody station, admin. **Never** to the owner/claimant — not even after approval |
| S4 | `PROOF` photos | R2 private bucket + `Photo` row | Never to the claimant, never public; 5-min signed URL only |
| S5 | `walkInNote` | `Report` row | Staff of the station and admin only; hidden from other users |
| S6 | `storageRef` | `Report` row | Staff of the custody station and admin only |
| S7 | Personal contact (`email`) | `user` | Only ever shown to the user themselves. Cross-user: after claim approval **with finder custody**, owner and finder each see the other's first name + email (BR-23). With station custody, nobody sees personal contact — the owner sees station name, counter hours, and the code |
| S8 | R2 object keys / bucket URLs | env + `Photo.r2Key` | Raw keys never leave the server; all reads are 5-min presigned GETs after `can('photo:read')` |
| S9 | Auth passwords / tokens | `account.password` (bcrypt), `session.token` | Owned entirely by Better Auth; httpOnly cookies |
| S10 | SendGrid / R2 / DB / cron secrets | env vars only (varlock-managed in this repo) | No PII, codes, or secrets in logs; cron routes reject requests without `CRON_SECRET` |
| S11 | Private report-status token | Raw token exists only at creation and in the successful response; `Report.statusTokenHash` stores its SHA-256 hash | Generate with a cryptographically secure random source; never log or persist the raw token. Anyone holding it can access the private status lookup. |

Additional model-level enforcement:

- **Append-only:** raw SQL trigger raises on any `UPDATE`/`DELETE` against `StatusHistory`.
- **Server-side counters:** claim attempts counted in DB (`Claim.attemptNo` unique per match), handover-code tries counted in Redis — never client-side.
- **No client trust:** `role`, `status`, `custodian`, `custodyStationId`, custody/decision fields are server-assigned only; every input validated with shared Zod schemas.

---

## 4. Testable acceptance criteria

Grouped by area. Each is phrased to be automatable (unit via Vitest, integration, or Playwright e2e). IDs referenced: BR-xx from PRD §5, F-xx from PRD §7.

### Privacy & serialization (the non-negotiables)

- **AC-PRIV-01** A finder (creator of a found report) never sees the owner's hidden details — `expectedAnswer`, claim `answers` of in-flight claims, or `PROOF` photos — in the UI **or** any network response. *(Unit test on `toViewerReport` + e2e network-leak test.)*
- **AC-PRIV-02** A claimant/owner never sees `expectedAnswer`, `walkInNote`, `storageRef`, `handoverCodeEnc`, or the other party's email at any status. *(Serializer unit tests per role per status.)*
- **AC-PRIV-03** No contact detail crosses users before a claim is `APPROVED` (BR-22); after approval with finder custody, exactly first name + email are visible to the two parties and to nobody else (BR-23). With station custody, no personal contact is ever visible to the counterpart.
- **AC-PRIV-04** Photo URLs are always short-lived (5 min) presigned GETs; no public bucket URL and no raw `r2Key` ever appears in a response, page source, or log. `PROOF` photo access is denied to the claimant with 403. *(Integration test + e2e.)*
- **AC-PRIV-05** Automated leak test greps all API responses (owner, finder, claimant, stranger roles) for seed secret strings — expected answers, code plaintext, contact fields — and finds none outside the allowed viewers.

### Auth, roles & permissions

- **AC-AUTH-01** Unverified user (missing email verification, BR-14) gets a "Verify to continue" screen on `/report/*` and 403 `NOT_VERIFIED` from every mutating report/claim API. *(e2e.)*
- **AC-AUTH-02** A client cannot set `role`, status, custody, or decision fields; posting them is ignored or 422s. *(Integration test posting over-payloaded bodies.)*
- **AC-AUTH-03** Every row of the permission matrix (ARCHITECTURE.md §6) passes for all three roles, including negative cases; a staff member of station A cannot act on station B's items. *(Vitest, one test per action×role cell.)*
- **AC-AUTH-04** Login is email+password only: no social provider buttons or phone-OTP flows exist anywhere in the UI or API surface. *(Code review + e2e signup happy path.)*

### Reports & forms

- **AC-REP-01** Lost form: required fields (name, category, place, date) validate with the same Zod schema on client and server; date is today-or-earlier (no future); failed submit keeps typed values.
- **AC-REP-02** Found form: custody choice is required; finder custody **without** 1–2 questions fails validation (BR-16); station custody creates `SUBMITTED_TO_STOP`; counter drop-off (staff) creates `RECEIVED_BY_STOP` with `walkInNote` and no reporter-required finder identity issue (BR-05).
- **AC-REP-03** Place is selected in exactly 4 steps (State → City → Place type → Station, BR-01); changing a parent resets children; `placeNote` max 120 chars; there is no free-text place anywhere.
- **AC-REP-04** A new report gets `expiresAt = now + 60 days`, an `MF-<number>`, and an append-only `StatusHistory` row (`CREATED`).
- **AC-REP-05** Only the reporter (or admin) can withdraw, only before `VERIFIED`; withdrawn/expired reports are read-only.

### Matching

- **AC-MTC-01** Golden tests on fixture report pairs reproduce expected sub-scores and ordering within ±0.01 per BR-09 (weights 0.30/0.30/0.20/0.20). *(Vitest.)*
- **AC-MTC-02** Hard filters hold: opposite type, same category only, same city only, matchable statuses only, not expired, date window enforced; `SUBMITTED_TO_STOP` found reports are **never** match candidates (BR-04/08). *(Vitest.)*
- **AC-MTC-03** Matching runs on report create, staff receipt confirmation, and edits to category/place/date/title/description (BR-10); results persist in `Match` with `scoreBreakdown`.
- **AC-MTC-04** No AI/vector/geo-distance signal exists anywhere in the code path, and no UI copy claims otherwise (BR-11). *(Code review + copy check.)*

### Claim, verify, handover

- **AC-CLM-01** A claim is only creatable on a `SUGGESTED` match owned by the claimant's own lost report (BR-15); the 2nd concurrent claim is allowed but the first `APPROVED` wins and other matches are auto-`DISMISSED` (pending claims included).
- **AC-CLM-02** Attempts are counted server-side; the 3rd rejection sets the match `LOCKED`; the owner sees a locked banner; unlocking is restricted to staff of the custody station (or admin; admin-only for finder custody) (BR-17).
- **AC-CLM-03** On approval exactly one 6-digit code is issued per active period; it expires after 48 h; the plaintext appears only via email and the **owner's** own status page — never to staff/finder viewers (BR-19). *(Integration test decrypt path + serializer.)*
- **AC-CLM-04** Handover verification is constant-time; wrong code counts toward 5 attempts/hour/claim (6th blocked, 429); expired code → 410 `CODE_EXPIRED`; a valid code sets both reports `RETURNED` (+`closedAt`), match `COMPLETED`, writes history rows, and other `SUGGESTED` matches on the found report become `DISMISSED` (BR-20). *(Integration + e2e flows 1 and 3.)*
- **AC-CLM-05** Station handover records the ID **type** only (BR-21); no ID number field exists in any form/model.

### Custody & staff

- **AC-STF-01** Staff see only items for their own stations in every tab (awaiting / held / claims); confirming receipt moves `SUBMITTED_TO_STOP → RECEIVED_BY_STOP → MATCHING` and triggers matching; `needsAttention` clears. *(e2e flow 2.)*
- **AC-STF-02** Custody reassignment requires a note, is admin-only, and writes `StatusHistory` with actor + role (BR-07).
- **AC-STF-03** Every staff/admin mutation writes an append-only `StatusHistory` row with actor, role, and note; any attempted update/delete of history rows fails (trigger) (BR-27).

### Lifecycle & ops

- **AC-OPS-01** Reports expire at `TTL+60` unless `VERIFIED`/`RETURNED`; the expire job is idempotent; expired reports are read-only (BR-25).
- **AC-OPS-02** All four cron endpoints reject requests without the bearer `CRON_SECRET`.
- **AC-OPS-03** Photo deposit: files >5 MB or wrong type are rejected **before** upload; per-kind count limits are enforced server-side; browser re-encode strips EXIF/GPS (BR-12). *(Integration limit tests + manual EXIF check.)*
- **AC-OPS-04** Every notification event in PRD §9 creates a `Notification` row with channel/status; send failures never fail the triggering request.

**Definition of done for today (Nov 2):** sections 1–3 reviewed against ARCHITECTURE.md §5 and PRD §6; AC list accepted as the QA baseline; tomorrow's migration work (Nov 3) implements §2 as Prisma schemas + raw SQL migration.

---

## 5. Field visibility matrix (the serializer contract)

One function, `toViewerReport(report, viewer)`, is the only exit path for report data. Rows are
viewer roles, columns are sensitive fields. `✅` = visible (possibly via timeout-signed URL),
`—` = stripped from the response. The referenced relationship ("owner of a lost report with an
active match") equals `SUGGESTED`/`CLAIMED`/`VERIFIED` match status.

| Field | Owner (reporter) | Custodian finder | Claimant on lost side (non-reporter) | Station staff (own custody station) | Admin |
| --- | --- | --- | --- | --- | --- |
| Title, category, description, color, brand, dates | ✅ | ✅ own found; ✅ matched lost | ✅ (comparison data only) | ✅ station reports | ✅ |
| `placeNote` | ✅ | ✅ own / matched | ✅ | ✅ | ✅ |
| `ITEM` photos | ✅ | ✅ own / matched | ✅ (BR-13 match rule) | ✅ custody-station items | ✅ |
| `PROOF` photos | ✅ (found: reporter) | ✅ own found | — | ✅ (custody-station items) | ✅ |
| `expectedAnswer` | — | ✅ own found | — | ✅ (custody-station items) | ✅ |
| Claim `answers` (all attempts) | ✅ own claims | ✅ claims on own found item | — (own claim: yes) | ✅ station claims | ✅ |
| `walkInNote` | — | — | — | ✅ | ✅ |
| `storageRef` | — | — | — | ✅ | ✅ |
| `receivedById/At`, internal ids, score internals | — | — | — | ✅ necessary fields | ✅ |
| Counterpart contact (`email`) | — | — | — | — (station sees neither) | ✅ |
| Counterpart first name + email | ✅ **only if** finder custody & claim `APPROVED` (BR-23) | ✅ same condition | ✅ same condition | — | ✅ |
| Handover code (plaintext) | ✅ while `VERIFIED` & unexpired | — (staff: enters owner's code at handover) | ✅ while claimant & unexpired | ✅ (custodian must enter it) | — |
| Station name + counter hours (station custody) | ✅ | ✅ | ✅ | ✅ | ✅ |

Rules that make the matrix enforceable:

1. Every route handler and component reads report data only through this serializer — no raw Prisma returns to the client.
2. Unit tests instantiate each row of the matrix with fixture data; a stripped field appearing in any serialized output fails the suite (AC-PRIV-02/05).
3. When a rule changes, change the matrix here, then `PRD.md`/`ARCHITECTURE.md` if needed, then the tests — never just the code.
