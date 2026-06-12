# Direct Submit Backend

The public site currently uses a safe GitHub confirmation flow. A static GitHub Pages site cannot create GitHub issues directly without exposing a token in browser JavaScript.

To remove the extra "submit in GitHub" step, deploy a tiny backend endpoint that holds the GitHub token privately and creates issues server-side.

## Included Worker

This repo includes a Cloudflare Worker-compatible endpoint:

`worker/github-issue-worker.js`

It accepts a POST request from the site, creates a GitHub issue in `mass-efa/home-search`, and returns the issue URL.

## Required Secrets / Variables

- `GITHUB_TOKEN`: fine-grained GitHub token with Issues read/write access for `mass-efa/home-search`.
- `GITHUB_OWNER`: `mass-efa`
- `GITHUB_REPO`: `home-search`
- `ALLOWED_ORIGIN`: `https://mass-efa.github.io`

## Site Configuration

After the worker is deployed, update:

`assets/config.js`

Set:

```js
window.HOME_SEARCH_SUBMIT_ENDPOINT = "https://<your-worker-url>";
```

Then the request page will submit directly from the site and show the created issue link. If the endpoint is blank or unavailable, the site falls back to the public-safe GitHub confirmation flow.

## Security Notes

- Do not put a GitHub personal access token in `assets/config.js`, `assets/site.js`, or any browser-delivered file.
- Keep the token as a backend secret only.
- Use the narrowest possible GitHub token permissions: Issues read/write for this repository.
- Consider adding rate limiting or a simple shared passphrase before making the endpoint broadly public.
