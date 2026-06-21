---
session_id: 554ad92d-c5a9-438b-a089-05a9d453bfb7
date: 2026-06-20
time: "10:34 PM PDT – 11:01 PM PDT"
project: minutes
branch: main
---

## Overview

Parked the in-progress parakeet-install-rewrite work safely, synced `main` to the latest upstream, assessed where the `dev` branch stands, compared the three live versions of `docs/PARAKEET.md`, and made a durable off-stash backup of all 14 alternate PARAKEET draft revisions.

## Key Decisions Made

- **Stash, not commit, to park the WIP.** Per the standing "never run git commit" rule, used `git stash push -u` (including untracked files) to clean the tree before switching branches. Fully reversible, nothing committed.
- **Backed the drafts out of the stash to a plain folder.** A stash is the *only* reachable copy of untracked files and is one `git stash clear`/`git gc` away from loss. Copied all drafts to `~/parakeet-drafts-backup-2026-06-20/` for belt-and-suspenders durability. Declined (user's call) the third option of committing+pushing them to `origin` for now.
- **`PARAKEET_ryan.md` is the canonical direction.** User confirmed this 588-line draft is the furthest along and the direction to pursue when the rewrite resumes.
- **Do not reapply the stash's PARAKEET.md wholesale.** The stash drafts predate upstream PR #250 (now in `main`) and describe superseded mechanics. Future merge should base on `main` and graft the drafts' stronger sections.

## Changes Made

| Change | Detail |
|--------|--------|
| **Stashed WIP** | `git stash push -u` on `docs/parakeet-install-rewrite` → `stash@{0}`: 3 staged edits (README.md, crates/cli/src/main.rs, docs/PARAKEET.md) + 14 PARAKEET draft revisions + agent config dirs |
| **Switched + synced main** | `git switch main`; fetched `origin`+`upstream`; fast-forwarded `a564cbd → 8a45434` (47 commits, 103 files, +9063/−915) |
| **Drafts backup** | Extracted all 14 PARAKEET drafts + 1 session summary from `stash@{0}^3` to `~/parakeet-drafts-backup-2026-06-20/` (content-verified, sizes match stash blobs) |
| **Memory note** | New `project_parakeet_drafts_backup.md` + MEMORY.md index line recording stash location, backup folder, preferred draft, and PR #250 context |

## Research Performed

- **Branch topology audit.** `dev` is 7 ahead / 47 behind `main`, fully in sync with `origin/dev`. Its 7 unique commits are all docs; its parakeet rewrite (`f69ffb7`) already landed upstream as **PR #250** (`8a45434`), so `dev`'s PARAKEET.md is now functionally redundant with `main`.
- **Three-way `docs/PARAKEET.md` comparison** (dev vs main vs stash): line counts 629 / 640 / 568. `dev→main` = 35/24 (minor PR-review tweaks); `main→stash` = 178/250 (a real divergent rewrite). Catalogued section-header structure of both main and stash and the per-area differences (sidecar config, model download method, Python env, English-110m coverage, cleanup guidance, atomics/CMake troubleshooting).
- **Stash integrity verification.** Confirmed all 14 listed draft files present in `stash@{0}^3` via `git cat-file -e`/`-s`, then re-verified by content after the folder copy.

## Summary Statistics

- 47 upstream commits pulled into `main` (103 files, +9063/−915)
- 14 PARAKEET draft revisions + 1 session summary backed up (~300 KB)
- 3 versions of `docs/PARAKEET.md` diffed pairwise
- 0 commits made, 0 work lost
- 1 memory file created, 1 index line added

## Discoveries / Handoff Notes

- **Untracked-in-stash files are the easiest git data to lose** — not reachable from any branch, vulnerable to `stash clear` + `gc`. Always make an external copy when a stash is the sole home of untracked work.
- **`stash@{0}^3` is the untracked-files tree** of a `-u` stash; `^2` is the index/staged tree, `^1` the base commit. Use `git cat-file -p 'stash@{0}^3:<path>'` to pull individual untracked files without popping the stash.
- **Main's PARAKEET.md (PR #250) supersedes the stash drafts on three mechanics:** sidecar now auto-enables when `example-server` resolves (drafts still require `parakeet_sidecar_enabled = true`); model download via `curl .../resolve/main/...nemo` instead of `hf download`; Python env via `uv venv` + explicit `torch safetensors packaging numpy` (no torchaudio/huggingface_hub).
- The stash drafts' genuinely better bits to graft forward: the **dedicated tdt-ctc-110m English-model section** and the **explicit clone/convert-env cleanup** guidance.

## Current State

- On `main`, in sync with `upstream/main` (`8a45434`), working tree clean.
- `stash@{0}` intact on `docs/parakeet-install-rewrite` — holds all WIP.
- `~/parakeet-drafts-backup-2026-06-20/` holds the 14 drafts + session summary (independent of git).
- This summary file is itself a new untracked file on `main` (not yet committed).

## Unfinished Work

- **Resume the parakeet rewrite** when ready: `git switch docs/parakeet-install-rewrite && git pull` (branch is 46 behind its own remote) `&& git stash pop`.
- **Reconcile PARAKEET.md** against the newer `main` version before continuing — base on main, graft `PARAKEET_ryan.md`'s direction + the 110m section + cleanup guidance.
- **Optional durability upgrade** (declined for now): commit the drafts to `docs/parakeet-install-rewrite` and push to `origin` for an off-machine copy.
- **`dev` branch** is 47 behind `main`; a catch-up merge/rebase is pending if it's to stay current (pure-docs, should be low-conflict).
