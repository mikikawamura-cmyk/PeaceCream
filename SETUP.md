# PeaceCream response collection — preview setup

Status: implementation for synthetic testing. Do not merge this branch or enable real collection until the privacy notice, international pilot requirements, access controls, deletion job and backup procedure have been reviewed. Production at https://peacecream.vercel.app/ must remain unchanged during review.

## Current isolated test project

`PeaceCream-Test` (`hyejrwwducnhpzscmofg`) is active in `us-west-1` (North California). All three migrations below have been applied there. RLS and automatic-RLS creation remain enabled; automatic public table exposure remains disabled. Explicit grants permit only server `service_role` access to participant tables/RPCs. The role-lookup helper is in the non-exposed `private` schema. No participant records are retained after transaction-rolled-back synthetic tests. Database access hardening passed its advisor review. After Auth account setup, the advisor reports one remaining Auth warning: leaked-password protection is disabled (a Pro-plan-or-above feature). No plan upgrade has been made.

Vercel Preview credentials are configured for feature/anonymous-responses only, with PC_COLLECTION_MODE=synthetic and no real-collection approval. The owner created and signed in as peacebymiki@gmail.com; its active research_admin role is assigned. Hosted API submission, rating, withdrawal, authenticated text access, audited raw export, analyst denial and immediate access revocation were verified. The owner role was restored afterward. Production is unchanged.

## 1. Create the isolated database

The owner has created PeaceCream-Test. For future isolated setups, create the project in Supabase. Choose US West if available, name it clearly as a test project, and choose a database password directly in Supabase. Never send passwords or API keys in chat. Confirm the project name/reference before applying migrations. Do not reuse an existing production database.

For a fresh test project, apply the SQL files in order using the Supabase SQL Editor or migration tooling:

1. `supabase/migrations/202611110001_responses.sql`
2. `supabase/migrations/202611110002_retention_cron.sql`
3. `supabase/migrations/20261112082127_harden_test_access.sql`

The first migration creates the data tables, row-level security, server-only RPC functions, rate limits and immutable original-response fields. The second installs/schedules the daily retention job. The third hardens the internal role helper, provider automatic-RLS helper permissions, audit access and policy performance. Verify that the `peacecream-five-year-retention` job exists in `cron.job`, is active, and has successful executions in `cron.job_run_details`. The local PostgreSQL test exercises the deletion function. On PeaceCream-Test, a temporary hosted cron smoke job also executed the retention function successfully and unscheduled itself; the daily job remains active.

## 2. Configure Vercel Preview only

Use the existing PeaceCream Vercel project and `feature/anonymous-responses` branch. Add these environment variables with **Preview** selected and Production unselected. Restrict them to this feature branch if supported, then redeploy its preview:

- `SUPABASE_URL`: the isolated project's HTTPS API URL, without a trailing slash.
- `SUPABASE_SECRET_KEY`: the server secret key (`sb_secret_…`), or the legacy service-role key. This is never included in static assets or API responses.
- `SUPABASE_PUBLISHABLE_KEY`: the project's publishable key for organizer authentication.
- `PC_COLLECTION_MODE`: `synthetic`.
- Leave `PC_REAL_COLLECTION_APPROVAL` unset.

No `VITE_`, `NEXT_PUBLIC_` or other browser-exposed prefix is used. Do not put credentials into GitHub, screenshots, URLs, local test scripts or participant forms. Supabase secrets bypass RLS, so their scope must remain server-only. Modern `sb_*` keys are sent in `apikey`, not as JWT bearer tokens. Reference: https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys

Missing credentials or the default disabled mode fail closed. The preview allows explicitly marked synthetic responses only; it must not be used for participant recruitment. The synthetic checkbox is a workflow safeguard, not proof that text is synthetic. Use invented examples only.

## 3. Establish organizer access

In Supabase Authentication, create/invite only `peacebymiki@gmail.com` initially. The owner completes password/account setup directly. Disable public sign-ups for this test project. Copy that Auth user's UUID (not an API key), then run:

```sql
insert into public.pc_organizers (user_id, role, active)
values ('REPLACE_WITH_AUTH_USER_UUID'::uuid, 'research_admin', true);
```

Open `/dashboard.html` on the preview and sign in. There is no dashboard link in participant navigation. Knowledge of its address grants no data access. The API validates the Supabase session and active organizer role on every protected request. Sessions use an HttpOnly, Secure, SameSite=Strict cookie lasting at most one hour; sign in again after expiry.

Later, create a separate Auth user and add `analyst` or `research_admin` to this table. Analysts can view and export protected released reports. Only Research Administrators can review separately consented text, release a frozen cohort, or export individual responses. Deactivate access immediately with `active = false`; roles are not cached in the session. Do not share organizer accounts.

## 4. Data model and behavior

- `pc_submissions`: a random UUID, date-only participation date, expiry, mode/content/consent versions, optional event code, immutable original structured answers, latest retake, independently recomputed results, final choices, customization decisions, rating and synthetic flag. No participant name/email/IP/device identifier is requested or stored for analytics.
- `pc_text`: separately consented exact original/final expressions and optional Create explanation. Cascades on withdrawal/expiry. Without the additional unchecked text consent, these fields are not sent to the database. Generated explanations are not attributed to participants.
- `pc_organizers`: Auth UUID, role and active status. No participant contact directory.
- `pc_reports`: frozen protected event/year/mode/version cohorts, release state and finite expiry. Ordinary aggregates are not declared anonymous.
- `pc_exports`: organizer identity, purpose, export type, time, status and count, retained for at most five years. Export authorization and audit insertion occur before data retrieval. Exported files require separate institutional access and deletion controls.
- `private.pc_limits`: temporary global capacity/login buckets, no participant IP or device fingerprint. A short-lived token-bound proof-of-work challenge adds submission friction. This is a limited pilot control, not a large-scale abuse defense.

Original Q1–Q10 option IDs and Q11 values are immutable. Q12 completion is recorded, but its exact words require text consent. Server scoring uses the stored content version. Create records contain no fabricated quiz answers or lens scores. Duplicate submission retries use the same hashed receipt token; changing a rating updates that record without restarting retention. Creation edits after sharing remain local; withdraw before submitting a revised version.

Personal cards are local browser data, capped at 20 compact recipes. They are independent of research consent. Clearing storage can lose cards and withdrawal receipts. PNG downloads remain available. Share links use URL fragments, exclude quiz answers and receipt tokens, and include written card text only if explicitly selected. Encoded links are not encrypted: anyone with a link can view its included content. Saving/deleting a local card does not submit/withdraw a response.

## 5. Withdrawal and retention operations

The browser creates a random receipt before submission and stores it locally; the database keeps only its hash. My PeaceCreams sends the UUID plus token to withdraw the individual record and cascade its text. Keep the receipt private. If lost, contact `peacebymiki@gmail.com`; without a reliable identifier the organizer cannot promise to locate a particular response.

Individual responses and consented text expire no later than five years after submission (UTC date boundary; leap-day expiry clamps to February 28). Rating updates do not extend expiry. Daily cleanup enforces deletion, and ordinary reports expire at the earliest source expiry. Monitor the actual hosted cron; a disabled/failed job is a release blocker.

Before real collection, document the actual Supabase plan's backup/PITR retention, Vercel/Supabase log retention, exports, restoration access and withdrawal replay procedure. Provider backups are separate from live-table deletion. Prevent restored data from returning to service until the withdrawal log and five-year cutoff are reapplied. If the actual provider settings cannot meet the approved retention policy, do not enable collection. Do not promise backup deletion that the provider does not support. Reference: https://supabase.com/docs/guides/platform/backups

## 6. Protected analytics and anonymization

Close and review an event cohort before a Research Administrator releases a report. Each event/year/mode/version has one immutable release opportunity. A minimum of five records is necessary but does not establish anonymity. Counts of 1–4 are suppressed, with complementary suppression where needed. Date filters select whole years of already released reports; arbitrary overlapping raw cohort queries are unavailable to analysts. Averages require at least five ratings. Free text, receipt tokens and row-level records never enter reports.

A withdrawal permanently invalidates the corresponding ordinary report and clears its data. It cannot be regenerated, reducing repeated-release differencing. Later rating changes do not refresh frozen reports. This deliberate limitation trades live metrics for safer pilot reporting. Research Administrators with approved raw exports remain capable of identifying records and must be governed institutionally.

No automatic indefinite archive is enabled. A report may be designated `reviewed_anonymous` only following a documented, independent disclosure-risk review with reviewer, methodology, approval time and linkage-removal evidence. Review rare attributes, event/year membership, external information, multiple released reports, complementary totals, quotation risks and recipient context. Merely removing names, hashing IDs, or reaching n=5 is insufficient. Create a separate minimized statistical artifact, remove all person-level identifiers/linkage, and record why reidentification is not reasonably likely in its intended context. If this cannot be justified, retain ordinary finite expiry. Do not convert a pseudonymized dataset into an indefinite archive by changing a database flag. No public reporting or quotation publication is authorized here.

## 7. Review before international recruitment

Countries and institutional partners remain undecided. The privacy notice is a draft pending controller/institutional approval. Identify the controller(s), purpose, lawful basis, rights/complaint route, processors, countries, cross-border transfer safeguards and research/ethics requirements for each actual pilot. US West hosting may create an international transfer; it does not itself establish compliance. Obtain local review for the EEA/UK and the countries actually recruited, including Japan/Thailand if relevant, and any Goi Peace Foundation/KKU research requirements. Do not claim universal legal compliance.

The initial policy excludes under-18 submissions through an explicit adult attestation and server validation, while leaving activities/local saving available. Self-attestation does not independently verify age. Recruiting minors later requires a separately reviewed age-appropriate notice, consent/assent and guardian procedure where applicable; do not simply lower the number. Review children's privacy requirements and study ethics before any such recruitment.

## 8. Verify before enabling anything

Run `npm ci`, `npm test`, `npm run build`. The tests include the existing quiz/image-placement suites, API/domain validation, and a real local PostgreSQL engine (PGlite) running the migration with synthetic roles. `npm run preview -- --synthetic` (or `node scripts/preview.mjs --synthetic`) is local-only; its mock organizer accounts are `research@example.test` and `analyst@example.test`, password `synthetic-only-password`. These accounts do not exist in the deployed API. Never use real credentials with this test adapter.

On the actual Vercel preview, verify both activities, all questions, immutable original/final distinctions, no upload without consent, separate text consent, rejected under-age/no-consent payloads, single-record rating updates, valid/invalid receipt withdrawal, gallery/PNG/share/reopen, organizer role isolation, audited exports, cohort suppression and mobile layout. Inspect Supabase security advisors and confirm anonymous/authenticated direct table/RPC access is denied. Check actual hosted Auth and cron, not only local substitutes.

Real collection requires a separate explicit release decision after review. Only then would an authorized operator set `PC_COLLECTION_MODE=enabled` plus `PC_REAL_COLLECTION_APPROVAL=reviewed-18plus-five-years` in the approved deployment. Those variables are technical gates, not evidence of legal approval. Production changes require the owner's approval and a reviewed PR; this feature branch must not be merged automatically.
