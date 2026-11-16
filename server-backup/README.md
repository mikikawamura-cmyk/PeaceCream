# PeaceCream server backup candidate — offline only

Status: synthetic-only implementation, not deployed or operational. No Google
account, token, destination, real encryption key, email or schedule is configured.
No desktop backup software is required by the proposed hosted workflow. Development
tests run locally with existing Node/PGlite; future operation does not depend on
this Mac. No new dependencies were added.

## Implementation

- `core.mjs`: existing AES-256-GCM codec, encrypted archive envelope, signed pull
  requests, persistent nonce claim, independent withdrawal acknowledgment before
  database deletion, and isolated recovery with a freshly signed journal manifest.
- `protocol.cjs` / `apps-script/Protocol.gs`: identical shared validation, HMAC,
  freshness/nonce binding, canonical Base64, hashes, size bounds and journal chain.
- `apps-script/Companion.gs`: Google-hosted companion, explicit owner check,
  app-created private folder, Drive API v3, readback, serialized journal append,
  independent chain head in Script Properties, success/failure notices and stale
  backup watchdog. It never creates a trigger or enrolls in a vendor console.
- `adapters.mjs`: synthetic-only source connection pinning; existing snapshot,
  rate-limit and deletion RPCs; transactionally isolated SQL recovery. Existing
  migrations are reused. No schema migration was created or applied.
- `transport.mjs`: explicit opt-in, injected network client, fixed Google endpoint,
  bounded response, and restricted ContentService redirect handling. It never
  forwards the signed POST or credentials to a redirect target.
- `worker.mjs` / `vercel-entry.mjs`: dormant integration factories. They are NOT
  installed API routes. Importing the files does not connect to a service.
- `lib/server.cjs`: adds an injected synthetic-only withdrawal workflow option.
  If explicitly selected but missing/failing, it refuses withdrawal confirmation;
  it does not fall back to the DB-only deletion path. Existing deployed APIs were
  not updated. Existing preview withdrawal behavior is NOT being described as
  independently journaled until the new factory is explicitly wired and deployed.

The original encryption implementation was reused, not replaced. The new cloud
archive envelope is versioned and differs from old local rehearsal envelopes;
no silent legacy conversion is attempted. Old local files and keys are untouched.

## Default gates and configuration

Server: both PC_SERVER_BACKUP_MODE and PC_COLLECTION_MODE must be `synthetic`;
PC_REAL_COLLECTION_APPROVAL must be absent. The approved 20-character project
reference must exactly match SUPABASE_URL. The source adapter rejects real rows.
PC_BACKUP_KEY_B64 must represent exactly 32 random bytes, canonical Base64.
PC_PULL_SECRET and PC_PUSH_SECRET must be distinct, high-entropy secrets.
PC_APPS_SCRIPT_URL must be the approved script.google.com deployment URL.
A network client must be injected explicitly; no default network client is used.
Do not put actual keys in source, URLs, chat, test output or Google Drive.

Apps Script properties start absent/disabled. A future approved synthetic setup
would configure PC_MODE=synthetic, PC_EXTERNAL_APPROVED=synthetic-only,
PC_PROJECT_REF, PC_OWNER_EMAIL, PC_PULL_SECRET, PC_PUSH_SECRET and
PC_VERCEL_BASE_URL (an exact HTTPS *.vercel.app origin). initializeSyntheticStore
checks the intended owner, creates an app-owned folder and empty independent
head, and refuses to overwrite an existing setup. Interrupted initialization is
an operator-visible error, never a reason to recreate a missing ledger head.

PC_EMAIL_APPROVED and PC_SCHEDULE_APPROVED are separate flags. Both are absent
and disabled. Code has no automatic trigger installation. The manifest omits
trigger-management scope. Later approved triggers can be created through Google's
UI for scheduledBackup and scheduledWatchdog. An independent watchdog trigger
can detect a backup that never started, but cannot detect the entire Google
account/platform disappearing while both triggers are stopped.

No production mode exists in this candidate. Changing one flag cannot enable
real collection or a real-data backup. Existing app collection approval gates are
unchanged. No credentials or project configuration were read from a live account.

## Scope verification: what is and is not established

The explicit Apps Script manifest contains ONLY:

1. https://www.googleapis.com/auth/drive.file
2. https://www.googleapis.com/auth/script.external_request
3. https://www.googleapis.com/auth/script.send_mail

No DriveApp, GmailApp, broad Drive scope, mailbox-reading scope, permission-changing
API, automatic authorization fallback or console logging appears in the companion.
It uses Advanced Drive v3 and authenticated media retrieval with getOAuthToken.
Google documents drive.file support for the relevant create/get/list/about methods.
MailApp needs send-mail permission; it does not need mailbox access. Google says
getOAuthToken uses the script's current scopes, and the manifest fixes that set.

The VM verifies the actual Apps Script source against simulated APIs; it does NOT
implement Google's permission system or prove Workspace administrator policy.
A scope denial returns failure and cannot change the manifest or broaden grants.
It is NOT yet known whether this exact hosted deployment and organization permit
all intended operations with those scopes. No token introspection URL is used.

Mandatory later manual cloud probe, only after approval:
- Create a fresh organization-owned test script, with these exact scopes and no
  inherited broad authorization; verify the account on Google's consent screen.
- Create/read app-owned synthetic encrypted files and confirm private ownership.
- Have the owner identify an unrelated synthetic control file created outside the
  app, with no Picker/open-with grant; its metadata/content must not be accessible.
  Do not scan or open unrelated organizational documents.
- Verify listed files are app-authorized and that a denial never requests drive.
- If the test fails, stop; do not request unrestricted Drive access.

A future Vercel-to-Script withdrawal receiver needs an organization-permitted web
app endpoint executing as its owner, protected by signed, fresh request bodies.
This can require permission to expose a Google web-app URL to unauthenticated
HTTP callers; HMAC is the application authentication layer. That is a separate
security decision, not permission to share the Drive folder. If organizational
policy disallows it, the current design is blocked; do not loosen policy silently.
Invalid signatures are rejected before Drive/account API work. Invocation-quota
DoS protection and real deployment behavior remain hosted-review items.

## Recovery and withdrawal guarantees within the tested model

The new path validates the participant's receipt in the source database, encrypts
minimal deletion metadata, and writes it independently. The companion reads back
and hashes the file, commits its chain head, then signs the acknowledgment. Only
then does the source database delete occur. Lost responses and one interrupted
head commit are handled idempotently. A database failure after the independent
commit returns a pending/failure result; the intent remains replayable.

This is a write-ahead protocol, not a cross-provider SQL transaction. A request
that never reached independent storage cannot be called completed. No permanent
independent-sink failure can be hidden by declaring a withdrawal successful.
Parallel work is serialized by Script Lock; actual cloud concurrency is untested.

Recovery fetches a freshly authenticated independent journal manifest with a new
nonce. It verifies every sequence, previous hash, ciphertext digest and current
independent head. A missing/corrupt entry or head, stale reply, missing key or
wrong project stops recovery before target writes. It replays snapshot deletion
metadata as well as later independent withdrawals. It applies existing retention
and text cascades, clears affected report data, and leaves ALL reports unpublished.
The target must be explicitly isolated, declared different from the source, and
empty. A failed import rolls back; an occupied target is never overwritten.

The real PostgreSQL test intentionally drops source response tables AFTER the
independent withdrawal write but BEFORE the source deletion could commit. Restore
from the older encrypted snapshot removes that withdrawn response and its text,
removes expired data, preserves the live response, and does not publish reports.
It also exercises rollback after a partly completed SQL import and denied browser
access to recovery RPCs/deletion metadata.

This does not protect against simultaneous loss/rollback of Drive and Script
Properties or a compromise of both hosted credentials. The independent ledger
head must not be rebuilt from a possibly incomplete remaining file list. A Google
account-loss/migration plan and separately protected key recovery remain needed.

This is logical participant-data recovery, not full Supabase-platform recovery.
Auth credentials, sessions, MFA enrollment, roles, settings and storage assets are
not in the existing snapshot. Recreate/review organizer access separately. Audit
records reference Auth UUIDs; missing target references cause an atomic failure
until their mapping/recovery is explicitly reviewed. No silent audit deletion or
unreviewed Auth reconstruction is performed.

## Limits, cost and retention

A ciphertext archive is capped at 3,000,000 bytes. The signed Base64 response fits
below the conservative 4.5 MB normal Vercel response limit. Oversized snapshots
fail before transfer. The existing SQL snapshot also caps participant count at
10,000. The complete journal response is bounded; a large ledger fails closed
rather than being silently truncated. Cloud latency, function duration, Google
quotas and capacity MUST be measured using the hosted synthetic trial.

The initial implementation rereads the journal when checking append/recovery.
This favors simple correctness at pilot scale; it is not a proven scalable ledger
for years of events. Before real use, establish measured capacity thresholds and
review checkpointing/pagination if necessary. No unsupported free-tier guarantee.

Daily snapshots imply approximately one-day potential response loss. Withdrawals
use synchronous independent recording rather than waiting for the daily job.
The synthetic restore rehearsal refuses snapshots older than 30 days; this is a
safety boundary, NOT approval of organizational retention. Independent journals
are not discarded merely because they are older than a snapshot. No automated
Drive deletion or archive expiry has been implemented or activated. Retention
must be approved against all recoverable snapshots, Trash, Vault and holds before
real collection; five-year source retention is reused, not a five-year backup policy.

The intended pilot fits a $0 additional-cost design within existing free-tier and
Workspace quotas, subject to plan eligibility and storage capacity. No paid mail
provider, desktop application, subscription or billing setup is introduced.
Supabase Free can pause; the independently hosted companion should report source
failure. Email/Google outages, account disablement or quota exhaustion can prevent
notifications too. Status emails are best effort, not an independent monitoring SLA.

All sample data, secrets and keys used by tests are generated/invented locally.
Actual keys must be backed up outside Google Drive/email and outside reliance on
Supabase/Vercel account recovery alone. Never destroy an old key while its backups
remain recoverable. Key rotation, external recovery custody, log-drain/payload
capture review and production approval remain prelaunch requirements.

## Tests and next approval

Run within the existing repository: npm run test:server-backup. These tests are
also included in npm test. They use existing Node/PGlite plus a VM running the
actual .gs files with simulated Drive, HTTP and MailApp services. No live network,
OAuth, real emails, timers or cloud data are used. No new test dependencies.

Next requested approval: an isolated, MANUAL hosted synthetic trial—Vercel preview
only, a new Apps Script in the organizational account explicitly chosen by the
owner, the exact three permissions, and synthetic encrypted Drive create/read/
restore probes. The owner must personally approve Google's consent screen. This
is NOT permission to send emails, create timers, change production, enable real
collection, use broad Drive access or connect a different Google account. Email
delivery and actual timer reliability remain separately gated future tests.

Before that trial, bind the dormant factories to the isolated test endpoints and
secure environment properties, verify project/account pinning, and inspect the
concrete deployment diff. Production and the existing production branch stay
unchanged. No publish, push, merge, authorization or deployment occurred here.

## Primary references reviewed

https://developers.google.com/apps-script/advanced/drive
https://developers.google.com/apps-script/concepts/scopes
https://developers.google.com/apps-script/reference/script/script-app#getOAuthToken()
https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get
https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get
https://developers.google.com/apps-script/reference/mail/mail-app
https://developers.google.com/apps-script/guides/services/quotas
https://developers.google.com/apps-script/guides/web
https://vercel.com/docs/functions/limitations
https://supabase.com/docs/guides/platform/backups
