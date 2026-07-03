# Auth And Database Setup

The Home-Finding Buddy MVP can run in two modes:

- Local-first mode: no backend configured; workspace data is saved in the browser.
- Supabase mode: users sign in by email magic link and their workspace syncs to Postgres.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/schema.sql` from this repository.
4. Copy the project URL and anon public key.
5. Update `assets/config.js`:

```js
window.HOME_SEARCH_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
window.HOME_SEARCH_SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
window.HOME_SEARCH_AUTH_REDIRECT_URL = "https://mass-efa.github.io/home-search/app.html";
```

For local testing, set the redirect URL to your local page:

```js
window.HOME_SEARCH_AUTH_REDIRECT_URL = "http://127.0.0.1:8788/app.html";
```

6. In Supabase Auth settings, add the deployed app URL and local test URL to allowed redirect URLs.

## Current Persistence Model

The first database slice uses one table:

`public.home_buddy_workspaces`

Each signed-in user owns one or more private workspace rows. The current MVP stores the full buyer workspace state in `app_state jsonb`.

This keeps the first authenticated product simple while the buyer-search loop is still evolving. Once the product shape stabilizes, the JSONB state can be normalized into tables for:

- Conversations
- Buyer profiles
- Listings
- Listing reviews
- Tour debriefs
- Profile update suggestions
- Share links

The first AI-backed backend slice also adds:

`public.home_buddy_ai_evaluations`

This table stores server-side Home Evaluation Skill outputs for signed-in users. See [AI Backend Setup](ai-backend.md).

## Security

The app uses the Supabase anon key in browser JavaScript, which is expected for Supabase web apps. Row Level Security is enabled so users can only read, insert, update, and delete their own workspace rows.

Do not put a Supabase service-role key in `assets/config.js` or any browser-delivered file.

## Sync Behavior

- Without Supabase config, the app stays local-only.
- After sign-in, the app loads the newest cloud workspace if it is newer than local browser data.
- If the user already has local data and no cloud workspace, the app uploads the local workspace.
- Edits are saved locally immediately and synced to Supabase with a short debounce.
