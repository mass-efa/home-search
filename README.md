# Home Search

Public home-buying research briefs and evaluation workflow.

## Desired Outcome

This repository is meant to make home-search analysis easy to share, review, and reuse. The goal is not to create a perfect appraisal or inspection substitute. The goal is to publish clear, decision-ready buyer briefs that separate:

- Listing facts from assumptions.
- Reasons to like a property from risks and unknowns.
- Market/comparable-sale context from noisy automated estimates.
- Negotiation posture from diligence questions.
- Next concrete actions from background research.

The intended reader should be able to open a page, understand the current buyer read in a few minutes, and know what needs to be verified before touring, writing an offer, waiving contingencies, or walking away.

## Published Pages

When GitHub Pages is enabled, the site should be available at:

https://mass-efa.github.io/home-search/

Current public brief:

- [8762 Paisley Drive NE, Seattle](homes/8762-paisley-drive-ne.html)

Request a new evaluation:

- [Public request page](submit.html)
- [Request status page](requests.html)
- [GitHub issue queue](https://github.com/mass-efa/home-search/issues)

## Evaluation Method

The reusable home-evaluation skill is included in this repository:

- [Home Evaluation Skill](skills/home-evaluation/SKILL.md)
- [Evaluation Rubric](skills/home-evaluation/references/evaluation-rubric.md)

The rubric is intentionally practical. Each brief should lead with the decision read, then cover schools, safety, area value trend, comps, negotiation leverage, inspection risk, title/legal risk, financial fit, lifestyle fit, climate/site risks, open questions, next actions, and sources.

## Publishing Model

This is a dependency-free static site. GitHub Pages can serve it directly from the `main` branch:

- `index.html` is the home page.
- `submit.html` is the public request page.
- `requests.html` is the public request-status page.
- `data/homes.json` powers the published-evaluations list.
- `homes/` contains public property briefs.
- `skills/` contains the reusable analysis workflow.
- `.github/ISSUE_TEMPLATE/` contains the public request template.
- `.github/workflows/` contains the request acknowledgement workflow.

## Request-To-Publication Workflow

1. A visitor submits a listing URL or address on `submit.html`.
2. The site opens a prefilled GitHub issue in this public repository.
3. GitHub Actions labels and acknowledges the request.
4. The `Start home analysis` workflow can move the request from `queued` to `analyzing`.
5. The `home-evaluation` skill is run against the request.
6. The generated brief is published under `homes/`.
7. `data/homes.json` is updated so the brief appears on the homepage.
8. The request issue is closed or labeled `published` once the page is ready.

For the detailed workflow, see [docs/workflow.md](docs/workflow.md).

## Automation Boundary

The current version intentionally uses GitHub Issues as the intake queue because GitHub Pages is static and cannot safely hold private API keys or GitHub tokens in the browser. Fully automatic AI generation can be added later with a server-side or GitHub Actions runner using repository secrets and a review gate.

For the first step toward direct submission without the extra GitHub confirmation click, see [docs/direct-submit-backend.md](docs/direct-submit-backend.md).

## Important Note

These briefs are research aids, not legal, inspection, financing, appraisal, or tax advice. Buyer agents, inspectors, lenders, title officers, and attorneys should verify the relevant facts before anyone relies on them for an offer or purchase decision.
