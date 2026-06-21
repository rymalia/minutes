# Pathfinder Feature Inventory

Date: 2026-06-21

Scope: runtime architecture for Minutes, centered on `minutes-core`, CLI, Tauri, MCP, and the local file-backed coordination model. Public site, generated skill mirrors, and the standalone `whisper-guard` crate are inventory items but are not treated as primary unification targets unless they intersect runtime flow.

## Evidence Base

- Product and surface overview: `README.md:75`, `README.md:88`, `README.md:100`
- Developer architecture map: `CLAUDE.md:176`, `CLAUDE.md:185`, `CLAUDE.md:192`
- Shared core exports: `crates/core/src/lib.rs:1`, `crates/core/src/lib.rs:90`
- CLI command enum and dispatcher: `crates/cli/src/main.rs:289`, `crates/cli/src/main.rs:1358`
- Tauri module/bootstrap/handler registration: `tauri/src-tauri/src/main.rs:20`, `tauri/src-tauri/src/main.rs:1409`, `tauri/src-tauri/src/main.rs:2449`
- MCP server and CLI bridge: `crates/mcp/src/index.ts:1281`, `crates/mcp/src/index.ts:1040`, `crates/mcp/src/index.ts:3563`

## Runtime Feature Boundaries

### 1. Recording Capture And Stop Coordination

Entry points:
- CLI record/stop: `crates/cli/src/main.rs:1390`, `crates/cli/src/main.rs:2456`
- Core capture: `crates/core/src/capture.rs:1507`, `crates/core/src/capture.rs:1515`
- Tauri start/stop: `tauri/src-tauri/src/commands.rs:5921`, `tauri/src-tauri/src/commands.rs:6030`
- Native call capture: `tauri/src-tauri/src/commands.rs:2886`, `tauri/src-tauri/src/call_capture.rs:242`

Core files:
- `crates/core/src/capture.rs`
- `crates/core/src/pid.rs`
- `crates/core/src/notes.rs`
- `crates/core/src/desktop_control.rs`
- `tauri/src-tauri/src/commands.rs`
- `tauri/src-tauri/src/call_capture.rs`
- `tauri/src-tauri/src/call_detect.rs`

Purpose: own foreground recording state, device/system-audio preflight, PID/sentinel coordination, native desktop call capture, notes/context sidecars, and handoff to queued processing.

### 2. Processing Pipeline, Background Jobs, And Watcher

Entry points:
- Core pipeline: `crates/core/src/pipeline.rs:1288`, `crates/core/src/pipeline.rs:2061`
- Job queue: `crates/core/src/jobs.rs:182`, `crates/core/src/jobs.rs:1187`
- CLI process/watch/queue: `crates/cli/src/main.rs:1626`, `crates/cli/src/main.rs:1662`, `crates/cli/src/main.rs:2579`
- Tauri queue worker/recovery: `tauri/src-tauri/src/main.rs:231`, `tauri/src-tauri/src/commands.rs:3917`, `tauri/src-tauri/src/commands.rs:7245`

Core files:
- `crates/core/src/pipeline.rs`
- `crates/core/src/jobs.rs`
- `crates/core/src/watch.rs`
- `crates/core/src/ffmpeg.rs`
- `crates/core/src/retention.rs`

Purpose: transform recorded/imported audio into transcript artifacts, enrich with diarization/summarization/metadata, manage background job state, and process dropped voice memo files.

### 3. Live Transcript And Dictation

Entry points:
- Live CLI/Tauri/MCP: `crates/cli/src/main.rs:1831`, `tauri/src-tauri/src/commands.rs:12878`, `crates/mcp/src/index.ts:3257`
- Dictation CLI/Tauri/MCP: `crates/cli/src/main.rs:1668`, `tauri/src-tauri/src/commands.rs:13650`, `crates/mcp/src/index.ts:2925`
- Core live/dictation: `crates/core/src/live_transcript.rs:568`, `crates/core/src/dictation.rs:219`

Core files:
- `crates/core/src/live_transcript.rs`
- `crates/core/src/dictation.rs`
- `crates/core/src/streaming.rs`
- `crates/core/src/streaming_whisper.rs`
- `crates/core/src/daily_notes.rs`
- `crates/core/src/dictation_memory.rs`
- `tauri/src-tauri/src/text_insertion.rs`

Purpose: short-latency transcription sessions for live coaching and dictation, including session guards, stop signals, JSONL/status output, clipboard/daily-note/text insertion, and Tauri overlays.

### 4. Search, Graph, Knowledge, And Retrieval

Entry points:
- Core search/index: `crates/core/src/search.rs:541`, `crates/core/src/search_index.rs:139`
- Graph rebuild/query: `crates/core/src/graph.rs:336`, `crates/core/src/graph.rs:824`, `crates/core/src/graph.rs:877`
- Knowledge ingest: `crates/core/src/knowledge.rs:183`, `crates/core/src/knowledge_extract.rs:16`
- CLI/Tauri/MCP/SDK surfaces: `crates/cli/src/main.rs:3077`, `tauri/src-tauri/src/commands.rs:6573`, `crates/mcp/src/index.ts:1696`, `crates/sdk/src/reader.ts:415`

Core files:
- `crates/core/src/search.rs`
- `crates/core/src/search_index.rs`
- `crates/core/src/graph.rs`
- `crates/core/src/knowledge.rs`
- `crates/core/src/knowledge_extract.rs`
- `crates/core/src/vocabulary.rs`
- `crates/core/src/overlays.rs`
- `crates/reader/src/*`
- `crates/sdk/src/*`

Purpose: expose the durable markdown corpus through list/search/research/person/commitment views, maintain SQLite indexes, apply overlays/vocabulary, and write optional knowledge-base facts.

### 5. Desktop Shell, Command RPC, Recall, Palette, And Updates

Entry points:
- Bootstrap/state: `tauri/src-tauri/src/main.rs:1409`, `tauri/src-tauri/src/main.rs:1606`
- IPC handlers: `tauri/src-tauri/src/main.rs:2449`
- Frontend status/palette/Recall/update flows: `tauri/src/index.html:6511`, `tauri/src/index.html:8756`, `tauri/src/index.html:10813`, `tauri/src/index.html:11198`
- Backend palette/PTY/update: `tauri/src-tauri/src/palette_dispatch.rs:351`, `tauri/src-tauri/src/pty.rs:87`, `tauri/src-tauri/src/commands.rs:14044`

Core files:
- `tauri/src-tauri/src/main.rs`
- `tauri/src-tauri/src/commands.rs`
- `tauri/src-tauri/src/palette_dispatch.rs`
- `tauri/src-tauri/src/shortcut_manager.rs`
- `tauri/src-tauri/src/pty.rs`
- `tauri/src-tauri/src/context.rs`
- `tauri/src/index.html`
- `tauri/src/palette/index.html`

Purpose: native desktop lifecycle, tray/menu/global shortcuts, webview command bridge, command palette, Recall assistant PTY/workspace, settings/status surfaces, and update check/install UI.

### 6. MCP Agent Surface And CLI Delegation

Entry points:
- MCP server: `crates/mcp/src/index.ts:1281`, `crates/mcp/src/index.ts:3563`
- Tool registration: `crates/mcp/src/index.ts:1351`
- CLI bridge: `crates/mcp/src/index.ts:1040`
- Desktop control delegation: `crates/mcp/src/index.ts:841`
- Live/dictation tools: `crates/mcp/src/index.ts:2925`, `crates/mcp/src/index.ts:3257`

Core files:
- `crates/mcp/src/index.ts`
- `crates/mcp/ui/src/mcp-app.ts`
- `crates/sdk/src/*`
- `crates/reader/src/*`
- `crates/core/src/desktop_control.rs`

Purpose: expose Minutes to MCP clients through tools/resources, shell out to the CLI for authoritative behavior, use direct TS readers for lightweight fallback, and delegate call recording to the desktop app when native ownership matters.

## Secondary Feature Boundaries

### 7. Public Site And Product Docs

Entry points: `site/app/layout.tsx:43`, `site/app/page.tsx:16`, `site/package.json:5`

Purpose: product website, docs pages, comparison pages, generated LLM docs mirrors, and release/download constants. It consumes product metadata but does not own runtime coordination.

### 8. Agent Skill Pack Tooling

Entry points: `tooling/skills/compiler/compile.ts:65`, `tooling/skills/compiler/discover.ts:7`

Purpose: compile canonical Minutes skill sources into Claude/Codex/OpenCode/site artifacts. This is a build/distribution concern, not part of recording or retrieval runtime.

### 9. Whisper Guard Standalone Crate

Entry points: `crates/whisper-guard/src/lib.rs`, referenced from `CLAUDE.md:220`

Purpose: independently published transcription guardrails toolkit used by transcription paths. Treat as a dependency of pipeline/transcription, not as an architecture owner.

## Boundary Adjustments From Discovery

The Phase 0 discovery agent proposed 12 boundaries. This inventory combines closely related runtime systems so that Phase 1 diagrams describe actual product flows:

- Live Transcript and Dictation are one audit boundary because they share streaming capture, VAD, `StreamingWhisper`, PID guard concepts, and Tauri/MCP start/stop surfaces.
- Search, Graph, Knowledge, Reader, and SDK are one retrieval boundary because they all derive from the same markdown corpus and answer adjacent memory questions.
- Desktop shell concerns remain grouped because palette, Recall, update, and status all flow through one Tauri `AppState` and one `generate_handler!` registration surface.
- Public site, skill tooling, and `whisper-guard` remain secondary inventory items.
