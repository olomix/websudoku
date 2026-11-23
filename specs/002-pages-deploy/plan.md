# Implementation Plan: Publish the Game to GitHub Pages

**Branch**: `002-pages-deploy` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-pages-deploy/spec.md`

## Summary

One GitHub Actions workflow checks every pull request and every push to
`main` with the project's full test set (type check, unit, catalog and
Playwright e2e in Chromium and WebKit). On `main` it then publishes exactly
the `web/` folder to GitHub Pages through the Pages artifact flow and tags
the published commit `release-YYYY-MM-DD`, which becomes the append-only
baseline for the puzzle catalog.

## Technical Context

**Language/Version**: GitHub Actions workflow YAML; Bash for the tag step;
Node.js 26 for the checks.

**Primary Dependencies**: `actions/checkout` v7.0.1, `actions/setup-node`
v7.1.0, `actions/configure-pages` v6.0.0, `actions/upload-pages-artifact`
v5.0.0, `actions/deploy-pages` v5.0.1 (verified 2026-11-23, research.md).

**Storage**: None; git tags are the only state written.

**Testing**: `actionlint` on the workflow, `shellcheck` on its shell steps
(via actionlint); the existing npm test scripts; the quickstart scenarios
on GitHub.

**Target Platform**: GitHub-hosted `ubuntu-latest` runners; GitHub Pages.

**Project Type**: CI/CD configuration for the existing static web app.

**Performance Goals**: Merge to live in under 10 minutes (SC-001).

**Constraints**: No stored secrets; least-privilege token per job; only
`web/` published; runs time out at 15 minutes.

**Scale/Scope**: 1 workflow file, 3 jobs; 1 test change (skip screenshots
off macOS); 1 one-time repository setting.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template: no
principles, no gates. **PASS (no constitution)**. Post-design re-check:
**PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/002-pages-deploy/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── pipeline.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── pages.yml         # check → deploy → release

tests/e2e/visual.spec.js  # skip screenshot tests when not on macOS
README.md                 # live URL, how publishing and release tags work
```

**Structure Decision**: One workflow file next to the existing project; no
change to `web/`, which is published as it is.

## Key design points

- `check` runs pull request code with a read-only token; publish rights
  exist only in `deploy` and `release` (research R3).
- Concurrency per ref: no overlapping runs on `main`, newest pending run
  wins (R4).
- Full-history checkout so the catalog test finds `release-*` tags and
  `main` (R6).
- Pages is enabled once with `build_type=workflow` by the maintainer's
  `gh` login, not by the workflow (R8).

## Complexity Tracking

No constitution violations to justify.
