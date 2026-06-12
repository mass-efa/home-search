# Home Evaluation Publishing Workflow

This site supports a public intake-to-publication workflow for home evaluations.

## Current MVP

1. A visitor opens the public site.
2. They go to `submit.html` and enter a listing URL, address, known status/price, and buyer notes.
3. The form generates a GitHub issue in `mass-efa/home-search`.
4. The issue is labeled and acknowledged by GitHub Actions.
5. The `Start home analysis` workflow can move a request from `queued` to `analyzing`.
6. The home-evaluation skill is run against the request.
7. The generated HTML brief is committed under `homes/`.
8. `data/homes.json` is updated so the brief appears on the homepage.
9. GitHub Pages republishes the site from `main`.

Request status is visible at:

`https://mass-efa.github.io/home-search/requests.html`

## Why Requests Use GitHub Issues

GitHub Pages is a static host. Static pages cannot safely hold a GitHub token or private API key in the browser. GitHub Issues gives the public site a durable queue without exposing credentials.

## Future Automation Option

A later version can add a server-side or GitHub Actions runner that uses an API key stored as a repository secret, runs the home-evaluation prompt/rubric, and opens a pull request with the generated page. That should only be enabled after deciding what data sources, model, review gate, and privacy policy should apply.

This repo now includes the first backend scaffold at `worker/github-issue-worker.js`. Deploying it and setting `assets/config.js` would allow the request page to submit directly without asking the user to confirm the issue in GitHub.

## Starting The Current Queued Request

For the current queued request:

1. Open `https://github.com/mass-efa/home-search/actions/workflows/start-analysis.yml`.
2. Click `Run workflow`.
3. Enter issue number `1`.
4. The issue moves from `queued` to `analyzing`.
5. Run the actual home-evaluation generation step with Codex or a future API runner.

## Publication Checklist

- Confirm the request is safe to publish publicly.
- Run the home-evaluation rubric.
- Preserve source dates and links.
- Avoid private buyer identity, financing limits, or negotiation walk-away numbers unless intentionally public.
- Create `homes/<slug>.html`.
- Add an entry to `data/homes.json`.
- Verify local links.
- Commit and push to `main`.
