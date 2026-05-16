---
title: Rebuilding Minutes from Source (CLI + Desktop App)
date: 2026-04-06
type: guide
tags: [install, rebuild, make, cmake, build, rust, cargo]
project: minutes
related: [minutes, smaug, kuato]
---

## Rebuilding Minutes from Source (CLI + Desktop App)

### Prerequisites you should already have

Need Rust, cmake, and `tauri-cli` installed. If not:
```bash
brew install cmake
cargo install tauri-cli --version 2.10.1 --locked
```

### Step 1 — Set the C++ include path (required on macOS)

This is needed because whisper.cpp's C++ headers need the SDK path. Set it once per terminal session:

```bash
export CXXFLAGS="-I$(xcrun --show-sdk-path)/usr/include/c++/v1"
```

`★ Insight ─────────────────────────────────────`
This environment variable is needed because macOS 26 moved the C++ standard library headers. whisper.cpp (compiled via `whisper-rs-sys` during cargo build) needs them. Without it, you get cryptic C++ include errors. It's **not** persisted — you need it in every new shell where you build.
`─────────────────────────────────────────────────`

### Step 2 — Build and install the CLI (with Metal GPU acceleration)

```bash
cargo install --path crates/cli --features metal
```

This compiles the `minutes` binary and places it at `~/.cargo/bin/minutes`. The `--features metal` flag enables Apple Metal GPU acceleration for whisper transcription — important on your M3 Air.

**Verify Metal is linked:**
```bash
otool -L ~/.cargo/bin/minutes | grep -i metal
```
You should see `Metal.framework` and `MetalKit.framework`.

`★ Insight ─────────────────────────────────────`
- `cargo install --path` both compiles and copies the binary to `~/.cargo/bin/`. It's the equivalent of `cargo build --release` + manually copying the binary, but in one step.
- There's no runtime indicator that Metal is active — `otool -L` is the only way to verify. The project has `whisper_rs::WHISPER_CPP_VERSION` available but doesn't surface it or the feature flags anywhere in `minutes health` or `--version`.
`─────────────────────────────────────────────────`

### Step 3 — Build the Tauri desktop app (with Metal)

```bash
cargo tauri build --bundles app --features metal
```

This produces the `.app` bundle at `target/release/bundle/macos/Minutes.app`.

**To install it:** copy it to `/Applications`:
```bash
cp -R target/release/bundle/macos/Minutes.app /Applications/Minutes.app
```

Or if you're doing TCC-sensitive work (hotkeys, screen recording, permissions), use the dev app path instead:
```bash
./scripts/install-dev-app.sh
```

`★ Insight ─────────────────────────────────────`
- The CLI and Tauri app are **separate builds** that share the same `minutes-core` Rust library. Building one does not build the other.
- `--bundles app` tells Tauri to produce a `.app` bundle (not DMG, not installer).
- The `--features metal` flag here propagates through `tauri/src-tauri/Cargo.toml` → `minutes-core` → `whisper-rs/metal`, the same chain as the CLI build.
`─────────────────────────────────────────────────`

### Step 4 — Rebuild the MCP server (if you use Claude Desktop / Claude Code / any MCP client)

The MCP server is TypeScript, **not** part of the Rust build. The main build script (`./scripts/build.sh`) does NOT rebuild it:

```bash
cd crates/mcp && npm install && npm run build
```

Then restart any MCP client sessions (Claude Desktop, Claude Code, etc.) to pick up the changes.

### Step 5 — Download/verify whisper model (if not already done)

```bash
minutes setup --model small
```

Models live at `~/.minutes/models/ggml-small.bin` (466MB). This also auto-downloads the Silero VAD model. If you already ran this before, it should still be there — the models persist across rebuilds.

---

### Quick reference (copy-paste block)

```bash
# Full rebuild from fresh pull
export CXXFLAGS="-I$(xcrun --show-sdk-path)/usr/include/c++/v1"
cargo install --path crates/cli --features metal
cargo tauri build --bundles app --features metal
cp -R target/release/bundle/macos/Minutes.app /Applications/Minutes.app
cd crates/mcp && npm install && npm run build
```

#### Breakdown: The block above covers all three (Tauri app, CLI, MCP):

| Line | What it does |
|---|---|
| `export CXXFLAGS=...` | Sets the C++ include path for whisper.cpp compilation |
| `cargo install --path crates/cli --features metal` | Builds + installs the CLI binary to `~/.cargo/bin/minutes` |
| `cargo tauri build --bundles app --features metal` | Builds the desktop `.app` bundle |
| `cp -R ... /Applications/Minutes.app` | Installs the desktop app |
| `cd crates/mcp && npm install && npm run build` | Builds the MCP server (TypeScript) |

One thing to be aware of: the `cd crates/mcp` means your shell ends up in that directory. If you want to run more commands from the project root afterward, you'd need to `cd` back. You could avoid that by replacing the last line with:

```bash
(cd crates/mcp && npm install && npm run build)
```

The parentheses runs it in a subshell so your working directory stays at the project root.


### Gotchas from previous install sessions

- **Homebrew conflict**: If you still have the Homebrew formula installed, its `/opt/homebrew/bin/minutes` may shadow `~/.cargo/bin/minutes`. Check `which minutes` after building. If it points to Homebrew, either `brew unlink minutes` or `brew uninstall silverstein/tap/minutes`.
- **Tauri CLI**: Must be the **cargo** binary (`cargo install tauri-cli`), not the npm `@tauri-apps/cli` package. If `cargo tauri` says "no such command", that's why.
- **Build times**: First build after a fresh pull with significant changes can take a while (whisper.cpp recompilation, Metal shader compilation). Subsequent rebuilds are incremental and much faster.
 - **Xcode update breaks Tauri build** (`library 'clang_rt.osx' not found`): The build cache has stale clang paths. Fix: `cargo clean` then rebuild. This happens when Xcode updates its clang version (e.g., 17 → 21) but cached build artifacts still reference the old path.

--- 

### Why TCC matters for Minutes

> TCC stands for **Transparency, Consent, and Control** — it's macOS's permission system that governs access to sensitive resources like the microphone, screen recording, input monitoring (keyboard), accessibility APIs, and camera.

The Tauri desktop app needs several of these permissions to function:
- **Microphone** — to record audio
- **Input Monitoring** — for the global dictation hotkey (Cmd+Shift+D)
- **Screen Recording** — for the optional screen context capture feature

#### The problem with `/Applications/Minutes.app`

macOS ties TCC permissions to the **bundle identifier** (`com.useminutes.desktop`). When you keep replacing `/Applications/Minutes.app` with new local rebuilds, macOS can get confused — sometimes it revokes permissions, sometimes it silently stops delivering events (like hotkey presses), sometimes it re-prompts you. This is because the code signature changes with each rebuild, but the bundle ID stays the same.

#### What the dev app script does

`./scripts/install-dev-app.sh` installs to a **separate identity**:

| | Production | Development |
|---|---|---|
| **Name** | `Minutes.app` | `Minutes Dev.app` |
| **Bundle ID** | `com.useminutes.desktop` | `com.useminutes.desktop.dev` |
| **Location** | `/Applications/Minutes.app` | `~/Applications/Minutes Dev.app` |

Because the dev app has its own bundle ID, it gets its **own** set of TCC permissions. You can rebuild and reinstall it repeatedly without disturbing the production app's permissions, and macOS treats it as a consistently-signed identity (especially if you set `MINUTES_DEV_SIGNING_IDENTITY`).

#### When you need this vs. when you don't

- **Just rebuilding to get latest features, testing transcription, searching meetings?** → `cp -R` to `/Applications` is fine. You're not testing permission-sensitive behavior.
- **Debugging why a hotkey doesn't fire, testing screen capture, investigating permission prompts?** → Use the dev app. Otherwise you'll chase ghosts caused by macOS TCC caching.

`★ Insight ─────────────────────────────────────`
This dual-identity pattern is a clever solution to a real macOS development pain point. Apple's TCC database (`/Library/Application Support/com.apple.TCC/TCC.db`) keys permissions on bundle ID + code signature hash. Ad-hoc signed local builds produce a new hash every time, so macOS treats each rebuild as a "new" app for permission purposes — even though the bundle ID is the same. The dev app script uses a consistent signing identity to keep the hash stable across rebuilds.
`─────────────────────────────────────────────────`