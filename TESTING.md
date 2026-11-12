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

## Still pending — do not treat as passed

The Supabase connector currently lists no projects. The owner elected to create the isolated US West test project themselves. No cloud database has been migrated or seeded, no real organizer account has been provisioned, and no credentials have been supplied in chat.

Hosted Supabase Auth, cloud REST/RLS behavior, security advisors, cron scheduling/execution and the actual backup/deletion/restoration policy still require verification after setup. Local PostgreSQL and local synthetic organizer accounts do not prove these provider-specific controls. The Vercel preview currently cannot submit responses or authenticate real organizers because its database configuration is intentionally absent.

Additional browser follow-up after database setup: cloud submissions with/without text consent, token withdrawal and rating against the actual provider, real organizer role changes, CSV file downloads/audits, populated dashboard charts/filtering, gallery local-delete confirmation and answer-retake/original-vs-final persistence inspection. Backend fixtures already exercise the underlying data rules, but these complete hosted workflows are not claimed as verified.

## Manual next steps

1. Owner creates an isolated Supabase test project in US West and provides only its project name/reference (not keys).
2. Inspect the new project's tables, then apply both migrations. Confirm cron and security advisors.
3. Owner enters Supabase URL, secret and publishable keys in **Vercel Preview only**, sets `PC_COLLECTION_MODE=synthetic`, leaves the real-collection approval variable unset, and redeploys.
4. Owner provisions the invited Auth account; add its UUID to `pc_organizers` with `research_admin`. Open `/dashboard.html` on the preview.
5. Complete the hosted synthetic verification above and approve the privacy notice, participating countries/institutions, consent, retention/backup process and security review.
6. Only after explicit owner approval should the PR be merged or promoted. Enabling real adult collection is a separate reviewed configuration decision. Do not enable it merely to make the consent button active.

See SETUP.md for exact variables, SQL, schema, withdrawal/retention operations and organizer access instructions. Ordinary reports remain finite and private. No automatic indefinite anonymized archive or public dashboard has been enabled.

## Files in this change

Participant experience: `app.js`, `index.html`, `quiz-en.js`, `quiz-engine.js`, `quiz-ui.js`, `collection.js`, `collection.css`.  
Organizer studio: `dashboard.html`, `dashboard.js`, `dashboard.css`.  
Server and versioned scoring: `api/[...route].js`, `lib/database.cjs`, `lib/domain.cjs`, `lib/server.cjs`, `lib/reports.cjs`, `lib/content-v1.json`, `lib/engine-v1.js`.  
Database: both SQL files in `supabase/migrations/`.  
Build/setup: `package.json`, `package-lock.json`, `vercel.json`, `.env.example`, `scripts/build.mjs`, `SETUP.md`, `TESTING.md`.  
Tests/local-only tooling: `tests/responses.mjs`, `tests/database.mjs`, `tests/integration.mjs`, `tests/response-fixtures.cjs`, `scripts/preview.mjs`, `scripts/local-database.mjs`.

## Privacy review references

This is a release checklist, not a conclusion that the project satisfies every country's laws. For EEA participation, review international-transfer conditions and the actual processor arrangement: https://www.edpb.europa.eu/sme/be-compliant/international-data-transfers_en . For any future younger audience, review applicability of children's privacy rules before changing the initial adult-only collection policy: https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa . Countries, institutional controller responsibilities and research-ethics requirements still need the owner's review.
