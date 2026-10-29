# MyFinds: Product Requirements Document (PRD)

> **How to use these docs.** `PRD.md` says **what** to build and the rules it must follow. `ARCHITECTURE.md` says **how** to build it. `DESIGN.md` says **how it looks**. If they disagree: PRD wins on behavior, ARCHITECTURE wins on technical structure, DESIGN wins on visuals.
> Items marked **DEFAULT** are decisions taken so work is not blocked. They are open for the lead to change; change the constant or rule in one place and nothing else should break.

---

## 1. Product summary

MyFinds is a web app (installable PWA) for reporting and recovering lost items on metro, railway, and bus networks. People report lost or found items against a station or stop, the system suggests matches, the person holding the item verifies the owner, and the item is handed over with a one-time code.

The key idea is **custody**: an item is always either with a finder or at a station, and whoever holds it decides who gets it.

## 2. Problem and goals

**Problem.** Lost-and-found on transit is scattered across chats, notice boards, and station counters. There is no structured matching, no reliable ownership check, and nobody can see who holds an item or where it stands.

**Goals (MVP).**
1. An item gets back to its real owner through the platform.
2. Ownership is verified before the item or any contact detail is handed over.
3. Everyone can see who holds an item and where each report stands.

**Success metrics.** Reports submitted, match rate, verified returns, median time from report to return, fake claims blocked, station receipts confirmed within 3 days.

## 3. Roles

Four kinds of people, three system roles. An owner and a finder are the same account at different times.

| System role (`Role` enum) | Persona | Scope |
| --- | --- | --- |
| `USER` | Owner (on a lost report), Finder (on a found report) | Own reports, matches, and claims |
| `STATION_STAFF` | Staff of a metro, railway, or bus station or stop | Everything a USER can do, plus actions on items held at **their own stations** (linked through `StationStaff`) |
| `ADMIN` | The MyFinds team | Everything, on any station. Every override is logged with a note |

The role on a report comes from the report, not the account: the creator of a lost report is its **owner**, the creator of a found report is its **finder**.

## 4. Glossary

| Term | Meaning |
| --- | --- |
| Report | A lost or found item record (`type` = `LOST` or `FOUND`) |
| Station | A metro station, railway station, or bus stop from the admin-managed list |
| Custodian | Who holds a found item: `FINDER` or `STATION` |
| Custody station | The station that holds the item when custodian is `STATION` |
| Match | A suggested pairing of one lost report and one found report, with a score |
| Claim | An owner's attempt to prove a match is theirs (answers plus optional proof photos) |
| Handover code | A 6-digit one-time code issued when a claim is approved; entered by the custodian at handover |

## 5. Business rules

### Places
- **BR-01** Places are chosen from database lists in four steps: State, City, Place type (`METRO`, `RAILWAY`, `BUS_STOP`), Station. No free-text place. An optional note (max 120 chars) covers platform, gate, or coach.
- **BR-02** A lost report asks one place (where it was lost). A found report asks where it was found; if the finder hands it to a stop it also asks the **hand-in station** (same four steps). A finder who keeps the item is never asked where they submit it.

### Custody
- **BR-03** Found with custodian `FINDER`: the finder is the custodian and decides claims.
- **BR-04** Found with custodian `STATION` (DEFAULT: custody moves to the stop immediately when the finder says so): the stop is the authority. Status starts at `SUBMITTED_TO_STOP`. Staff of that station confirm receipt, which moves it to `RECEIVED_BY_STOP`. The item is **not matchable** until received.
- **BR-05** Station staff can create a found report for a counter drop-off. It has custodian `STATION`, a custody station chosen from their own stations, starts at `RECEIVED_BY_STOP`, may carry a `walkInNote`, and needs no finder account.
- **BR-06** If a stop has not confirmed receipt after `STATION_RECEIPT_ALERT_DAYS` (3), a daily reminder email goes to that station's staff and the report is flagged `needsAttention` for admin.
- **BR-07** Admin can move custody between a finder and a station, or between stations. Each move needs a note and is logged.

### Matching
- **BR-08** Candidates must pass all filters: opposite type; same `category`; same city; status in the matchable set (`SUBMITTED`, `MATCHING`, `MATCH_FOUND`, `RECEIVED_BY_STOP`, `CLAIMED`); not expired; found date between (lost date minus 1 day) and (lost date plus `MATCH_DATE_WINDOW_DAYS`).
- **BR-09** Score = `0.30 place + 0.30 text + 0.20 date + 0.20 attributes`, each 0 to 1.
  - Place: same station 1.0; same place type in the same city 0.5; same city only 0.2.
  - Text: `0.6 * trigram similarity(title) + 0.4 * normalized full-text rank` over title, description, brand, color.
  - Date: `1 - daysApart / MATCH_DATE_WINDOW_DAYS`, clamped to 0..1.
  - Attributes: 0.5 for equal color (case-insensitive) plus 0.5 for equal brand. Missing on either side scores 0 for that part.
  - Matches at or above `MATCH_MIN_SCORE` are kept (top `MATCH_MAX_PER_REPORT` per report).
- **BR-10** Matching runs when a matchable report is created, when staff confirm receipt, when a report's category, place, date, title, or description is edited, and in the daily rematch job.
- **BR-11** Matching uses only structured fields and text. There is no AI, vector, or geo-distance in the MVP, and no UI copy may claim otherwise.

### Photos
- **BR-12** Photo kinds: `ITEM` (up to 4 per report), `PROOF` (up to 1, found reports only, private), `CLAIM_PROOF` (up to 2 per claim). JPEG, PNG, or WebP, max 5 MB. The browser re-encodes images before upload, which strips EXIF data such as GPS.
- **BR-13** Photos live in a private bucket and are served only through short-lived signed URLs created after a permission check. Visibility:
  - `ITEM` on a found report: reporter, custodian, staff of the custody station, admin, and the owner of a lost report that has an active match (`SUGGESTED`, `CLAIMED`, `VERIFIED`) with it. Never public.
  - `ITEM` on a lost report: reporter, admin, and the custodian of a matched found report.
  - `PROOF`: custodian, staff of the custody station, reporter, admin. **Never the claimant.**
  - `CLAIM_PROOF`: the claimant, the custodian, staff of the custody station, admin.

### Verification
- **BR-14** Creating a report or a claim requires a verified phone **and** a verified email.
- **BR-15** A claim can only be made on a `SUGGESTED` match that belongs to the claimant's own lost report.
- **BR-16** A found report has 1 to 2 verification questions with expected answers. They are **required** when custodian is `FINDER` and **optional** when `STATION` (staff can add or edit them). If a found report has no questions, the claim form asks for one required free-text field: "Describe something only the owner would know".
- **BR-17** Each claim submission is one attempt. After `MAX_CLAIM_ATTEMPTS` (3) rejected attempts on the same match, the match becomes `LOCKED`. Only station staff of the custody station (or admin) can unlock it, or decide it manually. For finder custody, only admin can unlock.
- **BR-18** The custodian approves or rejects. The system shows an answer-similarity hint but never decides alone.
- **BR-19** On approval the system issues a 6-digit handover code that expires after `HANDOVER_CODE_TTL_HOURS` (48). It is sent by SMS and email to the owner and shown on the owner's Report Status page. The owner or custodian can **reissue** a code, which invalidates the old one.
- **BR-20** At handover the custodian enters the code. Valid code means both reports become `RETURNED`, the match becomes `COMPLETED`, and all other `SUGGESTED` matches on that found report become `DISMISSED`. Max 5 code attempts per claim per hour.
- **BR-21** For custodian `STATION`, staff check a government ID in person and record the ID **type** (never the number) when confirming handover (DEFAULT: required for station handover).

### Contact and privacy
- **BR-22** No personal contact detail is shown to another user before approval.
- **BR-23** After approval, with finder custody, owner and finder each see the other's first name and phone (DEFAULT: direct contact). With station custody nobody sees personal contact; the owner sees the station name, counter hours, and the handover code.
- **BR-24** Finders are warned not to photograph or type card numbers, ID numbers, or screens with personal data. Staff and admin can remove any photo.

### Lifecycle and audit
- **BR-25** Reports expire `REPORT_TTL_DAYS` (60) after creation unless `VERIFIED` or `RETURNED`. Expired reports are read-only.
- **BR-26** Photos are deleted `PHOTO_RETENTION_DAYS` (30) after a report reaches `RETURNED`, `EXPIRED`, or `WITHDRAWN`.
- **BR-27** Every status change and every staff or admin action writes an append-only `StatusHistory` row (actor, role, note).
- **BR-28** The reporter or admin can withdraw a report any time before `VERIFIED`.
- **BR-29** Categories `PHONE`, `WALLET`, `ID_CARD`, `LAPTOP` show an advisory on the found form recommending hand-in to a station. It is not enforced (DEFAULT).

## 6. Status model

`Report.status` values: `SUBMITTED`, `SUBMITTED_TO_STOP`, `RECEIVED_BY_STOP`, `MATCHING`, `MATCH_FOUND`, `CLAIMED`, `VERIFIED`, `RETURNED`, `EXPIRED`, `WITHDRAWN`.

| From | To | Trigger | Who |
| --- | --- | --- | --- |
| (new lost, or found with finder) | `SUBMITTED` then `MATCHING` | Creation, then matching runs in the same request | System |
| (new found, custodian STATION, by finder) | `SUBMITTED_TO_STOP` | Creation | System |
| (new found, counter drop-off) | `RECEIVED_BY_STOP` then `MATCHING` | Creation by staff | System |
| `SUBMITTED_TO_STOP` | `RECEIVED_BY_STOP`, then `MATCHING` | Receipt confirmed | Staff of that station, admin |
| `MATCHING` | `MATCH_FOUND` | At least one `SUGGESTED` match exists | System |
| `MATCH_FOUND` | `MATCHING` | All matches dismissed, rejected, or locked | System |
| `MATCH_FOUND` | `CLAIMED` | Claim submitted (both reports in the pair) | Owner |
| `CLAIMED` | `MATCH_FOUND` | Claim rejected with attempts left | Custodian, admin |
| `CLAIMED` | `VERIFIED` | Claim approved, code issued | Custodian, admin |
| `VERIFIED` | `RETURNED` | Valid code entered | Custodian, admin |
| any before `VERIFIED` | `EXPIRED` | `expiresAt` passed | Cron |
| any before `VERIFIED` | `WITHDRAWN` | Withdraw | Reporter, admin |

`Match.status`: `SUGGESTED`, `CLAIMED`, `REJECTED`, `LOCKED`, `DISMISSED`, `VERIFIED`, `COMPLETED`.
`Claim.decision`: `PENDING`, `APPROVED`, `REJECTED`.

Several owners may have `SUGGESTED` matches on one found report. Pending claims can coexist; the first approved claim wins and the others are dismissed.

## 7. MVP features and acceptance criteria

**P0** = the core loop (report, match, verify, return) or custody breaks without it. **P1** = needed for a safe launch, built after the loop works. IDs are build order.

### F-01 Signup, login, and verification (P0)
- Email plus password and Google login. A new account must verify email (link or code) and phone (SMS code) before creating reports or claims.
- Acceptance: unverified user sees a "Verify to continue" screen on `/report/*` and gets 403 from the API; verified user proceeds; OTP resend limited to 3 per 10 minutes.

### F-02 Roles and permission check (P0)
- One function `can(user, action, ctx)` in `packages/shared` decides every permission. Routes never inline role checks.
- Acceptance: unit tests cover every row of the permission matrix in ARCHITECTURE.md section 6.

### F-03 Place picker and places data (P0)
- Four-step picker: State, City, Place type, Station (searchable). Each step is disabled until the previous is set. Data is served by `GET /api/places`.
- Admin screens add and edit states, cities, and stations. A seed script loads one launch city.
- Acceptance: changing a parent field resets children; station search filters by typed text; inactive stations are hidden.

### F-04 Report a Lost Item (P0)
- Fields: item name\*, category\*, description, color, brand, place\*, date lost\* (default today, no future), optional approximate time, photos (0 to 4). Contact is shown read-only from the verified account.
- Acceptance: submit validates with Zod on client and server; on success creates the report, runs matching, and redirects to Report Status with a success banner. Failed submit keeps typed values.

### F-05 Report a Found Item (P0)
- First choice (required): "I'll keep it and return it myself" or "I'm handing it to a station or stop".
- Fields: item name\*, category\*, description, color, brand, where found\*, date found\*, optional approximate time, item photos (0 to 4), optional private proof photo, 1 to 2 questions with expected answers (required for finder custody), and when handing in: hand-in station\* (with a "same as where I found it" shortcut).
- Station staff see a "Logging a counter drop-off" toggle that hides the custody choice, pre-fills their station, and shows the `walkInNote` field.
- Acceptance: finder custody without a question fails validation; station custody creates `SUBMITTED_TO_STOP` and emails that station's staff; counter drop-off creates `RECEIVED_BY_STOP`.

### F-06 Photo upload (P0)
- Browser asks for a presigned upload URL, re-encodes the image, uploads straight to R2, then confirms. Server checks the object exists, type, and size before saving the key.
- Acceptance: files over 5 MB or wrong type are rejected before upload; upload limits per kind are enforced server-side; photos are never reachable by a public URL.

### F-07 Station staff tools (P0)
- Staff dashboard with three tabs: Awaiting receipt, Items held, Claims to review. Actions: confirm receipt (with optional `storageRef`, for example "BIN-RAIL-0498"), log counter drop-off, add or edit questions, approve or reject claims, confirm handover.
- Acceptance: staff see only items for their own stations; confirming receipt moves status to `RECEIVED_BY_STOP` then `MATCHING` and triggers matching.

### F-08 Rule-based matching (P0)
- Implements BR-08 to BR-11 as one SQL query run per report. Stores score and a `scoreBreakdown` JSON with the four sub-scores.
- Acceptance: golden tests with fixture reports produce expected scores and ordering; a new matchable report returns results in under 500 ms on a seeded database of 10,000 reports.

### F-09 Potential Match view (P0)
- Tabs per match (sorted by score), side-by-side comparison with per-field match marks, a "Why it matched" breakdown, a "Who holds this item" box, and actions "This is mine", "Not mine", "Report a problem".
- Acceptance: never shows expected answers, `PROOF` photos, or finder contact; "Not mine" sets the match `DISMISSED` for this owner only.

### F-10 Claim and verification (P0)
- Dialog "Prove it's yours" with the finder's or station's questions, optional claim proof photos, and a confirm checkbox. Custodian reviews answers (with similarity hints) and approves or rejects.
- Acceptance: BR-15 to BR-18 enforced; the third rejection locks the match and the owner sees the locked banner; attempts are counted server-side.

### F-11 Handover code and return (P0)
- On approval: issue code, notify, show on Report Status (BR-19). Custodian enters the code to close (BR-20), with ID type recorded for station handover (BR-21).
- Acceptance: expired or wrong codes fail with clear messages; 6th wrong attempt in an hour is blocked; a valid code sets both reports `RETURNED` and writes history.

### F-12 Report Status (P0)
- Header card, next-action banner, timeline, collapsible details, custodian panel (claims table, handover entry), chain-of-custody panel for station-held items, and activity log. All states in DESIGN.md.
- Acceptance: each status shows the correct banner and actions for each role; users without access get a "no access" screen.

### F-17 Landing page (P0)
- Hero with two actions, how-it-works, "two ways to return an item", public stats, trust points. No item photos or names on this page.
- Signed-in users see a banner for news ("Match found for ...") or "You have N open reports".
- Acceptance: stats come from cached counts (reported, returned, active stations); both hero buttons deep-link to the right form after login.

### F-13 Admin tools (P1)
- Manage places and station staff, view any report, override custody or a claim decision, unlock a match, remove a photo, withdraw any report.
- Acceptance: each override requires a note and writes `StatusHistory`.

### F-14 Notifications (P1)
- Email through SendGrid, SMS through Twilio. Events and recipients are in section 9.
- Acceptance: each event creates a `Notification` row with channel, status, and provider id; failures are retried by the daily job and never block the request.

### F-15 Expiry and station reminders (P1)
- Daily jobs: expire reports, send expiry warnings (7 days before), remind stations about unconfirmed receipts, retry matching, delete retained photos.
- Acceptance: jobs are idempotent and only run with the cron secret header.

### F-16 PWA (P1)
- Web manifest, installable, offline app shell with a friendly offline page.
- Acceptance: Lighthouse PWA installable check passes; signed-in API responses are never cached by the service worker.

## 8. Configuration constants

All live in `packages/shared/src/config.ts` and can be overridden by env vars.

| Constant | Default | Used in |
| --- | --- | --- |
| `REPORT_TTL_DAYS` | 60 | BR-25 |
| `PHOTO_RETENTION_DAYS` | 30 | BR-26 |
| `MATCH_MIN_SCORE` | 0.50 | BR-09 |
| `MATCH_MAX_PER_REPORT` | 5 | BR-09 |
| `MATCH_DATE_WINDOW_DAYS` | 30 | BR-08, BR-09 |
| `MAX_CLAIM_ATTEMPTS` | 3 | BR-17 |
| `HANDOVER_CODE_TTL_HOURS` | 48 | BR-19 |
| `HANDOVER_CODE_MAX_TRIES_PER_HOUR` | 5 | BR-20 |
| `STATION_RECEIPT_ALERT_DAYS` | 3 | BR-06 |
| `MAX_ITEM_PHOTOS` / `MAX_CLAIM_PHOTOS` | 4 / 2 | BR-12 |
| `MAX_PHOTO_MB` | 5 | BR-12 |
| `OTP_RESEND_LIMIT` | 3 per 10 min | F-01 |

## 9. Notifications

| Event | Recipient | Channel |
| --- | --- | --- |
| Phone or email verification | The user | SMS (phone), email (email) |
| Found item submitted to a stop | Staff of that station | Email |
| Receipt reminder (daily after 3 days) | Staff of that station | Email |
| Match found | Owner of the lost report | Email |
| Claim submitted | Custodian (finder, or staff of the station) | Email |
| Claim approved | Owner | Email and SMS (with the code) |
| Claim approved (finder custody) | Finder | Email (with the owner's first name and phone) |
| Claim rejected | Owner | Email |
| Match locked | Owner, custodian, admin | Email |
| Code reissued | Owner | Email and SMS |
| Returned | Owner and finder | Email |
| Report expires in 7 days | Reporter | Email |

SMS is used **only** for OTP and handover codes, to control cost.

## 10. Out of scope for the MVP

AI or image matching, map view, public browse or "Explore Finds" page, native apps, QR tags, reputation scores, payments or rewards, chat between users, ferry or other place types, auction or disposal of unclaimed items, multi-language UI.

## 11. Defaults taken for open questions

| Question | DEFAULT taken |
| --- | --- |
| Launch coverage | One city, seeded; admin can add more |
| When custody moves to a stop | Immediately on submit; flagged to admin if unconfirmed after 3 days |
| Walk-in finders with no account | Allowed through staff counter drop-off with `walkInNote` |
| Staff and stations | A staff member can belong to several stations; only admin adds staff |
| Finder-custody contact | Direct (first name and phone) after approval |
| Valuables | Advisory only, not enforced |
| Station handover | ID check by staff; record type, never number |
| Report lifetime | 60 days; unclaimed items after expiry follow station policy (not modeled) |
| Photo retention | 30 days after close |
| First admin | Created by the seed script from `ADMIN_EMAIL` |