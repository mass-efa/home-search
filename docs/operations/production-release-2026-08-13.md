# Internal Production Validation Record — 2026-08-13

Status: trust and fail-closed backend scope passed; full internal production
validation remains in progress; external invitations are not authorized.

## Frozen candidate

- Branch: `codex/homei-three-stage-security`
- Commit: recorded by the commit containing this file.
- Product contract: canonical `pre_tour`, `post_tour`, and `pre_offer` stages.
- Approval/evaluation policy: existing versioned values embedded in the
  candidate and deployment; no policy gate was relaxed for this validation.

## Production deployment

- Supabase project ref: `lqqancjtxsurfqxremcs`
- Edge Function: `evaluate-home`
- Function ID: `4c37b13b-0fad-4af5-85a9-d757aa9bc8c0`
- Production version: `11`
- Status at verification: `ACTIVE`
- Platform JWT verification: `true`
- Supabase bundle digest: `65413478fe96672be56d16b11b1aaa26d6451867bb6b672e2fdad82714ebf8c6`
- CORS preflight from `https://mass-efa.github.io`: `204` with that exact
  `Access-Control-Allow-Origin` value.
- Unauthenticated POST: `401 UNAUTHORIZED_NO_AUTH_HEADER`.
- `OPENAI_API_KEY`: present in production secret inventory; its value was not
  exposed or recorded.
- `AUTOMATED_APPROVAL_ENABLED`: explicitly set to `false` before deployment.
- Database release control after migration: `false / 0 / 0` for enabled,
  maximum releases, and used releases.

## Forward migration ledger

Production did not contain `supabase_migrations.schema_migrations`; prior
schema changes had been applied through the dashboard. The following reviewed
forward migrations were therefore applied in the SQL Editor as separate,
explicit transactions after a read-only schema/data preflight. Historical
`002` and `003` were not replayed or changed.

| Migration | SHA-256 | Production result |
| --- | --- | --- |
| `202608130004_wave1_trust_foundations.sql` | `7650e1e64510ae947961323ecfe9edf23d20e79de2a7bf7aa0afddfaa2913277` | Success |
| `202608130005_p0_contract_and_read_auth.sql` | `22657028d1e1654202b9f33b409d9396ce9b90798e582971af458c40ce5c055c` | Success |
| `202608130006_p0_function_privileges.sql` | `9e9fe37dac643dc7899bbb388aa61ece1fb2414522a4fb078446978495e2f223` | Success |

Postflight confirmed four existing requests migrated from `considering-tour`
to `pre_tour`; canonical stage, analysis-depth, no-video, and 20 MB constraints
are validated; the bucket is private and capped at 20 MB; preference versions
are allocated only through the recent-auth RPC; anonymous execute is denied for
all Homei functions; automatic release is service-role only.

Before the next schema release, reconcile this manual production ledger with a
managed migration-history workflow. Do not replay already applied migrations.

## Edge bundle source ledger

These are the local source hashes used by production version 11:

| Source | SHA-256 |
| --- | --- |
| `supabase/functions/evaluate-home/index.ts` | `a9bf71ab976afc7881c2156d600ef9a381a6ebcb6b43020e161b9c2075ddecf4` |
| `supabase/functions/_shared/trust-policy.mjs` | `04bb818fd34b0b0d7b7721aaef6b9216584f9acfd8b4a542ad3a8a2acd29940f` |
| `lib/sources/king-county-property-identity.js` | `9b0a9daebcd92e91b6c01f62116eeeff7c8d60521537b98e3c66725a4dfca2e0` |
| `lib/sources/seattle-safety.js` | `436d6d3a92625afc2cebf378dcf8f8babc443afa1272518c2a88366ac835317e` |
| `lib/sources/seattle-schools.js` | `bd54a1a5640a35d982bb168b845363d4a142412993cac3fe70f5806e9dca66bb` |
| `lib/evidence/index.js` | `9e1b1e2060782f77edb85697d121470cd1504ff4c9d13ae6443f1708ab138dd8` |
| `lib/listing/listing-url.js` | `1b253016131855c50a4e4068807f28fc9d1e136e9f8c603a274df85cdb826768` |
| `lib/approval/validators.js` | `d77a6cfab8e071abf0df83853c21454320479c4ceed28dd0b0e19c22bf15bffe` |
| `lib/approval/index.js` | `5e9829dd375795dddf334386a2b0daf48304d07c22d39caaad850a35547ecc87` |

## Live validation evidence

- Two disposable production users could each read one owner workspace and zero
  rows for the other user's workspace.
- Direct table insert into preference versions returned `403`.
- A cross-user Edge request returned `404 Workspace not found`.
- At 23 hours 59 minutes, owner reads and the recent-auth assertion passed.
- At 24 hours 1 minute, owner RLS returned zero rows, the RPC returned SQLSTATE
  `28000 reauthentication_required`, and the Edge Function returned `401` with
  the same safe code.
- A synthetic pre-tour evaluation completed as `needs_buyer_input`; it created
  no released result.
- Direct service-role automatic-release invocation was rejected by the disabled
  database switch; controls remained `false / 0 / 0`.
- The withdrawal path was exercised inside a rolled-back transaction and
  verified withdrawn result state, withdrawn request state, and review event.
- Both disposable users and their cascading synthetic rows were deleted.
- The one-hour Supabase deployment token was revoked and local temporary
  credential files were deleted.

## Verification

- 64 automated Node tests passed.
- 17 golden approval cases passed.
- JavaScript syntax and `git diff --check` passed.
- Local responsive walkthrough passed at mobile, tablet, and desktop widths.

## Remaining no-go items

Do not invite the first-five cohort or enable automatic release until the exact
frozen frontend is deployed and the remaining gates in `service-roadmap.md` and
`first-five-operations.md` pass: one supported production-origin result per
stage, duplicate-submit and notification behavior, production-UI auth return
and mobile return, correction notification, empty-environment migration and
backup/forward-fix rehearsal, named operational owners, named allowlist, and
Michael's explicit cohort authorization.
