---
date: 2026-03-31
time: "10:17 AM PDT – 12:30 PM PDT"
project: minutes
---

## Overview

Performed a comprehensive deep dive exploration of the entire Minutes codebase, covering Rust core architecture, MCP server & TypeScript layer, Tauri desktop app, tests/CI/CD, Claude Code plugin, and project infrastructure. No code changes — purely research and architectural analysis. Initialized persistent memory for future sessions. Also explored the QMD MCP search tools and registered the minutes project as a new QMD collection with context metadata.

## Key Decisions Made

- **Memory vs. CLAUDE.local.md**: Clarified that `CLAUDE.local.md` is best for always-injected context (personal preferences), while the `~/.claude/projects/.../memory/` directory is for selectively recalled cross-session memory. Did not create a `CLAUDE.local.md` since the committed `CLAUDE.md` is comprehensive and no local overrides were needed.
- **Memory initialization**: Saved project overview and git-commit feedback rule to persistent memory for future sessions.

## Deep Dive Findings

### 1. Anti-Hallucination as First-Class Architecture

The `whisper-guard` crate implements a standalone 6-layer defense-in-depth against Whisper hallucination:

- **Pre-transcription**: Silence stripping (adaptive noise floor from quietest 20% of chunks), normalization, 32-tap Hann windowed-sinc resampling
- **Post-transcription**: Consecutive dedup (3+ similar → collapse), interleaved A/B/A/B pattern detection, foreign script filtering (CJK in Latin transcript), noise marker collapse (`[Śmiech]`, `[risas]`), trailing trim, voice command strip

Every layer tracks `FilterStats` so when a transcript comes back blank, you get a diagnostic string like *"silence strip removed ALL audio"* — making it debuggable, not just magical. Publishable to crates.io independently.

### 2. Markdown-as-Database Design

All meeting data lives in markdown + YAML frontmatter. The SQLite `graph.db` is explicitly a derived, rebuildable cache — delete it and `minutes people --rebuild` regenerates in <1s for 1000 meetings. This is a deliberate anti-lock-in decision: data works with grep, Obsidian, QMD, or any tool that reads text files.

### 3. Dual-Mode MCP Server

The MCP server (`crates/mcp/src/index.ts`, 2116 lines) operates in two modes:
- **Full mode**: Uses the Rust CLI binary for recording, processing, diarization
- **Read-only fallback**: Pure TypeScript via `minutes-sdk` if the binary isn't installed

Auto-finds the binary across 5 locations with 3-tier auto-install fallback (GitHub release → Homebrew → cargo install). Tool registration is split between `registerAppTool()` (UI-aware dashboard tools) and `server.tool()` (CLI-only tools). Security: uses `execFile` (no shell injection), path validation prevents directory traversal.

### 4. Singleton AI Assistant Workspace

The Tauri desktop app creates `~/.minutes/assistant/` as a persistent staging area for Claude Code:
- Creates a `.git` repo so Claude Code auto-discovers the CLAUDE.md
- Symlinks to actual meetings (no data duplication)
- Maintains `CURRENT_MEETING.md` when user focuses a specific meeting
- Preserves live transcript markers (`<!-- LIVE_TRANSCRIPT_START -->`) during active sessions

A clever bridge between a native desktop app and CLI-based AI tools.

### 5. Native macOS FFI for Hotkeys

Tauri's global shortcut system can't intercept Caps Lock, so the project drops to raw `CGEventTapCreate(kCGHIDEventTap)` via FFI in `hotkey_macos.rs` — running on a dedicated background thread with its own `CFRunLoop`. Split bundle identities (prod: `com.useminutes.desktop` vs. dev: `com.useminutes.desktop.dev`) because macOS TCC permissions attach to bundle ID.

### 6. The Claude Code Plugin

`.claude/plugins/minutes/` contains 12 skills + 1 agent + 2 hooks:
- **Post-record hook**: Automatic intelligence checks — decision conflict detection, overdue action item alerts, speaker attribution confidence warnings, all with 5-second timeouts and persistent error logging
- **Session-start hook**: Calendar check + prep nudge (business hours only, opt-out available)
- **Meeting-analyst agent** (Sonnet model): Cross-meeting synthesis using filesystem queries
- **Interactive lifecycle**: prep → record → debrief → weekly with skill chaining via `.prep.md` files

### 7. Four Recording Modes, One Pipeline

Meeting, QuickThought, Dictation, and LiveTranscript modes share the same pipeline but with careful mutual exclusion — each mode verifies the other three aren't active via PID files with `fs2` flock. The pre-commit checklist has a specific item for verifying this mutual exclusion across all start paths.

### 8. Speaker Attribution Confidence System

Four levels: L0 (deterministic from calendar), L1 (LLM suggestions capped at Medium), L2 (voice enrollment via cosine similarity), L3 (confirmed-only learning). Design principle: **wrong names are worse than anonymous** — only High-confidence attributions rewrite transcript labels.

### 9. Landing Page with Remotion

The `site/` uses Remotion to create an animated terminal demo that plays CLI commands in real-time, plus a Three.js 3D topology visualization for conversation networks.

### 10. Release Discipline

6 files must have matching versions, manifest tools must sync with registered tools, and no empty releases — "Every release shows up in followers' GitHub feeds — this is free awareness."

## Architectural Observations

| Pattern | Detail |
|---------|--------|
| **Heavyweight/Lightweight crate split** | `minutes-core` has all audio/ML deps; `minutes-reader` is a zero-dependency parser enabling external tooling without pulling in whisper/cpal/pyannote |
| **Plugin+MCP+Desktop trifecta** | Claude interacts through three surfaces (MCP tools, plugin skills, Tauri workspace) — all reading the same markdown files. No sync problem because markdown is the single source of truth |
| **Pluggable engines everywhere** | Transcription (whisper/parakeet), diarization (pyannote-rs/subprocess/none), summarization (auto-detect/Claude/OpenAI/Mistral/Ollama), search (built-in/QMD) |
| **Error messages as onboarding** | Every error includes setup instructions ("Is BlackHole installed? `brew install blackhole-2ch`") |
| **Atomic state + graceful shutdown** | `Arc<AtomicBool>` for hot-path state, stop flags instead of thread abort, failed captures preserved to `~/meetings/failed-captures/` |
| **Embedded dashboard UI** | Vanilla TypeScript + Vite single-file build, served as MCP resource, MCP Apps SDK for host communication |

## Research Performed

- **4 parallel exploration agents** covering: Rust core (30 modules, ~20K LOC), MCP server + TypeScript (2116 + 435 + 777 lines), Tauri desktop (40+ commands, 4 recording modes), and infrastructure (CI/CD, plugin, tests, site)
- **Key files audited**: `Cargo.toml` workspace, all crate `Cargo.toml`s, `crates/core/src/*.rs` (27 modules), `crates/mcp/src/index.ts`, `crates/mcp/ui/main.ts`, `crates/sdk/src/reader.ts`, `tauri/src-tauri/src/main.rs`, `tauri/src-tauri/src/commands.rs`, `tauri/src-tauri/src/context.rs`, `.claude/plugins/minutes/plugin.json`, `PLAN.md`, `manifest.json`, CI workflows, build scripts
- **Test coverage mapped**: ~277 tests across 49 whisper-guard + 124 core unit + 10 integration + 23 Tauri + 2 CLI + 6 reader + 30 reader.ts + 8 MCP integration + 1 hook

## QMD Collection Setup

Registered the `minutes` project as a new QMD collection:

| Step | Detail |
|------|--------|
| **Collection** | `minutes` → `/Users/rymalia/projects/minutes` with `**/*.md` glob |
| **Documents indexed** | 41 markdown files across root, docs/, plugin/, .claude/plugins/, crates/ |
| **Embeddings** | 165 chunks via embeddinggemma model (13s) |
| **Context** | Combined root + docs description covering all project capabilities, input modes, MCP server, whisper-guard, plugin, Tauri app, and documentation structure |

QMD queries can now discover Minutes documentation alongside the other 39 workspace collections. Tested with semantic queries for "whisper anti-hallucination" and "speaker attribution confidence" — both returned relevant hits.

Note: `qmd collection add` resolves the path argument relative to CWD + collection name. When the collection name matches the current directory name, run the command from the parent directory (e.g., `cd ~/projects && qmd collection add minutes minutes '**/*.md'`).

## Summary Statistics

- 0 code files changed (research-only session)
- ~30+ source files audited across 5 crates + TypeScript + plugin
- 4 parallel exploration agents launched
- 2 memory files created (`project_overview.md`, `feedback_git_no_commit.md`)
- 1 memory index initialized (`MEMORY.md`)
- 1 QMD collection registered (41 docs, 165 embedded chunks, 1 context)

## Discoveries / Handoff Notes

- **Version**: Project is at v0.9.1 (per recent commit `2969317`)
- **Build phases**: All phases (1a Recording, 1b Intelligence, 2 MCP, 2b Plugin, 3 Tauri) rated 10/10 quality in BUILD-STATUS.md
- **PLAN.md**: 101KB master plan document — survives context compaction, should be read first for strategic context
- **MCP rebuild is separate**: `./scripts/build.sh` does NOT rebuild the TypeScript MCP server — must run `cd crates/mcp && npm run build` separately
- **Test conditional compilation**: Whisper and diarization tests are behind feature flags, gracefully skipped in CI when models aren't available
- **The `reader` crate pattern**: Lightweight read-only parser for meetings without audio deps — more Rust workspaces should adopt this heavyweight/lightweight split
