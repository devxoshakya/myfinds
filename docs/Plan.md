# MyFinds: Technical Architecture & Development Plan

This document serves as the central blueprint for the MyFinds application, combining the technical architecture, explicit development constraints, and the day-by-day task execution plan.

## 🏗️ Technical Architecture & Decisions

### Core Stack
*   **Framework:** Next.js (App Router), React, Tailwind CSS, shadcn/ui deployed on Vercel via a Turborepo workspace.
*   **Database:** PostgreSQL managed via Prisma. Uses `pg_trgm` extension for text search.
*   **Authentication:** Better Auth (Email/Password only — no social login, no phone OTP).
*   **Storage:** Cloudflare R2 for photos (strictly private buckets).
*   **Caching & Limits:** Redis (Upstash) for rate limits, claim/code attempt counters, and short locks.
*   **Validation:** Zod schemas shared across client and server.
*   **PWA:** Serwist for service worker caching (app shell only).

### System Logic & Data
*   **Routing Logic:** Route handlers (`/api/...`) are kept thin. They only authenticate, validate with Zod, call a service in `server/services`, and serialize the output.
*   **Permissions Engine:** A single centralized `can(user, action, ctx)` function evaluates all permissions based on the user's role (`USER`, `STATION_STAFF`, `ADMIN`).
*   **Matching Engine:** Rules-based, synchronous filtering. Candidates are filtered by exact category, date windows, and location. Scores are weighted: `0.30 place + 0.30 text + 0.20 date + 0.20 attributes`.
*   **Serialization:** All report data sent to the client passes through a strict `toViewerReport(report, viewer)` serializer to strip internal/private fields.
*   **Handover Codes:** 6-digit one-time codes generated on claim approval, encrypted at rest using AES-256-GCM. Verification uses constant-time comparison.

---

## 🚫 Explicit Constraints: What NOT To Do

To ensure security, privacy, and architectural integrity, the following rules are strictly enforced:

*   **NO AI or Vector Search:** Do not implement AI embeddings, image recognition, or vector matching for the MVP. Rely solely on the defined SQL rule-based matching.
*   **NO Free-Text Locations:** Do not allow users to type custom locations. All places must be selected from the predefined State/City/PlaceType/Station lists.
*   **NO Public Photos:** Never expose raw storage keys or public bucket URLs. Photos are only served via short-lived (5-min) presigned GET URLs after permission checks.
*   **NO Client-Side Trust:** Never trust client-sent role, status, or custody fields. Validate all inputs against Zod schemas on the server.
*   **NO Contact Leaks:** Never expose personal contact details (first name/email) to the other party before a claim is officially `APPROVED`.
*   **NO Direct SQL Interpolation:** Never string-interpolate SQL queries in Prisma's `$queryRaw`. Always use parameterized queries.
*   **NO Business Logic in Routes/Components:** Keep Next.js route handlers thin. Move all heavy lifting to `server/services/`.
*   **NO Status History Deletions:** The `StatusHistory` table is strictly append-only. Do not write code that updates or deletes historical records.

---

## 📅 Daily Task Schedule (4-Week Plan)

*Note: Pair programming rotation is assumed. Tasks are listed per day to ensure continuous momentum.*

### Week 1: Foundation & Data Capture
*   **Monday (Nov 2):**
    *   Initialize repo, run `npm run dev`, configure linting/building.
    *   Define testable acceptance criteria (e.g., "finder never sees owner's hidden detail").
    *   Draft data model documentation (tables, secrets, field permissions).
*   **Tuesday (Nov 3):**
    *   Apply Supabase schema migrations for structured fields, `report_secrets`, and RLS policies.
    *   Build accessible reusable form components (Field, Select, Textarea, FileInput).
*   **Wednesday (Nov 4):**
    *   Create shared Zod validation module for client/server and write unit tests.
    *   Implement server action/route handler for form insertion (validate, generate `MF-` code, apply IP limits).
*   **Thursday (Nov 5):**
    *   Wire Lost and Found forms to the backend with hidden detail fields.
    *   Build `/status/[token]` lookup page returning public info and a 5-step timeline.
*   **Friday (Nov 6):**
    *   Create and execute `seed.sql` for 12 fake reports (matches, near-misses, strays).
    *   Implement secure photo upload (presigned URL, client-side EXIF strip, max 5MB to R2).
    *   Accessibility/Lighthouse quality pass on forms.

### Week 2: The Matching Engine
*   **Monday (Nov 9):**
    *   Map out manual matching predictions and baseline rules (weights, threshold: 65).
    *   Implement fixed list of demo routes/stops; update forms to use select inputs.
*   **Tuesday (Nov 10):**
    *   Write pure matching functions (text normalization, hard date/route filters) without DB calls.
    *   Define 10 test scenarios (clear match, time mismatch, lookalike, etc.).
*   **Wednesday (Nov 11):**
    *   Implement weighted score calculation and human-readable reason lists. Ensure all 10 tests pass.
*   **Thursday (Nov 12):**
    *   Execute matching on the server immediately after report save. Write to `matches` table.
    *   Update status page to reflect "possible match" states using owner-facing wording only.
*   **Friday (Nov 13):**
    *   Finalize loading/empty/error states for forms and status pages.
    *   Prediction testing on unseen report pairs. Quality pass (390px/1440px).

### Week 3: Staff Verification & Privacy
*   **Monday (Nov 16):**
    *   Implement Better Auth sign-in for staff. Enforce server-side role checks on all `/staff` routes.
*   **Tuesday (Nov 17):**
    *   Build `/staff` queue: list suggested matches sorted by score.
    *   Build `/staff/matches/[id]`: side-by-side verification view revealing hidden details strictly to staff.
*   **Wednesday (Nov 18):**
    *   Implement the status transition machine (e.g., searching -> possible match -> verification pending).
    *   Create server actions to approve/reject matches, refusing illegal state jumps.
*   **Thursday (Nov 19):**
    *   Build Owner flow: show found item details (safely) post-approval with a "This is mine" action.
    *   Build Staff verification step: staff record "verified" or "not verified" with a required note.
*   **Friday (Nov 20):**
    *   Automated leak testing: ensure secret strings/contact info never appear in unauthorized network responses.
    *   Implement rate limiting and automated tests for 4 specific abuse cases (e.g., brute-forcing tokens).

### Week 4: Handover, Polish, & Launch
*   **Monday (Nov 23):**
    *   Implement the Handover Return flow: mark ready for handover, generate secure AES-encrypted code, confirm receipt.
    *   Update transition table to handle `RETURNED` and `CLOSED` states.
*   **Tuesday (Nov 24):**
    *   Conduct 3 external usability sessions. Log observations.
    *   Implement fixes for the top 3 usability issues identified.
*   **Wednesday (Nov 25):**
    *   Run manual regression checklist covering 8 core scenarios.
    *   Comprehensive accessibility pass (keyboard navigation, screen readers, contrast).
*   **Thursday (Nov 26):**
    *   Finalize documentation (Architecture, API logic, known limitations).
    *   Staging deployment to Vercel (verify environment variables and secrets).
*   **Friday (Nov 27):**
    *   Team teach-back sessions (explaining domains to one another).
    *   Fresh-clone end-to-end demo.
    *   Backlog creation and transition planning for post-MVP features.