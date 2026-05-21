---
date: 2026-05-21
time: "3:14 AM PDT – 3:46 AM PDT"
project: minutes
branch: dev
---

## Overview

Diagnosed why the Minutes CLI (`v0.18.0`) had drifted out of sync with the auto-updated Tauri app (`v0.18.2`), traced the CLI's original install channel to the maintainer's Homebrew tap, and brought both back in sync with a `brew upgrade`. Short session, but it nails down a recurring "how do I keep these two things in sync" question that will come up on every future release.

## The Core Insight: Minutes Has Two Independent Update Channels

This is the takeaway to remember. **The GUI app and the CLI are separate installs with separate update mechanisms.** They are *not* updated together, and neither one can update the other.

| Component | Install location | Update mechanism | Who triggers it |
|-----------|------------------|------------------|-----------------|
| **Tauri GUI app** | `/Applications/Minutes.app` | Built-in `minutes-updater` (signed Tauri binary delta) | In-app "Check for updates" button |
| **CLI** | `/opt/homebrew/bin/minutes` → `Cellar/minutes/<ver>/bin/minutes` | Homebrew (`brew upgrade minutes`) | You, manually |

The app's version-check screen knows it cannot manage the CLI — that's exactly what this message means:

> **COMMAND-LINE TOOL** — The minutes on your PATH is not managed by this app. Reinstall or update it however you originally installed.

That message is correct and intentional. The app can detect the CLI's version (to show the sync status) but deliberately won't touch a binary it didn't install. After a smooth in-app update, the CLI **will always lag** until you upgrade it yourself.

## Key Decisions Made

- **Identified the CLI source from filesystem evidence, not memory.** The symlink `/opt/homebrew/bin/minutes → ../Cellar/minutes/0.18.0/bin/minutes` is Homebrew's unmistakable fingerprint (the `Cellar/` path). `brew info` confirmed `Tap: silverstein/tap`, formula `silverstein/homebrew-tap/Formula/minutes.rb`, `Installed (on request)`. This matched the May 15 install record (`brew install silverstein/tap/minutes`).
- **Used `brew upgrade minutes` (the formula), not the cask.** The tap publishes *both* a formula (the CLI) and a cask (the GUI app). They collide on the name `minutes`. Brew even warned about it: `Treating minutes as a formula. For the cask, use ... or specify the --cask flag.` The formula is the correct target for the CLI — the cask would install/manage a *second* copy of the GUI app and step on the in-app updater.

## Changes Made

| Change | Detail |
|--------|--------|
| **Upgraded CLI** | `brew update && brew upgrade minutes` — `silverstein/tap/minutes` 0.18.0 → 0.18.2. Formula is source-based: `cargo install --path crates/cli` compiled it in ~1m11s. |
| **Upgraded llama.cpp (incidental)** | User batched `llama.cpp 9200 → 9260` into the same `brew upgrade` command. Bottle (prebuilt), unrelated to Minutes. |

## Testing / Research Performed

- `which -a minutes` + `ls -la` on the symlink → confirmed single CLI on PATH, Homebrew-managed.
- `brew info silverstein/tap/minutes` → confirmed tap, formula source, `Installed (on request)`, and the available `0.18.0 → 0.18.2` upgrade.
- Post-upgrade: `minutes --version` → `minutes 0.18.2`; `which minutes` → `/opt/homebrew/bin/minutes` (symlink now repoints into `Cellar/minutes/0.18.2/`).
- User re-ran the in-app version-check screen → **CLI and app both report 0.18.2, in sync.** ✅

## Discoveries / Handoff Notes

**The repeatable "keep them in sync" procedure** (do this after every in-app update):

```bash
brew update && brew upgrade minutes
minutes --version          # should now match the app
```

Non-obvious facts worth carrying forward:

- **The Homebrew formula is a *source* build, not a bottle.** `brew info` lists `Dependencies: Build (2): cmake, rust`. Every `brew upgrade minutes` recompiles the CLI from Rust source on-device (~1 minute). That's why it's slower than a typical brew upgrade and why `rust`/`cmake` must stay installed.
- **The formula builds whisper-only — no `--features parakeet`.** The upgraded CLI is *still* a whisper-only build. This is fine and expected: Parakeet transcription runs through `/Applications/Minutes.app` (which is compiled with Parakeet + Metal). The CLI's job here is `minutes setup --parakeet` (Silero VAD weights) and general CLI commands — none of which need the parakeet feature. Upgrading the CLI does **not** regress the Parakeet setup.
- **Formula vs cask name collision.** `brew <cmd> minutes` defaults to the *formula* (CLI). To act on the GUI app cask you must pass `--cask` or the fully-qualified `silverstein/tap/minutes`. For this machine the cask should generally be left alone — the GUI app is the direct-DMG install with the working in-app updater (see the May 15 parakeet-install summary for why the cask was deliberately not used).
- **Version drift is the normal steady state, not a bug.** After any in-app update, expect `CLI < app` until you run `brew upgrade`. The in-app sync-check button exists precisely to make that drift visible.

## Summary Statistics

- CLI version: 0.18.0 → 0.18.2 (now in sync with the app)
- Packages upgraded: 2 (`minutes` formula, `llama.cpp` bottle)
- Files modified in-repo: 0 (this was an environment/install task)
- Diagnostic commands run: 4
- Build time for the CLI formula: 1m11s (source compile)

## Unfinished Work

None. The CLI and app are in sync at 0.18.2 and the user confirmed it via the in-app check. The only thing to "remember" is the procedure above — re-run `brew update && brew upgrade minutes` after each future in-app update.
