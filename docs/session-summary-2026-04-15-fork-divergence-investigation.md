---
date: 2026-04-15
time: "2:16 AM PDT – 2:47 PM PDT"
project: minutes
branch: main
---

## Overview

Investigated a confusing GitHub fork state (357 ahead, 491 behind upstream with zero user commits authored), traced the root cause to a recurring history rewrite on `silverstein/minutes` that strips commit signatures, and established a sync strategy that will work going forward. No source code changed; one memory file added.

## The Mystery

GitHub reported `rymalia/minutes:main` was **357 commits ahead** and **491 commits behind** `silverstein/minutes:main`, despite the user having authored zero commits on the fork. This is nominally impossible without history divergence — so the question was *how* and *why*.

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| **Reset fork hard to upstream/main** | All 357 "ahead" commits had byte-identical trees to their upstream counterparts; nothing of the user's was being discarded. Safe operation. |
| **Use `--force-with-lease` over `--force`** | Lease-based push prevents accidentally overwriting unexpected remote state; right muscle memory even when unnecessary for a solo fork. |
| **Save the pattern as a project memory** | Confirmed the sig-strip happens on every release (observed twice in one session: v0.12.0 cycle and v0.12.1 cycle). Future sessions will recognize it immediately. |

## Root Cause Analysis

Through raw commit object inspection (`git cat-file -p`), the divergence signature was isolated:

- Paired commits (one on fork, one on upstream) had **identical** trees, parents, authors, committers, timestamps, and messages
- The **only** difference was the presence of a `gpgsig` block on the fork's side and its absence on upstream

This is the fingerprint of a `git filter-repo --commit-callback 'commit.gpgsig = b""'` run followed by `git push --force`. Silverstein strips signatures from the entire history as part of his release workflow. Because changing a commit's signature changes its SHA, every descendant SHA changes too — which is why all 491 post-divergence commits differ despite identical content.

### Scope of the strip

Not targeted at one contributor — it's wholesale. Counted signed commits on the fork's divergent range:

| Signer | Commits |
|--------|---------|
| Mat Silverstein (self) | 27 |
| Claude | 6 |
| gregoire22enpc | 5 |
| Gonzalo Bilune | 3 |
| Ali Tariq | 3 |
| Cathryn Lavery | 2 |
| Others | 3 |
| **Total stripped** | **~49** |

Includes PGP signatures (GitHub web-merge, keyid `4AEE18F83AFDEB23`) and SSH signatures (contributor local configs).

### Observed twice in one session

| Release | Before → after force-push | Fork visible state |
|---------|---------------------------|--------------------|
| v0.11.0 → v0.12.0 | `7f18f02` (April 8) → `7c1af90` (April 14) | 357 ahead / 491 behind |
| v0.12.0 → v0.12.1 | `7c1af90` (April 14) → `afdbf91` (April 15) | 27 ahead / 39 behind |

Fetching upstream the second time produced `+ 7c1af90...afdbf91 main -> upstream/main (forced update)` — the telltale `+` confirming another rewrite.

## Changes Made

| Change | Detail |
|--------|--------|
| **Fork reset (twice)** | `git reset --hard upstream/main && git push --force-with-lease`, first to `7c1af90`, then to `afdbf91` after the second upstream force-push |
| **New memory file** | `~/.claude/projects/-Users-rymalia-projects-minutes/memory/project_fork_sig_strip.md` documents the pattern, verification steps, and remediation |
| **MEMORY.md index updated** | Added pointer to the new memory |

## Research Performed

- Compared `origin/main` and `upstream/main` with `git rev-list --left-right --count` at three points during the session
- Sampled paired commits and verified identical tree hashes via `git log -1 --format=%T`
- Inspected raw commit objects byte-for-byte with `git cat-file -p` to isolate the difference
- Checked commit reachability across both refs with `git merge-base --is-ancestor` to distinguish orphaned vs. live commits
- Counted signature-carrying commits per author on the divergent range
- Verified the credential-file theory (filter-repo to remove a leaked secret) and rejected it — the file still exists in shared history
- Re-ran the investigation after observing a second force-push to confirm the pattern is recurring, not a one-off

## Discoveries / Handoff Notes

**The sig-strip pattern is recurring, not a one-off.** The fork will always appear `N ahead / M behind` after each upstream release. This is not true divergence; it's a metadata rewrite. The recipe is:

```bash
git fetch upstream
git reset --hard upstream/main
git push --force-with-lease
```

**Why signatures exist and why stripping them is unusual:**

- Contributor-signed commits land on upstream via normal PR merges (some contributors configure `commit.gpgsign = true` locally)
- GitHub web-merges add a PGP signature automatically (signed by GitHub itself, `noreply@github.com`)
- Silverstein's own commits may carry signatures if he's signing locally
- Most maintainers either ignore signatures or enforce them via branch protection. Silverstein's workflow ("accept signed contributions, then flatten signatures periodically") is unusual — probably motivated by reproducibility, attribution uniformity, or reducing GitHub's "Unverified" badge clutter
- The irony: signatures exist to prove authenticity and integrity, but stripping them destroys both. For this project, trust flows from the maintainer's HEAD pointer, not per-commit signatures — so the decoration loss is acceptable to him

**Verifying the pattern before resetting in the future:**

1. `git log origin/main --not upstream/main --format=%H | tail -1` — oldest divergent commit on fork
2. `git log upstream/main --not origin/main --format=%H | tail -1` — its upstream counterpart
3. `git cat-file -p <sha>` on both — if the only difference is `gpgsig` present/absent, reset is safe
4. `git log -1 --format=%T <sha>` on both — identical tree hashes confirm no content change

If trees differ or the fork has trees that don't exist in upstream, investigate before resetting.

**Branch topology observation:** `git merge-base` reports a shared ancestor (`cb6f07e` in the first round, `5e5f0eb` in the second) that is older than the actual first divergent commits' parent. This is normal — `merge-base` finds the *best* ancestor per its algorithm, which may not be the exact fork point for a fully rewritten history.

## Git Mechanics Insights Worth Keeping

- **A Git commit SHA hashes the entire commit object**, which includes the `gpgsig` header when present. Stripping a signature changes one commit's SHA, which cascades through every descendant because each commit pins its parent by SHA.
- **Tree hashes match + SHAs differ = metadata rewrite, not content divergence.** This is the diagnostic fingerprint for `filter-repo` / `filter-branch` passes.
- **Merge commits preserved across a rebase fingerprint `filter-repo`, not `git rebase`.** Plain rebase flattens merges by default; `--rebase-merges` preserves them but is rare. `filter-repo` preserves topology and trees while rewriting SHAs.
- **GitHub's fork comparison UI counts graph divergence, not content divergence.** Two commits with identical diffs but different SHAs look like unrelated work.
- **Force-push after history rewrite is the only way to propagate the change to collaborators.** The `+ old...new main (forced update)` line in `git fetch` output is the telltale.

## Summary Statistics

- 2 upstream force-pushes observed and diagnosed in one session (v0.12.0, v0.12.1)
- 3 commit pairs sampled and verified byte-identical (modulo `gpgsig`)
- ~49 signature-bearing commits identified on the fork's pre-reset state
- 2 fork resets performed (`afdbf91` is the current tip)
- 1 memory file created, 1 MEMORY.md index entry added
- 0 source code files modified
- 0 commits authored by the user on the fork (confirmed)

## Current State

- **Fork tip:** `afdbf91` — "Improve live transcript VAD and Parakeet behavior"
- **Working tree:** clean on `main`, synced with `upstream/main`
- **GitHub comparison:** should now show `0 ahead, 0 behind` (until silverstein's next release force-push)
- **Local working copy:** has several untracked docs from prior sessions (`docs/QMD-ONBOARDING-FEEDBACK.md`, `docs/session-summary-2026-03-31-*.md`, `docs/session-summary-2026-04-06-*.md`, `package-lock.json`, `package.json`) — unrelated to this session
- **CLAUDE.md:** modified earlier in the session with a parakeet.cpp reference (intentional, not part of this work)

## Unfinished Work

- **Rebuild after the sync:** The user hasn't yet run `cargo clean && ./scripts/build.sh && cd crates/mcp && npm install && npm run build`. ~130 commits of real new work landed (parakeet.cpp support, Vulkan/ROCm GPU backends, unified design system, Next.js 16 site, plugin v0.8.0, cross-host skill compiler). The old binaries are stale.
- **Read v0.12.1 release notes:** `gh release view v0.12.1 --repo silverstein/minutes` — may describe config/data migrations affecting `~/.minutes/` state.
- **Consider whether to raise the sig-strip pattern with silverstein:** It's unusual enough that other forkers probably also find it confusing. A GitHub Discussion or a CLAUDE.md note from the maintainer explaining the workflow would save future forkers the same investigation. Not acted on this session.
