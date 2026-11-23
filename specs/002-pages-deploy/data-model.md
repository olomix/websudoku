# Data Model: Publish the Game to GitHub Pages

This feature stores no application data. Its state is GitHub's own records.

## Pipeline run

| Field | Values | Rules |
|-------|--------|-------|
| `event` | `push`, `pull_request`, `workflow_dispatch` | `push` and `workflow_dispatch` only on `main` |
| `jobs` | `check` → `deploy` → `release` | `deploy` needs `check` passed; `release` needs `deploy` passed; pull requests run `check` only |
| `result` | `success`, `failure`, `cancelled` | A `failure` or `cancelled` run publishes nothing |

## Published version

| Field | Rules |
|-------|-------|
| `commit` | The commit the run checked |
| `files` | Exactly the contents of `web/` at that commit |
| `url` | `https://alek.ws/websudoku/` |

Only one is live at a time. A new deployment replaces the old one whole.

## Release mark

| Field | Rules |
|-------|-------|
| `name` | `release-YYYY-MM-DD` (UTC date of the publish), or `release-YYYY-MM-DD-N` with N = 2, 3, … when the name exists |
| `target` | The published commit |
| `kind` | Annotated git tag |

The newest release mark (by creation date) is the catalog baseline
(contracts/catalog.md in feature 001, guarantee 5). Marks are never moved
or deleted by the pipeline.
