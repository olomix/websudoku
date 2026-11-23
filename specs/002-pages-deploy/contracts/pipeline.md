# Contract: Pages Pipeline

File: `.github/workflows/pages.yml`

## Triggers

| Event | Branch | Jobs that run |
|-------|--------|---------------|
| `push` | `main` | `check`, `deploy`, `release` |
| `workflow_dispatch` | `main` | `check`, `deploy`, `release` |
| `pull_request` | into `main` | `check` |

A manual start on any other branch runs `check` only.

## Job `check`

Runs on `ubuntu-latest`, Node 26, read-only token, timeout 15 min.

1. Checkout with full history and tags.
2. `npm ci`
3. `npm run typecheck`
4. `npm test`
5. `npm run test:catalog`
6. `npx playwright install --with-deps chromium webkit`
7. `npx playwright test`; screenshot tests skip off macOS.
8. Upload the Playwright HTML report and traces as an artifact when the
   job fails (CI uses the `list` and `html` reporters and keeps traces of
   failed tests; a committed `test.only` fails the run).

Any failing step fails the job; nothing later runs.

## Job `deploy`

Needs `check`. Permissions `pages: write`, `id-token: write`. Environment
`github-pages`, its URL is the published address. Timeout 10 min.

1. Checkout (shallow).
2. Head check: if `github.sha` is not the current head of `main`, set
   output `current=false`, write a note to the run summary and skip the
   next steps (a re-run of an older run).
3. `actions/configure-pages`
4. `actions/upload-pages-artifact` with `path: web` and the artifact name
   `github-pages-<run attempt>`
5. `actions/deploy-pages` with that artifact name

## Job `release`

Needs `deploy`; runs only when `deploy` reported `current=true`. Permission `contents: write`. Timeout 5 min.

1. Checkout with tags.
2. Pick the first free name of `release-YYYY-MM-DD`,
   `release-YYYY-MM-DD-2`, … (UTC date).
3. Create an annotated tag on the deployed commit and push only that tag.

## Concurrency

`group: pages-<ref>`; `cancel-in-progress` is true for pull requests and
false for `main`. On `main`, runs never overlap and only the newest pending
run is kept.

## Published site

- URL: `https://alek.ws/websudoku/`
- Contents: exactly `web/` (index.html, css/, js/, puzzles/).
- Shared links: `https://alek.ws/websudoku/?id=<id>`.
