# PeaceCream connected-preview verification — 12 November 2026

Review preview: https://peacecream-git-feature-anonymous-responses-peace-7909.vercel.app/

Organizer dashboard: https://peacecream-git-feature-anonymous-responses-peace-7909.vercel.app/dashboard.html

Draft PR: https://github.com/mikikawamura-cmyk/PeaceCream/pull/1

This is a Vercel-authenticated review preview accepting synthetic responses only. Production at https://peacecream.vercel.app/ remains unchanged.

## Current setup

The owner configured all four Vercel variables for feature/anonymous-responses Preview only. The authorized redeployment completed. The live configuration endpoint reports synthetic mode, configured credentials, minimum age 18 and five-year retention. PC_REAL_COLLECTION_APPROVAL remains unset per the owner. Real collection remains disabled.

PeaceCream-Test (hyejrwwducnhpzscmofg) is in North California, us-west-1. All three migrations are applied. Automatic RLS remains enabled and automatic public table exposure remains disabled. All six application tables have RLS; explicit grants restrict participant tables and privileged RPCs to the server role. The role helper is in the non-exposed private schema.

The owner created and personally signed into peacebymiki@gmail.com. Its final role is research_admin and active is true; it is the sole organizer. Keys and passwords were entered directly by the owner, not in chat.

## Actual hosted checks passed

- Completed all 12 Discover questions with synthetic choices and invented text. Zero submissions existed before explicit consent.
- Submitted through the deployed Preview API with adult, structured, separate text and synthetic confirmations. Hosted records contain all ten original option IDs, two chosen values, the expected Strawberry recommendation, exact opted-in text and a synthetic flag.
- Submission date was 2026-11-12; expiry 2031-11-12. A rating change to 5 updated the same UUID without adding a row or extending expiry.
- The real Research Administrator dashboard loaded and reviewed the separately consented synthetic expression.
- A raw structured CSV export with purpose and additional authorization completed. Its audit entry records raw, completed, one row. OS file arrival was not separately inspected.
- An unsigned request to the protected report endpoint was denied with “Please sign in.”
- Temporarily testing the same account as analyst caused the text endpoint to deny access with “Research Administrator access is required.”
- Temporarily deactivating the organizer caused an existing session's report request to be denied with “Organizer access is not authorized.”
- Restored active Research Administrator access and verified the dashboard again. No other organizer was added.
- Withdrew the browser submission using My PeaceCreams. The receipt disappeared; hosted SQL confirmed zero submissions and zero text records afterward. The export audit remains as intended.

Hosted verification found a Vercel routing bug: dynamic path metadata was being rejected as an unsupported report filter. Commit 1e3aa9c fixes this by using a single-segment API route and removing only a single capture matching the actual path. Duplicate/mismatched captures and unknown filters remain rejected. Eight regression checks were added. The corrected deployed dashboard and text access passed.

## Database, security and retention

The hosted rollback-only test in tests/hosted-synthetic.sql passed: original immutability, idempotency, no unconsented text, separate exact text, wrong-token denial, rating, unchanged retention, withdrawal/text cascade, report invalidation, expiry deletion and anonymous/authenticated direct-access denial. No test fixtures remained.

The daily peacecream-five-year-retention job is active at 03:17 UTC. A temporary real cron smoke job executed the retention function successfully at 2026-11-12 08:23 UTC and unscheduled itself. The daily job remains active. Live deletion does not establish provider backup erasure; actual backup/restoration procedures still need review.

After Auth account setup, the security advisor reports one remaining warning: leaked-password protection is disabled. Supabase documents this feature as available on Pro plans and above. No paid upgrade or password change was made. Database/RLS access findings were resolved. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

The performance advisor has informational unused-index findings only, expected for an empty test database; indexes supporting cohorts and the organizer foreign key are retained.

## Automated and earlier visual verification

Existing quiz tests: 66,154 assertions across 16,384 lens patterns, 64 flavor patterns and 30 actions. Renderer: 560 flavor/zero/one/two-topping configurations plus 1,200 three-topping plans. Assets and script syntax pass; photography is unchanged.

Response/domain/API tests: 49 checks, including eight routing regressions. Local PostgreSQL (PGlite): 26 checks, including hardening. API/PostgreSQL integration: 25 checks covering roles, audited exports, one-time cohorts, suppression, rating and withdrawal.

Earlier deployed browser checks covered homepage, Create completion, topping selection/removal, local save/gallery/reopen, PNG generation, Discover completion, optional topping add/remove and final expression edits. Gallery was visually checked at 375px; results at 390px, 820px and 1280px. Measurements showed no horizontal overflow and captions below photographs. Local dashboard widths fit 375px and 390px; desktop organizer layout was reviewed. One PNG download-event observer timed out; PNG data generation was verified but OS download persistence was not independently confirmed.

No released cohort reports currently appear, as expected after fixture withdrawal and because small groups must not be published. Populated reports, filters and suppression were exercised in automated API/PostgreSQL tests, not a live participant dataset.

## Production and remaining review

GitHub comparison confirms main remains identical to c3ec41df78a08a5af57f6119690e51e41ce00b17, with zero intervening commits. The actual public homepage was opened and retains its original navigation and footer. An earlier HTTP check returned 200, original release assets and no collection script. No production merge, promotion, variables or database changes occurred.

Synthetic Preview connection and organizer setup are complete. Before real collection: approve the privacy/consent policy for actual countries/institutions, backup/restoration and export-retention procedures, and Auth configuration (including public sign-ups and the password advisory). No automatic indefinite anonymous archive or public dashboard is enabled. Do not merge or enable real collection without explicit owner approval.

SETUP.md contains exact schema, environment, organizer, retention, withdrawal and production-approval instructions. Country-specific legal review remains necessary; no universal compliance conclusion is claimed. Primary review references: https://www.edpb.europa.eu/sme/be-compliant/international-data-transfers_en and https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa .

## Prelaunch review update

The current test project now deliberately retains synthetic-launch-review: 12 Create and 12 Discover rows, four separately opted-in written examples, and two reviewed limited-retention reports. Both reports were released through the authenticated Studio and audited. Hosted SQL confirms 24 stored rows and 24 participants in reports, no Create quiz results, no unconsented text, and no unsuppressed count from 1 through 4. Browser mode filters show 12/0/12 for Create and 12/12/0 for Discover. These are invented review examples, not participant findings; the prior zero-row cleanup statement describes the earlier withdrawal test. There are still zero real responses.

The dashboard now labels synthetic mode explicitly. Expired submissions are excluded from research reads/exports and cohort releases even before the daily deletion task runs; a regression test uses an expired PostgreSQL fixture to verify it cannot appear in text review or exports. Existing tests and the Vercel build pass. See LAUNCH-REVIEW.md for remaining backup/deletion-replay, MFA and international privacy launch blockers. No production change or real-collection enablement occurred.
