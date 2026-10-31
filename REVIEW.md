# Arbiecupcake Edge Functions — initial static review

Retrieved 31 October 2026 from project myuridgryxezbqcnnjzr. Contains all 39 deployed functions, their returned source files and deployment inventory. No production changes or function invocations were performed. Secret environment values, database contents, frontend callers and external gateway rules were not retrieved. This is a source export and initial review, not a complete database backup or runtime security audit.

## Priority findings

1. CRITICAL: setup-admin-user accepts email/password without authenticating the caller, resets an existing user's password and promotes the admin_users record to super_admin. create-admin-user similarly accepts a caller-selected role without authorizing the caller. Both use the service-role key and have verify_jwt=false. Restrict these endpoints immediately; an external gateway could mitigate reachability but is not established by this review. Do not test by creating users or resetting passwords in production.
2. HIGH: create-admin-user logs the supplied plaintext password. Remove this log and review access and retention of historical logs; reset affected passwords and revoke affected sessions as appropriate.
3. HIGH: hubtel-checkout-callback and hubtel-training-payment-callback accept success indicators from incoming JSON without authenticating the callback or independently verifying payment with Hubtel. The checkout callback writes paid/confirmed states with privileged access. The training callback reads amount but does not compare it before marking the registration Paid. Establish provider-supported callback verification and authoritative transaction, amount, currency and reference matching before granting payment credit.
4. HIGH: All 39 functions have verify_jwt=false. Their source does not establish caller authentication/authorization before privileged operations. This is particularly serious for add-expenditure, fetch-function-logs, download-manual-receipt-pdf and Google Calendar creation. Public webhooks need separate provider authentication; merely enabling JWT checks everywhere would break callbacks and does not establish admin authorization.
5. HIGH FUNCTIONAL: send-newsletter and send-training-email-smtp only log placeholder send operations and return success. send-manual-receipt-email and resend-manual-receipt-email also contain placeholder delivery and mark email_sent=true. Replace placeholders with real provider calls; distinguish accepted, delivered and failed states.
6. MEDIUM: momo-pay can simulate payment status, including randomly reporting SUCCESSFUL, when credentials are missing/placeholders. send-order-sms returns mock success when Twilio credentials are absent. Production should fail clearly instead of reporting simulated business success.
7. MEDIUM: generate-recipe-pdf returns text/html and a .html attachment, not PDF bytes. Recipe title and content are interpolated into HTML without escaping. Generate a real PDF if required and escape untrusted template inputs.
8. MEDIUM: Payment callbacks do not visibly enforce an atomic, idempotent state transition. Replayed checkout success callbacks can resend confirmation emails; later callback states can overwrite earlier payment state. Add deduplication, transition rules and a transactional outbox or equivalent.
9. MEDIUM: Several callback writes and outbound requests ignore returned errors or HTTP status, allowing success responses after partial failure. Check every important write and request; retry notifications independently from payment recording.

## Recommended sequence

Protect admin setup and sensitive operations first; remove plaintext password logging. Then secure payment callbacks and idempotency, implement actual mail delivery, remove production mock success, and standardize PDF and notification behavior. Verify fixes in an isolated test environment using unauthorized access, wrong amounts, callback replays, provider failures and duplicate submission cases.

## Scope and reuse

supabase/functions contains the source as returned by Supabase, including per-function cors.ts files. inventory.json preserves deployed versions and configuration. Do not deploy this snapshot unchanged: it deliberately preserves the reviewed defects. Environment secrets are not included. Similar function names do not establish which callers still use them; inspect frontend calls and runtime usage before consolidating or deleting payment or email variants.

## Export credential finding

Hardcoded Hubtel API credential fallbacks were found in hubtel-momo-payment and hubtel-check-payment-status. Their values were removed from this public export. Rotate the affected Hubtel credentials and remove fallbacks in the live deployments. No live changes were made during export.
