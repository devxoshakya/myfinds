# MyFinds: Design Spec

> Extracted from the five low-fidelity wireframes (Landing, Report a Lost Item, Report a Found Item, Potential Match, Report Status) and the PRD. Read `PRD.md` for behavior and `ARCHITECTURE.md` for structure.
> Token values are **sampled by eye from the wireframes**. Treat them as the design tokens and adjust freely, but keep them in one place (`packages/ui` and `globals.css`).

## 1. Direction

A **monochrome, spec-sheet look**: white cards on a light gray page, black for primary actions and emphasis, thin gray borders, square-ish corners, and monospace for codes and IDs. It should feel precise and trustworthy, not playful. Color is added **only for status meaning** (error, success, warning), because the wireframes are grayscale.

## 2. Wireframe annotations that must NOT ship

The wireframes carry spec chrome that exists only to explain the design. Do **not** build any of it:

- The "WIREFRAME CONTROLS", "SPEC VIEW MODE", "SPEC STATE SIMULATOR" bars and their state buttons (Standard State, Loading Skeleton, Error State, and so on). Build the real states instead (section 8).
- All bracketed tags such as `[SEC_ITEM_INFO]`, `[STAGE_01]`, `[SPEC_COMPONENT_STATUS]`, `[DOC_ID: RPT-LF-002]`, `SCALE: 1:1 · GRID: 12-COL FLUID`, `REVISION 1.2`, `CONTAINER_WIDTH`, `type: string`, `dropdown: enum`, `ISO-8601 (max=today)`, `[RULE: ...]`, `[SYSTEM: ...]`.
- The "Engineering notes", "Engineering Specification & Role Access Matrix", and "Screen N Logic & Constraints" panels at the bottom of Screens 4 and 5.
- The "STATUS: IN-DRAFT" tags, `[x]` and `[Dismiss]` literal text (use real icon buttons), and the "MyFinds v0.1 Low-Fidelity Wireframe Spec" footer badge.
- Placeholder image boxes with an X and a label (`[IMG: USER_UPLOAD]`): replace with real photos or the empty-photo placeholder (section 5).

## 3. Design tokens

### Color

```css
:root {
  /* surfaces */
  --background: #F4F5F7;      /* page */
  --surface: #FFFFFF;         /* cards, inputs, dialogs */
  --surface-muted: #EEF0F3;   /* disabled fields, annotation-style info boxes, table headers */
  /* ink */
  --foreground: #111111;      /* headings, body, primary buttons, selected borders */
  --muted-foreground: #5B6470;/* helper text, secondary text, placeholders */
  /* lines */
  --border: #C9CED6;          /* default 1px borders */
  --border-strong: #111111;   /* 2px for selected, current, or primary containers */
  /* actions */
  --primary: #111111;  --primary-foreground: #FFFFFF;
  /* semantic (EXTENSION: not in the grayscale wireframes) */
  --danger:  #B42318;  --danger-bg:  #FEF3F2;
  --success: #067647;  --success-bg: #ECFDF3;
  --warning: #B54708;  --warning-bg: #FFFAEB;
  --focus-ring: #111111;
}
```

Dark mode is out of scope for the MVP. Use semantic colors only for: field errors, rejected or locked claims, success banners, and "Needs attention" chips. Never rely on color alone: always pair with an icon or text.

### Typography

| Role | Font | Size / line | Weight |
| --- | --- | --- | --- |
| Sans (UI) | Inter (or system sans fallback) | | |
| Mono (codes, IDs, report numbers, handover code, small labels) | JetBrains Mono (or system mono fallback) | | |
| Display (landing hero) | Sans | 48/52 desktop, 32/38 mobile | 700 |
| Page title (h1) | Sans | 32/40 desktop, 26/32 mobile | 600 |
| Section title (h2) | Sans | 24/32 | 600 |
| Card title (h3) | Sans | 18/26 | 600 |
| Body | Sans | 16/24 | 400 |
| Helper / small | Sans | 14/20 | 400, `--muted-foreground` |
| Label (mono caps) | Mono | 12/16, uppercase, letter-spacing 0.04em | 500 |
| Handover code | Mono | 40/48, letter-spacing 0.2em | 700 |

### Spacing, radius, borders, elevation

- 4 px base; scale 4, 8, 12, 16, 24, 32, 48, 64.
- Card padding 24 (16 on mobile). Gap between form sections 24. Gap between fields 16.
- Radius: **2 px** for inputs, buttons, cards, chips, and boxes; fully round only for the avatar. Set `--radius: 0.125rem` for shadcn.
- Borders: 1 px `--border` by default; 2 px `--border-strong` for the selected option, the current timeline step, the matched found-item card, and the handover code box. Dashed 1 px for upload targets and the handover code container.
- Elevation: none by default. The sticky action bar and dialogs use a single soft shadow `0 2px 12px rgba(0,0,0,0.12)`.

### Layout

- Breakpoints: mobile under 768, tablet 768 to 1023, desktop 1024 and up. Design mobile first (375 px reference).
- Page container: max width 1120, side padding 24 (16 on mobile). Landing sections use a 960 centered shell.
- Form pages (Lost, Found): 12-column grid; form column spans 8, tips sidebar spans 4. Below 1024 the sidebar moves under the form cards.
- Header height 64. A sticky bottom action bar (height 72) appears on form pages and the match page; content needs bottom padding of 88 so nothing is covered.

## 4. Global shell

**Header** (all pages): left, a boxed logo `[LOGO] MyFinds` (1 px border, 2 px radius). Nav links: "How it works" and "My Reports" (signed in). Right: signed out shows "Log in" (tertiary) and "Sign up" (secondary button); signed in shows a 40 px black circle avatar with a user icon that opens a menu (My Reports, Station dashboard for staff, Admin for admin, Log out). On mobile the nav collapses into a "MENU" icon button.

The wireframes also show an "Explore Finds" link. **Do not build it**: browsing found items publicly conflicts with the privacy rules (PRD out of scope).

**Footer**: How it works, Help, Privacy, Terms (text links), 1 px top border.

## 5. Components (shadcn mapping)

| Component | Build with | Spec |
| --- | --- | --- |
| Button primary | `Button` | Solid `--primary`, white text, 48 px tall (44 min touch), 2 px radius. Optional leading icon |
| Button secondary | `Button variant="outline"` | 1 px `--foreground` border, transparent |
| Button tertiary | `Button variant="link"` | Underlined text |
| Text input, textarea | `Input`, `Textarea` | White, 1 px `--border`, 44 px tall, 12 px padding; focus 2 px `--focus-ring`; disabled `--surface-muted` with a lock icon where the wireframe shows one |
| Label | `Label` | 14 px 600; required marker `*` in `--danger`; optional fields say "(optional)" in muted text |
| Dropdown | `Select` | Same as input with a chevron; searchable variant uses `Command` inside `Popover` |
| Place type toggle | `ToggleGroup type="single"` | Three equal segments: Metro, Railway, Bus stop. Selected segment is black with white text |
| Choice cards | `RadioGroup` styled as cards | Two cards with a radio at top right; selected card has a 2 px black border |
| Status chip | `Badge` | Current status: black fill, white text, mono caps. Type chip (LOST, FOUND) and report number: 1 px outline. "Needs attention": `--warning` text on `--warning-bg` |
| Tabs | `Tabs` | Match tabs: selected tab has a 2 px black border and white fill; others gray fill |
| Breadcrumb | `Breadcrumb` | 14 px, `>` separators, last item bold |
| Banner | `Alert` | Full-width strip, 1 px border, icon, text, optional right-aligned button; variants: info (gray), success, warning, danger |
| Dialog / sheet | `Dialog` on desktop, `Sheet side="bottom"` on mobile | Used for "Prove it's yours" |
| Table | `Table` | Header row `--surface-muted`; used for the claims panel and station lists |
| Progress bar | `Progress` | 8 px tall, black fill on `--surface-muted`; used for the match breakdown |
| Collapsible panel | `Collapsible` or `Accordion` | Header row with a chevron; used for Details and Chain of custody |
| Skeleton | `Skeleton` | Gray blocks matching the final layout |
| Toast | Sonner | Bottom center; success and error |
| Avatar | `Avatar` | 40 px black circle |

### Reusable patterns

**Place picker.** Labelled group. Row 1: State (select), City (select, disabled with lock until a state is set). Row 2: Place type (toggle group), Station or stop name (searchable select with a search icon, disabled until a type is chosen; placeholder "Search station (e.g. Grand Central)"). Row 3: "Platform, gate, or coach (optional)" text input. On mobile every field stacks one per row. Changing a parent clears its children. Section sits inside a `--surface-muted` panel on the Found form.

**Photo uploader.** A grid of 4 slots on desktop (2 by 2 on mobile). First slot is the dashed "Add photos / Click or drop" target with a camera icon; filled slots show the thumbnail with a small black X button at the top right and the file name chip; empty slots are labelled "Empty slot". Below: counter "Attached: 2 of 4" and helper "JPEG, PNG or WebP, up to 5 MB each." Show upload progress as a thin bar on the thumbnail; failed uploads show a danger border with a retry link. Found form adds a second single-slot dashed uploader with a lock icon: "Upload private verification proof". Empty-photo placeholder for display: gray box with a camera icon and "No photo".

**Sticky action bar.** Fixed to the bottom, full width, white, top 1 px border, soft shadow. Left: one line of helper text with an icon (for example a bolt: "We search for matches right away and email you."). Right: tertiary "Cancel" and primary action. On mobile the helper text collapses above the buttons.

**Status timeline.** Six steps in order: Submitted, Matching, Match found, Claimed, Verified, Returned. Desktop: six equal cards in a row, each with a step number, title, one-line description, and timestamp; completed steps show a check in the top right; the **current** step has a 2 px black border and a black "CURRENT" chip; future steps are muted. Mobile: vertical list. Found items handed to a station add two steps at the start: "Submitted to stop" and "Received by stop". Side outcomes (Expired, Withdrawn, Claim rejected returning to Matching) appear as small outlined chips in a row under the timeline labelled "Other outcomes", highlighted only if they occurred.

## 6. Screens

All five screens exist at mobile (375) and desktop (1120 container). Copy in the wireframes is the starting copy; section 9 lists strings to use.

### Screen 1: Landing (`/`)

Order, top to bottom:

1. Header.
2. **News banner** (signed in only): bell icon, text such as `Match found for "Black wallet" at Central Station`, a primary small button "Review match", and a dismiss icon button. If no news: "You have 2 open reports" with link "View My Reports". Remove the wireframe's `[MATCH_SCORE: 96%]` tag, or show the score as a small outlined chip.
3. **Hero.** Small mono label "Transit lost and found". Display headline "Lost it. Found it. Matched." Subtext (max 60ch): "Report a lost or found item at any metro, railway, or bus station. We match it and make sure it reaches the real owner." Two large primary buttons side by side (stacked, full width on mobile): "I lost something" (search icon) then "I found something" (plus icon). Under them a tertiary link "Station staff? Log in" with the note "Staff accounts are created by an admin".
4. **How it works** (h2, with subtext "Step-by-step custody and match protocol" reworded to "Four steps from loss to return"): four cards in a row (2 by 2 on mobile). Each: 40 px outlined icon box, step number, title, one line.
   1. Report: "Add details, a photo, and the station."
   2. Match: "We search for you every day."
   3. Verify: "Answer a question only the owner would know."
   4. Collect: "Get the item from the finder or a station with a handover code."
5. **Two ways to return an item** on a `--surface-muted` band: two large cards with a 2 px border. Card A "Keep it and return it yourself": "Hold the item safely until the verified owner claims it with a secure handover code." Card B "Hand it to a station or stop, and the station takes over": "Drop it off at the counter and station staff manage custody and verification." Each has a small flow diagram box, drawn with real elements: A: `Finder -> code -> Owner`; B: `Drop-off -> Station -> Claim desk`; caption A "Contact details stay private until verified" (see section 7); caption B "Every step is time-stamped".
6. **Stats** ("System throughput" in the wireframe; title it "MyFinds so far"): three cards with a big number and a label: Items reported, Items returned, Stations covered. Sub-lines: "Across rail, bus, and metro", "[returned/reported] returned", "Active stations". Note under them: "We never show item photos or names on this page."
7. **Trust block** ("Integrity and privacy standards"): three cards with icon, title, one line: Private contact data ("Contact details stay private until the owner is verified."), Secure handover code ("Stations hand items over with a secure 6-digit code."), Audited custody chain ("Every step and custody transfer is logged.").
8. Footer.

### Screen 2: Report a Lost Item (`/report/lost`)

- Breadcrumb `Home > Report a lost item`; h1 "Report a lost item"; subtext "The more detail you add, the better the match."
- Main column, four numbered section cards (number in a small black square before the title):
  1. **What did you lose?** Item name\* (placeholder "Black leather wallet"), Category\* (select: Phone, Wallet, Keys, Bag, ID card, Laptop, Headphones, Clothing, Other), Description (textarea, helper "Marks, stickers, what was inside"), Color and Brand side by side (optional).
  2. **Where and when?** Place picker labelled "Where did you lose it?", Date lost\* (default today, future dates blocked), optional "Approximate time".
  3. **Photos (optional)** Photo uploader. Helper "A photo of a similar item, or an older photo of yours, helps."
  4. **Your contact** Two read-only rows (verified phone, verified email, masked) each with a "verified" lock tag, and the note with a lock icon "Shared only after your claim is approved."
- Sidebar card "Tips for better matches" with a lightbulb: 01 Be specific about color and brand; 02 Choose the station where you think you lost it; 03 Add a photo if you can. (Drop the wireframe claims "cross-references reported items across transit authority hubs" and "speed up human validation by up to 80%".)
- Sticky action bar: helper "We search for matches right away and email you." Cancel, "Submit report".
- Wireframe bug to avoid: the sticky bar in the mockup overlaps the Where/When card. It must sit at the viewport bottom with page padding.

### Screen 3: Report a Found Item (`/report/found`)

- Header card: breadcrumb, h1 "Report a found item", subtext "Thank you for helping. Tell us what you found and what you'll do with it."
- Staff only (hidden for others): a toggle card top right, "Station staff mode: Logging a counter drop-off". When on: section 1 is hidden, the hand-in station is pre-filled with the staff member's station, and a "Walk-in finder note (name or phone, if they agree)" field appears.
- Sections (numbers update dynamically; the wireframe skips 4 because that section is conditional):
  1. **What will you do with it?**\* Two choice cards: "I'll keep it and return it myself" ("Hold the item safely until the verified owner claims it with a secure handover code.") and "I'm handing it to a station or stop" ("That station becomes responsible for the item. Staff will confirm they received it."). An info alert appears when the category is Phone, Wallet, ID card, or Laptop: "We recommend handing valuables to a station."
  2. **What did you find?**\* Privacy notice strip with a warning icon: "Don't type card numbers, passport details, or ID numbers here." Fields: Item name\* (max 80 chars), Category\*, Description, Color, Brand.
  3. **Where did you find it?**\* Place picker, Date found\*, optional Approximate time.
  4. **Where did you hand it in?** (only when handing to a station) Checkbox "Same as where I found it" that copies the place, then a place picker "Station or stop where you handed it in".
  5. **Photos.** Part A "Item photos" (up to 4; "Shown only to the person whose claim matches. Hide sensitive labels or names."). Part B "Private proof photo (optional)" with a lock tag "Private": "A close-up of something only the owner would know, such as a serial number or the inside of a bag. It is never shown to the person claiming it."
  6. **Questions only the owner can answer.** Helper: "Set 1 or 2 questions. If you hand the item to a station, these are optional because staff can add them." Question 1\* with placeholder "What is the lock screen wallpaper?" and "Expected answer"\* (helper "Only you and station staff can see this. Never shown to people claiming it."), link "Add a second question".
- Sidebar: "Tips for finders": 01 Protect private data; 02 Note the exact platform or coach; 03 Pick a secret question (an attribute not visible from outside). Below it a "Chain of custody" info card: "When you hand an item to a station, that station becomes responsible for it. Staff confirm receipt and every step is logged." Remove the wireframe's technical lines (`Photo Bucket: PUBLIC(4) + PRIV(1)`, `REAL_TIME_WEBHOOK`, `ISO-DIS-27037`).
- Sticky action bar: helper "We search for matches as soon as the item is available." Cancel, "Submit report".
- Place types in the wireframe sample read "Metro / Rail, Bus Stop, Ferry Wharf" and a sample state "New South Wales": use **Metro, Railway, Bus stop** and the launch city's real data.

### Screen 4: Potential Match (`/reports/[id]/matches`)

1. Breadcrumb `My Reports > {item} > Possible matches`; h1 "We found 2 possible matches"; sub "Review the found item against your lost report. If you recognize it, start a claim."
2. Small summary card at the right of the title: "Your report: {title} • Lost at {station} on {date}".
3. **Match tabs:** `Match 1: {station}` with a score chip such as `94%`, `Match 2: ...`, sorted by score. Selected tab is white with 2 px black border.
4. **Comparison panel** (desktop): left card "Your lost report" (gray fill), right card "Found item" (2 px black border). Each has a large photo area (found side is a carousel with Prev, Next, "1 / 3", and 3 thumbnails), then rows: Item name, Category, Brand and color, Description, Place (state > city > place type > station, plus note), Date. Between the cards a narrow center column shows a compact result per row: `Match` (check) or `Similar` (tilde) chips. Mobile: a two-option toggle "Your report | Found item" and the center chips become inline marks under each row.
5. **Why it matched:** card with four labelled progress bars: Place, Description, Date, Details (brand, color), each with a percent. Below, one summary sentence generated from `scoreBreakdown` (for example "Same station, similar name, found one day after you lost it.") and the recommendation "Proceed to claim". Do not mention geo distance, vectors, or "algorithm" names (BR-11).
6. **Who holds this item:** card with a house or lock icon and one of: "Held by the finder. Contact details are shared after your claim is approved." or "Held at {station}, {city}. Counter hours: {hours}. Bring a government ID and your handover code." Station custody also shows the `storageRef` label to staff and admin only.
7. **Sticky action bar:** helper "You'll answer a question only the owner would know. You have 3 attempts." Buttons: tertiary "Report a problem", secondary "Not mine", primary "This is mine".
8. **Claim dialog "Prove it's yours"** (dialog on desktop, bottom sheet on mobile): the question(s) as labels with answer inputs (if none: "Describe something only the owner would know"), optional claim proof uploader ("Add proof (up to 2): a receipt or an older photo with the item"), required checkbox "I confirm this item is mine", attempt counter "Attempt 1 of 3", buttons "Cancel" and "Submit claim".

States: no matches (empty card "No matches yet. We keep looking every day until {date}." with "Edit my report"); claim rejected (danger banner "That answer didn't match. 2 attempts left."); claim locked (danger banner "Claim locked after 3 attempts. Station staff or an admin will review it." and disabled actions); item no longer available (grayed card "This item was returned to someone else."); no access.

### Screen 5: Report Status (`/reports/[id]`)

1. Breadcrumb `My Reports > {item}`.
2. **Header card:** photo box left (120 px square). Right: chips `LOST`/`FOUND`, current status chip, report number `MF-1042` (mono); h1 item title; sub "Lost near {station}"; a meta row with four fields: Reported on, Active until, Held by ("You" or the station), Best match (percent, only if matches exist). Top right: an "Actions" dropdown with Edit and Withdraw. Replace the wireframe's "RETENTION: 30 Days" with "Active until {date}".
3. **Next-action banner** (by status and role):
   - Owner, matches exist: "2 possible matches." button "Review matches".
   - Custodian, claim pending: "Someone claimed this item." button "Review claim".
   - Owner, `VERIFIED`: left, h2 "Claim verified" with text "Show this code to the person holding your item." and the location and hours box when a station holds it; right, a dashed container labelled "One-time handover code" with the code in large mono (`482 916`), "Expires {date and time}" and buttons "Print slip" and "Reissue code". (The wireframe's "Map Pin" button is out of scope: there are no coordinates in the MVP.)
   - Staff, awaiting receipt: "Confirm you have received this item." with a `storageRef` input and "Confirm receipt".
   - `RETURNED`: "All done. This item has been returned."
4. **Timeline** as defined in section 5.
5. Two columns below (stacked on mobile):
   - **Left:** collapsible "Item details" (category, color, brand, description, photos, place and hand-in place); collapsible "Chain of custody" for station-held items (current location: station name; storage compartment: `storageRef`; intake log: who received it and when).
   - **Right:** "Custodian panel" (visible to custodian, station staff, admin only; black header bar with the role chip): a table of claims (claimant masked first name, attempts used "2 of 3", submitted answer with a similarity hint, claim proof thumbnails) with Approve and Reject buttons; after approval, a "Handover" box with a code input (6 digits, mono), an ID type select for station handover ("Government ID", "Driving licence", "Passport", "Other"), and a primary "Validate and release". Below it the "Activity log": time, actor (role chip), and note, newest first; users see only their own steps, staff and admin see all.
6. Remove from the wireframe: `SECURITY_ZONE`, `SHA-256 HMAC`, "Transferred to Auction" branch, "AI_ENGINE" log rows (use "System"), and the hashed-code claims.

States: loading (skeletons for header, banner, timeline), expired ("This report expired on {date}." with "Create a new report"), withdrawn (read-only with a Withdrawn chip), no access, "Needs attention" chip for staff and admin when receipt is overdue.

## 7. Wireframe versus spec: decisions

Where the wireframes disagree with the PRD, **the PRD wins**. Specific resolutions:

| Wireframe says | Build this | Why |
| --- | --- | --- |
| "Explore Finds" nav item | Remove | Public browsing is out of scope for privacy |
| Place types "Metro / Rail", "Bus Stop", "Ferry Wharf" | Metro, Railway, Bus stop | PRD BR-01 |
| Max photo size 10 MB | 5 MB | PRD BR-12 |
| Found photos "shown in search results" | Shown only to matched owners | PRD BR-13 |
| Handover code expiry 48 hours | 48 hours | Matches PRD |
| Retention "30 Days" in the report header | "Active until {date}" (60-day report life); 30 days applies to photo retention | PRD BR-25, BR-26 |
| Match list threshold 70%, default tab at 90% | Use `MATCH_MIN_SCORE` (0.50); first tab is the highest score | PRD config |
| "Within 20 m", vector, semantic, geo algorithm wording | Not allowed; copy comes from `scoreBreakdown` | PRD BR-11 |
| Handover code "Argon2 hashed", "SHA-256 HMAC", cryptographic signing | Not user-facing; storage is specified in ARCHITECTURE section 9 | Implementation detail |
| "Transferred to Auction" after retention timeout | Remove | Out of scope |
| "Map Pin" button | Remove | No coordinates in MVP |
| Station Staff Mode checkbox visible to everyone | Visible to `STATION_STAFF` only | Permissions |
| "Approximate time (optional)" only on the found form | Add to both forms; informational only | Consistency |
| Direct "Finder to Owner OTP exchange / No personal contact numbers exchanged" caption on Landing | Say "Contact details stay private until verified" | With finder custody, contact is shared **after** approval (PRD BR-23) |
| "Government ID matching your profile" for pickup | "Bring a government ID and your handover code" | Staff check ID in person; no profile-ID matching |
| Section numbering skips from 3 to 5 on the found form | Number sections dynamically | Section 4 is conditional |
| Date format `10/24/2023` (US) | Locale-aware format via `Intl.DateTimeFormat`; inputs use native date pickers | The app serves transit users in multiple locales |

## 8. States every screen needs

- **Loading:** skeleton blocks in the shape of the final layout; buttons show a spinner and are disabled while submitting.
- **Validation error:** red text under the field starting with an icon and a short message, red 1 px border; the page scrolls to the first error and focuses it; an error summary banner appears at the top for long forms.
- **Submit error:** danger banner at the top: "Couldn't submit. Your answers are saved. Try again." with a "Try again" button; input values are kept.
- **Empty:** a bordered box with an icon, one sentence, and one action.
- **No access (403/404):** centered message "You don't have access to this page" and a button to My Reports.
- **Offline:** the PWA offline page with "You're offline. Reconnect to continue."

## 9. Copy deck (use as written)

| Where | String |
| --- | --- |
| Hero headline | Lost it. Found it. Matched. |
| Hero buttons | I lost something / I found something |
| Staff link | Station staff? Log in |
| Lost submit | Submit report |
| Lost success banner | Report submitted. We're looking for matches. |
| Found success, finder custody | You are holding this item. |
| Found success, station custody | Waiting for the station to confirm receipt. |
| Match tabs empty | No matches yet. We keep looking every day until {date}. |
| Claim helper | You'll answer a question only the owner would know. You have 3 attempts. |
| Claim sent | Claim sent. You'll get an email when it's decided. |
| Claim rejected | That answer didn't match. {n} attempts left. |
| Claim locked | Claim locked after 3 attempts. Station staff or an admin will review it. |
| Handover heading | Show this code to the person holding your item. |
| Station pickup | Bring a government ID and your handover code. |
| Contact note | Shared only after your claim is approved. |
| Privacy strip (found) | Don't type card numbers, passport details, or ID numbers here. |

## 10. Responsive rules

- Under 768: all grids become one column; hero buttons full width; tabs become a horizontally scrollable row; the comparison panel uses the toggle; the timeline is vertical; tables become stacked cards; dialogs become bottom sheets; the sticky action bar stays and shows two buttons (secondary left, primary right).
- 768 to 1023: two-column grids where the wireframe shows three or four (How it works becomes 2 by 2); the form sidebar sits under the form.
- 1024 and up: the layouts as drawn.

## 11. Accessibility

- Target WCAG 2.1 AA. The grayscale palette already gives contrast above 7:1 for body text; check `--muted-foreground` on `--background` (must be at least 4.5:1) and adjust if needed.
- Every input has a visible label; errors use `aria-describedby`; focus rings are 2 px black with a 2 px white offset; all interactive targets at least 44 px.
- Status chips, match marks, and banners include text or icons, not only color.
- The place picker and photo uploader are fully keyboard-operable; the claim dialog traps focus and returns it on close.
- The handover code is announced as separate digits (`aria-label="4 8 2 9 1 6"`) and can be copied with a button.

## 12. Assets

- Icons: Lucide (matches shadcn). Wireframe icons map to: Report `file-plus`, Match `search`, Verify `shield-check`, Collect `key-round`, privacy `eye-off`, handover `hash`, audit `clipboard-list`, tips `lightbulb`, upload `camera`, lock `lock`, user `user`, bell `bell`.
- PWA icons: monochrome black square with a white "MF" mark, sizes 192 and 512 plus a maskable variant. Theme color `#111111`, background color `#F4F5F7`.
- No illustrations or stock photos in the MVP.