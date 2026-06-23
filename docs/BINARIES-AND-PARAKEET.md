---
title: Binaries & the Parakeet feature — validated reference
status: source-verified against repo @ 0.18.14 on 2026-06-23
date: 2026-06-23
assessed_sessions: "495d4d49-740f-4650-a951-d36d008c5c34", "c4136450-11fa-4fd0-aa15-3cf722d9afea"
scope: Which binaries exist, how the Parakeet/Metal compile-time features reach
  each one, the macOS bundle topology + sidecar, auto-update behavior, and the
  Parakeet runtime fallback chain.
caveat: |
  Every claim below was re-verified against the actual codebase, git history, and
  the installed app bundle on 2026-06-23. Line numbers reflect the repo around
  0.18.14 and drift — treat them as "start reading here." Where a claim could not
  be verified from THIS repo (e.g. the external Homebrew tap formula), it is
  marked [unverified-here].
---

# Minutes — Binaries & the Parakeet Feature (validated reference)

This document consolidates and **fact-checks** the bundled-CLI / Parakeet investigation
carried out across sessions `495d4d49` and `c4136450`. It supersedes the loose claims in
those transcripts: a few statements there were wrong (and mostly self-corrected), one was
wrong and *not* caught, and one inaccuracy was identified but never fixed in the prose. All
three are called out in the [Claim ledger](#claim-ledger) at the end.

---

## 1. The binaries that exist

`minutes-core` is a **library crate** (`crates/core/`) — no `main()`, compiles to a `.rlib`,
statically linked into every binary at link time. There is no `minutes-core` file to install
and no `minutes-core` process at runtime.

Two binary crates link against it:

| Binary | Crate | Approx size | What it is |
|---|---|---|---|
| `minutes` | `crates/cli/` | ~32 MB | The CLI (45 commands). |
| `minutes-app` | `tauri/src-tauri/` | ~47 MB | The Tauri v2 menu-bar desktop app. |

On **macOS since commit `675f6b6` (May 4 2026)**, the `.app` bundle ships **both** binaries:

```
/Applications/Minutes.app/Contents/MacOS/
├── minutes-app     ← the desktop app
└── minutes         ← the CLI, shipped as a Tauri externalBin "sidecar"
```

So on macOS, `minutes-core` is effectively **triplicated** on disk: once in the standalone CLI
release binary, once inside `minutes-app`, and once inside the bundled `minutes` sidecar.

- `externalBin` declaration: `tauri/src-tauri/tauri.macos.conf.json:7` (`"bin/minutes"`).
  The base `tauri/src-tauri/tauri.conf.json` does **not** declare `externalBin` — it's a
  macOS-only override.
- Staging: `tauri/src-tauri/build.rs:32` (`stage_minutes_cli_sidecar()`) copies
  `target/release/minutes` → `bin/minutes-<target>` before `cargo tauri build`. Tauri's
  bundler then **strips the arch suffix**, so the installed name is plain `minutes`.
- If `target/release/minutes` is missing at bundle time, `build.rs:93,98` writes a **52-byte
  placeholder stub** (`#!/bin/sh … exit 1`) instead. Distributable releases must never ship
  this (see [§5 / issue #324](#5-the-324-placeholder-regression)).

---

## 2. Compile-time features are per-binary

`parakeet`, `metal`, `diarize`, `whisper` are **Cargo features on `minutes-core`**, enabled
independently by each binary at build time. They are **not** runtime toggles.

- Enabling Parakeet in the CLI does **not** enable it in the app, and vice-versa.
- A bare `cargo tauri build --bundles app` produces a **whisper-only** app; the app needs
  `--features parakeet,metal` (or `TAURI_FEATURES="parakeet,metal"`).
- `metal` is an Apple-GPU acceleration feature — it is **macOS-only**. Windows/Linux builds
  get `parakeet` without `metal` (see [§3](#3-how-parakeet-reaches-each-channel)).

**Verify what a binary was built with:**

| Target | Command | Expect |
|---|---|---|
| CLI | `minutes capabilities --json \| jq '.features'` | `parakeet: true`, `metal: true` on an official macOS build |
| App | Settings → Transcription (`parakeet_compiled`) | `true` |

The `capabilities` subcommand exists on the CLI (`crates/cli/src/main.rs:1566`,
`cmd_capabilities` at `:4962`). The MCP server probes it at boot for feature detection.

---

## 3. How Parakeet reaches each channel

There are **four** ways a Minutes binary can land on disk. Whether it has Parakeet depends
entirely on the channel:

| Channel | Binary | Parakeet? | Metal? | How |
|---|---|---|---|---|
| **macOS `.app` (DMG / in-app updater)** | `minutes-app` **+** bundled `minutes` sidecar | ✅ | ✅ | CI builds with `--features parakeet,metal` — `release-macos.yml:109` (CLI) & `:122` (app) |
| **Precompiled CLI from GitHub Releases** | `minutes` | ✅ | ✅ (macOS) / ❌ (win/linux) | `release-cli.yml` matrix — `parakeet,metal` for `aarch64-apple-darwin`, `parakeet` only for Windows/Linux; uploaded as release assets `minutes-macos-arm64` etc. (`release-cli.yml:23–36, 87–91`) |
| **Windows desktop** | `minutes-app` | ✅ | ❌ | `release-windows-desktop.yml:61` builds `--features parakeet` (no metal) |
| **Homebrew formula** `silverstein/tap/minutes` | `minutes` | ❌ | ❌ | Builds from source via `cargo install --path crates/cli` with no feature flags → **whisper-only** [unverified-here: formula lives in the external tap repo; documented in the 2026-05-21 session summary] |
| **Source build** | either | ✅ *if you pass the flag* | ✅ *if you pass it* | `cargo build --release -p minutes-cli --features parakeet` (`docs/PARAKEET.md:133,531,537`); app needs `--features parakeet,metal` |

> **Key correction to the transcripts:** a *precompiled* Parakeet CLI **does** exist — it's the
> `minutes-macos-arm64` release asset built by `release-cli.yml` with `parakeet,metal`. What does
> **not** exist is any channel that *auto-installs or auto-updates* a Parakeet CLI for you. The
> precompiled artifact must be downloaded manually; Homebrew's formula is whisper-only.

### Feature-flag history

- `351ca48` ("fix: enable parakeet feature in release workflows", closes **#117**, Apr 13 2026,
  silverstein) — added `--features parakeet` to all three release workflows (`release-cli.yml`,
  `release-macos.yml`, `release-windows-desktop.yml`).
- `2647b65` ("build(macos): enable Metal…", **#139**, Apr 17 2026) — added `,metal` on top.

So: **post-#117** = Parakeet in releases; **post-#139** = Parakeet **+** Metal on macOS. Both
flags are explicit literals in the workflow YAML today, so they can't silently regress — removing
either requires a deliberate edit.

---

## 4. Auto-update & keeping the CLI in sync

The Tauri updater (`tauri.conf.json:42–43`) polls
`https://github.com/silverstein/minutes/releases/latest/download/latest.json`, downloads the
signed `Minutes.app.tar.gz`, verifies the minisign signature against the embedded pubkey
(`tauri.conf.json:41`), and swaps the whole bundle. The release workflow generates `latest.json`
and uploads the artifacts at `release-macos.yml:172,183,211–215`.

**Do you re-enable Parakeet after an auto-update?** **No.** Parakeet is compiled into the
release artifacts; the updater swaps in another already-Parakeet-capable bundle.

**Does auto-update keep the CLI on your PATH in sync?** *Only on the bundled-sidecar track.*
There are three CLI tracks, with three different answers:

| Your `~/.local/bin/minutes` is… | What auto-update does to it | Manual work per release |
|---|---|---|
| **A symlink into the bundle** (created by app → Settings → Set up CLI; `cli_setup.rs:543`) | The bundle swaps → the symlink target swaps with it → you get the new Parakeet CLI for free | **None** |
| **A hand-built `cargo install` binary** (regular file) | Nothing — untouched | Rebuild (`cargo install --path crates/cli --features parakeet,metal`) |
| **The Homebrew formula** | Independent channel; still whisper-only | `brew upgrade minutes` (still no Parakeet) |

> The earlier transcript claim *"the app cannot update a CLI it didn't install — you'll rebuild
> forever"* is **true only for the latter two tracks**. The bundled-sidecar track (landed in
> `675f6b6`) is the third option and does ride auto-update. This was correctly self-corrected
> mid-session.

`cli_setup.rs` does more than symlink: it manages a multi-bundle picker, snooze state, shell-PATH
writing, and a 1-second `--version` probe (`VERSION_PROBE_TIMEOUT`, `cli_setup.rs:18`).

---

## 5. The #324 placeholder regression

`build.rs` writes a 52-byte shell-script stub when the real CLI isn't present at bundle time.
If a release is cut before `target/release/minutes` is built, that stub ships instead of the CLI —
issue **#324**. The guard added at `release-macos.yml:124–135` now asserts the bundled sidecar is
Mach-O **and** ≥ 10 MB (`-lt 10000000`) before publishing.

**The guard checks size + Mach-O, NOT feature flags.** A release built with the Parakeet flag
removed would still pass the guard. That residual gap is real but currently low-risk (the YAML
flags are explicit).

**On this machine right now** (`/Applications/Minutes.app`, **v0.18.5**, built Jun 2): the sidecar
is the 52-byte placeholder — this install predates / missed the guard. Both PATH CLIs
(`~/.local/bin/minutes`, `~/.cargo/bin/minutes`) are 32 MB hand-built `cargo` binaries, **not**
symlinks. So this machine is on the "manual rebuild" track, and its bundled sidecar is broken
regardless. To get onto the auto-updated track: update past v0.18.5, verify
`file …/Contents/MacOS/minutes` is Mach-O, `rm -f ~/.local/bin/minutes ~/.cargo/bin/minutes`, then
app → Settings → Set up CLI.

---

## 6. The Parakeet runtime fallback chain

Inside `minutes-core` (so identical in both binaries), `transcribe_with_parakeet` runs a 3-layer
chain (`transcribe.rs`, ARCHITECTURE.md §9):

| Layer | What | Model stays warm? | Code |
|---|---|---|---|
| **1 · warm sidecar** | `example-server` long-lived process, JSON over a Unix socket | ✅ | `parakeet_sidecar.rs:1251` |
| **2 · helper** | spawn `minutes parakeet-helper` child — one parakeet.cpp call, crash-isolated | ❌ | `transcribe.rs:1931` |
| **3 · direct** | spawn the `parakeet` binary directly | ❌ | `run_parakeet_cli_structured` |

**Layer 2 only runs when `helper_allowed`** = `hints.is_empty()` **and** neither
`MINUTES_PARAKEET_FORCE_DIRECT` nor `MINUTES_PARAKEET_HELPER_ACTIVE` is set
(`transcribe.rs:1927–1929`).

**The chain bifurcates by caller:**
- **Live** capture (recording-sidecar, `minutes live`) passes decode hints → `hints.is_empty()`
  is false → Layer 2 skipped → **`1 → 3`**. Live capture **never spawns `minutes`**.
- **Batch** (`minutes process`, watcher memos, cold reprocessing) passes empty hints → **`1 → 2 → 3`**.

So the app **does** spawn `minutes` for transcription — but only on the batch path. (This closes
the old §2-vs-§9 contradiction in ARCHITECTURE.md.)

**Which `minutes` gets spawned for Layer 2?** `resolve_minutes_parakeet_helper`
(`transcribe.rs:2462`) resolves in order:
1. `MINUTES_PARAKEET_HELPER` env var (if set and exists)
2. `current_exe()` **only if its filename is `minutes`** — for `minutes-app` this is false, so it
   falls through
3. `which::which("minutes")` — i.e. **whatever `minutes` is first on `PATH`**

> ⚠️ This is **not guaranteed** to be the bundled sidecar. It's the sidecar only if the user ran
> "Set up CLI" so the symlink is first on PATH. With a standalone `~/.cargo/bin/minutes` (this
> machine's case), *that* binary is spawned instead — and if it's whisper-only, Layer 2 returns
> `EngineNotAvailable("parakeet")` and the chain falls through to Layer 3.

---

## 7. Distinguishing how `Minutes.app` was installed

| Signal | Homebrew cask | Official DMG / in-app updater | Local source build |
|---|---|---|---|
| `Caskroom/minutes` receipt | present | absent | absent |
| `com.apple.quarantine` xattr | usually set | none (updater) / set (first DMG drag) | none |
| Code-sign authority | maintainer `Developer ID … (63TMLKT8HN)` | **maintainer Developer ID** | ad-hoc, or your `MINUTES_DEV_SIGNING_IDENTITY` |
| Bundle id | `com.useminutes.desktop` | `com.useminutes.desktop` | `.dev` if via `install-dev-app.sh` |

Cleanest single discriminator: **code-sign authority** (maintainer Developer ID ⇒ official build;
ad-hoc/your identity ⇒ local). Then use the Caskroom receipt to split cask vs DMG/updater. Note the
Homebrew **formula** (CLI) and **cask** (app) collide on the name `minutes` — always pass `--cask`
when probing the app.

---

## 8. Claim ledger {#claim-ledger}

What the two junior-agent sessions got right and wrong, after independent re-verification:

| # | Claim | Verdict |
|---|---|---|
| 1 | Updater endpoint, `latest.json`, `Minutes.app.tar.gz`, `--features parakeet,metal` at `release-macos.yml:109/122` | ✅ **True** |
| 2 | Sidecar at `Contents/MacOS/minutes`; staged by `build.rs:32`; arch suffix stripped; `bundled_cli_path` prefers `minutes` then arch-suffixed | ✅ **True** |
| 3 | `cli_setup.rs:543` symlinks `~/.local/bin/minutes`; `675f6b6` added build.rs/cli_setup.rs/entitlements/externalBin | ✅ **True** |
| 4 | Commit history `351ca48` (#117) → `2647b65` (#139); parakeet-then-metal timeline | ✅ **True** |
| 5 | Layer-2 gate `hints.is_empty()…`; resolver order; live `1→3` / batch `1→2→3` bifurcation | ✅ **True** |
| 6 | #324 placeholder; guard checks size+Mach-O but not features; v0.18.5 shipped the stub | ✅ **True** |
| 7 | "The app isn't installed here" | ❌ **False → self-corrected** (zsh glob aborted the probe; the app exists) |
| 8 | "The app cannot update a CLI it didn't install / rebuild forever" | ❌ **False as absolute → self-corrected** (bundled-sidecar track rides auto-update; true only for cargo/brew CLIs) |
| 9 | **"There is no precompiled parakeet CLI artifact anywhere"** | ❌ **False — NOT caught.** `release-cli.yml` publishes `minutes-macos-arm64` (`parakeet,metal`) + win/linux (`parakeet`) as GitHub release assets. Correct statement: no *auto-install/auto-update* channel ships one; the precompiled artifact exists for manual download. |
| 10 | ARCHITECTURE.md §2 closing sentence: Layer-2 binary "*is the same binary that ships inside the bundle as a sidecar*" | ✅ **Overstated — identified and applied.** Rewritten at `ARCHITECTURE.md:113–120` (2026-06-23) to give the full resolver order (`MINUTES_PARAKEET_HELPER` → `current_exe()` if named `minutes` → `which("minutes")`), state the sidecar is typical-not-guaranteed, and name the whisper-only → Layer-3 failure mode. |

### Related ARCHITECTURE.md refreshes (2026-06-23)

The same symlink — `~/.local/bin/minutes → bundle` written by "Set up CLI" — silently rewrites
**every** PATH-based `minutes` lookup in the system, not just the Layer-2 resolver. Two §§ that
treated it as a mere convenience were sharpened to reflect that:

- **§12 (MCP `findMinutesBinary`)** — now notes the bundle is **not probed directly**
  (`index.ts:481–492` lists `target/`, `~/.cargo/bin`, `~/.local/bin`, `/opt/homebrew`,
  `/usr/local`, then PATH); it's reached only via the `~/.local/bin/minutes` symlink after Set up
  CLI. Without that opt-in, MCP can't see the bundled CLI at all.
- **§13 (verification table)** — the CLI row now tells you to run `readlink "$(which minutes)"`
  first: if it resolves into a `.app` bundle, `minutes capabilities --json` is reporting the
  *app's* flags via the sidecar, not a standalone CLI release's.
