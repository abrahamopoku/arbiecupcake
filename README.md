# Arbiecupcake

Snapshot of all 39 deployed Supabase Edge Functions, retrieved 31 October 2026.

- `supabase/functions/`: 78 original TypeScript source files.
- `inventory.json`: deployed function versions and configuration.
- `REVIEW.md`: initial static review and recommended fixes.

Environment secret values and database data are not included. This snapshot preserves known security and functional defects; read REVIEW.md before deploying. It is the backend function export, not the complete frontend website or database backup.

Public export: hardcoded Hubtel credential fallback values were removed from two functions. Configure credentials through Supabase secrets. Live deployments were not changed.
