---
session_id: 3d2b1f5c-7cd6-4f76-8f2f-a34da9c63a16
date: 2026-06-23
time: "Jun 21 11:47 PM PDT – Jun 23 7:20 AM PDT"
project: minutes assistant
path: /Users/rymalia/.minutes/assistant/
---

## Overview

Explored how Minutes' `live` transcription differs from `record`, then turned the session into an engine-detection exercise — proving from the running process tree (not config) that both paths use Parakeet TDT-600m. Documented the detection procedure as a runbook in `CLAUDE.local.md` so future agents can answer "is Parakeet actually running?" without guessing.

## Key Decisions Made

- **Trust the process tree, not config.** `~/.config/minutes/config.toml` declares intent; only the running `example-server` argv proves which model loaded. Config fields like `[transcription] model = "large-v3"` are vestigial Whisper-era labels and must be ignored.
- **The diagnosis log `"whisper produced N segments"` is not evidence.** It's a hardcoded string in `FilterStats::diagnosis()` (`crates/core/src/transcribe.rs:68`) that prints regardless of which engine ran. Verified by reading the source.
- **Runbook goes in `CLAUDE.local.md`, not `CLAUDE.md`.** User correction mid-session: the tracked `CLAUDE.md` is auto-regenerated and shared; agent procedures belong in the untracked local override. Saved as feedback memory.
- **Discarded test transcripts.** Two `live` sessions (longevity interview + Broken Arrow Sky Race broadcast) were spun up only to prove detection; the user explicitly did not want them kept, and `live`'s rolling scratch buffer overwrites itself anyway.

## Changes Made

| Change | Detail |
|--------|--------|
| **Engine-detection runbook** | New `/Users/rymalia/.minutes/assistant/CLAUDE.local.md` — procedure for proving which transcription engine is running, what config fields to ignore, and the `transcribe.rs:68` log-line gotcha |
| **Memory: edit local, not tracked** | New `memory/feedback-claude-md-edits.md` — defaults agent procedures in `~/.minutes/assistant/` to `CLAUDE.local.md` instead of `CLAUDE.md`, with the why (CLAUDE.md is project-tracked and auto-regenerated) |
| **MEMORY.md index updated** | Added pointer to the new feedback memory |
| **Replay file** | `docs/replay-3d2b1f5c.md` (625 lines) generated mid-session via `/replay --full` |

## Research Performed

- **Live-vs-record semantics:** read `minutes --help`, `minutes live --help`, `minutes record --help`, `minutes transcript --help`. Confirmed `live` writes only two overwritable scratch files (`~/.minutes/live-transcript.jsonl`, `live-transcript.wav`) — no entry in `~/meetings/`, not searchable, no diarization (every line `speaker: null`).
- **Two live-session forensics passes:** read the streaming `live-transcript.jsonl` in real time on two independent sessions, periodically polling and producing running summaries to prove `minutes transcript --since` works as a live viewfinder.
- **Process-tree engine proof, 3 separate runs:**
  - Bare-CLI `minutes live -v` session (pid 48267) → sidecar socket `parakeet-sidecar-48267-tdt-600m.sock`, argv `--model tdt-600m --gpu --vad …/silero_vad_v5.safetensors`.
  - Tauri-app meeting recording (app pid 54858) → sidecar `parakeet-sidecar-54858-tdt-600m.sock` plus a child `claude` process (matching `[summarization] engine = "agent"`).
  - Tauri-app live transcription (worker pid 57715) → sidecar `parakeet-sidecar-57715-tdt-600m.sock`, identical model/VAD argv.
- **Source verification:** read `crates/core/src/transcribe.rs:55-79` to confirm the misleading log line is a hardcoded string in `FilterStats::diagnosis()`, called engine-agnostically.
- **Config drift catalogued:** `[transcription] model = "large-v3"` is vestigial; `[transcription] vad_model = "silero-v6.2.0"` doesn't match the running `silero_vad_v5.safetensors`; `[live_transcript] model = ""` resolves to the default at runtime.

## Summary Statistics

- Files created: 3 (`CLAUDE.local.md`, `memory/feedback-claude-md-edits.md`, `docs/session-summary-…md`)
- Files modified: 1 (`memory/MEMORY.md`)
- Source files audited: 1 (`crates/core/src/transcribe.rs`)
- Bugs identified (not fixed): 1 — hardcoded `"whisper produced N segments"` at `transcribe.rs:68`
- Detection passes proven end-to-end: 3 (one CLI live, one Tauri record, one Tauri live)

## Discoveries / Handoff Notes

- **Engine sidecar naming is the load-bearing forensic signal.** `~/.minutes/tmp/parakeet-sidecar-<PID>-<model>.sock` — the embedded PID lets you match a sidecar to a specific recording or live session even when several are running. Without this, the system has no first-class way to expose engine identity.
- **Recording warms the sidecar at start, not stop.** Original model in my head was "record captures audio, transcribes after stop." The process tree proved otherwise — the Tauri recording spawned its Parakeet sidecar immediately on hitting Start, so transcription is happening live (or at least the engine is loaded live), and `record` only differs from `live` downstream (summarization, persistence, diarization).
- **VAD config-vs-runtime drift.** `config.toml` declares `silero-v6.2.0`, but the running sidecar consistently loads `silero_vad_v5.safetensors`. Either the config field is unused for the sidecar path or a fallback kicks in — worth investigating if VAD behavior ever matters.
- **Legacy `minutes` CLI was deleted mid-session.** The Cargo binary at `~/.cargo/bin/minutes` is gone; only `Applications/Minutes.app/Contents/MacOS/minutes-app` remains. Procedures shouldn't depend on the CLI being on PATH.
- **No first-class engine reporting exists.** No `minutes engine` command, no engine field in `live-transcript.jsonl`, no engine line in job logs. The user noted this is "really surprising" — a small `transcript --status` extension (reading the running sidecar argv) would make this trivial and is a natural follow-up.

## Unfinished Work

- **Fix `transcribe.rs:68`.** One-line change: have `FilterStats` carry the engine name and format it into the diagnosis string instead of the hardcoded `"whisper"`. I offered to do it; user did not greenlight.
- **Optional: file an issue or sketch a `transcript --status --engine` extension** so engine identity becomes a queryable property of the system instead of a forensic exercise. Offered, not actioned.
- **VAD version drift (`silero-v6.2.0` config vs `silero_vad_v5` runtime)** — surfaced but not investigated.

## Current State

- **Branch:** `main`, clean working tree apart from this session's new files (`CLAUDE.local.md`, the new memory + index update, this summary, and the earlier `docs/replay-3d2b1f5c.md`).
- **Running processes at session end:** Minutes Tauri app + (likely) lingering Parakeet sidecars from the test recordings. No CLI binary present.
- **Memory state:** three entries in `MEMORY.md` — two Built Oregon notes plus the new `feedback-claude-md-edits` rule.
