# Frontend design review: MyFinds

This is a deliberately hard review of the current frontend. The visual system is coherent, but a polished monochrome interface is not enough for a lost-and-found product. The user is anxious, often on a phone, and is being asked to trust an unfamiliar system with personal details and an item that may be valuable.

The redesign should optimize for:

1. **Confidence:** the user always knows what happened and what happens next.
2. **Low effort:** reporting an item should feel like a short guided task, not a database form.
3. **Safe disclosure:** the interface must never encourage users to reveal identifying details publicly.
4. **Actionability:** every meaningful state should have one obvious next action.

## Executive verdict

The current app looks more mature than it behaves. The strongest visual parts are the restrained tokens, report-number treatment, status timeline, and clear lost/found entry points. The weakest parts are the product hierarchy and the mismatch between the real backend and the frontend: several screens still present sample data, claims are described as not connected, and the matching experience gives a score without enough evidence for a user to make a safe decision.

Do not spend the next iteration on more cards, more badges, gradients, animations, or decorative illustrations. Fix state clarity, real data wiring, mobile form friction, and trust copy first.

## P0: fix before calling the frontend production-ready

### 1. Remove the “sample app” dead end

The report detail and possible-match screens are driven by preview data, while the server already has report and match APIs. This is the largest credibility failure: a user can submit a real report and then land in an experience that cannot represent their actual report.

**Required changes**

- Replace preview-data reads in report detail and matches routes with authenticated API data.
- Add explicit loading, empty, unauthorized, not-found, and service-error states.
- Remove “Sample data” notices once the real flow is wired.
- Keep preview data only for isolated development fixtures or story/test utilities.
- Ensure a refresh, direct URL visit, and browser back/forward all show the same server-backed state.

**Acceptance criteria**

- A newly submitted report appears in My Reports without a hardcoded fixture.
- A real `MATCH_FOUND` report opens the real candidate list.
- A report with no matches has a useful empty state, not a fake example.
- A signed-out user cannot infer private report data from route HTML or client payloads.

### 2. Make every status answer three questions

The current statuses are technically correct but not always useful. “Matching” is a system state, not an explanation. “Possible match” is safer than “Match found,” but it still needs context.

Every status surface must answer:

- **What happened?**
- **What does it mean for me?**
- **What can I do now?**

Use owner-facing copy such as:

| State | Heading | Explanation | Primary action |
|---|---|---|---|
| Submitted | Report received | We saved your report and will search eligible found reports. | View report |
| Matching | We are checking for a possible match | No suitable report has been found yet. We will keep checking until the report expires. | Edit details |
| Possible match | Review a possible match | Similar details were found. This is not proof of ownership. | Review match |
| Claimed | Claim submitted | The custodian is reviewing your private answers. | View claim |
| Verified | Ownership confirmed | Follow the handover instructions below. | View handover code |
| Returned | Item returned | The handover was completed. | View report history |

Do not expose scoring terminology as if it were certainty. “92% match” is a recommendation signal, not a probability that the item belongs to the user.

### 3. Redesign the report form around completion, not fields

The form currently has the right ingredients but is still structurally a long form. On mobile, users will abandon it or enter low-quality details.

**Required changes**

- Use a short stepper:
  1. Item
  2. Where and when
  3. Identifying details
  4. Photo and review
- Keep the progress indicator visible, but do not make users lose entered data between steps.
- Add a compact “You are reporting” summary at the top after the first step.
- Make the primary action label specific: “Continue to where it happened,” not “Next.”
- On the final step, show exactly what will be private and what other users will not see.
- Preserve draft input in the browser for accidental refresh/navigation; clear it after successful submission.
- Never reset child location fields silently. Show a short inline notice when changing a parent selection clears a child.

**Required validation behavior**

- Validate on blur for fields users have left, and on submit for all fields.
- Put the error beside the field and summarize errors at the top.
- Move focus to the first invalid field.
- Do not use only red borders or placeholder text to communicate errors.
- Keep entered values after validation failures and network errors.

### 4. Treat the possible-match page as a decision tool

The current match page asks the user to “review” but does not sufficiently help them decide safely.

Each match card should show:

- Candidate title and report date.
- Station and city.
- A clear “Why this is being suggested” section.
- Four labelled signals: place, description, date, and attributes.
- Only non-sensitive found-item details.
- A warning: “Do not claim based only on color or appearance.”
- One primary action: “Review and claim.”
- One low-emphasis action: “Not my item.”

Do not show:

- Private contact information.
- Hidden verification answers.
- Raw storage keys or private image URLs.
- Language implying the algorithm has confirmed ownership.

If a score is shown, label it “Similarity score” and provide an explanation. Prefer “Strong similarity” plus reasons over a naked percentage.

### 5. Make the private status link visibly private

The private status page correctly avoids indexing, but the user-facing trust model is too easy to miss.

**Required changes**

- Put a lock icon and “Private link” beside the page title, not only in a footer sentence.
- Explain: “Anyone with this link can view limited status information. Do not post it publicly.”
- Add a copy-link action only if it can avoid exposing the token in analytics, logs, or referrers.
- Make the page usable without signing in, but never include match details, contact data, or secret answers.
- Give a clear recovery path for a lost link without pretending the system can recover the raw token.

## P1: fix in the next frontend iteration

### 6. Replace the generic landing page proof with operational proof

The landing page explains the concept, but its statistics are preview numbers and therefore weaken trust. A lost-and-found service should prove reliability with process clarity, not invented scale.

Replace sample counts with:

- “Private by design” explanation.
- Supported transport types and locations.
- Typical next step after submission.
- A short explanation of station custody.
- Real, clearly labelled operational metrics only when they exist.

Never show fabricated “items reported” or “items returned” numbers in a live product.

### 7. Improve navigation hierarchy

The current header is clean but too sparse for a signed-in workflow.

Signed-in users should see:

- My Reports
- How it works
- Help
- Account menu

The account menu should expose role-appropriate destinations without making staff/admin links appear to normal users. On mobile, the menu should include the current page context and close on route change.

Add breadcrumbs only where they reduce orientation cost. Do not use breadcrumbs as a substitute for a clear page title.

### 8. Fix mobile action ergonomics

The app is mobile-first in CSS, but the critical actions need a more deliberate mobile design.

- Use a sticky bottom action bar only when it contains the one primary action for the current step.
- Keep the bar above the safe-area inset.
- Never hide a secondary destructive action beside the primary action.
- Ensure every control is at least 44px tall.
- Avoid long button labels wrapping to two lines.
- When a keyboard opens, keep the active field and error visible.
- Test at 320px, 375px, 390px, and 430px, not only “mobile.”

### 9. Make photos useful and safe

The upload flow should tell users why photos help and what not to include.

- Show upload progress and retry per file.
- Show a real thumbnail, remove, replace, and upload-failed states.
- Explain the 5MB limit before the user selects a file.
- Explain that photos are private and only shown to authorized users.
- Warn users not to include faces, identity documents, payment cards, or unrelated people.
- Provide a no-photo path without making it feel like a failure.

### 10. Standardize loading, empty, and error states

Every data-backed page needs a state matrix. Do not improvise state copy inside each page.

Create shared patterns for:

- Initial loading skeleton.
- Refreshing existing data.
- No results.
- Not found.
- Unauthorized.
- Offline.
- Rate limited.
- Retryable server failure.
- Successful mutation.

Each state needs a title, one-sentence explanation, and one next action. Error messages must say whether retrying is safe.

## P2: quality and accessibility pass

### 11. Strengthen accessibility beyond semantics

- Add a skip link.
- Verify heading hierarchy on every route.
- Use live regions for upload, submit, and status changes.
- Ensure status is not communicated by color alone.
- Test focus visibility against the monochrome palette.
- Ensure dialog focus trapping and return focus work.
- Check that icon-only buttons have accessible names.
- Test keyboard-only completion of both report forms.
- Test with reduced motion enabled.
- Test zoom at 200% without horizontal scrolling.

### 12. Reduce visual noise in dense screens

The spec uses many borders and monospace labels. That is distinctive, but overuse makes every block look equally important.

- Reserve 2px borders for selected/current/high-risk elements.
- Reduce competing labels above every value.
- Use whitespace to group related fields before adding another card.
- Keep one dominant heading and one dominant action per screen.
- Avoid putting a banner, breadcrumb, status chip, report number, and action cluster all above the first meaningful content.

### 13. Make status history human-readable

Raw state names are useful internally but poor UX. Map history events to sentences:

- “Report created”
- “Matching started”
- “Possible match found”
- “Station confirmed receipt”
- “Claim submitted”
- “Ownership verified”
- “Item returned”

Do not expose internal action constants or system implementation terms.

## Implementation order

1. Real API-backed report detail and match pages.
2. Status copy and next-action model.
3. Match-card decision experience.
4. Report-form stepper, draft persistence, and validation focus.
5. Private-link trust treatment.
6. Shared loading/error/empty states.
7. Photo upload UX.
8. Accessibility and multi-viewport testing.
9. Remove preview-only copy and fixtures from production routes.

## Suggested implementation boundaries

Keep the work in existing layers:

- `apps/web/src/app/`: route-level loading, error, and not-found states.
- `apps/web/src/components/`: reusable status, match, form, and feedback patterns.
- `apps/web/src/lib/`: typed API clients and response schemas.
- `packages/ui/`: only genuinely shared primitives; do not move product-specific cards here.
- `docs/DESIGN.md`: update tokens and behavior rules when a decision above becomes final.

Do not introduce a new design system, animation library, state-management library, or data-fetching dependency for this work. The current stack is sufficient.

## Definition of done

- No production route relies on preview report data.
- A user can submit, refresh, revisit, and inspect a real report.
- A possible match is understandable without exposing private details.
- Every primary screen has explicit loading, empty, error, and success states.
- A user always has one obvious next action.
- Report forms preserve input through recoverable failures.
- Private-link boundaries are visible and explained.
- Keyboard, screen-reader, 200% zoom, reduced-motion, 320px, 390px, and 1440px checks pass.
- No fabricated operational statistics remain in live UI.

## Deliberately not recommended

- Public browsing of found items.
- AI/vector matching UI.
- More dashboard charts.
- Dark mode before the core workflow is reliable.
- Decorative motion.
- More filters before the real data flow is complete.
- Showing exact match percentages as certainty.
- A public social feed or comments system.

