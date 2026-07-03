# AI Backend Setup

The Home-Finding Buddy app now has a first server-side AI evaluation path.

The browser still creates an instant local screening read. When the backend is configured, a signed-in user can also run a private server-side `Home Evaluation Skill` evaluation for a listing. The backend keeps model keys off the client and saves AI outputs in Supabase.

## Architecture

1. The signed-in browser calls a Supabase Edge Function.
2. The Edge Function verifies the Supabase auth token.
3. The function sends listing context, buyer brief, workspace context, and the `home-evaluation` rubric to the OpenAI Responses API.
4. The model returns structured JSON with the required evaluation sections.
5. The function saves the result to `public.home_buddy_ai_evaluations`.
6. The app stores the returned evaluation in the local workspace state for immediate display.

## Files

- `supabase/functions/evaluate-home/index.ts`
- `supabase/schema.sql`
- `assets/config.js`
- `assets/buddy-app.js`

## Required Supabase Setup

Run the updated `supabase/schema.sql` in the Supabase SQL editor. It creates:

- `public.home_buddy_workspaces`
- `public.home_buddy_ai_evaluations`
- Row Level Security policies so users can access only their own rows

## Edge Function Secrets

Set these secrets for the Supabase function:

```bash
supabase secrets set OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
supabase secrets set OPENAI_MODEL="gpt-4.1-mini"
supabase secrets set ALLOWED_ORIGIN="http://127.0.0.1:8788"
```

For production, set `ALLOWED_ORIGIN` to:

```bash
https://mass-efa.github.io
```

Supabase provides `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions.

## Deploy

```bash
supabase functions deploy evaluate-home
```

Then set the app config:

```js
window.HOME_SEARCH_AI_EVALUATION_ENDPOINT = "https://YOUR_PROJECT.supabase.co/functions/v1/evaluate-home";
```

## Current Behavior

The backend evaluation is intentionally a screening read. It does not browse live sources yet. It uses:

- Buyer workspace fields
- Buyer Search Brief
- Conversation notes
- Pasted listing notes
- The `skills/home-evaluation` rubric

It returns:

- Decision read
- Negotiation posture
- Next action
- Main reasons to like the home
- Main risks or unknowns
- Evidence limits
- 12 rubric sections for property snapshot, schools, safety, value/comps, negotiation, condition, title/legal, financial fit, lifestyle fit, physical-site risk, and open questions

## Next Backend Step

The next improvement is an evidence-gathering job before the model call:

- Listing URL extraction
- County/tax record lookup
- School boundary lookup
- Official crime/safety source lookup where available
- Permit/title/disclosure upload support
- Comparable sales collection

That will turn the backend from a structured AI screening read into a source-backed home evaluation pipeline.
