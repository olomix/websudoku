# Feature Specification: Publish the Game to GitHub Pages

**Feature Branch**: `002-pages-deploy`

**Created**: 2026-11-23

**Status**: Draft

**Input**: User description: "let's create a github CI pipeline to publish the game to the static github pages."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Merged changes go live automatically (Priority: P1)

The maintainer merges a change into `main`. Without any manual step, the
public game site updates to that version, and players can open it from a
stable public address.

**Why this priority**: This is the request. Without it there is no public
game to share puzzle links from.

**Independent Test**: Merge a small visible change into `main`, wait, and
open the public address: the change is there.

**Acceptance Scenarios**:

1. **Given** a change is merged into `main` and all checks pass, **When**
   the pipeline finishes, **Then** the public site serves that version.
2. **Given** the site is published, **When** a player opens
   `https://alek.ws/websudoku/?id=300042`, **Then** Hard puzzle
   300042 opens, exactly as in local play.
3. **Given** the maintainer wants to publish again without a new change,
   **When** they start the pipeline by hand, **Then** the current `main` is
   published.

---

### User Story 2 - A broken version never goes live (Priority: P1)

The pipeline runs the project's automated checks before it publishes. If
any check fails, nothing is published and the previous version stays live.

**Why this priority**: Players and shared links depend on the live site; a
broken game or a changed puzzle number harms every player at once.

**Independent Test**: Push a commit to `main` that makes one check fail;
the site does not change and the pipeline shows the failure.

**Acceptance Scenarios**:

1. **Given** a check fails, **When** the pipeline runs, **Then** nothing is
   published and the live site keeps the previous version.
2. **Given** a change edits or moves an existing catalog puzzle, **When**
   the pipeline runs, **Then** the catalog check fails and nothing is
   published.

---

### User Story 3 - Pull requests show whether they are safe to merge (Priority: P2)

When someone opens or updates a pull request, the same checks run and the
result shows on the pull request. Nothing is published from a pull request.

**Why this priority**: Catching failures before the merge keeps `main`
publishable; it is useful but the site works without it.

**Independent Test**: Open a pull request with a failing test; the pull
request shows a failed check and the site does not change.

**Acceptance Scenarios**:

1. **Given** a pull request into `main`, **When** it is opened or updated,
   **Then** the checks run and their result shows on the pull request.
2. **Given** a pull request, **When** its checks pass, **Then** nothing is
   published until it is merged.

---

### User Story 4 - Each published catalog becomes the protected baseline (Priority: P2)

Every successful publish is recorded in the repository history as a
release mark. The catalog check then compares later changes against what
players actually have, so a published puzzle number can never change.

**Why this priority**: The catalog contract makes the latest release the
append-only baseline; without release marks the guard compares a commit
with itself and protects nothing after the merge.

**Independent Test**: After a publish, a release mark for that commit
exists; a later change that edits an existing puzzle fails the catalog
check against it.

**Acceptance Scenarios**:

1. **Given** a successful publish, **When** the pipeline ends, **Then** a
   release mark named for the publish date points to the published commit.
2. **Given** two publishes on the same day, **When** the second ends,
   **Then** it gets its own mark and the first mark is kept.

---

### Edge Cases

- Two merges arrive close together: the later one wins; a publish never
  mixes files from two versions, and an older run never replaces a newer
  live version. A re-run of an older run publishes nothing, because its
  commit is no longer the head of `main`.
- The publish step itself fails (service problem): the previous version
  stays live and the failure is visible; a rerun publishes normally.
- The browser checks differ by operating system (for example screenshot
  baselines made on macOS): the pipeline must not fail only because of
  that; the platform-specific check is skipped or has its own baseline.
- The site is served from a sub-path (`/websudoku/`): all game files and
  shared links work there.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every push to `main` MUST start the pipeline; the maintainer
  MUST also be able to start it by hand.
- **FR-002**: The pipeline MUST run the unit tests, the catalog tests, the
  type check and the end-to-end browser tests in the Chrome and Safari
  engines before it publishes.
- **FR-003**: If any check fails, the pipeline MUST NOT publish, and the
  live site MUST keep its previous version.
- **FR-004**: The pipeline MUST publish exactly the game files (the `web/`
  folder) and nothing else from the repository: no tests, tools, specs or
  development files.
- **FR-005**: The published site MUST be served over HTTPS at
  `https://alek.ws/websudoku/`, so the clipboard features work.
- **FR-006**: Pull requests into `main` MUST run the same checks and show
  the result, and MUST NOT publish.
- **FR-007**: Only one publish MAY run at a time; a newer run MUST win over
  an older one.
- **FR-008**: After a successful publish, the pipeline MUST create a
  release mark (`release-YYYY-MM-DD`, with a suffix when one already exists
  that day) on the published commit.
- **FR-009**: The catalog check in the pipeline MUST see the existing
  release marks and `main`, so its append-only comparison has a real
  baseline.
- **FR-010**: The pipeline MUST use only the permissions it needs: publish
  rights only in the publish step, and no stored personal secrets.
- **FR-011**: Each pipeline job MUST finish within its limit, or fail:
  15 minutes for the checks, 10 for the publish, 5 for the release mark.

### Key Entities

- **Pipeline run**: one execution for a push, a pull request or a manual
  start; has a result (passed, failed) and, for `main`, a published
  version.
- **Published version**: the set of game files live on the site, tied to
  one commit.
- **Release mark**: a named pointer to a published commit; the newest one
  is the catalog baseline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A change merged into `main` is live on the public site within
  10 minutes in at least 9 of 10 merges.
- **SC-002**: 0 publishes happen from a run with a failing check.
- **SC-003**: The live site opens a shared puzzle link and the game is
  playable on the first load, in Chrome and Safari.
- **SC-004**: Every publish has a release mark, and the catalog check of
  the next change compares against it.
- **SC-005**: The published site contains only game files: 0 test, tool or
  specification files are reachable from the public address.

## Assumptions

- The repository `olomix/websudoku` is public, so GitHub Pages is free and
  the site is public.
- GitHub Pages is switched to "GitHub Actions" as its source; the
  maintainer may need to do this once in the repository settings if the
  pipeline cannot do it.
- The site uses the account's existing custom domain `alek.ws` (set in the
  `olomix/olomix.github.io` repository), so the game lives at
  `https://alek.ws/websudoku/`; HTTPS is enforced for that domain and this
  site (maintainer decision, 2026-11-23).
- The screenshot comparison tests stay macOS-only; the pipeline runs on a
  Linux runner and skips them (see Edge Cases). The other browser tests
  run there.
- The first publish creates the first release mark; puzzle numbers of that
  catalog are then protected.
