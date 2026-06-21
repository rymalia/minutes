---
title: Minutes — Architecture Reference
description: Deep-dive reference for the Minutes codebase — three front-ends over minutes-core, the coordination layer, the processing pipeline, the live/streaming subsystem, transcription engines (incl. the Parakeet sidecar fallback chain), versioning, and compile-time features.
date: 2026-06-21
assessed_version: "0.18.14"
assessed_commit: 8a45434
branch: main
method: "learn-codebase deep dive — direct file reads + parallel survey agents; all structural claims grounded in source"
companion_diagrams:
  - docs/diagrams/minutes-build-link-run.html
  - docs/diagrams/minutes-parakeet-fallback.html
caveat: "Line numbers are approximate to the assessed version and drift over time — treat them as 'start reading here,' not gospel. Re-verify before relying on a specific line."
---

# Minutes — Architecture Reference

> Deep-dive reference covering how Minutes is structured: the three front-ends, the shared
> `minutes-core` engine, how they coordinate, the processing pipeline, the live/streaming
> subsystem, the transcription engines (including the Parakeet sidecar fallback chain), versioning,
> and how compile-time features work.

**How to read this doc.** It is organized from the outside in: the big-picture mental model first,
then the coordination layer, then each subsystem. Every structural claim is grounded with a
`file:line` reference so you can jump straight to the source. Line numbers reflect the repo around
version `0.18.14`; they drift over time — treat them as "start reading here," not gospel.

**Companion diagrams** (interactive HTML, open in a browser):
- Build → link → run + the three front-ends: [`docs/diagrams/minutes-build-link-run.html`](diagrams/minutes-build-link-run.html)
- Parakeet sidecar fallback chain + state machine: [`docs/diagrams/minutes-parakeet-fallback.html`](diagrams/minutes-parakeet-fallback.html)

---

## Table of contents

1. [The one-paragraph mental model](#1-the-one-paragraph-mental-model)
2. [The three front-ends and `minutes-core`](#2-the-three-front-ends-and-minutes-core)
3. [Build → link → run](#3-build--link--run)
4. [Versioning](#4-versioning)
5. [The coordination layer (`~/.minutes/`)](#5-the-coordination-layer-minutes)
6. [Recording lifecycle: the async/sync split](#6-recording-lifecycle-the-asyncsync-split)
7. [The processing pipeline](#7-the-processing-pipeline)
8. [The live / streaming subsystem](#8-the-live--streaming-subsystem)
9. [Transcription engines & the Parakeet fallback chain](#9-transcription-engines--the-parakeet-fallback-chain)
10. [Diarization & speaker attribution](#10-diarization--speaker-attribution)
11. [Summarization & structured extraction](#11-summarization--structured-extraction)
12. [The MCP server](#12-the-mcp-server)
13. [Compile-time features (per binary) & how to verify](#13-compile-time-features-per-binary--how-to-verify)
14. [Key file map](#14-key-file-map)

---

## 1. The one-paragraph mental model

There are **three front-ends** — the `minutes` **CLI**, the **Tauri desktop app**, and the **MCP
server** — sitting on top of one shared Rust engine, **`minutes-core`**. The CLI and the Tauri app
both *statically link* `minutes-core` and call it **directly, in-process**; they are *peers*, not
layers — neither shells out to the other to do work. They coordinate entirely through **shared
files under `~/.minutes/`** (PID files, an event log, a job queue, file-based IPC). The MCP server
is the odd one out: it is **TypeScript**, embeds no Rust, and reaches the engine by **shelling out
to the `minutes` CLI** (plus reading meeting markdown directly via the `minutes-sdk` reader).

---

## 2. The three front-ends and `minutes-core`

| Crate | Path | Kind | Produces | Depends on core via |
|-------|------|------|----------|---------------------|
| `minutes-core` | `crates/core/` | **library crate** | `.rlib` (cannot run) | — |
| `minutes-cli` | `crates/cli/` | binary crate | `minutes` | `path = "../core"` |
| `minutes-app` | `tauri/src-tauri/` | binary crate | `minutes-app` | `path = "../../crates/core"` |
| `minutes-mcp` | `crates/mcp/` | TypeScript (npm) | `dist/index.js` | **shells out** to `minutes` CLI |
| `minutes-sdk` | `crates/sdk/` | TypeScript (npm) | `dist/` | read-only markdown parser |
| `minutes-reader` | `crates/reader/` | Rust library | read-only parser (no audio deps) | — |
| `whisper-guard` | `crates/whisper-guard/` | Rust library | anti-hallucination toolkit | independent cadence |

Workspace members are declared in the root `Cargo.toml` (`[workspace] members = [...]`).

**`minutes-core` is the engine.** It is ~34 modules covering capture, transcription, diarization,
summarization, the pipeline orchestrator, and all the coordination primitives. Its public surface
and feature gating live in `crates/core/src/lib.rs`. Notable re-exports: `Config`, `process`,
`CaptureMode`, `Template`. Feature-gated modules (`streaming`, `whisper`, `vad-ort`, `diarize`,
hotkeys) are conditionally compiled — see `lib.rs:48-101`.

**The CLI** (`crates/cli/src/main.rs`, ~9k lines) is a `clap` dispatcher. "clap" = Command Line
Argument Parser, the Rust library that turns typed args into structured commands and generates
`--help`/validation. The CLI defines ~50 subcommands (`record`, `stop`, `live`, `note`, `watch`,
`search`, `setup`, `dictate`, `capabilities`, …); each handler is a thin wrapper that loads
`Config`, applies CLI overrides, and calls a `minutes_core::*` function.

**The Tauri app** (`tauri/src-tauri/src/`) is a menu-bar app. `main.rs` (~2.8k lines) builds the
tray, windows, plugins, and background loops; `commands.rs` (~15k lines) holds ~100 `#[tauri::command]`
functions (`cmd_*`) that the WebView UI invokes. The overwhelming majority call `minutes_core::*`
directly in-process. The **only** time the app executes the `minutes` binary is a 1-second
`--version` probe in `cli_setup.rs`; the only subprocesses it *spawns* are **agent CLIs**
(`claude`/`codex`) in a PTY for the Recall assistant (`pty.rs`) — never `minutes` for transcription.

---

## 3. Build → link → run

`minutes-core` is a **library crate**: it has no `main()` and compiles to a `.rlib` (Rust static
library), so it cannot run on its own. The CLI and app are **binary crates** that depend on it via a
local **`path` dependency**. At **link** time the compiler copies core's compiled code *into* each
binary (static linking) — so **each binary carries its own embedded copy of core**.

```
SOURCE (one checkout @ 0.18.14)        COMPILE                 LINK (static)            INSTALL (separate channels)
  crates/core/  (lib, no main) ───►  libminutes_core-*.rlib ─┬─► minutes      (~32 MB) ─► ~/.local/bin/minutes
  crates/cli/   (bin "minutes") ─────────────────────────────┤                            ~/.cargo/bin/minutes
  tauri/src-tauri/ (bin "minutes-app") ──────────────────────┴─► minutes-app  (~47 MB) ─► /Applications/Minutes.app/
                                          (release: strip=true, lto=thin)                   Contents/MacOS/minutes-app
```

**Single in source, replicated in the binaries.** There is exactly one `minutes-core` codebase, but
its compiled code is baked into each binary independently. There is **no** shared `minutes-core` file
loaded at runtime, and you will **never** see a `minutes-core` process — only `minutes` /
`minutes-app` (and possibly `example-server`, `claude`). The `.rlib` files under
`target/release/deps/libminutes_core-*.rlib` are build intermediates, never installed.

This is the structural reason **compile-time features are per-binary** (see §13): each embedded copy
of core was compiled with its own feature flags.

> **Verification footnote.** `nm` on the installed release binaries shows *0* `minutes_core` symbols —
> not because core isn't embedded, but because `[profile.release] strip = true` removes symbol names.
> The binary sizes (32 MB CLI, 47 MB app) are the real evidence of embedding.

---

## 4. Versioning

Versioning is set at the **workspace level** — one number that core and the CLI inherit:

| Crate / artifact | How it declares version | Resolves to |
|------------------|------------------------|-------------|
| `[workspace.package]` (root `Cargo.toml`) | literal — single source of truth | **0.18.14** |
| `crates/core` | `version.workspace = true` | 0.18.14 |
| `crates/cli` | `version.workspace = true` | 0.18.14 |
| `tauri/src-tauri/Cargo.toml` | `version = "0.1.0"` (vestigial, not user-facing) | 0.1.0 |
| `tauri/src-tauri/tauri.conf.json` | the **real** app version (hand-synced) | 0.18.14 |
| `crates/mcp/package.json`, `crates/sdk/package.json`, `manifest.json` | npm/bundle manifests | 0.18.14 |
| `crates/whisper-guard` | **independent cadence** — bumped/published separately | 0.3.0 |

The CLI's dependency line `minutes-core = { path = "../core", version = "0.18.6", ... }` carries a
`version` *floor* that only matters for crates.io publishing; for a `path` build Cargo always uses the
local source. The release checklist (`docs/RELEASE.md`) keeps the user-facing version sources in sync.

**Can the CLI and app be out of sync?** Two different axes:

- **Within one checkout → No.** Both use a `path` dep on the *same* `crates/core/`, and core inherits
  the one workspace version. At a given commit there is exactly one core source, so both binaries
  embed an identical core. They cannot diverge from the same tree.
- **Across install moments → Yes.** The installed CLI and app update through *separate channels* (the
  app via its in-app updater/DMG; the CLI via `cp`/`cargo install`/`brew`), so the artifacts on disk
  drift. Real example observed on a dev machine: two CLIs at `0.18.6` and `0.18.5`, plus an app
  executable built on a third date. After an in-app update, re-sync the CLI separately
  (e.g. `brew upgrade minutes`).

---

## 5. The coordination layer (`~/.minutes/`)

All cross-process coordination is files under `~/.minutes/` (`Config::minutes_dir()`), owned by three
core modules. There is **no socket/RPC between the front-ends** (except the Parakeet sidecar's
internal socket, §9).

### `pid.rs` — flock'd PID files + state sidecars

State machine: `[none] → create → [recording] → remove → [none]`, with a `[stale] → cleanup` branch
for dead processes (`pid.rs:7-21`). Files (all under `~/.minutes/`):

| File | Purpose | Ref |
|------|---------|-----|
| `recording.pid` | batch recording lock (fs2 flock, atomic) | `pid.rs:24` |
| `dictation.pid` | dictation lock | `pid.rs:29` |
| `live-transcript.pid` | live transcript lock | `pid.rs:34` |
| `live-transcript.jsonl` / `.wav` / `-status.json` | live transcript stream + audio + status sidecar | `pid.rs:39-51` |
| `recording-meta.json` | the `CaptureMode` + desktop-context session id | `pid.rs:54`, `:101` |
| `current.wav` | in-progress capture audio | `pid.rs:59` |
| `last-result.json` | recorder → `stop` handoff | `pid.rs:64` |
| `processing-status.json` | processing stage owner | `pid.rs:69`, `:108` |

`CaptureMode` (`pid.rs:73`): `Meeting | QuickThought | Dictation | LiveTranscript`. Reads use
`inspect_pid_file().is_active()` (not a plain PID read) so a Windows mandatory-locked file is still
detected (issue #258). Both the CLI and the app go through these same functions, so each sees the
other's sessions.

### `desktop_control.rs` — file-based IPC (CLI/agent → running app)

When a CLI command or MCP tool wants the **running app** to act (e.g. start a recording that needs
system-audio capture), it uses a request/response directory under `~/.minutes/desktop-control/`:

- The app writes a heartbeat `desktop-app.json` (`write_desktop_app_status`, `:78`).
  `desktop_app_owns_pid(pid)` (`:102`) trusts it only if the PID matches **and** it's ≤10s old.
- Requesters drop `requests/{id}.json` (`write_request`, `:122`); the app's 2s poll **claims** it via
  atomic rename (`claim_pending_requests`, `:156` — single-claim guarantee) and writes
  `responses/{id}.json`.
- This is why `minutes stop` checks `desktop_app_owns_pid()` first: if the app owns the recorder it
  stops via **sentinel only**, never SIGTERM (don't kill the app's recorder).

### `events.rs` — append-only JSONL event bus

`~/.minutes/events.jsonl` with a monotonic `seq` (backed by an `events.seq` sidecar + `events.lock`
flock; rotates at 10 MB). Event types include `recording.started/completed`, `AudioProcessed`,
`NoteAdded`, `live.utterance.final`, `meeting.insight.detected`, and `agent.annotation`
(`MinutesEvent`, `events.rs:261-368`). `read_events_since_seq` is the stable cursor for agent
reactivity. `agent.annotation` events let external agents annotate meetings **without mutating
markdown**, gated by a `~/.minutes/agents.allow` allowlist (`append_agent_annotation`, `:479`).

### `jobs.rs` — background job queue

One JSON file per job at `~/.minutes/jobs/<id>.json` (not JSONL, not sqlite). `record` enqueues and
returns; a flock-guarded `process-queue` worker drains it. See §6.

---

## 6. Recording lifecycle: the async/sync split

The single most important behavioral asymmetry in the system:

- **`minutes record` is asynchronous.** On stop it does *not* transcribe. It moves the in-flight WAV
  (+ per-source stems + screenshots) into the jobs dir, writes a `Queued` `jobs/<id>.json`, and
  returns immediately (`jobs::queue_live_capture`, `jobs.rs:152`). A detached `process-queue` worker
  (`spawn_queue_worker` via `std::env::current_exe()`) drains the queue later. `minutes stop` polls
  for the PID file to disappear and prints `last_result_path` contents.
- **`minutes process <file>` is synchronous.** It runs the full pipeline in-process via
  `pipeline::process_with_template`.

So a `record`/`stop` pair coordinates across **three processes**: the recorder, the `stop` command,
and the queue worker — all communicating through `~/.minutes/` files. The Tauri app uses the **same**
`jobs` queue (it has a `--process-queue-worker` mode and an in-process `spawn_processing_worker`), so
a CLI `stop` can surface a job the app enqueued, and vice versa.

The worker (`process_pending_jobs`, `jobs.rs:1187`) runs each job inside `catch_unwind`, so a
whisper/parakeet FFI panic becomes a `Failed` job, not a worker crash. Dead-`owner_pid` jobs are
re-queued with `retry_count++`; beyond `MAX_AUTO_RETRIES` (2) they're demoted to `Failed` to break
SIGABRT loops (issue #229).

---

## 7. The processing pipeline

`pipeline.rs` (~6.7k lines) is the orchestrator. Two entry surfaces share the same internals:

- **Synchronous:** `process` → `process_with_template` → `process_with_progress_and_sidecar`.
- **Background (record path):** split into `transcribe_to_artifact` (`pipeline.rs:1367`) then
  `enrich_transcript_artifact` (`:1656`), with a transcript-only `.md` persisted between them so a
  worker crash still leaves a recoverable artifact.

Stage order (`PipelineStage`: `Transcribing | Diarizing | Summarizing | Saving`):

1. Guard + recording-date inference + calendar match (`select_calendar_event`).
2. Build `DecodeHints` from title/calendar/attendees/vocabulary (lexical priming).
3. **Decode + resample + transcribe** via `transcription_coordinator::transcribe_path_for_content_with_hints` (decode ffmpeg→symphonia, 16 kHz mono, whisper/parakeet, whisper-guard cleanup — §9).
4. All-noise suppression gate (`suppress_if_all_noise`, shared between both entry points).
5. **Write transcript-only artifact** (status `NoSpeech` or `TranscriptOnly`).
6. **Diarize** (meeting + engine ≠ none) → `speaker_map` (§10).
7. Gather screen context (optional screenshots).
8. **Summarize** (§11) → action items, decisions, intents.
9. **Speaker attribution** L0–L3 — rewrites High-confidence names into the transcript (§10).
10. Status + warnings (`Complete` / `Degraded` / `TranscriptOnly`), then **save** markdown.
11. Side effects: title generation, voice-embedding persistence (L3), insight events.

**Output** is markdown + YAML frontmatter written with `0o600` perms (`0o640` for `Visibility::Team`)
to `~/meetings/` (`markdown.rs`, `ContentType` routes Meeting/Memo/Dictation). Frontmatter is the
canonical data model: `action_items`, `decisions`, `intents`, `speaker_map`, `recording_health`, etc.
Schema: `docs/frontmatter-schema.md`.

---

## 8. The live / streaming subsystem

Shared by the CLI (`minutes live`, `minutes dictate`) and the app. Requires `streaming` + `whisper`
features (`lib.rs:75-84`).

- **`live_transcript::run`** (`live_transcript.rs:568`) — the live loop: start audio stream first
  (before truncating files), acquire `live-transcript.pid` via flock for session exclusivity, then
  capture → VAD → per-utterance transcribe → append a line to `live-transcript.jsonl`. Each finalized
  line also emits a `live.utterance.final` event (agent reactivity without polling). Status is written
  to a sidecar (`Starting | Healthy | Failed | Stopped`, 1s heartbeat).
- **Delta reads:** `read_since_line` (line cursor), `read_since_duration` (wall-clock), `session_status`.
  The CLI `minutes transcript --since X --format json` exposes these.
- **Agent-agnostic:** the JSONL is a plain file any process can tail — CLI `minutes transcript`, the
  Tauri assistant (which injects `<!-- LIVE_TRANSCRIPT_START/END -->` markers into the assistant
  workspace `CLAUDE.md`), the MCP `read_live_transcript` tool (which shells out to the CLI), or any
  raw reader.
- **Two paths share one writer:** standalone (`run_inner`, energy VAD) and recording-sidecar
  (`run_sidecar_inner_mpsc`, fed by the capture callback over an `mpsc`, uses the richer
  `RecordingSidecarVad`). The recording-sidecar runs transcription on a worker thread behind a bounded
  queue; a slow engine drops the newest utterance rather than starving capture.
- **`streaming.rs`:** `AudioStream` (bounded crossbeam channel of ~6.4s of 100 ms chunks) and
  `MultiAudioStream` (voice mic + system/call audio merged). Mic-mute uses an `AtomicBool` fast-path
  plus a `~/.minutes/mic_mute` sentinel file for cross-process toggling; muted voice chunks are zeroed
  but call audio always flows.
- **`dictation.rs`:** speak → transcribe → clipboard + daily note. Differs from live transcript: it
  has a silence timeout, caches the whisper model across sessions, yields to recording, and writes to
  clipboard/daily-note rather than a streaming JSONL.

---

## 9. Transcription engines & the Parakeet fallback chain

Engine is chosen at **runtime** from `config.transcription.engine` in `transcribe_dispatch`
(`transcribe.rs:330`): `"whisper"` (default), `"parakeet"`, `"apple-speech"` (falls back to whisper
for batch), unknown → whisper.

- **Whisper** is linked in-process via `whisper-rs` (whisper.cpp). The model loads into the host
  process and stays. GPU is a **compile-time** feature (`metal`/`cuda`/…), surfaced via
  `whisper_context_params` (`transcribe.rs:733`), not runtime config.
- **whisper-guard** anti-hallucination cleanup runs in
  `transcription_coordinator::run_transcript_cleanup_pipeline`: dedup → interleaved-dedup →
  strip-foreign-script → collapse-noise-markers → trim-trailing-noise.
- **Decode:** ffmpeg preferred (`decode_with_ffmpeg`), symphonia fallback — ffmpeg avoids symphonia's
  AAC decoder triggering hallucination loops on non-English audio (issue #21).

### Parakeet has no in-process model — hence a 3-layer fallback chain

Parakeet uses the external `parakeet.cpp` binaries, so `transcribe_with_parakeet`
(`transcribe.rs:1802`) tries three execution layers in order. **The entire chain only runs in a
binary compiled with `--features parakeet`**; otherwise `transcribe_parakeet_dispatch`
(`transcribe.rs:673`) returns `EngineNotAvailable("parakeet")` at `:723`.

| Layer | What | Keeps model warm? | Code |
|-------|------|-------------------|------|
| **1 · warm sidecar** | `example-server` long-lived process, JSON over a Unix socket | **Yes** | `transcribe_via_global_sidecar`, `parakeet_sidecar.rs:1251` |
| **2 · helper** | spawn `minutes parakeet-helper` child = one parakeet.cpp call, crash-isolated | No | `transcribe.rs:1931` |
| **3 · direct** | spawn the `parakeet` binary directly | No | `run_parakeet_cli_structured` |

Flow: `transcribe_with_parakeet` first checks `sidecar_enabled_effective` (`parakeet_sidecar.rs:1631`
— explicit config wins; else auto = feature compiled **and** engine/live backend is parakeet **and**
`example-server` resolves). If on, it tries **Layer 1**; on `Err` it logs `"falling back to
subprocess"` and continues. **Layer 2** runs only if `helper_allowed` (`hints.is_empty()` and no
`MINUTES_PARAKEET_FORCE_DIRECT`/`MINUTES_PARAKEET_HELPER_ACTIVE` env, `transcribe.rs:1927`) and the
`minutes` binary resolves; a non-zero exit logs once and falls to **Layer 3**, the unconditional floor.

**What "sidecar" means here:** a long-lived companion *process* (`example-server`) that holds the
model resident and answers requests over a Unix domain socket — borrowed from the microservices
sidecar pattern. It exists because Layers 2/3 reload the multi-hundred-MB model on every call, which
is fatal for live transcription. (Note: "sidecar" is overloaded in this repo — it also means companion
*files* like `live-transcript-status.json`, and the *recording-sidecar* live-transcript mode. Those
are unrelated to this process.)

**Sidecar state machine** (`SidecarState`, `parakeet_sidecar.rs:172`): `Cold → Starting → Healthy →
SubprocessOnly | Stopping`. `start_once` (`:463`) spawns
`example-server <socket> <model> <vocab> --model <id> [--gpu] [--fp16] [--vad]`, then runs a
`__minutes_healthcheck__` (must answer within 30s). A request failure restarts the server once
(`:297`); a second failure trips `SubprocessOnly`, handing control back to Layers 2/3.

**FP16 sticky-downgrade:** on Apple Silicon the sidecar launches with `--fp16`, but MPSGraph crashes
on some shapes. `classify_start_failure` (`:1105`) matches signatures (`MPSGraph`, `requires the same
element type`, …), downgrades to fp32, and **persists a fingerprint** to
`parakeet-fp16-blacklist.json` (`remember_fp16_downgrade`, `:585`) so future launches skip fp16.
Reset via `parakeet_fp16_blacklist_reset`.

**Socket protocol** (`request_sidecar`, `:1007`): newline-delimited JSON.
Request `{request_id, audio_path, decoder, timestamps, use_vad, beam_width, lm_path, lm_weight,
boost_phrases, boost_score}` → Response `{ok, request_id, text, elapsed_ms, word_timestamps, error}`.
Audio is passed **by file path**, not streamed. Request timeout = `(audio_secs × 2).clamp(120s,30min)`.

**Ownership:** `global_manager()` is a per-process `OnceLock<Mutex<…>>` — the CLI and the app each own
a **separate** `example-server`; live sessions warm it at start (`warmup_global_sidecar`, `:1269`).

Binary/helper resolution order:
- Layer 1 server: `MINUTES_PARAKEET_SERVER_BINARY` → `which("example-server")` → sibling
  `example-server` next to the resolved parakeet binary (`resolve_server_binary`, `:1219`).
- Layer 2 helper: `MINUTES_PARAKEET_HELPER` → `current_exe()` if named "minutes" → `which("minutes")`
  (`resolve_minutes_parakeet_helper`, `transcribe.rs:2462`).
- Layer 3 binary: `resolve_parakeet_binary(..., WarnAndFallback)` (`parakeet.rs:227`).

> See `docs/PARAKEET.md` for installation; the sidecar `imp` module is gated
> `#[cfg(all(feature = "parakeet", unix))]`.

---

## 10. Diarization & speaker attribution

`diarize.rs` (~4k lines), behind the `diarize` feature.

- **ML path** (`diarize_with_pyannote_rs`): ONNX segmentation (`segmentation-3.0.onnx`) + embedding
  (`wespeaker_en_voxceleb_CAM++.onnx`) via `ort`, custom clustering against
  `config.diarization.threshold`. Runs in a panic-isolated thread.
- **Energy/stem path** (no ML): when native call capture writes per-source stems
  (`.voice.wav` / `.system.wav`), label `SPEAKER_0` = you, `SPEAKER_1` = remote by louder stem.
- **Attribution confidence** L0–L3 (`attribute_meeting_speakers`, `pipeline.rs:1066`):
  - **L2 (voice enrollment)** first — match embeddings vs `voices.db` → High.
  - **L0 (deterministic 1-on-1)** — 2 trusted attendees + 2 speakers → Medium.
  - **L1 (LLM)** — `summarize::map_speakers` → Medium (capped).
  - **L3 (confirmed learning)** — confirmed embeddings saved to `voices.db` for future L2 matches.
- **The rewrite rule:** `apply_confirmed_names` rewrites `[SPEAKER_X]` labels to real names **only for
  `Confidence::High`** — "wrong names are worse than anonymous." `speaker_map` in YAML is the canonical
  attribution record. `voices.db` is separate from `graph.db` (which wipes on rebuild).

---

## 11. Summarization & structured extraction

`summarize.rs` (~3.1k lines). `summarize_with_template` returns `Option<Summary>` — **`None` degrades
gracefully** and the pipeline continues.

Engine on `config.summarization.engine`:
- `"none"` → the **Claude-via-MCP path**: no summary generated here; Claude summarizes on demand via
  MCP (no API key needed).
- `"auto"` → probe for an agent CLI (`claude > codex > gemini > opencode`) and run it under its own
  subscription auth.
- `"claude"/"openai"/"mistral"/"ollama"/"openai-compatible"` → HTTP via `ureq` (no secrets in argv).
  Key-requiring engines error (swallowed to `None`) only if explicitly selected without the key.

Structured extraction parses the summary into typed `action_items`, `decisions`, and `intents`
(`pipeline.rs:3932-4040`), normalized against `speaker_map`. Speaker mapping (L1) also lives here
(`map_speakers`), routed through the agent path even when `engine == "none"` so MCP users still get names.

---

## 12. The MCP server

`crates/mcp/src/index.ts` (~3.6k lines) — 31 tools + 7 resources for Claude Desktop / Code. It is the
third consumer but **does not link `minutes-core`** (it's TypeScript). It either:

- **shells out** to the CLI via `execFile` (`minutes search --json`, `minutes get`, `minutes
  capabilities`, …) — `findMinutesBinary()` (`index.ts:478`) probes `target/`, `~/.cargo/bin`,
  `~/.local/bin`, Homebrew dirs, then PATH; or
- **reads markdown directly** via `minutes-sdk`'s `reader.ts` (a parity-mirror of the Rust
  `minutes-reader`, down to `humanizeTranscript` only renaming `confidence: "high"` speakers).

**Feature detection contract:** at boot it runs `minutes capabilities --json` and registers tools per
feature key (rejecting `api_version > 1`). The CLI's `build_capability_report` (`main.rs:4900`) is the
authority: feature keys map 1:1 to MCP tool names, and the policy is "add the key in the same commit
as the subcommand." `parakeet`/`diarize` keys come from `cfg!(feature = ...)` (`main.rs:4949`).

**Recording control:** delegates to the app via the `desktop_control` file IPC when running inside the
Claude Desktop `.mcpb` extension or for `call` intent (the CLI can't capture system audio); otherwise
`spawn(minutes record)` **non-detached** — a detached `setsid()` would create a new macOS audit
session and sever the inherited TCC mic grant → silent recordings.

The **MCP App dashboard** (`crates/mcp/ui/`) builds to a single self-contained HTML via vite
(`vite-plugin-singlefile`), served through the `ui://minutes/dashboard` resource. `npm run build` =
`tsc && vite build`; `npm run build:ui` = vite only.

---

## 13. Compile-time features (per binary) & how to verify

Transcription/diarization backends and GPU acceleration are **compile-time Cargo features on
`minutes-core`**, enabled **independently per binary** by re-exporting to core:

```
crates/cli/Cargo.toml       parakeet = ["minutes-core/parakeet"]   # build:  cargo build --features parakeet
tauri/src-tauri/Cargo.toml  parakeet = ["minutes-core/parakeet"]   # build:  TAURI_FEATURES="parakeet" cargo tauri build
```

Because the app links core directly and transcribes in-process, **enabling Parakeet in the CLI does
not enable it in the app** (and vice versa). Each binary must be compiled with the feature. Same for
`diarize`, `whisper`, and GPU backends. This is why the build docs insist on rebuilding *all* affected
targets after a core change.

**How to verify what a binary was built with:**

| Binary | Command / location | Read |
|--------|--------------------|------|
| **CLI** | `minutes capabilities --json` | `.features.parakeet` / `.features.diarize` (true/false) |
| | `which minutes` first | there can be several `minutes` binaries; check the one on PATH |
| **App** | open the app → **Settings → Transcription** | the `parakeet_compiled` field (`cmd_get_settings`, `commands.rs:8455`) |

There is **no** `capabilities` subcommand on the `minutes-app` binary itself — it only recognizes
internal flags (`--diagnose-hotkey`, `--process-queue-worker`). The app reports its feature state
through the Settings UI, not the terminal.

**"Compiled in" ≠ "ready to run."** `parakeet: true` only means the binary *can* dispatch to Parakeet.
Actually transcribing also needs the `parakeet`/`example-server` binaries on PATH and a downloaded
model (`minutes setup --parakeet`, `minutes health`; the app's `parakeet_status` field reports runtime
readiness).

---

## 14. Key file map

```
crates/core/src/
  lib.rs                       # public surface + feature gating
  config.rs                    # TOML config + compiled defaults
  pid.rs                       # PID files + flock + state sidecars  (§5)
  desktop_control.rs           # file-based IPC: CLI/agent → running app  (§5)
  events.rs                    # append-only JSONL event bus  (§5)
  jobs.rs                      # background job queue (record → worker)  (§6)
  pipeline.rs                  # orchestrator: WAV → markdown  (§7)
  capture.rs                   # audio capture, RecordingIntent, lifecycle
  streaming.rs                 # AudioStream / MultiAudioStream + mic-mute  (§8)
  live_transcript.rs           # live loop, JSONL, delta reads  (§8)
  dictation.rs                 # dictation mode  (§8)
  transcribe.rs                # engine dispatch, whisper, parakeet fallback  (§9)
  parakeet_sidecar.rs          # example-server warm sidecar + FP16 downgrade  (§9)
  transcription_coordinator.rs # whisper-guard cleanup + parakeet warmup/health
  diarize.rs                   # diarization + attribution types  (§10)
  summarize.rs                 # LLM summarization + speaker mapping  (§11)
  markdown.rs                  # YAML frontmatter + write (0600)
  voice.rs                     # voices.db enrollment/matching

crates/cli/src/main.rs         # clap dispatcher, ~50 subcommands
tauri/src-tauri/src/
  main.rs                      # tray, windows, plugins, background loops
  commands.rs                  # ~100 cmd_* functions
  cli_setup.rs                 # bundles/symlinks the CLI (macOS); --version probe
  pty.rs                       # spawns agent CLIs (claude/codex) for Recall
  context.rs                   # singleton assistant workspace (~/.minutes/assistant/)
crates/mcp/src/index.ts        # MCP server: 31 tools, shells out to CLI  (§12)
crates/sdk/src/reader.ts       # TS markdown parser (mirror of minutes-reader)
```

Runtime state lives under `~/.minutes/` (PID files, events, jobs, desktop-control, voices.db,
overlays.db, live-transcript.*) and `~/meetings/` (the markdown corpus — the canonical product output).

---

*Generated from a `learn-codebase` deep dive. All structural claims grounded in direct file reads;
line numbers are approximate to repo version 0.18.14 and drift over time.*
