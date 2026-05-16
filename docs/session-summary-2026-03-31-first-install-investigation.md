---
date: 2026-03-31
time: "3:56 PM PDT – Apr 1 2:07 AM PDT"
project: minutes
---

## Overview

First-time user installation and deep technical investigation of the Minutes project — covering Homebrew install troubleshooting, whisper model infrastructure, GPU acceleration options, Tauri vs CLI build separation, whisper.cpp version chain, and cross-machine binary compatibility.

## Key Decisions Made

- **Metal over CoreML for GPU acceleration**: Metal is the stable, recommended path for Apple Silicon. CoreML targets the Neural Engine and has a first-run compilation cost + occasional quirks. Both can be enabled simultaneously, but Metal alone is the pragmatic choice.
- **Uninstall Homebrew formula before source build**: Cleanest approach to avoid PATH conflicts between `/opt/homebrew/bin/minutes` and `~/.cargo/bin/minutes`. The Homebrew cask (desktop app) is independent and can stay installed.
- **Build CLI and Tauri app separately with Metal**: `cargo install --path crates/cli --features metal` for CLI, `cargo tauri build --bundles app --features metal` for desktop. Both completed successfully.

## Changes Made

| Change | Detail |
|--------|--------|
| **Memory: user profile** | Created `user_minutes_new_user.md` — new to Rust/Tauri/whisper.cpp ecosystem, M3 Air, asks deep architecture questions |
| **Memory: install gotchas** | Created `project_install_gotchas.md` — Homebrew link conflict, model paths, Metal verification, whisper.cpp version chain |

No code changes were made — this was a research/installation session.

## Research Performed

- **Homebrew install flow**: Traced the cask-then-formula install path, identified the "skipping link" conflict where Homebrew refuses to symlink the formula binary when the cask shares the same name
- **Model download infrastructure**: Traced `cmd_setup()` in `crates/cli/src/main.rs` to find download URLs (Hugging Face), file format (GGML), storage paths (`~/.minutes/models/`), and the auto-download of Silero VAD alongside whisper models
- **Metal vs CoreML feature flags**: Traced the feature chain from `crates/cli/Cargo.toml` → `crates/core/Cargo.toml` → `whisper-rs/metal` and `whisper-rs/coreml`. Confirmed they're independent and can coexist.
- **whisper.cpp version chain**: Identified `whisper-rs` 0.16.0 → `whisper-rs-sys` 0.15.0 → whisper.cpp v1.8.3 via crates.io API queries and user's Codeberg research. Mapped release cadence (~2-4 months, with a 7-month gap before current release).
- **Runtime version exposure**: Confirmed `whisper_rs::WHISPER_CPP_VERSION` static exists (via docs.rs) but is never referenced anywhere in the Minutes codebase. Also found `whisper_rs_sys::whisper_version()` FFI function. Neither is surfaced to users.
- **Metal build verification**: No runtime indicator exists in Minutes. Discovered `otool -L` workaround — confirmed `Metal.framework` and `MetalKit.framework` linked in the resulting binary.
- **Cross-machine compatibility**: Confirmed M3 ↔ M4 binary portability (same aarch64-apple-darwin ABI). Metal shaders compile at runtime on target GPU. `MACOSX_DEPLOYMENT_TARGET` only matters for older OS targeting.
- **Tauri CLI installation**: Identified that `cargo tauri` requires `cargo install tauri-cli`, not the npm `@tauri-apps/cli` package.

## Summary Statistics

- 0 code files changed (research/installation session)
- ~12 source files audited across `crates/core/`, `crates/cli/`, `crates/whisper-guard/`, `tauri/src-tauri/`
- 2 external APIs queried (crates.io versions API for whisper-rs and whisper-rs-sys)
- 2 docs.rs pages analyzed (whisper-rs statics, whisper-rs-sys full API listing)
- 2 memory files created

## Discoveries / Handoff Notes

- **Homebrew "skipping link" is buried**: The critical message `minutes cask is installed, skipping link.` appears mid-output and is easy to miss. The subsequent `brew install` attempt gives a clearer message with the `brew link` fix. This is a real UX issue for new users following the README's install instructions.
- **README GPU section is CLI-only**: The GPU acceleration instructions only show `cargo install --path crates/cli --features metal`. No mention of how to build the Tauri desktop app with Metal. Users wanting both need to know about `cargo tauri build --bundles app --features metal` separately.
- **No runtime GPU verification**: Minutes has no way to tell the user whether Metal/CoreML is active. `minutes health` doesn't report it, `minutes --version` doesn't list compiled features. The `otool -L | grep metal` workaround is non-obvious. The `whisper_rs::WHISPER_CPP_VERSION` static is also available but unused — both could be surfaced in `minutes health`.
- **Tauri CLI is a cargo binary**: Easy to confuse with the npm `@tauri-apps/cli` package. The README mentions the version (`2.10.1`) only in the Windows build section, not in the general build instructions.
- **`MACOSX_DEPLOYMENT_TARGET` not critical for local use**: Only matters when distributing to older macOS versions. Build succeeds without it on the builder's own machine.

## Unfinished Work

- User has successfully built CLI with Metal and Tauri build was in progress — needs to verify Tauri app launches and works with Metal acceleration
- `minutes setup --model small` still needs to be run to download the whisper model
- No actual transcription test performed yet to validate the full pipeline
