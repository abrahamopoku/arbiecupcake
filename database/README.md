# Database schema export

Schema reference for all 44 public application tables, captured 31 October 2026. Includes columns, constraints, 7 custom functions, 6 triggers and 85 RLS policies. Index definitions and table grants are in indexes_and_grants.json.

This is a reference export, not a tested migration or one-command restore. Review dependency order and Supabase prerequisites before use. Current access policies are preserved and may contain security defects. Nothing was applied to the live database.

Table row data is retained separately in the private database backup because it contains personal, payment and credential information. No row data or credential values are included in this directory.
