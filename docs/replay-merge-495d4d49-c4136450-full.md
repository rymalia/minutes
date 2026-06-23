# Merged session replay: `495d4d49` ⇄ `c4136450` (timestamp-sorted)

2 sessions pooled and interleaved in true chronological order; each turn header is badged with its origin session and model.

- **A·495d4d49**: `/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/495d4d49-740f-4650-a951-d36d008c5c34.jsonl` — 49 rendered turns
- **B·c4136450**: `/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/c4136450-11fa-4fd0-aa15-3cf722d9afea.jsonl` — 27 rendered turns
- **cwd**: `/Users/rymalia/projects/minutes`
- **merged turns**: 76
- **filters**: tools=on, tool_results=on, thinking=on, sidechains=on, verbatim=off, models=on

---

### user · 2026-06-23 06:01:24  ·  `A·495d4d49`

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

### assistant · 2026-06-23 06:01:29  ·  `A·495d4d49` · `claude-opus-4-8`

I have rich context from the docs. Let me ground a couple of the claims against this actual machine before answering.

### assistant · 2026-06-23 06:01:32  ·  `A·495d4d49` · `claude-opus-4-8`

- **→** `Bash(command='echo "=== App bundle locations ==="; ls -ld /Applications/Minutes.app ~/Applications/*Minutes* 2>/de… [+317 chars]', description='Inspect app + CLI install provenance on this machine')`

### tool_result · 2026-06-23 06:03:22  ·  `A·495d4d49`

```
=== App bundle locations ===
(eval):1: no matches found: /Users/rymalia/Applications/*Minutes*

=== Homebrew cask receipt for the app ===

=== CLI on PATH ===
/Users/rymalia/.local/bin/minutes
/Users/rymalia/.cargo/bin/minutes

=== Is the CLI a homebrew symlink? ===
-rwxr-xr-x@ 1 rymalia  staff  32201968 Jun 15 03:11 /Users/rymalia/.local/bin/minutes
```

### assistant · 2026-06-23 06:04:00  ·  `A·495d4d49` · `claude-opus-4-8`

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

### user · 2026-06-23 06:27:41  ·  `A·495d4d49`

<bash-input>ls -la /Applications</bash-input>

### user · 2026-06-23 06:27:41  ·  `A·495d4d49`

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

### assistant · 2026-06-23 06:27:47  ·  `A·495d4d49` · `claude-opus-4-8`

`/Applications/Minutes.app` **does** exist (dated Jun 4) — my earlier combined check got aborted by a zsh glob failure on the `~/Applications/*Minutes*` pattern, so that section printed nothing. Let me actually probe its provenance now.

### user · 2026-06-23 06:46:44  ·  `A·495d4d49`

<bash-input>ls -la /Applications/Minutes.app</bash-input>

### user · 2026-06-23 06:46:44  ·  `A·495d4d49`

<bash-stdout>total 0
drwxr-xr-x@  3 rymalia  staff    96 Jun  4 01:21 .
drwxrwxr-x  47 root     admin  1504 Jun 20 23:48 ..
drwxr-xr-x   7 rymalia  staff   224 Jun  4 01:21 Contents</bash-stdout><bash-stderr></bash-stderr>

### assistant · 2026-06-23 06:46:47  ·  `A·495d4d49` · `claude-opus-4-8`

Let me run the provenance probe on that actual bundle.

### assistant · 2026-06-23 06:46:52  ·  `A·495d4d49` · `claude-opus-4-8`

- **→** `Bash(command='APP=/Applications/Minutes.app\necho "=== Caskroom receipt (Homebrew)? ==="\nbrew list --cask 2>/dev/nu… [+726 chars]', description='Probe Minutes.app provenance: cask, quarantine, signature')`

### tool_result · 2026-06-23 06:46:56  ·  `A·495d4d49`

```
=== Caskroom receipt (Homebrew)? ===
  no minutes cask listed
  no Caskroom/minutes dir

=== Quarantine xattr (set ⇒ downloaded DMG/cask; absent ⇒ local build) ===
  (none) — not flagged as downloaded

=== Code signature authority ===
Signature size=9058
Authority=Developer ID Application: Mathieu Silverstein (63TMLKT8HN)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
TeamI… [+79 chars]
```

### assistant · 2026-06-23 06:47:25  ·  `A·495d4d49` · `claude-opus-4-8`

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

### user · 2026-06-23 06:53:21  ·  `A·495d4d49`

You stated "Crucially, the app cannot update a CLI it didn't install." -- and my understanding, according to the instructions in `docs/PARAKEET.md`, is that the only way to enable parakeet features in the cli is to manually build it:
```
cargo build --release -p minutes-cli --features parakeet
```

So does that mean that once I enable parakeet feature in the cli that the auto-update process can never keep them in sync? And will I need to continue manually updating the cli each time I auto-update the tauri app?

### user · 2026-06-23 06:54:53  ·  `A·495d4d49`

You stated "Crucially, the app cannot update a CLI it didn't install." -- and my understanding, according to the instructions in `docs/PARAKEET.md`, is that the only way to enable parakeet features in the cli is to manually build it:
```
cargo build --release -p minutes-cli --features parakeet
```

So does that mean that once I enable parakeet feature in the cli that the auto-update process can never keep them in sync? And will I need to continue manually updating the cli each time I auto-update the tauri app?

### user · 2026-06-23 06:55:36  ·  `A·495d4d49`

_(invoked /exit)_

### assistant · 2026-06-23 06:55:44  ·  `A·495d4d49` · `<synthetic>`

No response requested.

### user · 2026-06-23 06:56:45  ·  `A·495d4d49`

I am confused about how the tauri app and cli are to stay in sync once the user enables parakeet.

You stated "Crucially, the app cannot update a CLI it didn't install." -- and my understanding, according to the instructions in `docs/PARAKEET.md`, is that the only way to enable parakeet features in the cli is to manually build it:
```
cargo build --release -p minutes-cli --features parakeet
```

So does that mean that once I enable parakeet feature in the cli that the auto-update process can never keep them in sync? And will I need to continue manually updating the cli each time I auto-update the tauri app?

### assistant · 2026-06-23 06:56:54  ·  `A·495d4d49` · `claude-opus-4-8`

Let me ground this in the actual PARAKEET.md instructions and the CLI's parakeet story before answering.

### assistant · 2026-06-23 06:56:56  ·  `A·495d4d49` · `claude-opus-4-8`

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== PARAKEET.md: CLI build / features mentions ==="\ngrep -n… [+133 chars]', description='Find CLI parakeet build/install guidance in PARAKEET.md')`

### tool_result · 2026-06-23 06:56:57  ·  `A·495d4d49`

```
=== PARAKEET.md: CLI build / features mentions ===
69:`--features parakeet` and `--no-default-features` (no whisper) cannot run
77:is a manual download + conversion (the CLI prints these instructions but
85:  Google Highway dependency on Apple Silicon. Homebrew no longer ships
131:# 2. Build the Minutes CLI WITH the parakeet feature, then install it
133:cargo build --release -p minutes-cli --featu… [+1493 chars]
```

### user · 2026-06-23 06:58:44  ·  `A·495d4d49`

_(invoked /reload-plugins)_

### user · 2026-06-23 06:59:31  ·  `A·495d4d49`

_(invoked /plugin)_

### user · 2026-06-23 07:08:19  ·  `A·495d4d49`

_(invoked /reload-plugins)_

### assistant · 2026-06-23 07:09:11  ·  `A·495d4d49` · `<synthetic>`

No response requested.

### user · 2026-06-23 07:09:56  ·  `A·495d4d49`

I am confused about how the tauri app and cli are to stay in sync once the user enables parakeet.

You stated "Crucially, the app cannot update a CLI it didn't install." -- and my understanding, according to the instructions in `docs/PARAKEET.md`, is that the only way to enable parakeet features in the cli is to manually build it:
```
cargo build --release -p minutes-cli --features parakeet
```

So does that mean that once I enable parakeet feature in the cli that the auto-update process can never keep them in sync? And will I need to continue manually updating the cli each time I auto-update the tauri app?

### user · 2026-06-23 07:10:31  ·  `A·495d4d49`

why are we repeatedly getting an API Error??

### user · 2026-06-23 07:13:46  ·  `A·495d4d49`

_(invoked /exit)_

### assistant · 2026-06-23 07:25:33  ·  `A·495d4d49` · `<synthetic>`

No response requested.

### user · 2026-06-23 07:25:45  ·  `A·495d4d49`

I am confused about how the tauri app and cli are to stay in sync once the user enables parakeet.

You stated "Crucially, the app cannot update a CLI it didn't install." -- and my understanding, according to the instructions in `docs/PARAKEET.md`, is that the only way to enable parakeet features in the cli is to manually build it:
```
cargo build --release -p minutes-cli --features parakeet
```

So does that mean that once I enable parakeet feature in the cli that the auto-update process can never keep them in sync? And will I need to continue manually updating the cli each time I auto-update the tauri app?

### assistant · 2026-06-23 07:26:59  ·  `A·495d4d49` · `claude-opus-4-7`

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

### user · 2026-06-23 07:33:43  ·  `A·495d4d49`

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

### assistant · 2026-06-23 07:33:51  ·  `A·495d4d49` · `claude-opus-4-7`

That's a substantial claim — if true, it inverts my answer. Let me verify each piece against the actual repo and the installed app bundle.

### assistant · 2026-06-23 07:33:54  ·  `A·495d4d49` · `claude-opus-4-7`

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== 1. Tauri updater endpoint ==="\ngrep -nE \'endpoints|late… [+286 chars]', description='Check updater config + release workflow feature flags')`

### tool_result · 2026-06-23 07:33:57  ·  `A·495d4d49`

```
=== 1. Tauri updater endpoint ===
40:    "updater": {
42:      "endpoints": [
43:        "https://github.com/silverstein/minutes/releases/latest/download/latest.json"

=== 2. release-macos.yml feature flags ===
total 64
drwxr-xr-x  6 rymalia  staff    192 Jun 21 16:16 .
drwxr-xr-x  5 rymalia  staff    160 Apr  6 10:08 ..
-rw-r--r--@ 1 rymalia  staff  11620 Jun  9 14:53 ci.yml
-rw-r--r--@ 1 rymalia… [+428 chars]
```

### assistant · 2026-06-23 07:34:06  ·  `A·495d4d49` · `claude-opus-4-7`

- **→** `Bash(command='echo "=== 3. Contents of Minutes.app/Contents/MacOS ==="\nls -la /Applications/Minutes.app/Contents/M… [+218 chars]', description='Check bundled sidecar + Tauri config for sidecar binaries')`

### tool_result · 2026-06-23 07:34:07  ·  `A·495d4d49`

```
=== 3. Contents of Minutes.app/Contents/MacOS ===
total 92544
drwxr-xr-x  7 rymalia  staff       224 Jun  4 01:21 .
drwxr-xr-x  7 rymalia  staff       224 Jun  4 01:21 ..
-rwxr-xr-x  1 rymalia  staff    114224 Jun  2 09:22 calendar-events
-rwxr-xr-x  1 rymalia  staff     71168 Jun  2 09:22 mic_check
-rwxr-xr-x  1 rymalia  staff        52 Jun  2 09:19 minutes
-rwxr-xr-x  1 rymalia  staff  46967968… [+346 chars]
```

### assistant · 2026-06-23 07:34:11  ·  `A·495d4d49` · `claude-opus-4-7`

The bundle has a `minutes` file at 52 bytes — that's not a CLI binary; it's a shim. Let me see what it actually is, and also check whether the app installs a system-wide CLI.

### assistant · 2026-06-23 07:34:16  ·  `A·495d4d49` · `claude-opus-4-7`

- **→** `Bash(command='echo "=== What is the 52-byte \'minutes\' file? ==="\nfile /Applications/Minutes.app/Contents/MacOS/min… [+720 chars]', description='Identify the 52-byte minutes file and check cli_setup.rs install logic')`

### user · 2026-06-23 07:53:37  ·  `B·c4136450`

@README.md 
@docs/PARAKEET.md @docs/PARAKEET_ryan.md 
@docs/ARCHITECTURE.md 
@docs/RELEASE.md 
@docs/RELEASE-MACOS.md 
Do some research into the codebase to validate this claim below:

---  
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

---  
Then, related to that, read this: @docs/PLAN-bundle-cli-in-app.md and check the git log for commit `675f6b63a5498de8e331ccc4658ad65b833de3a7`

### assistant · 2026-06-23 07:53:42  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='cat /Users/rymalia/projects/minutes/.github/workflows/release-macos.yml | head -100', description='Read release-macos.yml workflow')`

### tool_result · 2026-06-23 07:53:43  ·  `B·c4136450`

```
name: Release macOS

on:
  workflow_dispatch:
    inputs:
      tag:
        description: "Release tag to upload assets to, for example v0.16.0"
        required: true
        type: string
  push:
    tags:
      - "v*"

permissions:
  contents: write

env:
  CARGO_TERM_COLOR: always
  MACOSX_DEPLOYMENT_TARGET: "11.0"
  CXXFLAGS: -I$(xcrun --show-sdk-path)/usr/include/c++/v1
  TAURI_CLI_VERSION: "… [+2824 chars]
```

### tool_result · 2026-06-23 07:53:49  ·  `A·495d4d49`

```
=== What is the 52-byte 'minutes' file? ===
/Applications/Minutes.app/Contents/MacOS/minutes: POSIX shell script text executable, ASCII text
--- content ---
#!/bin/sh
echo 'minutes CLI placeholder' >&2
exit 1

=== Where is the actual bundled CLI (search for real minutes binary in the bundle) ===
-rwxr-xr-x  1 rymalia  staff  52 Jun  2 09:19 /Applications/Minutes.app/Contents/MacOS/minutes
/Applica… [+4414 chars]
```

### assistant · 2026-06-23 07:53:49  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='grep -n "features\\|parakeet\\|metal\\|tauri build\\|latest.json\\|Minutes.app.tar.gz" /Users/rymalia/pro… [+49 chars]', description='Grep for feature flags and artifacts in workflow')`

### tool_result · 2026-06-23 07:53:49  ·  `B·c4136450`

```
109:        run: cargo build --release -p minutes-cli --features parakeet,metal
122:        run: cargo tauri build --features parakeet,metal --bundles app
172:      - name: Generate latest.json for auto-updater
178:          SIG=$(cat target/release/bundle/macos/Minutes.app.tar.gz.sig)
183:          URL="https://github.com/silverstein/minutes/releases/download/${RELEASE_TAG}/Minutes.app.tar.gz"
20… [+267 chars]
```

### assistant · 2026-06-23 07:53:52  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command="sed -n '100,225p' /Users/rymalia/projects/minutes/.github/workflows/release-macos.yml", description='Read the build and artifact section of release-macos.yml')`

### tool_result · 2026-06-23 07:53:52  ·  `B·c4136450`

```
key_path="$RUNNER_TEMP/AuthKey_${APPLE_API_KEY}.p8"
          printf '%s' "$APPLE_API_PRIVATE_KEY" > "$key_path"
          chmod 600 "$key_path"
          echo "APPLE_API_KEY_PATH=$key_path" >> "$GITHUB_ENV"

      # The bundle ships the CLI as a sidecar (in-app "Set up CLI" symlinks to
      # it). build.rs stages it from target/release/minutes, so the CLI must be
      # built first or the bundl… [+4808 chars]
```

### assistant · 2026-06-23 07:53:57  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='grep -rn "latest.json\\|updater\\|endpoints" /Users/rymalia/projects/minutes/tauri/src-tauri/tauri.con… [+88 chars]', description='Find updater endpoint configuration')`

### tool_result · 2026-06-23 07:53:57  ·  `B·c4136450`

```
/Users/rymalia/projects/minutes/tauri/src-tauri/tauri.conf.json:40:    "updater": {
/Users/rymalia/projects/minutes/tauri/src-tauri/tauri.conf.json:42:      "endpoints": [
/Users/rymalia/projects/minutes/tauri/src-tauri/tauri.conf.json:43:        "https://github.com/silverstein/minutes/releases/latest/download/latest.json"
/Users/rymalia/projects/minutes/tauri/src-tauri/Cargo.toml:37:tauri-plugin-… [+13 chars]
```

### assistant · 2026-06-23 07:54:03  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='grep -rn "externalBin\\|sidecar\\|bin/minutes\\|binaries/minutes" /Users/rymalia/projects/minutes/tauri… [+106 chars]', description='Find sidecar configuration')`

### tool_result · 2026-06-23 07:54:03  ·  `B·c4136450`

```
/Users/rymalia/projects/minutes/tauri/src-tauri/build.rs:9:    stage_minutes_cli_sidecar();
/Users/rymalia/projects/minutes/tauri/src-tauri/build.rs:14:/// Below this size the staged sidecar cannot be a real CLI binary (the real
/Users/rymalia/projects/minutes/tauri/src-tauri/build.rs:18:/// Ensure `bin/minutes-<target>` exists so Tauri's `externalBin` resolution
/Users/rymalia/projects/minutes/ta… [+1374 chars]
```

### assistant · 2026-06-23 07:54:07  ·  `A·495d4d49` · `claude-opus-4-7`

Two critical findings already. Let me dig into the release workflow timeline and the bundling mechanism.

### assistant · 2026-06-23 07:54:11  ·  `A·495d4d49` · `claude-opus-4-7`

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== When was \'parakeet,metal\' added to release-macos.yml? =… [+643 chars]', description='Check release workflow history + how bundled CLI is staged')`

### assistant · 2026-06-23 07:54:16  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='grep -n "externalBin\\|bin/minutes" /Users/rymalia/projects/minutes/tauri/src-tauri/tauri.conf.json', description='Check externalBin in tauri.conf.json')`

### tool_result · 2026-06-23 07:54:16  ·  `B·c4136450`

```
(Bash completed with no output)
```

### tool_result · 2026-06-23 07:54:20  ·  `A·495d4d49`

```
=== When was 'parakeet,metal' added to release-macos.yml? ===
+        run: cargo build --release -p minutes-cli --features parakeet,metal
         run: cargo tauri build --features parakeet,metal --bundles app
+        run: cargo build --release -p minutes-cli --features parakeet,metal
         run: cargo tauri build --features parakeet,metal --bundles app
         run: cargo tauri build --featur… [+2845 chars]
```

### assistant · 2026-06-23 07:54:20  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='grep -n "external\\|bin\\|sidecar" /Users/rymalia/projects/minutes/tauri/src-tauri/tauri.conf.json', description='Look for externalBin references')`

### tool_result · 2026-06-23 07:54:21  ·  `B·c4136450`

```
(Bash completed with no output)
```

### assistant · 2026-06-23 07:54:24  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/tauri.conf.json')`

### tool_result · 2026-06-23 07:54:25  ·  `B·c4136450`

```
1	{
2	  "$schema": "https://raw.githubusercontent.com/nicedoc/tauri/dev/crates/tauri-cli/schema.json",
3	  "productName": "Minutes",
4	  "identifier": "com.useminutes.desktop",
5	  "version": "0.18.14",
6	  "build": {
7	    "frontendDist": "../src"
8	  },
9	  "app": {
10	    "withGlobalTauri": true,
11	    "macOSPrivateApi": true,
12	    "windows": [],
13	    "security": {
14	      "csp": null
15… [+955 chars]
```

### assistant · 2026-06-23 07:54:30  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/build.rs')`

### tool_result · 2026-06-23 07:54:30  ·  `B·c4136450`

```
1	use std::fs;
2	use std::path::{Path, PathBuf};
3	use std::process::Command;
4	
5	fn main() {
6	    compile_mic_check_helper();
7	    compile_system_audio_helper();
8	    compile_calendar_helper();
9	    stage_minutes_cli_sidecar();
10	    stage_assistant_skill_bundle();
11	    tauri_build::build()
12	}
13	
14	/// Below this size the staged sidecar cannot be a real CLI binary (the real
15	/// one… [+5154 chars]
```

### assistant · 2026-06-23 07:54:35  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='find /Users/rymalia/projects/minutes/tauri/src-tauri -name "*.json" -o -name "*.toml" | xargs grep -… [+40 chars]', description='Find externalBin config')`

### tool_result · 2026-06-23 07:54:35  ·  `B·c4136450`

```
/Users/rymalia/projects/minutes/tauri/src-tauri/tauri.macos.conf.json
```

### assistant · 2026-06-23 07:54:38  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/tauri.macos.conf.json')`

### tool_result · 2026-06-23 07:54:38  ·  `B·c4136450`

```
1	{
2	  "bundle": {
3	    "externalBin": [
4	      "bin/mic_check",
5	      "bin/system_audio_record",
6	      "bin/calendar-events",
7	      "bin/minutes"
8	    ],
9	    "resources": [
10	      "resources/assistant-skill-bundle/**/*"
11	    ],
12	    "macOS": {
13	      "entitlements": "entitlements.plist",
14	      "infoPlist": "Info.plist"
15	    }
16	  }
17	}
18
```

### assistant · 2026-06-23 07:54:43  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='git log --format="%H %s" -n 1 675f6b63a5498de8e331ccc4658ad65b833de3a7 2>&1; echo "---"; git show --… [+61 chars]', description='Check the specific commit')`

### tool_result · 2026-06-23 07:54:43  ·  `B·c4136450`

```
675f6b63a5498de8e331ccc4658ad65b833de3a7 feat(app): bundle CLI inside Minutes.app for auto-update
---
commit 675f6b63a5498de8e331ccc4658ad65b833de3a7
Author: silverstein <matsilverstein@gmail.com>
Date:   Mon May 4 15:31:43 2026 -0700

    feat(app): bundle CLI inside Minutes.app for auto-update
    
    Backend lives in `tauri/src-tauri/src/cli_setup.rs`. Frontend wires the
    "Command-line tool… [+2457 chars]
```

### assistant · 2026-06-23 07:55:06  ·  `B·c4136450` · `claude-opus-4-7`

All claims validate against the codebase. Summary:

| Claim | Verdict | Evidence |
|---|---|---|
| Updater endpoint is `releases/latest/download/latest.json` | ✅ | `tauri/src-tauri/tauri.conf.json:43` |
| `latest.json` = manifest with version/url/signature/notes | ✅ | `release-macos.yml:172-204` (Python block builds it with `version`, `notes`, `pub_date`, `platforms.darwin-aarch64.signature/url`) |
| Actual artifact is `Minutes.app.tar.gz` | ✅ | `release-macos.yml:183` sets `URL=…/Minutes.app.tar.gz`; uploaded at `:213-215` alongside `.sig` and `latest.json` |
| CI builds CLI and app with `--features parakeet,metal` | ✅ | `release-macos.yml:109` (`cargo build --release -p minutes-cli --features parakeet,metal`) and `:122` (`cargo tauri build --features parakeet,metal --bundles app`) |
| Bundled CLI sidecar at `Minutes.app/Contents/MacOS/minutes` | ✅ | `tauri.macos.conf.json` declares `externalBin: ["bin/minutes", ...]`; `build.rs:32-110` stages `bin/minutes-<target>` from `target/release/minutes`; Tauri's bundler strips the arch suffix → `Contents/MacOS/minutes`. CI also verifies it's ≥10 MB and Mach-O (`release-macos.yml:124-135`, guard for issue #324). |
| Symlink `~/.local/bin/minutes → bundle's CLI` updates with the app | ✅ | Commit `675f6b6` ("feat(app): bundle CLI inside Minutes.app for auto-update", May 4 2026) implements `cli_setup.rs` per `docs/PLAN-bundle-cli-in-app.md`. Symlink target is inside the bundle, so in-place app replacement re-points it automatically. |

One detail the plan got wrong and the commit corrected: PLAN §1 expected the sidecar to ship as `minutes-aarch64-apple-darwin` inside the bundle, but Tauri's bundler strips the arch suffix at install time. The shipped filename is plain `minutes`; `bundled_cli_path()` checks that name first and falls back to the arch-suffixed name (commit message, "Plan deviation worth flagging").

So the user's two claims are accurate as written for the current `main` workflow. The only ongoing risk they flagged ("a future release artifact built without the feature") is real but currently mitigated — both `--features parakeet,metal` lines are explicit in YAML, not derived from a default, so removing parakeet would require a deliberate edit.

### assistant · 2026-06-23 07:55:15  ·  `A·495d4d49` · `claude-opus-4-7`

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

### user · 2026-06-23 07:56:37  ·  `B·c4136450`

_(invoked /copy)_

### user · 2026-06-23 07:57:05  ·  `A·495d4d49`

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

### assistant · 2026-06-23 07:57:16  ·  `A·495d4d49` · `claude-opus-4-7`

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== Commit 675f6b6: title + files ==="\ngit show --stat 675f… [+744 chars]', description='Verify maintainer commit + externalBin + build.rs + bundled_cli_path order')`

### tool_result · 2026-06-23 07:57:27  ·  `A·495d4d49`

```
=== Commit 675f6b6: title + files ===
commit 675f6b63a5498de8e331ccc4658ad65b833de3a7
Author: silverstein <matsilverstein@gmail.com>
Date:   Mon May 4 15:31:43 2026 -0700

    feat(app): bundle CLI inside Minutes.app for auto-update
    
    Backend lives in `tauri/src-tauri/src/cli_setup.rs`. Frontend wires the
    "Command-line tool" card into Settings > About and a CLI setup section
    into th… [+6438 chars]
```

### assistant · 2026-06-23 07:58:17  ·  `A·495d4d49` · `claude-opus-4-7`

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

### user · 2026-06-23 08:11:34  ·  `A·495d4d49`

_(invoked /copy)_

### user · 2026-06-23 08:16:42  ·  `B·c4136450`

Next look at commit 351ca48.
All Minutes releases come pre-built with the parakeet feature enabled, since April 13:

Release workflow builds with parakeet — .github/workflows/release-macos.yml:109 builds the CLI with --features parakeet,metal, and :122 builds the Tauri app with --features parakeet,metal --bundles app. git log shows commit 351ca48 titled "fix: enable parakeet feature in release workflows (closes #117)" — so since that commit, every official release artifact ships with Parakeet baked in.

Commit 351ca48 by @silverstein
committed on Apr 13
Add --features parakeet to all three release workflows so packaged
CLI and desktop binaries include parakeet engine support out of the box.
---

### assistant · 2026-06-23 08:16:49  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='git show --stat 351ca48 2>&1 | head -40', description='Inspect commit 351ca48')`

### tool_result · 2026-06-23 08:16:49  ·  `B·c4136450`

```
commit 351ca48b3daec80fbadfacbb565f23aaa9776107
Author: silverstein <matsilverstein@gmail.com>
Date:   Mon Apr 13 15:51:01 2026 -0700

    fix: enable parakeet feature in release workflows (closes #117)
    
    Add --features parakeet to all three release workflows so packaged
    CLI and desktop binaries include parakeet engine support out of the box.
    
    Reported by @jotremblay.

 .github/… [+202 chars]
```

### assistant · 2026-06-23 08:16:52  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='git show 351ca48 -- .github/workflows/release-macos.yml .github/workflows/release-cli.yml .github/wo… [+51 chars]', description='Inspect actual diff of commit 351ca48')`

### tool_result · 2026-06-23 08:16:52  ·  `B·c4136450`

```
commit 351ca48b3daec80fbadfacbb565f23aaa9776107
Author: silverstein <matsilverstein@gmail.com>
Date:   Mon Apr 13 15:51:01 2026 -0700

    fix: enable parakeet feature in release workflows (closes #117)
    
    Add --features parakeet to all three release workflows so packaged
    CLI and desktop binaries include parakeet engine support out of the box.
    
    Reported by @jotremblay.

diff --gi… [+1799 chars]
```

### assistant · 2026-06-23 08:16:57  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='git log --oneline --all -- .github/workflows/release-macos.yml | head -20', description='History of release-macos.yml')`

### tool_result · 2026-06-23 08:16:57  ·  `B·c4136450`

```
4daa19b fix(release): build the CLI before bundling; hard-fail on placeholder sidecar (#324) (#326)
500338a fix(release): build the CLI before bundling; hard-fail on placeholder sidecar (#324)
b938c28 fix(release): retry dmg detach during mac packaging
920d49c fix(release): harden patch release prep
bb81acb fix(release): restore branded macos dmg
3fbb148 fix(release): harden macos dmg packaging
26… [+881 chars]
```

### assistant · 2026-06-23 08:17:06  ·  `B·c4136450` · `claude-opus-4-7`

Claim validates, with one small refinement.

| Claim | Verdict | Evidence |
|---|---|---|
| Commit `351ca48` titled "fix: enable parakeet feature in release workflows (closes #117)" | ✅ | Subject matches exactly. Author silverstein, Apr 13 2026. |
| Added `--features parakeet` to all three release workflows | ✅ | Diff touches `release-cli.yml`, `release-macos.yml`, `release-windows-desktop.yml` — one line each. |
| Since that commit, every official release ships with Parakeet baked in | ✅ | The `--features parakeet` flag has remained in all three workflows from `351ca48` (Apr 13) through the current `main`. |

One refinement: at the time of `351ca48`, the macOS line was just `--features parakeet`. The `,metal` was added two commits later in `2647b65` ("build(macos): enable Metal in release binaries for 2× faster large-v3", PR #139). So:

- **Apr 13 (`351ca48`) → present**: macOS releases ship Parakeet
- **PR #139 (`2647b65`) → present**: macOS releases also ship Metal acceleration

Both flags are still present at `release-macos.yml:109` (CLI) and `:122` (Tauri app) on current `main`. The user's framing is accurate; just note that "parakeet+metal together" is the post-#139 state, not the post-#117 state.

### user · 2026-06-23 08:19:29  ·  `B·c4136450`

Good catch on that. Also this:

Confirmed — and commit `675f6b6` (May 4, 2026) is exactly the work that makes the bundled-sidecar auto-update story true. The commit message itself flags the same nuance (`tauri/src-tauri/bin/minutes-aarch64-apple-darwin` → `Contents/MacOS/minutes` after Tauri strips the suffix), and `cli_setup.rs:96` codifies it: prefer `minutes`, fall back to the arch-suffixed name. Other corroborating details I checked:

- **`tauri.macos.conf.json:7`** — `externalBin: ["bin/minutes", …]` is the platform-specific override; the base `tauri.conf.json` doesn't even mention `externalBin`, which is why my earlier grep on that file came up empty.
- **`build.rs:32-110`** — `stage_minutes_cli_sidecar()` copies `target/release/minutes` to `bin/minutes-<target>` before `cargo tauri build`, and if the CLI isn't built yet it emits `cargo:warning=No minutes CLI release binary found; writing placeholder sidecar`. So the 52-byte stub on this machine's v0.18.5 install is literally that fallback path — the release was cut before `target/release/minutes` was built (or before the issue-#324 guard at `release-macos.yml:124-134` was added).
- **Sidecar entitlements** — the commit also adds `tauri/src-tauri/minutes-cli.entitlements` granting `com.apple.security.device.audio-input`, with `install-dev-app.sh` re-signing the sidecar after the outer `--deep` sign clobbers nested entitlements. So the bundled CLI is independently signed for mic access, not just a hitchhiker.

## Final synthesis

I'll restate the corrected picture in one place so it stands cleanly.

**On `main` today, the architecture genuinely is: one auto-update, both binaries.**

| Question                                                        | Verdict                                                                                                                                                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does the Tauri auto-updater include the CLI?                    | **Yes**, via the bundled sidecar at `Contents/MacOS/minutes`. The updater swaps the whole `.app.tar.gz`; the sidecar swaps with it; the `~/.local/bin/minutes` symlink keeps resolving. |
| Is the official release artifact built with parakeet?           | **Yes** — `release-macos.yml:109` (CLI) and `:122` (app) both pass `--features parakeet,metal`. Explicit YAML, not derived from a default, so it can't silently regress.                |
| Do I need to re-enable parakeet after each in-app update?       | **No**, provided you're using the bundled-sidecar CLI on PATH.                                                                                                                          |
| Do I need to manually rebuild the CLI after each in-app update? | **Only** if your `~/.local/bin/minutes` is your own `cargo install` artifact (your current state), or you use the Homebrew formula (whisper-only). For the bundled-sidecar path, no.    |

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

### assistant · 2026-06-23 08:19:48  ·  `B·c4136450` · `claude-opus-4-7`

Synthesis matches what I found. Two small confirmations worth flagging:

- The CI guard at `release-macos.yml:124-135` only checks the sidecar is `>10 MB` + `Mach-O`. You're right that it doesn't validate features. A one-line `./Minutes.app/Contents/MacOS/minutes capabilities --json | jq -e .features.parakeet` after the existing size check would close that gap cheaply if/when it ever feels worth it — but as you said, the YAML flag is explicit and won't drift silently.
- The `cli_setup.rs:96` fallback (prefer `minutes`, then arch-suffixed) is forward-compat insurance against a future Tauri bundler change that *stops* stripping the suffix. Today only the unsuffixed name resolves; tomorrow either works.

Nothing else to add — the recipe is correct as written.

### user · 2026-06-23 08:21:05  ·  `B·c4136450`

_(invoked /copy)_

### user · 2026-06-23 08:21:42  ·  `A·495d4d49`

Two small confirmations worth flagging:

- The CI guard at `release-macos.yml:124-135` only checks the sidecar is `>10 MB` + `Mach-O`. You're right that it doesn't validate features. A one-line `./Minutes.app/Contents/MacOS/minutes capabilities --json | jq -e .features.parakeet` after the existing size check would close that gap cheaply if/when it ever feels worth it — but as you said, the YAML flag is explicit and won't drift silently.
- The `cli_setup.rs:96` fallback (prefer `minutes`, then arch-suffixed) is forward-compat insurance against a future Tauri bundler change that *stops* stripping the suffix. Today only the unsuffixed name resolves; tomorrow either works.

Nothing else to add — the recipe is correct as written.
---
One refinement: at the time of 351ca48, the macOS line was just --features parakeet. The ,metal was added two commits later in 2647b65 ("build(macos): enable Metal in release binaries for 2× faster large-v3", PR #139). So:

- Apr 13 (351ca48) → present: macOS releases ship Parakeet
- PR #139 (2647b65) → present: macOS releases also ship Metal acceleration

Both flags are still present at release-macos.yml:109 (CLI) and :122 (Tauri app) on current main. The user's framing is accurate; just note that "parakeet+metal together" is the post-#139 state, not the post-#117 state.

### assistant · 2026-06-23 08:21:54  ·  `A·495d4d49` · `claude-opus-4-7`

Acknowledged — both refinements land cleanly.

- **Feature-flag verification in CI.** Agreed, that's the cheap close. The size + Mach-O check is structural, not semantic; adding a single `… capabilities --json | jq -e .features.parakeet` (and `.metal`, while you're there) right after the size assertion would turn the placeholder guard into a real "shipped what we said we'd ship" guard. Low cost, no extra dependencies (jq's already on the runner). Worth filing as a small follow-up issue rather than acting on now.
- **`cli_setup.rs:96` is forward-compat, not currently-used.** Right — today only the unsuffixed `minutes` resolves in a packaged bundle. Worth keeping that read of the fallback so nobody later "simplifies" it out under the misimpression that it's dead code.
- **Timeline split #117 → #139.** Good correction. So the precise history is:
  - `351ca48` (PR #117, Apr 13) — adds `--features parakeet` to macOS release workflows.
  - `2647b65` (PR #139) — adds `,metal` for the 2× large-v3 speedup.
  - Current `main` — both flags together at `release-macos.yml:109` (CLI) and `:122` (app).

So the "post-#117" period was Parakeet-only releases; the "parakeet+metal together" framing is strictly the post-#139 state. Anything earlier than #139 in your install timeline would be a Parakeet-capable but Metal-free CLI in the bundle. Doesn't change the user-facing recipe, but it's the right way to describe the history.

### user · 2026-06-23 08:23:33  ·  `B·c4136450`

Basaed on what we've uncovered in this session, do you see any factual discrepancies in `docs/ARCHITECTURE.md` or any glaring ommissions?

### assistant · 2026-06-23 08:24:27  ·  `B·c4136450` · `claude-opus-4-7`

Yes — two real issues, both stemming from `675f6b6` (May 4) not being reflected in the doc despite the doc's assessed version (`0.18.14`) being well after that commit.

**1. §4 Versioning — "separate channels" is now incomplete (stale claim).**

> "Across install moments → Yes. The installed CLI and app update through *separate channels* (the app via its in-app updater/DMG; the CLI via `cp`/`cargo install`/`brew`), so the artifacts on disk drift. … After an in-app update, re-sync the CLI separately (e.g. `brew upgrade minutes`)."

That's true for the brew/cargo path but no longer the whole picture. There's a third channel now: the bundled sidecar at `Minutes.app/Contents/MacOS/minutes`, plumbed by `cli_setup.rs` via a `~/.local/bin/minutes` symlink into the bundle. On that track the CLI updates *with* the app — no re-sync needed. The "drift is inevitable" framing should be qualified: drift happens unless you're on the bundled-sidecar track.

**2. §3 Build → link → run — diagram omits the second binary in the bundle.**

The diagram's INSTALL column shows the bundle containing only `Contents/MacOS/minutes-app`. As of `675f6b6`, every signed bundle also ships `Contents/MacOS/minutes` (the CLI as a Tauri `externalBin` sidecar, declared in `tauri.macos.conf.json:3-8`, staged by `build.rs:32`). That's why the in-app updater story works at all. The diagram and the "single in source, replicated in the binaries" paragraph should acknowledge that the macOS app bundle contains *two* statically-linked-against-core Rust binaries, not one.

**Smaller things, probably not worth fixing:**

- §2's "The **only** time the app executes the `minutes` binary is a 1-second `--version` probe in `cli_setup.rs`" — still true, but slightly undersells what `cli_setup.rs` does (symlink management, multi-bundle picker, snooze state, shell-PATH writing). The file map at §14 captures it tersely; the prose in §2 reads like that's the whole module.
- §12 MCP `findMinutesBinary()` probe order (`target/` → `~/.cargo/bin` → `~/.local/bin` → Homebrew → PATH) doesn't explicitly mention `/Applications/Minutes.app/Contents/MacOS/minutes`. In practice the bundled-sidecar path is hit via the `~/.local/bin/minutes` symlink, so this isn't broken, just implicit.
- §13's verification table for "what was this binary built with" assumes the CLI binary is independent of the app. With the bundled sidecar, `which minutes` may return a symlink into the bundle, and its `capabilities --json` reflects whatever feature flags the bundle was built with — not the CLI release feed. Worth a sentence acknowledging this if §4 is being rewritten anyway.

Nothing else jumped out as factually wrong in light of what we verified this session.

### user · 2026-06-23 08:26:06  ·  `B·c4136450`

_(invoked /copy)_

### user · 2026-06-23 08:27:46  ·  `A·495d4d49`

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

### assistant · 2026-06-23 08:28:52  ·  `A·495d4d49` · `claude-opus-4-7`

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

### user · 2026-06-23 08:29:16  ·  `A·495d4d49`

_(invoked /copy)_

### user · 2026-06-23 08:29:28  ·  `B·c4136450`

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

| Issue                                                           | Severity                                                            | Cost to fix                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| §4 versioning omits bundled-sidecar channel                     | **Real** — affects the user-facing mental model of how updates work | Two sentences                                          |
| §3 diagram + "replicated" paragraph omit the bundled sidecar    | **Real** — wrong picture of the artifact                            | Edit the INSTALL column; one sentence in the paragraph |
| §2 contradicts §9 on "never spawns `minutes` for transcription" | **Real** — internal inconsistency, factually false                  | Two-word edit                                          |
| §2 undersells `cli_setup.rs` scope                              | Minor — phrasing                                                    | One sentence                                           |
| §12 `findMinutesBinary` doesn't mention bundle path             | Minor — implicit-but-correct                                        | One bullet                                             |
| §13 verification table assumes CLI ≠ app                        | Minor — true but misleading post-`675f6b6`                          | One sentence note                                      |

The first three I'd fix. The last three I'd batch with the next deep-dive refresh — they're true-but-incomplete, not wrong.

## Wider observation

What unifies most of these is that `675f6b6` (May 4) materially changed the **artifact-on-disk topology** of a Minutes install — and the doc was assessed at `0.18.14` (June, well after May 4) but reads as if the commit didn't happen. That's a single point in time where the doc's source-grounding slipped: the prose was written from the pre-bundled-CLI mental model, the code was already past it, and the assessor didn't notice because the contradiction is structural (across §§2/3/4/12/13) rather than localized. Worth a note in the doc's caveat that "macOS bundle topology changed in `675f6b6` — re-verify any §2/§3 claim about subprocess boundaries against the current sidecar setup."

That's the meta-issue I'd flag in the commit message if I were the one fixing this: not "the doc is wrong," but "one commit invalidated assumptions in five sections at once, and that's a category of change worth a checklist item in `docs/PRE-COMMIT.md` — touching `cli_setup.rs`, `build.rs` sidecar staging, or `tauri.macos.conf.json` externalBin should prompt a re-read of ARCHITECTURE §§2-4."

### assistant · 2026-06-23 08:29:33  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='grep -n "parakeet-helper\\|parakeet_helper\\|minutes parakeet" /Users/rymalia/projects/minutes/crates/… [+33 chars]', description='Verify Layer 2 parakeet-helper spawn')`

### tool_result · 2026-06-23 08:29:34  ·  `B·c4136450`

```
1931:        if let Some(helper_path) = resolve_minutes_parakeet_helper() {
1934:                .arg("parakeet-helper")
1978:                    log_parakeet_helper_failure_once(&output.status, &stderr);
2008:                    log_parakeet_helper_spawn_failure_once(&spawn_error);
2462:fn resolve_minutes_parakeet_helper() -> Option<PathBuf> {
2498:/// Used by the parakeet-helper failure logging… [+844 chars]
```

### assistant · 2026-06-23 08:29:37  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs')`

### tool_result · 2026-06-23 08:29:37  ·  `B·c4136450`

```
1920	            .lock()
1921	            .unwrap_or_else(|poisoned| poisoned.into_inner());
1922	        seen.insert(host_process_key)
1923	    };
1924	
1925	    let use_gpu = cfg!(all(target_os = "macos", target_arch = "aarch64"));
1926	    let use_fp16 = use_gpu && config.transcription.parakeet_fp16;
1927	    let helper_allowed = hints.is_empty()
1928	        && std::env::var_os("MINUTES_PARAKE… [+1094 chars]
```

### assistant · 2026-06-23 08:30:02  ·  `B·c4136450` · `claude-opus-4-7`

Confirmed at the code level — `transcribe.rs:1925-1931` runs unconditionally in core, and core is statically linked into both binaries, so when the app hits Parakeet Layer 2 it absolutely does `Command::new(helper_path).arg("parakeet-helper")…`. §2's "never `minutes` for transcription" is wrong, and §9 documents the contradiction explicitly. Your two-word climb-down is the right fix.

One nuance worth being precise about in the rewrite: the helper is only spawned when `helper_allowed` is true (`hints.is_empty()` and neither `MINUTES_PARAKEET_FORCE_DIRECT` nor `MINUTES_PARAKEET_HELPER_ACTIVE` set, `transcribe.rs:1927-1929`). The recording-sidecar path passes hints, which means Layer 2 is skipped and the chain goes 1 → 3. So §2's phrasing could land at "for hint-less Parakeet calls (cold batch processing, watcher memo path) the app may spawn `minutes parakeet-helper` as Layer-2 crash isolation; recording-sidecar Parakeet calls skip Layer 2 and never spawn `minutes`." That preserves the intent (no `minutes` spawn during live capture) while being true.

## On your meta-observation

Agree with the framing and the PRE-COMMIT.md proposal. The structural-vs-localized point is the key insight: source-grounded docs with `file:line` anchors give a false sense of robustness against drift, because the *anchor* keeps verifying while the *narrative* silently goes stale. `675f6b6` changed five sections' worth of premises at once and the assessor (me, in the doc's case) walked the file map without re-reading the prose against it.

A concrete PRE-COMMIT.md item that would catch this specific class of change:

> **Bundle topology changes.** If your commit touches any of: `tauri/src-tauri/build.rs` (sidecar staging), `tauri/src-tauri/tauri.macos.conf.json` (externalBin), `tauri/src-tauri/src/cli_setup.rs`, or `tauri/src-tauri/minutes-cli.entitlements` — re-read `docs/ARCHITECTURE.md` §§2-4, 13 and update the bundle diagram + "separate channels" paragraph if the on-disk layout or update channels changed.

That's narrow enough not to be noise, and `675f6b6` would have tripped it on every file it touched.

### user · 2026-06-23 08:36:07  ·  `B·c4136450`

_(invoked /copy)_

### user · 2026-06-23 08:36:36  ·  `A·495d4d49`

Confirmed at the code level — `transcribe.rs:1925-1931` runs unconditionally in core, and core is statically linked into both binaries, so when the app hits Parakeet Layer 2 it absolutely does `Command::new(helper_path).arg("parakeet-helper")…`. §2's "never `minutes` for transcription" is wrong, and §9 documents the contradiction explicitly. Your two-word climb-down is the right fix.

One nuance worth being precise about in the rewrite: the helper is only spawned when `helper_allowed` is true (`hints.is_empty()` and neither `MINUTES_PARAKEET_FORCE_DIRECT` nor `MINUTES_PARAKEET_HELPER_ACTIVE` set, `transcribe.rs:1927-1929`). The recording-sidecar path passes hints, which means Layer 2 is skipped and the chain goes 1 → 3. So §2's phrasing could land at "for hint-less Parakeet calls (cold batch processing, watcher memo path) the app may spawn `minutes parakeet-helper` as Layer-2 crash isolation; recording-sidecar Parakeet calls skip Layer 2 and never spawn `minutes`." That preserves the intent (no `minutes` spawn during live capture) while being true.

## On your meta-observation

Agree with the framing and the PRE-COMMIT.md proposal. The structural-vs-localized point is the key insight: source-grounded docs with `file:line` anchors give a false sense of robustness against drift, because the *anchor* keeps verifying while the *narrative* silently goes stale. `675f6b6` changed five sections' worth of premises at once and the assessor (me, in the doc's case) walked the file map without re-reading the prose against it.

A concrete PRE-COMMIT.md item that would catch this specific class of change:

> **Bundle topology changes.** If your commit touches any of: `tauri/src-tauri/build.rs` (sidecar staging), `tauri/src-tauri/tauri.macos.conf.json` (externalBin), `tauri/src-tauri/src/cli_setup.rs`, or `tauri/src-tauri/minutes-cli.entitlements` — re-read `docs/ARCHITECTURE.md` §§2-4, 13 and update the bundle diagram + "separate channels" paragraph if the on-disk layout or update channels changed.

That's narrow enough not to be noise, and `675f6b6` would have tripped it on every file it touched.

### assistant · 2026-06-23 08:37:04  ·  `A·495d4d49` · `claude-opus-4-7`

The hint-emptiness gate is the right precision and lands well — it preserves the spirit of §2's original claim ("no `minutes` spawn during live capture") while making it actually true. The pre-`675f6b6` version of §2 wasn't *only* documenting a code fact; it was also conveying an intuition ("the live path is fully in-process, the app doesn't fork off CLI work mid-stream"). That intuition survives the rewrite — it just needs to be scoped to the recording-sidecar Parakeet path rather than blanket-asserted.

Your rephrasing also surfaces a useful asymmetry that wasn't obvious from §9 alone: **Layer 2 is structurally a batch-only fallback**, because the only callers that pass empty hints are batch/watcher/cold processing — live capture always has hints (vocabulary priming, calendar-derived terms, attendee names). So the fallback chain effectively bifurcates: live = `1 → 3`, batch = `1 → 2 → 3`. That's a real architectural fact the current §9 prose obscures by listing all three layers as if they always apply. Worth a parenthetical when §9 is next touched, though probably not worth blocking on.

## On the PRE-COMMIT.md proposal

That phrasing is good — narrow enough to be a real signal, not noise. Two small refinements that would harden it further:

- **Add `release-macos.yml` to the trigger set.** The bundle-topology story isn't just about what's *staged* into the bundle; it's also about whether CI catches regressions in the artifact (the #324 placeholder shipped because there was no guard, and the guard is in CI not in `build.rs`). A change to the sidecar-verification step at `:124-135` is the same category of risk as a change to `build.rs:32`.
- **Add the verification command to the checklist line itself.** E.g.: *"…re-read §§2-4, 13; verify the assessed bundle still matches by running `file /Applications/Minutes.app/Contents/MacOS/minutes` (expect Mach-O) and `… capabilities --json | jq .features` (expect parakeet+metal)."* That turns the checklist item from "go re-read four sections" (which is what the assessor in `675f6b6`'s wake didn't do) into "run two commands and compare against the doc." Two commands the human will actually run; four sections they probably won't.

The deeper meta-point you raised — *source-grounded docs with `file:line` anchors give a false sense of robustness against drift because the anchor keeps verifying while the narrative silently goes stale* — is worth its own line in the doc's own caveat block. Something like:

> Line-anchored claims verify *that the cited code still exists*, not *that the surrounding prose still accurately summarizes the surrounding code*. A commit that changes architectural premises without breaking any anchored line will pass anchor-checks silently. Re-read prose against code on bundle/IPC/version-source changes; don't trust the anchors alone.

That's the failure mode you're pointing at, named in the doc rather than left implicit. Future assessors (human or otherwise) will inherit the warning.

### user · 2026-06-23 08:37:38  ·  `A·495d4d49`

_(invoked /copy)_

### user · 2026-06-23 08:38:01  ·  `B·c4136450`

The hint-emptiness gate is the right precision and lands well — it preserves the spirit of §2's original claim ("no `minutes` spawn during live capture") while making it actually true. The pre-`675f6b6` version of §2 wasn't *only* documenting a code fact; it was also conveying an intuition ("the live path is fully in-process, the app doesn't fork off CLI work mid-stream"). That intuition survives the rewrite — it just needs to be scoped to the recording-sidecar Parakeet path rather than blanket-asserted.

Your rephrasing also surfaces a useful asymmetry that wasn't obvious from §9 alone: **Layer 2 is structurally a batch-only fallback**, because the only callers that pass empty hints are batch/watcher/cold processing — live capture always has hints (vocabulary priming, calendar-derived terms, attendee names). So the fallback chain effectively bifurcates: live = `1 → 3`, batch = `1 → 2 → 3`. That's a real architectural fact the current §9 prose obscures by listing all three layers as if they always apply. Worth a parenthetical when §9 is next touched, though probably not worth blocking on.

## On the PRE-COMMIT.md proposal

That phrasing is good — narrow enough to be a real signal, not noise. Two small refinements that would harden it further:

- **Add `release-macos.yml` to the trigger set.** The bundle-topology story isn't just about what's *staged* into the bundle; it's also about whether CI catches regressions in the artifact (the #324 placeholder shipped because there was no guard, and the guard is in CI not in `build.rs`). A change to the sidecar-verification step at `:124-135` is the same category of risk as a change to `build.rs:32`.
- **Add the verification command to the checklist line itself.** E.g.: *"…re-read §§2-4, 13; verify the assessed bundle still matches by running `file /Applications/Minutes.app/Contents/MacOS/minutes` (expect Mach-O) and `… capabilities --json | jq .features` (expect parakeet+metal)."* That turns the checklist item from "go re-read four sections" (which is what the assessor in `675f6b6`'s wake didn't do) into "run two commands and compare against the doc." Two commands the human will actually run; four sections they probably won't.

The deeper meta-point you raised — *source-grounded docs with `file:line` anchors give a false sense of robustness against drift because the anchor keeps verifying while the narrative silently goes stale* — is worth its own line in the doc's own caveat block. Something like:

> Line-anchored claims verify *that the cited code still exists*, not *that the surrounding prose still accurately summarizes the surrounding code*. A commit that changes architectural premises without breaking any anchored line will pass anchor-checks silently. Re-read prose against code on bundle/IPC/version-source changes; don't trust the anchors alone.

That's the failure mode you're pointing at, named in the doc rather than left implicit. Future assessors (human or otherwise) will inherit the warning.
---  
Go ahead and draft those updates to remedy this

### assistant · 2026-06-23 08:38:19  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Bash(command='test -f /Users/rymalia/projects/minutes/docs/PRE-COMMIT.md && wc -l /Users/rymalia/projects/minutes/… [+18 chars]', description='Check PRE-COMMIT.md exists')`

### tool_result · 2026-06-23 08:38:19  ·  `B·c4136450`

```
37 /Users/rymalia/projects/minutes/docs/PRE-COMMIT.md
```

### assistant · 2026-06-23 08:38:31  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Read(file_path='/Users/rymalia/projects/minutes/docs/PRE-COMMIT.md')`

### tool_result · 2026-06-23 08:38:32  ·  `B·c4136450`

```
1	# Pre-Commit Checklist
2	
3	**Run this mental checklist before every commit from this repo.** Not every item applies to every commit — check which areas your changes touch and verify those.
4	
5	**CI parity note.** CI runs on `ubuntu-latest`, `macos-latest`, and `windows-latest`, and it builds `minutes-core` with `--features parakeet` on all three. The Pre-Commit Checklist is designed to catch C… [+11886 chars]
```

### assistant · 2026-06-23 08:38:47  ·  `B·c4136450` · `claude-opus-4-7`

I'll make the edits surgically — frontmatter caveat first, then §2, §3 (diagram + paragraph), §4, §9, and finally PRE-COMMIT.md.

### assistant · 2026-06-23 08:38:52  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Edit(file_path='/Users/rymalia/projects/minutes/docs/ARCHITECTURE.md')`

### tool_result · 2026-06-23 08:38:56  ·  `B·c4136450`

```
The file /Users/rymalia/projects/minutes/docs/ARCHITECTURE.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-23 08:39:09  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Edit(file_path='/Users/rymalia/projects/minutes/docs/ARCHITECTURE.md')`

### tool_result · 2026-06-23 08:39:09  ·  `B·c4136450`

```
The file /Users/rymalia/projects/minutes/docs/ARCHITECTURE.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-23 08:39:18  ·  `B·c4136450` · `claude-opus-4-7`

Now §3 — the diagram and the "replicated in the binaries" paragraph:

### assistant · 2026-06-23 08:39:34  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Edit(file_path='/Users/rymalia/projects/minutes/docs/ARCHITECTURE.md')`

### tool_result · 2026-06-23 08:39:35  ·  `B·c4136450`

```
The file /Users/rymalia/projects/minutes/docs/ARCHITECTURE.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-23 08:39:39  ·  `B·c4136450` · `claude-opus-4-7`

Now §4 — the "Can the CLI and app be out of sync?" section:

### assistant · 2026-06-23 08:39:50  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Edit(file_path='/Users/rymalia/projects/minutes/docs/ARCHITECTURE.md')`

### tool_result · 2026-06-23 08:39:50  ·  `B·c4136450`

```
The file /Users/rymalia/projects/minutes/docs/ARCHITECTURE.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-23 08:39:58  ·  `B·c4136450` · `claude-opus-4-7`

Now §9 — add the batch-vs-live bifurcation note. Let me locate the layers table:

### assistant · 2026-06-23 08:40:09  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Edit(file_path='/Users/rymalia/projects/minutes/docs/ARCHITECTURE.md')`

### tool_result · 2026-06-23 08:40:09  ·  `B·c4136450`

```
The file /Users/rymalia/projects/minutes/docs/ARCHITECTURE.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-23 08:40:11  ·  `B·c4136450` · `claude-opus-4-7`

Now PRE-COMMIT.md — add the bundle topology row:

### assistant · 2026-06-23 08:40:23  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Edit(file_path='/Users/rymalia/projects/minutes/docs/PRE-COMMIT.md')`

### tool_result · 2026-06-23 08:40:24  ·  `B·c4136450`

```
The file /Users/rymalia/projects/minutes/docs/PRE-COMMIT.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-23 08:40:43  ·  `B·c4136450` · `claude-opus-4-7`

All edits applied. Summary:

**`docs/ARCHITECTURE.md`**
| Section | Change |
|---|---|
| Frontmatter `caveat:` | Expanded to call out the line-anchor failure mode by name, with `675f6b6` as the worked example |
| §2 (front-ends and core) | Replaced "never `minutes` for transcription" with a three-bullet list of what the app actually spawns; added the hint-emptiness precision (live ≠ batch); cross-refs §3 and §9 |
| §3 (build → link → run) | Diagram now shows the bundled sidecar landing at `Contents/MacOS/minutes` alongside `minutes-app` (third install track); paragraph now says core is *triplicated* on macOS and points at `tauri.macos.conf.json:3-8` + `build.rs:32` + the `release-macos.yml:124-135` size/Mach-O guard |
| §4 (versioning) | "Across install moments" replaced with three-channel framing (bundled sidecar / standalone CLI / app); drift example is now scoped to the standalone-CLI channel only |
| §9 (Parakeet fallback) | Added the live-vs-batch bifurcation (live: `1→3`, batch: `1→2→3`) with the `hints.is_empty()` gate as the why; closes the §2/§9 contradiction explicitly |

**`docs/PRE-COMMIT.md`**
| Row | Change |
|---|---|
| **Bundle topology** (new) | Triggers on `build.rs`, `tauri.macos.conf.json`, `cli_setup.rs`, `minutes-cli.entitlements`, or `release-macos.yml`. Verification command is `file …/Contents/MacOS/minutes` + `… capabilities --json \| jq '.features \| {parakeet, diarize}'`. Calls out that the CI guard checks Mach-O+size but not features, so the feature-flag regression risk is still un-gated. |

Untouched on purpose (your "minor / batch with next refresh" bucket):
- §12 `findMinutesBinary` probe order
- §13 verification-table assumption that CLI ≠ app
- §2's tersely-described `cli_setup.rs` scope (the new bullet list partly addresses this — `cli_setup.rs` is now named in both the spawn list and the §3 paragraph, which carries more weight than a one-line scope expansion would)

### user · 2026-06-23 08:42:38  ·  `B·c4136450`

_(invoked /copy)_

### user · 2026-06-23 08:43:13  ·  `A·495d4d49`

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

### assistant · 2026-06-23 08:43:20  ·  `A·495d4d49` · `claude-opus-4-7`

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== git status ==="\ngit status --short docs/ARCHITECTURE.md… [+105 chars]', description="Check edited files' git status and diff stats")`

### tool_result · 2026-06-23 08:43:21  ·  `A·495d4d49`

```
=== git status ===
M  docs/ARCHITECTURE.md
M  docs/PRE-COMMIT.md

=== diff stat ===
```

### assistant · 2026-06-23 08:43:26  ·  `A·495d4d49` · `claude-opus-4-7`

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\ngit diff --cached --stat docs/ARCHITECTURE.md docs/PRE-COMMIT.md… [+72 chars]', description='Find where the diff actually lives')`

### tool_result · 2026-06-23 08:43:26  ·  `A·495d4d49`

```
docs/ARCHITECTURE.md | 84 +++++++++++++++++++++++++++++++++++++++++-----------
 docs/PRE-COMMIT.md   |  1 +
 2 files changed, 68 insertions(+), 17 deletions(-)
---
     139
```

### assistant · 2026-06-23 08:43:30  ·  `A·495d4d49` · `claude-opus-4-7`

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\ngit diff --cached docs/ARCHITECTURE.md', description='Review staged ARCHITECTURE.md diff')`

### tool_result · 2026-06-23 08:43:30  ·  `A·495d4d49`

```
diff --git a/docs/ARCHITECTURE.md b/docs/ARCHITECTURE.md
index 20ecf4b..d25d41c 100644
--- a/docs/ARCHITECTURE.md
+++ b/docs/ARCHITECTURE.md
@@ -9,7 +9,17 @@ method: "learn-codebase deep dive — direct file reads + parallel survey agents
 companion_diagrams:
   - docs/diagrams/minutes-build-link-run.html
   - docs/diagrams/minutes-parakeet-fallback.html
-caveat: "Line numbers are approximate to the… [+9168 chars]
```

### assistant · 2026-06-23 08:43:34  ·  `A·495d4d49` · `claude-opus-4-7`

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\ngit diff --cached docs/PRE-COMMIT.md', description='Review staged PRE-COMMIT.md diff')`

### tool_result · 2026-06-23 08:43:34  ·  `A·495d4d49`

```
diff --git a/docs/PRE-COMMIT.md b/docs/PRE-COMMIT.md
index cbb9604..9551f58 100644
--- a/docs/PRE-COMMIT.md
+++ b/docs/PRE-COMMIT.md
@@ -27,6 +27,7 @@
 | **Mutual exclusion** | Any change to recording/dictation/live transcript start paths | Verify all three modes check each other's PID/state: `live_transcript::run` checks recording+dictation PIDs, `cmd_record`/`capture::record_to_wav` checks live… [+3486 chars]
```

### assistant · 2026-06-23 08:44:35  ·  `A·495d4d49` · `claude-opus-4-7`

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

### user · 2026-06-23 08:49:03  ·  `A·495d4d49`

_(invoked /copy)_

### user · 2026-06-23 09:18:28  ·  `A·495d4d49`

Edit made to `ARCHITECTURE.md` - also added @docs/BINARIES-AND-PARAKEET.md

### assistant · 2026-06-23 09:18:37  ·  `A·495d4d49` · `claude-opus-4-7`

Let me verify the precompiled CLI claim (#9) — that's the one I missed — and check the ARCHITECTURE.md edit landed.

### assistant · 2026-06-23 09:18:39  ·  `A·495d4d49` · `claude-opus-4-7`

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== release-cli.yml: feature flags + uploaded assets ==="\ng… [+240 chars]', description='Verify precompiled CLI assets + ARCHITECTURE.md §2 edit')`

### tool_result · 2026-06-23 09:18:40  ·  `A·495d4d49`

```
=== release-cli.yml: feature flags + uploaded assets ===
17:    name: Build (${{ matrix.target }})
18:    runs-on: ${{ matrix.os }}
21:      matrix:
23:          - target: aarch64-apple-darwin
26:            asset: minutes-macos-arm64
27:            features: parakeet,metal
28:          - target: x86_64-pc-windows-msvc
31:            asset: minutes-windows-x64.exe
32:            features: parakeet… [+2357 chars]
```

### user · 2026-06-23 09:18:44  ·  `B·c4136450`

Edit made to `ARCHITECTURE.md` - also added @docs/BINARIES-AND-PARAKEET.md

### assistant · 2026-06-23 09:19:05  ·  `B·c4136450` · `claude-opus-4-7`

Acknowledged — both changes look right, and you caught the overstatement I left in §2.

The original sentence I wrote ("*is the same binary that ships inside the bundle as a sidecar*") collapsed three resolver steps into one outcome. Your rewrite at `:113-120` correctly states the resolver finds *a* `minutes` and notes the three real-world cases (bundle symlink via Set up CLI / standalone cargo / homebrew earlier on PATH) with the explicit `EngineNotAvailable` fall-through when it lands on a whisper-only binary. That's the accurate picture and it stays consistent with §9's resolver order.

On `docs/BINARIES-AND-PARAKEET.md`: the claim ledger format is the right shape for a consolidated reference — calling out specifically what was wrong-but-self-corrected, wrong-and-missed (#9 precompiled CLI), and overstated-but-not-fixed (#10 my §2 sentence) makes the doc usable as both reference and audit trail. Worth flagging that #9 in particular is the kind of error that's most likely to recur in future sessions, because "no precompiled parakeet CLI" sounds plausible from the Homebrew-formula-is-whisper-only fact and a sloppy assessor could trip on it the same way.

Nothing else from me unless you want me to revisit the §13 verification table or §12 MCP probe-order, which are still on the "minor, batch with next refresh" list.

### assistant · 2026-06-23 09:19:31  ·  `A·495d4d49` · `claude-opus-4-7`

Verified both deltas:

- **Precompiled Parakeet CLI artifacts exist** — `release-cli.yml:23-37` matrix builds all three targets with feature flags (`aarch64-apple-darwin` → `parakeet,metal`, Win/Linux → `parakeet`), uploaded as named release assets (`:82-91`). Claim #9 in the ledger is correctly captured. My earlier "no precompiled parakeet CLI anywhere" was wrong; the precise statement is what the new doc lands on: *no auto-installing/auto-updating channel ships one*, but manual download from GitHub Releases works.
- **ARCHITECTURE.md §2 softening landed** — verified `docs/ARCHITECTURE.md:113-120` now has the full resolver order including `MINUTES_PARAKEET_HELPER` first, the `current_exe()` fall-through, and the `PATH` ordering caveat with the whisper-only failure mode. The fix is clean.

So both items the ledger flagged as outstanding are now actually closed.

## Two small staleness bugs in the new doc itself

`docs/BINARIES-AND-PARAKEET.md` is mostly tight, but its own self-audit section is out of date with the very edit it documents:

1. **Claim #10 (line 236)** still reads *"⚠️ **Overstated — fix identified but NOT applied.** … The recommended rewrite (…) never landed."* — but the rewrite *did* land in the same session, just before this doc was written. The ledger entry should flip to ✅, mirror the resolution wording from #8 (*"identified and applied"*), and update the verdict column. Otherwise a reader cross-checking the ledger will go hunting for a fix that's already in `ARCHITECTURE.md:113-120`.

2. **"Outstanding doc fix" subsection (lines 238-244)** is fully stale and should be deleted (or replaced with "*Resolved on 2026-06-23: see `ARCHITECTURE.md:113-120`. The first-resolver-step note about `MINUTES_PARAKEET_HELPER` is included in the rewrite.*"). The line reference *"(`transcribe.rs:113–115`)"* is also a typo — the rewrite was for `ARCHITECTURE.md:113–115`, not `transcribe.rs`. Worth fixing on the way out.

## What's worth keeping unchanged

- **The claim ledger pattern itself** is the most valuable thing in this doc — a structured self-audit that distinguishes "right," "wrong-but-self-corrected," "wrong-and-missed," and "identified-but-not-applied." That four-state classification is the right granularity; future docs that consolidate cross-session investigations should adopt it.
- **The `[unverified-here]` markers** on Homebrew formula claims are exactly right — the formula lives in an external tap, so the doc honestly flags the limit of its grounding rather than asserting from secondhand memory.
- **The "post-#117 vs post-#139" history split** (§3) is the right resolution for the parakeet-vs-metal timeline; the corresponding note in the doc is precise and won't drift.
- **The v0.18.5-on-this-machine specifics in §5** are correctly scoped as *"on this machine right now"* — they'll go stale when the user updates, but the doc telegraphs that explicitly with the "as of 2026-06-23" framing in the frontmatter and the inline phrasing.
- **The §6 resolver disclaimer with the warning callout** is the resolved version of what the claim-#10 fix asked for in `ARCHITECTURE.md`. Good that the new doc carries it explicitly rather than relying on a cross-reference.

## Net

Update the two stale items (claim #10 + the Outstanding doc fix section + the `transcribe.rs:113-115` typo), and the doc is shippable as a clean reference. The §8 ledger then accurately reflects the post-session state instead of mid-session state — which matters because the whole point of this doc is to be the *resolved* record, not the in-progress one.

### user · 2026-06-23 09:20:33  ·  `B·c4136450`

Can you restate the the §13 verification table and §12 MCP probe-order issues -- I don't think I understood the nuance

### assistant · 2026-06-23 09:20:38  ·  `B·c4136450` · `claude-opus-4-7`

- **→** `Read(file_path='/Users/rymalia/projects/minutes/docs/ARCHITECTURE.md')`

### tool_result · 2026-06-23 09:20:39  ·  `B·c4136450`

```
440	  - **L0 (deterministic 1-on-1)** — 2 trusted attendees + 2 speakers → Medium.
441	  - **L1 (LLM)** — `summarize::map_speakers` → Medium (capped).
442	  - **L3 (confirmed learning)** — confirmed embeddings saved to `voices.db` for future L2 matches.
443	- **The rewrite rule:** `apply_confirmed_names` rewrites `[SPEAKER_X]` labels to real names **only for
444	  `Confidence::High`** — "wrong nam… [+3253 chars]
```

### assistant · 2026-06-23 09:21:21  ·  `B·c4136450` · `claude-opus-4-7`

Sure — here are the two, restated with the specific failure mode each one masks.

## §12 — `findMinutesBinary` probe list is technically correct, misleading by omission

The doc currently says (paraphrasing):

> `findMinutesBinary()` probes `target/`, `~/.cargo/bin`, `~/.local/bin`, Homebrew dirs, then PATH.

That's an accurate description of the literal probe list. The nuance: **the bundle path `/Applications/Minutes.app/Contents/MacOS/minutes` is not in that list**, and the doc doesn't say so explicitly.

In practice MCP can still end up running the bundled CLI — but only **indirectly**, via the `~/.local/bin/minutes` symlink that `cli_setup.rs` writes when the user clicks "Set up CLI". The probe finds `~/.local/bin/minutes`; that file happens to be a symlink into the bundle; the OS resolves it; the bundled CLI runs.

What this hides:

- If the user **has not** opted into Set up CLI, MCP has no path to the bundled CLI at all. Even if every other `minutes` install on disk is whisper-only and the bundle is parakeet-capable, MCP will use the whisper-only one.
- A reader scanning the probe list would conclude "MCP doesn't know about the bundle" and miss that there's a *user-opt-in indirection* that quietly reshapes which CLI MCP talks to.

Suggested addition: one parenthetical noting "the bundle is not probed directly; it's reached only via the `~/.local/bin/minutes → bundle` symlink when the user has run Set up CLI."

## §13 — verification table assumes CLI ≠ app, which is no longer reliably true

The doc currently shows:

| Target | Command | Read |
|---|---|---|
| CLI | `minutes capabilities --json` | `.features.parakeet` / `.features.diarize` |
| App | Settings → Transcription | `parakeet_compiled` |

The implicit model: "your CLI" and "your app" are two distinct artifacts, so two distinct verification commands.

Post-`675f6b6` that model breaks at the CLI row. `minutes capabilities --json` runs **whichever `minutes` is first on PATH**, which on the bundled-sidecar track is *the app's bundled CLI*. So `minutes capabilities` can be reporting:

- the standalone CLI's flags (cargo/brew install), **or**
- the bundled sidecar's flags (which mirror whatever the app was built with), **or**
- a mix on a single machine — e.g. an old `~/.cargo/bin/minutes` (whisper-only) coexisting with a new Set-Up-CLI'd symlink, where `which` decides by PATH order.

The failure mode this enables:

- User checks `minutes capabilities --json` and sees `parakeet: false`. They conclude "the app doesn't have parakeet." Actually they're reading the standalone CLI's flags; the app could be fully parakeet-capable independently. They'd believe a fix-rebuild was needed when it isn't.
- Or the reverse: `minutes capabilities --json` reports `parakeet: true` because they're hitting the bundled sidecar, but their actual cargo-installed CLI at `~/.cargo/bin/minutes` is whisper-only. They'd skip a rebuild they actually needed.

Suggested fix: a one-line addition to the table — "**before reading the CLI row, run `readlink $(which minutes)` to confirm which CLI you're actually checking.** If it's a symlink into a `.app` bundle, you're reading the *app's* flags via the bundled sidecar, not the standalone CLI release's."

---

Both are "true-but-incomplete" in the same direction: the doc treats the symlink as a user-side convenience instead of a *probe-graph rewriting mechanism*. After Set up CLI runs, every PATH-based `minutes` lookup in the entire system (MCP probes, manual `which`, capability checks, even Layer 2 of the Parakeet fallback chain in §9) silently re-routes into the bundle. That's the structural insight the current §§9/12/13 prose underplays.

### user · 2026-06-23 09:24:18  ·  `A·495d4d49`

_(invoked /copy)_

### user · 2026-06-23 09:28:10  ·  `B·c4136450`

_(invoked /copy)_
