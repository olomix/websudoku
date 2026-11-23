# Research: Publish the Game to GitHub Pages

**Feature**: [spec.md](spec.md) | **Date**: 2026-11-23

Action versions were checked on 2026-11-23 with `gh api
repos/<owner>/<repo>/releases/latest`.

| Action | Latest release |
|--------|----------------|
| `actions/checkout` | v7.0.1 |
| `actions/setup-node` | v7.1.0 |
| `actions/configure-pages` | v6.0.0 |
| `actions/upload-pages-artifact` | v5.0.0 |
| `actions/deploy-pages` | v5.0.1 |

## R1. Publishing method

- **Decision**: GitHub Actions publishing to Pages ("build_type:
  workflow"): `configure-pages` → `upload-pages-artifact` with `path: web`
  → `deploy-pages`.
- **Rationale**: Pages can serve a branch only from its root or `/docs`;
  the game lives in `web/`. The artifact flow uploads exactly `web/`
  (FR-004) and needs no extra branch. A deployment is atomic: the site
  switches from one complete version to the next.
- **Alternatives considered**: A `gh-pages` branch pushed by a workflow
  (extra branch, history noise, write token for the whole job); moving the
  game to `/docs` (breaks the plan's layout and the dev server).

## R2. One workflow, three jobs

- **Decision**: `.github/workflows/pages.yml` with jobs `check` → `deploy`
  → `release`. Triggers: `push` to `main`, `pull_request` to `main`,
  `workflow_dispatch`. `deploy` and `release` run only for `push` and
  `workflow_dispatch` on `main`.
- **Rationale**: The checks are the same for pull requests and for `main`
  (FR-006), and `deploy` depends on `check` (FR-003). One file keeps the
  gate and the publish together.
- **Alternatives considered**: Separate CI and deploy workflows chained by
  `workflow_run` (harder to follow; the deploy would need to re-check which
  commit passed).

## R3. Permissions

- **Decision**: Workflow default `permissions: contents: read`. `deploy`
  adds `pages: write` and `id-token: write`. `release` adds
  `contents: write` to push one tag. No stored secrets; only
  `GITHUB_TOKEN`.
- **Rationale**: FR-010. The publish rights exist only in the jobs that use
  them; the check job, which runs pull request code, has read-only access.

## R4. Concurrency (one publish at a time, newest wins)

- **Decision**: Workflow-level `concurrency: group: pages-${{ github.ref }}`
  with `cancel-in-progress` true for pull requests and false for `main`.
- **Rationale**: For `main`, GitHub runs one at a time and keeps only the
  newest pending run, so an older run never deploys after a newer one has
  started (FR-007), and a running deploy is never cut off halfway. For pull
  requests, a new push makes the old check run useless, so it is cancelled.
- **Alternatives considered**: A job-level group only on `deploy` (an older
  run could still pass `check` later and deploy after a newer one).

## R5. Checks on a Linux runner

- **Decision**: `ubuntu-latest`, Node 26 (`engines`), `npm ci`, then
  `npm run typecheck`, `npm test`, `npm run test:catalog`, and
  `npx playwright install --with-deps chromium webkit` +
  `npx playwright test`. The screenshot tests skip when the platform is not
  macOS.
- **Rationale**: FR-002 and the spec edge case: the visual baselines are
  `*-darwin.png`; on Linux they would be missing and fail. All other e2e
  tests are platform-neutral. Playwright's WebKit build on Linux is the
  Safari engine check available in CI; the manual Safari pass stays in the
  release checklist of feature 001.
- **Alternatives considered**: macOS runners (slower to start, 10× the
  minute cost; only needed for the screenshots); Linux baselines committed
  next to the macOS ones (two sets to keep in sync for little gain now).

## R6. Catalog baseline in CI

- **Decision**: `actions/checkout` with `fetch-depth: 0`, which also
  fetches all tags. The catalog test already uses the newest `release-*`
  tag, else `main`, else `origin/main`.
- **Rationale**: FR-009. A shallow clone has neither tags nor `main`, and
  the catalog test fails by design when the baseline is missing.

## R7. Release mark

- **Decision**: After a successful deploy, the `release` job creates an
  annotated tag `release-YYYY-MM-DD` (UTC) on the deployed commit; if that
  name exists, `release-YYYY-MM-DD-2`, `-3`, …; then pushes it.
- **Rationale**: FR-008 and contracts/catalog.md: the newest release tag is
  the append-only baseline. Tagging only after the deploy means the mark
  always names what players have.
- **Alternatives considered**: GitHub Releases (more than needed); tagging
  before deploy (a failed deploy would leave a mark for an unpublished
  catalog).

## R8. One-time Pages setup

- **Decision**: Enable Pages with source "GitHub Actions" once:
  `gh api -X POST repos/olomix/websudoku/pages -f build_type=workflow`.
- **Rationale**: `configure-pages` can enable Pages only with an admin
  token, which the workflow must not hold (FR-010). It is a one-off
  repository setting, done by the maintainer's own `gh` login.

## R9. Time limit

- **Decision**: `timeout-minutes: 15` on `check`, 10 on `deploy`, 5 on
  `release`.
- **Rationale**: FR-011; the full local test run takes under 2 minutes, so
  15 leaves room for browser installs.
