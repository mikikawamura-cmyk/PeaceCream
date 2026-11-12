# PeaceCream — $0 pilot backup and recovery runbook

12 November 2026 · Proposed operating procedure, not a running backup service.
Production remains unchanged. Only PeaceCream-Test and invented records have been used.

## Decision and limits

Continue Supabase Free. Buy nothing. Use an existing trusted computer and an existing approved private storage location for encrypted copies. This has $0 incremental service cost only while existing hardware/storage capacity is available; it does not promise free storage forever. If no independent storage or responsible operator is available, keep collection disabled.

Free Supabase does not provide the same managed daily backup offering as paid plans; its documentation recommends off-site exports. Low-activity Free projects can pause, interrupting activities that need the database, withdrawals and scheduled deletion. Check account emails and project health. A backup is not a five-year archive. [Supabase backups](https://supabase.com/docs/guides/platform/backups), [Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

The provided tool makes an encrypted **application-data** archive: responses, separately consented text, frozen reports and export audit rows. It also captures the deletion journal in the same logical snapshot. It does not back up Supabase Auth credentials, MFA secrets, sessions, platform settings or Vercel secrets. Keep reviewed migrations in Git and a separate infrastructure inventory; re-provision organizers and reenroll MFA after a cross-project disaster. Do not restore old authentication sessions. Full-project recovery still needs a Supabase-supported backup/restore strategy and testing, especially for Auth and audit foreign keys.

## What is implemented and tested

- `scripts/backup.mjs`: operator-only `backup` or `journal` export through a server-only RPC; no browser access.
- `scripts/backup-crypto.mjs`: AES-256-GCM authenticated encryption with a random nonce, private 32-byte key and no plaintext archive written to disk. A wrong key or altered archive is rejected. Files use exclusive creation and mode 0600.
- `private.pc_deletions`: transactionally records deleted response ID, cohort reference and dates. No written words, answers, passwords or receipt tokens. Its cleanup window is 35 days; the corresponding backup lifetime must be at most 30 days.
- `pc_replay_deletions`: idempotent server-only replay, response/text deletion and related ordinary-report invalidation.
- Local PostgreSQL recovery drill: an older encrypted snapshot was restored, a later journal replayed, text removed, reports invalidated and expired data purged. This is not a cloud-wide infrastructure restore drill.
- Hosted PeaceCream-Test rollback drill: same withdrawal/replay/expiry operations passed without altering the 24 retained review fixtures.

## One-time owner setup — still required

1. Name a primary operator and a trusted backup operator. Approve storage location, jurisdiction, access permissions and recovery contacts. Use an existing private encrypted drive or existing private cloud storage, with MFA where available. A folder on the same laptop alone is not an independent backup. No new account, provider or paid service has been activated.
2. Choose a location outside the repository for the 32-byte backup key. A trusted operator can generate it locally with Node's `crypto.randomBytes(32)` and write it directly to a 0600 file. Never display it in chat, commit it, or put it in a command argument. Keep a separately protected recovery copy of the key, independently from the archive destination; test that the designated recovery operator can retrieve it.
3. On the trusted operator host, configure `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `PC_BACKUP_PROJECT_REF` and `PC_BACKUP_KEY_FILE` via a local secret manager or a private environment file. Use the Test project first. Do not reuse a Production key in Preview and do not paste keys into chat. The backup host holds privileged database access: secure its account, disk and screen lock; never run on a shared/public machine.
4. With Node 22+ installed, run from the project directory: `node scripts/backup.mjs backup /approved/private/location/new-backup.pcenc`. For a journal-only archive use `node scripts/backup.mjs journal /approved/independent/location/new-journal.pcenc`. Paths name new files; the tool refuses to overwrite existing archives. The command does not upload, schedule or delete remote files.
5. Copy encrypted archives to the approved independent location. Verify successful decryption privately and record only timestamp, project, counts, archive hash, key identifier and operator in the inventory. Do not put response contents or keys in the inventory. Run the synthetic drill and complete a supervised full recovery to an isolated Test target before approving real data.
6. Approve the schedule, responsibility cover, key-loss response and retention policy below. No automatic scheduler or off-site storage is configured by this work.

## Proposed manual schedule for a small pilot

- Before each event: verify database health, the previous successful backup, free capacity and the independent journal inventory. Check the daily retention job's recent result. Do not start collection if the operator is absent or backup verification is overdue.
- During active events: take an encrypted snapshot at agreed checkpoints and at the end. The maximum loss of new responses is the time since the most recent successful independent copy; an end-of-event backup alone can lose the entire event.
- On every withdrawal: promptly copy a new encrypted journal to independent storage and record completion. Do not rely only on the database copy, which could disappear in the same failure as the responses.
- Between events: check project health, withdrawal requests and retention execution daily while operating the pilot; take a daily encrypted backup on days records change and after cleanup. Check owner emails for pausing warnings. Existing local calendar reminders may help, but no automatic monitoring is claimed.
- Keep application archives at most 30 days; keep independently copied journal snapshots at most 35 days and ensure their entries cover every backup still retained. Delete expired versions from cloud version history, trash, synchronised copies and detached drives too. A free cloud account's recycle bin can defeat a simple folder deletion.
- Review raw/text exports against the audit log. Record file owner, purpose, location, recipient and deletion deadline; delete affected copies or notify recipients after withdrawal. A database endpoint cannot remotely erase a downloaded CSV.
- Practice recovery before the first pilot and at least quarterly while continuing; recheck after schema, auth or backup changes. Document key recovery without sharing key contents.

**Manual journaling has a real gap:** a withdrawal acknowledged by the app can precede its independent journal copy. A sudden total database loss in that interval can lose the deletion record. This is not zero-loss withdrawal durability. Before real collection, either approve a documented, legally reviewed process that reconciles all requests in that gap, or implement independent synchronous withdrawal recording on an approved existing service. Do not claim a manual schedule eliminates this risk. No real collection is permitted merely because a backup file exists.

## Recovery procedure — never restore directly into a live app

1. Keep collection disabled. Put organizer research access into maintenance/restrict it at the hosting layer, and maintain an available privacy/withdrawal contact. `PC_COLLECTION_MODE=disabled` stops new submissions; it **does not** itself hide reports or stop rating/withdrawal requests. Freeze writes for a coordinated restore and capture/reconcile requests arriving during that freeze.
2. Identify the incident and trusted backup timestamp/project. Recover the most recent independently stored journal, including entries after the backup. If there is an unexplained journal gap, do not reopen research access. Reconcile the gap or discard affected cohorts/records with privacy review.
3. Verify archive integrity/decryption and age; reject backups older than 30 days under this procedure. Restore reviewed schema/migrations into an isolated target with browser grants denied. A qualified operator imports only the known application tables in dependency order inside a transaction. Do not execute arbitrary SQL recovered from an untrusted archive. Preserve IDs, token hashes, consent versions and original expiry dates; never resubmit rows through `pc_submit`, which assigns new dates.
4. On a cross-project recovery, create approved Auth users separately, map historical audit organizer references under review, and reenroll MFA. Do not silently drop audit rows to satisfy foreign keys. The current test proves response/text/report replay, not a complete cross-project Auth/audit migration.
5. Replay every available independent deletion entry with `pc_replay_deletions`, then run `pc_retention`. Verify withdrawn IDs absent, consented text cascaded, ordinary reports erased/unpublished, expired submissions/reports/audits absent, live rows intact and original expiry dates unchanged. Repeat replay safely if interrupted.
6. Reconcile all withdrawals/ratings received after the backup and during maintenance. Apply later known deletions even if they are not in the old backup. Secure or replace exported copies; notify recipients as necessary. Record evidence without response text.
7. Recheck RLS/grants, active organizer roles, AAL2 enforcement, session revocation, API configuration, cron schedule and actual mobile/signed-out activity access. Rotate compromised credentials directly in secure settings, never in chat.
8. Only after the owner approves the recovery, redirect the reviewed application to that target and restore access. Keep new collection disabled until separately authorized. Monitor cleanup and take a fresh independent encrypted backup/journal; securely expire temporary restored copies and obsolete archives.

## Stop conditions

No independent copy; lost key; failed backup/decryption; missed deletion job; paused project; untracked raw exports; unexplained journal gap; unclear controller/notice; or absent operator cover: suspend new collection and investigate. Production launch remains a separate explicit approval.
