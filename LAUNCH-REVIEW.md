# PeaceCream launch review — 12 November 2026

## Progress update — 12 November 2026

Organizer TOTP is now implemented and enforced for every Studio data route, and the owner completed Test enrollment. Authenticated AAL2 access was observed. Fresh role and session checks reject revoked/expired sessions; logout requests provider-local signout. The encrypted application snapshot tool, minimal 35-day deletion journal and idempotent recovery replay are implemented. Local encrypted restoration and hosted rollback drills pass. A $0 manual operating proposal and explicit owner actions are in RECOVERY-RUNBOOK.md and PRODUCTION-CHECKLIST.md. No off-site destination, independent-copy schedule or full infrastructure restoration is established yet. The manual withdrawal-journal gap remains an approval blocker. Those documents supersede older pending-authentication statements below.

## Decision today

Ready for a private synthetic review, not yet approved for real international response collection. Production is unchanged. The feature preview remains in synthetic mode, with no real-collection approval variable. No subscription changes, production credentials, new production database or launch authorization have been made.

For the proposed pilot of up to 100 people per event, the Free plan can support a bounded pilot technically. It does not by itself provide the operational safeguards needed for a five-year research commitment. Close the backup/restoration, authentication and international privacy items below first. Pro is worth considering for operational reliability, but upgrading alone would not close the privacy or deletion gaps.

Review the working application:

- [Organizer Studio](https://peacecream-git-feature-anonymous-responses-peace-7909.vercel.app/dashboard.html)
- [Participant activities](https://peacecream-git-feature-anonymous-responses-peace-7909.vercel.app/)
- [Draft participant privacy page](https://peacecream-git-feature-anonymous-responses-peace-7909.vercel.app/#privacy)
- [Feature PR](https://github.com/mikikawamura-cmyk/PeaceCream/pull/1)

## What is verified

The hosted database has RLS, server-only table/RPC grants, versioned original answers, server recalculation, separate opt-in text, token-protected rating/withdrawal and five-year expiry dates. Real browser tests verified saving a synthetic Discover response, updating the same record's rating without extending expiry, and withdrawing its response and text. Research Administrator text review and an audited raw export worked. Unsigned, analyst and deactivated-organizer access were denied. The owner was restored as the sole active Research Administrator.

The daily retention job is active at 03:17 UTC; a real scheduler smoke test succeeded. This verifies the deletion mechanism, not five years of future uptime. It must be monitored. Cleanup runs daily, rather than continuously, and failures or a paused project can delay physical deletion. A new API guard also excludes expired responses from research reads/exports/report release before cleanup runs; regression tests pass.

## Free plan: capability and limits

The connected organization is confirmed to be on Free. Published allowances include a 500 MB database, 5 GB egress and two active projects; low-activity Free projects may pause after a week. For 100 compact questionnaire records per event, capacity is unlikely to be the first bottleneck. This is an engineering assessment, not a load-test guarantee. Photographs are served by Vercel, not Supabase database storage. Only organizers use Supabase Auth; participants do not create Auth accounts. [Current Supabase plan details](https://supabase.com/pricing).

Free requires an owner-operated backup process: Supabase recommends regular CLI database exports and off-site backups. Paid plans provide managed daily backups; Pro retains seven days. A backup is a recovery copy, not a five-year research archive. [Backup documentation](https://supabase.com/docs/guides/platform/backups).

Pausing affects availability and database jobs. Monitor warning emails and project health, and run expiry cleanup before reopening a resumed/restored database. Paid projects avoid inactivity pausing. For unattended, multi-year international use, this is a reason to consider Pro. No plan upgrade is authorized here. [Pausing policy](https://supabase.com/docs/guides/platform/free-project-pausing).

The app also has its own pilot limits: a shared 500-submission/hour capacity guard, 16 KB request limit, bounded exports (roughly 10,000 rows per scoped query), and a text-review screen showing at most 100 entries. These are independent of provider quotas. Multiple simultaneous events and future longitudinal datasets need monitoring, narrower exports or pagination work. The current proof-of-work/global limits reduce casual abuse but are not a complete public-site abuse defense.

Check the hosting plan's usage eligibility too. Vercel describes Hobby as personal/non-commercial; confirm the intended institutional use against its current terms instead of assuming all educational/nonprofit uses qualify. [Vercel Hobby guidance](https://vercel.com/docs/plans/hobby).

## Authentication review

Current Studio access requires password plus verified TOTP with a Secure, HttpOnly, SameSite=Strict cookie lasting at most an hour. The backend checks an active database role on every protected request; deactivation was verified to block an existing session. This does not mean every possible stolen-token/session scenario has been audited. App logout clears the cookie; provider-local logout revokes the session and the backend checks session existence. Owner-led lost-factor recovery and full disaster recovery still need operational rehearsal.

TOTP MFA is implemented and enforced for all Studio organizers, including Research Administrators. Supabase's TOTP API is available without a paid plan, and the Studio now implements enrollment/challenge and AAL2 enforcement. Owner Test enrollment is verified. Enabling MFA on the Supabase platform account protects the platform account, not automatically the separate Studio login. Use MFA on Supabase, GitHub and Vercel owner accounts as well. [Supabase TOTP documentation](https://supabase.com/docs/guides/auth/auth-mfa/totp).

Disable public Auth sign-ups if only invited organizers are intended; confirm email/password recovery and authorized redirect URLs. Public sign-up settings have not been independently verified. Unapproved Auth users receive no organizer role, so signup alone cannot read participant data. Use unique generated passwords, individual organizer accounts and prompt revocation. Test recovery without placing passwords, keys or codes in chat or logs.

One current Supabase Auth advisor warning remains: leaked-password protection is off. Supabase offers that check on Pro and above. A strong unique password and MFA help, but do not make the warning disappear. This does not justify silently upgrading the plan. [Password-security documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## What the dashboard analyzes

The review event is named synthetic-launch-review. It contains 12 invented Create responses and 12 invented Discover responses, with four separately opted-in written examples. These fixtures are deliberately retained in PeaceCream-Test for the owner's review and are not research findings. They must not be migrated to a real collection database.

Create reports cover original/final values, final flavors, topping combinations, flavor/topping changes, ratings and completion. Create rows have no fabricated quiz answers or lenses. Discover adds original Q1–Q10 distributions, Q11 choices, recommended flavor/inner-peace quality, five lens count/normalized distributions, suggested values and acceptance decisions. Q12 exact words are available only with additional text consent and Research Administrator access. Actions, original/latest retakes and other structured details are stored/exportable; not every field currently has a dedicated chart.

Dashboard totals mean participants in released cohorts, not all activity visits or every live submission. Cohorts must be closed and reviewed, contain at least five responses, and are frozen by event/year/mode/version. Date filters select whole years. Later responses/ratings do not silently refresh a frozen report. Decide cohort-closing and late-response rules before the pilot; use distinct event/wave codes where needed. Withdrawn/expired records are excluded. Ordinary reports are invalidated on withdrawal and cannot be regenerated for the same cohort, reducing differencing risk.

Small nonzero counts and complementary cells are suppressed. The demonstration deliberately includes rare counts to show that behavior. This is disclosure control for private, finite-retention reports, not proof of anonymization. Rare combinations, external information and multiple metrics still require review. No public dashboard, automatic quotation publication or indefinite anonymous archive is enabled. Raw exports remain potentially identifying and require institutional controls.

## Retention, withdrawal and backups: remaining blockers

Live-table withdrawal and expiry deletion work. It would be inaccurate to call the whole data lifecycle fully operational yet:

1. No encrypted off-site backup schedule, retention schedule or restore drill has been established in this work.
2. A database-local minimal deletion journal and tested replay now exist. An independent durable copy and gap-reconciliation process are still required to protect against losing the database itself.
3. Downloaded raw/text CSVs are not remotely erased by the withdrawal endpoint. Export audit entries exist, but a file inventory, deletion notifications and recipient deletion process are not implemented.
4. Cron failure alerting and an assigned operations owner are not configured here. Pausing/outages can prevent timely physical cleanup.

Before real data, choose an encrypted backup destination, access owners, frequency, recovery target and short rolling backup expiry. A minimal withdrawal/deletion journal or equivalent audited process must survive independently of the backup being restored, contain no response contents, and have its own approved finite retention. Perform a synthetic restore in isolation, replay withdrawals, run expiry cleanup, verify no expired/withdrawn records return, then reopen service. Keep raw/text export inventories and require deletion/replacement of affected copies. Do not keep raw exports indefinitely or treat ordinary aggregates as anonymous.

Five years is a maximum, not a justification to retain every field for that duration. Document why it is needed and allow earlier withdrawal. UTC dates are used. Rating updates do not restart the clock. If a participant loses their local receipt, privacy contact is peacebymiki@gmail.com; locating a record cannot be guaranteed without a reliable identifier.

## International privacy and consent review

The present notice is a draft. Before recruitment, identify the legal controller(s), institutional responsibilities, actual countries, educational/research purposes, lawful basis, rights/complaint route, processors/recipients, transfer mechanisms and retention rationale. Obtain institutional/ethics review where applicable. US West hosting is not a worldwide compliance determination. EEA transfer safeguards are additional to having a lawful basis and processor contracts. [EDPB transfer guidance](https://www.edpb.europa.eu/sme/be-compliant/international-data-transfers_en).

Review country-specific requirements for the actual pilot, including UK, Japan or Thailand if recruited; do not infer applicable law solely from the server region. Assess whether volunteered text or planned inferences could reveal sensitive beliefs. Do not automatically classify all peace-value choices as sensitive, or assume they can never be sensitive. Keep collecting the minimum needed.

Consent remains optional and unchecked. Refusal must leave all activities/local saves usable. Original and final exact words need a separate opt-in. The initial database collection is 18+ through self-attestation, not independent age verification. Younger users' activity access, technical logs and third-party requests still require age-appropriate review before targeting minors. Future under-18 collection needs a separately approved process. [FTC children's privacy guidance](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa).

Vercel/Supabase technical logs and Google Fonts requests are outside the participant response tables. Review their actual retention/processing and consider self-hosting fonts. Finalize accessible translations and comprehension checks for recruitment languages. Update the privacy page's preview-only wording and consent version consistently before launch.

## Ordered prelaunch checklist

- [ ] 1. Owner names the pilot controller/institutions, countries, adult audience, event size and operations contact.
- [ ] 2. Privacy/ethics reviewer approves purposes, lawful basis, rights, transfers, five-year rationale and separate text consent.
- [ ] 3. Owner reviews the live consent and both synthetic dashboard modes; approves final notice text and translations.
- [ ] 4. Engineering adds/enforces Studio TOTP MFA (implemented) and verifies session revocation/recovery; owner secures platform accounts and confirms invitation-only Auth configuration.
- [ ] 5. Owner chooses Free with documented operational duties or approves a paid plan; checks hosting-use terms. No upgrade is automatic.
- [ ] 6. Operations establishes encrypted backups, bounded backup/export retention, deletion replay, restoration testing and cron/health alerts.
- [ ] 7. Owner approves a separate clean production database and region; preserve PeaceCream-Test and keep Preview synthetic-only. Do not copy review fixtures.
- [ ] 8. Engineering applies reviewed migrations and provisions only authorized production organizers; runs advisor, consent, rejection, role, expiry, withdrawal and recovery tests there using synthetic fixtures.
- [ ] 9. Engineering verifies peak-event behavior, failure messaging, mobile layouts, scoped exports and cohort-closing rules.
- [ ] 10. Owner signs off the exact PR/commit, notices, production database and operational runbook, then explicitly authorizes launch.
- [ ] 11. Deploy the approved code to Production with collection still disabled. Check both activities and signed-out participant access at the public URL.
- [ ] 12. Only after approval, enter production-only credentials securely, set the real-collection gates below, redeploy, verify the live consent and monitor the first event. Keep a tested stop-collection procedure ready.

## How real collection would be enabled after approval

These are future instructions, not actions taken today. Production must point to the approved clean production Supabase project, with separate credentials entered directly in secure Production settings. Preview must continue pointing to PeaceCream-Test in synthetic mode.

After all release checks and explicit owner authorization, set PC_COLLECTION_MODE=enabled and PC_REAL_COLLECTION_APPROVAL=reviewed-18plus-five-years in Production only, then redeploy the reviewed commit. Both gates are required; the string is a technical switch, not legal approval. Verify /api/config reports enabled, verify a clearly identified test response and its withdrawal, and confirm no visitor login is required for activities. The Organizer Studio must still require authorized sign-in.

To stop new sharing, set PC_COLLECTION_MODE=disabled and redeploy. Keep production database credentials and rating/withdrawal access available so previously consenting participants retain control; change the collection mode rather than removing the database connection. Reverting to an old production build without the API is not an acceptable withdrawal continuity plan. A real rollback plan must preserve withdrawal, privacy contact and retention jobs.

Keep collection disabled until the owner approves this launch. A merge or a paid subscription alone must never be treated as that approval.

## Review-data cleanup after approval

The 24 synthetic rows and two private reports are intentionally left in PeaceCream-Test so the owner can review both modes. No real records exist. After review, an authorized operator can remove the event only in that test project, first verifying every matching row is synthetic. Delete the two matching pc_reports snapshots and the synthetic-launch-review pc_submissions; pc_text cascades. Preserve export audit history according to its policy. Never run this cleanup against a real production database or reuse these invented results as research evidence.
