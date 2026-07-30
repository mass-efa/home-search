# P0 Repository Inventory And Proposed Disposition

Status: Draft for approval
Checked: 2026-07-29
Rule: This document proposes classifications only. P0 does not move, delete,
publish, or commit classified artifacts.

## Current Repository Shape

The repository currently combines:

- The tracked public GitHub Pages prototype.
- A tracked local-first buyer workspace prototype.
- Tracked Supabase and AI-backend scaffolding.
- Tracked public property briefs and evaluation instructions.
- Untracked product-planning documents.
- Untracked personal home-buying models and property-specific work.
- Untracked generated deliverables, renders, inspection extracts, and builders.

Approximate untracked working-area sizes:

| Area | Size | Current role |
| --- | ---: | --- |
| `outputs/` | 55 MB | Final and intermediate buyer deliverables |
| `work/` | 13 MB | Workbook builders, checks, and preview images |
| `tmp/` | 5.8 MB | Extracted inspection pages and memo-generation work |
| `home-buying/` | 164 KB | Personal finance model and local guidance |

The Git worktree also contains meaningful modified files:

- `homes/3920-w-barrett-st-seattle-wa-98199.html`
- `skills/home-evaluation/SKILL.md`
- `skills/home-evaluation/references/evaluation-rubric.md`

These edits predate P0 integration and must be preserved.

## Classification Vocabulary

- **Keep:** Canonical and still part of the near-term product.
- **Migrate:** Valuable content or behavior that should move into the new app.
- **Reference:** Preserve unchanged while the replacement is built.
- **Private:** Buyer-specific or potentially sensitive; never part of a public
  deployment surface by default.
- **Fixture candidate:** Potential test/example input after explicit sanitization.
- **Generated:** Reproducible outputs or previews; not canonical source.
- **Archive candidate:** Preserve outside the active product after cutover.
- **Delete candidate:** Disposable only after owner approval and verification.

## Proposed Disposition

| Current area | Classification | Proposed P0 disposition | Approval or gate |
| --- | --- | --- | --- |
| `README.md` | Migrate | Rewrite after P0 contracts stabilize | Product contract approved |
| `docs/product-reset-plan.md` | Keep | Remains the program-level source | Reconcile with P0 outputs |
| `docs/mvp-spec.md` | Migrate | Replace overlapping product story with alpha contract | Product contract approved |
| `docs/service-roadmap.md` | Migrate | Retain later-stage material, remove it from alpha authority | Product contract approved |
| `docs/workflow.md` | Archive candidate | Historical public GitHub Issue workflow | Private intake works |
| `docs/direct-submit-backend.md` | Archive candidate | Historical public-issue bridge | Private intake works |
| `docs/auth-and-database.md` | Reference | Preserve current prototype behavior during migration | New auth/data docs exist |
| `docs/ai-backend.md` | Reference | Preserve current server-side proof during migration | New analysis contract exists |
| `index.html` | Reference, then archive | Keep public demo live until replacement is ready | New landing page verified |
| `submit.html` | Reference, then archive | Do not extend as customer intake | Private intake verified |
| `requests.html` | Reference, then archive | Do not extend as customer status | Private status verified |
| `app.html` | Reference, then archive | UX/behavior reference for new app | Core loop replaced |
| `assets/buddy-app.js` | Reference, then archive | Mine behaviors; do not extend monolith | Core loop replaced |
| `assets/site.css`, `assets/site.js` | Reference | Reuse only intentional design/behavior patterns | New design system exists |
| `assets/config.js` | Reference | Do not add secrets; retire with static app | New environment config exists |
| `homes/` | Private review / fixture candidate | Audit every brief before reuse or publication | Michael approves sanitized examples |
| `data/homes.json` | Archive candidate | Replace public index with approved example content or DB | New result model exists |
| `skills/home-evaluation/` | Keep, then thin | Preserve entry point; reference canonical product contract | Shared evaluation package exists |
| `supabase/schema.sql` | Reference, then migrate | Convert into numbered migrations; do not overwrite in P0 | Migration plan tested |
| `supabase/functions/evaluate-home/` | Reference, then migrate | Preserve proof; replace with versioned pipeline | New draft pipeline passes fixture |
| `worker/github-issue-worker.js` | Archive candidate | Retire from customer path | Private intake works |
| `.github/ISSUE_TEMPLATE/` | Archive or repurpose | GitHub Issues become engineering-only | New issue templates approved |
| `.github/workflows/home-evaluation-request.yml` | Archive candidate | Public buyer intake no longer target workflow | Private intake works |
| `.github/workflows/start-analysis.yml` | Archive candidate | Replace with application state machine | Reviewer workflow works |
| `outputs/3920_barrett/` | Private + fixture candidate | Preserve untouched; derive sanitized fixture separately | Explicit privacy/sanitization approval |
| `outputs/payment-model-3920/` | Private | Keep outside deployable product and public examples | Michael decides durable location |
| `home-buying/` | Private | Keep outside deployable product and public examples | Michael decides durable location |
| `work/payment-model-3920/` | Private tool/reference | Separate durable builders from generated previews later | Tool audit |
| `tmp/pdfs/3920_barrett/` | Private + generated | Preserve during fixture work; later split durable builders from extracts | Fixture complete |
| `rendered_memo*/`, contact sheets, previews | Generated | Keep latest verified outputs only after approval | Canonical/latest outputs identified |
| `~$*.docx`, `~$*.xlsx` | Delete candidate | Office lock files only | Confirm applications closed |
| `.DS_Store` | Delete candidate | Finder metadata | Cleanup approval |
| `__pycache__/` | Delete candidate | Reproducible interpreter cache | Cleanup approval |

## Deployment Boundary

The current GitHub Pages deployment publishes tracked content from `main` at the
repository root. Untracked private artifacts are not currently deployed, but the
repository structure makes accidental future inclusion too easy.

The new application should establish an explicit deployment boundary under
`apps/web/`. Personal research, raw uploads, local outputs, and fixture source
material must live outside the web application and its public static directories.

No real buyer document, financing assumption, walk-away number, negotiation note,
or identity should become a public fixture. Sanitization must create a new
derived artifact rather than modifying the private source.

## Recommended Post-P0 Structure

```text
apps/web/                       deployable application only
packages/domain/                schemas, permissions, state machines
packages/evaluation/            canonical rubric and calculations
packages/source-adapters/       permitted evidence collectors
packages/ui/                    shared interface components
supabase/migrations/            numbered database changes
tests/fixtures/sanitized/       derived, approved fixtures only
examples/public-briefs/         explicitly approved public examples
docs/product/                   product contract and research
docs/architecture/              ADRs and technical contract
docs/operations/                inventory, runbooks, privacy
private/                        not proposed until location/handling is approved
archive/prototype-static/       not created until cutover approval
```

The proposed `private/` and `archive/` paths are conceptual. Creating or moving
files into them requires a separate decision because local-only, ignored,
encrypted, or external storage may be more appropriate.

## Cleanup Actions Requiring Approval

No action below is approved by this inventory alone:

1. Add repository ignore rules for operating-system files, Office lock files,
   generated renders, extracted pages, and local private work.
2. Move personal models and property research out of the deployable repository.
3. Select and retain only the latest verified Barrett renders.
4. Separate durable Barrett builders from generated and extracted intermediates.
5. Archive the static prototype after the replacement passes its acceptance
   tests.
6. Remove the public GitHub Issue intake workflow.
7. Delete any candidate artifact.

## P0 Repository Exit Check

This workstream is ready for integration when:

- Every top-level area has a proposed disposition.
- Existing modified files are explicitly preserved.
- Private and generated work are excluded from the target deployment boundary.
- The sanitized-fixture rule is accepted.
- No cleanup action is executed before Michael approves the final map.
