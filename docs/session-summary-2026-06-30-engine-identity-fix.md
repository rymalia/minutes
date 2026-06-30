---
date: 2026-06-30
time: "2026-06-23 07:28 AM PDT – 2026-06-30 10:51 AM PDT"
resumed: "2026-06-25, 2026-06-26, 2026-06-30"
project: minutes
branch: dev
related_pr:
---

# Engine identity: fix the legacy "whisper produced N segments" label and expose engine first-class

The job log was lying. Lines like *"whisper produced 11 segments"* were appearing on runs where the engine that actually ran was parakeet. The bug was a one-liner inside an engine-agnostic helper, but the deeper annoyance was that nothing in the system exposed engine identity in a first-class way — the only way to know which engine was running was to `ps` the live process or grep the tracing strings. This session fixed the bug and closed the three reverse-engineering surfaces the user called out.

## Root cause

`FilterStats::diagnosis()` in `crates/core/src/transcribe.rs:68` hardcoded `"whisper"` in its segment-count string, even though the function is called from both the whisper and parakeet code paths. Parakeet runs aggregated into the same `FilterStats` shape were rendered with the whisper label.

## Approach

Three coordinated changes so engine identity stops being something humans and agents have to reverse-engineer:

1. **Source of truth** — `FilterStats` carries `engine`; `diagnosis()` interpolates it.
2. **Write surfaces** — every place engine identity matters now emits it first-class:
   - First-line `{"type":"session", engine, model, …}` header in `live-transcript.jsonl`
   - Structured `engine` field on the transcribe-step JSONL job-log events and matching tracing events
   - `engine` + `model` on `LiveStatus` (the sidecar status file) and surfaced through `minutes transcript --status` (JSON and text modes)
3. **Read surfaces** — the in-tree JSONL reader skips the session header silently; older readers parse-fail and skip via their existing `tracing::warn!` path (no data loss). `SessionStatus` clears engine/model when the session is not active, so a stale status file from a prior session can't leak the wrong label.

## Changes Made

| Change | Detail |
|--------|--------|
| **`FilterStats.engine` field + custom `Default`** | Default returns `"whisper"` so existing whisper paths and pre-existing test fixtures keep their wording without edits. `crates/core/src/transcribe.rs:31-87` |
| **Fixed the hardcoded `"whisper produced"` string** | `diagnosis()` now interpolates `self.engine`. `crates/core/src/transcribe.rs:91` |
| **`engine_label(config)` helper** | Maps the configured engine to the actually-running engine (`apple-speech` batch fallback and unknowns → `"whisper"`). Mirrors the dispatch fallthrough. `crates/core/src/transcribe.rs:325-335` |
| **Parakeet construction sites set engine explicitly** | `transcribe_with_parakeet` and the batch parakeet stats builder construct `FilterStats { engine: "parakeet".into(), .. }`. `crates/core/src/transcribe.rs:1818, :3035` |
| **Engine-agnostic chunker derives engine from config** | `transcribe_chunk_ranges` (called from both whisper and parakeet dispatches) uses `engine_label(config)`. `crates/core/src/transcribe.rs:446` |
| **`SessionHeader` struct + writer method** | One-shot `{"type":"session", engine, model, source, pid, started_at, version}` written as the first JSONL line. Idempotent. `crates/core/src/live_transcript.rs:282-300, :432-475` |
| **Standalone + sidecar paths wired** | Header is written AFTER the apple-speech runtime probe and parakeet compile-time gate resolve, so the engine value is what's actually running. Each call site also re-`mark_healthy()` so the very first status snapshot carries engine/model. `crates/core/src/live_transcript.rs:818-820, :2252-2254` |
| **Reader skips header silently** | `read_since_line_from_path` falls back to `is_session_header_line` on parse-fail and continues without warning. `crates/core/src/live_transcript.rs:2548-2562` |
| **Structured `engine` field in pipeline JSONL events** | Both `logging::log_step("transcribe", …)` call sites and the matching `tracing::info!`/`tracing::warn!` calls in `pipeline.rs` now carry `engine = filter_stats.engine` alongside `diagnosis`. `crates/core/src/pipeline.rs:1515, :2174, :2185, :2189` |
| **`LiveStatus.engine` + `.model`** | Persisted on every heartbeat by the writer. State-transition path (`Failed`, `Starting`) preserves them — a state change doesn't wipe the engine label. `crates/core/src/live_transcript.rs:354-358, :479-480, :2712-2713` |
| **`SessionStatus.engine` + `.model`** | `derive_session_status` populates them from `LiveStatus` — but only when `active`, so a stale status file can't leak. `crates/core/src/live_transcript.rs:286-296, :2640-2671` |
| **`minutes transcript --status` (text mode) prints engine** | One line: `Engine: parakeet (parakeet-tdt-0.6b-v3)`. JSON mode already serializes `SessionStatus` directly — no CLI change needed. `crates/cli/src/main.rs:9272-9277` |
| **Regression tests** | `diagnosis_reports_configured_engine_label` (transcribe.rs) asserts the literal `"whisper produced"` is gone from parakeet diagnostics; `session_header_is_first_line_and_reader_skips_it_silently` + 4 others (live_transcript.rs) cover header layout, model omission for apple-speech, full SessionStatus round-trip, and the stale-status guard. |

## Verification

- `cargo test -p minutes-core --no-default-features --features "whisper,streaming" --lib -- transcribe::tests live_transcript::tests pipeline::tests` — **150 passed, 3 ignored** (pre-existing).
- `cargo clippy -p minutes-core -p minutes-cli --no-default-features --features "minutes-core/whisper,minutes-core/streaming" --lib --tests --bin minutes -- -D warnings` — clean.
- `cargo clippy -p minutes-core --features parakeet --lib --tests -- -D warnings` — clean.
- `cargo check -p minutes-core --features parakeet` — clean.
- Pre-existing flakes in `streaming::mic_mute_tests` fail under parallel execution (shared filesystem state, unrelated to this work); pass serially with `--test-threads=1`.

## What's intentionally NOT in this commit

- **No `minutes engine` standalone command** — `minutes transcript --status` already exists and now surfaces engine/model; a separate `minutes engine` would duplicate it. Easy to add later if usage warrants.
- **No `~/.minutes/state.json` snapshot** — the original sketch mentioned this, but the three surfaces (live JSONL header, job log field, `transcript --status`) already cover the three places agents need to read engine identity from. A separate state.json would be one more file to keep consistent for negligible benefit.
- **MCP changes** — the `read_live_transcript` MCP tool shells out to the CLI (`minutes transcript --status`), so it picks up engine/model for free.
- **TS SDK reader update** — `crates/mcp/src/index.ts` does not parse `live-transcript.jsonl` directly; it shells out to the CLI. The CLI uses the in-tree reader, which already skips the header silently.

## Backward compatibility

- Existing JSONL utterance lines are unchanged — the header is purely additive at line 0.
- Older strict-parse readers will fail to deserialize the header as a `TranscriptLine` and emit one `tracing::warn!("skipping malformed JSONL line: …")` per session. No data is lost; just one extra warning line per session for those readers (none in this repo).
- `LiveStatus` and `SessionStatus` gained optional fields with `skip_serializing_if = "Option::is_none"` so old consumers reading older sidecar files still deserialize cleanly.
- `FilterStats` default is `"whisper"`, so any caller that constructed with `..Default::default()` keeps its prior diagnosis wording.

## Files changed (staged)

```
crates/cli/src/main.rs             |   6 +
crates/core/src/live_transcript.rs | 334 ++++++++++++++++++++++++++++++++++++
crates/core/src/pipeline.rs        |  15 +-
crates/core/src/transcribe.rs      |  89 +++++++++-
4 files changed, 437 insertions(+), 7 deletions(-)
```

## Suggested commit

```bash
git add crates/core/src/transcribe.rs \
        crates/core/src/live_transcript.rs \
        crates/core/src/pipeline.rs \
        crates/cli/src/main.rs
```

```
fix(transcribe): label engine correctly across diagnostic, JSONL, and status surfaces

The diagnosis string "whisper produced N segments" was hardcoded inside
FilterStats::diagnosis() even though the function runs for every engine,
so parakeet sessions logged as whisper. This change fixes the bug and
closes the three surfaces where engine identity was being reverse-engineered
from process state instead of being exposed first-class.

1. FilterStats now carries `engine`; diagnosis() interpolates it.
   Parakeet construction sites set it explicitly; the engine-agnostic
   chunker derives it from config. Default is "whisper" so existing
   whisper paths keep their wording. Regression test fails if the
   literal "whisper produced" string is ever hardcoded again.

2. LiveTranscriptWriter writes a {"type":"session", engine, model,
   source, pid, started_at, version} header as the first JSONL line.
   The engine is the one actually running (apple-speech runtime probe
   and parakeet compile-time gate already resolved). The in-tree
   reader skips it silently; older readers parse-fail and skip via the
   existing tracing::warn! path.

3. pipeline.rs transcribe-step log_step + tracing events now carry a
   structured "engine" field alongside diagnosis.

4. LiveStatus and SessionStatus carry engine + model; populated on
   every heartbeat by the writer, surfaced through
   `minutes transcript --status` in both JSON and text modes
   ("Engine: parakeet (parakeet-tdt-0.6b-v3)"). MCP picks this up for
   free since it shells out to the CLI. State transitions preserve the
   engine label; stale status files from prior sessions don't leak it.
```
