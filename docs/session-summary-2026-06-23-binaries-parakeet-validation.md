---
session_id: ef3ac783-bd37-4900-99ad-f8d5c665e88a
date: 2026-06-23
time: "1:45 AM PDT – 4:08 AM PDT"
resumed: "3:52 AM PDT"
project: minutes
branch: dev
---

# Session Summary — Validating the bundled-CLI / Parakeet investigation & shipping a reference doc

## Overview

Reviewed and independently fact-checked the work of two tandem "junior agent" sessions
(`495d4d49` and `c4136450`, both `claude-opus-4-7`) that investigated the macOS bundled-CLI sidecar
and the Parakeet/Metal feature flags. Re-verified every substantive claim against the live codebase,
caught one false statement the juniors missed and one overstatement they identified but never fixed,
then consolidated the validated picture into a new reference doc (`docs/BINARIES-AND-PARAKEET.md`) and
hardened three sections of `docs/ARCHITECTURE.md`.

## How we got here — the junior sessions

The two prior sessions ran interleaved (captured in `docs/replay-merge-495d4d49-c4136450-full.md`)
against the same question thread: *how does the Tauri app stay in sync with the CLI's Parakeet
feature, and how is the app installed?* Their arc:

- **`495d4d49`** (the longer thread, 45 turns) — started with an **initial wrong answer** ("the app
  isn't installed here" and "the app cannot update a CLI it didn't install — you'll rebuild forever"),
  then progressively self-corrected as it ground claims against the repo: discovered the bundled CLI
  sidecar, the `675f6b6` commit, and the `release-macos.yml` build flags. Ended on a §2-closing-sentence
  refinement it flagged but did not apply.
- **`c4136450`** (the tighter thread, 22 turns) — ran the claim-validation → ARCHITECTURE.md edits
  end-to-end and is where the doc edits were actually **applied** (frontmatter caveat, §§2/3/4/9, and a
  new PRE-COMMIT.md "Bundle topology" row).

The user `/copy`'d responses between the two, so they share verbatim text and conclusions. Both were
already staged (`M docs/ARCHITECTURE.md`, `M docs/PRE-COMMIT.md`) when this session began.

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Independently re-verify every junior claim before trusting it | Source-grounding rule — the juniors mixed true findings, self-corrected errors, and one un-caught false claim. Trust required re-checking against `git show`, the real files, and the installed bundle. |
| Ship a standalone reference doc rather than only patching ARCHITECTURE.md | The investigation produced a coherent "binaries + Parakeet distribution" story worth its own canonical home, with a claim ledger that records the *resolved* state (not the mid-session back-and-forth). |
| Apply the §12/§13 ARCHITECTURE.md nuances now, against the juniors' "defer to next refresh" call | They were verified, tiny, and directly on-topic ("which `minutes` binary am I actually touching"). Deferring verified one-liners adds no value. |
| Adopt a 4-state claim ledger (right / wrong-self-corrected / wrong-missed / identified-not-applied) | Distinguishes the failure modes precisely; future cross-session consolidations should reuse it. |

## The validation verdict

**Verified TRUE** (re-grounded): updater endpoint `tauri.conf.json:43`; `latest.json`/`Minutes.app.tar.gz`
build+upload `release-macos.yml:172,183,211–215`; CLI+app built `--features parakeet,metal`
(`:109,:122`); sidecar guard ≥10 MB + Mach-O refs #324 (`:124–135`); `externalBin:["…,"bin/minutes"]`
(`tauri.macos.conf.json:7`); sidecar staging + 52-byte placeholder (`build.rs:32,93,98`); resolver
order (`transcribe.rs:2462–2481`); Layer-2 gate `hints.is_empty()&&!FORCE_DIRECT&&!HELPER_ACTIVE`
(`:1927–1929`); live `1→3` / batch `1→2→3` bifurcation; `VERSION_PROBE_TIMEOUT = 1s`
(`cli_setup.rs:18`); commits `351ca48`(#117)/`2647b65`(#139)/`675f6b6`; this machine's v0.18.5 ships
the placeholder stub and both PATH CLIs are 32 MB regular files (not symlinks).

**Self-corrected by the juniors** (not problems): "app isn't installed here" (a zsh-glob abort) and
"app can never update a CLI it didn't install" (the bundled-sidecar track disproves the absolute).

**FALSE and NOT caught** — `495d4d49`'s *"there is no precompiled parakeet CLI artifact anywhere."*
`release-cli.yml` (matrix `:23–37`, upload `:82–91`) builds and publishes `minutes-macos-arm64`
(`parakeet,metal`) plus Windows/Linux (`parakeet`) as GitHub release assets. The accurate statement is
narrower: no *auto-installing/auto-updating* channel ships a Parakeet CLI, but a precompiled one exists
for manual download.

**Identified but NOT applied** — ARCHITECTURE.md §2's "the Layer-2 binary *is the same binary that
ships inside the bundle as a sidecar*." The resolver ends at `which("minutes")` = first on PATH (on
this machine, a standalone cargo CLI, not the bundle). Fixed this session.

## Changes Made

| Change | Detail |
|--------|--------|
| **New reference doc** | Created `docs/BINARIES-AND-PARAKEET.md` (250 lines) — binaries, per-binary features, 4 distribution channels, auto-update sync, #324 guard gap, Parakeet fallback chain, install-provenance detection, and a 10-row claim ledger |
| **ARCHITECTURE.md §2** | Replaced the "same binary" overstatement with the full resolver order (`MINUTES_PARAKEET_HELPER` → `current_exe()` if named `minutes` → `which("minutes")`) and the whisper-only → Layer-3 failure mode (`:113–120`) |
| **ARCHITECTURE.md §12** | Noted the macOS bundle is **not** a `findMinutesBinary` probe candidate (`index.ts:481–492`); reached only via the `~/.local/bin/minutes` symlink after "Set up CLI" |
| **ARCHITECTURE.md §13** | CLI verification row now leads with `readlink "$(which minutes)"` to prevent misattributing the bundled sidecar's flags to a standalone CLI |
| **Ledger refresh** | Flipped claim #10 ⚠️→✅; replaced "Outstanding doc fix" with "Related ARCHITECTURE.md refreshes"; fixed a `transcribe.rs:113–115`→`ARCHITECTURE.md` typo |
| **Memory** | Added `project_precompiled_parakeet_cli.md` (corrects the "must compile from source" misconception) + MEMORY.md index line |

*(The original junior edits — ARCHITECTURE §§3/4/9, frontmatter caveat, the PRE-COMMIT "Bundle topology"
row — were already staged at session start and were validated, not re-authored, here.)*

## Research / Verification Performed

- **~25 discrete claims** re-verified against source across `transcribe.rs`, `cli_setup.rs`, `build.rs`,
  `tauri.conf.json`, `tauri.macos.conf.json`, all three `release-*.yml` workflows, `index.ts`,
  `main.rs`, and `minutes-cli.entitlements`.
- **3 commits** inspected via `git show`/`--stat` (`351ca48`, `2647b65`, `675f6b6`) to confirm
  attribution and the parakeet-then-metal timeline.
- **Installed-artifact probe** on this machine: v0.18.5 bundle sidecar = 52-byte shell placeholder
  (#324); `~/.local/bin/minutes` + `~/.cargo/bin/minutes` both 32 MB regular files.
- **Render check**: programmatic table column-count + code-fence balance validation on both edited
  docs; all tables consistent, all fences balanced.

## Summary Statistics

- **1 doc created** (250 lines); **2 docs edited** (`ARCHITECTURE.md` +79/−19; `PRE-COMMIT.md` staged
  from junior work).
- **2 memory files** written/updated.
- **2 junior sessions** (67 combined turns) reviewed via the merged transcript.
- **1 false claim** caught that the juniors missed; **1 overstatement** fixed that they had flagged.

## Discoveries / Handoff Notes

- **The `~/.local/bin/minutes → bundle` symlink is a probe-graph rewrite, not a convenience.** Once
  "Set up CLI" runs, *every* PATH-based `minutes` lookup in the system silently re-routes into the
  bundle — Layer-2 Parakeet resolver, MCP `findMinutesBinary`, manual `which`, capability checks. This
  is the structural insight unifying the §§2/9/12/13 edits.
- **A precompiled Parakeet CLI does exist** (`release-cli.yml` GitHub release assets); only an
  *auto-update channel* for it is missing. Saved to memory so it doesn't get re-misremembered.
- **CI feature-flag gap is still open**: the sidecar guard checks Mach-O + size but **not** features, so
  a Parakeet-flag regression would ship silently. Low-risk today (explicit YAML), un-gated nonetheless.

## Post-commit addendum — third (Codex) parallel session reviewed

After the initial commit (`05442ca`), a transcript from a **Codex** agent working the same questions
in parallel was reviewed for additive material. Two genuinely new, source-verified items surfaced and
were folded into `BINARIES-AND-PARAKEET.md`:

| Addition | Detail |
|----------|--------|
| **§7 — app-internal install classifier** | Documented `detect_install_method` (`cli_setup.rs:276`) and its 7 outcomes (`none`/`cargo`/`bundled`/`brew`/`other`/`unknown`/`conflict`), plus the `cmd_cli_install_state` JSON (`adhoc_signed`, `translocated`, `in_sync`, `path_candidates`, …) and the `cmd_cli_*` command family. Codex found a 4-state version; the code has 7. This machine reports `conflict` + `in_sync: false`. |
| **§9 — PARAKEET.md two-track recommendation** | Recorded (not applied) Codex's proposal to split PARAKEET.md so official-release users skip the CLI/Tauri rebuilds while still doing runtime setup. Verified the compile-vs-runtime split (`resolve_parakeet_binary/model/vocab`, `transcribe.rs:1858/2897/2933`). Added the **health-check gate** Codex omitted — its "skip rebuilds" advice is unsafe for installs like this machine's (#324 placeholder + cargo CLI). |

Codex notes vs our findings: it correctly avoided junior `495d4d49`'s "no precompiled CLI" error
(but also never discovered the artifact), and it **missed the #324 placeholder** entirely (never
inspected the bundle), making its unconditional "skip rebuilds" guidance the one risk to correct.

## Unfinished Work

- **First commit already pushed.** `05442ca` is on `origin/dev`. These late additions (§7, §9, this
  addendum) are uncommitted. Either land them as a **follow-up commit** (safe) or, only if `dev` is
  not shared, `git reset --soft HEAD~1` + recommit + `git push --force-with-lease`.
- The `docs/replay-*.md` transcript files (except the merged one, now committed) are untracked; decide
  whether they belong in the repo or should be git-ignored.
- **PARAKEET.md two-track split** (§9) is a recommendation only — not yet applied to `PARAKEET.md`.
- §13's app-row claim (`cmd_get_settings`, `commands.rs:8455`) was carried over from the juniors but
  not re-verified this session — low priority.
