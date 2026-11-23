---

description: "Task list for publishing the game to GitHub Pages"
---

# Tasks: Publish the Game to GitHub Pages

**Input**: Design documents from `specs/002-pages-deploy/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pipeline.md, quickstart.md

**Tests**: The workflow is checked with `actionlint` (which also runs
`shellcheck` on its `run:` steps) and with the quickstart scenarios on
GitHub. No new unit tests: the feature adds no application code.

**Organization**: Tasks are grouped by user story (spec.md US1–US4). All
workflow tasks edit the same file, `.github/workflows/pages.yml`, so they
run in order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Repository setting and folder

- [X] T001 Create the folder `.github/workflows/`
- [X] T002 Enable GitHub Pages with source "GitHub Actions" for `olomix/websudoku` once, with the maintainer's approval: `gh api -X POST repos/olomix/websudoku/pages -f build_type=workflow`; confirm `gh api repos/olomix/websudoku/pages --jq .build_type` prints `workflow` (research R8)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The workflow skeleton and the shared `check` job that every story needs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Skip the screenshot tests when `process.platform !== "darwin"` (baselines are macOS-only) in `tests/e2e/visual.spec.js` (research R5)
- [X] T004 Create `.github/workflows/pages.yml` with name, triggers `push` (main), `pull_request` (main) and `workflow_dispatch` per data-model.md `Pipeline run.event`, workflow default `permissions: contents: read`, and concurrency `group: pages-${{ github.ref }}` with `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` per contracts/pipeline.md "Concurrency" (research R3, R4)
- [X] T005 Add the `check` job to `.github/workflows/pages.yml` per contracts/pipeline.md "Job `check`": `ubuntu-latest`, `timeout-minutes: 15`, `actions/checkout@v7.0.1` with `fetch-depth: 0`, `actions/setup-node@v7.1.0` with Node 26 and npm cache, `npm ci`, `npm run typecheck`, `npm test`, `npm run test:catalog`, `npx playwright install --with-deps chromium webkit`, `npx playwright test`, and upload of `playwright-report/` on failure (research R5, R6, R9)
- [X] T006 Run `actionlint .github/workflows/pages.yml` and fix every finding

**Checkpoint**: The workflow lints clean and its checks pass locally (`CI=1 npx playwright test` plus the npm scripts).

---

## Phase 3: User Story 1 - Merged changes go live automatically (Priority: P1) 🎯 MVP

**Goal**: A push to `main` or a manual start publishes `web/` to `https://alek.ws/websudoku/`.

**Independent Test**: Merge a visible change into `main`; the public address shows it within 10 minutes (quickstart scenarios 2–4).

- [X] T007 [US1] Add the `deploy` job to `.github/workflows/pages.yml` per contracts/pipeline.md "Job `deploy`": `needs: check`, permissions `pages: write` and `id-token: write`, environment `github-pages` with `url: ${{ steps.deployment.outputs.page_url }}`, `timeout-minutes: 10`, steps `actions/checkout@v7.0.1`, `actions/configure-pages@v6.0.0`, `actions/upload-pages-artifact@v5.0.0` with `path: web` (data-model.md `Published version.files`), `actions/deploy-pages@v5.0.1` with `id: deployment` (data-model.md `Published version.url`)

**Checkpoint**: Merging publishes the game.

---

## Phase 4: User Story 2 - A broken version never goes live (Priority: P1)

**Goal**: Any failing check stops the publish; the live site keeps its previous version.

**Independent Test**: A pull request or push with a failing check shows the failure and no `deploy` job runs (quickstart scenario 7).

- [X] T008 [US2] Confirm in `.github/workflows/pages.yml` that `deploy` depends on `check` and that no `continue-on-error` or `if: always()` lets a failed or cancelled `check` reach `deploy` (data-model.md `Pipeline run.result`, `Pipeline run.jobs`)

**Checkpoint**: The publish is gated by all checks.

---

## Phase 5: User Story 3 - Pull requests show whether they are safe to merge (Priority: P2)

**Goal**: Pull requests run `check` only.

**Independent Test**: Open a pull request; only `check` runs and its status shows on the pull request (quickstart scenario 1).

- [X] T009 [US3] Add `if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'` to the `deploy` job in `.github/workflows/pages.yml`, so pull requests and manual starts on other branches never publish (contracts/pipeline.md "Triggers"; data-model.md `Pipeline run.event`)

**Checkpoint**: Pull requests are checked and never publish.

---

## Phase 6: User Story 4 - Each published catalog becomes the protected baseline (Priority: P2)

**Goal**: Each successful publish adds a `release-*` tag on the published commit.

**Independent Test**: After a publish, `git tag -l 'release-*'` lists a tag for today on that commit; a second publish the same day gets `-2` (quickstart scenarios 5–6).

- [X] T010 [US4] Add the `release` job to `.github/workflows/pages.yml` per contracts/pipeline.md "Job `release`": `needs: deploy`, permission `contents: write`, `timeout-minutes: 5`, `actions/checkout@v7.0.1` with `fetch-depth: 0`, a Bash step that picks the first free name `release-YYYY-MM-DD`, then `-2`, `-3`, … (UTC date; data-model.md `Release mark.name`), creates an annotated tag (data-model.md `Release mark.kind`) on `${{ github.sha }}` (data-model.md `Release mark.target`) with the bot identity `github-actions[bot]`, and pushes only that tag
- [X] T011 [US4] Run `actionlint .github/workflows/pages.yml` again (it runs `shellcheck` on the tag script) and fix every finding

**Checkpoint**: Every publish leaves a release mark.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T012 [P] Document in `README.md`: the live address, that merges to `main` publish automatically after the checks, the manual start, the `release-*` tags and their role as catalog baseline, and that screenshot tests run on macOS only
- [X] T013 Run the local checks from quickstart.md ("Local checks before pushing") and fix any failure
- [X] T014 Simulate the `check` job locally as the runner does (`npm ci` in a clean clone with full history, then the job's commands with `CI=1`) and confirm the catalog baseline resolves; the on-GitHub scenarios are post-merge validation in quickstart.md, done by the maintainer

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: T002 needs the maintainer's approval; T001 none
- **Foundational (Phase 2)**: T004 → T005 → T006 (same file); T003 is independent
- **US1 (Phase 3)**: after Phase 2
- **US2 (Phase 4)**: after US1 (it checks the `deploy` job)
- **US3 (Phase 5)**: after US1
- **US4 (Phase 6)**: after US1
- **Polish (Phase 7)**: T012 any time; T013 and T014 after all workflow tasks

```text
Setup → Foundational → US1 ─┬─ US2
                            ├─ US3
                            └─ US4 → Polish
```

## Parallel Examples

```bash
Task: "T003 skip screenshot tests off macOS in tests/e2e/visual.spec.js"
Task: "T004 workflow skeleton in .github/workflows/pages.yml"
Task: "T012 README section"
```

## Implementation Strategy

1. Setup + Foundational: the workflow checks every push and pull request.
2. US1: publishing works → MVP.
3. US2 and US3: gating and pull-request behavior confirmed.
4. US4: release tags protect the catalog.
5. Polish: README, local checks, validation on GitHub.

## Notes

- All workflow tasks touch `.github/workflows/pages.yml`; do them in order.
- Use the exact action versions from research.md; do not guess newer ones.
- Run `actionlint` after every workflow edit (user rule).
