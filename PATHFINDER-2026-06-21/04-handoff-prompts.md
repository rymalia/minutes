# Handoff Prompts

Copy any block directly into `/make-plan`.

## Activity Policy

```text
/make-plan Create a core ActivityPolicy for Minutes.

Target unified component: `minutes_core::pid::activity_conflicts(request: ActivityRequest) -> ActivityDecision`, with the single entry point near `crates/core/src/pid.rs:657`.

Problem evidence:
- CLI recording checks live transcript before creating recording PID: `crates/cli/src/main.rs:2193`, `crates/cli/src/main.rs:2228`
- Core dictation checks recording/live/dictation PID: `crates/core/src/dictation.rs:229`, `crates/core/src/dictation.rs:249`
- Core live transcript checks recording/dictation/live PID: `crates/core/src/live_transcript.rs:584`, `crates/core/src/live_transcript.rs:604`
- Tauri live gate duplicates the conflict matrix: `tauri/src-tauri/src/commands.rs:12860`, `tauri/src-tauri/src/commands.rs:12874`
- Tauri dictation gate duplicates it again: `tauri/src-tauri/src/commands.rs:13656`, `tauri/src-tauri/src/commands.rs:13677`
- MCP prechecks duplicate policy through status calls: `crates/mcp/src/index.ts:1382`, `crates/mcp/src/index.ts:2936`, `crates/mcp/src/index.ts:3270`

Relevant flowcharts:
- `PATHFINDER-2026-06-21/01-flowcharts/recording-capture.md`
- `PATHFINDER-2026-06-21/01-flowcharts/live-dictation.md`
- `PATHFINDER-2026-06-21/01-flowcharts/mcp-agent-surface.md`

Plan constraints:
- Keep PID files/guards as durable enforcement; the new policy is a read decision, not a lock.
- Use a small enum/match design, not a registry/factory.
- Preserve existing surface-specific UX where needed, but source conflict reasons from the policy.
- Include tests for each activity pair: recording, standalone live transcript, dictation, processing if relevant.
```

## Stop Controller

```text
/make-plan Create a core StopController for Minutes activity stops.

Target unified component: `minutes_core::pid::request_activity_stop(target: StopTarget, owner: StopOwner) -> StopRequestResult`, with the single entry point near `crates/core/src/pid.rs:606`.

Call sites to rewrite:
- CLI recording stop: `crates/cli/src/main.rs:2456`, `crates/cli/src/main.rs:2533`
- CLI live transcript stop: `crates/cli/src/main.rs:2535`, `crates/cli/src/main.rs:2574`
- Tauri recording stop out-of-process path: `tauri/src-tauri/src/commands.rs:3312`, `tauri/src-tauri/src/commands.rs:3352`
- Tauri live stop out-of-process path: `tauri/src-tauri/src/commands.rs:12909`, `tauri/src-tauri/src/commands.rs:12933`
- MCP dictation stop currently sends raw SIGTERM: `crates/mcp/src/index.ts:2997`, `crates/mcp/src/index.ts:3006`

Relevant flowcharts:
- `PATHFINDER-2026-06-21/01-flowcharts/recording-capture.md`
- `PATHFINDER-2026-06-21/01-flowcharts/live-dictation.md`

Plan constraints:
- Preserve Tauri in-process `stop_flag` and `live_transcript_stop_flag` fast paths.
- Do not delete existing sentinel behavior until tests prove compatibility.
- Fix dictation stop semantics explicitly; CLI dictation ignores SIGTERM on Unix, so raw MCP PID kill is not sufficient.
- Preserve the current desktop-control boundary: it is start-only today (`crates/core/src/desktop_control.rs:45`, `crates/core/src/desktop_control.rs:49`). Do not add a desktop-control stop protocol as the first move.
- Keep MCP recording stop routed through CLI `minutes stop` (`crates/mcp/src/index.ts:1549`, `crates/mcp/src/index.ts:1559`) and make that CLI path use the core stop controller.
- Avoid a generic process-control abstraction; only unify Minutes activity stop semantics.
```

## Processing Orchestrator

```text
/make-plan Route watcher/import processing through unified job semantics without changing foreground `minutes process`.

Target unified component: `minutes_core::jobs::enqueue_processing_job(input: ProcessingInput) -> ProcessingJob`, replacing duplicated job construction around `crates/core/src/jobs.rs:182` and `crates/core/src/jobs.rs:391`.

Call sites to rewrite:
- Active capture queue path: `crates/core/src/jobs.rs:182`, `crates/core/src/jobs.rs:243`
- Existing audio/recovery enqueue path: `crates/core/src/jobs.rs:391`, `crates/core/src/jobs.rs:435`
- Watcher single-file direct process path: `crates/core/src/watch.rs:341`, `crates/core/src/watch.rs:410`
- Watcher Parakeet batch completion path: `crates/core/src/watch.rs:420`, `crates/core/src/watch.rs:545`
- Tauri retry-all enqueue path: `tauri/src-tauri/src/commands.rs:7245`, `tauri/src-tauri/src/commands.rs:7255`

Relevant flowchart:
- `PATHFINDER-2026-06-21/01-flowcharts/processing-jobs-watcher.md`

Plan constraints:
- Keep watcher discovery, settle delay, iCloud stub handling, sidecars, and processed/failed moves.
- Keep `minutes process` direct and foreground: `crates/cli/src/main.rs:4353`, `crates/cli/src/main.rs:4379`.
- Do not collapse active-capture move semantics and in-place recovery semantics; model them as explicit `ProcessingInput` variants.
- Include migration tests for watcher success/failure moves and job archive behavior.
```

## Artifact Scanner And Projection Hook

```text
/make-plan Create a shared MeetingArtifactScanner and ProjectionUpdater for core retrieval/projection code.

Target unified components:
- `minutes_core::markdown::scan_meeting_artifacts(config, options) -> impl Iterator<Item = ParsedMeetingArtifact>`
- `minutes_core::graph::refresh_after_artifact_change(config, reason, paths)`

Call sites to rewrite:
- Core search/research file walking: `crates/core/src/search.rs:11`, `crates/core/src/search.rs:343`, `crates/core/src/search.rs:664`, `crates/core/src/search.rs:1113`
- Search-index sync input: `crates/core/src/search_index.rs:138`, `crates/core/src/search_index.rs:249`
- Graph rebuild input: `crates/core/src/graph.rs:390`, `crates/core/src/graph.rs:424`
- Knowledge ingest parser: `crates/core/src/knowledge.rs:182`, `crates/core/src/knowledge.rs:199`
- Manual graph refreshes: `crates/core/src/watch.rs:389`, `crates/core/src/watch.rs:508`, `crates/cli/src/main.rs:2512`, `crates/cli/src/main.rs:4370`, `tauri/src-tauri/src/commands.rs:7713`, `tauri/src-tauri/src/commands.rs:7782`
- Shared search-index exclusions that graph should also honor: `crates/core/src/search_index/exclusions.rs:1`, `crates/core/src/search_index/exclusions.rs:44`

Relevant flowchart:
- `PATHFINDER-2026-06-21/01-flowcharts/search-graph-knowledge.md`

Plan constraints:
- Do not merge search, graph, and knowledge storage backends.
- Keep SDK/reader as packaging-specific surfaces, but add contract tests against core parser fixtures.
- Projection hook should centralize graph refresh/invalidation after artifact writes, overlay changes, and vocabulary changes.
- Fix corpus membership drift: graph rebuild should share the same artifact scanner/exclusion semantics as search so `archive`, `processed`, `failed`, and other excluded markdown paths do not create graph/search disagreement.
- Prefer an iterator over parsed artifacts to a large in-memory registry.
```

## Recording Launch Planner

```text
/make-plan Create a core RecordingLaunchPlanner for recording preflight and routing decisions.

Target unified component: `minutes_core::capture::plan_recording_launch(request: RecordingLaunchRequest, surface: RecordingSurface) -> RecordingLaunchPlan`, with the single entry point near `crates/core/src/capture.rs:2331`.

Call sites to rewrite:
- CLI recording setup/preflight: `crates/cli/src/main.rs:2159`, `crates/cli/src/main.rs:2255`
- Tauri command launch: `tauri/src-tauri/src/commands.rs:5529`, `tauri/src-tauri/src/commands.rs:5921`
- Desktop-control request handler: `tauri/src-tauri/src/commands.rs:5626`, `tauri/src-tauri/src/commands.rs:5655`
- Palette recording dispatch/preflight: `tauri/src-tauri/src/palette_dispatch.rs:397`, `tauri/src-tauri/src/palette_dispatch.rs:459`
- MCP recording routing: `crates/mcp/src/index.ts:1400`, `crates/mcp/src/index.ts:1445`, `crates/mcp/src/index.ts:1499`, `crates/mcp/src/index.ts:1518`
- MCP CLI bridge helper, because MCP should consume the planner through CLI JSON preflight rather than linking Rust core directly: `crates/mcp/src/index.ts:1038`, `crates/mcp/src/index.ts:1058`
- Desktop-control schema remains the transport: `crates/core/src/desktop_control.rs:32`, `crates/core/src/desktop_control.rs:64`

Relevant flowcharts:
- `PATHFINDER-2026-06-21/01-flowcharts/recording-capture.md`
- `PATHFINDER-2026-06-21/01-flowcharts/mcp-agent-surface.md`

Plan constraints:
- Do not collapse CLI and desktop-native call capture executors; planner returns route decisions only.
- Preserve desktop-native call capture as the preferred call route where available.
- Preserve CLI degraded/loopback behavior and consent handling.
- MCP is a Node CLI bridge plus TypeScript read-only fallback, not a third static `minutes-core` consumer. Add or reuse CLI JSON output for planner decisions rather than adding Node/Rust core bindings.
- Avoid feature flags that keep old routing policy alive in parallel.
```

## ShortcutManager Migration

```text
/make-plan Finish migrating desktop shortcut registration to ShortcutManager.

Target unified component: existing `ShortcutManager` in `tauri/src-tauri/src/shortcut_manager.rs:247`, exposed through `cmd_set_shortcut`.

Call sites to rewrite:
- Legacy global fallback dispatch: `tauri/src-tauri/src/main.rs:1489`, `tauri/src-tauri/src/main.rs:1586`
- Old global hotkey setter: `tauri/src-tauri/src/commands.rs:7031`, `tauri/src-tauri/src/commands.rs:7070`
- Old dictation shortcut setter: `tauri/src-tauri/src/commands.rs:7073`, `tauri/src-tauri/src/commands.rs:7135`
- Preserve new state machine/action execution: `tauri/src-tauri/src/shortcut_manager.rs:95`, `tauri/src-tauri/src/shortcut_manager.rs:213`, `tauri/src-tauri/src/shortcut_manager.rs:667`, `tauri/src-tauri/src/shortcut_manager.rs:740`

Relevant flowchart:
- `PATHFINDER-2026-06-21/01-flowcharts/desktop-shell.md`

Plan constraints:
- First confirm all settings UI callers can use `cmd_set_shortcut`.
- Keep compatibility wrappers only as thin calls into the unified manager, then delete when no longer called.
- Do not keep both systems indefinitely behind feature flags.
- Include tests or diagnostics for each slot: global quick thought, dictation, live, palette.
```

## Local Finalizers

```text
/make-plan Add three small finalizers for repeated branch bookkeeping: native call queue finalization, watcher completion, and MCP recording-started response formatting.

Target unified entry points:
- `finish_native_call_capture_queue_result(...)` near `tauri/src-tauri/src/commands.rs:2886`
- `finish_watcher_processed_artifact(...)` near `crates/core/src/watch.rs:341`
- `format_mcp_recording_started_response(...)` near `crates/mcp/src/index.ts:1378`

Call sites to rewrite:
- Native call helper-exit branch: `tauri/src-tauri/src/commands.rs:2967`, `tauri/src-tauri/src/commands.rs:3063`
- Native call stop-error branch: `tauri/src-tauri/src/commands.rs:3069`, `tauri/src-tauri/src/commands.rs:3172`
- Native call normal-stop branch: `tauri/src-tauri/src/commands.rs:3212`, `tauri/src-tauri/src/commands.rs:3300`
- Watcher single completion: `crates/core/src/watch.rs:370`, `crates/core/src/watch.rs:394`
- Watcher batch completion: `crates/core/src/watch.rs:495`, `crates/core/src/watch.rs:511`
- MCP desktop response branch: `crates/mcp/src/index.ts:1435`, `crates/mcp/src/index.ts:1464`
- MCP direct response branch: `crates/mcp/src/index.ts:1521`, `crates/mcp/src/index.ts:1544`

Relevant flowcharts:
- `PATHFINDER-2026-06-21/01-flowcharts/recording-capture.md`
- `PATHFINDER-2026-06-21/01-flowcharts/processing-jobs-watcher.md`
- `PATHFINDER-2026-06-21/01-flowcharts/mcp-agent-surface.md`

Plan constraints:
- Keep these as local helpers; do not create a lifecycle framework.
- Preserve all existing diagnostic strings unless tests show they should be normalized.
- Do not change transport choice, native capture behavior, or watcher batch transcription behavior.
```

## Desktop Update Readiness

```text
/make-plan Consolidate Tauri desktop update active-session gating without moving updater behavior into core.

Target unified component: a Tauri-local helper such as `desktop_update_blocker(app_state) -> Option<String>` near the existing update helpers in `tauri/src-tauri/src/main.rs` / `tauri/src-tauri/src/commands.rs`.

Call sites to rewrite:
- Auto-update notification deferral: `tauri/src-tauri/src/main.rs:776`, `tauri/src-tauri/src/main.rs:804`
- Deferred update surfacing: `tauri/src-tauri/src/commands.rs:1030`, `tauri/src-tauri/src/commands.rs:1050`
- Update installation active-session gate: `tauri/src-tauri/src/commands.rs:14048`, `tauri/src-tauri/src/commands.rs:14069`

Relevant flowchart:
- `PATHFINDER-2026-06-21/01-flowcharts/desktop-shell.md`

Plan constraints:
- Keep update check, download, signature verification, progress events, install, and restart inside the Tauri desktop subsystem.
- Share only the active recording/live/dictation/external-recording readiness predicate and reason text.
- Do not add a core updater abstraction.
- Include tests or targeted diagnostics proving update surfacing/install remain blocked during active capture sessions.
```
