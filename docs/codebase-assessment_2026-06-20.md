# MINUTES - Codebase Assessment

## Mental Model
Minutes is built around `minutes-core`, not around the desktop app or CLI.

The main layers are:

- [crates/core/src/lib.rs](/Users/rymalia/projects/minutes/crates/core/src/lib.rs): shared engine for config, capture, transcription, diarization, summarization, search, jobs, events, live transcript, dictation, desktop context, graph, etc.
- [crates/cli/src/main.rs](/Users/rymalia/projects/minutes/crates/cli/src/main.rs): broad Clap CLI over `minutes-core`.
- [tauri/src-tauri/src/main.rs](/Users/rymalia/projects/minutes/tauri/src-tauri/src/main.rs): Tauri app bootstrap, tray/menu/window lifecycle, app state, plugins, hotkeys, update handling.
- [tauri/src-tauri/src/commands.rs](/Users/rymalia/projects/minutes/tauri/src-tauri/src/commands.rs): the desktop app’s command/RPC layer, wrapping core behavior in UI state machines.
- [tauri/src/index.html](/Users/rymalia/projects/minutes/tauri/src/index.html): the large browser-side desktop UI, polling Tauri commands and rendering status, meetings, Recall, settings, recovery, updates, etc.
- [crates/mcp/src/index.ts](/Users/rymalia/projects/minutes/crates/mcp/src/index.ts): MCP server that mostly shells out to the CLI and can delegate call recording to the running desktop app.

## Shared Flow
Both CLI and Tauri eventually converge on the same primitives:

1. Load [Config](/Users/rymalia/projects/minutes/crates/core/src/config.rs).
2. Preflight capture with [capture.rs](/Users/rymalia/projects/minutes/crates/core/src/capture.rs).
3. Create shared PID/metadata state via [pid.rs](/Users/rymalia/projects/minutes/crates/core/src/pid.rs).
4. Record to `~/.minutes/current.wav`.
5. Queue a background job in [jobs.rs](/Users/rymalia/projects/minutes/crates/core/src/jobs.rs).
6. Process through [pipeline.rs](/Users/rymalia/projects/minutes/crates/core/src/pipeline.rs): transcribe, diarize, summarize, save markdown.
7. Final source of truth is `~/meetings/*.md` plus sidecars like graph/context DBs and audio artifacts.

## CLI vs Desktop
The CLI is the stable automation surface. It owns commands like `record`, `stop`, `process`, `search`, `list`, `live`, `dictate`, `health`, `events`, `context`, `vault`, `setup`, etc. It uses foreground terminal flow plus sentinel files for stopping.

The Tauri app is the native UX shell. It uses the same core, but adds:

- tray/menu state
- windows and overlays
- global shortcuts
- native macOS call detection and call capture
- permission center/readiness UI
- Recall assistant PTY windows
- update UI
- desktop-only secure key hydration
- richer live/dictation lifecycle state

The app does not just exec the CLI for normal operations; it links `minutes-core` directly. The bundled CLI work is for keeping terminal users’ `minutes` binary in sync with app updates, not because the app depends on PATH.

## Coordination
The key coordination mechanism is file-backed local state under `~/.minutes`:

- `recording.pid`
- `recording-meta.json`
- `current.wav`
- `stop` / `extend` sentinels
- `processing-status.json`
- `jobs/*.json`
- `desktop-control/requests/*.json`
- `desktop-control/responses/*.json`
- `desktop-app.json`

That lets the CLI, MCP server, and desktop app coordinate without sharing a process. Example: `minutes stop` writes the stop sentinel; if the desktop app owns the recording PID, the CLI avoids SIGTERM and lets the app stop gracefully. MCP can write a desktop-control request so call recording is owned by the running Tauri app.

## Important Product Distinction
Call recording is intentionally not equal across surfaces.

The desktop app is the preferred owner for “record this call” because it has bundle identity, ScreenCaptureKit/native permissions, call detection UI, and source health UI. The CLI remains powerful and honest, but for call capture it needs loopback/system-audio routing such as BlackHole unless the request is delegated through the desktop app.

I also checked the repo docs around this, especially [docs/CALL-CAPTURE-DURABLE-PLAN.md](/Users/rymalia/projects/minutes/docs/CALL-CAPTURE-DURABLE-PLAN.md), [docs/CLI-DUAL-SOURCE-CAPTURE-PLAN.md](/Users/rymalia/projects/minutes/docs/CLI-DUAL-SOURCE-CAPTURE-PLAN.md), and [docs/DESKTOP-DEVELOPMENT.md](/Users/rymalia/projects/minutes/docs/DESKTOP-DEVELOPMENT.md).
