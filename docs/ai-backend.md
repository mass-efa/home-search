# AI Backend Setup

The Home-Finding Buddy app now has a first server-side AI evaluation path.

The browser still creates an instant local screening read. When the backend is configured, a signed-in user can also run a private server-side `Home Evaluation Skill` evaluation for a listing. The backend keeps model keys off the client and saves AI outputs in Supabase.

## Architecture

1. The signed-in browser calls a Supabase Edge Function.
2. The Edge Function verifies the Supabase auth token.
3. The function sends listing context, buyer brief, workspace context, the `home-evaluation` rubric, and up to three explicitly authorized private PDFs to the OpenAI Responses API.
4. The generator returns structured JSON with the required evaluation sections.
5. The function builds an immutable Decision Brief candidate, runs deterministic
   validators, and runs a separately prompted independent evaluator against the
   same candidate hash.
6. The fail-closed policy engine records `auto_approved`, `needs_review`,
   `insufficient_evidence`, or `failed`.
7. The function saves the candidate, validator results, independent evaluation,
   and approval manifest to `public.home_buddy_ai_evaluations`.
8. The browser displays only an immutable result released to the buyer. Otherwise
   it shows the safe request state and preserves the separate local screening read.

## Files

- `supabase/functions/evaluate-home/index.ts`
- `supabase/schema.sql`
- `assets/config.js`
- `assets/buddy-app.js`

## Required Supabase Setup

Run `supabase/schema.sql`, then apply every numbered migration in order. The
current document and operations release additionally requires
`202608020003_private_documents_and_operations.sql`. It creates:

- `public.home_buddy_workspaces`
- `public.home_buddy_ai_evaluations`
- Row Level Security policies so users can access only their own rows
- A private, owner-prefixed PDF/image bucket and document metadata
- Operational events, bounded retries, and disabled-by-default release controls

## Edge Function Secrets

Set these secrets for the Supabase function:

```bash
supabase secrets set OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
supabase secrets set OPENAI_MODEL="gpt-4.1-mini"
supabase secrets set OPENAI_EVALUATOR_MODEL="gpt-4.1-mini"
supabase secrets set AUTOMATED_APPROVAL_ENABLED="false"
supabase secrets set ALLOWED_ORIGIN="http://127.0.0.1:8788"
```

The deployed alpha also accepts the existing custom secret name
`Home_search_oai_key`. `OPENAI_API_KEY` remains the preferred portable name for
new environments.

For production, set `ALLOWED_ORIGIN` to:

```bash
https://mass-efa.github.io
```

When the GitHub Pages custom domain is active, use the canonical production
origin instead:

```bash
https://tryhomei.us
```

The Edge Function CORS setting must match the origin rendered in the browser;
do not include a path or trailing slash.

Supabase provides `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions.

## Deploy

```bash
supabase functions deploy evaluate-home
```

Then set the app config:

```js
window.HOME_SEARCH_AI_EVALUATION_ENDPOINT = "https://YOUR_PROJECT.supabase.co/functions/v1/evaluate-home";
```

Set `AUTOMATED_APPROVAL_ENABLED=true` only after the deployed source adapters,
golden suite, database migration, and environment-specific end-to-end checks
pass. The service-role key is used only inside the Edge Function so browsers
cannot insert or modify approval records.

## Current Behavior

The backend evaluation remains an evidence-limited screening candidate until
live source adapters are connected. It uses:

- Buyer workspace fields
- Buyer Search Brief
- Conversation notes
- Pasted listing notes
- Up to three private buyer-uploaded PDFs, supplied as untrusted file inputs
- The `skills/home-evaluation` rubric

It generates:

- Decision read
- Negotiation posture
- Next action
- Main reasons to like the home
- Main risks or unknowns
- Evidence limits
- 12 rubric sections for property snapshot, schools, safety, value/comps, negotiation, condition, title/legal, financial fit, lifestyle fit, physical-site risk, and open questions

The automated approval layer additionally records:

- The immutable candidate hash.
- Every deterministic gate result.
- The independent evaluator result bound to the same hash.
- A versioned approval manifest and safe reason codes.

The property-identity adapter reconciles the submitted address against King
County's current ArcGIS Online parcel/address layer. Zero, multiple, incomplete,
or mismatched results fail closed. Automatic delivery still defaults off until
the migration, deployment, source-rights check, and deployed end-to-end
rehearsal pass.

Uploaded PDFs are staged in the buyer's browser, uploaded only after sign-in,
and attached to the owner-scoped request. The Edge Function creates a short-lived
signed URL for the model call; neither the signed URL nor document contents belong
in analytics or operational metadata. PDF text and page images are available to
the model, but document-derived claims must still preserve page references,
evidence limits, and the normal review gates.

## Next Backend Step

The next improvement is an evidence-gathering job before the model call:

- Listing URL extraction
- County/tax record lookup
- School boundary lookup
- Official crime/safety source lookup where available
- Page-level document citation reconciliation and document-retention controls
- Comparable sales collection

That will turn the backend from a structured AI screening read into a source-backed home evaluation pipeline.

## First-Five Review And Release Path

The first-five-user release wraps the evaluation in a durable request:

1. `evaluate-home` verifies the signed-in user and workspace ownership.
2. It creates or resumes an owner-scoped evaluation request.
3. Internal candidates, validators, and evaluator findings remain in
   `home_buddy_ai_evaluations`, which buyers cannot query.
4. Buyers read safe status from `home_buddy_evaluation_requests`.
5. A report becomes buyer-visible only through an immutable row in
   `home_buddy_released_results`.

With `AUTOMATED_APPROVAL_ENABLED=false`, a fully passing candidate moves to
`in_review`. Manual release is only a delivery gate: it can release a candidate
that already passed every validator and independent evaluation. It cannot
override a failed evidence, privacy, identity, coverage, or advice-boundary
check.

Apply `supabase/migrations/202607300002_request_review_release.sql` before
deploying the updated function or reviewer workspace.

Provision reviewers through a privileged SQL/admin session, never through
browser-editable user metadata:

```sql
insert into public.home_buddy_staff_roles (user_id, role)
values ('USER_UUID', 'release_manager')
on conflict (user_id)
do update set role = excluded.role, active = true;
```

The private reviewer surface is `review.html`. It uses only the public Supabase
anon key; row-level security protects queue reads, and the release function
rechecks staff authorization and every release prerequisite.
