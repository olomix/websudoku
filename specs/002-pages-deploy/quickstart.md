# Quickstart: Validate the Pages Pipeline

## One-time setup (maintainer)

```sh
gh api -X POST repos/olomix/websudoku/pages -f build_type=workflow
```

Expected: Pages is on with source "GitHub Actions"
(`gh api repos/olomix/websudoku/pages --jq .build_type` prints `workflow`).

## Local checks before pushing

```sh
actionlint .github/workflows/pages.yml
npm run typecheck && npm test && npm run test:catalog
CI=1 npx playwright test          # screenshot tests run on macOS only
```

## Validation scenarios (after the merge, by the maintainer)

These need the workflow on GitHub; scenario 1 runs on the feature pull
request itself, the others after it is merged.

| # | Step | Expected | Spec |
|---|------|----------|------|
| 1 | Open a pull request into `main` | `check` runs and shows on the PR; no `deploy` job | US3, FR-006 |
| 2 | Merge it | `check` → `deploy` → `release` pass; site updates within 10 min | US1, SC-001 |
| 3 | Open `https://olomix.github.io/websudoku/?id=300042` in Chrome and Safari | Hard puzzle 300042 plays; Copy link works | SC-003, FR-005 |
| 4 | Open `https://olomix.github.io/websudoku/package.json` and `/tests/` | 404 | SC-005, FR-004 |
| 5 | `git fetch --tags && git tag -l 'release-*'` | A tag for today points to the merged commit | US4, FR-008 |
| 6 | Run the workflow by hand twice on one day | Second tag is `release-<date>-2` | US4/AC2 |
| 7 | Push a branch that edits an existing catalog entry, open a PR | Catalog test fails; nothing deploys | US2/AC2 |
| 8 | Merge twice quickly | Runs do not overlap; the site ends on the later commit | FR-007 |
