# PeaceCream preview review — 12 November 2026

Feature branch: `feature/anonymous-responses`
Draft PR: https://github.com/mikikawamura-cmyk/PeaceCream/pull/1
Review preview: https://peacecream-git-feature-anonymous-responses-peace-7909.vercel.app/
Verified implementation deployment: https://peacecream-jc4e77j7q-peace-7909.vercel.app/ (commit `ebe162a`)

## Completed

Vercel built and deployed the feature branch successfully. Its hosted build logs confirm all four test suites passed. The preview was opened in the owner's authenticated browser and the actual `/api/config` function returned `mode: disabled`, `configured: false`, minimum age 18 and retention five years. Unauthenticated requests are redirected through Vercel preview authentication; this is a review URL, not a participant recruitment link.

The remote `main` branch remains `c3ec41df78a08a5af57f6119690e51e41ce00b17`. No merge, production promotion, production variables or production database changes were made.

- Existing quiz suite: 66,154 assertions across 16,384 lens patterns and 64 flavor patterns; all 30 actions checked.
- Existing renderer suite: all 560 flavor/zero/one/two-topping configurations and 1,200 three-topping plans; assets and script syntax pass. Existing image assets are unchanged.
- Response/domain/API suite: 41 checks pass, including validation, consent/age rejection, exact opt-in text, synthetic gate, challenge, CSV escaping, suppression, receipt hashing, share-link validation and local collection limit.
- Real local PostgreSQL suite (PGlite): 26 checks pass, including applying the schema, RLS/direct-access restrictions, immutable originals, duplicate retry behavior, valid/invalid tokens, rating updates, withdrawal/text cascade and expired-record cleanup.
- API + local PostgreSQL integration: 25 checks pass. Six synthetic records are submitted, signed-in research/analyst access is checked, a frozen report is released once, all export types are audited, audit failure blocks export, rating changes preserve originals/expiry, withdrawal invalidates reports, and modern server-key headers are checked.

Local browser verification used synthetic data only: Create without sharing; no challenge/submit before opt-in (request counters); adult consent requirement; structured sharing with text unchecked; all 12 Discover questions; separately consented expression reviewed by Research Administrator; rating updates the shared record; withdrawal confirmation; local collection; recipe-only share link. Analyst UI hides research tools and disables sensitive export choices. Role rejection is also tested server-side.

Actual deployed preview verification: homepage; Create flavor/two-topping selection and completion; disabled collection message with unchecked consent; local save/gallery/reopen; PNG data generation (`image/png`, about 1 MB encoded); full 12-question Discover completion; correct all-A Strawberry result; optional topping add/remove; final expression editing. The browser download-event observer timed out, so file arrival in the operating system's Downloads folder is not independently confirmed. PNG generation itself was verified in the DOM.

Responsive checks: deployed gallery visually inspected at 375px; deployed result visually inspected at 390px and 820px, with desktop at 1280px. DOM checks show no horizontal overflow and the figure caption starts at or below the image bottom at 390, 820 and 1280px. Local dashboard DOM widths fit 375px and 390px. Desktop organizer studio was visually reviewed. Mobile dashboard screenshot capture appears scaled in this browser backend, so its final visual review remains advisable on a physical device.

## Hosted test database update — 12 November 2026

The owner created `PeaceCream-Test` (`hyejrwwducnhpzscmofg`) in `us-west-1`. Its public/private schemas were empty before migration. The two initial migrations and the advisor-hardening migration are now applied. All six application tables have RLS enabled. Explicit server-only grants work with automatic public table exposure disabled. The role helper was moved to the non-exposed private schema, automatic-RLS event-trigger API execution was revoked without disabling the event trigger, audit/limit browser-deny policies were added, the organizer policy uses an initplan, and the audit foreign key has an index. Security advisor: no findings. Performance advisor: only informational unused indexes, expected for an empty test database; these indexes support cohort queries and organizer foreign-key operations and are retained.

The real hosted PostgreSQL database passed the synthetic transaction test in `tests/hosted-synthetic.sql`: original answer preservation, duplicate retry, no unconsented text, separately consented exact text, valid/invalid receipt rating, original immutability, unchanged retention, withdrawal and text cascade, report invalidation, expiry cleanup, and denied anonymous/authenticated direct reads/RPC calls. All fixtures were rolled back; zero submissions remain.

The daily retention job is active at `17 3 * * *` (03:17 UTC). An actual temporary cron smoke job executed the retention function successfully at 2026-11-12 08:23 UTC and unscheduled itself. This verifies the hosted scheduler, in addition to the expiry/deletion tests. The daily job remains active.

## Still pending — do not treat as passed

The real organizer Auth account has not yet been provisioned. Preview environment variables still require the owner to configure the keys directly in secure Vercel settings. No credentials have been supplied in chat.

Hosted Supabase Auth, end-to-end cloud REST/API behavior and the actual backup/restoration policy still require verification after the Preview credentials are configured. Local synthetic organizer accounts do not prove hosted Auth. The preview cannot yet submit responses or authenticate real organizers because its database configuration is absent. Hosted database privileges, RLS and cron have now been checked as described above.

Additional browser follow-up after database setup: cloud submissions with/without text consent, token withdrawal and rating against the actual provider, real organizer role changes, CSV file downloads/audits, populated dashboard charts/filtering, gallery local-delete confirmation and answer-retake/original-vs-final persistence inspection. Backend fixtures already exercise the underlying data rules, but these complete hosted workflows are not claimed as verified.

## Manual next steps

1. Completed: isolated US West test project created and identified.
2. Completed: empty schema inspected, three migrations applied, database security and hosted cron verified.
3. Owner enters Supabase URL, secret and publishable keys in **Vercel Preview only**, sets `PC_COLLECTION_MODE=synthetic`, leaves the real-collection approval variable unset, and redeploys.
4. Owner provisions the invited Auth account; add its UUID to `pc_organizers` with `research_admin`. Open `/dashboard.html` on the preview.
5. Complete the hosted synthetic verification above and approve the privacy notice, participating countries/institutions, consent, retention/backup process and security review.
6. Only after explicit owner approval should the PR be merged or promoted. Enabling real adult collection is a separate reviewed configuration decision. Do not enable it merely to make the consent button active.

See SETUP.md for exact variables, SQL, schema, withdrawal/retention operations and organizer access instructions. Ordinary reports remain finite and private. No automatic indefinite anonymized archive or public dashboard has been enabled.

## Files in this change

Participant experience: `app.js`, `index.html`, `quiz-en.js`, `quiz-engine.js`, `quiz-ui.js`, `collection.js`, `collection.css`.
Organizer studio: `dashboard.html`, `dashboard.js`, `dashboard.css`.
Server and versioned scoring: `api/[...route].js`, `lib/database.cjs`, `lib/domain.cjs`, `lib/server.cjs`, `lib/reports.cjs`, `lib/content-v1.json`, `lib/engine-v1.js`.
Database: three SQL files in `supabase/migrations/`; repeatable hosted transaction test in `tests/hosted-synthetic.sql`.
Build/setup: `package.json`, `package-lock.json`, `vercel.json`, `.env.example`, `scripts/build.mjs`, `SETUP.md`, `TESTING.md`.
Tests/local-only tooling: `tests/responses.mjs`, `tests/database.mjs`, `tests/integration.mjs`, `tests/response-fixtures.cjs`, `scripts/preview.mjs`, `scripts/local-database.mjs`.

## Privacy review references

This is a release checklist, not a conclusion that the project satisfies every country's laws. For EEA participation, review international-transfer conditions and the actual processor arrangement: https://www.edpb.europa.eu/sme/be-compliant/international-data-transfers_en . For any future younger audience, review applicability of children's privacy rules before changing the initial adult-only collection policy: https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa . Countries, institutional controller responsibilities and research-ethics requirements still need the owner's review.
