# Session replay: `495d4d49-740f-4650-a951-d36d008c5c34`

- **main**: `/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/495d4d49-740f-4650-a951-d36d008c5c34.jsonl`
- **cwd**: `/Users/rymalia/projects/minutes`
- **turns**: 45
- **filters**: tools=off, tool_results=off, thinking=off, sidechains=off, history=off

---

### user · 2026-06-23 06:01:24

please answer these:  

- how can we tell whether the minutes.app has been installed via homebrew or was built from code locally?
- In the tauri app, how does the in-app auto-update work regarding the parakeet feature flag? Do I need to reenable parakeet each time I run the auto-update?
- Is this a true statement: “Installing the tauri desktop app also installs the minutes cli binary"

---  
Instructions from README are listed below for reference
---  
Install instructions 

```bash
# Desktop app (menu bar, recording UI, AI assistant)
brew install --cask silverstein/tap/minutes

# CLI only (terminal recording, search, vault sync)
brew tap silverstein/tap
brew install minutes

# Or from source (requires Rust + cmake)
export CXXFLAGS="-I$(xcrun --show-sdk-path)/usr/include/c++/v1"
cargo install --path crates/cli
```
---  
Updating instructions

```bash
# macOS desktop app (Homebrew cask)
brew upgrade --cask silverstein/tap/minutes

# macOS CLI (Homebrew)
brew upgrade silverstein/tap/minutes

# From source (CLI)
git pull && cargo install --path crates/cli --features parakeet,metal

# From source (desktop app)
git pull
export CXXFLAGS="-I$(xcrun --show-sdk-path)/usr/include/c++/v1"
cargo tauri build --bundles app --features parakeet,metal
# Then replace /Applications/Minutes.app with the new build from
# target/release/bundle/macos/Minutes.app

# GitHub release (desktop app)
# Download the latest .dmg from https://github.com/silverstein/minutes/releases
# and drag Minutes.app to /Applications, replacing the old version
```
--- 

review these documents for fuller context:

@docs/session-summary-2026-03-31-codebase-deep-dive.md
@docs/session-summary-2026-03-31-first-install-investigation.md
@docs/session-summary-2026-05-21-cli-version-sync.md

@docs/ARCHITECTURE.md

---  
Based on all that context, answer these questions:
- how can we tell whether the minutes.app has been installed via homebrew or was built from code locally?
- In the tauri app, how does the in-app auto-update work regarding the parakeet feature flag? Do I need to reenable parakeet each time I run the auto-update?
- Is this a true statement: “Installing the tauri desktop app also installs the minutes cli binary"

### assistant · 2026-06-23 06:01:29

I have rich context from the docs. Let me ground a couple of the claims against this actual machine before answering.

### assistant · 2026-06-23 06:04:00

Now I have grounded evidence. Here are the answers.

## 1. How to tell if Minutes.app came from Homebrew vs. a local source build

The reliable test is **whether a Homebrew Caskroom receipt exists for it** — Homebrew leaves a fingerprint, a manual/source install does not.

```bash
# (a) Does Homebrew think it manages the app?
brew list --cask | grep -i minutes
ls -ld "$(brew --prefix)/Caskroom/minutes"          # exists ⇒ installed via cask
brew info --cask silverstein/tap/minutes            # shows "Installed" + version if cask-managed

# (b) Where did the bundle come from? Check the code signature / quarantine
codesign -dv --verbose=4 /Applications/Minutes.app 2>&1 | grep -i 'Authority\|TeamIdentifier'
xattr -p com.apple.quarantine /Applications/Minutes.app 2>/dev/null   # set ⇒ downloaded (DMG/cask); absent ⇒ local build
```

How to read it:

| Signal | Homebrew cask / DMG | Local `cargo tauri build` |
|--------|--------------------|---------------------------|
| `Caskroom/minutes` dir | **present** | absent |
| `brew list --cask` | lists `minutes` | nothing |
| `com.apple.quarantine` xattr | usually **set** (downloaded) | usually absent |
| Code-sign authority | maintainer's `Developer ID: Mathieu Silverstein (63TMLKT8HN)` | your `MINUTES_DEV_SIGNING_IDENTITY` or **ad-hoc** (`Signature=adhoc`) |

**On this machine right now:** there is *no* `/Applications/Minutes.app` and *no* `~/Applications/Minutes Dev.app`, and `brew list --cask` shows no minutes cask — so the desktop app isn't currently installed here at all. (The prior session summaries note the app was historically a **direct-DMG/GitHub-release install**, deliberately *not* the cask, so the in-app updater could manage it — see the May 21 sync summary.)

One caveat worth knowing: the Homebrew **formula** (`silverstein/tap/minutes`, the CLI) and the **cask** (the app) collide on the name `minutes`, so always disambiguate with `--cask` when probing the app. `brew <cmd> minutes` defaults to the *formula*.

## 2. Tauri auto-update and the Parakeet feature flag — do you re-enable Parakeet each update? **No.**

You do **not** need to re-enable Parakeet after an in-app update. Here's why:

- The Parakeet `parakeet` feature is a **compile-time Cargo feature baked into the `minutes-app` binary at link time** (ARCHITECTURE.md §13). It is not a runtime toggle or a setting you flip — it's either compiled in or not.
- The official builds the in-app updater pulls down are **maintainer release builds compiled with `parakeet` + `metal`**. The updater swaps in another fully-compiled, signed `minutes-app` binary that already has Parakeet baked in. So a successful in-app update lands you on another Parakeet-capable app. There's nothing to "re-enable."
- The thing that is *runtime* — and that survives updates regardless — is the **Parakeet model + `example-server`/`parakeet` binaries on disk** (downloaded via `minutes setup --parakeet`). Those live under `~/.minutes/` and aren't touched by swapping the app binary.

The one case where you'd "lose" Parakeet is **not** auto-update — it's if you **build the app yourself from source and forget the feature flag**. A bare `cargo tauri build --bundles app` produces a whisper-only app; you must pass `TAURI_FEATURES="parakeet"` (or `--features parakeet,metal`). The CLI having Parakeet does **not** give the app Parakeet — features are per-binary.

Verify after any update: **app → Settings → Transcription → `parakeet_compiled`** (true means it's baked in). There is no `capabilities` subcommand on the app binary itself.

## 3. "Installing the Tauri desktop app also installs the minutes CLI binary" — **Partly true, with an important caveat.**

The two are **separate installs on separate update channels** (ARCHITECTURE.md §4, May 21 summary). The app does *not* install a CLI onto your `PATH` for you the way `brew install minutes` does. But the app **bundles its own copy of the CLI internally** and can offer to symlink it.

- The Tauri app ships `cli_setup.rs`, which **bundles/symlinks the CLI on macOS** — so the app carries a `minutes` binary inside its bundle and can wire it up. That's an opt-in convenience, not an automatic system-wide PATH install.
- The canonical CLI install paths are independent: `brew install silverstein/tap/minutes` (→ `/opt/homebrew/bin/minutes` symlinked into `Cellar/`), or a source build to `~/.local/bin/minutes` / `~/.cargo/bin/minutes`.
- Crucially, **the app cannot update a CLI it didn't install.** The app's own version screen says: *"The minutes on your PATH is not managed by this app. Reinstall or update it however you originally installed."* After an in-app app update, the CLI lags until you `brew upgrade minutes` (or rebuild) yourself.

**On this machine** the CLI on PATH is `~/.local/bin/minutes` — a real 32 MB file dated Jun 15 (a source build that was `cp`'d in, *not* a Homebrew symlink and *not* the app's bundled symlink), plus a second copy at `~/.cargo/bin/minutes`. So here the CLI was clearly installed independently of any app.

**Verdict:** As written, the statement is **misleading/false as an absolute**. Accurate version: *"The desktop app bundles a copy of the CLI and can symlink it for you, but the CLI is a separate install on a separate update channel — installing or updating the app does not install or update the `minutes` binary on your PATH."*

### user · 2026-06-23 06:27:41

<bash-input>ls -la /Applications</bash-input>

### user · 2026-06-23 06:27:41

<bash-stdout>total 56
drwxrwxr-x  47 root     admin   1504 Jun 20 23:48 .
drwxr-xr-x  22 root     wheel    704 Apr 30 12:33 ..
-rw-r--r--@  1 rymalia  admin  26628 Jun 22 23:04 .DS_Store
-rw-r--r--   1 root     wheel      0 Apr 30 12:33 .localized
drwxr-xr-x@  3 rymalia  staff     96 May 19 21:22 Antigravity.app
drwxr-xr-x@  3 rymalia  admin     96 Dec 11  2025 Audacity.app
drwxr-xr-x@  3 rymalia  staff     96 Feb 21 10:16 Base.app
drwxrwxr-x@  3 root     wheel     96 Feb 20 12:25 BBEdit.app
drwxr-xr-x@  4 root     wheel    128 Feb 20 12:24 bitchat.app
drwxr-xr-x@  3 root     wheel     96 Feb 20 12:25 Canva.app
drwxr-xr-x@  3 root     wheel     96 Mar 23 16:18 CapCut.app
drwxr-xr-x@  3 rymalia  admin     96 Sep 20  2025 Charles.app
drwxr-xr-x@  3 rymalia  staff     96 Feb 19 09:59 Chat2MD.app
drwxr-xr-x@  3 rymalia  staff     96 May  9 00:13 Claude.app
drwxr-xr-x@  3 rymalia  admin     96 May 29 14:44 Codex.app
drwxr-xr-x@  3 rymalia  admin     96 Jun 20 20:52 CodexBar.app
drwxr-xr-x@  3 rymalia  staff     96 Oct 15  2024 DB Browser for SQLite.app
drwxr-xr-x@  3 root     wheel     96 Dec  7  2025 Developer.app
drwxr-xr-x@  3 rymalia  admin     96 Feb 27 03:43 Docker.app
drwxr-xr-x@  3 rymalia  staff     96 Feb  5 21:13 Figma.app
drwxr-xr-x@  3 rymalia  admin     96 Apr  2 01:36 FluidVoice.app
drwxr-xr-x@  3 rymalia  staff     96 Mar 13 09:08 Ghostty.app
drwxrwxr-x@  3 rymalia  admin     96 Nov 19  2025 Google Chrome.app
drwxr-xr-x@  3 root     wheel     96 Dec  7  2025 GoPro Quik.app
drwxr-xr-x@  3 root     wheel     96 Apr 26 15:17 Home Assistant.app
drwxr-xr-x@  3 root     wheel     96 Apr 26 15:17 Jayson.app
drwxr-xr-x@  3 rymalia  staff     96 Jan 16 16:47 LM Studio.app
drwxr-xr-x@  3 rymalia  staff     96 Apr 18 00:44 MacDown 3000.app
drwxr-xr-x@  3 rymalia  staff     96 Dec  4  2025 MacWhisper.app
drwxr-xr-x@  3 rymalia  staff     96 Jun  4 01:21 Minutes.app
drwxr-xr-x@  3 rymalia  admin     96 Jun 25  2025 Nutshell.app
drwxr-xr-x@  3 rymalia  admin     96 Dec 13  2025 OBS.app
drwxr-xr-x@  3 rymalia  admin     96 Nov 25  2025 Obsidian.app
drwxr-xr-x@  3 root     wheel     96 Apr  2 11:10 Okta Verify.app
drwxr-xr-x@  3 rymalia  admin     96 Nov 21  2025 Raspberry Pi Imager.app
lrwxr-xr-x@  1 root     wheel     54 Apr 30 12:33 Safari.app -&gt; ../System/Cryptexes/App/System/Applications/Safari.app
drwxr-xr-x@  3 root     wheel     96 Apr 18 11:31 Slack.app
drwxr-xr-x@  3 rymalia  staff     96 Jun 14 17:33 Spotify.app
drwxr-xr-x@  3 root     wheel     96 Mar 23 16:19 Swift Playground.app
drwxr-xr-x@  3 root     wheel     96 Jan 13 17:35 TestFlight.app
drwxr-xr-x   3 root     wheel     96 Apr 30 12:33 Utilities
drwxr-xr-x@  3 rymalia  staff     96 May 21 06:36 Visual Studio Code.app
drwxr-xr-x@  3 rymalia  admin     96 Jun  5 16:17 VLC.app
drwxr-xr-x@  3 root     wheel     96 Apr 18 11:31 WhatsApp.app
drwxr-xr-x@  3 rymalia  staff     96 Dec 22  2025 Wispr Flow.app
drwxr-xr-x@  3 root     wheel     96 Apr 18 12:02 Xcode.app
drwxr-xr-x@  3 root     admin     96 Mar 16 01:11 zoom.us.app</bash-stdout><bash-stderr></bash-stderr>

### assistant · 2026-06-23 06:27:47

`/Applications/Minutes.app` **does** exist (dated Jun 4) — my earlier combined check got aborted by a zsh glob failure on the `~/Applications/*Minutes*` pattern, so that section printed nothing. Let me actually probe its provenance now.

### user · 2026-06-23 06:46:44

<bash-input>ls -la /Applications/Minutes.app</bash-input>

### user · 2026-06-23 06:46:44

<bash-stdout>total 0
drwxr-xr-x@  3 rymalia  staff    96 Jun  4 01:21 .
drwxrwxr-x  47 root     admin  1504 Jun 20 23:48 ..
drwxr-xr-x   7 rymalia  staff   224 Jun  4 01:21 Contents</bash-stdout><bash-stderr></bash-stderr>

### assistant · 2026-06-23 06:46:47

Let me run the provenance probe on that actual bundle.

### assistant · 2026-06-23 06:47:25

Now it's definitive. Here's what this machine's `/Applications/Minutes.app` actually is — and it sharpens the answer to your first question.

## Provenance verdict for `/Applications/Minutes.app` (v0.18.5)

| Signal | Result | Means |
|--------|--------|-------|
| `brew list --cask` / `Caskroom/minutes` | **absent** | Not a Homebrew cask install |
| `com.apple.quarantine` xattr | **none** | Not a freshly-dragged DMG (updater-written bundles aren't quarantined) |
| Code-sign authority | `Developer ID Application: Mathieu Silverstein (63TMLKT8HN)`, Apple-notarized chain | **Maintainer's official signed release** — not ad-hoc, not your dev identity |
| Bundle id | `com.useminutes.desktop` | **Production** identity (not `.dev`) |

**Conclusion: this is the official maintainer-signed GitHub-release/DMG build, kept current by the in-app Tauri updater — not Homebrew, and not a local `cargo tauri build`.** This matches the May 21 session note exactly: the app was deliberately the direct-DMG install (not the cask) so the in-app updater can manage it.

I was wrong earlier when I said the app "isn't installed here" — that was an artifact of my first command: the zsh glob `~/Applications/*Minutes*` threw `no matches found`, which aborted the whole compound command before the `/Applications/Minutes.app` check ever ran. Apologies for that.

## How this refines the three signals for "Homebrew vs. local build"

The signature + caskroom test cleanly separates **all three** origins:

| Origin | Caskroom receipt | Quarantine xattr | Code-sign authority | Bundle id |
|--------|:---:|:---:|---|---|
| **Homebrew cask** | present | usually set | maintainer Developer ID | `com.useminutes.desktop` |
| **Official DMG / in-app updater** ← *this machine* | absent | none (updater) or set (first DMG drag) | **maintainer Developer ID** | `com.useminutes.desktop` |
| **Local source build** | absent | none | ad-hoc, or your `MINUTES_DEV_SIGNING_IDENTITY` | `.dev` if via `install-dev-app.sh` |

So the cleanest single discriminator is **the code-signing authority**: maintainer `Developer ID … (63TMLKT8HN)` ⇒ an official build (cask or release); ad-hoc/your-own identity ⇒ local source build. Then use the **Caskroom receipt** to split cask vs. DMG/updater among the official ones.

One note for sync awareness: the app on disk is **0.18.5**, while the repo/ARCHITECTURE baseline is **0.18.14** — so this installed app is several releases behind the source tree, and (per the two-channel rule) the CLI at `~/.local/bin/minutes` is its own separate 0.18.x build that won't move when the app updates.

### user · 2026-06-23 06:53:21

You stated "Crucially, the app cannot update a CLI it didn't install." -- and my understanding, according to the instructions in `docs/PARAKEET.md`, is that the only way to enable parakeet features in the cli is to manually build it:
```
cargo build --release -p minutes-cli --features parakeet
```

So does that mean that once I enable parakeet feature in the cli that the auto-update process can never keep them in sync? And will I need to continue manually updating the cli each time I auto-update the tauri app?

### user · 2026-06-23 06:54:53

You stated "Crucially, the app cannot update a CLI it didn't install." -- and my understanding, according to the instructions in `docs/PARAKEET.md`, is that the only way to enable parakeet features in the cli is to manually build it:
```
cargo build --release -p minutes-cli --features parakeet
```

So does that mean that once I enable parakeet feature in the cli that the auto-update process can never keep them in sync? And will I need to continue manually updating the cli each time I auto-update the tauri app?

### user · 2026-06-23 06:55:36

_(invoked /exit)_

### assistant · 2026-06-23 06:55:44

No response requested.

### user · 2026-06-23 06:56:45

I am confused about how the tauri app and cli are to stay in sync once the user enables parakeet.

You stated "Crucially, the app cannot update a CLI it didn't install." -- and my understanding, according to the instructions in `docs/PARAKEET.md`, is that the only way to enable parakeet features in the cli is to manually build it:
```
cargo build --release -p minutes-cli --features parakeet
```

So does that mean that once I enable parakeet feature in the cli that the auto-update process can never keep them in sync? And will I need to continue manually updating the cli each time I auto-update the tauri app?

### assistant · 2026-06-23 06:56:54

Let me ground this in the actual PARAKEET.md instructions and the CLI's parakeet story before answering.

### user · 2026-06-23 06:58:44

_(invoked /reload-plugins)_

### user · 2026-06-23 06:59:31

_(invoked /plugin)_

### user · 2026-06-23 07:08:19

_(invoked /reload-plugins)_

### assistant · 2026-06-23 07:09:11

No response requested.

### user · 2026-06-23 07:09:56

I am confused about how the tauri app and cli are to stay in sync once the user enables parakeet.

You stated "Crucially, the app cannot update a CLI it didn't install." -- and my understanding, according to the instructions in `docs/PARAKEET.md`, is that the only way to enable parakeet features in the cli is to manually build it:
```
cargo build --release -p minutes-cli --features parakeet
```

So does that mean that once I enable parakeet feature in the cli that the auto-update process can never keep them in sync? And will I need to continue manually updating the cli each time I auto-update the tauri app?

### user · 2026-06-23 07:10:31

why are we repeatedly getting an API Error??

### user · 2026-06-23 07:13:46

_(invoked /exit)_

### assistant · 2026-06-23 07:25:33

No response requested.

### user · 2026-06-23 07:25:45

I am confused about how the tauri app and cli are to stay in sync once the user enables parakeet.

You stated "Crucially, the app cannot update a CLI it didn't install." -- and my understanding, according to the instructions in `docs/PARAKEET.md`, is that the only way to enable parakeet features in the cli is to manually build it:
```
cargo build --release -p minutes-cli --features parakeet
```

So does that mean that once I enable parakeet feature in the cli that the auto-update process can never keep them in sync? And will I need to continue manually updating the cli each time I auto-update the tauri app?

### assistant · 2026-06-23 07:26:59

Short answer: **yes — once you go down the source-built parakeet CLI path, every in-app update drops the CLI back out of sync, and there is no auto-update path that fixes it for you. You have to rebuild.** But the picture is less grim than "this is permanently broken" — most of the time strict version-matching doesn't matter, and the rebuild collapses to one command. Here's the grounded version:

## Why no auto-update path exists for a parakeet CLI

Both channels that *can* update the CLI ship a **whisper-only** binary by design:

- **Homebrew formula** (`silverstein/tap/minutes`) — `brew info` lists exactly the formula source-build (`cargo install --path crates/cli`), no `--features parakeet`. The May 21 summary explicitly calls this out: *"The formula builds whisper-only — no `--features parakeet`. This is fine and expected: Parakeet transcription runs through `/Applications/Minutes.app`."* So `brew upgrade minutes` will keep producing a whisper-only CLI even on the latest release.
- **The Tauri in-app updater** — swaps the `minutes-app` binary only. It never touches `/opt/homebrew/bin/minutes`, `~/.local/bin/minutes`, or `~/.cargo/bin/minutes`. The app even tells you so on its version screen ("COMMAND-LINE TOOL … not managed by this app").

`docs/PARAKEET.md:131-133` and `:530-540` are the only documented way to get parakeet into the CLI: `cargo build --release -p minutes-cli --features parakeet` (or `cargo install --path crates/cli --features parakeet`). There is no precompiled parakeet CLI artifact anywhere.

So your conclusion is correct as stated: **after enabling parakeet on the CLI, the only "update mechanism" for it is you, running cargo, after every release you care about.**

## How bad is the drift in practice?

It's less bad than it sounds, because the CLI and app coordinate through stable filesystem contracts (`~/.minutes/` PID files, `events.jsonl`, `jobs/`, `desktop-control/`) — not a versioned RPC. The MCP server's feature-detection layer rejects only `api_version > 1` (ARCH §12); within v1 they tolerate normal drift.

What actually depends on a **parakeet-compiled** CLI:

| Surface | Needs parakeet on the CLI? | Notes |
|---|---|---|
| `minutes process <file>` with parakeet engine | **Yes** | Without the feature, dispatch returns `EngineNotAvailable("parakeet")` and you fall back to whisper |
| Layer 2 of the app's Parakeet fallback chain — `minutes parakeet-helper` | **Yes** | The app's `transcribe_with_parakeet` chain spawns the CLI as a crash-isolated middle layer. If the CLI is whisper-only, Layer 2 errors and the chain skips to Layer 3 (direct `parakeet` binary). Layer 3 still works; you just lose one crash-isolation tier. |
| App's Layer 1 (in-process warm sidecar) and Layer 3 (direct `parakeet` binary) | **No** | Both bypass the CLI entirely — they only care that the `parakeet`/`example-server` binaries on PATH and the `.nemo` model are present |
| All non-transcribing CLI commands — `search`, `get`, `list`, `watch`, `note`, `health`, `capabilities`, `setup --parakeet` (which only installs VAD weights + helper, not the feature), MCP shell-outs | **No** | These run identically on a whisper-only build |

In other words: if your transcription happens **inside the app** (the common case), and you only use the CLI for search/setup/MCP, **a stale whisper-only CLI from `brew upgrade` is fine indefinitely** — you just lose the option of `minutes process --engine parakeet` from the terminal and the Layer-2 helper for the app.

## The practical loop

If you genuinely want a parakeet CLI in sync with the auto-updated app, accept that the loop is manual but compact. After each in-app update:

```bash
cd ~/projects/minutes && git fetch --tags && git checkout v$(defaults read /Applications/Minutes.app/Contents/Info CFBundleShortVersionString) \
  && export CXXFLAGS="-I$(xcrun --show-sdk-path)/usr/include/c++/v1" \
  && cargo install --path crates/cli --features parakeet,metal
minutes --version   # should now match the app
```

A few notes on that workflow:

- You don't have to be on the *exact* matching tag — anything within `api_version = 1` works. Rebuilding once every few releases (or only when something breaks) is a reasonable cadence.
- `cargo install` writes to `~/.cargo/bin/minutes`. If your PATH currently prefers `~/.local/bin/minutes` or the Homebrew symlink, you also need to overwrite the right one (`which minutes` first). The repo's own pattern is: `cp target/release/minutes ~/.local/bin/minutes` after `rm -f ~/.local/bin/minutes` — never `cp` over a live binary (signature invalidates → SIGKILL).
- If you previously had the Homebrew formula installed, uninstall it (`brew uninstall minutes`) or it'll fight your source build for PATH order — the May 21 summary covered this.
- The compile is the source-build cost — about a minute, same as the brew formula since it's also source.

## So, to your two direct questions

1. *"Does that mean once I enable parakeet in the CLI, auto-update can never keep them in sync?"* — **Correct.** No auto-update path produces a parakeet CLI. Auto-update only ever bumps the app.
2. *"Will I need to continue manually updating the CLI each time I auto-update the tauri app?"* — **Only if you want a parakeet-capable CLI on your PATH at the matching version.** For most workflows you don't actually need that — the app does its own in-process parakeet — so you can let the CLI drift (or sit on the whisper-only `brew upgrade` track) and only rebuild when you specifically want CLI parakeet back.

### user · 2026-06-23 07:33:43

Compare your response to this response and then do further investigation into the actual codebase to ground your synthesized assessment of this situation:

**Tauri auto-update artifact**

In this repo, the updater is configured to check:

```text
https://github.com/silverstein/minutes/releases/latest/download/latest.json
```

That `latest.json` is a small manifest saying roughly: latest version, download URL, release notes, and signature. The actual “app artifact” is the packaged desktop app bundle uploaded to the GitHub release, specifically `Minutes.app.tar.gz` for the in-app updater. The updater downloads that signed app archive, verifies the signature, installs it over the current app, then restarts.

So “whether the artifact was built with parakeet” means: when CI built the `Minutes.app.tar.gz`, did it run `cargo tauri build --features parakeet,metal` or not?

For the current repo workflow, yes: `.github/workflows/release-macos.yml` builds both the bundled CLI and the macOS Tauri app with:

```bash
--features parakeet,metal
```

So official macOS in-app update artifacts should currently include Parakeet support. You do not need to re-enable Parakeet after each auto-update. Your config persists; the only thing that could break that would be a future release artifact built without the feature.

**“Sidecar”**

In this context, a sidecar is an extra executable shipped inside the `.app` bundle alongside the main desktop app executable.

Here, the main app is the Tauri desktop binary. The bundled CLI sidecar is another binary named `minutes` inside:

```text
Minutes.app/Contents/MacOS/minutes
```

The app can create/update:

```text
~/.local/bin/minutes -> /Applications/Minutes.app/Contents/MacOS/minutes
```

That gives you a `minutes` CLI on your shell `PATH`, but it is backed by the app bundle. When the app auto-updates, that bundled CLI updates too because the whole app bundle was replaced. This is different from installing the standalone Homebrew CLI formula.

### assistant · 2026-06-23 07:33:51

That's a substantial claim — if true, it inverts my answer. Let me verify each piece against the actual repo and the installed app bundle.

### assistant · 2026-06-23 07:34:11

The bundle has a `minutes` file at 52 bytes — that's not a CLI binary; it's a shim. Let me see what it actually is, and also check whether the app installs a system-wide CLI.

### assistant · 2026-06-23 07:54:07

Two critical findings already. Let me dig into the release workflow timeline and the bundling mechanism.

### assistant · 2026-06-23 07:55:15

I was wrong, and the other response is closer to the truth. Let me lay out what the codebase actually says, and what's special about *this* machine.

## What the codebase actually does

1. **Updater endpoint** (`tauri/src-tauri/tauri.conf.json:43`) — confirmed exactly as the other response states: `https://github.com/silverstein/minutes/releases/latest/download/latest.json`. The signing pubkey is right next to it; the updater verifies before swapping.

2. **Release workflow builds with parakeet** — `.github/workflows/release-macos.yml:109` builds the CLI with `--features parakeet,metal`, and `:122` builds the Tauri app with `--features parakeet,metal --bundles app`. `git log` shows commit `351ca48` titled *"fix: enable parakeet feature in release workflows (closes #117)"* — so since that commit, every official release artifact ships with Parakeet baked in.

3. **The app does bundle a CLI sidecar** — `tauri/src-tauri/src/cli_setup.rs` is exactly the "Set up CLI" flow:
   - `bundled_cli_path()` (`:96`) finds the sidecar binary in `Contents/MacOS/` (prefers `minutes`, falls back to `minutes-aarch64-apple-darwin`).
   - `create_or_update_symlink()` (`:543`) creates `~/.local/bin/minutes` as a **symlink** into the bundle.
   - When the in-app updater replaces the bundle, the sidecar swap is automatic — the symlink keeps pointing at `/Applications/Minutes.app/Contents/MacOS/minutes`, which is now the new release's CLI.

4. **The release workflow even guards against the placeholder bug** — `release-macos.yml:124-134` is a post-build step that asserts the bundled CLI is a real Mach-O ≥ some threshold, not the tiny shell-script stub. The comment references issue #324, which is exactly the "we shipped a placeholder instead of the CLI" bug.

So the architecture is: **the in-app updater really does keep a parakeet-capable CLI in sync — *provided* your `~/.local/bin/minutes` is the symlink it created.** My absolute "the app cannot update a CLI it didn't install" was wrong; it's correct only for CLIs the app didn't install (Homebrew formula, hand-built `cargo install`).

## What's special about *this* machine

This is where the other response missed something the data shows:

```
/Applications/Minutes.app/Contents/MacOS/minutes  →  52 bytes
  #!/bin/sh
  echo 'minutes CLI placeholder' >&2
  exit 1
```

Your installed app (**v0.18.5, built Jun 2**) shipped with the **placeholder stub**, not a real CLI sidecar. This is the exact #324 bug the guard step in `release-macos.yml` was added to prevent — meaning that guard was probably added *after* v0.18.5. So on this machine, even if you re-ran "Set up CLI" right now, the symlink would point at a script that just errors out.

And separately:

```
~/.local/bin/minutes  →  32 MB regular file, Jun 15 03:11   (NOT a symlink)
~/.cargo/bin/minutes  →  33 MB regular file, Jun 4 23:41    (NOT a symlink)
```

Your PATH CLI is a **hand-built `cargo install`**, not the app's symlink. So you're in the "manual rebuild forever" world I described — but only because you *built it yourself*, not because there's no other option.

## So, corrected answer to your question

The sync story depends on which path you choose. Three real options:

| Approach | How parakeet gets to the CLI | What auto-update does | Manual work per update |
|---|---|---|---|
| **App's bundled sidecar** (`~/.local/bin/minutes` is a symlink into `Minutes.app/Contents/MacOS/minutes`) | Comes baked into the release `.app.tar.gz` (CI builds with `--features parakeet,metal`) | Swaps the whole bundle → sidecar swaps with it → your symlink now points at the new parakeet CLI | **None** |
| **Hand-built source CLI** (your current state) | You built it with `--features parakeet` | Doesn't touch your file at all | Re-run `cargo install --path crates/cli --features parakeet,metal` after each app update |
| **Homebrew formula** (`brew upgrade silverstein/tap/minutes`) | Whisper-only; formula doesn't enable parakeet | Independent channel | Re-run `brew upgrade minutes`; still no parakeet |

So **no, you do not have to re-enable parakeet each time the app auto-updates** — *if* you switch to the bundled-sidecar model. The recipe is:

1. **Upgrade past v0.18.5 first** (the placeholder is broken on v0.18.5; you need a release built with the post-`351ca48` workflow + the `#324` guard active). Use the in-app updater, or download the latest DMG.
2. After updating, verify the sidecar is real:
   ```bash
   file /Applications/Minutes.app/Contents/MacOS/minutes
   # want: "Mach-O 64-bit executable arm64"  — not "shell script text executable"
   ```
3. Remove your hand-built CLIs so the app's symlink wins on PATH:
   ```bash
   rm -f ~/.local/bin/minutes ~/.cargo/bin/minutes
   ```
4. In the app, run **Settings → Set up CLI** (which calls `cli_setup.rs`). It will create `~/.local/bin/minutes` → `…/Minutes.app/Contents/MacOS/minutes`.
5. Confirm:
   ```bash
   ls -la "$(which minutes)"          # should be a symlink into /Applications/Minutes.app
   minutes capabilities --json | jq .features.parakeet   # true
   ```

From that point on, the in-app updater handles both the app *and* the CLI on your PATH in a single update step. You only fall back to the manual-rebuild path if you specifically want to test an unreleased commit, or if you choose to live on a Homebrew CLI install.

One concession to the other response: I was also wrong to frame this as "two independent channels, always manual" — that's the *Homebrew formula* story (and it's still true *for* the Homebrew formula). The bundled-sidecar story is the third channel, and it does ride the app's auto-update for free.

### user · 2026-06-23 07:57:05

Also look at the maintainer's commit: `675f6b63a5498de8e331ccc4658ad65b833de3a7`
and this:
---  
All claims validate against the codebase. Summary:

| Claim                                                              | Verdict | Evidence                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Updater endpoint is `releases/latest/download/latest.json`         | ✅      | `tauri/src-tauri/tauri.conf.json:43`                                                                                                                                                                                                                                                                                 |
| `latest.json` = manifest with version/url/signature/notes          | ✅      | `release-macos.yml:172-204` (Python block builds it with `version`, `notes`, `pub_date`, `platforms.darwin-aarch64.signature/url`)                                                                                                                                                                                   |
| Actual artifact is `Minutes.app.tar.gz`                            | ✅      | `release-macos.yml:183` sets `URL=…/Minutes.app.tar.gz`; uploaded at `:213-215` alongside `.sig` and `latest.json`                                                                                                                                                                                                   |
| CI builds CLI and app with `--features parakeet,metal`             | ✅      | `release-macos.yml:109` (`cargo build --release -p minutes-cli --features parakeet,metal`) and `:122` (`cargo tauri build --features parakeet,metal --bundles app`)                                                                                                                                                  |
| Bundled CLI sidecar at `Minutes.app/Contents/MacOS/minutes`        | ✅      | `tauri.macos.conf.json` declares `externalBin: ["bin/minutes", ...]`; `build.rs:32-110` stages `bin/minutes-<target>` from `target/release/minutes`; Tauri's bundler strips the arch suffix → `Contents/MacOS/minutes`. CI also verifies it's ≥10 MB and Mach-O (`release-macos.yml:124-135`, guard for issue #324). |
| Symlink `~/.local/bin/minutes → bundle's CLI` updates with the app | ✅      | Commit `675f6b6` ("feat(app): bundle CLI inside Minutes.app for auto-update", May 4 2026) implements `cli_setup.rs` per `docs/PLAN-bundle-cli-in-app.md`. Symlink target is inside the bundle, so in-place app replacement re-points it automatically.                                                               |

One detail the plan got wrong and the commit corrected: PLAN §1 expected the sidecar to ship as `minutes-aarch64-apple-darwin` inside the bundle, but Tauri's bundler strips the arch suffix at install time. The shipped filename is plain `minutes`; `bundled_cli_path()` checks that name first and falls back to the arch-suffixed name (commit message, "Plan deviation worth flagging").

So the user's two claims are accurate as written for the current `main` workflow. The only ongoing risk they flagged ("a future release artifact built without the feature") is real but currently mitigated — both `--features parakeet,metal` lines are explicit in YAML, not derived from a default, so removing parakeet would require a deliberate edit.

### assistant · 2026-06-23 07:58:17

Confirmed — every cell in that validation table holds, and commit `675f6b6` (May 4, 2026) is exactly the work that makes the bundled-sidecar auto-update story true. The commit message itself flags the same nuance (`tauri/src-tauri/bin/minutes-aarch64-apple-darwin` → `Contents/MacOS/minutes` after Tauri strips the suffix), and `cli_setup.rs:96` codifies it: prefer `minutes`, fall back to the arch-suffixed name. Other corroborating details I checked:

- **`tauri.macos.conf.json:7`** — `externalBin: ["bin/minutes", …]` is the platform-specific override; the base `tauri.conf.json` doesn't even mention `externalBin`, which is why my earlier grep on that file came up empty.
- **`build.rs:32-110`** — `stage_minutes_cli_sidecar()` copies `target/release/minutes` to `bin/minutes-<target>` before `cargo tauri build`, and if the CLI isn't built yet it emits `cargo:warning=No minutes CLI release binary found; writing placeholder sidecar`. So the 52-byte stub on this machine's v0.18.5 install is literally that fallback path — the release was cut before `target/release/minutes` was built (or before the issue-#324 guard at `release-macos.yml:124-134` was added).
- **Sidecar entitlements** — the commit also adds `tauri/src-tauri/minutes-cli.entitlements` granting `com.apple.security.device.audio-input`, with `install-dev-app.sh` re-signing the sidecar after the outer `--deep` sign clobbers nested entitlements. So the bundled CLI is independently signed for mic access, not just a hitchhiker.

## Final synthesis

I'll restate the corrected picture in one place so it stands cleanly.

**On `main` today, the architecture genuinely is: one auto-update, both binaries.**

| Question | Verdict |
|---|---|
| Does the Tauri auto-updater include the CLI? | **Yes**, via the bundled sidecar at `Contents/MacOS/minutes`. The updater swaps the whole `.app.tar.gz`; the sidecar swaps with it; the `~/.local/bin/minutes` symlink keeps resolving. |
| Is the official release artifact built with parakeet? | **Yes** — `release-macos.yml:109` (CLI) and `:122` (app) both pass `--features parakeet,metal`. Explicit YAML, not derived from a default, so it can't silently regress. |
| Do I need to re-enable parakeet after each in-app update? | **No**, provided you're using the bundled-sidecar CLI on PATH. |
| Do I need to manually rebuild the CLI after each in-app update? | **Only** if your `~/.local/bin/minutes` is your own `cargo install` artifact (your current state), or you use the Homebrew formula (whisper-only). For the bundled-sidecar path, no. |

**What's specific to this machine, that the table glosses over:**

1. **Your installed v0.18.5 shipped the placeholder stub** in its `Contents/MacOS/minutes`. That's #324 — a real shipped regression caught later by the size/Mach-O guard at `release-macos.yml:124-134`. So even though the architecture works, *this specific release artifact* is broken for the bundled-CLI path.
2. **Your `~/.local/bin/minutes` is a 32 MB regular file**, not a symlink — your own `cargo install` overwrites whatever the app's "Set up CLI" would have created. So you're not on the auto-updated track right now even if v0.18.5 were healthy.

**Concrete recipe to get onto the auto-updated track:**

```bash
# 1. Upgrade past v0.18.5 — use the in-app updater or grab the latest DMG.
#    Then verify the sidecar is real, not the placeholder:
file /Applications/Minutes.app/Contents/MacOS/minutes
# want: "Mach-O 64-bit executable arm64", >10 MB

# 2. Remove your hand-built CLIs so the bundle's symlink wins on PATH:
rm -f ~/.local/bin/minutes ~/.cargo/bin/minutes

# 3. In the app: Settings → About → "Set up CLI" (calls cli_setup.rs).
#    Or run the equivalent command if you've got one wired.

# 4. Confirm:
ls -la "$(which minutes)"   # should be a symlink into /Applications/Minutes.app
minutes capabilities --json | jq .features.parakeet   # true
```

After that, every in-app update brings a fresh parakeet-capable CLI with it, and you never run `cargo` again unless you want to test pre-release code.

**One residual caveat that remains real even with all the above:**

Per the table's last note, "a future release artifact built without the feature" is the only remaining drift risk. It's currently low because `--features parakeet,metal` is an explicit literal in the workflow YAML — but if it were ever removed or made conditional (say, behind a matrix flag that flips off for one release), the bundled sidecar in that release would silently drop parakeet, and your config-persisted `engine = "parakeet"` would start returning `EngineNotAvailable` until either the next release re-added the flag or you fell back to a manual build. The `release-macos.yml:124-134` guard catches the placeholder case but **does not** verify feature flags; it only checks size + Mach-O. So that specific risk isn't gated by anything in CI today — worth being aware of, not worth designing around.

And I owe you the direct correction: my earlier "the app cannot update a CLI it didn't install, you'll have to rebuild forever" was wrong as a general claim. It's true only for CLIs the app didn't install (Homebrew formula, hand-built `cargo install` — the path you happen to be on). The bundled-sidecar path the maintainer landed in `675f6b6` is the third option, and it does ride the app's auto-update.

### user · 2026-06-23 08:11:34

_(invoked /copy)_

### user · 2026-06-23 08:21:42

Two small confirmations worth flagging:

- The CI guard at `release-macos.yml:124-135` only checks the sidecar is `>10 MB` + `Mach-O`. You're right that it doesn't validate features. A one-line `./Minutes.app/Contents/MacOS/minutes capabilities --json | jq -e .features.parakeet` after the existing size check would close that gap cheaply if/when it ever feels worth it — but as you said, the YAML flag is explicit and won't drift silently.
- The `cli_setup.rs:96` fallback (prefer `minutes`, then arch-suffixed) is forward-compat insurance against a future Tauri bundler change that *stops* stripping the suffix. Today only the unsuffixed name resolves; tomorrow either works.

Nothing else to add — the recipe is correct as written.
---
One refinement: at the time of 351ca48, the macOS line was just --features parakeet. The ,metal was added two commits later in 2647b65 ("build(macos): enable Metal in release binaries for 2× faster large-v3", PR #139). So:

- Apr 13 (351ca48) → present: macOS releases ship Parakeet
- PR #139 (2647b65) → present: macOS releases also ship Metal acceleration

Both flags are still present at release-macos.yml:109 (CLI) and :122 (Tauri app) on current main. The user's framing is accurate; just note that "parakeet+metal together" is the post-#139 state, not the post-#117 state.

### assistant · 2026-06-23 08:21:54

Acknowledged — both refinements land cleanly.

- **Feature-flag verification in CI.** Agreed, that's the cheap close. The size + Mach-O check is structural, not semantic; adding a single `… capabilities --json | jq -e .features.parakeet` (and `.metal`, while you're there) right after the size assertion would turn the placeholder guard into a real "shipped what we said we'd ship" guard. Low cost, no extra dependencies (jq's already on the runner). Worth filing as a small follow-up issue rather than acting on now.
- **`cli_setup.rs:96` is forward-compat, not currently-used.** Right — today only the unsuffixed `minutes` resolves in a packaged bundle. Worth keeping that read of the fallback so nobody later "simplifies" it out under the misimpression that it's dead code.
- **Timeline split #117 → #139.** Good correction. So the precise history is:
  - `351ca48` (PR #117, Apr 13) — adds `--features parakeet` to macOS release workflows.
  - `2647b65` (PR #139) — adds `,metal` for the 2× large-v3 speedup.
  - Current `main` — both flags together at `release-macos.yml:109` (CLI) and `:122` (app).

So the "post-#117" period was Parakeet-only releases; the "parakeet+metal together" framing is strictly the post-#139 state. Anything earlier than #139 in your install timeline would be a Parakeet-capable but Metal-free CLI in the bundle. Doesn't change the user-facing recipe, but it's the right way to describe the history.

### user · 2026-06-23 08:27:46

Based on what we've uncovered in this session, do you see any factual discrepancies in `docs/ARCHITECTURE.md` or any glaring ommissions?

Here's my take:
two real issues, both stemming from `675f6b6` (May 4) not being reflected in the doc despite the doc's assessed version (`0.18.14`) being well after that commit.

**1. §4 Versioning — "separate channels" is now incomplete (stale claim).**

> "Across install moments → Yes. The installed CLI and app update through *separate channels* (the app via its in-app updater/DMG; the CLI via `cp`/`cargo install`/`brew`), so the artifacts on disk drift. … After an in-app update, re-sync the CLI separately (e.g. `brew upgrade minutes`)."

That's true for the brew/cargo path but no longer the whole picture. There's a third channel now: the bundled sidecar at `Minutes.app/Contents/MacOS/minutes`, plumbed by `cli_setup.rs` via a `~/.local/bin/minutes` symlink into the bundle. On that track the CLI updates *with* the app — no re-sync needed. The "drift is inevitable" framing should be qualified: drift happens unless you're on the bundled-sidecar track.

**2. §3 Build → link → run — diagram omits the second binary in the bundle.**

The diagram's INSTALL column shows the bundle containing only `Contents/MacOS/minutes-app`. As of `675f6b6`, every signed bundle also ships `Contents/MacOS/minutes` (the CLI as a Tauri `externalBin` sidecar, declared in `tauri.macos.conf.json:3-8`, staged by `build.rs:32`). That's why the in-app updater story works at all. The diagram and the "single in source, replicated in the binaries" paragraph should acknowledge that the macOS app bundle contains *two* statically-linked-against-core Rust binaries, not one.

**Smaller things, probably not worth fixing:**

- §2's "The **only** time the app executes the `minutes` binary is a 1-second `--version` probe in `cli_setup.rs`" — still true, but slightly undersells what `cli_setup.rs` does (symlink management, multi-bundle picker, snooze state, shell-PATH writing). The file map at §14 captures it tersely; the prose in §2 reads like that's the whole module.
- §12 MCP `findMinutesBinary()` probe order (`target/` → `~/.cargo/bin` → `~/.local/bin` → Homebrew → PATH) doesn't explicitly mention `/Applications/Minutes.app/Contents/MacOS/minutes`. In practice the bundled-sidecar path is hit via the `~/.local/bin/minutes` symlink, so this isn't broken, just implicit.
- §13's verification table for "what was this binary built with" assumes the CLI binary is independent of the app. With the bundled sidecar, `which minutes` may return a symlink into the bundle, and its `capabilities --json` reflects whatever feature flags the bundle was built with — not the CLI release feed. Worth a sentence acknowledging this if §4 is being rewritten anyway.

--- 
What does your assessment look like?

### assistant · 2026-06-23 08:28:52

Largely agree with your read. Let me cross-check against §2 / §9 in particular because there's one more discrepancy I think you missed, and then I'll line up where I'd weight the fixes.

## Where I align with you

- **§4 "separate channels" is stale.** Yes — pre-`675f6b6` the framing was complete; post-`675f6b6` it omits the third (and arguably *default-recommended* for end users) track. The fix is a sentence-level addition, not a section rewrite: the existing two-channel framing is still true for the brew formula and `cargo install` paths, just no longer exhaustive.
- **§3 diagram + "Single in source, replicated in the binaries" paragraph.** Yes — on macOS the bundle contains **two** statically-linked-against-core Rust binaries (`minutes-app` and `minutes`), and the second one is the entire reason the auto-update story works. The diagram's INSTALL column glosses this. The paragraph's "replicated in the binaries" framing accidentally becomes more *literal* once you account for the sidecar: core is now triplicated across the CLI release binary, the app, and the bundled sidecar CLI, on macOS.
- **Your three smaller items.** All three valid; I'd weight them as worth fixing only if §4 is being touched anyway.

## One additional discrepancy you didn't flag — §2 contradicts §9

§2 says (lines ~93-95):

> "The **only** time the app executes the `minutes` binary is a 1-second `--version` probe in `cli_setup.rs`; the only subprocesses it *spawns* are **agent CLIs** (`claude`/`codex`) in a PTY for the Recall assistant (`pty.rs`) — never `minutes` for transcription."

But §9's own description of Layer 2 of the Parakeet fallback chain (the same doc, ~50 lines down) explicitly says the app **does** spawn `minutes` for transcription:

> "**Layer 2 · helper** — spawn `minutes parakeet-helper` child = one parakeet.cpp call, crash-isolated (`transcribe.rs:1931`)"

…and the helper resolution order at the bottom of §9 (`MINUTES_PARAKEET_HELPER → current_exe() if named "minutes" → which("minutes")`) is the resolution chain for *exactly that spawn*. So §2's "never `minutes` for transcription" is factually false on the current codebase, and contradicted by the same document four pages later. This isn't even a `675f6b6` regression — §2 has been wrong since `transcribe.rs:1931` was added (which predates the assessed version).

The fix is a two-word climb-down: drop "never `minutes` for transcription" and rephrase the bullet as "agent-CLIs in a PTY for the Recall assistant — *plus*, as a Layer-2 crash-isolation hop in the Parakeet fallback chain (§9), `minutes parakeet-helper`."

## Where I weight things

| Issue | Severity | Cost to fix |
|---|---|---|
| §4 versioning omits bundled-sidecar channel | **Real** — affects the user-facing mental model of how updates work | Two sentences |
| §3 diagram + "replicated" paragraph omit the bundled sidecar | **Real** — wrong picture of the artifact | Edit the INSTALL column; one sentence in the paragraph |
| §2 contradicts §9 on "never spawns `minutes` for transcription" | **Real** — internal inconsistency, factually false | Two-word edit |
| §2 undersells `cli_setup.rs` scope | Minor — phrasing | One sentence |
| §12 `findMinutesBinary` doesn't mention bundle path | Minor — implicit-but-correct | One bullet |
| §13 verification table assumes CLI ≠ app | Minor — true but misleading post-`675f6b6` | One sentence note |

The first three I'd fix. The last three I'd batch with the next deep-dive refresh — they're true-but-incomplete, not wrong.

## Wider observation

What unifies most of these is that `675f6b6` (May 4) materially changed the **artifact-on-disk topology** of a Minutes install — and the doc was assessed at `0.18.14` (June, well after May 4) but reads as if the commit didn't happen. That's a single point in time where the doc's source-grounding slipped: the prose was written from the pre-bundled-CLI mental model, the code was already past it, and the assessor didn't notice because the contradiction is structural (across §§2/3/4/12/13) rather than localized. Worth a note in the doc's caveat that "macOS bundle topology changed in `675f6b6` — re-verify any §2/§3 claim about subprocess boundaries against the current sidecar setup."

That's the meta-issue I'd flag in the commit message if I were the one fixing this: not "the doc is wrong," but "one commit invalidated assumptions in five sections at once, and that's a category of change worth a checklist item in `docs/PRE-COMMIT.md` — touching `cli_setup.rs`, `build.rs` sidecar staging, or `tauri.macos.conf.json` externalBin should prompt a re-read of ARCHITECTURE §§2-4."

### user · 2026-06-23 08:29:16

_(invoked /copy)_

### user · 2026-06-23 08:36:36

Confirmed at the code level — `transcribe.rs:1925-1931` runs unconditionally in core, and core is statically linked into both binaries, so when the app hits Parakeet Layer 2 it absolutely does `Command::new(helper_path).arg("parakeet-helper")…`. §2's "never `minutes` for transcription" is wrong, and §9 documents the contradiction explicitly. Your two-word climb-down is the right fix.

One nuance worth being precise about in the rewrite: the helper is only spawned when `helper_allowed` is true (`hints.is_empty()` and neither `MINUTES_PARAKEET_FORCE_DIRECT` nor `MINUTES_PARAKEET_HELPER_ACTIVE` set, `transcribe.rs:1927-1929`). The recording-sidecar path passes hints, which means Layer 2 is skipped and the chain goes 1 → 3. So §2's phrasing could land at "for hint-less Parakeet calls (cold batch processing, watcher memo path) the app may spawn `minutes parakeet-helper` as Layer-2 crash isolation; recording-sidecar Parakeet calls skip Layer 2 and never spawn `minutes`." That preserves the intent (no `minutes` spawn during live capture) while being true.

## On your meta-observation

Agree with the framing and the PRE-COMMIT.md proposal. The structural-vs-localized point is the key insight: source-grounded docs with `file:line` anchors give a false sense of robustness against drift, because the *anchor* keeps verifying while the *narrative* silently goes stale. `675f6b6` changed five sections' worth of premises at once and the assessor (me, in the doc's case) walked the file map without re-reading the prose against it.

A concrete PRE-COMMIT.md item that would catch this specific class of change:

> **Bundle topology changes.** If your commit touches any of: `tauri/src-tauri/build.rs` (sidecar staging), `tauri/src-tauri/tauri.macos.conf.json` (externalBin), `tauri/src-tauri/src/cli_setup.rs`, or `tauri/src-tauri/minutes-cli.entitlements` — re-read `docs/ARCHITECTURE.md` §§2-4, 13 and update the bundle diagram + "separate channels" paragraph if the on-disk layout or update channels changed.

That's narrow enough not to be noise, and `675f6b6` would have tripped it on every file it touched.

### assistant · 2026-06-23 08:37:04

The hint-emptiness gate is the right precision and lands well — it preserves the spirit of §2's original claim ("no `minutes` spawn during live capture") while making it actually true. The pre-`675f6b6` version of §2 wasn't *only* documenting a code fact; it was also conveying an intuition ("the live path is fully in-process, the app doesn't fork off CLI work mid-stream"). That intuition survives the rewrite — it just needs to be scoped to the recording-sidecar Parakeet path rather than blanket-asserted.

Your rephrasing also surfaces a useful asymmetry that wasn't obvious from §9 alone: **Layer 2 is structurally a batch-only fallback**, because the only callers that pass empty hints are batch/watcher/cold processing — live capture always has hints (vocabulary priming, calendar-derived terms, attendee names). So the fallback chain effectively bifurcates: live = `1 → 3`, batch = `1 → 2 → 3`. That's a real architectural fact the current §9 prose obscures by listing all three layers as if they always apply. Worth a parenthetical when §9 is next touched, though probably not worth blocking on.

## On the PRE-COMMIT.md proposal

That phrasing is good — narrow enough to be a real signal, not noise. Two small refinements that would harden it further:

- **Add `release-macos.yml` to the trigger set.** The bundle-topology story isn't just about what's *staged* into the bundle; it's also about whether CI catches regressions in the artifact (the #324 placeholder shipped because there was no guard, and the guard is in CI not in `build.rs`). A change to the sidecar-verification step at `:124-135` is the same category of risk as a change to `build.rs:32`.
- **Add the verification command to the checklist line itself.** E.g.: *"…re-read §§2-4, 13; verify the assessed bundle still matches by running `file /Applications/Minutes.app/Contents/MacOS/minutes` (expect Mach-O) and `… capabilities --json | jq .features` (expect parakeet+metal)."* That turns the checklist item from "go re-read four sections" (which is what the assessor in `675f6b6`'s wake didn't do) into "run two commands and compare against the doc." Two commands the human will actually run; four sections they probably won't.

The deeper meta-point you raised — *source-grounded docs with `file:line` anchors give a false sense of robustness against drift because the anchor keeps verifying while the narrative silently goes stale* — is worth its own line in the doc's own caveat block. Something like:

> Line-anchored claims verify *that the cited code still exists*, not *that the surrounding prose still accurately summarizes the surrounding code*. A commit that changes architectural premises without breaking any anchored line will pass anchor-checks silently. Re-read prose against code on bundle/IPC/version-source changes; don't trust the anchors alone.

That's the failure mode you're pointing at, named in the doc rather than left implicit. Future assessors (human or otherwise) will inherit the warning.

### user · 2026-06-23 08:37:38

_(invoked /copy)_

### user · 2026-06-23 08:43:13

All edits applied. Summary:

**`docs/ARCHITECTURE.md`**
| Section                  | Change                                                                                                                                                                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontmatter `caveat:`    | Expanded to call out the line-anchor failure mode by name, with `675f6b6` as the worked example                                                                                                                                                                                          |
| §2 (front-ends and core) | Replaced "never `minutes` for transcription" with a three-bullet list of what the app actually spawns; added the hint-emptiness precision (live ≠ batch); cross-refs §3 and §9                                                                                                           |
| §3 (build → link → run)  | Diagram now shows the bundled sidecar landing at `Contents/MacOS/minutes` alongside `minutes-app` (third install track); paragraph now says core is *triplicated* on macOS and points at `tauri.macos.conf.json:3-8` + `build.rs:32` + the `release-macos.yml:124-135` size/Mach-O guard |
| §4 (versioning)          | "Across install moments" replaced with three-channel framing (bundled sidecar / standalone CLI / app); drift example is now scoped to the standalone-CLI channel only                                                                                                                    |
| §9 (Parakeet fallback)   | Added the live-vs-batch bifurcation (live: `1→3`, batch: `1→2→3`) with the `hints.is_empty()` gate as the why; closes the §2/§9 contradiction explicitly                                                                                                                                 |

**`docs/PRE-COMMIT.md`**
| Row                       | Change                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bundle topology** (new) | Triggers on `build.rs`, `tauri.macos.conf.json`, `cli_setup.rs`, `minutes-cli.entitlements`, or `release-macos.yml`. Verification command is `file …/Contents/MacOS/minutes` + `… capabilities --json \| jq '.features \| {parakeet, diarize}'`. Calls out that the CI guard checks Mach-O+size but not features, so the feature-flag regression risk is still un-gated. |

Untouched on purpose (your "minor / batch with next refresh" bucket):
- §12 `findMinutesBinary` probe order
- §13 verification-table assumption that CLI ≠ app
- §2's tersely-described `cli_setup.rs` scope (the new bullet list partly addresses this — `cli_setup.rs` is now named in both the spawn list and the §3 paragraph, which carries more weight than a one-line scope expansion would)

Please review and give feedback

### assistant · 2026-06-23 08:44:35

The diffs land well overall. Three issues to flag (one substantive, two wording), then a couple of small wins worth pointing out.

## Substantive: §2's closing sentence is too strong

The new §2 says:

> "That `minutes` binary the app spawns for Layer 2 is *the same binary that ships inside the bundle as a sidecar* (see §3) — resolved via `current_exe() if named "minutes" → which("minutes")`"

This conflates "what the resolver looks at" with "what `which` returns." `current_exe()` for the app is `minutes-app`, not `minutes`, so it falls through. `which("minutes")` then returns **whatever's first on `PATH`** — which is the bundled sidecar *only when the user has run "Set up CLI"* and the resulting symlink is the highest-priority `minutes` on `PATH`. A user with a standalone `~/.cargo/bin/minutes` or `/opt/homebrew/bin/minutes` ahead of `~/.local/bin` gets that one spawned instead — and on the current dev machine in this session, that's literally the case (`which -a minutes` returned `~/.local/bin/minutes` then `~/.cargo/bin/minutes`, neither a symlink into the bundle).

So the "same binary" framing is *typical* but not *guaranteed*. Suggested rewrite:

> That `minutes` binary the app spawns for Layer 2 is whatever `which("minutes")` resolves to (`resolve_minutes_parakeet_helper`, `transcribe.rs:2462`) — typically the bundled CLI sidecar when the user has run "Set up CLI" (so `~/.local/bin/minutes` is the bundle symlink), but a standalone install if one is earlier on `PATH`. The resolver doesn't enforce "bundled sidecar"; it just finds *a* `minutes`.

This matters because there's a real failure mode it covers: a user with a stale standalone CLI that's *whisper-only* would have Layer 2 of the app's Parakeet chain dispatch to a whisper-only helper → `EngineNotAvailable("parakeet")` → fall through to Layer 3. The fallback still works, but it's not the path the user assumes.

## Wording: the caveat conflates "commit" with "doc regression"

> "the prior failure mode (commit `675f6b6`) invalidated five sections without breaking any line anchor"

Reads as if `675f6b6` was the failure. The commit was the *event*; the failure was the doc not being updated afterward. Tighter:

> "the prior failure mode — doc not re-read against code after commit `675f6b6` — invalidated five sections without breaking any line anchor"

Small but worth fixing because the same phrasing reappears in `PRE-COMMIT.md` ("the prior failure mode (commit `675f6b6`) invalidated five sections without breaking any line anchor"). If you tweak one, tweak both.

## Wording: §3 paragraph "since commit `675f6b6` (May 2026)"

Minor: the diagram says "since 675f6b6" without a date, the paragraph says "since commit `675f6b6` (May 2026)" with a date. Pick one and be consistent. (I'd put the date in the paragraph and drop "since 675f6b6" from the ASCII art, where it's already cramped.)

## Wins worth keeping

- The §9 bifurcation note is **exactly** the right precision. "Live: `1 → 3` / Batch: `1 → 2 → 3`" reads cleanly and the `hints.is_empty()` justification makes the bifurcation predictable rather than magic.
- The §4 three-channel restructure successfully scopes the drift example without throwing it away. The dev-machine anecdote was load-bearing for "real example observed in the wild" — keeping it under the standalone-CLI bullet preserves the empirical grounding.
- The caveat-block expansion is the genuine novel contribution from this session. Naming the failure mode ("anchored line passes, surrounding prose stale") is the kind of warning future assessors will actually heed because it's specific. Generic "keep docs in sync" notes get ignored; this one names the trap.
- The PRE-COMMIT row is the right granularity — narrow trigger set, concrete verification commands, explicit gap-flag about features not being CI-checked. It will fire on the right commits without becoming noise.

## What's not addressed (and shouldn't be, this pass)

§12 `findMinutesBinary` probe order and §13 verification table are both stale in the same direction as the §§2-4 changes were — they assume CLI is freestanding, not a bundle symlink. Your "batch with next refresh" call is correct: those sections are *true but incomplete*, not *wrong*, and forcing them into this diff would balloon the change beyond the bundled-CLI topology fix. The new PRE-COMMIT row will catch the next change to that area and re-flag them.

## Net

Two small wording fixes (§2 closing sentence + the "failure mode = commit" phrasing in both files) and the diff is shippable. The §3 date inconsistency is taste-level. Everything else lands.

### user · 2026-06-23 08:49:03

_(invoked /copy)_
