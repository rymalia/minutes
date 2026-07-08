# Session replay: `17279b0b-265a-4b18-87fa-6661125e349f`

- **main**: `/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/17279b0b-265a-4b18-87fa-6661125e349f.jsonl`
- **subagents**: 8 file(s) in `/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/17279b0b-265a-4b18-87fa-6661125e349f/subagents/`
- **cwd**: `/Users/rymalia/projects/minutes`
- **turns**: 177
- **filters**: tools=on, tool_results=on, thinking=on, sidechains=on, history=off

---

### user · 2026-06-21 06:09:28

<command-message>claude-mem:learn-codebase</command-message>
<command-name>/claude-mem:learn-codebase</command-name>
<command-args>I want to thoroughly understand how this codebasae works, especially the differences/similarities/coordinations between
  the tauri-based desktop app and the minutes CLI.</command-args>

### assistant · 2026-06-21 06:09:45

I'll learn this codebase with a focus on the Tauri desktop app ↔ CLI relationship. Let me start by mapping the structure, then read the critical files directly while dispatching parallel agents to survey the broader codebase.

### assistant · 2026-06-21 06:09:46

- **→** `Bash(command='echo "=== WORKSPACE ROOT ===" && cat Cargo.toml && echo "" && echo "=== CRATE DIRS ===" && ls -la cr… [+96 chars]', description='Map workspace and crate structure')`

### tool_result · 2026-06-21 06:09:47

```
=== WORKSPACE ROOT ===
[workspace]
members = ["crates/core", "crates/cli", "crates/reader", "crates/whisper-guard", "tauri/src-tauri"]
resolver = "2"

[workspace.package]
version = "0.18.14"
edition = "2021"
license = "MIT"
authors = ["Mat Silverstein"]
description = "Conversation memory for AI assistants"
repository = "https://github.com/silverstein/minutes"
homepage = "https://useminutes.app"

[… [+4484 chars]
```

### assistant · 2026-06-21 06:09:52

- **→** `Bash(command='echo "=== CORE SRC (with line counts) ===" && wc -l crates/core/src/*.rs | sort -n && echo "" && ech… [+193 chars]', description='Line counts for core, cli, tauri rust sources')`

### tool_result · 2026-06-21 06:09:52

```
=== CORE SRC (with line counts) ===
     138 crates/core/src/lib.rs
     162 crates/core/src/logging.rs
     188 crates/core/src/ffmpeg.rs
     192 crates/core/src/resample.rs
     245 crates/core/src/dictation_memory.rs
     267 crates/core/src/overlays.rs
     276 crates/core/src/screen.rs
     313 crates/core/src/error.rs
     313 crates/core/src/vad.rs
     318 crates/core/src/desktop_control.… [+2439 chars]
```

### assistant · 2026-06-21 06:10:03

This is a large codebase (~67K lines in core, ~11K CLI, ~26K Tauri, plus TypeScript MCP/SDK). I'll be thorough but focused on your stated goal — the CLI ↔ Tauri ↔ shared-core relationship. Let me read the central coordination files directly while dispatching parallel agents to survey the broader subsystems.

### assistant · 2026-06-21 06:10:03

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/lib.rs')`

### tool_result · 2026-06-21 06:10:04

```
1	pub mod apple_speech;
2	pub mod autoresearch;
3	pub mod calendar;
4	pub mod capture;
5	pub mod config;
6	pub mod context_store;
7	pub mod daily_notes;
8	pub mod desktop_context;
9	pub mod desktop_control;
10	pub mod device_monitor;
11	pub mod diarize;
12	pub mod dictation_memory;
13	pub mod error;
14	pub mod events;
15	pub mod ffmpeg;
16	pub mod graph;
17	pub mod health;
18	pub mod jobs;
19	pub… [+4752 chars]
```

### assistant · 2026-06-21 06:10:08

- **→** `Bash(command='echo "=== CORE Cargo.toml ===" && cat crates/core/Cargo.toml && echo "" && echo "=== CLI Cargo.toml… [+113 chars]', description='Read core/cli/tauri Cargo manifests for features')`

### tool_result · 2026-06-21 06:10:08

```
=== CORE Cargo.toml ===
[package]
name = "minutes-core"
version.workspace = true
edition.workspace = true
license.workspace = true
authors.workspace = true
repository.workspace = true
description = "Core library for minutes — audio capture, transcription, and meeting memory"
keywords = ["meeting", "transcription", "whisper", "ai", "memory"]
categories = ["multimedia::audio", "command-line-utilitie… [+6423 chars]
```

### assistant · 2026-06-21 06:10:29

I have the dependency picture: `minutes-core` is the shared engine (feature-gated), and both `minutes-cli` and `minutes-app` (Tauri) link it. The CLI also pulls in `which`/pty/shell plugins, hinting it sometimes shells out to the `minutes` binary. Let me dispatch parallel agents to survey the heavy subsystems while I read the coordination primitives directly.

### assistant · 2026-06-21 06:10:37

- **→** `Agent(description='Analyze CLI main.rs command surface', prompt='Read the file /Users/rymalia/projects/minutes/crates/cli/src/main.rs (9336 lines — page through it f… [+1435 chars]', subagent_type='general-purpose')`

### user · 2026-06-21 06:10:38 [sidechain] [sub: agent-a163b5cf6586dff23]

Read the file /Users/rymalia/projects/minutes/crates/cli/src/main.rs (9336 lines — page through it fully with offset/limit) and also /Users/rymalia/projects/minutes/crates/cli/src/dashboard.rs and /Users/rymalia/projects/minutes/crates/cli/src/demo_data.rs.

This is the `minutes` CLI binary built on top of the `minutes-core` library crate. I need a thorough structural understanding for a codebase-learning exercise focused on how the CLI relates to the Tauri desktop app (both consume minutes-core).

Produce a dense, structured report covering:
1. The full clap command tree — every subcommand and key flags. Group the ~45 commands by category (recording/capture, live, notes, watch, search, setup, config, dictation, knowledge, etc.).
2. For each major command, which `minutes_core::` modules/functions it calls. Especially: record/stop/live/note/watch and how they use pid.rs, events.rs, pipeline::process, live_transcript, capture, transcribe.
3. How recording state is managed (PID file, flock, CaptureMode) and how `stop` coordinates with a running `record`.
4. Output formats: where it emits JSON (for machine/MCP consumption) vs human text. Any `--json` flags.
5. How the CLI initializes logging, config loading, and feature-flag-gated behavior (whisper/parakeet/diarize/streaming).
6. Anything that signals coordination with the Tauri app or MCP server (shared files, event log, IPC, env vars).

Report findings as structured notes with file:line references. Do not modify any files. Be comprehensive but information-dense.

### assistant · 2026-06-21 06:10:40 [sidechain] [sub: agent-a163b5cf6586dff23]

I'll page through all three files thoroughly. Let me start by reading them in parallel.

### assistant · 2026-06-21 06:10:41 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### assistant · 2026-06-21 06:10:42 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/dashboard.rs')`

### tool_result · 2026-06-21 06:10:42 [sidechain] [sub: agent-a163b5cf6586dff23]

```
1	use anyhow::Result;
2	use chrono::{Local, TimeZone};
3	use clap::{Parser, Subcommand};
4	use minutes_core::apple_speech::{
5	    self, AppleSpeechBenchmarkArtifactPaths, AppleSpeechBenchmarkRequest,
6	};
7	use minutes_core::autoresearch::{
8	    self, DecodeHintEvalArtifactPaths, DecodeHintEvalComparisonArtifactPaths,
9	    DecodeHintEvalComparisonRequest, DecodeHintEvalOptions, DecodeHintEvalRe… [+20097 chars]
```

### assistant · 2026-06-21 06:10:42 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/demo_data.rs')`

### tool_result · 2026-06-21 06:10:42 [sidechain] [sub: agent-a163b5cf6586dff23]

```
1	//! Meeting Intelligence Dashboard — local HTTP server
2	//!
3	//! `minutes dashboard` starts a lightweight HTTP server that serves the
4	//! dashboard HTML and a JSON API endpoint (`GET /api/data`) built from
5	//! scanning the meetings directory.
6	//!
7	//! Architecture:
8	//!   TcpListener(:3141)
9	//!       ├── GET /          → embedded dashboard.html (include_str!)
10	//!       ├── GET /ap… [+18599 chars]
```

### tool_result · 2026-06-21 06:10:43 [sidechain] [sub: agent-a163b5cf6586dff23]

```
1	use chrono::{Days, Local};
2	use std::fs;
3	use std::io::{self, BufRead, IsTerminal, Write};
4	use std::path::{Path, PathBuf};
5	use std::thread;
6	use std::time::Duration;
7	
8	const DEMO_TAG: &str = "minutes-demo-seed";
9	const SNOWCRASH_TAG: &str = "snow-crash";
10	// These demo fixtures live in `crates/cli/fixtures/demo/` (a copy of the shared
11	// set under `crates/mcp/fixtures/demo/`). Th… [+48025 chars]
```

### assistant · 2026-06-21 06:10:47 [sidechain] [sub: agent-a163b5cf6586dff23]

I have the full picture of dashboard.rs and demo_data.rs. Now let me page through the main.rs file. It's 9336 lines, so I'll read it in large chunks. Let me continue from line 600.

### assistant · 2026-06-21 06:10:48

- **→** `Agent(description='Analyze Tauri app main + commands', prompt='Read these Tauri desktop app source files fully (page through large ones with offset/limit):\n- /User… [+1932 chars]', subagent_type='general-purpose')`

### user · 2026-06-21 06:10:48 [sidechain] [sub: agent-a132e3a8642ef6577]

Read these Tauri desktop app source files fully (page through large ones with offset/limit):
- /Users/rymalia/projects/minutes/tauri/src-tauri/src/main.rs (2867 lines)
- /Users/rymalia/projects/minutes/tauri/src-tauri/src/commands.rs (14930 lines — page fully)
- /Users/rymalia/projects/minutes/tauri/src-tauri/src/cli_setup.rs (1051 lines)
- /Users/rymalia/projects/minutes/tauri/src-tauri/src/pty.rs and palette_dispatch.rs

This is the Tauri v2 menu-bar desktop app (`minutes-app`) built on top of the `minutes-core` library. I'm learning the codebase with a focus on how the desktop app relates to and coordinates with the `minutes` CLI binary (both link minutes-core).

Produce a dense, structured report covering:
1. App lifecycle in main.rs: tray icon setup, windows created (assistant, overlays, settings), plugins registered (shell, pty, global-shortcut, updater, autostart, window-state), system tray menu items, singleton/single-instance behavior.
2. The full list of Tauri `#[tauri::command]` functions (cmd_*) in commands.rs grouped by purpose (recording, transcription, settings, calendar, knowledge, dictation, palette, etc.). For each group, note whether it (a) calls `minutes_core::` functions directly in-process, or (b) shells out to the `minutes` CLI binary via pty/shell/Command, or (c) reads/writes shared files (config.toml, event JSONL, PID files, meetings dir).
3. CRITICAL: Identify the precise coordination mechanism between the desktop app and the CLI. Does the app spawn the CLI? Does it call core directly? Both? When does it choose each? Look at cli_setup.rs and pty.rs for how it locates/installs/invokes the `minutes` binary.
4. How the app manages recording state and whether it shares the same PID file / event log as the CLI.
5. Global shortcut / hotkey handling and dictation flow in the app.
6. Any AI Assistant / singleton workspace logic and how it relates to live_transcript.

Report as structured notes with file:line references. Do not modify files. Be comprehensive and information-dense.

### assistant · 2026-06-21 06:10:48 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 06:10:49 [sidechain] [sub: agent-a163b5cf6586dff23]

```
600	    /// Build a first-pass profile for a person across meetings
601	    Person {
602	        /// Person / attendee name to profile
603	        name: String,
604	    },
605	
606	    /// Show relationship overview: top contacts, commitments, losing-touch alerts
607	    People {
608	        /// Force full index rebuild from markdown files
609	        #[arg(long)]
610	        rebuild: bool,
611	
6… [+31298 chars]
```

### assistant · 2026-06-21 06:10:50 [sidechain] [sub: agent-a132e3a8642ef6577]

I'll read all the requested files fully. Let me start with the smaller ones and page through the large commands.rs.

### assistant · 2026-06-21 06:10:51 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/main.rs')`

### assistant · 2026-06-21 06:10:52 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/cli_setup.rs')`

### tool_result · 2026-06-21 06:10:52 [sidechain] [sub: agent-a132e3a8642ef6577]

```
<system-reminder>[Truncated: PARTIAL view — showing lines 1-1454 of 2868 total (41889 tokens, cap 25000). Call Read with offset=1455 limit=1454 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
2	
3	use minutes_core::Config;
4	us… [+59800 chars]
```

### assistant · 2026-06-21 06:10:52 [sidechain] [sub: agent-a163b5cf6586dff23]

I have the full command tree and the dispatch start. Let me continue reading the dispatch and command handler implementations.

### assistant · 2026-06-21 06:10:52 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/pty.rs')`

### tool_result · 2026-06-21 06:10:52 [sidechain] [sub: agent-a132e3a8642ef6577]

```
1	//! Bundled-CLI setup: link `~/.local/bin/minutes` to the sidecar inside the
2	//! `.app` bundle so app updates automatically update the CLI.
3	//!
4	//! See `docs/PLAN-bundle-cli-in-app.md` for the design rationale. The exported
5	//! Tauri commands at the bottom of this file are the public surface.
6	//!
7	//! macOS-only. The whole module is gated at the `mod` declaration in main.rs.
8	
9	use… [+39779 chars]
```

### assistant · 2026-06-21 06:10:53 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/palette_dispatch.rs')`

### tool_result · 2026-06-21 06:10:53 [sidechain] [sub: agent-a132e3a8642ef6577]

```
1	use portable_pty::{native_pty_system, CommandBuilder, PtySize};
2	use std::collections::HashMap;
3	use std::io::{Read, Write};
4	use std::path::PathBuf;
5	use std::thread::JoinHandle;
6	use tauri::Emitter;
7	
8	pub const ASSISTANT_SESSION_ID: &str = "assistant";
9	const MAX_SESSIONS: usize = 1;
10	
11	#[cfg(windows)]
12	fn terminate_process_tree(process_id: Option<u32>) {
13	    let Some(process… [+12131 chars]
```

### assistant · 2026-06-21 06:10:53 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 06:10:53 [sidechain] [sub: agent-a132e3a8642ef6577]

```
1	//! Command palette dispatch boundary.
2	//!
3	//! This module is the Tauri-side counterpart to `minutes_core::palette`. The
4	//! core crate describes what commands exist and owns the FFI shape; this
5	//! module describes how they run. The separation exists so `minutes-core` can
6	//! stay Tauri-free and remain usable by the CLI, MCP server, and Prompter.
7	//!
8	//! # Single source of truth f… [+45480 chars]
```

### tool_result · 2026-06-21 06:10:54 [sidechain] [sub: agent-a163b5cf6586dff23]

```
1500	            &vocab_path,
1501	            &model_id,
1502	            gpu,
1503	            fp16,
1504	            vad_path.as_deref(),
1505	            vad_threshold,
1506	            &config,
1507	        ),
1508	        Commands::ParakeetBenchmark {
1509	            binary,
1510	            model_path,
1511	            audio_path,
1512	            vocab_path,
1513	            model_id,
151… [+35386 chars]
```

### assistant · 2026-06-21 06:10:57 [sidechain] [sub: agent-a163b5cf6586dff23]

Excellent detail on cmd_record. Let me continue reading the stop, live, watch, and other key handlers.

### assistant · 2026-06-21 06:10:57 [sidechain] [sub: agent-a132e3a8642ef6577]

I have the smaller files. Now let me page through the large commands.rs (14930 lines) and the rest of main.rs. Let me get a structural map of commands.rs first to navigate efficiently, and read the remaining main.rs.

### assistant · 2026-06-21 06:10:57 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 06:10:58 [sidechain] [sub: agent-a163b5cf6586dff23]

```
2400	
2401	    cleanup_live_capture_state();
2402	
2403	    let (job, queued_result) = queued?;
2404	    eprintln!(
2405	        "Queued {} processing{}.",
2406	        capture_mode.noun(),
2407	        job.title
2408	            .as_ref()
2409	            .map(|title| format!(" for {}", title))
2410	            .unwrap_or_default()
2411	    );
2412	    println!("{}", queued_result);
2413	
2414… [+34767 chars]
```

### assistant · 2026-06-21 06:10:59 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Bash(command="cd /Users/rymalia/projects/minutes/tauri/src-tauri/src && grep -n '#\\[tauri::command\\]' commands.rs… [+74 chars]", description='List all tauri::command attrs with line numbers in commands.rs')`

### tool_result · 2026-06-21 06:10:59 [sidechain] [sub: agent-a132e3a8642ef6577]

```
1007:#[tauri::command]
1021:#[tauri::command]
4814:#[tauri::command]
4862:#[tauri::command]
4908:#[tauri::command]
5919:#[tauri::command]
6017:#[tauri::command]
6029:#[tauri::command]
6034:#[tauri::command]
6039:#[tauri::command]
6045:#[tauri::command]
6057:#[tauri::command]
6093:#[tauri::command]
6117:#[tauri::command]
6126:#[tauri::command]
6308:#[tauri::command]
6313:#[tauri::command]
6318:#[ta… [+2010 chars]
```

### assistant · 2026-06-21 06:11:01 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Bash(command="cd /Users/rymalia/projects/minutes/tauri/src-tauri/src && grep -nE '^(pub )?(async )?fn |^pub struct… [+184 chars]", description='Map structure of commands.rs')`

### tool_result · 2026-06-21 06:11:01 [sidechain] [sub: agent-a132e3a8642ef6577]

```
24:use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
25:use tauri_plugin_notification::NotificationExt;
26:use tauri_plugin_shell::ShellExt;
28:pub struct AppState {
94:pub struct DictationFocusGuard {
100:pub struct PendingDictationTarget {
107:pub enum PermissionRestartStatus {
115:pub struct PermissionRestartSafety {
125:struct PermissionRestartSnapshot {
136:fn dictation_focus_debug(
17… [+23672 chars]
```

### assistant · 2026-06-21 06:11:01 [sidechain] [sub: agent-a163b5cf6586dff23]

Let me continue reading the live, watch, dictate, transcript, capabilities, and events handlers, which are the most relevant to the Tauri/MCP coordination question.

### assistant · 2026-06-21 06:11:02 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 06:11:03 [sidechain] [sub: agent-a163b5cf6586dff23]

```
3300	            eprintln!("  {}", conflict.latest.path.display());
3301	        }
3302	    }
3303	
3304	    if !report.stale_commitments.is_empty() {
3305	        eprintln!("\nStale commitments ({}):", report.stale_commitments.len());
3306	        for stale in &report.stale_commitments {
3307	            let who = owner_display(
3308	                stale.entry.who.as_deref(),
3309… [+34391 chars]
```

### assistant · 2026-06-21 06:11:04 [sidechain] [sub: agent-a132e3a8642ef6577]

Now let me read the rest of main.rs (the Builder setup, plugins, tray, single-instance) and key sections of commands.rs. Let me read main.rs 1455-2868 and the AppState struct + recording/dictation/live core sections.

### assistant · 2026-06-21 06:11:05 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/main.rs')`

### tool_result · 2026-06-21 06:11:06 [sidechain] [sub: agent-a132e3a8642ef6577]

```
1455	            "help-open-changelog" => {
1456	                if let Err(err) = commands::open_target(app, MINUTES_CHANGELOG_URL) {
1457	                    commands::show_user_notification(app, "Release Notes", &err);
1458	                }
1459	            }
1460	            "help-open-discussions" => {
1461	                if let Err(err) = commands::open_target(app, MINUTES_DISCUSSIONS_URL)… [+74697 chars]
```

### assistant · 2026-06-21 06:11:06 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/commands.rs')`

### tool_result · 2026-06-21 06:11:07 [sidechain] [sub: agent-a132e3a8642ef6577]

```
1	use crate::call_capture;
2	use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
3	use futures_util::StreamExt;
4	use minisign_verify::{PublicKey, Signature};
5	use minutes_core::capture::{
6	    should_bypass_preflight_block_for_native_call_capture, RecordingIntent,
7	};
8	use minutes_core::config::{ConsentMode, VALID_LIVE_TRANSCRIPT_BACKENDS, VALID_PARAKEET_MODELS};… [+4818 chars]
```

### assistant · 2026-06-21 06:11:07 [sidechain] [sub: agent-a163b5cf6586dff23]

Let me jump to the live, dictate, transcript, capabilities, events handlers. Let me search for their line numbers first to read efficiently.

### assistant · 2026-06-21 06:11:08 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Bash(command='grep -n "^fn cmd_\\|^fn spawn\\|live_transcript\\|capabilities" crates/cli/src/main.rs | head -120', description='List all cmd_ fn definitions with line numbers')`

### tool_result · 2026-06-21 06:11:08 [sidechain] [sub: agent-a163b5cf6586dff23]

```
477:    /// Print Minutes CLI capabilities as JSON for MCP feature detection.
1561:            AppleSpeechAction::Capabilities { json } => cmd_apple_speech_capabilities(json),
1566:        Commands::Capabilities { json } => cmd_capabilities(json),
1852:fn cmd_note(text: &str, meeting: Option<&Path>, config: &Config) -> Result<()> {
1870:fn cmd_sensitive(action: SensitiveAction, config: &Config) ->… [+5873 chars]
```

### assistant · 2026-06-21 06:11:11 [sidechain] [sub: agent-a132e3a8642ef6577]

I have main.rs and the surrounding structure fully. Now I need the key coordination sections of commands.rs: recording start (5098+), launch_recording, spawn_terminal/agent resolution (8213+), dictation/live (12585+), and how core is invoked. Let me read the critical coordination sections.

### assistant · 2026-06-21 06:11:12 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/commands.rs')`

### assistant · 2026-06-21 06:11:12 [sidechain] [sub: agent-a163b5cf6586dff23]

Now let me read the key handlers: process, capabilities, watch, setup, live, transcript, events, get, and dictate.

### tool_result · 2026-06-21 06:11:12 [sidechain] [sub: agent-a132e3a8642ef6577]

```
5098	pub fn start_recording(
5099	    app_handle: tauri::AppHandle,
5100	    recording: Arc<AtomicBool>,
5101	    starting: Arc<AtomicBool>,
5102	    stop_flag: Arc<AtomicBool>,
5103	    processing: Arc<AtomicBool>,
5104	    processing_stage: Arc<Mutex<Option<String>>>,
5105	    latest_output: Arc<Mutex<Option<OutputNotice>>>,
5106	    activation_progress: Arc<Mutex<ActivationProgress>>,
5107… [+29501 chars]
```

### assistant · 2026-06-21 06:11:12 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/commands.rs')`

### tool_result · 2026-06-21 06:11:13 [sidechain] [sub: agent-a132e3a8642ef6577]

```
7954	fn meeting_title_from_path(path: &str) -> String {
7955	    Path::new(path)
7956	        .file_stem()
7957	        .and_then(|stem| stem.to_str())
7958	        .map(|stem| stem.replace('-', " "))
7959	        .unwrap_or_else(|| "Meeting Discussion".into())
7960	}
7961	
7962	fn terminal_title_for_mode(mode: &str, meeting_path: Option<&str>) -> Result<String, String> {
7963	    match mode {
796… [+13548 chars]
```

### assistant · 2026-06-21 06:11:13 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### assistant · 2026-06-21 06:11:14 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 06:11:14 [sidechain] [sub: agent-a163b5cf6586dff23]

```
4353	fn cmd_process(
4354	    path: &Path,
4355	    content_type: &str,
4356	    title: Option<&str>,
4357	    template: Option<&minutes_core::Template>,
4358	    config: &Config,
4359	) -> Result<()> {
4360	    if !path.exists() {
4361	        anyhow::bail!("file not found: {}", path.display());
4362	    }
4363	
4364	    let ct = match content_type {
4365	        "meeting" => ContentType::Meeting… [+8570 chars]
```

### tool_result · 2026-06-21 06:11:14 [sidechain] [sub: agent-a163b5cf6586dff23]

```
4877	/// The MCP server probes `minutes capabilities --json` at boot and uses
4878	/// the returned feature flags to decide which tools to register. This is
4879	/// the canonical surface for feature detection (see #183 phase 2); it
4880	/// replaces the earlier strict-equality version check.
4881	///
4882	/// Schema stability: `api_version` bumps only when the wire contract
4883	/// (keys removed… [+11857 chars]
```

### assistant · 2026-06-21 06:11:16 [sidechain] [sub: agent-a132e3a8642ef6577]

Now the dictation and live transcript sections, plus the context.rs module for the assistant workspace. Let me read dictation/live (12585-13540) and context.rs.

### assistant · 2026-06-21 06:11:17 [sidechain] [sub: agent-a163b5cf6586dff23]

Now the live/transcript/events/get/dictate handlers, which are most relevant to Tauri/MCP coordination.

### assistant · 2026-06-21 06:11:17 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/commands.rs')`

### assistant · 2026-06-21 06:11:18 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/context.rs')`

### tool_result · 2026-06-21 06:11:18 [sidechain] [sub: agent-a132e3a8642ef6577]

```
12585	pub fn cmd_start_dictation(
12586	    app: tauri::AppHandle,
12587	    _state: tauri::State<AppState>,
12588	) -> Result<String, String> {
12589	    start_dictation_session(&app, None)
12590	}
12591	
12592	#[tauri::command]
12593	pub fn cmd_recent_dictations(
12594	    limit: Option<usize>,
12595	) -> Result<Vec<minutes_core::dictation_memory::DictationMemoryRecord>, String> {
12596	    minu… [+17113 chars]
```

### assistant · 2026-06-21 06:11:18 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 06:11:18 [sidechain] [sub: agent-a132e3a8642ef6577]

```
1	use minutes_core::config::Config;
2	use minutes_core::markdown::{split_frontmatter, Frontmatter, IntentKind};
3	use minutes_core::search::{self, SearchFilters};
4	use std::fs;
5	use std::path::{Path, PathBuf};
6	
7	pub const ACTIVE_MEETING_FILE: &str = "CURRENT_MEETING.md";
8	pub const ACTIVE_ARTIFACT_FILE: &str = "CURRENT_ARTIFACT.md";
9	pub const ASSISTANT_INSTRUCTION_FILES: &[&str] = &["CLAUD… [+32352 chars]
```

### tool_result · 2026-06-21 06:11:19 [sidechain] [sub: agent-a163b5cf6586dff23]

```
9166	fn cmd_live(config: &Config) -> Result<()> {
9167	    use std::sync::atomic::AtomicBool;
9168	    use std::sync::Arc;
9169	
9170	    let permission_preflight = minutes_core::capture::preflight_microphone_only();
9171	    if let Some(reason) = &permission_preflight.blocking_reason {
9172	        anyhow::bail!("{}", reason);
9173	    }
9174	    for warning in &permission_preflight.warnings {
91… [+6673 chars]
```

### assistant · 2026-06-21 06:11:19 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 06:11:19 [sidechain] [sub: agent-a163b5cf6586dff23]

```
7290	fn cmd_get(slug_or_path: &str, json: bool, compact_json: bool, config: &Config) -> Result<()> {
7291	    // Accept either a slug ("2026-03-17-advisor-call") or a path to the
7292	    // meeting markdown. MCP and Tauri pass paths; humans pass slugs. Paths —
7293	    // whether absolute or relative to cwd — must resolve to a .md file
7294	    // inside the configured meetings directory. The che… [+6914 chars]
```

### assistant · 2026-06-21 06:11:22 [sidechain] [sub: agent-a132e3a8642ef6577]

I now have a comprehensive understanding. Let me verify two remaining points: the dictation session runner (`start_dictation_session`) and the `cmd_install_update` path, plus confirm the `cmd_set_setting`/config writing. Let me grep for these quickly.

### assistant · 2026-06-21 06:11:23 [sidechain] [sub: agent-a163b5cf6586dff23]

I have enough to write a comprehensive report. Let me read the remaining segments I haven't seen: dictate, setup, service, qmd, agent_annotate, insights, context, import, vault, confirm, enroll — plus the setup handler and the parse_events_since helper. Let me grab the dictate, setup, agent_annotate/insights, and confirm in two reads.

### assistant · 2026-06-21 06:11:24 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Bash(command="cd /Users/rymalia/projects/minutes/tauri/src-tauri/src && grep -n 'fn start_dictation_session\\|dicta… [+184 chars]", description='Locate dictation session runner and install update')`

### tool_result · 2026-06-21 06:11:24 [sidechain] [sub: agent-a132e3a8642ef6577]

```
5842:pub fn handle_dictation_shortcut_event(
6065:    if let Err(error) = spawn_terminal(&app, &state.pty_manager, "meeting", Some(&path), None) {
6094:pub fn cmd_run_meeting_debrief(
6102:    spawn_terminal(&app, &state.pty_manager, "meeting", Some(&path), None)?;
7130:            minutes_core::dictation::preload_model(&preload_config).ok();
8213:pub fn spawn_terminal(
8279:pub fn cmd_spawn_termi… [+1482 chars]
```

### assistant · 2026-06-21 06:11:24 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 06:11:25 [sidechain] [sub: agent-a163b5cf6586dff23]

```
8586	fn cmd_dictate(stdout: bool, note_only: bool, config: &Config) -> Result<()> {
8587	    use std::sync::atomic::AtomicBool;
8588	    use std::sync::Arc;
8589	
8590	    let permission_preflight = minutes_core::capture::preflight_microphone_only();
8591	    if let Some(reason) = &permission_preflight.blocking_reason {
8592	        anyhow::bail!("{}", reason);
8593	    }
8594	    for warning in &… [+7257 chars]
```

### assistant · 2026-06-21 06:11:25 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 06:11:25 [sidechain] [sub: agent-a163b5cf6586dff23]

```
5250	fn cmd_setup(model: &str, list: bool, diarization: bool) -> Result<()> {
5251	    if list {
5252	        eprintln!("Available whisper models:");
5253	        eprintln!("  tiny      75 MB   (fastest, lowest quality)");
5254	        eprintln!("  base     142 MB");
5255	        eprintln!("  small    466 MB   (recommended default)");
5256	        eprintln!("  medium   1.5 GB");
5257	        eprin… [+7338 chars]
```

### assistant · 2026-06-21 06:11:27 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/commands.rs')`

### assistant · 2026-06-21 06:11:27 [sidechain] [sub: agent-a132e3a8642ef6577]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/commands.rs')`

### tool_result · 2026-06-21 06:11:28 [sidechain] [sub: agent-a132e3a8642ef6577]

```
13650	fn start_dictation_session(
13651	    app: &tauri::AppHandle,
13652	    capture_style: Option<HotkeyCaptureStyle>,
13653	) -> Result<String, String> {
13654	    let state = app.state::<AppState>();
13655	
13656	    // Acquire BEFORE any side effects (overlay, focus capture, emits). The
13657	    // previous load→store gap could let two starts race past the load and
13658	    // both fall int… [+5537 chars]
```

### tool_result · 2026-06-21 06:11:28 [sidechain] [sub: agent-a132e3a8642ef6577]

```
13387	pub(crate) fn dictation_pid_active() -> bool {
13388	    minutes_core::pid::check_pid_file(&minutes_core::pid::dictation_pid_path())
13389	        .ok()
13390	        .flatten()
13391	        .is_some()
13392	}
13393	
13394	fn dictation_record_engine_id(config: &Config) -> String {
13395	    match config.dictation.backend.as_str() {
13396	        "whisper" | "" => format!("whisper:{}", confi… [+367 chars]
```

### assistant · 2026-06-21 06:11:29 [sidechain] [sub: agent-a163b5cf6586dff23]

I now have comprehensive coverage. Let me do a couple targeted reads on the remaining coordination-relevant handlers: agent_annotate, the confirm handler (overlays/voice), and the desktop_control PID-ownership check, plus the qmd/service handlers briefly.

### assistant · 2026-06-21 06:11:30 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 06:11:30 [sidechain] [sub: agent-a163b5cf6586dff23]

```
7487	fn cmd_agent_annotate(
7488	    agent_id: String,
7489	    tools: Vec<String>,
7490	    subkind: String,
7491	    meeting_id: Option<String>,
7492	    meeting_path: Option<String>,
7493	    span_start_ms: Option<u64>,
7494	    span_end_ms: Option<u64>,
7495	    body: String,
7496	    citations: Vec<String>,
7497	    confidence: String,
7498	    provenance: Option<String>,
7499	) -> Result<()>… [+3139 chars]
```

### assistant · 2026-06-21 06:11:30 [sidechain] [sub: agent-a163b5cf6586dff23]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 06:11:31 [sidechain] [sub: agent-a163b5cf6586dff23]

```
8944	fn cmd_confirm(
8945	    meeting_path: &Path,
8946	    speaker: Option<&str>,
8947	    name: Option<&str>,
8948	    save_voice: bool,
8949	    config: &Config,
8950	) -> Result<()> {
8951	    use minutes_core::diarize::{AttributionSource, Confidence};
8952	    use minutes_core::overlays;
8953	    use minutes_core::voice;
8954	
8955	    if !meeting_path.exists() {
8956	        return Err(anyho… [+4852 chars]
```

### assistant · 2026-06-21 06:13:12 [sidechain] [sub: agent-a163b5cf6586dff23]

I have thoroughly read main.rs (command tree, full dispatch, and all the load-bearing handlers), dashboard.rs, and demo_data.rs. I have enough to produce the comprehensive report.

---

# `minutes` CLI Structural Report (`crates/cli/src/`)

All references are to `/Users/rymalia/projects/minutes/crates/cli/src/main.rs` unless noted. The CLI is a thin clap dispatcher over `minutes_core::`; nearly every handler delegates to a core module. The Tauri app consumes the same `minutes_core` directly (no subprocess), so the CLI and Tauri are **peer front-ends sharing core + on-disk state**, not layered.

## 1. Clap command tree

Top-level `Cli` (lines 268–287): one global flag `-v/--verbose` (DEBUG logging) plus `command: Commands`. `version`/`long_version` embed `CARGO_PKG_VERSION` + a GitHub release-tag URL (272–276). The `Commands` enum (289–1106) holds ~55 variants. Subcommand enums: `SensitiveAction` (1108), `VocabularyAction` (1120), `VaultAction` (1171), `AutoresearchAction` (1195), `AppleSpeechAction` (1250), `TemplateCmd` (1275), `ContextAction` (1291).

### By category

**Recording / capture**
- `Record` (291–361) — flags: `--title -t`, `--context -c`, `--mode {meeting,quick-thought}`, `--intent {auto,memo,room,call}`, `--allow-degraded`, `--skip-audio-probe <REASON>`, `--consent <BASIS>`, `--consent-notice <TEXT>`, `--language -l`, `--device -D`, `--source` (repeatable, 2 for dual-source), `--call`, `--diagnose <WAV>`, `--mute-mic`, `--template`.
- `Stop` (382) — no args.
- `MicToggle` (363–370) — `--state {on,off}`.
- `Extend` (391) — resets auto-stop timers via sentinel.
- `Sensitive {Start{--title}, Stop}` (385, 1108) — no-capture meeting.
- `Process` (710–735) — offline audio file: `path`, `--content-type -t`, `--note -n`, `--title`, `--language -l`, `--template`.
- `PreflightRecord` (hidden, 448) — `--mode --intent --allow-degraded --json`.

**Live transcript**
- `Live` (1036–1046) — `--language -l`, `--device -D`.
- `Transcript` (1048–1061) — `--since <line|5m|30s>`, `--status`, `--format {text,json}` (default **json**).

**Notes / annotation**
- `Note` (372–380) — `text`, `--meeting <PATH>` (post-hoc annotation).
- `AgentAnnotate` (916–961) — append-only `agent.annotation` event; flags: `--agent-id`, `--tool` (rep), `--subkind`, `--meeting-id`, `--meeting-path`, `--span-start-ms`/`--span-end-ms`, `--body`, `--citation` (rep), `--confidence`, `--provenance` (JSON).

**Watch / service / jobs**
- `Watch` (743–751) — `dir`, `--language`.
- `Service {install,uninstall,restart,status}` (836–843) — launchd/systemd.
- `Jobs` (492–505) — `--all --json --limit -l`.
- `ProcessQueue` (hidden, 394) — background worker entrypoint.

**Search / query / intelligence**
- `Search` (536–580) — `query`, `--content-type -t`, `--since -s`, `--limit -l`, `--intents-only`, `--intent-kind`, `--owner`, `--format {text,json}`, `--sync`/`--no-sync` (mutually exclusive).
- `Actions` (582–587) — `--assignee -a`.
- `Consistency` (589–598) — `--owner`, `--stale-after-days`.
- `Person` (600–604), `People` (606–619, `--rebuild --json --limit`), `Commitments` (627–636), `Research` (638–654), `List` (656–673), `Export` (675–684, CSV), `Insights` (963–988), `Get` (879–891, `--json --compact-json`), `Schema` (876).

**Knowledge / vocabulary / vault**
- `Ingest` (686–698), `Vocabulary {List,Add,Remove,Suggest,Rebuild}` (621, 1120), `Vault {Setup,Status,Unlink,Sync}` (1010, 1171), `Qmd {status,register}` (780–789), `Import` (996–1008, granola or audio).

**Setup / config / diagnostics**
- `Setup` (753–778) — `--model -m`, `--list`, `--diarization`, `--parakeet`, `--parakeet-model`, `--demo`.
- `Paths`/`Storage`/`Cleanup`/`Status`/`Health`/`Logs`/`Devices`/`Sources`/`Capabilities`/`Events`/`Demo`/`Dashboard`/`Delete`/`Clean`/`Template`/`Automate`.

**Dictation / voice**
- `Dictate` (810–828, `--stdout --note-only --language --device`), `Enroll` (1016–1024), `Voices` (1026–1034), `Confirm` (1088–1105, speaker attribution).

**Context (desktop sidecar)** — `Context {ActivitySummary, Search, GetMoment}` (990, 1291).

**Hidden / maintainer** (`#[command(hide = true)]`): `ProcessQueue`, `ParakeetHelper` (398–425), `ParakeetBenchmark` (427), `PreflightRecord`, `Autoresearch` (464). Plus `AppleSpeech` and `Capabilities` are visible but research/integration-oriented.

`ParakeetHelper` is notable: the CLI invokes *itself* as a subprocess for each Parakeet utterance (`transcribe::transcribe_with_parakeet` forwards `--fp16` etc.); the `fp16` flag bug is documented inline at 411–420 (issue #163).

## 2. Core modules per major command

| Command | Handler (line) | Key `minutes_core::` calls |
|---|---|---|
| `record` | `cmd_record` (2159) | `capture::preflight_recording`; `health::probe_system_audio_capture` (via `check_meeting_system_audio_probe` 2094); `pid::create`/`write_recording_metadata_with_context`/`current_wav_path`; `notes::save_recording_start/save_context/save_consent`; `desktop_context::maybe_start_capture_session`+`DesktopContextCollector::start`; `sensitive::ensure_inactive_for_recording`; **`capture::record_to_wav_with_lifecycle`** (blocking capture loop, 2316); then **`jobs::queue_live_capture_with_recording_health`** + `spawn_queue_worker` (NOT pipeline directly — recordings are queued, processed async by the `process-queue` worker) |
| `stop` | `cmd_stop` (2456) | `pid::check_recording`/`read_recording_metadata`/`write_stop_sentinel`/`pid_path`/`last_result_path`; `desktop_control::desktop_app_owns_pid` (2471); `graph::rebuild_index`; falls back to `live_transcript` PID path |
| `live` | `cmd_live` (9166) | `capture::preflight_microphone_only`; `desktop_context::maybe_start_live_transcript_session`; **`live_transcript::run(stop, config, session_id)`** (blocking) |
| `transcript` | `cmd_transcript` (9249) | `live_transcript::session_status`/`read_since_duration`/`read_since_line` |
| `note` | `cmd_note` (1852) | `notes::add_note` (live) or `notes::validate_meeting_path`+`annotate_meeting` |
| `watch` | `cmd_watch` (5130) | `watch::run(dir, config)` (blocking); `watch::lock_path` for Ctrl-C cleanup |
| `process` | `cmd_process` (4353) | **`pipeline::process_with_template`** (synchronous, unlike `record`); `graph::rebuild_index`; `notes::save_context`/`cleanup` for `--note` |
| `process-queue` | `cmd_process_queue` (2579) | `jobs::process_pending_jobs(config, cb)` — the async worker that drains the queue |
| `diagnose` | `cmd_diagnose` (4470) | `diarize::diarize_with_context`; `voice::open_db`/`cosine_similarity`; `process` |
| `dictate` | `cmd_dictate` (8586) | `capture::preflight_microphone_only`; **`dictation::run`** (callback-based); `dictation_memory::append_record` |
| `confirm` | `cmd_confirm` (8944) | `overlays::*`; `voice::save_profile_blended`; rewrites `speaker_map` |
| `get` | `cmd_get` (7290) | `search::resolve_slug`; `notes::validate_meeting_path`; `overlays::load_speaker_confirmations_for_meeting_at`+`apply_speaker_confirmations` |
| `events` | `cmd_events` (7357) | `events::read_events`/`read_events_since_seq`/`latest_event_seq` |
| `agent-annotate` | `cmd_agent_annotate` (7487) | `events::append_agent_annotation` (allowlist-gated) |

### record vs process — the critical asymmetry
`record` does **not** call `pipeline::process`. It captures to WAV, then **enqueues a job** (`jobs::queue_live_capture_with_recording_health`, 2344) and spawns a detached `minutes process-queue` worker (`spawn_queue_worker`, 2417, via `std::env::current_exe()`). `stop` polls for PID-file removal and reads `pid::last_result_path()`. `process` (offline file) runs `pipeline::process_with_template` **synchronously** in-process. This means a `record`/`stop` pair coordinates across three processes: the recorder, `stop`, and the queue worker.

## 3. Recording-state management

- **PID + flock**: `pid::create()` (2227) writes `~/.minutes/recording.pid` under an fs2 flock (atomic check-and-write). `pid::check_recording`/`status`/`inspect_pid_file`/`read_recording_metadata` are the readers.
- **Metadata sidecar**: `pid::write_recording_metadata_with_context(CaptureMode, session_id)` (2244) stores the `CaptureMode` and desktop-context session id alongside the PID so `stop` knows the mode without re-deriving it (`read_recording_metadata`, 2459).
- **CaptureMode** (from `minutes_core`): `Meeting`, `QuickThought`, `Dictation`, `LiveTranscript`. Parsed from `--mode` via `capture_mode_from_str` (1943). `RecordingIntent` (`Memo`/`Room`/`Call`) parsed separately via `parse_recording_intent` (1954); `--call` upgrades `auto`→`call` (1453).
- **stop coordination** (2456): writes a **stop sentinel** (`pid::write_stop_sentinel`, cross-platform) AND on Unix sends `SIGTERM` — *unless* `desktop_control::desktop_app_owns_pid(pid)` returns true (2471), in which case it is **sentinel-only** (the Tauri app owns the recorder and must not be SIGTERM'd). The recorder's signal handler ignores SIGTERM (`libc::signal(SIGTERM, SIG_IGN)`, 2311) and instead relies on the sentinel + double-Ctrl-C (`handle_graceful_interrupt`, 153). `stop` then polls `pid_path().exists()` (120s timeout for recording, 30s for live) and prints `last_result_path` contents.
- **Live vs batch exclusivity**: `record` bails if a live-transcript PID is active (`pid::live_transcript_pid_path` + `inspect_pid_file().is_active()`, 2197–2200); `stop` falls back to stopping a live-transcript session if no batch recording exists (2541). `inspect_pid_file` (rather than reading PID) is used so a Windows mandatory-lock holder is still detected (issue #258).
- **Sensitive + sentinel races**: double-checked `sensitive::ensure_inactive_for_recording` before and after `pid::create` (2201, 2234) to close the interleaving window (review F3).
- **Mic mute**: `streaming::set_mic_muted_with_sentinel` / `toggle_mic_mute_with_sentinel` (2437) — a sentinel file the dual-source record loop reads each iteration; works even with no active recording (pre-armed for next run, 2448).
- **Cleanup**: `cleanup_live_capture_state` (1967) removes PID, clears recording metadata, clears notes.

## 4. Output formats: JSON vs human text

A consistent convention runs through the CLI: **human-readable lines go to stderr (`eprintln!`), machine-readable JSON goes to stdout (`println!`)** — so piping captures JSON cleanly even without a `--json` flag. Examples: `cmd_search` (3127 stderr / 3138 stdout), `cmd_actions` (3194/3198), `cmd_people` (3441/3481), `cmd_devices` (3155). Many commands emit JSON to stdout *unconditionally* in addition to the stderr prose.

- **`--json` flag**: `Jobs`, `Paths`, `Storage`, `Cleanup`, `People`, `Health`, `Voices`, `Commitments`, `Capabilities`, `Get`, `Automate`, all `Vocabulary`/`Context`/`AppleSpeech`/`Autoresearch` subcommands, `PreflightRecord`.
- **`--format text|json`**: `Search` (default text) and `Transcript` (default **json** — built for agents). JSON-search mode emits **JSONL** (one object per line, 3116/3159), not an array.
- **`--compact-json`**: `Get` omits `raw_markdown` (7346).
- **Structured envelopes**: `JsonEnvelope<T>` `{ok, command, data, meta:{schemaVersion, generatedAt}}` via `json_envelope` (107) — used by `paths`, `storage`, `cleanup`, `apple-speech`. `ParakeetHelperEnvelope` (91) for the hidden helper. `record`/`process`/`stop` emit ad-hoc `{status, job_id|file, title, ...}` JSON to stdout (2360, 4387, 2521).
- `status` (2584) emits `pid::status()` as pretty JSON only.

## 5. Logging, config, feature flags

- **Logging** (`main`, 1369–1381): `tracing_subscriber::fmt` to stderr; default filter `"{info|debug},whisper_rs=warn,ggml=warn"` (demotes chatty C loggers, issue #163); `RUST_LOG` overrides entirely. **`minutes_core::install_whisper_logging_hooks()`** routes whisper.cpp/ggml C-level stderr through tracing. `logging::rotate_logs()` runs at startup (1387). `spawn_queue_worker` forwards `RUST_LOG` to the child (2426).
- **Config** (1383): `Config::load()` (TOML at `~/.config/minutes/config.toml` with compiled defaults). Per-command CLI overrides mutate the loaded `config` before dispatch: `--language`→`config.transcription.language` (1407, 1635, 1663, 1674), `--device`→`config.recording.device`, `--source`/`--call`→`resolve_recording_device_overrides` (1985, sets `config.recording.sources`/`device`). `config.ensure_dirs()` called by record/process/watch.
- **Feature flags** (Cargo): handlers are `#[cfg]`-gated with stub fallbacks.
  - `whisper` (default): `cmd_live`/`cmd_transcript`/`cmd_dictate` have `#[cfg(not(feature="whisper"))]` stubs returning an error (9241, 9331, 8713).
  - `parakeet`: `cmd_parakeet_helper`/`cmd_parakeet_benchmark` have real (4571/4642) and stub (4623/4674) versions; `ParakeetHelperEnvelope` is `#[cfg(feature="parakeet")]`.
  - `diarize`: surfaced at runtime via capabilities.
  - `vad-ort`: `cmd_setup` conditionally downloads the Silero ONNX (5386).
  - **Capabilities report** (`build_capability_report`, 4900): a `BTreeMap<String,bool>` that includes `cfg!(feature="parakeet")` / `cfg!(feature="diarize")` (4949–4950) so runtime feature support is wire-visible.

## 6. Tauri / MCP coordination signals

This is the heart of the cross-front-end story. The CLI shares state with Tauri and MCP entirely through **`minutes_core` + on-disk files under `~/.minutes/` and `~/meetings/`** — there is no socket/IPC between them.

- **MCP feature detection**: `Capabilities {--json}` (477–487, `cmd_capabilities` 4962) is explicitly "the canonical surface for feature detection (#183 phase 2)". The MCP server (`crates/mcp`) shells out to `minutes capabilities --json` at boot and registers tools per feature key. The doc comment (4877) and the feature-name list (4913–4945, e.g. `start_recording`, `read_live_transcript`, `get_meeting`, `activity_summary`) map 1:1 to MCP tool names — the contract is "add a feature key in the same commit as a new MCP-visible subcommand."
- **Event log** (`events.rs`): `Events {--follow --since-seq}` (893–914, `cmd_events`/`cmd_events_follow` 7357/7401) reads the append-only JSONL event log. `--since-seq` + `--follow` (500ms poll loop, 7434) is the agent-reactivity stream. `record` writes `RecordingStartedContext` capabilities into the lifecycle (2320). `agent-annotate` appends `agent.annotation` events via `events::append_agent_annotation`, gated by `~/.minutes/agents.allow` (allowlist path surfaced in errors, 7515) — this is how external agents (Tauri assistant, Claude) annotate without mutating markdown.
- **Desktop-app PID ownership**: `cmd_stop` calls `desktop_control::desktop_app_owns_pid(pid)` (2471) and switches to sentinel-only stop when the **Tauri app started the recording**. This is the single most explicit CLI↔Tauri coordination point: both write the same `recording.pid`, and `stop` must not SIGTERM a Tauri-owned recorder.
- **Desktop context sidecar** (`desktop_context` / `context_store`): both `record` (2238) and `live` (9208) call `maybe_start_capture_session` / `maybe_start_live_transcript_session` and run a `DesktopContextCollector`. `Context` subcommands (`cmd_context`, 7668) query this store — shared with the desktop app's context capture.
- **Live transcript JSONL**: `live_transcript::run` writes a JSONL file (path in `session_status().jsonl_path`); `Transcript {--since}` does delta reads. The CLAUDE.md describes this as the agent-agnostic coaching surface read by Tauri's assistant, Claude Desktop, etc. `RecordingSidecar` source (9257) distinguishes a transcript spun off a recording vs a standalone live session.
- **Job queue** (`jobs.rs`): `record` enqueues; `process-queue` (a detached self-spawn) drains; `stop` and `Jobs --json` read job state. The Tauri app uses the same `jobs` queue, so a CLI `stop` can surface a Tauri-enqueued job (2517).
- **Result handoff file**: `pid::last_result_path()` (`~/.minutes/`) is how the recorder process hands its queued-result JSON to the `stop` process (2367 write / 2506 read).
- **`get` path validation** (7292 comment): "MCP and Tauri pass paths; humans pass slugs" — `cmd_get` accepts both and validates paths stay inside the meetings dir.
- **Overlays DB** (`overlays.rs`): `confirm` writes speaker confirmations; `get --json` layers them over `speaker_map` without touching markdown — a shared sidecar both Tauri and MCP can rely on.
- **Env vars**: `RUST_LOG` (logging + forwarded to queue worker, 2426); `MINUTES_DEV_SIGNING_IDENTITY`/`MINUTES_SKILLS_ROOT` are build/packaging-side (per CLAUDE.md), not read in main.rs. `COLUMNS` read by `demo_data::term_width` (122). The CLI re-invokes itself via `std::env::current_exe()` for both `process-queue` (2422) and the Parakeet helper subprocess.
- **Sidecar shutdown**: `main` installs a panic hook (162) and calls `parakeet_sidecar::shutdown_global_parakeet_sidecar()` on every exit path (1848) — relevant because the persistent Parakeet sidecar is shared process-level state.

## Supporting files

- **`dashboard.rs`**: `minutes dashboard` (`serve`, 450) — a hand-rolled `TcpListener` HTTP server on `:3141` (falls back to random port). Routes: `/` serves embedded `assets/dashboard.html` (`include_str!`, 23), `/api/data` returns `DashboardData{meetings,stats,topics,warnings}` from a `walkdir` scan of `config.output_dir` parsing YAML frontmatter (`collect_dashboard_data`, 146), `/api/open?path=` opens a meeting in the default app **with a path-canonicalization guard** rejecting anything outside the meetings dir (407–419). Guards a `dashboard.pid` via `pid::create_pid_guard` (454) so only one runs. `parse_duration` (37) handles `45m`/`1h 12m`/`1:23:45` formats. Pure read-only over the markdown corpus — same data Tauri/MCP read.
- **`demo_data.rs`**: `minutes demo` / `setup --demo`. `seed_demo_meetings` (968) writes 5 interconnected Snow Crash-themed meeting `.md` files (relative dates, `0600` perms, `minutes-demo-seed`+`snow-crash` tags) into `output_dir`; `clean_demo_meetings` (910) removes by frontmatter tag (not filename). `install_mcp_demo_fixtures` (44) copies the 5 fixtures from `crates/cli/fixtures/demo/` (a deliberate in-crate copy of `crates/mcp/fixtures/demo/` — `include_str!` outside the crate root breaks `cargo publish`, see #280; **both copies must stay in sync**). `present_demo` (151) is an animated terminal CYOA narrative (ANSI escapes, typewriter effect, interactive thread picker) demonstrating cross-meeting search. `query_demo` (936) replays a canned cross-meeting query.

### Key takeaway for the learning exercise
The CLI is a stateless dispatcher; **all durable state and all cross-front-end coordination live in `minutes_core` and `~/.minutes/`**: the flock'd `recording.pid` + metadata sidecar, the `last_result_path` handoff, the append-only `events` JSONL (+ agent-annotation allowlist), the `jobs` queue drained by a self-spawned `process-queue` worker, the live-transcript JSONL, the desktop-context store, and the overlays DB. Tauri owns the same files (notably `recording.pid`, detected via `desktop_control::desktop_app_owns_pid`), and the MCP server discovers CLI capabilities through `minutes capabilities --json`. `record` is async-queued while `process` is synchronous — the single most important behavioral asymmetry in the binary.

### tool_result · 2026-06-21 06:13:12

```
I have thoroughly read main.rs (command tree, full dispatch, and all the load-bearing handlers), dashboard.rs, and demo_data.rs. I have enough to produce the comprehensive report.

---

# `minutes` CLI Structural Report (`crates/cli/src/`)

All references are to `/Users/rymalia/projects/minutes/crates/cli/src/main.rs` unless noted. The CLI is a thin clap dispatcher over `minutes_core::`; nearly ev… [+18756 chars]
```

### tool_result · 2026-06-21 06:13:12

```
agentId: a163b5cf6586dff23 (use SendMessage with to: 'a163b5cf6586dff23' to continue this agent)
<usage>subagent_tokens: 172283
tool_uses: 16
duration_ms: 154330</usage>
```

### assistant · 2026-06-21 06:13:32 [sidechain] [sub: agent-a132e3a8642ef6577]

I have everything needed for a comprehensive report. Here is the structured analysis.

---

# Minutes Tauri Desktop App (`minutes-app`) — Architecture & CLI Coordination

## Headline finding: how the app relates to the CLI

The desktop app and `minutes` CLI **both statically link `minutes-core`** and almost always call core **directly, in-process** — the app does **not** spawn the CLI to do its work. The two binaries coordinate **not** through process invocation but through **shared on-disk state** that core reads/writes identically from either process: PID files + flock, the meetings directory, `config.toml`, the events JSONL, the assistant workspace, and the background job queue.

The CLI binary is referenced from the app in only three narrow ways, none of which is "the app runs CLI commands to record/transcribe":
1. **Bundling/install** (`cli_setup.rs`): the app symlinks `~/.local/bin/minutes` → the `minutes` sidecar inside its own `.app` bundle so app updates also update the CLI. It never executes that binary except a 1s `--version` probe.
2. **PTY agent sessions** (`pty.rs` + `spawn_terminal`): the app spawns an **AI agent CLI** (`claude`/`codex`/etc.) — *not* `minutes` — in a PTY for the Recall assistant. The assistant's generated `CLAUDE.md` then tells *that* agent it can shell out to `minutes …` itself.
3. **PATH/version reconciliation** for the in-app "CLI setup" UI.

Everything else (record, transcribe, dictate, live transcript, search, diarize, summarize, calendar) is `minutes_core::*` called directly.

---

## 1. App lifecycle (`main.rs`)

Entry: `fn main()` (main.rs:1295). Order of operations:

- **Whisper/ggml C-log routing** installed first via `minutes_core::install_whisper_logging_hooks()` (1310) so the in-process whisper VAD flood is suppressed (issue #163).
- **Early-exit subcommand modes** (the app binary multiplexes a few CLI-like roles):
  - `--diagnose-hotkey` → `maybe_run_hotkey_diagnostic` (158), exits.
  - `--process-queue-worker` → `maybe_run_process_queue_worker` (231) runs `minutes_core::jobs::process_pending_jobs` then `_exit()`s **without C++ destructors** (issue #229 SIGABRT avoidance, 1317-1332).
- **Config bootstrap**: `Config::load_with_migrations()` (1336), `ensure_dirs()`, `auto_heal_missing_recording_device` (clears stale `recording.device` pin, 1351), `secret_store::hydrate_openai_compatible_api_key_env()`.
- Builds a large set of `Arc<AtomicBool>`/`Arc<Mutex<…>>` lifecycle handles, then `tauri::Builder::default()`.

### Plugins registered (main.rs:1483-1605)
- `tauri_plugin_global_shortcut` — with a unified handler (see §5).
- `tauri_plugin_shell`, `tauri_plugin_dialog`, `tauri_plugin_notification`.
- `tauri_plugin_autostart` (LaunchAgent, macOS).
- `tauri_plugin_updater` (Builder).
- `tauri_plugin_window_state` — filename `window-state.json`, `skip_initial_state` for `note`, `meeting-prompt`, `dictation-overlay`.
- (No `tauri_plugin_single_instance` is registered — see §1 note on singleton below.)

### Managed state
- `commands::AppState` (1606-1656) — the central shared state (atomics + mutexes; full field list at commands.rs:28-91).
- `Arc<Mutex<shortcut_manager::ShortcutManager>>` (1657).
- Later in `setup`: `TrayMenuHandles` (2285) and `TrayAppearanceState` (2304).

### Windows created
- **`main`** (`index.html`) — `show_main_window` (249). Lives in the tray; `CloseRequested` **hides** instead of destroys (2409-2414). Opaque WebView intentionally (`MAIN_WINDOW_TRANSPARENT=false`) to avoid a macOS 26 WebKit PAC trap on re-framing a hidden vibrancy window. macOS overlay titlebar + custom traffic-light position.
- **`note`** (`note.html`) — `show_note_window` (385), always-on-top, 420×260.
- **`meeting-prompt`** (`meeting-prompt.html?t=<token>`) — calendar overlay, top-right, decorations off, always-on-top (1007-1095). Payload staged in `AppState.pending_meeting_prompts` keyed by token.
- **`dictation-overlay`** (`dictation-overlay.html`) — bottom-right transparent HUD (commands.rs:12652).
- **`terminal`** (`terminal.html#<session>`) — `show_terminal_window` (402) exists but the live flow emits `recall:expand` into `main` instead (embedded panel), so a separate window is rarely used.
- **`palette`** — command palette overlay (managed in commands.rs palette functions; `Focused(false)` auto-closes it, 2415-2425).

### System tray (`setup`, 1865-2279)
- `TrayIconBuilder::with_id("minutes-tray")`, template icon. Menu items: `open`, `record` ("Start Recording"), `quick-thought`, `sensitive`, `stop`, `mic-mute-toggle`, `note`, `assistant` ("Recall"), `list` (Open Meetings Folder), `paste-summary`/`paste-transcript` (gated by `supports_tray_artifact_copy()`), `screen-share-toggle`, `check-for-updates`, `quit`, plus dynamic `cal-0/1/2` calendar rows.
- **Tray icon/menu state** is centralized: `TrayActivity` enum (Idle/Recording/Live/Dictation, priority Recording>Live>Dictation, 607) derived from a `TrayStateSnapshot`. `sync_tray_state` (701) repaints icon + enables/labels record/stop + emits `palette:refresh`. Critically, `snapshot_tray_state` uses `commands::recording_active` which is **PID-aware**, so an **external CLI recording** keeps the tray showing "Recording" (#223). `TrayMenuHandles` lets any non-tray source (hotkey, CLI, palette, call-detect) flip menu enabled state.
- Appearance tracking: `TrayAppearanceState` (AtomicU8) seeded from `main` window theme, updated on `WindowEvent::ThemeChanged` → `sync_tray_appearance` (no palette refresh).

### App menu bar (`build_app_menu`, 806)
Standard macOS App/File/Edit/View/Window/Help submenus; menu events at 1411-1481 (about, what's-new, settings emit `minutes://…` events to `main`; meetings folder via `open_target`; website/changelog/discussions open URLs).

### Setup background threads (1660-2405)
- `spawn_meetings_refresh_watcher` (1227) — `notify` watcher on `config.output_dir`; emits `artifacts:changed` on `.md` changes; rebinds when output_dir config changes.
- `context::cleanup_stale_workspaces()` (1670).
- **Auto-updater loop** (1717-1731): check on launch + every 6h, check-only; 30s deferred-poll to surface updates after sessions end. **Dev builds (`.dev` bundle id) skip the auto loop.**
- **Dictation model preload** if dictation shortcuts enabled (1737) — `minutes_core::dictation::preload_model`.
- `seed_latest_retryable_output`, `show_main_window`, `spawn_permission_monitor`.
- **Processing worker resume**: if `minutes_core::jobs::active_job_count() > 0`, `spawn_processing_worker` (1752) — resumes background transcription jobs left by either app or CLI.
- Restore dictation/live/palette shortcuts from config (1763-1854).
- **Call detection loop** if supported (2313) — `call_detect::CallDetector`.
- **Desktop-control poll loop** (2332-2359): every 2s writes `DesktopAppStatus` (PID/platform) and claims pending `DesktopControlRequest`s via `minutes_core::desktop_control` — this is the channel a CLI/agent uses to ask the running app to start recording (see §3).
- **Calendar refresh loop** (2364-2402): every 60s with circuit-breaker backoff; populates tray `cal-*` items and fires meeting-prompt overlays.

### Singleton / exit behavior
- **No OS single-instance plugin.** "Singleton" in this codebase refers to the **assistant PTY session** (`MAX_SESSIONS=1` in pty.rs:9) and the **singleton assistant workspace** (`~/.minutes/assistant/`), not process-level single-instance.
- macOS `Reopen` event re-shows `main` (2580).
- **Clean exit** is elaborate: `request_clean_exit` (76) → if recording active, requests stop and waits on a thread; `finish_clean_exit` kills all PTY sessions + shuts down the parakeet sidecar, then `libc::_exit` to **skip C++ destructors** (avoid whisper/ggml SIGABRT). A custom Obj-C `applicationShouldTerminate:` hook (98-155) routes macOS Quit through this path. `RunEvent::ExitRequested`/`Exit` also route here (2570-2585).

---

## 2. The 103 `#[tauri::command]` functions, grouped + coordination mechanism

All registered in `invoke_handler` (main.rs:2449-2567). For each group, the mechanism: **(a)** direct `minutes_core::` call, **(b)** spawns a process, **(c)** shared file I/O. Most are (a)+(c).

### Recording / capture — (a) core + (c) PID/jobs/events
`cmd_start_recording` (5921), `cmd_stop_recording` (6030), `cmd_extend_recording`, `cmd_cancel_call_end_countdown`, `cmd_toggle_mic_mute`/`cmd_mic_mute_state`, `cmd_sensitive_start`/`cmd_sensitive_stop`, `cmd_capture_status`, `cmd_status`.
Mechanism: in-process `minutes_core::capture::record_to_wav_with_lifecycle`, `minutes_core::pid::create/remove`, `minutes_core::jobs::queue_live_capture…`, `minutes_core::sensitive`. Never spawns CLI.

### Background processing / recovery — (a) + (c)
`cmd_processing_jobs`, `cmd_retry_processing_job`, `cmd_recovery_items`, `cmd_retry_recovery`, `cmd_retry_all_recovery`. All via `minutes_core::jobs` and the meetings/failed dirs. `spawn_processing_worker` (commands.rs:3917) runs `minutes_core::jobs` in-process.

### Live transcript — (a) + (c)
`cmd_start_live_transcript` (12878), `cmd_stop_live_transcript` (12909), `cmd_live_transcript_status` (12937), `cmd_live_shortcut_settings`, `cmd_set_live_shortcut`. Runner `run_live_session` (12734) calls `minutes_core::live_transcript::run`. **Stop is cross-process aware**: writes `pid::write_stop_sentinel()` and sends `SIGTERM` to the PID so a **CLI-started** `minutes live` is stoppable from the app (12916-12932, #258).

### Dictation — (a) + (c)
`cmd_start_dictation` (12585) → `start_dictation_session` (13650) → `minutes_core::dictation::run`. `cmd_stop_dictation`, `cmd_recent_dictations`/`cmd_copy_dictation`/`cmd_repaste_dictation` (via `minutes_core::dictation_memory` + `text_insertion`), `cmd_dismiss_dictation_overlay`. Cross-process: `dictation_pid_active()` (13387) checks `pid::dictation_pid_path()`.

### Palette / shortcuts — (a) + (c)
`cmd_toggle_palette`, `palette_close`, `palette_current_meeting`, `cmd_palette_settings`, `cmd_set_palette_shortcut`; unified-shortcut commands `cmd_set_shortcut`, `cmd_shortcut_status`, `cmd_suspend_shortcut`, `cmd_probe_shortcut`; `cmd_global_hotkey_settings`/`cmd_set_global_hotkey`, `cmd_dictation_shortcut_settings`/`cmd_set_dictation_shortcut`. `palette_list`/`palette_execute` live in `palette_dispatch.rs` and dispatch into existing `cmd_*` or `minutes_core` directly (the dispatch match is exhaustive against `minutes_core::palette::ActionId`).

### Settings / config — (a) + (c) writes `config.toml`
`cmd_get_settings` (8362), `cmd_set_setting` (8658), `cmd_set_completion_notifications`, `cmd_set_screen_share_hidden`, `cmd_get_autostart`/`cmd_set_autostart`, `cmd_set_openai_compatible_api_key`/`cmd_clear…`/`cmd_openai_compatible_secret_status`, `cmd_warm_parakeet`. All read/write the shared `~/.config/minutes/config.toml` via `Config::load`/`save` — the **same file** the CLI reads.

### Meetings / search / knowledge — (a) + (c)
`cmd_list_meetings`, `cmd_search` (`minutes_core::search`), `cmd_get_meeting_detail`, `cmd_delete_meeting`, `cmd_open_file`/`cmd_read_text_file`/`cmd_write_text_file`/`cmd_get_text_file_access`/`cmd_get_text_file_review`/`cmd_restore_text_file_snapshot`/`cmd_promote_text_file_to_artifact`, `cmd_create_artifact_from_meeting`, `cmd_recent_artifacts`, `cmd_open_meeting_url`, `cmd_weekly_summary`, `cmd_proactive_context_bundle`. Operate directly on the meetings dir + frontmatter.

### Speakers / voices — (a)
`cmd_list_voices`, `cmd_confirm_speaker` (writes overlays + `minutes_core::graph::rebuild_index`), `cmd_remember_vocabulary_person`.

### Calendar — (a) via osascript inside core
`cmd_upcoming_meetings`, `cmd_get_meeting_prompt`, `cmd_close_meeting_prompt`. Uses `minutes_core::calendar` (which shells `osascript` internally, not the CLI).

### Vault / storage / devices — (a)
`cmd_vault_status`/`cmd_vault_setup`/`cmd_vault_unlink` (`minutes_core::vault`), `cmd_get_storage_stats`, `cmd_list_devices` (`minutes_core::capture`).

### Recall assistant / PTY — (b) spawns an **agent** CLI
`cmd_spawn_terminal` (8279), `cmd_pty_input`, `cmd_pty_resize`, `cmd_pty_kill`, `cmd_list_agents`, `cmd_terminal_info`, `cmd_run_meeting_debrief` (6094). These spawn `claude`/`codex`/etc. in a PTY (see §6). The only (b) group — and it spawns the assistant agent, **not** `minutes`.

### Updates — (a) + network
`cmd_install_update` (14045), `cmd_cancel_update_install`, `cmd_debug_simulate_update`. Uses `tauri_plugin_updater` + signature verification; guards on `cli_setup::cli_recording_active()` (cross-process PID check) before installing.

### CLI bundling setup (macOS) — (c) symlink + (b) version probe only
`cli_setup::cmd_cli_install_state`, `cmd_cli_setup_run`, `cmd_cli_snooze`, `cmd_cli_recheck`, `cmd_cli_clear_quarantine` (see §3).

### Misc / window — 
`cmd_show_main_window`, `cmd_apply_recall_window_layout` (native main-window frame guard), `cmd_needs_setup`, `cmd_download_model` (`minutes_core` model download), `cmd_mark_activation_nudge_shown`, `cmd_permission_center`/`cmd_macos_permission_rows`/`cmd_permission_restart_safety`/`cmd_restart_for_permission`, `cmd_desktop_capabilities`, `cmd_check_whats_new`/`cmd_get_whats_new`/`cmd_dismiss_whats_new`.

---

## 3. CRITICAL: the precise app↔CLI coordination mechanism

**The app does not spawn `minutes` to do work.** Three distinct relationships exist:

### (A) Shared-state coordination (the real mechanism)
Both binaries link `minutes-core` and converge on the same files. Coordination is via **`minutes_core::pid`** (flock'd PID files) and shared dirs:
- `pid::pid_path()` (recording), `pid::dictation_pid_path()`, `pid::live_transcript_pid_path()`.
- The app's `recording_active()` (commands.rs:3308) and `palette_dispatch::backend_flags()` resolve state as **`in-app atomic OR pid-aware probe`**, so a CLI-owned session is reflected in the tray, palette, and status. `inspect_pid_file().is_active()` is used (not plain read) so a live-transcript PID held under a Windows mandatory lock isn't misread (#258).
- The app can **stop a CLI-started session**: `cmd_stop_live_transcript` writes a stop sentinel + SIGTERMs the PID (12916-12932). `cli_setup::cli_recording_active()` (cli_setup.rs:712) checks all three PID files before allowing an update install.
- Other shared surfaces: `config.toml`, the meetings/memos/failed dirs, `minutes_core::jobs` queue (the app's `--process-queue-worker` subprocess and `spawn_processing_worker` both drain it), `minutes_core::events` JSONL, `minutes_core::notes`, the assistant workspace.

### (B) CLI bundling/install (`cli_setup.rs`, macOS only)
The app **manages the CLI binary on disk but does not invoke it for features**:
- `bundled_cli_path` (96) locates the `minutes` sidecar inside `.app/Contents/MacOS/` (Tauri strips the triple suffix → plain `minutes`).
- `cmd_cli_setup_run` (809) symlinks `~/.local/bin/minutes` → that sidecar (`create_or_update_symlink`, 543) and appends a PATH block to the user's shell rc (`write_path_for_shell`, 617). So **app updates auto-update the CLI** via the symlink.
- `cmd_cli_install_state` (729) detects install method (cargo/brew/bundled/conflict), resolves the on-PATH `minutes` via the user's shell (`resolve_minutes_in_user_shell`, 205), and version-syncs by running `minutes --version` with a 1s timeout (`read_binary_version_safe`, 250). **This `--version` probe is the only time the app executes the `minutes` binary.**
- Translocation/quarantine/ad-hoc-signing detection via `xattr`/`codesign`/`mdfind`/`defaults`.

### (C) Inbound control from CLI/agents (`desktop_control`)
The reverse direction: a CLI or agent that wants the **running app** to act drops a `DesktopControlRequest` file; the app's 2s poll loop (main.rs:2341) claims it and runs `handle_desktop_control_request` (commands.rs:5626), which calls `launch_recording` and writes a response file. This is file-based IPC via `minutes_core::desktop_control`, not process spawning.

**When each is chosen:** app features → always direct core. CLI presence/version reconciliation → cli_setup probes. App-as-target-of-automation → desktop_control poll. Agent assistant → PTY spawn of the agent CLI (§6).

---

## 4. Recording state & shared PID/event log

Yes — **the app shares the exact same PID files and event log as the CLI**, because both go through `minutes_core::pid` and `minutes_core::events`.

- In-app, `AppState` holds mirror atomics (`recording`, `starting`, `stop_flag`, `processing`, `dictation_active`, `live_transcript_active`, plus stop flags) — these are a **mirror, not the source of truth** (explicitly documented in palette_dispatch.rs:18-24).
- `start_recording` (commands.rs:5098) is the canonical path: preflight → `pid::create()` → `recording.store(true)` → `sync_tray_state` → `capture::record_to_wav_with_lifecycle` → on stop, `jobs::queue_live_capture…` + `pid::set_processing_status` + `pid::remove` + spawn processing worker. Failure paths preserve raw audio (`preserve_failed_capture`).
- Cross-mode exclusivity is enforced two ways: in-app atomics gate via `compare_exchange` (`try_acquire_dictation` 12837, `try_acquire_live` 12858), and — authoritatively — **core's PID+flock** serializes the actual audio stream even if the in-app atomics briefly drift (documented at main.rs:457-473). RAII guards (`LiveActiveGuard`, `DictationActiveGuard`, `CallDetectSessionGuard`) reset flags + re-sync the tray on every exit path including panic.

---

## 5. Global shortcut / hotkey + dictation flow

- Single `tauri_plugin_global_shortcut` handler (main.rs:1485-1587). It tries the **unified `shortcut_manager::ShortcutManager`** first (find slot → `handle_press`/`handle_release`, with hold detection scheduled via `schedule_hold_check`). Lock is dropped before executing the action (deadlock avoidance, 1490-1527).
- **Legacy fallback path** (1539-1586): matches the live-shortcut, palette-shortcut, and global-hotkey IDs and routes to `handle_live_shortcut_event` / `handle_palette_shortcut_event` / `handle_global_hotkey_event`. Dictation is owned by the unified manager (registered at startup via `ShortcutSlot::Dictation`, 1763-1811), including raw-keycode Caps Lock (57) / fn (63).
- `handle_global_hotkey_event` (commands.rs:5732) → press/release timing → `spawn_hotkey_recording` (5708) → `launch_recording(QuickThought, Memo, …)`. Short captures can be discarded via `discard_short_hotkey_capture`.
- **Dictation flow**: `cmd_start_dictation`/shortcut → `start_dictation_session` (13650): `try_acquire_dictation` → capture frontmost-app focus target (`text_insertion::capture_active_target_context`, with `pending_dictation_target` from a pre-press hook), show transparent overlay, spawn thread running `minutes_core::dictation::run` with a callback that emits `dictation:state`/`dictation:partial`/`SilenceCountdown` events to the UI, then inserts text via `text_insertion` (clipboard/paste, focus restore) and records to `dictation_memory`. Settings persisted to `config.toml`.

---

## 6. AI Assistant / singleton workspace and live_transcript relation

- **Singleton PTY**: `pty.rs` enforces `MAX_SESSIONS=1` and a fixed `ASSISTANT_SESSION_ID="assistant"`. `spawn_terminal` (commands.rs:8213) resolves an **agent binary** (`config.assistant.agent`, default e.g. `claude`) via `resolve_agent_binary` (8127) — PATH + well-known dirs, Windows PATHEXT, usability check; **filters approval-bypass flags** except the per-agent allowed one (`filtered_agent_args`, 8017). It spawns the agent in a PTY with an enriched PATH (pty.rs:114-148, so the agent can find `minutes`, node, brew bins). Output is base64-streamed to the `main` window via `pty:data:<id>` events; the UI shows it in the embedded **Recall** panel (`recall:expand`), not a separate window.
- **Singleton workspace** (`context.rs`): `workspace_dir()` = `~/.minutes/assistant/`. `create_workspace` (175) makes it, symlinks `meetings/` → `config.output_dir`, syncs portable skill mirrors (`.agents/skills`, `.opencode/skills|commands` from the bundled `assistant-skill-bundle` or repo), and `git init`s it so agent CLIs discover `CLAUDE.md`/`AGENTS.md`. Re-opening the panel reuses the one session; switching to a meeting just writes `CURRENT_MEETING.md` and injects a `context_switch_prompt` into the running agent's stdin (8227-8237) — no parallel sessions.
- **Context files**: `write_assistant_context` (context.rs:500) writes identical `CLAUDE.md` + `AGENTS.md` describing meeting history, open intents, **and the `minutes` CLI commands the agent should use** (`minutes search/actions/live/transcript/note…`, 404-423) — this is where the app *tells the agent to shell out to the CLI*. `CURRENT_MEETING.md` is the active-meeting focus; `CURRENT_ARTIFACT.md` is the open artifact.
- **live_transcript relation**: when a recording or standalone live transcript starts, `update_assistant_live_context(workspace, true)` (commands.rs:5290, 12745) injects `<!-- LIVE_TRANSCRIPT_START/END -->` markers into the workspace `CLAUDE.md` pointing at the live JSONL, so the connected agent (or any external agent) can read it and coach mid-meeting without MCP. `write_assistant_context` preserves those markers **only while the live PID is actually active** (verified via `inspect_pid_file`, 508-534), and they're stripped when the session ends. This is the "agent-agnostic live coaching" surface described in CLAUDE.md.

---

## Key file:line references
- App lifecycle/builder/tray/plugins/exit: `/Users/rymalia/projects/minutes/tauri/src-tauri/src/main.rs` (main 1295, plugins 1483-1605, AppState manage 1606, setup 1660-2405, tray 1865-2279, invoke_handler 2449-2567, exit 76/2570-2585).
- Commands + recording/dictation/live core calls: `/Users/rymalia/projects/minutes/tauri/src-tauri/src/commands.rs` (AppState 28-91, `start_recording` 5098, `launch_recording` 5529, `handle_desktop_control_request` 5626, hotkey 5708-5790, `spawn_terminal`/`resolve_agent_binary` 8127-8276, dictation 12585/13650, live 12721-12986, `dictation_pid_active` 13387).
- CLI bundling/install + cross-process update guard: `/Users/rymalia/projects/minutes/tauri/src-tauri/src/cli_setup.rs` (bundled path 96, symlink 543, install state 729, `cli_recording_active` 712).
- PTY agent sessions: `/Users/rymalia/projects/minutes/tauri/src-tauri/src/pty.rs` (MAX_SESSIONS 9, spawn 87, PATH 114-148, kill 264).
- Palette dispatch boundary: `/Users/rymalia/projects/minutes/tauri/src-tauri/src/palette_dispatch.rs` (`backend_flags` 218 — pid-aware; dispatch 413).
- Assistant workspace + live context injection: `/Users/rymalia/projects/minutes/tauri/src-tauri/src/context.rs` (`workspace_dir` 31, `create_workspace` 175, `write_assistant_context` 500 with live-marker preservation 508-534).

### tool_result · 2026-06-21 06:13:32

```
I have everything needed for a comprehensive report. Here is the structured analysis.

---

# Minutes Tauri Desktop App (`minutes-app`) — Architecture & CLI Coordination

## Headline finding: how the app relates to the CLI

The desktop app and `minutes` CLI **both statically link `minutes-core`** and almost always call core **directly, in-process** — the app does **not** spawn the CLI to do its wo… [+22283 chars]
```

### tool_result · 2026-06-21 06:13:32

```
agentId: a132e3a8642ef6577 (use SendMessage with to: 'a132e3a8642ef6577' to continue this agent)
<usage>subagent_tokens: 190091
tool_uses: 15
duration_ms: 164158</usage>
```

### assistant · 2026-06-21 06:13:40

Two dense reports confirm the core thesis: **CLI and Tauri are peer front-ends over the same `minutes-core`, coordinating through shared on-disk state — not by one spawning the other.** Let me solidify this by reading the coordination primitives myself, and dispatch agents for the engine internals and the MCP/SDK third consumer.

### assistant · 2026-06-21 06:13:41

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/desktop_control.rs')`

### assistant · 2026-06-21 06:13:41

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/pid.rs')`

### tool_result · 2026-06-21 06:13:41

```
1	use crate::capture::RecordingIntent;
2	use crate::config::Config;
3	use crate::pid::CaptureMode;
4	use chrono::{DateTime, Local};
5	use serde::{Deserialize, Serialize};
6	use std::fs;
7	use std::path::{Path, PathBuf};
8	
9	pub fn control_dir() -> PathBuf {
10	    Config::minutes_dir().join("desktop-control")
11	}
12	
13	pub fn requests_dir() -> PathBuf {
14	    control_dir().join("requests")
15… [+10059 chars]
```

### tool_result · 2026-06-21 06:13:42

```
1	use crate::config::Config;
2	use crate::error::PidError;
3	use std::fs;
4	use std::io::{Read, Seek, SeekFrom, Write};
5	use std::path::{Path, PathBuf};
6	
7	// ──────────────────────────────────────────────────────────────
8	// PID file state machine:
9	//
10	//   [none] ──create──▶ [recording] ──remove──▶ [none]
11	//                           │
12	//                     (process dies)
13	//… [+5803 chars]
```

### assistant · 2026-06-21 06:13:49

The coordination layer is now crystal clear. `desktop_control.rs` is file-based IPC: a heartbeat status file with a 10s freshness window (`desktop_app_owns_pid`) plus an atomic claim-via-rename request/response queue. `pid.rs` enumerates all the shared `~/.minutes/` state files. Let me dispatch agents for the remaining subsystems to round out breadth.

### assistant · 2026-06-21 06:13:59

- **→** `Agent(description='Analyze core processing engine', prompt="I'm learning the `minutes` Rust codebase (a local meeting-transcription tool). Analyze the core proc… [+1943 chars]", subagent_type='general-purpose')`

### user · 2026-06-21 06:13:59 [sidechain] [sub: agent-af6b401b62faee5c9]

I'm learning the `minutes` Rust codebase (a local meeting-transcription tool). Analyze the core processing engine — the modules that turn captured audio into searchable markdown. Read these files (page through large ones with offset/limit):
- /Users/rymalia/projects/minutes/crates/core/src/pipeline.rs (6757 lines — the orchestrator; page fully)
- /Users/rymalia/projects/minutes/crates/core/src/transcribe.rs (4156 lines)
- /Users/rymalia/projects/minutes/crates/core/src/diarize.rs (4059 lines)
- /Users/rymalia/projects/minutes/crates/core/src/summarize.rs (3108 lines)
- /Users/rymalia/projects/minutes/crates/core/src/markdown.rs (1964 lines)
- /Users/rymalia/projects/minutes/crates/core/src/jobs.rs (2531 lines)
- /Users/rymalia/projects/minutes/crates/core/src/capture.rs (read the first ~600 lines for the public API + RecordingIntent/lifecycle types)

Produce a dense structured report covering:
1. `pipeline::process` / `process_with_template` — the full end-to-end flow from a WAV file to a written markdown meeting note. List each stage in order (decode/resample → transcribe → diarize → speaker attribution → summarize → structured extraction → markdown write) with the function names and key types.
2. transcribe.rs: whisper vs parakeet backends, how the backend is chosen, the whisper-guard anti-hallucination integration, ffmpeg vs symphonia decode path.
3. diarize.rs: how speaker diarization works (pyannote-rs/ONNX), the speaker attribution confidence levels (L0-L3), speaker_map.
4. summarize.rs: how summarization + structured extraction (action items, decisions) works, LLM provider options (Ollama/Mistral/cloud), what happens with no API key.
5. jobs.rs: the background job queue — how jobs are enqueued, persisted, and drained by the process-queue worker. How this decouples `record` from processing.
6. markdown.rs: the YAML frontmatter schema and ContentType, how meeting notes are written (0600 perms), WriteResult.

Report as structured notes with file:line references. Do not modify files. Be information-dense.

### assistant · 2026-06-21 06:14:02 [sidechain] [sub: agent-af6b401b62faee5c9]

I'll analyze the core processing engine. Let me start by reading the files, beginning with the orchestrator and the smaller files in parallel.

### assistant · 2026-06-21 06:14:03 [sidechain] [sub: agent-af6b401b62faee5c9]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/pipeline.rs')`

### assistant · 2026-06-21 06:14:04 [sidechain] [sub: agent-af6b401b62faee5c9]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/markdown.rs')`

### tool_result · 2026-06-21 06:14:04 [sidechain] [sub: agent-af6b401b62faee5c9]

```
1	use crate::config::{Config, IdentityConfig};
2	use crate::diarize;
3	use crate::error::MinutesError;
4	use crate::logging;
5	use crate::markdown::{
6	    self, ContentType, Frontmatter, OutputStatus, ProcessingWarning, WriteResult,
7	};
8	use crate::notes;
9	use crate::summarize;
10	use chrono::{DateTime, Local};
11	use std::collections::{BTreeMap, BTreeSet};
12	use std::path::Path;
13	use whisp… [+30645 chars]
```

### assistant · 2026-06-21 06:14:04 [sidechain] [sub: agent-af6b401b62faee5c9]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/capture.rs')`

### tool_result · 2026-06-21 06:14:04 [sidechain] [sub: agent-af6b401b62faee5c9]

```
1	use crate::config::Config;
2	use crate::error::MarkdownError;
3	use chrono::{DateTime, Local, LocalResult, NaiveDate, NaiveDateTime, TimeZone};
4	use schemars::JsonSchema;
5	use serde::de::{self, Visitor};
6	use serde::{Deserialize, Deserializer, Serialize};
7	use std::fs;
8	#[cfg(unix)]
9	use std::os::unix::fs::PermissionsExt;
10	use std::path::{Path, PathBuf};
11	use std::str::FromStr;
12	
13… [+26748 chars]
```

### tool_result · 2026-06-21 06:14:05 [sidechain] [sub: agent-af6b401b62faee5c9]

```
1	use crate::config::Config;
2	use crate::error::CaptureError;
3	use crate::macos_permissions::{microphone_status, screen_recording_status, MacPermissionStatus};
4	use crate::pid::CaptureMode;
5	use std::path::{Path, PathBuf};
6	use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
7	use std::sync::Arc;
8	use std::time::Instant;
9	
10	#[cfg(feature = "streaming")]
11	use crate::streaming::Audi… [+21656 chars]
```

### assistant · 2026-06-21 06:14:08

- **→** `Agent(description='Analyze live/streaming subsystem', prompt="I'm learning the `minutes` Rust codebase (local meeting transcription). Analyze the real-time / stre… [+1789 chars]", subagent_type='general-purpose')`

### user · 2026-06-21 06:14:08 [sidechain] [sub: agent-a93ef3858d70436f5]

I'm learning the `minutes` Rust codebase (local meeting transcription). Analyze the real-time / streaming subsystem that powers live transcription and dictation, shared by both the CLI (`minutes live`, `minutes dictate`) and the Tauri desktop app. Read these files fully (page large ones with offset/limit):
- /Users/rymalia/projects/minutes/crates/core/src/live_transcript.rs (4219 lines)
- /Users/rymalia/projects/minutes/crates/core/src/transcription_coordinator.rs (573 lines)
- /Users/rymalia/projects/minutes/crates/core/src/streaming.rs (443 lines)
- /Users/rymalia/projects/minutes/crates/core/src/streaming_whisper.rs (325 lines)
- /Users/rymalia/projects/minutes/crates/core/src/dictation.rs (1335 lines)
- /Users/rymalia/projects/minutes/crates/core/src/events.rs (read first ~400 lines for the event log API + event types)

Produce a dense structured report covering:
1. live_transcript::run — the full live transcription loop: audio capture → VAD → per-utterance whisper → JSONL append. How the JSONL file, WAV preservation, and status sidecar are written. How delta reads work (read_since_line / read_since_duration / session_status). The PidGuard/flock session exclusivity.
2. How the live transcript is "agent-agnostic" — what other processes (CLI `minutes transcript`, Tauri assistant, MCP) read from the JSONL and how.
3. transcription_coordinator.rs — what it coordinates and who uses it.
4. streaming.rs — AudioStream / MultiAudioStream, how real-time audio chunks flow, mic-mute sentinel.
5. dictation.rs — the dictation flow (speak → transcribe → clipboard + daily note), how it differs from live transcript.
6. events.rs — the append-only JSONL event log: event types, append/read API, sequence numbers, how it enables agent reactivity, the agent-annotation allowlist.

Report as structured notes with file:line references. Do not modify files. Be information-dense.

### assistant · 2026-06-21 06:14:10 [sidechain] [sub: agent-af6b401b62faee5c9]

This is a read-only analysis task with many large files. Let me delegate the deep reads to parallel agents to cover the remaining files efficiently while I continue paging the orchestrator. Let me read the rest of pipeline.rs's process functions and dispatch agents for the backend files.

### assistant · 2026-06-21 06:14:16 [sidechain] [sub: agent-a93ef3858d70436f5]

I'll read all six files in parallel to analyze the streaming subsystem.

### assistant · 2026-06-21 06:14:17 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/transcription_coordinator.rs')`

### assistant · 2026-06-21 06:14:18 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/streaming.rs')`

### tool_result · 2026-06-21 06:14:18 [sidechain] [sub: agent-a93ef3858d70436f5]

```
1	use crate::config::{Config, VALID_PARAKEET_MODELS};
2	use crate::error::TranscribeError;
3	use crate::health::HealthItem;
4	use crate::markdown::ContentType;
5	use crate::parakeet;
6	use crate::transcribe::{self, TranscribeResult};
7	use serde::{Deserialize, Serialize};
8	use std::path::{Path, PathBuf};
9	use std::sync::{Mutex, OnceLock};
10	
11	use whisper_guard::segments as wg_segments;
12	
13… [+21167 chars]
```

### assistant · 2026-06-21 06:14:18

- **→** `Agent(description='Analyze MCP server and SDK', prompt="I'm learning the `minutes` codebase. Analyze the MCP server (TypeScript) and SDK — the THIRD consume… [+2129 chars]", subagent_type='general-purpose')`

### user · 2026-06-21 06:14:18 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

I'm learning the `minutes` codebase. Analyze the MCP server (TypeScript) and SDK — the THIRD consumer of the system alongside the `minutes` CLI and the Tauri desktop app. The MCP server lets Claude Desktop/Code read meeting data and control recording.

Read these files (page through large ones):
- /Users/rymalia/projects/minutes/crates/mcp/src/index.ts (the MCP server — list its full size first with wc -l, then read fully)
- /Users/rymalia/projects/minutes/crates/sdk/src/reader.ts (the read-only meeting parser)
- /Users/rymalia/projects/minutes/crates/mcp/package.json and /Users/rymalia/projects/minutes/crates/sdk/package.json
- Any other .ts files under /Users/rymalia/projects/minutes/crates/mcp/src/ and /Users/rymalia/projects/minutes/crates/sdk/src/ (list them first with: find /Users/rymalia/projects/minutes/crates/mcp/src /Users/rymalia/projects/minutes/crates/sdk/src -name '*.ts')
- Briefly look at /Users/rymalia/projects/minutes/crates/mcp/ui/ structure (just list it, read the main entry if small)

Produce a dense structured report covering:
1. The full list of MCP tools (31 expected) and 7 resources, grouped by purpose. For each group, note HOW it gets data: does it shell out to the `minutes` CLI binary (e.g. `minutes search --json`, `minutes get`, `minutes capabilities`), or read meeting markdown files directly via the SDK reader, or both?
2. CRITICAL: the coordination mechanism between the MCP server and the CLI/core. How does the MCP server locate the `minutes` binary? How does it do feature detection (the `minutes capabilities --json` contract mentioned in CLAUDE.md)? Which tools are registered conditionally based on capabilities?
3. reader.ts — what it parses (YAML frontmatter, speaker_map, action items), and how it's shared between the MCP server and Tauri (if at all).
4. How recording control tools (start/stop) work from MCP — do they go through the CLI, or the desktop_control file-based IPC?
5. The MCP App dashboard UI — what it is and how it's built (vite single-file HTML).
6. npm package relationships: minutes-mcp depends on minutes-sdk; the zero-install `npx minutes-mcp` flow.

Report as structured notes with file:line references. Do not modify files. Be information-dense.

### assistant · 2026-06-21 06:14:18 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/streaming_whisper.rs')`

### tool_result · 2026-06-21 06:14:18 [sidechain] [sub: agent-a93ef3858d70436f5]

```
1	use crate::error::CaptureError;
2	use crossbeam_channel::{bounded, Receiver, Sender};
3	use std::path::PathBuf;
4	use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
5	use std::sync::Arc;
6	use std::time::Instant;
7	
8	// ──────────────────────────────────────────────────────────────
9	// Streaming audio capture — channel-based alternative to record_to_wav.
10	//
11	//   Microphone ──▶ cpa… [+17151 chars]
```

### assistant · 2026-06-21 06:14:18 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/events.rs')`

### tool_result · 2026-06-21 06:14:19 [sidechain] [sub: agent-a93ef3858d70436f5]

```
1	use crate::transcribe::streaming_whisper_params;
2	use whisper_rs::WhisperContext;
3	
4	// ──────────────────────────────────────────────────────────────
5	// Streaming whisper transcription — progressive text output.
6	//
7	// Instead of batch (accumulate all audio → transcribe once),
8	// this transcribes in rolling windows while the user speaks:
9	//
10	//   Audio chunks accumulate:
11	//… [+13418 chars]
```

### assistant · 2026-06-21 06:14:19 [sidechain] [sub: agent-af6b401b62faee5c9]

- **→** `Agent(description='Analyze transcribe.rs backends', prompt='Read /Users/rymalia/projects/minutes/crates/core/src/transcribe.rs (4156 lines — page fully with off… [+1179 chars]', subagent_type='general-purpose')`

### user · 2026-06-21 06:14:19 [sidechain] [sub: agent-a6c47d653058338e7]

Read /Users/rymalia/projects/minutes/crates/core/src/transcribe.rs (4156 lines — page fully with offset/limit). This is a Rust transcription module for a local meeting tool. Produce a dense structured report (with file:line references) covering:

1. The whisper.cpp backend vs the parakeet.cpp backend: the public entry function(s) for transcription, the types involved, how each backend works.
2. How the backend is chosen at runtime (config field, feature flag `parakeet`, fallback behavior). Name the config struct/field and the dispatch function.
3. The whisper-guard anti-hallucination integration: which functions from the `whisper_guard` crate are called, where in the flow, what they do (VAD, dedup, noise-marker collapse, foreign-script strip, etc.), and the CleanOptions/CleanStats usage.
4. The ffmpeg vs symphonia decode path: how audio (m4a/mp3/ogg/wav) is decoded to PCM, when ffmpeg is preferred and when symphonia is the fallback, the resampling to 16kHz mono.
5. Key public types/structs returned (e.g. transcription result, segments) and any NoSpeech / filter-diagnosis signaling.

Do NOT modify any files. Return findings as your final message with exact function names, struct names, and file:line references. Be information-dense. Do not write any .md files.

### tool_result · 2026-06-21 06:14:19 [sidechain] [sub: agent-a93ef3858d70436f5]

```
1	use chrono::{DateTime, Local};
2	use fs2::FileExt;
3	use serde::{Deserialize, Serialize};
4	use std::fs::{self, OpenOptions};
5	use std::io::{BufRead, BufReader, Read, Seek, SeekFrom, Write};
6	#[cfg(unix)]
7	use std::os::unix::fs::PermissionsExt;
8	use std::path::{Path, PathBuf};
9	
10	use crate::config::Config;
11	use crate::markdown::ContentType;
12	
13	// ────────────────────────────────────… [+14021 chars]
```

### assistant · 2026-06-21 06:14:21 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

I'll analyze the MCP server and SDK. Let me start by sizing the files and listing the structure.

### assistant · 2026-06-21 06:14:21 [sidechain] [sub: agent-a6c47d653058338e7]

I'll read the full transcribe.rs file in pages, then produce the structured report.

### assistant · 2026-06-21 06:14:22 [sidechain] [sub: agent-a6c47d653058338e7]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs')`

### tool_result · 2026-06-21 06:14:22 [sidechain] [sub: agent-a6c47d653058338e7]

```
1	use crate::config::Config;
2	use crate::error::TranscribeError;
3	#[cfg(test)]
4	use crate::transcription_coordinator::{
5	    collapse_noise_markers, dedup_interleaved, dedup_segments, strip_foreign_script,
6	    trim_trailing_noise,
7	};
8	use crate::transcription_coordinator::{run_transcript_cleanup_pipeline, TranscriptCleanupStage};
9	#[cfg(feature = "parakeet")]
10	use serde::{Deserialize,… [+22796 chars]
```

### assistant · 2026-06-21 06:14:23 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Bash(command='wc -l /Users/rymalia/projects/minutes/crates/mcp/src/index.ts /Users/rymalia/projects/minutes/crates… [+280 chars]', description='Size files and list TS/UI structure')`

### tool_result · 2026-06-21 06:14:23 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
3587 /Users/rymalia/projects/minutes/crates/mcp/src/index.ts
     816 /Users/rymalia/projects/minutes/crates/sdk/src/reader.ts
    4403 total
---TS FILES---
     816 /Users/rymalia/projects/minutes/crates/sdk/src/reader.ts
     692 /Users/rymalia/projects/minutes/crates/sdk/src/reader.test.ts
      48 /Users/rymalia/projects/minutes/crates/sdk/src/index.ts
     176 /Users/rymalia/projects/minutes/… [+1593 chars]
```

### assistant · 2026-06-21 06:14:23 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/package.json')`

### assistant · 2026-06-21 06:14:24 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/sdk/package.json')`

### tool_result · 2026-06-21 06:14:24 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1	{
2	  "name": "minutes-mcp",
3	  "version": "0.18.14",
4	  "description": "MCP server for minutes — conversation memory for AI assistants. Works with Claude Desktop, Mistral Vibe, Cursor, Windsurf, and any MCP client.",
5	  "main": "dist/index.js",
6	  "type": "module",
7	  "bin": {
8	    "minutes-mcp": "dist/index.js"
9	  },
10	  "files": [
11	    "dist/",
12	    "dist-ui/",
13	    "fixtures/",… [+1311 chars]
```

### tool_result · 2026-06-21 06:14:24 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1	{
2	  "name": "minutes-sdk",
3	  "version": "0.18.14",
4	  "description": "Conversation memory SDK — query meeting transcripts, decisions, and action items from any AI agent or application",
5	  "main": "dist/index.js",
6	  "types": "dist/index.d.ts",
7	  "type": "module",
8	  "files": [
9	    "dist/",
10	    "README.md"
11	  ],
12	  "keywords": [
13	    "meeting",
14	    "transcription",
15… [+662 chars]
```

### assistant · 2026-06-21 06:14:25 [sidechain] [sub: agent-a6c47d653058338e7]

I'll continue reading the file in pages.

### assistant · 2026-06-21 06:14:26 [sidechain] [sub: agent-a6c47d653058338e7]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs')`

### tool_result · 2026-06-21 06:14:26 [sidechain] [sub: agent-a6c47d653058338e7]

```
600	) -> Result<TranscribeResult, TranscribeError> {
601	    transcribe_meeting_with_hints(audio_path, config, &DecodeHints::default())
602	}
603	
604	pub fn transcribe_meeting_with_hints(
605	    audio_path: &Path,
606	    config: &Config,
607	    hints: &DecodeHints,
608	) -> Result<TranscribeResult, TranscribeError> {
609	    const MIN_MEETING_CHUNKS: usize = 2;
610	
611	    let samples = load_… [+25830 chars]
```

### assistant · 2026-06-21 06:14:27 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

Now let me read the main MCP server file and supporting modules. I'll read index.ts in pages along with the key support files.

### assistant · 2026-06-21 06:14:27 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/src/index.ts')`

### assistant · 2026-06-21 06:14:28 [sidechain] [sub: agent-a93ef3858d70436f5]

Now let me read the remaining events.rs and the two large files (live_transcript.rs and dictation.rs).

### assistant · 2026-06-21 06:14:28 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/src/capabilities.ts')`

### tool_result · 2026-06-21 06:14:28 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1	#!/usr/bin/env node
2	
3	/**
4	 * Minutes MCP Server
5	 *
6	 * MCP tools for Claude Desktop / Cowork / Dispatch:
7	 *   - start_recording: Start recording audio from the default input device
8	 *   - stop_recording: Stop recording and process through the pipeline
9	 *   - get_status: Check if a recording is in progress
10	 *   - list_meetings: List recent meetings and voice memos
11	 *   - searc… [+22504 chars]
```

### assistant · 2026-06-21 06:14:28 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/events.rs')`

### assistant · 2026-06-21 06:14:28 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/src/paths.ts')`

### tool_result · 2026-06-21 06:14:28 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1	/**
2	 * CLI capabilities feature-detection probe.
3	 *
4	 * Phase 2 of #183: instead of guessing which MCP tools to expose based on
5	 * version strings, ask the CLI directly via `minutes capabilities --json`.
6	 * Tools whose backing CLI subcommand the report confirms get registered;
7	 * tools whose subcommand is missing (or whose feature key is absent) stay
8	 * hidden from the MCP tool list… [+5918 chars]
```

### tool_result · 2026-06-21 06:14:29 [sidechain] [sub: agent-a93ef3858d70436f5]

```
400	                .and_then(|name| name.to_str())
401	                .map(|name| {
402	                    name == "events.jsonl"
403	                        || (name.starts_with("events.") && name.ends_with(".jsonl"))
404	                })
405	                .unwrap_or(false)
406	        })
407	        .collect::<Vec<_>>();
408	
409	    paths.sort_by_key(|path| path.file_name().map(|name| na… [+12820 chars]
```

### assistant · 2026-06-21 06:14:29 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/src/autoInstall.ts')`

### tool_result · 2026-06-21 06:14:29 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1	import { existsSync, realpathSync } from "fs";
2	import { homedir } from "os";
3	import { extname, join, resolve, sep } from "path";
4	
5	export function expandHomeLikePath(input: string): string {
6	  const home = homedir();
7	
8	  if (input === "~") {
9	    return home;
10	  }
11	
12	  if (input.startsWith("~/") || input.startsWith("~\\")) {
13	    return join(home, input.slice(2));
14	  }
15… [+2670 chars]
```

### tool_result · 2026-06-21 06:14:29 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1	import { createHash } from "crypto";
2	import { basename } from "path";
3	import { readFile, rename, rm } from "fs/promises";
4	
5	type ExecFileAsync = (
6	  file: string,
7	  args: readonly string[],
8	  options?: { timeout?: number }
9	) => Promise<unknown>;
10	
11	export type Sha256Entry = {
12	  filename: string;
13	  sha256: string;
14	};
15	
16	export function parseSha256Sums(raw: string):… [+2743 chars]
```

### assistant · 2026-06-21 06:14:29 [sidechain] [sub: agent-a6c47d653058338e7]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs')`

### assistant · 2026-06-21 06:14:30 [sidechain] [sub: agent-af6b401b62faee5c9]

- **→** `Agent(description='Analyze diarize.rs', prompt='Read /Users/rymalia/projects/minutes/crates/core/src/diarize.rs (4059 lines — page fully with offset… [+1507 chars]', subagent_type='general-purpose')`

### user · 2026-06-21 06:14:30 [sidechain] [sub: agent-ae94c49b0a74bac9c]

Read /Users/rymalia/projects/minutes/crates/core/src/diarize.rs (4059 lines — page fully with offset/limit). This is the speaker diarization + attribution module for a local meeting tool. Produce a dense structured report (with file:line references) covering:

1. How speaker diarization works: the pyannote-rs / ONNX model integration, the `diarize` Cargo feature flag, the main public diarization function(s), input/output types (e.g. DiarizationResult, segments, num_speakers, embeddings). Also cover the energy-based / stem-based diarization path (from per-source voice/system stems) — discover_stem_plan, SourceAwareDiarizationPlan, StemPaths, stem_has_audio, active_ratio, FailureKind, DegradedCapture, CaptureSource.
2. The speaker attribution confidence system: the Confidence enum (High/Medium/Low), AttributionSource enum (Deterministic/Llm/Enrollment/Manual/MlBleedDegraded/StemRecovery), SpeakerAttribution struct. Explain the L0/L1/L2/L3 attribution levels described in the codebase — which functions implement each level, and the rule that only High-confidence attributions rewrite transcript labels.
3. speaker_map: how SPEAKER_X labels get mapped to real names, how the map is applied to rewrite the transcript, the function that renders speaker-labeled transcript lines.
4. Any types referenced by pipeline.rs: DiarizationResult fields (from_stems, source_aware, degraded_capture, num_speakers), DiagnosticConfidence.

Do NOT modify any files. Return findings as your final message with exact function/struct names and file:line references. Be information-dense. Do not write any .md files.

### tool_result · 2026-06-21 06:14:30 [sidechain] [sub: agent-a6c47d653058338e7]

```
1250	    let metadata_opts = MetadataOptions::default();
1251	
1252	    let probed = symphonia::default::get_probe()
1253	        .format(&hint, mss, &format_opts, &metadata_opts)
1254	        .map_err(|e| TranscribeError::UnsupportedFormat(format!("probe failed: {}", e)))?;
1255	
1256	    let mut format = probed.format;
1257	
1258	    // Find the first audio track
1259	    let track = format
1260… [+28311 chars]
```

### assistant · 2026-06-21 06:14:31 [sidechain] [sub: agent-a93ef3858d70436f5]

Now the two large files. Let me read live_transcript.rs in chunks.

### assistant · 2026-06-21 06:14:32 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/live_transcript.rs')`

### tool_result · 2026-06-21 06:14:32 [sidechain] [sub: agent-a93ef3858d70436f5]

```
1	use crate::config::Config;
2	use crate::error::{LiveTranscriptError, MinutesError, TranscribeError};
3	use crate::pid;
4	use crate::streaming::AudioStream;
5	use crate::streaming_whisper::StreamingWhisper;
6	use crate::transcription_coordinator::{collapse_noise_markers, strip_foreign_script};
7	use crate::vad::Vad;
8	#[cfg(feature = "whisper")]
9	use crate::vad::{VadEngine, VadResult};
10	use ch… [+17211 chars]
```

### assistant · 2026-06-21 06:14:32 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

Now let me read the rest of index.ts in chunks, focusing on tool registrations and resources.

### assistant · 2026-06-21 06:14:32 [sidechain] [sub: agent-ae94c49b0a74bac9c]

I'll read the file fully across multiple pages to produce a complete report.

### assistant · 2026-06-21 06:14:33 [sidechain] [sub: agent-a6c47d653058338e7]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs')`

### assistant · 2026-06-21 06:14:33 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/src/index.ts')`

### tool_result · 2026-06-21 06:14:33 [sidechain] [sub: agent-a6c47d653058338e7]

```
1950	                    vocab_path.to_str().ok_or_else(|| {
1951	                        TranscribeError::ParakeetFailed("vocab path is not valid UTF-8".into())
1952	                    })?,
1953	                ])
1954	                .args(["--model-id", &config.transcription.parakeet_model])
1955	                .args(if use_gpu { vec!["--gpu"] } else { Vec::new() })
1956	                .args… [+27623 chars]
```

### assistant · 2026-06-21 06:14:33 [sidechain] [sub: agent-ae94c49b0a74bac9c]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/diarize.rs')`

### tool_result · 2026-06-21 06:14:34 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
600	      await mkdir(installDir, { recursive: true });
601	
602	      // Download with curl (available on macOS, Linux, and modern Windows),
603	      // verify SHA256SUMS.txt, then move the verified binary into place.
604	      await downloadReleaseBinaryWithChecksum({
605	        binaryName,
606	        targetPath,
607	        execFileAsync,
608	      });
609	
610	      // Make executable (not… [+25602 chars]
```

### tool_result · 2026-06-21 06:14:34 [sidechain] [sub: agent-ae94c49b0a74bac9c]

```
1	use crate::config::Config;
2	use serde::{Deserialize, Serialize};
3	use std::path::Path;
4	
5	// ──────────────────────────────────────────────────────────────
6	// Speaker diarization.
7	//
8	// Engines:
9	//   "pyannote-rs" → Native Rust via pyannote-rs crate (recommended)
10	//   "pyannote"    → Python pyannote.audio subprocess (legacy)
11	//   "none"        → Skip diarization (default)
12	//… [+25379 chars]
```

### assistant · 2026-06-21 06:14:34 [sidechain] [sub: agent-ae94c49b0a74bac9c]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/diarize.rs')`

### assistant · 2026-06-21 06:14:34 [sidechain] [sub: agent-a93ef3858d70436f5]

Let me continue reading live_transcript.rs.

### tool_result · 2026-06-21 06:14:35 [sidechain] [sub: agent-ae94c49b0a74bac9c]

```
700	    let mut num = 0.0;
701	    let mut den_x = 0.0;
702	    let mut den_y = 0.0;
703	    for (&x, &y) in xs.iter().zip(ys.iter()) {
704	        let dx = x as f64 - mean_x;
705	        let dy = y as f64 - mean_y;
706	        num += dx * dy;
707	        den_x += dx * dx;
708	        den_y += dy * dy;
709	    }
710	
711	    let denom = (den_x * den_y).sqrt();
712	    if denom <= f64::EPSILON {
71… [+25642 chars]
```

### assistant · 2026-06-21 06:14:35 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/live_transcript.rs')`

### assistant · 2026-06-21 06:14:35 [sidechain] [sub: agent-af6b401b62faee5c9]

- **→** `Agent(description='Analyze summarize.rs and jobs.rs', prompt='Read TWO Rust files for a local meeting tool, paging fully with offset/limit:\n- /Users/rymalia/proje… [+1617 chars]', subagent_type='general-purpose')`

### user · 2026-06-21 06:14:35 [sidechain] [sub: agent-a528c57e498649c7a]

Read TWO Rust files for a local meeting tool, paging fully with offset/limit:
- /Users/rymalia/projects/minutes/crates/core/src/summarize.rs (3108 lines)
- /Users/rymalia/projects/minutes/crates/core/src/jobs.rs (2531 lines)

Produce a dense structured report (with file:line references) in two sections:

SUMMARIZE.rs:
1. How summarization works: the main public entry function(s) (e.g. run_summarization), the engine selection ("none"/"auto"/"agent"/"ollama"/"mistral"/cloud), the config fields that control it, and what the function returns (Option<String>?).
2. LLM provider options: Ollama (local), Mistral, cloud LLMs — how each is invoked (ureq HTTP client?), the agent-CLI path (timeout budget, agent_command), and CRITICALLY what happens when there is NO API key (does it skip summarization? return None? Claude-via-MCP path?).
3. Structured extraction: how action items and decisions (and intents) are extracted from the transcript/summary into the typed structs. The function names, the prompt construction, JSON parsing, and speaker mapping (mapping SPEAKER_X to names via LLM).

JOBS.rs:
4. The background job queue: the Job struct/enum and JobKind/JobStatus types, how jobs are enqueued (enqueue function), how they're persisted (JSONL? a jobs dir? sqlite?), and how the process-queue worker drains them (the drain/process function, worker loop).
5. How this decouples `record` from processing — i.e. recording enqueues a job and returns, and a separate worker processes the WAV later. Explain the lifecycle and any locking/dedup.

Do NOT modify any files. Return findings as your final message with exact function/struct names and file:line references. Be information-dense. Do not write any .md files.

### tool_result · 2026-06-21 06:14:35 [sidechain] [sub: agent-a93ef3858d70436f5]

```
450	                    tracing::error!("JSONL flush failed: {}", e);
451	                    self.jsonl_failed = true;
452	                    return false;
453	                }
454	            }
455	            Err(e) => {
456	                tracing::error!("failed to serialize transcript line: {}", e);
457	            }
458	        }
459	        // Update sidecar after each successful write
4… [+22002 chars]
```

### assistant · 2026-06-21 06:14:36 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

Now let me read the tool/resource registration section, which is the bulk of the remaining file.

### assistant · 2026-06-21 06:14:36 [sidechain] [sub: agent-a6c47d653058338e7]

I have enough detail on the parakeet subprocess machinery. Let me read the parse_parakeet_output function and the remaining helper/path-resolution code, plus check the whisper_guard cleanup pipeline definition.

### assistant · 2026-06-21 06:14:37 [sidechain] [sub: agent-a6c47d653058338e7]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs')`

### assistant · 2026-06-21 06:14:37 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/src/index.ts')`

### assistant · 2026-06-21 06:14:37 [sidechain] [sub: agent-ae94c49b0a74bac9c]

Continuing to read the rest of the file.

### assistant · 2026-06-21 06:14:37 [sidechain] [sub: agent-a528c57e498649c7a]

I'll read both files fully, paging through them in parallel.

### tool_result · 2026-06-21 06:14:37 [sidechain] [sub: agent-a6c47d653058338e7]

```
2650	        &audio_args,
2651	        vocab_str,
2652	        model_id,
2653	        use_gpu,
2654	        use_fp16,
2655	        vad_path.and_then(|path| path.to_str()),
2656	        vad_threshold,
2657	        config,
2658	        hints,
2659	    )?;
2660	
2661	    let stdout = String::from_utf8_lossy(&output.stdout);
2662	    parse_parakeet_batch_output(&stdout, audio_paths.len(), config)
2663… [+18069 chars]
```

### tool_result · 2026-06-21 06:14:38 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1300	);
1301	let effectiveMeetingsDirPromise: Promise<string> | null = null;
1302	
1303	async function getEffectiveMeetingsDir(): Promise<string> {
1304	  if (effectiveMeetingsDirPromise) {
1305	    return effectiveMeetingsDirPromise;
1306	  }
1307	
1308	  effectiveMeetingsDirPromise = (async () => {
1309	    if (!(await isCliAvailable())) {
1310	      return MEETINGS_DIR;
1311	    }
1312	
1313… [+31701 chars]
```

### assistant · 2026-06-21 06:14:38 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/live_transcript.rs')`

### assistant · 2026-06-21 06:14:38 [sidechain] [sub: agent-a528c57e498649c7a]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/summarize.rs')`

### assistant · 2026-06-21 06:14:39 [sidechain] [sub: agent-ae94c49b0a74bac9c]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/diarize.rs')`

### tool_result · 2026-06-21 06:14:39 [sidechain] [sub: agent-a93ef3858d70436f5]

```
950	                        // Discard partial utterance — see comment above the
951	                        // device-change reconnect branch for rationale.
952	                        if utterance_samples > 0 {
953	                            tracing::info!(
954	                                samples_discarded = utterance_samples,
955	                                "discarding partial utteranc… [+21455 chars]
```

### assistant · 2026-06-21 06:14:39 [sidechain] [sub: agent-a528c57e498649c7a]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/jobs.rs')`

### tool_result · 2026-06-21 06:14:39 [sidechain] [sub: agent-a528c57e498649c7a]

```
1	use crate::config::Config;
2	use crate::logging;
3	use crate::template::{compose_additional_instructions, Template};
4	use std::path::PathBuf;
5	use std::time::Instant;
6	
7	// ──────────────────────────────────────────────────────────────
8	// LLM summarization module (pluggable).
9	//
10	// Supported engines:
11	//   "auto"    → Detect installed AI CLI (claude > codex > gemini > opencode), ski… [+30145 chars]
```

### assistant · 2026-06-21 06:14:39 [sidechain] [sub: agent-ae94c49b0a74bac9c]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/diarize.rs')`

### tool_result · 2026-06-21 06:14:39 [sidechain] [sub: agent-ae94c49b0a74bac9c]

```
1399	
1400	#[derive(Debug, Clone, Copy, PartialEq)]
1401	struct RemoteSpeechRun {
1402	    start_secs: f32,
1403	    end_secs: f32,
1404	}
1405	
1406	impl RemoteSpeechRun {
1407	    fn duration_secs(self) -> f32 {
1408	        (self.end_secs - self.start_secs).max(0.0)
1409	    }
1410	}
1411	
1412	fn system_dominant_runs(segments: &[SpeakerSegment]) -> Vec<RemoteSpeechRun> {
1413	    let mut sorte… [+28965 chars]
```

### tool_result · 2026-06-21 06:14:40 [sidechain] [sub: agent-a528c57e498649c7a]

```
1	use crate::calendar::CalendarEvent;
2	use crate::config::Config;
3	use crate::error::{MinutesError, TranscribeError};
4	use crate::markdown::{ContentType, OutputStatus};
5	use crate::pid::{self, CaptureMode, PidGuard};
6	use crate::pipeline::{self, BackgroundPipelineContext, PipelineStage};
7	use chrono::{DateTime, Local};
8	use serde_json::json;
9	use std::fs;
10	use std::io::ErrorKind;
11	use… [+32358 chars]
```

### assistant · 2026-06-21 06:14:40 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

Let me continue reading the remaining tools and resources.

### tool_result · 2026-06-21 06:14:40 [sidechain] [sub: agent-ae94c49b0a74bac9c]

```
2099	
2100	        // Skip too-short segments for clustering; they still appear in the
2101	        // transcript but inherit the nearest speaker label.
2102	        if seg_i16.len() < min_embed_samples {
2103	            seg_speaker_ids.push(usize::MAX); // sentinel: inherit later
2104	            continue;
2105	        }
2106	
2107	        let raw_embedding: Vec<f32> = extractor.compute(seg_i16)… [+28174 chars]
```

### assistant · 2026-06-21 06:14:40 [sidechain] [sub: agent-a6c47d653058338e7]

I have enough of transcribe.rs. Let me look at the transcription_coordinator cleanup pipeline (which wraps the whisper_guard functions) to document layer behavior precisely.

### assistant · 2026-06-21 06:14:41 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/src/index.ts')`

### assistant · 2026-06-21 06:14:41 [sidechain] [sub: agent-a93ef3858d70436f5]

Let me get a structural outline of the rest of live_transcript.rs to read efficiently, then target key functions.

### assistant · 2026-06-21 06:14:41 [sidechain] [sub: agent-a6c47d653058338e7]

- **→** `Bash(command="sed -n '1,200p' /Users/rymalia/projects/minutes/crates/core/src/transcription_coordinator.rs 2>/dev/… [+29 chars]", description='Read transcription_coordinator.rs head')`

### tool_result · 2026-06-21 06:14:42 [sidechain] [sub: agent-a6c47d653058338e7]

```
1:use crate::config::{Config, VALID_PARAKEET_MODELS};
2:use crate::error::TranscribeError;
3:use crate::health::HealthItem;
4:use crate::markdown::ContentType;
5:use crate::parakeet;
6:use crate::transcribe::{self, TranscribeResult};
7:use serde::{Deserialize, Serialize};
8:use std::path::{Path, PathBuf};
9:use std::sync::{Mutex, OnceLock};
10:
11:use whisper_guard::segments as wg_segments;
12:
13… [+6294 chars]
```

### tool_result · 2026-06-21 06:14:42 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
2000	  }
2001	);
2002	
2003	// ── Tool: get_moment ────────────────────────────────────────
2004	// Feature-gated (#183 phase 2). See activity_summary comment above.
2005	
2006	if (hasFeature(CLI_CAPABILITIES, "get_moment"))
2007	registerDocsAppTool(
2008	  server,
2009	  "get_moment",
2010	  {
2011	    description: "Show the local rewind around a linked artifact, context session, or explicit time… [+34774 chars]
```

### assistant · 2026-06-21 06:14:42 [sidechain] [sub: agent-a528c57e498649c7a]

I'll continue paging through both files.

### assistant · 2026-06-21 06:14:43 [sidechain] [sub: agent-a528c57e498649c7a]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/summarize.rs')`

### assistant · 2026-06-21 06:14:43 [sidechain] [sub: agent-ae94c49b0a74bac9c]

I have all the substantive code. The remainder (2799-4059) is tests. Let me verify the pipeline.rs usage to confirm how these types are consumed, and check the speaker_map application.

### assistant · 2026-06-21 06:14:43 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Bash(command='grep -n "^pub fn \\|^fn \\|^    fn \\|^#\\[cfg\\|read_since\\|session_status\\|read_since_line\\|read_since_… [+216 chars]', description='Outline functions in live_transcript.rs')`

### assistant · 2026-06-21 06:14:44 [sidechain] [sub: agent-a528c57e498649c7a]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/jobs.rs')`

### tool_result · 2026-06-21 06:14:44 [sidechain] [sub: agent-a93ef3858d70436f5]

```
8:#[cfg(feature = "whisper")]
77:    fn as_str(&self) -> &'static str {
94:#[cfg(feature = "parakeet")]
107:fn live_engine_scope_warning(engine: &str) -> Option<&'static str> {
117:fn live_supports_parakeet(engine: &str) -> bool {
130:#[cfg(feature = "parakeet")]
131:fn live_ready_parakeet_fallback(config: &Config) -> bool {
135:#[cfg(not(feature = "parakeet"))]
137:fn live_ready_parakeet_fallback… [+5216 chars]
```

### tool_result · 2026-06-21 06:14:44 [sidechain] [sub: agent-a528c57e498649c7a]

```
800	            search_dirs.push(local.join("Programs"));
801	        }
802	    }
803	
804	    let exts: &[&str] = if cfg!(windows) {
805	        &["", "cmd", "exe", "bat"]
806	    } else {
807	        &[""]
808	    };
809	    for dir in &search_dirs {
810	        for ext in exts {
811	            let mut candidate = dir.join(cmd);
812	            if !ext.is_empty() {
813	                candidate… [+35009 chars]
```

### assistant · 2026-06-21 06:14:44 [sidechain] [sub: agent-a6c47d653058338e7]

I now have everything needed. Let me quickly confirm the config struct fields for the transcription engine.

### assistant · 2026-06-21 06:14:44 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

Now the final chunk with remaining resources, the speaker tools, insights tool, and main().

### tool_result · 2026-06-21 06:14:44 [sidechain] [sub: agent-a528c57e498649c7a]

```
800	    let snapshot = list_jobs_raw();
801	    let recovery_candidates: Vec<String> = snapshot
802	        .iter()
803	        .filter(|job| {
804	            !job.state.is_terminal()
805	                && job.owner_pid.is_some()
806	                && !job.owner_pid.map(pid::is_process_alive).unwrap_or(false)
807	        })
808	        .map(|job| job.id.clone())
809	        .collect();
810	
811… [+37269 chars]
```

### assistant · 2026-06-21 06:14:45 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/src/index.ts')`

### assistant · 2026-06-21 06:14:45 [sidechain] [sub: agent-ae94c49b0a74bac9c]

- **→** `Bash(command='grep -rn "from_stems\\|source_aware\\|degraded_capture\\|DiagnosticConfidence\\|num_speakers\\|apply_spea… [+181 chars]', description='Find diarize type usage in pipeline.rs')`

### tool_result · 2026-06-21 06:14:46 [sidechain] [sub: agent-ae94c49b0a74bac9c]

```
crates/core/src/pipeline.rs:194:    attributions: Vec<diarize::SpeakerAttribution>,
crates/core/src/pipeline.rs:243:struct SpeakerAttributionDebug {
crates/core/src/pipeline.rs:253:    diarization_from_stems: bool,
crates/core/src/pipeline.rs:254:    raw_diarization_num_speakers: usize,
crates/core/src/pipeline.rs:257:    final_speaker_map: Vec<SpeakerAttributionDebug>,
crates/core/src/pipeline.rs… [+6752 chars]
```

### assistant · 2026-06-21 06:14:46 [sidechain] [sub: agent-a6c47d653058338e7]

- **→** `Bash(command='grep -n "pub engine\\|pub parakeet_model\\|pub parakeet_vocab\\|pub parakeet_binary\\|pub parakeet_fp16\\… [+211 chars]', description='Find TranscriptionConfig fields')`

### tool_result · 2026-06-21 06:14:46 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
2799	    if (!(await isCliAvailable())) {
2800	      return { contents: [{ uri: "minutes://events/recent", mimeType: "application/json", text: "[]" }] };
2801	    }
2802	    const { stdout } = await runMinutes(["events", "--limit", "20"]);
2803	    return { contents: [{ uri: "minutes://events/recent", mimeType: "application/json", text: stdout }] };
2804	  }
2805	);
2806	
2807	server.resource(
280… [+34868 chars]
```

### tool_result · 2026-06-21 06:14:46 [sidechain] [sub: agent-a6c47d653058338e7]

```
160:pub struct TranscriptionConfig {
163:    pub engine: String,
164:    pub model: String,
165:    pub model_path: PathBuf,
166:    pub min_words: usize,
167:    pub language: Option<String>,
170:    pub vad_model: String,
211:    pub noise_reduction: bool,
213:    pub parakeet_binary: String,
215:    pub parakeet_model: String,
218:    pub parakeet_boost_limit: usize,
220:    pub parakeet_boost_… [+358 chars]
```

### assistant · 2026-06-21 06:14:46 [sidechain] [sub: agent-a93ef3858d70436f5]

Now let me read the delta-read and session-status functions, the finalize functions, and the sidecar inner loop.

### assistant · 2026-06-21 06:14:47 [sidechain] [sub: agent-ae94c49b0a74bac9c]

- **→** `Bash(command='grep -rn "speaker_map\\|apply_confirmed_names\\|apply_speakers\\|SpeakerAttribution" crates/core/src/*.… [+36 chars]', description='Find speaker_map and attribution usage outside diarize.rs')`

### tool_result · 2026-06-21 06:14:47 [sidechain] [sub: agent-ae94c49b0a74bac9c]

```
crates/core/src/daily_notes.rs:306:            speaker_map: vec![],
crates/core/src/dictation.rs:1140:        speaker_map: vec![],
crates/core/src/jobs.rs:1808:                speaker_map: vec![],
crates/core/src/graph.rs:2:use crate::diarize::SpeakerAttribution;
crates/core/src/graph.rs:433:        let speaker_map =
crates/core/src/graph.rs:434:            speaker_map_with_overlays(&frontmatter.s… [+4595 chars]
```

### assistant · 2026-06-21 06:14:47 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/live_transcript.rs')`

### assistant · 2026-06-21 06:14:48 [sidechain] [sub: agent-a528c57e498649c7a]

jobs.rs is fully covered (ends at line 2531 but the remainder is tests; I've seen the worker loop and all core functions). Let me finish summarize.rs — the HTTP helper, screen encoding, structured extraction (action items/decisions/intents), and speaker mapping sections.

### tool_result · 2026-06-21 06:14:48 [sidechain] [sub: agent-a93ef3858d70436f5]

```
1789	#[cfg(all(feature = "whisper", feature = "parakeet"))]
1790	#[allow(clippy::too_many_arguments)]
1791	fn finalize_live_utterance(
1792	    writer: &mut LiveTranscriptWriter,
1793	    apple_live_enabled: &mut bool,
1794	    #[cfg(target_os = "macos")] apple_utterance_samples: &mut Vec<f32>,
1795	    parakeet_fallback_ready: bool,
1796	    parakeet_live_enabled: &mut bool,
1797	    parakeet_utt… [+7469 chars]
```

### assistant · 2026-06-21 06:14:48 [sidechain] [sub: agent-a528c57e498649c7a]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/summarize.rs')`

### assistant · 2026-06-21 06:14:49 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

I have the full MCP server now. Let me read the SDK reader and index, plus glance at the UI entry.

### tool_result · 2026-06-21 06:14:49 [sidechain] [sub: agent-a528c57e498649c7a]

```
1698	fn http_agent() -> ureq::Agent {
1699	    ureq::Agent::new_with_config(
1700	        ureq::config::Config::builder()
1701	            .timeout_global(Some(HTTP_TIMEOUT))
1702	            .http_status_as_error(false)
1703	            .build(),
1704	    )
1705	}
1706	
1707	fn http_post(
1708	    url: &str,
1709	    body: &serde_json::Value,
1710	    headers: &[(&str, &str)],
1711	) -> Result<se… [+37227 chars]
```

### assistant · 2026-06-21 06:14:50 [sidechain] [sub: agent-ae94c49b0a74bac9c]

Let me read the key pipeline.rs attribution-building region (lines 320-520 and 940-1230) to confirm the L0/L1/L2/L3 implementation.

### assistant · 2026-06-21 06:14:50 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/sdk/src/reader.ts')`

### assistant · 2026-06-21 06:14:50 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/sdk/src/index.ts')`

### tool_result · 2026-06-21 06:14:50 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1	// minutes-sdk — conversation memory for AI agents
2	//
3	// Query meeting transcripts, decisions, and action items from any
4	// AI agent or application. The "Mem0 for human conversations."
5	//
6	// Same functionality as the Rust `minutes-reader` crate.
7	//
8	// Architecture:
9	//   ~/meetings/*.md --> parseFrontmatter() --> MeetingFile
10	//                                                |
1… [+26896 chars]
```

### tool_result · 2026-06-21 06:14:51 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1	// minutes-sdk — conversation memory for AI agents
2	//
3	// The "Mem0 for human conversations." Query meeting transcripts,
4	// decisions, action items, and people from any AI agent or app.
5	//
6	// Usage:
7	//   import { listMeetings, searchMeetings, defaultDir } from 'minutes-sdk';
8	//
9	//   const meetings = await listMeetings(defaultDir());
10	//   const results = await searchMeetings(def… [+813 chars]
```

### assistant · 2026-06-21 06:14:51 [sidechain] [sub: agent-a93ef3858d70436f5]

Now the delta-read functions, session_status, and the sidecar inner loop.

### assistant · 2026-06-21 06:14:51 [sidechain] [sub: agent-ae94c49b0a74bac9c]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/pipeline.rs')`

### tool_result · 2026-06-21 06:14:51 [sidechain] [sub: agent-ae94c49b0a74bac9c]

```
320	) -> VoiceMatchResult {
321	    if !config.voice.enabled || diarization_embeddings.is_empty() {
322	        return VoiceMatchResult {
323	            attributions: Vec::new(),
324	            self_profile_exists: false,
325	        };
326	    }
327	
328	    let profiles = crate::voice::open_db()
329	        .ok()
330	        .and_then(|conn| crate::voice::load_all_with_embeddings(&conn).ok())… [+6304 chars]
```

### assistant · 2026-06-21 06:14:51 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/live_transcript.rs')`

### assistant · 2026-06-21 06:14:52 [sidechain] [sub: agent-ae94c49b0a74bac9c]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/pipeline.rs')`

### assistant · 2026-06-21 06:14:52 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Bash(command='wc -l /Users/rymalia/projects/minutes/crates/mcp/ui/src/mcp-app.ts /Users/rymalia/projects/minutes/c… [+208 chars]', description='Size UI files and read vite config')`

### tool_result · 2026-06-21 06:14:52 [sidechain] [sub: agent-a93ef3858d70436f5]

```
2095	#[cfg(feature = "whisper")]
2096	pub fn run_sidecar_mpsc(
2097	    rx: std::sync::mpsc::Receiver<Vec<f32>>,
2098	    stop_flag: Arc<AtomicBool>,
2099	    config: &Config,
2100	) {
2101	    let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
2102	        run_sidecar_inner_mpsc(rx, stop_flag, config)
2103	    }));
2104	
2105	    match outcome {
2106	        Ok(Ok(())) => {}… [+22438 chars]
```

### tool_result · 2026-06-21 06:14:52 [sidechain] [sub: agent-ae94c49b0a74bac9c]

```
940	    config: &Config,
941	    voice_result: &VoiceMatchResult,
942	    diarization_from_stems: bool,
943	    transcript: &str,
944	    transcript_labels: &[String],
945	    already_mapped_labels: &std::collections::HashSet<String>,
946	) -> SelfAttributionOutcome {
947	    if !diarization_from_stems || !already_mapped_labels.is_empty() {
948	        return if !diarization_from_stems {
949… [+13241 chars]
```

### tool_result · 2026-06-21 06:14:52 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
945 /Users/rymalia/projects/minutes/crates/mcp/ui/src/mcp-app.ts
      98 /Users/rymalia/projects/minutes/crates/mcp/ui/index.html
    1043 total
---vite config---
/Users/rymalia/projects/minutes/crates/mcp/vite.config.mjs
===
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  root: "ui",
  b… [+161 chars]
```

### assistant · 2026-06-21 06:14:53 [sidechain] [sub: agent-a528c57e498649c7a]

I now have the complete picture of summarize.rs. The structured extraction (action items, decisions, open questions, commitments, key points, participants) all flows through `parse_summary_response`. The "intents" and typed action-item/decision structs the prompt mentions are handled downstream in the pipeline, not in this file. Let me confirm where the typed structs and intent extraction live, since the prompt explicitly asks about them.

### assistant · 2026-06-21 06:14:55 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

Let me quickly check the UI entry head and version.ts to round out the picture.

### assistant · 2026-06-21 06:14:55 [sidechain] [sub: agent-a93ef3858d70436f5]

Now the helper transcribe functions and enqueue. Then dictation.rs.

### assistant · 2026-06-21 06:14:55 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/ui/index.html')`

### assistant · 2026-06-21 06:14:56 [sidechain] [sub: agent-a528c57e498649c7a]

- **→** `Bash(command='cd /Users/rymalia/projects/minutes/crates/core/src && rg -l "intent|ActionItem|Decision" --type rust… [+200 chars]', description='Locate typed action item/decision/intent structs and extraction')`

### tool_result · 2026-06-21 06:14:56 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1	<!DOCTYPE html>
2	<html lang="en">
3	<head>
4	  <meta charset="UTF-8" />
5	  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
6	  <title>Minutes Dashboard</title>
7	  <link rel="stylesheet" href="./src/mcp-app.css" />
8	</head>
9	<body>
10	  <div class="main">
11	    <!-- Loading -->
12	    <div id="loading">
13	      <div class="loading-content">
14	        <div class="s… [+1035 chars]
```

### assistant · 2026-06-21 06:14:56 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/live_transcript.rs')`

### assistant · 2026-06-21 06:14:56 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/ui/src/mcp-app.ts')`

### tool_result · 2026-06-21 06:14:56 [sidechain] [sub: agent-a93ef3858d70436f5]

```
1509	fn transcribe_with_whisper_for_live_sidecar(
1510	    samples: &[f32],
1511	    whisper_ctx: &whisper_rs::WhisperContext,
1512	    language: Option<String>,
1513	) -> Option<(String, f64)> {
1514	    if samples.is_empty() {
1515	        return None;
1516	    }
1517	
1518	    // This helper is a batch path: it accumulates `samples` via `feed()` and
1519	    // discards every partial result, re… [+6849 chars]
```

### tool_result · 2026-06-21 06:14:57 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1	/**
2	 * Minutes Dashboard — MCP App
3	 *
4	 * Interactive meeting dashboard with detail views.
5	 * Uses ext-apps SDK for host communication.
6	 */
7	
8	import {
9	  App,
10	  type McpUiHostContext,
11	  applyDocumentTheme,
12	  applyHostStyleVariables,
13	} from "@modelcontextprotocol/ext-apps";
14	import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
15	import "./mcp-app.c… [+1757 chars]
```

### assistant · 2026-06-21 06:14:57 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/src/version.ts')`

### tool_result · 2026-06-21 06:14:57 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

```
1	/**
2	 * CLI/MCP version compatibility.
3	 *
4	 * Replaces the historical strict-equality check with same-major semver
5	 * compatibility. See issue #183 for the rationale: hosted `.mcpb` bundles
6	 * ship a frozen MCP server version, while users' CLI versions advance
7	 * independently via brew/cargo/auto-install. Strict equality turned every
8	 * version skew into scary user-facing warnings an… [+1487 chars]
```

### assistant · 2026-06-21 06:14:58 [sidechain] [sub: agent-a93ef3858d70436f5]

I have enough of live_transcript.rs. Now dictation.rs.

### assistant · 2026-06-21 06:15:00 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Bash(command='grep -n "^pub fn \\|^fn \\|^    pub fn \\|^    fn \\|^#\\[cfg\\|clipboard\\|daily_note\\|silence_timeout\\|pu… [+57 chars]', description='Outline dictation.rs')`

### tool_result · 2026-06-21 06:15:00 [sidechain] [sub: agent-a93ef3858d70436f5]

```
25:#[cfg(feature = "whisper")]
31:#[cfg(feature = "whisper")]
35:fn startup_debug(event: &str, model: Option<&str>, elapsed_ms: Option<u128>, note: Option<&str>) {
59:#[cfg(feature = "whisper")]
60:pub fn preload_model(config: &Config) -> Result<(), MinutesError> {
110:#[cfg(not(feature = "whisper"))]
111:pub fn preload_model(_config: &Config) -> Result<(), MinutesError> {
117:#[cfg(feature = "whi… [+4966 chars]
```

### assistant · 2026-06-21 06:15:03 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/dictation.rs')`

### tool_result · 2026-06-21 06:15:04 [sidechain] [sub: agent-a93ef3858d70436f5]

```
173	pub struct DictationResult {
174	    pub raw_text: String,
175	    pub text: String,
176	    pub duration_secs: f64,
177	    pub destination: String,
178	    pub file_path: Option<PathBuf>,
179	    pub daily_note_appended: bool,
180	}
181	
182	/// Callback for dictation events (used by Tauri UI).
183	#[derive(Debug, Clone, PartialEq, Eq)]
184	pub enum DictationEvent {
185	    Listening,
186… [+13977 chars]
```

### assistant · 2026-06-21 06:15:07 [sidechain] [sub: agent-a93ef3858d70436f5]

Now the rest of the dictation loop (silence timeout) and the daily-note/clipboard finish.

### assistant · 2026-06-21 06:15:08 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/dictation.rs')`

### tool_result · 2026-06-21 06:15:09 [sidechain] [sub: agent-a93ef3858d70436f5]

```
512	                        &mut streaming,
513	                        &whisper_ctx,
514	                    ) {
515	                        handle_utterance(
516	                            &sr.text,
517	                            sr.duration_secs,
518	                            config,
519	                            &mut accumulated_results,
520	                            on_result,
521… [+4495 chars]
```

### assistant · 2026-06-21 06:15:12 [sidechain] [sub: agent-a93ef3858d70436f5]

Now the daily-note and clipboard write functions to confirm the dictation output path.

### assistant · 2026-06-21 06:15:12 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/dictation.rs')`

### tool_result · 2026-06-21 06:15:13 [sidechain] [sub: agent-a93ef3858d70436f5]

```
847	/// Finish a transcribed utterance: write to clipboard, file, daily note.
848	/// Called after StreamingWhisper produces a final result.
849	fn finish_utterance(text: &str, duration_secs: f64, config: &Config) -> Option<DictationResult> {
850	    let result = prepare_result(text, duration_secs, config)?;
851	    write_result_outputs(result, config)
852	}
853	
854	fn prepare_result(text: &str,… [+3223 chars]
```

### assistant · 2026-06-21 06:15:16 [sidechain] [sub: agent-a93ef3858d70436f5]

I have enough now. Let me quickly check how the JSONL is consumed by external readers (MCP, CLI `transcript`, Tauri) and confirm the `pid::live_transcript_jsonl_path` location.

### assistant · 2026-06-21 06:15:18 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Bash(command='grep -rn "live_transcript_jsonl_path\\|live_transcript_status_path\\|live_transcript_wav_path\\|live_tr… [+268 chars]', description='Find JSONL paths and external consumers')`

### tool_result · 2026-06-21 06:15:18 [sidechain] [sub: agent-a93ef3858d70436f5]

```
crates/core/src/pid.rs:34:pub fn live_transcript_pid_path() -> PathBuf {
crates/core/src/pid.rs:39:pub fn live_transcript_jsonl_path() -> PathBuf {
crates/core/src/pid.rs:44:pub fn live_transcript_wav_path() -> PathBuf {
crates/core/src/pid.rs:49:pub fn live_transcript_status_path() -> PathBuf {
---- CLI/MCP/Tauri consumers ----
crates/cli/src/main.rs
tauri/src-tauri/src/palette_dispatch.rs
tauri/… [+53 chars]
```

### assistant · 2026-06-21 06:15:21 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/pid.rs')`

### tool_result · 2026-06-21 06:15:22 [sidechain] [sub: agent-a93ef3858d70436f5]

```
30	    Config::minutes_dir().join("dictation.pid")
31	}
32	
33	/// Path to the live transcript PID file (`~/.minutes/live-transcript.pid`).
34	pub fn live_transcript_pid_path() -> PathBuf {
35	    Config::minutes_dir().join("live-transcript.pid")
36	}
37	
38	/// Path to the live transcript JSONL file (`~/.minutes/live-transcript.jsonl`).
39	pub fn live_transcript_jsonl_path() -> PathBuf {
40	    C… [+600 chars]
```

### assistant · 2026-06-21 06:15:24 [sidechain] [sub: agent-a93ef3858d70436f5]

I have everything needed. Let me verify how the CLI `transcript` command and MCP consume the delta reads quickly.

### assistant · 2026-06-21 06:15:26 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Bash(command='grep -n "read_since_line\\|read_since_duration\\|session_status\\|live_transcript" crates/cli/src/main.… [+187 chars]', description='CLI and MCP transcript consumers')`

### tool_result · 2026-06-21 06:15:26 [sidechain] [sub: agent-a93ef3858d70436f5]

```
2197:    let lt_pid = minutes_core::pid::live_transcript_pid_path();
2541:            let lt_pid_path = minutes_core::pid::live_transcript_pid_path();
4935:    features.insert("read_live_transcript".into(), true);
4941:    features.insert("start_live_transcript".into(), true);
9209:        minutes_core::desktop_context::maybe_start_live_transcript_session(
9227:    match minutes_core::live_transcr… [+1710 chars]
```

### assistant · 2026-06-21 06:15:29 [sidechain] [sub: agent-a93ef3858d70436f5]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/mcp/src/index.ts')`

### tool_result · 2026-06-21 06:15:29 [sidechain] [sub: agent-a93ef3858d70436f5]

```
3332	// ── Tool: read_live_transcript ──────────────────────────────
3333	
3334	registerTool(
3335	  "read_live_transcript",
3336	  "Read the live transcript — works during both recordings and live transcript sessions. Use 'since' to get new lines after a cursor (line number) or time window (e.g., '5m', '30s'). Use 'status' mode to check if a session is active.",
3337	  {
3338	    since: z.string(… [+2789 chars]
```

### assistant · 2026-06-21 06:15:51 [sidechain] [sub: agent-a6c47d653058338e7]

I have all the information needed. Here is the structured report.

---

# transcribe.rs — Structured Report

File: `/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs` (4156 lines). Cleanup pipeline lives in `/Users/rymalia/projects/minutes/crates/core/src/transcription_coordinator.rs`. Config in `/Users/rymalia/projects/minutes/crates/core/src/config.rs`.

## 1. Public entry functions, types, and the two backends

**Public entry points** (all return `Result<TranscribeResult, TranscribeError>`):
- `transcribe(audio_path, config)` — transcribe.rs:313, the default entry; delegates to `transcribe_with_hints` with `DecodeHints::default()`.
- `transcribe_with_hints(audio_path, config, hints)` — :317, delegates to `transcribe_dispatch`.
- `transcribe_meeting(audio_path, config)` — :597, and `transcribe_meeting_with_hints` — :604. Meeting-specialized path: loads samples, runs energy-based `detect_meeting_vad_chunks` (:1333), and if ≥2 chunks routes through `transcribe_chunk_ranges`; otherwise falls back to `transcribe_dispatch`.
- `transcribe_parakeet_batch(audio_paths, config)` — :2976 (parakeet-only); batch transcription of many files via one subprocess call.

**Key returned types:**
- `TranscribeResult { text: String, stats: FilterStats }` — :124. The canonical result. `text` is `[M:SS] text\n` lines (identical format from both backends).
- `FilterStats` — :31. Per-layer diagnostics (see §3/§5).
- `DecodeHints` — :135. Meeting-local lexical hints (`priority_phrases`, `contextual_phrases`), built via `from_candidates` (:142). Produces `whisper_initial_prompt()` (:208, prefixes "Names and terms that may appear…") for whisper, and `parakeet_local_boost_phrases()` (:219, parakeet-only) for `--boost` flags.

### Whisper backend (`whisper` feature)
- `transcribe_whisper_dispatch` (:635) → `load_audio_samples` → `load_whisper_context` (:769, builds `whisper_rs::WhisperContext`) → `transcribe_whisper_samples` (:783).
- `transcribe_whisper_samples` (:783): optional denoise, VAD-vs-energy silence decision, then calls `transcribe_with_whisper` (:872). Includes an **auto-retry without VAD** (:836) when long audio (>60s) blanks under Silero VAD.
- `transcribe_with_whisper` (:872): creates `whisper_rs` state, builds params via `default_whisper_params(vad_path_str)` (re-exported from `whisper_guard::params`, :25), sets threads/language/token-timestamps/initial-prompt, installs an abort callback (timeout = `300 + 3×audio_secs`, capped 3600s, :917). Iterates `state.full_n_segments()`, emits `[M:SS] text`, applies the no_speech filter and rescue (§3).
- GPU: `whisper_context_params()` (:734) sets `use_gpu` only if a GPU backend feature (`metal`/`cuda`/`coreml`/`hipblas`/`vulkan`) was compiled in. **GPU is a compile-time feature, not runtime config.**
- When `whisper` feature is off, `transcribe_whisper_dispatch` returns a placeholder text (:650-669).

### Parakeet backend (`parakeet` feature) — subprocess-based
- `transcribe_parakeet_dispatch` (:673): validates model name against `crate::config::VALID_PARAKEET_MODELS`, loads samples, decides chunking via `parakeet_chunk_ranges` (:390), else calls `transcribe_with_parakeet` (:1802).
- `transcribe_with_parakeet` (:1802): loads samples, strips silence (unless native VAD), writes a temp WAV (`write_wav_16k_mono`, :2872), resolves model/vocab/binary paths. Three execution paths in priority order:
  1. **Warm sidecar server** — `crate::parakeet_sidecar::transcribe_via_global_sidecar` if `sidecar_enabled_effective(config)` (:1867).
  2. **`minutes parakeet-helper` subprocess** — `resolve_minutes_parakeet_helper()` (:2462) re-invokes the `minutes` binary as a helper that emits JSON; used only when `hints.is_empty()` and env vars aren't forcing direct (:1927).
  3. **Direct CLI** — `run_parakeet_cli_structured` (:2570) → `build_parakeet_command` (:2236) → `run_parakeet_command_with_cpu_fallback` (:2387) → `output_with_timeout` (:2317).
- CLI syntax: `parakeet <model.safetensors> <audio.wav> --vocab <tok> --model <id> --timestamps [--gpu] [--fp16] [--vad <path> --vad-threshold N] [--boost-score N --boost phrase…]`.
- Subprocess timeout: `parakeet_subprocess_timeout` (:2284) = 3×WAV duration, clamped [90s, 1800s]. On GPU timeout or "Metal GPU not available" stderr, retries once on CPU (`run_parakeet_command_with_cpu_fallback`, :2387-2458).
- GPU/fp16: `use_gpu = cfg!(all(target_os="macos", target_arch="aarch64"))` (:1925); `use_fp16 = use_gpu && config.transcription.parakeet_fp16`.
- Output parsing: `parse_parakeet_output` (:2717) parses `[start - end] text` lines (strips `s` suffix and optional `(confidence)` prefix) into `ParakeetCliSegment { start_secs, end_secs, confidence: Option<f32>, text }` (:2082) / `ParakeetCliTranscript { raw_output, segments, transcript }` (:2091). Word segments are grouped via `crate::parakeet::group_word_segments`. `transcribe_result_from_parakeet_parsed` (:2098) maps segments to `[M:SS]` lines and produces the final `TranscribeResult`.
- When `parakeet` feature is off, `transcribe_parakeet_dispatch` returns `TranscribeError::EngineNotAvailable("parakeet")` (:726).

## 2. Runtime backend selection

- **Dispatch function:** `transcribe_dispatch` (:325). Matches on `config.transcription.engine.as_str()`:
  - `"whisper"` → `transcribe_whisper_dispatch`
  - `"parakeet"` → `transcribe_parakeet_dispatch`
  - `"apple-speech"` → warns "experimental/live-only", **falls back to whisper** (:333-338)
  - any other string → warns "unknown engine", **falls back to whisper** (:339-345)
- **Config struct/field:** `TranscriptionConfig` in config.rs:160; field `pub engine: String` (config.rs:163). Related parakeet fields: `parakeet_model` (:215), `parakeet_vocab` (:258), `parakeet_binary` (:213), `parakeet_fp16` (:226), `parakeet_boost_limit` (:218), `parakeet_boost_score` (:220). Whisper/shared fields: `model` (:164), `model_path` (:165), `vad_model` (:170), `language` (:167), `noise_reduction` (:211), `min_words` (:166).
- **Feature flag interaction:** `engine = "parakeet"` is honored only if the crate was built with `--features parakeet`; without it, `transcribe_parakeet_dispatch` returns `EngineNotAvailable`. `chunk_transcription_strategy` (:511) chooses `SharedWhisperContext` (one context reused across VAD chunks) vs `DispatchPerChunk` based on the `whisper` feature + `engine == "whisper"`.

## 3. whisper-guard anti-hallucination integration

The whisper-guard functions are wrapped by the coordinator's `run_transcript_cleanup_pipeline` (transcription_coordinator.rs:166), called from every backend's post-segment path (transcribe.rs:1018, :483, :575, :2117, :2841). Each wrapper delegates to `whisper_guard::segments` (imported `as wg_segments`, coordinator :11):

| Layer | Coordinator wrapper | whisper_guard fn | Purpose |
|--------|--------|--------|--------|
| Silero VAD gating | (not in pipeline) | passed to whisper via `default_whisper_params(vad_path)` (:900) | ML voice-activity gating inside whisper.cpp |
| Energy silence strip | `strip_silence` (re-exported :23) | `whisper_guard::audio::strip_silence` | Fallback when no Silero VAD model (:818, parakeet :1838) |
| no_speech filter | inline in `transcribe_with_whisper` (:973-988) | — (uses `segment.no_speech_probability() > 0.8`) | Skips likely-hallucinated segments; whisper-only |
| Consecutive dedup | `dedup_segments` (:136) | `wg_segments::dedup_segments` | Collapse 3+ similar consecutive lines |
| Interleaved dedup | `dedup_interleaved` (:140) | `wg_segments::dedup_interleaved` | A/B/A/B loop detection |
| Foreign-script strip | `strip_foreign_script` (:148) | `wg_segments::strip_foreign_script` | Drop foreign-script hallucinations |
| Noise-marker collapse | `collapse_noise_markers` (:152) | `wg_segments::collapse_noise_markers` | Collapse `[music]`/`[Śmiech]`/`[risas]` etc. |
| Trailing-noise trim | `trim_trailing_noise` (:144) | `wg_segments::trim_trailing_noise` | Trim trailing noise markers |

Pipeline order (coordinator :170-185): DedupSegments → DedupInterleaved → StripForeignScript → CollapseNoiseMarkers → TrimTrailingNoise. `TranscriptCleanupResult.after(stage)` (:157) returns per-stage surviving line counts, fed into `FilterStats.after_*` fields.

**no_speech rescue (whisper-only, :990-1005):** segments with `no_speech_prob > 0.8` are pushed to `rescued_lines` but excluded from `lines`. If the filter would blank the whole transcript, all rescued lines are restored and `stats.rescued_no_speech` is set — a noisy transcript beats nothing.

**CleanOptions / CleanStats / clean_transcript:** `clean_transcript` and `CleanStats` are re-exported from `whisper_guard::segments` at transcribe.rs:26 for public-API compatibility, but the **active in-tree path uses the per-stage `run_transcript_cleanup_pipeline`, not `clean_transcript`/`CleanOptions` directly** — those re-exports exist for external callers. `default_whisper_params`/`streaming_whisper_params` are re-exported from `whisper_guard::params` (:25); `normalize_audio`/`resample`/`strip_silence` from `whisper_guard::audio` (:23).

## 4. ffmpeg vs symphonia decode path

- **Entry:** `load_audio_samples(path)` (:1062). Branches on lowercased extension:
  - `wav` → `load_wav` (:1103) directly.
  - `m4a | mp3 | ogg | webm | mp4 | mov | aac` → **ffmpeg first**, symphonia fallback (:1071-1097).
  - anything else → `TranscribeError::UnsupportedFormat`.
- **ffmpeg preferred** because symphonia's AAC decoder produces subtly different samples that trigger whisper hallucination loops on non-English audio (issue #21, comment :1058-1061, :1074). `decode_with_ffmpeg` (:1165): pre-creates a `0o600` temp WAV (unix), resolves binary via `crate::ffmpeg::resolve_ffmpeg`, runs `ffmpeg -i <in> -ar 16000 -ac 1 -f wav -y <tmp>`, then loads the result via `load_wav`. On "not found"/"not available" it logs a warn and falls back; other errors also fall back to symphonia.
- **symphonia fallback:** `decode_with_symphonia` (:1233): probes format, picks first non-null audio track, decodes all packets into interleaved f32, downmixes to mono by averaging channels, resamples, normalizes.
- **Resample to 16kHz mono:** both `load_wav` (:1146) and `decode_with_symphonia` (:1321) call `resample(&mono, sample_rate, 16000)` (whisper_guard windowed-sinc) only when `sample_rate != 16000`, then `normalize_audio(&resampled)` (:1154, :1327) to boost quiet mics. Mono downmix in `load_wav` averages interleaved frames (:1136-1143). `write_wav_16k_mono` (:2872) writes 16-bit mono 16kHz WAVs for chunk/parakeet temp files.

## 5. Public types and NoSpeech / filter-diagnosis signaling

- **`TranscribeResult`** (:124) — `{ text, stats }`.
- **`FilterStats`** (:31) — `audio_duration_secs`, `samples_after_silence_strip`, `raw_segments`, `skipped_no_speech`, `after_no_speech_filter`, `after_dedup`, `after_interleaved`, `after_script_filter`, `after_noise_markers`, `after_trailing_trim`, `rescued_no_speech`, `final_words`. `FilterStats::diagnosis()` (:61) renders a human-readable per-layer summary (e.g. `"silence strip removed ALL audio"`, `"no_speech filter: -N → M"`, `"final: N words"`), logged at completion (:1039) and on blank-transcript warnings (:1044).
- **`DecodeHints`** (:135) — see §1.
- **Parakeet types (feature-gated):** `ParakeetCliSegment` (:2082, includes `confidence: Option<f32>`), `ParakeetCliTranscript` (:2091), `ParakeetFilterStats` (:2071, internal), `ParakeetWarmupStats` (:2486).
- **NoSpeech signaling** is whisper-specific: read from `segment.no_speech_probability()` with threshold `> 0.8` (:975), counted into `stats.skipped_no_speech`, with the rescue mechanism setting `stats.rescued_no_speech`. Parakeet has no per-segment no_speech probability — its `transcribe_result_from_parakeet_parsed` sets `after_no_speech_filter = raw_segments` (:2129), i.e. the no_speech layer is a no-op for parakeet.
- **Error signaling:** `TranscribeError::EmptyAudio`, `EmptyTranscript(min_words)`, `ModelNotFound`, `ModelTruncated { path, model_name, actual_mb, expected_min_mb }` (:1603, validated by `validate_whisper_model_size` :1581 against `expected_whisper_model_size_bytes` :1545), `TranscriptionFailed`, `ParakeetFailed`, `ParakeetNotFound`, `EngineNotAvailable`. Empty-chunk errors (`EmptyAudio`/`EmptyTranscript`) are swallowed per-chunk during VAD chunk rotation (:451, :548).

### Notable supporting details
- VAD model resolution: `resolve_vad_model_path` (:1720, whisper), `resolve_silero_onnx_path` (:1765, `vad-ort` feature), `resolve_parakeet_native_vad_path` (:2958, looks for `silero_vad_v5.safetensors`). `PARAKEET_NATIVE_VAD_THRESHOLD = 0.5` (:371).
- Chunking thresholds: meeting energy-VAD `MAX_CHUNK_SAMPLES = 45s` (:1338); parakeet long-audio chunk = 45s over 60s threshold, or 180s over 240s threshold with native VAD (:363-369).
- Denoise: `denoise_audio` (:1465, `denoise` feature) — RNNoise at 48kHz, whisper path only; parakeet logs that noise_reduction is unsupported (:1826).

### tool_result · 2026-06-21 06:15:51 [sidechain] [sub: agent-af6b401b62faee5c9]

```
I have all the information needed. Here is the structured report.

---

# transcribe.rs — Structured Report

File: `/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs` (4156 lines). Cleanup pipeline lives in `/Users/rymalia/projects/minutes/crates/core/src/transcription_coordinator.rs`. Config in `/Users/rymalia/projects/minutes/crates/core/src/config.rs`.

## 1. Public entry functions,… [+12537 chars]
```

### tool_result · 2026-06-21 06:15:51 [sidechain] [sub: agent-af6b401b62faee5c9]

```
agentId: a6c47d653058338e7 (use SendMessage with to: 'a6c47d653058338e7' to continue this agent)
<usage>subagent_tokens: 95542
tool_uses: 7
duration_ms: 91910</usage>
```

### assistant · 2026-06-21 06:16:12 [sidechain] [sub: agent-ae94c49b0a74bac9c]

I now have everything needed. Here is the dense structured report.

---

# diarize.rs — Speaker Diarization & Attribution Report

File: `/Users/rymalia/projects/minutes/crates/core/src/diarize.rs` (4059 lines; lines 2799–4059 are unit tests). Lines 1–2798 contain all types/logic. Pipeline consumer: `/Users/rymalia/projects/minutes/crates/core/src/pipeline.rs`.

## 1. How Speaker Diarization Works

### Engines & feature flag
- Engine is `config.diarization.engine`: `"none"` (default), `"auto"`, `"pyannote-rs"` (native Rust/ONNX), `"pyannote"` (legacy Python subprocess). Resolved by `resolve_diarization_engine` (diarize.rs:1064): `"none"`→None, `"auto"`→`pyannote-rs` only if `models_installed`, else None.
- The `diarize` Cargo feature gates the native ONNX engine. `run_diarization_engine` (diarize.rs:1082) dispatches in a spawned thread (panic isolation): under `#[cfg(feature = "diarize")]` calls `diarize_with_pyannote_rs` (diarize.rs:1107); under `#[cfg(not(feature = "diarize"))]` returns an error telling the user to rebuild with `--features diarize` (diarize.rs:1108–1111). `diarize_with_pyannote_rs` and its helpers (`SpeechSegment`, `l2_normalize`, `merge_short_segments`, `segment_speech`, `load_audio`) are all `#[cfg(feature = "diarize")]` (diarize.rs:1994–2565).

### ONNX models
- `SEGMENTATION_MODEL = "segmentation-3.0.onnx"` (diarize.rs:237); embedding models via `embedding_model_info` (diarize.rs:251): `"cam++"`→`wespeaker_en_voxceleb_CAM++.onnx`, `"cam++-lm"`→`voxceleb_CAM++_LM.onnx`. `embedding_model_for_config` (diarize.rs:274) defaults to cam++. `models_installed` (diarize.rs:280) checks both files exist. `EmbeddingModelInfo` carries `filename`/`url`/`version` (diarize.rs:243). Download via `minutes setup --diarization` (~34MB).

### Main public diarization functions
- `diarize_with_context(audio_path, config, ctx) -> DiarizationOutcome` (diarize.rs:1644) — the real entry point. Orchestrates stem-discovery → source-aware path → ML fallback. Returns `DiarizationOutcome::{Result, Skipped{reason}, NotConfigured}` (diarize.rs:171).
- `diarize(audio_path, config) -> Option<DiarizationResult>` (diarize.rs:1757) — thin wrapper that calls `diarize_with_context` with `DiarizationPurpose::Auxiliary` and no transcript windows; maps `Skipped`/`NotConfigured`→None.
- `DiarizationContext` (diarize.rs:159) carries `purpose: DiarizationPurpose` (`PrimaryMeeting`|`Auxiliary`, diarize.rs:153) and `transcript_windows: Option<&[TranscriptWindow]>` (`TranscriptWindow{start_secs,end_secs}`, diarize.rs:165). The degraded-capture guards only fire for `PrimaryMeeting`.

### Native pyannote-rs pipeline (`diarize_with_pyannote_rs`, diarize.rs:1995)
1. `load_audio` (diarize.rs:2490) decodes via symphonia to `(f32 [-1,1], i16, sample_rate)`, downmixing to mono.
2. `segment_speech` (diarize.rs:2374) runs the segmentation ONNX directly (via `ort`), bypassing `pyannote_rs::get_segments` which has an i16→f32 normalization bug (doesn't divide by 32768). Uses model constants `frame_size=270`, `frame_start=721`, 10s windows. If no speech found and peak<0.5, normalizes audio and retries (diarize.rs:2039).
3. `merge_short_segments` (diarize.rs:2324) merges fragments (300ms gap tolerance, 0.5s min) for stable embeddings.
4. Embedding extraction + clustering: `EmbeddingExtractor.compute`, `l2_normalize` (diarize.rs:2311), then a custom **running-average speaker-template** clustering (replaces pyannote-rs `EmbeddingManager` which only kept the first embedding). Cosine similarity via `crate::voice::cosine_similarity`; new cluster if best sim ≤ `config.diarization.threshold`. Segments <1.5s (`min_embed_samples`) skip clustering and inherit nearest temporal neighbor's label (sentinel `usize::MAX`, forward+backward fill, diarize.rs:2206–2241).
5. Merge pass collapses templates with sim > `max(threshold-0.05, 0.3)` (diarize.rs:2152), with union-find-style transitive resolution.
6. Labels assigned `SPEAKER_1, SPEAKER_2, …`. Final `speaker_embeddings` = count-weighted average per merged label (diarize.rs:2254–2274) — used for Level 3 confirmed learning / voice matching.
7. Returns `DiarizationResult{from_stems:false, source_aware:false, system/voice_dominant_ratio:0.0, degraded_capture:None}`.

### Legacy Python path (`diarize_with_pyannote`, diarize.rs:2570)
Shells `python3 -c <script>` running `pyannote/speaker-diarization-3.1`, passing the audio path as `sys.argv[1]` (never interpolated). Parses JSON segments; `speaker_embeddings` is always empty (diarize.rs:2621). `find_python` (diarize.rs:2626).

### Energy-based / stem-based diarization (no ML)
- **`StemPaths{voice, system}`** (diarize.rs:367) — per-source WAV stems written by native call capture as `{basename}.voice.wav` / `{basename}.system.wav`.
- **`SourceAwareDiarizationPlan`** (diarize.rs:373, `pub(crate)`): `FullStems(StemPaths)` | `SystemStemOnly(PathBuf)` | `SilentSystemStem(StemPaths)`.
- **`discover_stem_plan`** (diarize.rs:566) builds the plan from `stem_has_audio` on each stem: (voice✓,system✓)→FullStems; (✗,✓)→SystemStemOnly; (✓,✗ but exists)→SilentSystemStem; (✓,✗ missing) or (✗,✗)→None. **`discover_stems`** (diarize.rs:622) is the public helper returning Some only for FullStems.
- **`stem_has_audio`** (diarize.rs:380) opens the WAV (hound), scans the **whole file** in 1s RMS windows, early-returns true on first window > `STEM_PROBE_RMS_FLOOR=0.001` (diarize.rs:115). Whole-file scan (not fixed opening probe) is deliberate (#280: AEC/far-field speakerphones open quiet). Probe core: `probe_stem_samples` (diarize.rs:446).
- **`stem_probe_observed_signal`** / `probe_stem_observed_signal` (diarize.rs:409, 506) produce an `ObservedSignal{frames_captured, max_rms, avg_rms}` over the first `STEM_PROBE_SECS=5` seconds.
- **Energy diarization core**: `compute_energy_windows` (diarize.rs:631) → per-window (start,rms); `read_stem_energy_windows` (diarize.rs:680); `diarization_from_energy_windows` (diarize.rs:884) — `silence_threshold=0.005`; labels `SPEAKER_0`=voice/you, `SPEAKER_1`=system/remote per window by which stem is louder. If stems strongly correlate (`correlation_coefficient` ≥ `config.diarization.stem_correlation_threshold`, diarize.rs:691/933) over ≥3 active windows, collapses to one speaker (self-echo/bleed; raise threshold to 1.0 to disable — open-speaker-mic case #157). `collapse_to_single_speaker_segments` (diarize.rs:734), `merge_or_push_segment` (diarize.rs:719), `maybe_relabel_single_call_speaker_to_voice` (diarize.rs:759).
- **`stem_dominant_ratios`** (diarize.rs:792) → `(system_dominant_ratio, voice_dominant_ratio)`; **`active_ratio(values, threshold)`** (diarize.rs:830) → fraction of windows above floor; **`observed_signal`** (diarize.rs:841).
- **`FailureKind`** (diarize.rs:73, kebab-case serde): `Silent, Sparse, Missing, BackendUnavailable, StreamError, SourceStarved, UnsupportedFormat, MisconfiguredRoute, PermissionDenied, RouteUnavailable, Other{code}`. **`CaptureSource`** (diarize.rs:89): `Voice, System, Both, Backend`.
- **`DegradedCapture`** (diarize.rs:62): `{failure_kind, capture_backend, capture_source, voice_active_ratio, system_active_ratio, observed_signal, diagnostic_confidence}`. Built by `stem_degraded_capture_evidence` (diarize.rs:857: Silent if max_rms≤floor, Sparse if active/dominant ratio <0.02), `fallback_degraded_capture_from_result` (diarize.rs:1473), `silent_system_stem_degraded_capture` (diarize.rs:1499).
- **Public stem entry**: `diarize_from_stems(stems, config) -> Option<DiarizationResult>` (diarize.rs:1031). Internal orchestration: `diarize_from_source_aware_stems` (diarize.rs:1306) runs stem energy first, then opportunistically runs ML on the **system stem only** (`run_diarization_engine(&stems.system,...)`), remaps remote labels starting at 2 (`remap_diarization_labels`, diarize.rs:1148), and merges via `merge_remote_diarization_into_stem_result` (diarize.rs:1199) — preserving local `SPEAKER_0` ownership while splitting remote participants. Guards: `has_meaningful_remote_structure` / `has_meaningful_system_stem_labels` (diarize.rs:1298/1302, via `meaningful_speaker_count_excluding` diarize.rs:1276, ≥0.5s/speaker).
- **Degraded-capture recovery path** (PrimaryMeeting only): `degraded_capture_for_primary_result` (diarize.rs:1531), `degraded_capture_for_silent_system_stem` (diarize.rs:1511), `dominant_ratio_degraded` (diarize.rs:1493: from_stems && system_dominant<0.10 && voice>system), `has_sustained_remote_speech` (diarize.rs:1449, via `system_dominant_runs`/`RemoteSpeechRun` diarize.rs:1400/1412), `should_attempt_degraded_ml_fallback` (diarize.rs:1559, requires duration > `DEGRADED_ML_FALLBACK_MIN_DURATION_SECS=120`), and `degraded_voice_stem_ml_fallback[_with_runner]` (diarize.rs:1571/1612) which re-runs ML on the **voice stem**, requires ≥2 speakers, then sets `from_stems=false, source_aware=false, degraded_capture=Some(reason)` (low-confidence recovery). Duration probe: `audio_duration_secs` (diarize.rs:328). Guard min: `PRIMARY_DEGRADED_MIN_DURATION_SECS=60` (diarize.rs:116).

## 2. Attribution Confidence System

- **`Confidence`** (diarize.rs:122, serde lowercase): `High, Medium, Low`.
- **`AttributionSource`** (diarize.rs:131): `Deterministic, Llm, Enrollment, Manual, MlBleedDegraded` (serde `ml-bleed-degraded`), `StemRecovery` (serde `stem-recovery`).
- **`SpeakerAttribution`** (diarize.rs:145): `{speaker_label, name, confidence: Confidence, source: AttributionSource}`. Serialized into YAML frontmatter `speaker_map` (markdown.rs:286).

### L0/L1/L2/L3 levels (implemented in pipeline.rs, `attribute_meeting_speakers`, pipeline.rs:1066)
- **L2 (voice enrollment) runs first**: `match_speakers_by_voice` (pipeline.rs:~318) matches `diarization_embeddings` against `voices.db` profiles via `crate::voice::match_embedding`; emits `Confidence::High` + `AttributionSource::Enrollment`, logged "Level 2: voice enrollment match" (pipeline.rs:359–366). Results pushed into `speaker_map` (pipeline.rs:1090).
- **L0 (deterministic 1-on-1)**: fires only when trusted_attendees==2, diarization_num_speakers==2, two transcript labels, and no L2 labels yet (pipeline.rs:1098–1130). Maps both speakers to `Confidence::Medium` + `Deterministic`, logged "Level 0: deterministic 1-on-1 speaker attribution". Also `single_stem_speaker_self_attribution` (pipeline.rs:~939) self-attributes the local speaker from source-backed `SPEAKER_0`: High+Enrollment if voice-stem matches self, else Medium+Deterministic.
- **L1 (LLM suggestions)**: only if unmapped `SPEAKER_*` labels remain (pipeline.rs:1158–1181); calls `summarize::map_speakers(...)` over the merged `llm_attendees` list. These are capped at Medium confidence (per architecture; only unmapped labels are added). 
- **L3 (confirmed learning)**: the count-weighted `speaker_embeddings` from native diarization feed `voices.db` enrollment so future meetings match at L2; manual confirmations carry `AttributionSource::Manual`. Overlay merging in `overlays.rs` (`speaker_map: &mut Vec<SpeakerAttribution>`, overlays.rs:217) and `graph.rs:speaker_map_with_overlays` (graph.rs:731) combine markdown `speaker_map` with confirmed overlays.
- **Degraded marking**: `mark_degraded_ml_attributions` (pipeline.rs:485) rewrites every attribution to `Confidence::Low` + `MlBleedDegraded` when `degraded_ml_fallback` is set.

### The High-confidence rewrite rule
`apply_confirmed_names(transcript, attributions)` (diarize.rs:188) builds a map from **only `confidence == Confidence::High`** attributions and rewrites transcript lines, replacing the bracket label with the real name; skips non-lexical event lines (`is_non_lexical_event_text`, diarize.rs:231). In pipeline.rs it is invoked only if the map contains any High attribution (pipeline.rs:1190–1195). Medium/Low attributions are stored in `speaker_map` (frontmatter) but never rewrite the visible transcript — "wrong names are worse than anonymous."

## 3. speaker_map: mapping & rendering

- The canonical `speaker_map: Vec<SpeakerAttribution>` lives in YAML frontmatter (`markdown.rs:286`, omitted when empty per markdown.rs:1404 test). Built by `attribute_meeting_speakers` (pipeline.rs:1066) and returned in `AttributionProcessingResult.speaker_map` (pipeline.rs:1207/1223). Consumed downstream to normalize attendees/action items (`normalize_attendees_with_speaker_map`, `normalize_action_items_with_speaker_map`, pipeline.rs:1876–1878).
- **Transcript label rendering**: `apply_speakers(transcript, &DiarizationResult)` (diarize.rs:1774) turns timestamp-only lines `[0:00] text` into speaker-labeled lines `[SPEAKER_0 0:00] text`. It sorts segments, parses timestamps (`parse_timestamp`, diarize.rs:1973), matches each line to a speaker via `find_speaker` (diarize.rs:1941), and renders `"[{speaker} {ts}] {text}"` (diarize.rs:1886). `find_speaker` uses binary search (`partition_point`) for containment, then a gap fallback preferring the *next* speaker — tolerance is **2.0s when `from_stems`, else 0.5s** (diarize.rs:1950) — else `"UNKNOWN"`. Two repair heuristics: leading-UNKNOWN inherits the next attributed speaker (diarize.rs:1832), and all-UNKNOWN clips inherit the dominant speaker if it holds ≥60% duration (`dominant_speaker_label`, diarize.rs:1906).
- **Real-name rewrite**: `apply_confirmed_names` (diarize.rs:188) — High-confidence only (section 2). The pipeline calls `apply_speakers` first (pipeline.rs:1711), then `apply_confirmed_names` after attribution (pipeline.rs:1194).

## 4. Types consumed by pipeline.rs

- **`DiarizationResult`** (diarize.rs:27, `Default` at 47): fields `segments: Vec<SpeakerSegment>` (`{speaker,start,end}`, diarize.rs:20), `num_speakers: usize`, `system_dominant_ratio: f32`, `voice_dominant_ratio: f32`, `degraded_capture: Option<DegradedCapture>`, `from_stems: bool`, `source_aware: bool`, `speaker_embeddings: HashMap<String, Vec<f32>>`.
  - pipeline.rs:1688–1711 consumes a `DiarizationOutcome`: on `Result`, sets `diarization_num_speakers = result.num_speakers` and **`diarization_from_stems = result.source_aware`** (note: pipeline's `diarization_from_stems` flag is sourced from `source_aware`, not the `from_stems` field, pipeline.rs:1692); pulls `degraded_capture` (pipeline.rs:1695) and `speaker_embeddings` (pipeline.rs:1699); applies labels via `apply_speakers` (pipeline.rs:1711). `Skipped{reason}` records degraded_capture (pipeline.rs:1714); `NotConfigured` leaves transcript unlabeled (pipeline.rs:1728).
  - `is_degraded_ml_fallback_result` (pipeline.rs:445) = `degraded_capture.is_some() && !from_stems && !source_aware`.
- **`DiagnosticConfidence`** (diarize.rs:105, serde lowercase): `High, Inferred`. Field of `DegradedCapture`; energy/stem-derived evidence is always tagged `Inferred` (diarize.rs:880, 1489, 1507).
- **`DegradedCapture`/`FailureKind`/`CaptureSource`/`ObservedSignal`** flow into `markdown::RecordingHealth::from_degraded_capture(reason, DiarizationPath::MlBleedDegraded)` (pipeline.rs:449) and merged via `merge_recording_health` (pipeline.rs:456) for frontmatter health reporting.
- Debug surface: `SpeakerAttributionDebug` + `debug_speaker_map` (pipeline.rs:243/433) serialize confidence/source via `confidence_label` (pipeline.rs:376) and `attribution_source_label` (pipeline.rs:384), emitted as `final_speaker_map` JSON (pipeline.rs:839).

### Key constants
`STEM_PROBE_SECS=5`, `STEM_PROBE_RMS_FLOOR=0.001`, `PRIMARY_DEGRADED_MIN_DURATION_SECS=60.0`, `DEGRADED_ML_FALLBACK_MIN_DURATION_SECS=120.0` (diarize.rs:114–117); energy `silence_threshold=0.005` (diarize.rs:892); find_speaker tolerances 2.0s (stems)/0.5s (diarize.rs:1950); meaningful-speaker duration floor 0.5s (diarize.rs:1294); dominant-speaker majority 0.6 (diarize.rs:1924).

### tool_result · 2026-06-21 06:16:13 [sidechain] [sub: agent-af6b401b62faee5c9]

```
I now have everything needed. Here is the dense structured report.

---

# diarize.rs — Speaker Diarization & Attribution Report

File: `/Users/rymalia/projects/minutes/crates/core/src/diarize.rs` (4059 lines; lines 2799–4059 are unit tests). Lines 1–2798 contain all types/logic. Pipeline consumer: `/Users/rymalia/projects/minutes/crates/core/src/pipeline.rs`.

## 1. How Speaker Diarization Works… [+15278 chars]
```

### tool_result · 2026-06-21 06:16:13 [sidechain] [sub: agent-af6b401b62faee5c9]

```
agentId: ae94c49b0a74bac9c (use SendMessage with to: 'ae94c49b0a74bac9c' to continue this agent)
<usage>subagent_tokens: 97143
tool_uses: 8
duration_ms: 102959</usage>
```

### assistant · 2026-06-21 06:16:14 [sidechain] [sub: agent-af9aff2d5e9fd57ac]

I have everything needed. Let me write the report.

---

# Minutes MCP Server + SDK — Analysis Report

The MCP server (`crates/mcp/`) is the third consumer of `minutes-core`, but unlike the CLI and Tauri app it is **TypeScript and does not link the Rust engine**. It is a thin coordination layer that either (a) shells out to the `minutes` CLI binary via `execFile`, or (b) reads meeting markdown directly through the pure-TS `minutes-sdk` reader. Files: `crates/mcp/src/index.ts` (3587 lines, the whole server), `crates/sdk/src/reader.ts` (816 lines, the parser).

## 1. Tools and Resources, grouped by data source

There are **31 tools** registered. Three registration helpers exist (`index.ts:291` `registerTool`, `:307` `registerDocsAppTool` for tools wired to the dashboard UI via `_meta.ui.resourceUri`). Five tools are **conditionally registered** behind capability gates (see §2).

**Recording control (CLI shell-out + file-IPC delegation)**
- `start_recording` (`:1351`) — `minutes status`, `minutes preflight-record --json`, then either delegates to desktop app (file IPC) or `spawn(minutes record)`. See §4.
- `stop_recording` (`:1549`) — `minutes stop`; then enriches output by reading frontmatter via `reader.getMeeting()` (`:1588`) — **both CLI + SDK**.
- `get_status` (`:1627`) — `minutes status`.
- `list_processing_jobs` (`:1650`) — `minutes jobs --json`.

**Dictation / live transcript (CLI spawn + PID-file kill)**
- `start_dictation` (`:2925`) — `spawn(minutes dictate)`.
- `stop_dictation` (`:2991`) — **no CLI**; reads `~/.minutes/dictation.pid` and `process.kill(pid, SIGTERM)`.
- `start_live_transcript` (`:3257`) — `minutes status`, `minutes transcript --status`, then `spawn(minutes live)`.
- `read_live_transcript` (`:3334`) — `minutes transcript --format json [--since|--status]`.

**Browse / search (SDK fallback + CLI + optional QMD)**
- `list_meetings` (`:1698`) — CLI `minutes list` + a parallel intents search; **falls back to `reader.listMeetings` + `reader.findOpenActions`** when CLI absent.
- `search_meetings` (`:1778`) — three-tier: tries **QMD semantic search** (`searchViaQmd`, `:384`), else CLI `minutes search`, else **`reader.searchMeetings`**. Intent/owner/since filters force CLI-only (`:1838`).
- `get_meeting` (`:2337`) — reads raw markdown directly + `reader.parseFrontmatter`, then asks CLI `minutes get <path> --json` to layer overlay/`speaker_map` enrichment (`:2377`). **Both, CLI is the overlay authority.**
- `research_topic` (`:2236`) — `minutes research`; SDK `reader.searchMeetings` fallback.
- `process_audio` (`:2421`) — `minutes process` (path validated to inbox/meetings/Downloads).
- `add_note` (`:2470`) — `minutes note`.

**Knowledge graph / relationships (CLI graph index)**
- `get_person_profile` (`:2136`) — `minutes people --json` then legacy `minutes person`; SDK `reader.getPersonProfile` fallback.
- `track_commitments` (`:2624`) — `minutes commitments --json`.
- `relationship_map` (`:2689`) — `minutes people --json --limit`.
- `consistency_report` (`:2057`) — `minutes consistency`.
- `get_meeting_insights` (`:3203`) — `minutes insights`.

**Desktop context / "rewind" (capability-gated, CLI-only)** — all three call `minutes context …`:
- `activity_summary` (`:1908`, gated `activity_summary`), `search_context` (`:1961`, gated `search_context`), `get_moment` (`:2006`, gated `get_moment`).

**Agent annotations (CLI events log)**
- `add_agent_annotation` (`:3095`) — `minutes agent-annotate` (rejected unless `agent_id` in `~/.minutes/agents.allow`).
- `get_agent_annotations` (`:3172`) — `minutes events --event-type agent.annotation`.

**Speaker attribution (CLI overlay store)**
- `list_voices` (`:3025`) — `minutes voices --json`.
- `confirm_speaker` (`:3057`) — `minutes confirm … [--save-voice]` (writes `~/.minutes/overlays.db`, raw markdown immutable).

**Knowledge base ingestion (CLI)**
- `ingest_meeting` (`:3373`) — `minutes ingest`.
- `knowledge_status` (`:3419`) — `minutes paths --json` + parses `config.toml` `[knowledge]` (`parseKnowledgeConfig`, `:535`) + counts files directly.

**QMD integration (CLI)**
- `qmd_collection_status` (`:2510`) — `minutes qmd status`.
- `register_qmd_collection` (`:2576`) — `minutes qmd register`.

**Dashboard launch**
- `open_dashboard` (`:3496`) — checks `~/.minutes/dashboard.pid`, else `spawn(minutes dashboard, {detached:true})` → local HTTP server on `localhost:3141`. (This is the *Rust* web dashboard, distinct from the MCP App UI in §5.)

**7 Resources** (`server.resource`):
1. `recent_meetings` `minutes://meetings/recent` (`:2752`) — `minutes list` / SDK fallback
2. `recording_status` `minutes://status` (`:2767`) — `minutes status`
3. `open_actions` `minutes://actions/open` (`:2780`) — `minutes search --intents-only` / `reader.findOpenActions`
4. `recent_events` `minutes://events/recent` (`:2794`) — `minutes events --limit 20`
5. `agent_annotations` `minutes://events/agent-annotations` (`:2807`) — `minutes events --event-type agent.annotation`
6. `meeting` template `minutes://meetings/{slug}` (`:2846`) — `minutes resolve <slug>` / SDK filename match
7. `recent-ideas` `minutes://ideas/recent` (`:2875`) — **SDK-only** `reader.listMeetings` filtered to memos, last 14 days

Plus a UI resource `ui://minutes/dashboard` (`:1331`) and a **conditionally-registered** subscribable live-events resource pair `minutes://events/live` + `…/live{?since_seq,limit}` (`:2820`, gated on `events_since_seq`) backed by `minutes events --since-seq`.

## 2. Coordination mechanism (CLI/core ↔ MCP) — the critical contract

**Binary location** (`findMinutesBinary`, `:478`): probes in order — repo `target/release` & `target/debug` (for dev), `~/.cargo/bin`, `~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, then bare `"minutes"` (PATH fallback). Stored in mutable `MINUTES_BIN` (`:504`). Because Claude Desktop's spawned PATH is restricted, all CLI invocations go through `augmentedEnv()` (`:919`) which prepends those same dirs to `PATH`.

**Feature detection** (`capabilities.ts`): at module load (synchronously, before tool registration) `probeCapabilitiesSync(MINUTES_BIN)` runs `minutes capabilities --json` with a 2s timeout (`capabilities.ts:55`). It returns a discriminated union:
- `report` — parsed `{version, api_version, features:{name→bool}}`. `parseCapabilityReport` (`:98`) validates shape, **rejects `api_version > MAX_SUPPORTED_API_VERSION` (=1)** so a future CLI schema can't silently enable tools, and **strips prototype-pollution keys** into a null-prototype map (`:132`).
- `missing-cli` (ENOENT) vs `unsupported-cli` (binary exists but probe failed).

`hasFeature(probe, name)` (`:159`) is the gate: `missing-cli → true` (keep tools visible so first-run `npx` auto-install can light them up without restart), `unsupported-cli → false` (fail-closed — an old installed CLI hides tools whose subcommands it lacks), `report → features[name] === true`.

**Conditionally-registered surfaces:** `activity_summary` (`:1908`), `search_context` (`:1961`), `get_moment` (`:2006`) — each `if (hasFeature(...)) registerDocsAppTool(...)`. And the live-events resource + subscription handlers (`:2820`) gated on `LIVE_EVENTS_SUPPORTED = hasFeature(CLI_CAPABILITIES, "events_since_seq")` (`:525`).

**Two separate runtime checks (don't confuse them):**
- `CLI_CAPABILITIES` — *static, boot-time* feature gate decides which tools are *registered*.
- `isCliAvailable()` (`:730`) — *runtime, cached 5 min* — every handler calls `await isCliAvailable()` to decide CLI-vs-SDK-fallback or to print `CLI_INSTALL_MSG`. On miss it triggers `tryAutoInstall()` (`:582`): GitHub release binary w/ SHA256 verification (`autoInstall.ts` `downloadReleaseBinaryWithChecksum`) → Homebrew tap → `cargo install minutes-cli`. After CLI is found it fires `checkCliVersion()` (same-major semver compat via `version.ts`, not strict equality — issue #183) and `ensureWhisperModel()` (`minutes health --json`, else `minutes setup --model tiny`).

**Effective meetings dir** (`getEffectiveMeetingsDir`, `:1303`): asks CLI `minutes paths --json` for `output_dir` (so MCP and CLI agree on where meetings live), falling back to the `MEETINGS_DIR` env/default. All path inputs are sandbox-validated by `paths.ts` (`validatePathInDirectory` / `validatePathInDirectories`, realpath + prefix-attack guard).

## 3. reader.ts — the shared parser

Pure TypeScript, **zero Rust/native deps** (only `yaml` + node `fs`). Mirrors the Rust `minutes-reader` crate. It parses:
- **Frontmatter** (`parseFrontmatter`, `:272`): `splitFrontmatter` then `yaml.parse`, coercing into a strongly-typed `Frontmatter` (`:103`) — title/type/date/duration, tags, attendees (+`attendees_raw` parsed via `parseRawAttendees`), people, `action_items[]`, `decisions[]`, `intents[]`, `speaker_map[]` (`SpeakerAttribution` with confidence + `AttributionSource`), and `recording_health` (capture warnings, diarization path).
- **Query API**: `listMeetings`, `searchMeetings` (`.includes()`, no regex — crash-safe), `getMeeting`, `findOpenActions`, `findDecisions`, `getPersonProfile`, `listVoiceMemos`.
- **Overlay/speaker logic** (the load-bearing parity with Rust): `applySpeakerOverlays` (`:484`) layers `SpeakerConfirmation`s over `speaker_map` as high/manual without mutating markdown; `humanizeTranscript` (`:537`) rewrites `[SPEAKER_N …]` line prefixes to names **only for `confidence: "high"`** and skips event-tag lines (`[laughter]`) — explicitly "mirrors the Rust `apply_confirmed_names` helper." `getMeetingWithOverlays` (`:597`) shells to `minutes get --json --compact-json` to read `~/.minutes/overlays.db` server-side.

**Sharing:** the reader is published as the standalone npm package **`minutes-sdk`** (`crates/sdk/`), re-exported from `crates/sdk/src/index.ts`. The MCP server consumes it as a dependency (`import * as reader from "minutes-sdk"`, `index.ts:63`). It is **not** shared with Tauri — Tauri is Rust and uses the native `minutes-reader` crate; the TS reader is the JS-world equivalent kept in deliberate parity (note the "Same functionality as the Rust crate" / "Mirrors the Rust helper" comments). It is the same package the MCP App UI and any third-party agent (LangChain, etc.) would import.

## 4. Recording control from MCP — CLI vs desktop file-IPC

`start_recording` uses **both paths, chosen at runtime** (`:1404`):
- It **delegates to the desktop app via file IPC** when `isExtensionRuntime` (running inside Claude Desktop's bundled-Node `.mcpb` extension, detected at `:457` via `MCP_EXTENSION_ID` / "Claude Extensions" in dirname) **OR** when preflight detects `intent === "call"` (the CLI can't capture system audio).
- **File IPC mechanism** (`delegateRecordingToDesktop`, `:841`): reads `~/.minutes/desktop-control/desktop-app.json` to confirm a live app (PID alive + status <10s old), writes a request JSON to `…/requests/{id}.json`, polls `…/responses/{id}.json` for up to 10s (tolerating partial writes during the Tauri tmp→rename), cleans up. This is the same `desktop_control` file-based IPC the Tauri app services.
- **Otherwise** (normal terminal-launched node): `spawn(minutes record …)` **non-detached** with `child.unref()` — critical comment at `:1499`: `detached:true` would call `setsid()`, create a new macOS audit session, and sever the inherited TCC mic grant → silent (all-zero) recordings.

`stop_recording` always goes through the CLI (`minutes stop`). The TCC/audit-session reasoning is *why* the extension can't record directly and must delegate.

## 5. The MCP App dashboard UI

`crates/mcp/ui/` — an interactive in-host dashboard (MCP Apps / SEP-1724 extension; server declares `extensions:{[EXTENSION_ID]:{}}` at `index.ts:1290`). Entry `ui/index.html` (98 lines) + `ui/src/mcp-app.ts` (945 lines) + `mcp-app.css` + bundled woff2 fonts (Geist/Instrument per DESIGN.md). It uses `@modelcontextprotocol/ext-apps` `App` for host communication and renders views: `dashboard, detail, person, people-map, report` (`mcp-app.ts:45`), with a recording banner + Stop button.

**Build:** `vite.config.mjs` uses `vite-plugin-singlefile` + `inlineDynamicImports`, `root: "ui"`, `outDir: "../dist-ui"` → produces a **single self-contained `dist-ui/index.html`** (CSS/JS/fonts all inlined). The MCP server serves that file via the `ui://minutes/dashboard` resource handler (`index.ts:1337`, reads `dist-ui/index.html`). `registerDocsAppTool` tools attach `_meta:{ui:{resourceUri: UI_RESOURCE_URI}}` so hosts render their `structuredContent` (which carries a `view` discriminator) into this UI. `npm run build` = `tsc && vite build`; `npm run build:ui` = vite only (matches CLAUDE.md guidance).

## 6. npm package relationships & npx flow

- **`minutes-sdk`** (`crates/sdk/package.json`): standalone, only `yaml` dep, `engines.node >=18`, ships `dist/`. The reusable reader.
- **`minutes-mcp`** (`crates/mcp/package.json`): `bin: {minutes-mcp: dist/index.js}`, depends on **`minutes-sdk: ^0.18.0`** (semver range, not `file:../sdk` — required for publish per CLAUDE.md), plus `@modelcontextprotocol/sdk`, `@modelcontextprotocol/ext-apps`, `yaml`, `zod`. Ships `dist/`, `dist-ui/`, `fixtures/`. An optional `@rollup/rollup-linux-x64-gnu` covers Linux CI rollup native binding.
- **Zero-install `npx minutes-mcp` flow:** the npm package contains only the JS server + SDK — **not** the Rust binary. On first tool use `isCliAvailable()` fails and `tryAutoInstall()` fetches the platform binary from `releases/latest/download/` (checksum-verified) or brew/cargo. Until that lands, read-only tools degrade to the bundled SDK reader so search/browse still work. `npx minutes-mcp --demo` (`handleDemoSetup`, `:97`) copies bundled `fixtures/demo/*.md` to `~/.minutes/demo/` and prints an MCP config snippet with `MEETINGS_DIR` pointed at the demo corpus — letting a user explore with no CLI and no audio at all.

**Version note:** all three sources are pinned `0.18.14` (both package.json files + `MCP_SERVER_VERSION` constant at `index.ts:533`) — one of the 6 version sources the release checklist requires to match.

**Key cross-cutting safety details:** every CLI call uses `execFile`/`spawn` (no shell → injection-safe, stated at `index.ts:29`); `crashTracer.ts` writes a synchronous boot trace to `~/.minutes/logs/mcp-crash.log` (issue #149 — Claude Desktop silently killing the extension); the `shouldRunMainEntry` realpath guard (`:436`) prevents disk side effects when the module is imported rather than executed.

### tool_result · 2026-06-21 06:16:14

```
I have everything needed. Let me write the report.

---

# Minutes MCP Server + SDK — Analysis Report

The MCP server (`crates/mcp/`) is the third consumer of `minutes-core`, but unlike the CLI and Tauri app it is **TypeScript and does not link the Rust engine**. It is a thin coordination layer that either (a) shells out to the `minutes` CLI binary via `execFile`, or (b) reads meeting markdown dir… [+14046 chars]
```

### tool_result · 2026-06-21 06:16:14

```
agentId: af9aff2d5e9fd57ac (use SendMessage with to: 'af9aff2d5e9fd57ac' to continue this agent)
<usage>subagent_tokens: 125193
tool_uses: 17
duration_ms: 115912</usage>
```

### assistant · 2026-06-21 06:17:08 [sidechain] [sub: agent-a93ef3858d70436f5]

I now have a complete picture of the entire streaming subsystem. Here is my report.

---

# Minutes Real-Time / Streaming Subsystem — Analysis

All file references are absolute under `/Users/rymalia/projects/minutes/crates/core/src/`. Paths on disk live under `~/.minutes/` (via `Config::minutes_dir()`).

## File map (canonical paths, `pid.rs:34-51`)
| Artifact | Path |
|---|---|
| Live JSONL | `~/.minutes/live-transcript.jsonl` |
| Live WAV (optional) | `~/.minutes/live-transcript.wav` |
| Status sidecar | `~/.minutes/live-transcript-status.json` |
| Session lock | `~/.minutes/live-transcript.pid` (flock) |
| Mic-mute sentinel | `~/.minutes/mic_mute` |
| Event log | `~/.minutes/events.jsonl` (+ `events.seq`, `events.lock`) |

---

## 1. `live_transcript::run` — the full live loop

### Entry / guards (`live_transcript.rs:568-659`)
`run(stop_flag, config, existing_context_session_id)` (whisper-gated):
- Conflict checks: refuses if recording is active (`pid::check_recording`, `:585`) or dictation is active (`:592`). Errors are also recorded against any pre-created `context_store` session via the `mark_precreated_session_failed` closure (`:573`).
- Clears stale stop sentinel (`pid::check_and_clear_sentinel`, `:600`).
- **Session exclusivity:** `pid::create_pid_guard(&lt_pid)` (`:604`) acquires the PID file with an `flock` held for the entire function lifetime (`_pid_guard`). `PidError::AlreadyRecording(pid)` maps to `LiveTranscriptError::AlreadyActive`. Dropping the guard on return cleans up the PID file. This is what makes a standalone session single-instance and lets the recording sidecar detect it (`:2140`).
- Writes a `Starting` status transition (`:619`), resolves/creates a `context_store` desktop-context session, then delegates to `run_inner`. On Ok it calls `context_store::mark_live_transcript_complete` (with line_count/duration JSON + WAV path if present); on Err, `mark_live_transcript_failed` (`:629-657`).

### Setup in `run_inner` (`:662-793`)
- **Audio stream started FIRST**, before any file truncation (`:679`), after a microphone-only permission preflight (`:671`; blocking reason → `PermissionBlocked`). This ordering avoids truncating the JSONL when mic access will fail.
- `DeviceMonitor` is `pinned` if the user set an explicit device override, else `new` (auto-reconnect) (`:684`).
- Only then `LiveTranscriptWriter::new(...)` truncates JSONL/WAV (`:691`), `mark_healthy()`, and appends a `recording.started` event with source `"live"` and capabilities `["audio.capture","live.utterance.final"]` (`:694`).
- VAD = energy `Vad::new()` (`:700` — note: standalone `run_inner` uses the simple energy VAD, NOT the Silero `RecordingSidecarVad`). `StreamingWhisper::with_partial_max_secs(language, partial_max_secs)` (`:701`).
- Engine dispatch flags resolved per build/config: `apple_live_enabled` (macOS + probe), `parakeet_live_enabled` (`live_supports_parakeet`), `parakeet_fallback_ready`. Scope warnings emitted once when engine requested but unsupported (`:738-746`).
- Parakeet **sidecar warmup** at start only when sidecar is effective-on (`:763-791`); warmup failure is advisory (does NOT disable parakeet — per-utterance code falls back sidecar→subprocess on its own).
- Utterance cap: `max_utterance_secs = config.live_transcript.max_utterance_secs.max(5)`, → `max_utterance_samples` (`:733`).

### Main loop (`:795-1101`)
Per iteration:
1. `writer.maybe_write_heartbeat()` (`:796`).
2. Stop checks: `stop_flag` (`:798`) and stop sentinel `pid::check_and_clear_sentinel()` (`:832`). Both finalize any in-progress utterance via `finalize_on_exit` then break.
3. Stream-error / device-change → reconnect: drop+restart `AudioStream`; **partial utterance is discarded** across reconnect (splicing pre/post audio would be silent corruption) — `streaming.reset()`, clear sample buffers, `utterance_samples=0` (`:865-929`). Disconnect (`RecvTimeoutError::Disconnected`) handled similarly (`:938-1000`).
4. `stream.receiver.recv_timeout(100ms)` (`:932`) — 100ms timeout keeps stop checks responsive.
5. `writer.write_audio(&chunk.samples)` — appends raw samples to the WAV regardless of VAD (`:1004`).
6. `vad.process(chunk.rms)` (`:1006`). If speaking: `was_speaking=true`, accumulate. Routing by backend (`:1012-1027`): apple → `apple_utterance_samples`; parakeet → `parakeet_utterance_samples`; else whisper → `streaming.feed(...)` (partials are computed but **intentionally discarded** in event-bus v0, `:1023-1026`).
7. Force-finalize when `utterance_samples >= max_utterance_samples` (`:1030`).
8. Silence after speech (`was_speaking && utterance_samples>0`, `:1065`) finalizes the utterance. **No silence timeout** — the loop runs until explicit stop (key difference from dictation).
- Any `finalize_live_utterance` returning `write_ok=false` (JSONL broken) breaks the loop to prevent data loss (`:1058`, `:1093`).

### `finalize_live_utterance` (`:1791-1941`, parakeet build)
Engine cascade with permanent per-session downgrade on failure:
- apple-speech → on error sets `apple_live_enabled=false`, emits fallback warning, then `resolve_apple_speech_live_fallback` → parakeet → whisper.
- parakeet → on error sets `parakeet_live_enabled=false`, falls to whisper.
- whisper path: `streaming.finalize(ctx)` then `writer.write_utterance(...)`, always `streaming.reset()`.
Each successful branch calls `writer.write_utterance(text, duration_secs)` and clears its sample buffer. A non-parakeet build has a simpler variant (`:1985`).

### `LiveTranscriptWriter` (`:257-502`)
- `new` (`:311`): opens JSONL with `truncate(true)`, sets 0600. WAV created only if `config.live_transcript.save_wav` (16kHz/mono/16-bit `hound`), 0600; WAV creation failure is non-fatal.
- `write_utterance` (`:424`): normalizes text (`normalize_live_transcript_text`, `:504` — applies `strip_foreign_script` + `collapse_noise_markers` from the transcription_coordinator, drops short noise markers via `is_live_noise_marker`). Increments `line_count`, builds `TranscriptLine{line, ts, offset_ms, duration_ms, text, speaker:None}` (`:50-63`), `serde_json` + `writeln!` + flush. On write/flush error sets `jsonl_failed=true` and returns false (latched). After a successful write: `write_status(Healthy,...)` AND appends a `LiveUtteranceFinal` event (`:461-470`) — this is the agent-reactive hook.
- `write_audio` (`:475`): converts f32→i16, appends to WAV; latches `wav_failed` on error (non-fatal).
- `finalize` (`:492`): `mark_stopped()`, finalize WAV, return `(line_count, duration, jsonl_path)`.

### Status sidecar (`LiveStatus`, `:284-304`; `write_live_status`, `:2508`)
Written atomically (write `.json.tmp` then rename, `:2510-2514`). States: `Starting | Healthy | Failed | Stopped` (kebab-case). Heartbeat every `SIDECAR_HEARTBEAT_INTERVAL = 1s` (`:306`); staleness threshold 3s, startup timeout 10s (`:307-308`). Carries `line_count`, `last_offset_ms`, `last_duration_ms`, optional `session_id`, `diagnostic`, and (sidecar only) `pending_utterances`/`dropped_utterances`. The sidecar lets readers get status without reparsing the JSONL.

### Delta reads (`:2358-2415`)
- `read_since_line(since_line)` → `read_since_line_from_path` (`:2363`): streams the JSONL line-by-line, skips empty/invalid-UTF-8/malformed lines (crash-tolerant), returns `TranscriptLine`s with `line > since_line`. This is the **line-cursor** delta.
- `read_since_duration(duration_ms)` (`:2400`): reads all, filters by **wall-clock** `ts >= now - duration` (not transcript offset).
- `session_status()` (`:2421`) → `derive_session_status` (`:2437`): detects standalone (via `pid::inspect_pid_file` — uses `inspect` not `check` so a Windows mandatory-locked PID held by the same reader process is still seen as active, issue #258) OR recording-sidecar (recording active + sidecar status fresh). Liveness is NOT gated on heartbeat freshness for standalone (a long utterance/model load can stall the inline heartbeat while healthy — gating would re-introduce #258 flicker, `:2445-2450`). Sidecar liveness IS gated via `evaluate_recording_sidecar_status` (`:2536`). `status_metrics` (`:2584`) prefers the sidecar file's counts, falling back to reparsing JSONL.

---

## 2. Agent-agnostic consumption of the JSONL

The transcript is a plain append-only JSONL file at a well-known path; any process reads it directly or via the CLI:
- **CLI `minutes transcript`** (`crates/cli/src/main.rs:9251-9308`): `--status` → `session_status()`; `--since <dur>` → `read_since_duration(ms)`; `--since <n>` → `read_since_line(n)`. `--format json` emits machine-readable output. Starting is `live_transcript::run` (`:9227`).
- **MCP** (`crates/mcp/src/index.ts:3334-3369`): `read_live_transcript` tool shells out to `minutes transcript --format json [--status | --since X]`. `start_live_transcript` / stop tools wrap the CLI (`:3258`). The MCP doesn't parse JSONL itself — it delegates to the CLI, so the CLI is the single source of truth for cursor semantics. Other surfaces (`index.ts:1451,1530`) nudge Claude to call `read_live_transcript` when a session is detected streaming.
- **Tauri app** (`tauri/src-tauri/src/commands.rs`, `palette_dispatch.rs`, `main.rs`): calls `minutes_core::live_transcript::*` directly in-process.
- **Any agent** (Codex/Gemini/OpenCode): can tail `~/.minutes/live-transcript.jsonl` raw, or subscribe to the event bus — every finalized line also emits a `LiveUtteranceFinal` event (see §6), so reactivity does not require polling the JSONL.

The `TranscriptSource` enum (`:67`) distinguishes `"standalone"` vs `"recording-sidecar"` so consumers know provenance.

---

## 3. `transcription_coordinator.rs` — what it coordinates

This module is the **batch + backend-status façade**, not a live loop coordinator. It:
- Wraps batch transcription dispatch: `transcribe_request` / `transcribe_path_for_content[_with_hints]` (`:203-242`) routing Meeting vs other content types into `transcribe::*`.
- Owns the **transcript-cleanup pipeline** `run_transcript_cleanup_pipeline` (`:166-201`): ordered stages DedupSegments → DedupInterleaved → StripForeignScript → CollapseNoiseMarkers → TrimTrailingNoise, each delegating to `whisper_guard::segments`, with per-stage before/after stats. `live_transcript.rs` imports two of these (`strip_foreign_script`, `collapse_noise_markers`) for per-utterance normalization (`:6`).
- Owns **Parakeet backend status / health / warmup**: `parakeet_backend_status` (`:273`), `parakeet_health_item` (`:363`), `diagnostics_snapshot` (`:401`), and `warmup_active_backend` (`:420`) — the latter is called by `live_transcript::run_inner` to warm the sidecar. Tracks a process-global "warm" set (`warmed_backends`, `:87`). `parakeet_warmup_selected` (`:415`) returns true if either `transcription.engine` or `effective_live_transcript_backend()` is parakeet.
- Users: CLI (health/diagnostics/setup), live_transcript (warmup + cleanup imports), Tauri settings/health surfaces, the batch pipeline.

---

## 4. `streaming.rs` — `AudioStream` / `MultiAudioStream` / mic-mute

- **`AudioStream`** (`:177-261`): channel-based non-blocking capture, the alternative to `record_to_wav`. `start(device_override)` builds a resampled cpal input stream via `resample::build_resampled_input_stream` (shared mono-downmix + 16kHz decimation). cpal callback accumulates into 1600-sample (100ms @16kHz) `AudioChunk`s, computes RMS, updates the atomic UI level (`STREAM_AUDIO_LEVEL`, `:59`), and `try_send`s onto a **bounded crossbeam channel of 64 chunks (~6.4s)** (`:198`). Bounded + `try_send` means oldest data is effectively dropped under backpressure — consumers want fresh audio. Each chunk carries `samples, rms, timestamp(Instant), index(monotonic per-stream), source(SourceRole)` (`:42-55`). `has_error()` reads an atomic err flag; `Drop`/`stop()` set the stop atomic.
- **`MultiAudioStream`** (`:273-361`): wraps two `AudioStream`s (voice mic + call/system audio). A merge thread (`:298`) drains both receivers every 50ms, tags chunks `SourceRole::Voice`/`Call`, and forwards onto a single bounded(128) receiver. **Mic-mute sentinel handling:** when `MIC_MUTED` is set, voice chunk samples are zeroed in place and `rms=0` (`:306-311`) so downstream timing/slot-alignment/stem writers stay intact but no voice energy reaches the transcript; **call audio is always forwarded** (`:314-319`). That is the whole point of mute — system audio keeps flowing.
- **Mic-mute** (`:78-174`): `AtomicBool MIC_MUTED` is the fast per-process check; cross-process signaling (CLI toggling a Tauri recording or vice versa) goes through the sentinel file `~/.minutes/mic_mute`. `set_mic_muted_with_sentinel` derives "previous state" from sentinel existence (not the AtomicBool) so short-lived CLI subcommands emit correct `MicMuted`/`MicUnmuted` events (`:112-134`). `refresh_mic_mute_from_sentinel` (`:161`) is called once per record-loop iteration to sync. `clear_mic_mute_for_new_recording` (`:168`) resets at every new recording so state never leaks between sessions.

---

## 5. `streaming_whisper.rs` — progressive whisper

`StreamingWhisper` (`:65-238`) does **full re-transcription on each pass** (not incremental): the whole accumulated buffer is re-run from t=0 so whisper keeps full context; each pass replaces the previous partial.
- `feed(samples, ctx)` (`:123`): appends to `audio_buffer`. Runs a partial only when `samples_since_partial >= PARTIAL_INTERVAL_SAMPLES` (2s) AND buffer `>= MIN_TRANSCRIBE_SAMPLES` (1s). Skips partials entirely once buffer exceeds `partial_max_samples` (default 30s, `DEFAULT_PARTIAL_MAX_SECS`) to avoid O(buffer_len) CPU runaway — finalize still works.
- `finalize(ctx)` (`:149`): one last transcribe with `is_final=true`. `reset()` clears the buffer (keeps the model loaded across utterances). `transcribe` (`:169`) creates a fresh whisper state per pass, uses `streaming_whisper_params()`, suppresses noisy C-stderr on subsequent state creations (`suppress_stderr`, `:241`), dedups identical partials, returns `StreamingResult{text, is_final, duration_secs}`.
- `transcribe_with_whisper_for_live_sidecar` (`live_transcript.rs:1509`) reuses `StreamingWhisper` as a pure batch path: feeds in 1600-sample chunks with a 1s partial cap (partials suppressed) and returns only `finalize()`.

`StreamingWhisper` is used by: standalone live whisper path, dictation whisper path, and the sidecar/apple/parakeet fallback batch path.

---

## 6. `events.rs` — append-only JSONL event log

- **Location/format:** `~/.minutes/events.jsonl`, one `EventEnvelope` per line: `{v, seq, timestamp, ...event}` where the event is `#[serde(tag="event_type")]`-flattened (`:237-257`). `EVENT_SCHEMA_VERSION = 1`. Rotates to `events.<ts>.jsonl` when the active file exceeds 10MB (`MAX_EVENT_FILE_BYTES`, `rotated_events_path_for`, `:440`). 0600 perms on create.
- **Event types** (`MinutesEvent`, `:261-368`): `recording.started`, `recording.completed`, `AudioProcessed`, `WatchProcessed`, `NoteAdded`, `sensitive.marker`, `VaultSynced`, `VoiceMemoProcessed`, `DeviceChanged`, `meeting.insight.detected` (carries `MeetingInsight`), `KnowledgeUpdated`, `MicMuted`/`MicUnmuted`, **`live.utterance.final`** (`session_id, source, transcript_path, line, text, speaker, offset_ms, duration_ms` — emitted by `write_utterance`), and **`agent.annotation`**.
- **Append API:** `append_event` (best-effort, never fails the caller, `:460`); `append_event_strict` (surfaces IO error — used where the event IS the contract, e.g. sensitive markers, `:474`). `append_event_inner` (`:622`) holds an exclusive `flock` on `events.lock` (`with_event_log_lock`, `:413`), assigns `seq` if zero, rotates if needed, appends + flushes, then updates the `events.seq` sidecar.
- **Sequence numbers:** monotonic `seq` assigned under lock via `next_event_seq_inner` = `latest_event_seq_inner()+1` (`:742`). `latest_event_seq_inner` (`:732`) prefers the `events.seq` sidecar, `max`'d against a bounded tail scan of the active log (64KB chunk, `EVENT_SEQ_TAIL_CHUNK_BYTES`) to recover cleanly from crash windows; falls back to a full legacy scan only if the sidecar is missing/corrupt. Sidecar is written atomically (tmp + rename, `:773-799`).
- **Read API for reactivity:** `read_events(since: DateTime, limit)` (`:664`) and crucially `read_events_since_seq(since_seq, limit)` (`:675`) + `latest_event_seq()` (`:686`) — the stable cursor that lets agents poll "what's new since I last looked" without timestamp ambiguity. This is how external systems (and MCP notifications) subscribe to new meetings/insights/utterances.
- **Agent-annotation allowlist** (`:102-167`, `:386`, `:479-620`): `agent.annotation` events are append-only agent commentary that never mutates human notes. `append_agent_annotation` (`:479`) validates the request (`validate_agent_annotation_request`, `:525` — agent_id non-empty and free of `: , ` and control chars; subkind/body required; confidence ∈ {low,medium,high,tentative,inferred,strong,explicit}; span end≥start) then gates on the allowlist file `~/.minutes/agents.allow`. Format (`parse_agents_allowlist_line`, `:602`): `agent_id` or `agent_id:scope1,scope2`; `#` comments and blank lines ignored; empty scope list = allow all event types, otherwise the event_type must be in the scope list (`parse_agents_allowlist_allows`, `:584`). Errors are typed (`AgentAnnotationError`, `:154`) with structured `to_body()` JSON for surfacing to the requesting agent. The annotation confidence model mirrors the insight `InsightConfidence` L0–L3 system (`:41-62`), where only Strong/Explicit are `is_actionable()`.

---

## Key cross-cutting design facts
- **Two live paths share one writer/loop shape:** standalone (`run_inner`, AudioStream + energy `Vad`) and recording-sidecar (`run_sidecar_inner_mpsc`, `:2131`, fed samples over a stdlib `mpsc` from the capture callback, uses the richer `RecordingSidecarVad` with Silero/ort-Silero/energy fallback). The sidecar does NOT write its own WAV (recording WAV is canonical) and runs transcription on a **dedicated worker thread** behind a bounded `sync_channel(SIDECAR_UTTERANCE_QUEUE_CAP=3)` — a slow engine drops the newest utterance (counted in `dropped_utterances`) rather than starving the capture channel. The sidecar skips itself if a standalone session holds the PID (`:2140`).
- **Dictation vs live differences (`dictation.rs`):** dictation HAS a silence timeout (`config.dictation.silence_timeout_ms`, ends the session, `:560-585`, emits `SilenceCountdown` events), yields to recording if recording starts (`:410`), caches/reuses the whisper model across sessions (`take_cached_model`/`return_model_to_cache`, `:118-590`), and writes outputs to **clipboard + dictation file + daily note** (`write_result_outputs`/`finish_session`, `:876-916`; `append_dictation_to_daily_note`, `:1159`) rather than a streaming JSONL. It accumulates per-utterance `DictationResult`s and can combine them (`combine_results`, `:918`). Backend selection `dictation_final_backend` (`:596`) picks Whisper/AppleSpeech/Parakeet with whisper fallback; only Apple/Parakeet need raw `final_utterance_samples` accumulation (`needs_utterance_samples`, `:209`). It emits a `recording.started` event with source `"dictation"` (`:344`) but no per-utterance events.

### tool_result · 2026-06-21 06:17:09

```
I now have a complete picture of the entire streaming subsystem. Here is my report.

---

# Minutes Real-Time / Streaming Subsystem — Analysis

All file references are absolute under `/Users/rymalia/projects/minutes/crates/core/src/`. Paths on disk live under `~/.minutes/` (via `Config::minutes_dir()`).

## File map (canonical paths, `pid.rs:34-51`)
| Artifact | Path |
|---|---|
| Live JSONL | `~/… [+18812 chars]
```

### tool_result · 2026-06-21 06:17:09

```
agentId: a93ef3858d70436f5 (use SendMessage with to: 'a93ef3858d70436f5' to continue this agent)
<usage>subagent_tokens: 133145
tool_uses: 20
duration_ms: 179879</usage>
```

### tool_result · 2026-06-21 06:29:01 [sidechain] [sub: agent-a528c57e498649c7a]

```
pipeline.rs
parakeet_sidecar.rs
autoresearch.rs
silero_vad.rs
silero_smoothing.rs
capture.rs
dictation.rs
knowledge_extract.rs
transcribe.rs
summarize.rs
desktop_control.rs
live_transcript.rs
daily_notes.rs
jobs.rs
palette.rs
search.rs
config.rs
notes.rs
sensitive.rs
diarize.rs
markdown.rs
graph.rs
events.rs
watch.rs
---INTENT DEFS---
knowledge_extract.rs:111:    // Extract from intents
knowledge_… [+2620 chars]
```

### assistant · 2026-06-21 06:29:07 [sidechain] [sub: agent-a528c57e498649c7a]

The typed structs and intent extraction live in markdown.rs and pipeline.rs (outside the two requested files, but directly relevant to the structured-extraction question). Let me capture the exact definitions and the `extract_intents`/`extract_action_items` functions.

### assistant · 2026-06-21 06:29:08 [sidechain] [sub: agent-a528c57e498649c7a]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/markdown.rs')`

### tool_result · 2026-06-21 06:29:09 [sidechain] [sub: agent-a528c57e498649c7a]

```
470	}
471	
472	/// A structured action item extracted from a meeting.
473	/// Queryable via MCP tools: filter by assignee, status, due date.
474	#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
475	pub struct ActionItem {
476	    pub assignee: String,
477	    pub task: String,
478	    #[serde(skip_serializing_if = "Option::is_none")]
479	    pub due: Option<String>,
480	    pub status:… [+1946 chars]
```

### assistant · 2026-06-21 06:29:09 [sidechain] [sub: agent-a528c57e498649c7a]

- **→** `Bash(command='cd /Users/rymalia/projects/minutes/crates/core/src && rg -n "fn extract_intents|fn extract_action_it… [+75 chars]', description='Find extraction function definitions in pipeline.rs')`

### tool_result · 2026-06-21 06:29:10 [sidechain] [sub: agent-a528c57e498649c7a]

```
3751:fn normalize_intents_with_speaker_map(
3932:fn extract_action_items(summary: &summarize::Summary) -> Vec<markdown::ActionItem> {
3965:fn extract_decisions(summary: &summarize::Summary) -> Vec<markdown::Decision> {
3993:fn extract_intents(summary: &summarize::Summary) -> Vec<markdown::Intent> {
5113:    fn extract_action_items_parses_assignee_and_task() {
5142:    fn extract_decisions_with_top… [+69 chars]
```

### assistant · 2026-06-21 06:29:12 [sidechain] [sub: agent-a528c57e498649c7a]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/pipeline.rs')`

### tool_result · 2026-06-21 06:29:12 [sidechain] [sub: agent-a528c57e498649c7a]

```
3932	fn extract_action_items(summary: &summarize::Summary) -> Vec<markdown::ActionItem> {
3933	    summary
3934	        .action_items
3935	        .iter()
3936	        .map(|item| {
3937	            let (assignee, task) = if let Some(rest) = item.strip_prefix('@') {
3938	                // "@user: Send pricing doc by Friday"
3939	                if let Some(colon_pos) = rest.find(':') {
3940… [+4055 chars]
```

### assistant · 2026-06-21 06:30:38 [sidechain] [sub: agent-a528c57e498649c7a]

I have everything needed. Here is the complete report.

---

# SUMMARIZE.rs (`crates/core/src/summarize.rs`, 3108 lines)

## 1. How summarization works

**Public entry points** (all in summarize.rs):
- `summarize(transcript, config) -> Option<Summary>` — summarize.rs:45. Thin wrapper.
- `summarize_with_screens(transcript, screen_files, config, log_file) -> Option<Summary>` — summarize.rs:51.
- `summarize_with_template(transcript, screen_files, config, template, log_file) -> Option<Summary>` — summarize.rs:63. **This is the real entry.** All others delegate here.

**Return type:** `Option<Summary>`. Returns `None` whenever summarization is disabled or fails — the pipeline always continues without a summary (graceful degradation; see summarize.rs:191 `"summarization failed, continuing without summary"`).

**`Summary` struct** — summarize.rs:24-33: `text`, `decisions: Vec<String>`, `action_items: Vec<String>`, `open_questions: Vec<String>`, `commitments: Vec<String>`, `key_points: Vec<String>`, `participants: Vec<String>`. (Note: these are raw strings; the *typed* structs come later in pipeline.rs — see section 3.)

**Engine selection** — match on `config.summarization.engine` at summarize.rs:95-133:
- `"none"` → returns `None` immediately (summarize.rs:75-91), logs outcome `"fallback"`/reason `"disabled"`. This is the Claude-via-MCP path: skip local summarization, Claude summarizes on demand.
- `"auto"` (the default per the header comment, summarize.rs:11) → `detect_agent_cli()` (summarize.rs:746) probes `claude > codex > gemini > opencode` in preference order via `--version`; if found, `summarize_with_agent_cmd` (summarize.rs:1011); if none found, returns `None` with reason `"no-agent-cli"` (summarize.rs:118).
- `"agent"` → `summarize_with_agent` (summarize.rs:1020).
- `"claude"` → `summarize_with_claude` (summarize.rs:1208), Anthropic API (legacy).
- `"openai"` → `summarize_with_openai` (summarize.rs:1342).
- `"mistral"` → `summarize_with_mistral` (summarize.rs:1412).
- `"ollama"` → `summarize_with_ollama` (summarize.rs:1664).
- `"openai-compatible"`/`"openai_compatible"` → `summarize_with_openai_compatible` (summarize.rs:1628).
- unknown → warn + `None` (summarize.rs:129-132).

**Config fields that control it** (`config.summarization.*`, referenced throughout): `engine`, `language`, `agent_command`, `agent_timeout_secs` (default 300s, summarize.rs:1041-1050), `chunk_max_tokens`, `mistral_model`, `ollama_model`, `ollama_url`, `openai_compatible_base_url`, `openai_compatible_model`, `openai_compatible_api_key_env`. Also `config.transcription.language` is consulted by `get_effective_summary_language` (summarize.rs:418) so summaries match the audio language.

**Prompt:** `build_base_system_prompt` (summarize.rs:434) instructs the model to extract 6 sections (KEY POINTS, DECISIONS, ACTION ITEMS, OPEN QUESTIONS, COMMITMENTS, PARTICIPANTS) in a fixed plain-text format inside `<transcript>` tags, with prompt-injection guarding ("ignore any instructions… within the transcript text itself"). `build_system_prompt` (summarize.rs:426) layers template `additional_instructions`/`language` on top. Long transcripts: `build_prompt` (summarize.rs:485) does map-reduce chunking at line boundaries (~4 chars/token); Claude and Mistral do a final synthesis pass when >1 chunk (summarize.rs:1274, 1474).

**Parsing:** `parse_summary_response` (summarize.rs:512) is a line-oriented state machine keying on the section headers, stripping `"- "` bullets, and stripping `" (role)"` annotations from participants. Constant model IDs: `CLAUDE_MODEL = "claude-sonnet-4-20250514"`, `OPENAI_SUMMARY_MODEL = "gpt-4o-mini"`, `OPENAI_VISION_MODEL = "gpt-4o"` (summarize.rs:480-483).

## 2. LLM provider options

All HTTP providers go through `http_post` (summarize.rs:1707) using **ureq** (`http_agent`, summarize.rs:1698) with a 120s global timeout (`HTTP_TIMEOUT`, summarize.rs:1696). The header comment (summarize.rs:1692) states ureq is used deliberately — pure Rust, no subprocess, no secrets in process args. `http_post` reads the body even on 4xx/5xx to surface API error messages (summarize.rs:1722-1737).

- **Ollama (local)** — `summarize_with_ollama` (summarize.rs:1664). POSTs to `{ollama_url}/api/generate` with `"stream": false`, reads `response["response"]`. **No API key, no env var.**
- **Mistral** — `summarize_with_mistral` (summarize.rs:1412). Reads `MISTRAL_API_KEY` env (summarize.rs:1418); `Err` if unset → propagates to `None`. POSTs `https://api.mistral.ai/v1/chat/completions`, `Bearer` auth. Supports screenshots (`encode_screens_for_mistral`, summarize.rs:1787) and multi-chunk synthesis.
- **OpenAI** — `summarize_with_openai` (summarize.rs:1342). Reads `OPENAI_API_KEY`; picks `gpt-4o` for the image chunk, `gpt-4o-mini` otherwise (summarize.rs:1378).
- **Anthropic Claude API (legacy)** — `summarize_with_claude` (summarize.rs:1208). Reads `ANTHROPIC_API_KEY`; sends multimodal content blocks to `https://api.anthropic.com/v1/messages`, version header `2023-06-01`, `max_tokens: 1024`.
- **OpenAI-compatible** — `summarize_with_openai_compatible` (summarize.rs:1628). URL normalization `openai_compatible_chat_url` (summarize.rs:1518). API key resolution `openai_compatible_api_key` (summarize.rs:1541): if the configured env-var name is empty AND the base URL is local (`openai_compatible_base_url_is_local`), runs **keyless**; otherwise falls back to `OPENAI_COMPATIBLE_DESKTOP_API_KEY_ENV`. Text-only requests use a plain-string content body for stricter local servers (summarize.rs:1587-1610).

**Agent-CLI path** — `summarize_with_agent_impl_timeout` (summarize.rs:1054). Truncates transcript to 100,000 bytes at a UTF-8 boundary (summarize.rs:1064-1073). `prepare_agent_invocation` (summarize.rs:921) maps the binary to argv:
- `claude` → `-p -` (prompt on stdin)
- `codex` → `exec - -s read-only --skip-git-repo-check` (summarize.rs:934; the git-check bypass is required because the job dir isn't a repo)
- `gemini` → `-p - --skip-trust` (summarize.rs:954)
- `opencode` → `run <instr> --file <tmpfile>` (writes a 0600 prompt file, summarize.rs:968)
- `pi` → `--no-session --no-tools … -p @<tmpfile>` (summarize.rs:983)
- anything else → prompt on stdin.

Timeout budget = `config.summarization.agent_timeout_secs` (default 300s). The worker spawns the child, drains stdout/stderr on separate threads (summarize.rs:1122-1133, prevents pipe-full deadlock on verbose CLIs), feeds stdin on its own thread, and polls `try_wait` every 500ms; on timeout it kills the child (summarize.rs:1182). File-arg agents (pi/opencode) get `Stdio::null()` stdin so they don't block on EOF (summarize.rs:1086-1093, issue #288). Output is parsed by `parse_summary_response`.

**CRITICAL — no API key behavior:** There is **no hard failure for a missing key**. The product default is `"auto"`/`"none"`:
- `"none"` → skips entirely, returns `None`. This is the **Claude-via-MCP path** — Claude summarizes conversationally on request, no key.
- `"auto"` → uses whatever agent CLI is installed via its *own* subscription auth (no API key); if no CLI, returns `None`.
- The key-requiring engines (`claude`/`openai`/`mistral`) only read env vars when explicitly selected; if the var is unset, the provider fn returns `Err("…_API_KEY not set. Export it or switch to engine = \"ollama\"")` (e.g. summarize.rs:1214, 1348, 1418), which `summarize_with_template` swallows into `None` and the pipeline proceeds without a summary. So missing key ⇒ no crash, no summary, MCP/Claude can fill in later.

## 3. Structured extraction (action items, decisions, intents) + speaker mapping

**Raw extraction** lives in summarize.rs (`parse_summary_response`, section 1). **Typed-struct conversion lives in pipeline.rs**, not summarize.rs:

- Typed structs in markdown.rs: `ActionItem { assignee, task, due: Option, status }` (markdown.rs:475), `Decision { text, topic, authority, supersedes }` (markdown.rs:494), `IntentKind { ActionItem, Decision, OpenQuestion, Commitment }` (markdown.rs:506), `Intent { kind, what, who: Option, status, by_date: Option }` (markdown.rs:514). All derive `JsonSchema` for MCP querying. `Frontmatter.intents: Vec<Intent>` (markdown.rs:262).
- `extract_action_items(&Summary) -> Vec<ActionItem>` (pipeline.rs:3932): parses `"@user: task by Friday"` strings — splits on `@`…`:` for assignee/task, `extract_due_date` (pipeline.rs:4044) regex-lite matches `" by …"`/`"(due …)"`; unassigned otherwise.
- `extract_decisions(&Summary) -> Vec<Decision>` (pipeline.rs:3965): wraps each decision string, `infer_topic` for `topic`, leaves `authority`/`supersedes` `None`.
- `extract_intents(&Summary) -> Vec<Intent>` (pipeline.rs:3993): unifies all four kinds into typed `Intent`s — action items (status `"open"`), decisions (status `"decided"`), open questions, commitments (with `parse_actor_prefix` at pipeline.rs:3982 splitting `@who: what`).
- Pipeline orchestration: `enrich`/`transcribe` paths call `extract_intents(&summary)` (pipeline.rs:1797, 2344), log an `"intent_extract"` LLM step, then `normalize_intents_with_speaker_map` (pipeline.rs:3751) rewrites `who` fields using the speaker map, and finally assign `frontmatter.intents = structured_intents` (pipeline.rs:1955). `knowledge_extract.rs:111` walks `fm.intents` to write knowledge-base facts.

**Speaker mapping (SPEAKER_X → names via LLM)** — in summarize.rs:
- `map_speakers(transcript, attendees, config, log_file) -> Vec<SpeakerAttribution>` (summarize.rs:2028). Early-returns empty if no attendees or no `SPEAKER_` markers. `extract_speaker_labels` (summarize.rs:2136) pulls unique `SPEAKER_X` from `[SPEAKER_X …]` line prefixes.
- Prompt `SPEAKER_MAPPING_PROMPT` (summarize.rs:2007) truncates transcript to first 3000 chars, asks for `SPEAKER_1 = Name` lines, `= UNKNOWN` when uncertain.
- Routing: `run_speaker_mapping_prompt` (summarize.rs:2155) for HTTP engines, `run_speaker_mapping_via_agent` (summarize.rs:2241) for the CLI path (same spawn/timeout pattern, 120s). When engine is `"none"` it still routes through the agent path (summarize.rs:2066-2070) so MCP-mode users still get speaker mapping.
- `parse_speaker_mapping` (summarize.rs:2316): splits on `=`, validates the label against known speakers and fuzzy-matches the name against attendees (substring/word-part). All matches become `SpeakerAttribution { confidence: Confidence::Medium, source: AttributionSource::Llm }` (summarize.rs:2343-2348) — i.e. **Level 1 caps at Medium confidence**, matching the L1 design rule (wrong names worse than anonymous).

---

# JOBS.rs (`crates/core/src/jobs.rs`, 2531 lines — core code ends ~1431, rest is tests)

## 4. The background job queue

**Types:**
- `enum JobState` (jobs.rs:37, kebab-case serde): `Queued, Transcribing, TranscriptOnly, Diarizing, Summarizing, Saving, NeedsReview, Complete, Failed`. `is_terminal()` (jobs.rs:52) = `NeedsReview | Complete | Failed`. `default_stage()` (jobs.rs:56) gives human-readable UI strings.
- `struct ProcessingJob` (jobs.rs:71): `id, mode: CaptureMode, content_type, title, audio_path, output_path, state, stage, created_at, started_at, finished_at, notice_dismissed_at, recording_started_at/finished_at, context_session_id, user_notes, pre_context, consent, consent_notice, calendar_event, template_slug, recording_health, word_count, error, owner_pid: Option<u32>, retry_count: u32`. (There is no separate `JobKind` enum — the "kind" is carried by `mode: CaptureMode` → `content_type: ContentType`.)
- `const MAX_AUTO_RETRIES: u32 = 2` (jobs.rs:24) — caps auto-recovery of crashed jobs (issue #229: a deterministic whisper.cpp SIGABRT used to loop forever).

**Persistence: one JSON file per job in a jobs dir (NOT JSONL, NOT sqlite).**
- `jobs_dir()` = `~/.minutes/jobs/` (jobs.rs:246). Each job at `jobs/<id>.json` (`job_path`, jobs.rs:269). Captured audio moves to `jobs/<id>.<ext>` (`job_capture_path*`, jobs.rs:278-289).
- `archive_dir()` = `jobs/archive/` (jobs.rs:261). **Terminal jobs are moved here** so the 1Hz status-poll hot path (`list_jobs_raw`, jobs.rs:567 — top-level `.json` only, skips the `archive/` subdir) never parses lifetime meeting history.
- `next_job_id()` (jobs.rs:131): `job-<YYYYMMDDHHMMSS.mmm>-<pid>-<atomic counter>`.
- `write_job`/`write_job_to` (jobs.rs:521-537): atomic temp-file-+-rename.
- `move_to_archive` (jobs.rs:739): uses `fs::hard_link` + `remove_file` (NOT rename) so a concurrent process can't silently clobber the canonical archive copy — `hard_link` returns `AlreadyExists` to detect the race. A one-shot lazy migration `migrate_terminal_jobs_to_archive` (jobs.rs:699), gated by sentinel file `.archive-initialized-v1` (jobs.rs:35, `ensure_archive_initialized` jobs.rs:663), sweeps pre-existing terminal jobs into archive on upgrade.

**Enqueue functions:**
- `queue_live_capture` (jobs.rs:152) → `queue_live_capture_with_recording_health` (jobs.rs:182): the live-recording path. Moves the in-flight WAV (+ per-source stems + screenshots) into the jobs dir via `move_capture_into_job` (jobs.rs:310), builds a `Queued` `ProcessingJob`, writes it, and on write failure rolls the audio back. Then `maybe_mark_context_session_processing` (jobs.rs:437).
- `enqueue_capture_job` (jobs.rs:392): the simpler path that takes an already-placed `audio_path` (no move).

**Drain/worker:** `process_pending_jobs(config, on_job_update)` (jobs.rs:1187):
1. Acquires `create_worker_guard()` (jobs.rs:291) — a flock PID guard at `~/.minutes/processing-worker.pid` (`worker_pid_path`, jobs.rs:265). `worker_active()` (jobs.rs:306) uses `inspect_pid_file` so a Windows mandatory-locked PID file is still detected (issue #258) — **prevents duplicate workers**.
2. Loops `while let Some(job) = next_pending_job()` (jobs.rs:954 — first `Queued`).
3. Claims the job by CAS-style `update_job_state` → `Transcribing` + `owner_pid = process::id()` (jobs.rs:1195).
4. Runs `pipeline::transcribe_to_artifact` inside `catch_unwind` (jobs.rs:1218) so a native panic (whisper.cpp FFI / parakeet) becomes a `Failed` job, not a crashed worker. On `NoSpeech` → terminal `NeedsReview` (jobs.rs:1275). Otherwise → `TranscriptOnly` (jobs.rs:1315).
5. Runs `pipeline::enrich_transcript_artifact` (summarize + diarize + graph) also under `catch_unwind` (jobs.rs:1334); a per-stage callback maps `PipelineStage → JobState` (`stage_state`, jobs.rs:1178) and fires `on_job_update`.
6. On success → terminal `Complete`/`NeedsReview` (`terminal_state_for_artifact`, jobs.rs:1048), appends `audio_processed`/`recording_completed` events, rebuilds graph index, `refresh_qmd_collection` (jobs.rs:1140 — shells `qmd update`), runs the post-record hook, and `preserve_audio_alongside_output` (jobs.rs:1059, moves the WAV next to the output `.md`).

**Crash recovery / dedup:** `list_jobs()` (jobs.rs:792) scans for non-terminal jobs whose `owner_pid` is dead (`pid::is_process_alive`), then delegates each to `update_job_state` which re-checks the fresh disk record (so it can't clobber a worker that claimed it post-snapshot). It increments `retry_count`; once `> MAX_AUTO_RETRIES` the job is demoted to `Failed` instead of re-`Queued` (jobs.rs:825-841). `requeue_job` (jobs.rs:887) resets `retry_count = 0` for a manual user retry.

**State transitions:** `update_job_state(job_id, FnOnce)` (jobs.rs:980) is the single atomic read-modify-write primitive. It loads via `load_job_with_source` (jobs.rs:551, active dir first then archive), applies the closure, and routes the write across the active/archive boundary: same-dir = atomic write; active→archive (became terminal) = write-then-hard-link-then-unlink; archive→active (requeue) = write-new-then-remove-old.

## 5. How this decouples `record` from processing

The recording command does **not** transcribe inline. On `stop`, `queue_live_capture` (jobs.rs:152) **moves** the finished WAV (plus stems and screenshots) out of the transient capture location into `~/.minutes/jobs/<id>.wav`, writes a `Queued` `<id>.json`, and **returns immediately** — the CLI/UI is free the moment the file rename + small JSON write complete. The heavy whisper/parakeet + LLM work happens later in `process_pending_jobs`, which is a *separate* worker process guarded by the `processing-worker.pid` flock so exactly one worker drains the queue at a time. Lifecycle: `Queued → Transcribing → TranscriptOnly → (Diarizing/Summarizing/Saving) → Complete | NeedsReview | Failed`. The recording session and the worker share state only through the on-disk job JSON files; UI status polling reads `list_jobs()`/`display_jobs`/`active_jobs` and `sync_processing_status` (jobs.rs:1109) mirrors the current job's stage into the PID status file. Dedup/locking: single-worker flock guard (`create_worker_guard`/`worker_active`), atomic per-job claim via `owner_pid` in `update_job_state`, and dead-owner auto-recovery capped at `MAX_AUTO_RETRIES` to prevent crash loops.

**Key file paths:** `/Users/rymalia/projects/minutes/crates/core/src/summarize.rs`, `/Users/rymalia/projects/minutes/crates/core/src/jobs.rs`, plus the structured-extraction-related `/Users/rymalia/projects/minutes/crates/core/src/pipeline.rs` (extract_* fns at 3932-4040) and `/Users/rymalia/projects/minutes/crates/core/src/markdown.rs` (typed structs at 475-522). No files were modified.

### tool_result · 2026-06-21 06:30:39 [sidechain] [sub: agent-af6b401b62faee5c9]

```
I have everything needed. Here is the complete report.

---

# SUMMARIZE.rs (`crates/core/src/summarize.rs`, 3108 lines)

## 1. How summarization works

**Public entry points** (all in summarize.rs):
- `summarize(transcript, config) -> Option<Summary>` — summarize.rs:45. Thin wrapper.
- `summarize_with_screens(transcript, screen_files, config, log_file) -> Option<Summary>` — summarize.rs:51.
- `su… [+16851 chars]
```

### tool_result · 2026-06-21 06:30:39 [sidechain] [sub: agent-af6b401b62faee5c9]

```
agentId: a528c57e498649c7a (use SendMessage with to: 'a528c57e498649c7a' to continue this agent)
<usage>subagent_tokens: 111753
tool_uses: 9
duration_ms: 963477</usage>
```

### assistant · 2026-06-21 06:30:43 [sidechain] [sub: agent-af6b401b62faee5c9]

The agents have covered transcribe, diarize, summarize, and jobs thoroughly. Now I need to locate and read the actual `process` / `process_with_template` / `transcribe_to_artifact` / `enrich_transcript_artifact` functions in pipeline.rs to nail down the end-to-end stage ordering. Let me find them.

### assistant · 2026-06-21 06:30:44 [sidechain] [sub: agent-af6b401b62faee5c9]

- **→** `Bash(command='grep -n "pub fn process\\|pub fn transcribe_to_artifact\\|pub fn enrich_transcript_artifact\\|fn proces… [+170 chars]', description='Find pipeline entry functions')`

### tool_result · 2026-06-21 06:30:45 [sidechain] [sub: agent-af6b401b62faee5c9]

```
1243:pub enum PipelineStage {
1288:pub fn process(
1298:pub fn process_with_sidecar<F>(
1320:pub fn process_with_progress<F>(
1344:pub fn process_with_template<F>(
1367:pub fn transcribe_to_artifact(
1460:pub fn write_transcript_artifact(
1656:pub fn enrich_transcript_artifact<F>(
2061:fn process_with_progress_and_sidecar<F>(
6143:    fn write_transcript_artifact_normalizes_self_name_for_title_and… [+78 chars]
```

### assistant · 2026-06-21 06:30:47 [sidechain] [sub: agent-af6b401b62faee5c9]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/pipeline.rs')`

### tool_result · 2026-06-21 06:30:48 [sidechain] [sub: agent-af6b401b62faee5c9]

```
1243	pub enum PipelineStage {
1244	    Transcribing,
1245	    Diarizing,
1246	    Summarizing,
1247	    Saving,
1248	}
1249	
1250	#[derive(Debug, Clone, Default)]
1251	pub struct BackgroundPipelineContext {
1252	    pub sidecar: Option<SidecarMetadata>,
1253	    pub user_notes: Option<String>,
1254	    pub pre_context: Option<String>,
1255	    /// Consent basis loaded from the record-start sidecar… [+16854 chars]
```

### assistant · 2026-06-21 06:30:50 [sidechain] [sub: agent-af6b401b62faee5c9]

I have the full picture. Let me read the remaining stretch of `enrich_transcript_artifact` (1692-2061) to capture the summarize → structured extraction → write ordering precisely.

### assistant · 2026-06-21 06:30:51 [sidechain] [sub: agent-af6b401b62faee5c9]

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/pipeline.rs')`

### tool_result · 2026-06-21 06:30:52 [sidechain] [sub: agent-af6b401b62faee5c9]

```
1730	                    "diarize",
1731	                    &audio_path.display().to_string(),
1732	                    diarize_start.elapsed().as_millis() as u64,
1733	                    serde_json::json!({"skipped": true}),
1734	                );
1735	            }
1736	        }
1737	    }
1738	
1739	    let screen_dir = crate::screen::screens_dir_for(audio_path);
1740	    let screen_files =… [+10701 chars]
```

### assistant · 2026-06-21 06:32:27 [sidechain] [sub: agent-af6b401b62faee5c9]

I have the complete end-to-end flow. I have everything needed to write the report.

# Minutes Core Processing Engine — Architecture Report

All references are absolute: files live under `/Users/rymalia/projects/minutes/crates/core/src/`.

---

## 1. The end-to-end pipeline (`pipeline.rs`)

There are **two distinct entry surfaces** that share the same internals:

- **Synchronous / foreground** (`minutes process <wav>`, reprocess): `process` → `process_with_sidecar` → `process_with_progress` / `process_with_template` → the private workhorse `process_with_progress_and_sidecar` (pipeline.rs:1288–1365, impl at 2061). Returns `WriteResult`.
- **Decoupled / background** (the `record`→worker path, see §5): split into two phases — `transcribe_to_artifact` (1367) then `enrich_transcript_artifact` (1656). The synchronous path internally does the same two phases in sequence; the background path persists a `TranscriptArtifact` (1269: `write_result`, `frontmatter`, `transcript`) between them so a worker crash leaves a transcript-only `.md` on disk.

Progress is reported through `PipelineStage` (1243): `Transcribing | Diarizing | Summarizing | Saving`.

### Stage order (canonical, from `transcribe_to_artifact` + `enrich_transcript_artifact`)

| # | Stage | Function / key types | Notes |
|---|-------|---------------------|-------|
| 0 | Guard + date + calendar match | `transcribe_to_artifact` (1367): empty-file guard, `infer_recording_date`, `config.security.allowed_audio_dirs` sandbox check (1382), `select_calendar_event` over `calendar::events_overlapping` (1402) | Meeting-only calendar match → attendees |
| 1 | Decode hints | `build_decode_hints` (1412) from title + calendar title + pre_context + attendees + identity + vocabulary → `transcribe::DecodeHints` | Lexical priming for whisper initial-prompt / parakeet `--boost` |
| 2 | `.mov` stem-mix workaround | `prepare_transcription_input` (593) → `Option<MixedStemTempFile>` (547, RAII unlink-on-drop) | Works around macOS 26 SCRecordingOutput dual-track 2× decode bug (#234); reuses `diarize::discover_stem_plan` |
| 3 | **Decode + resample + transcribe** | `transcription_coordinator::transcribe_path_for_content_with_hints` (1433) → `transcribe::TranscribeResult { text, stats: FilterStats }` | Decode (ffmpeg→symphonia) + 16 kHz mono resample + whisper/parakeet + whisper-guard cleanup all happen inside here — see §2 |
| 4 | Self-name normalization | `normalize_transcript_for_self_name_participant` (1441) | Meeting-only |
| 5 | All-noise suppression gate | `should_suppress_transcript` → `suppress_if_all_noise` (49, 99) using `wg_segments::is_all_noise` + `RecordingHealth` sparse-stem ratios (`SPARSE_STEM_ACTIVE_RATIO = 0.02`, line 22) | Replaces fabricated transcript with `ALL_NOISE_SUPPRESSED_BODY`, forces `NoSpeech` (#241). Shared single-source-of-truth between both entry points (codex blocker #2, PR #246) |
| 6 | **Write transcript-only artifact** | `write_transcript_artifact` (1460): builds `Frontmatter`, status `NoSpeech` (if suppressed or `word_count < config.transcription.min_words`) else `TranscriptOnly`; title via calendar title / `generate_title`; `build_entity_links`, `derive_structured_tags`; `markdown::write_with_retry_path` (or `rewrite_with_retry_path` if reprocessing) | Phase 1 ends here; `.md` exists with status `transcript-only` |
| 7 | **Diarize** (enrich phase) | `enrich_transcript_artifact` (1656): if `config.diarization.engine != "none"` and type==Meeting → `build_transcript_windows` (1680) + `diarize::diarize_with_context(DiarizationPurpose::PrimaryMeeting)` (1688) → `DiarizationOutcome::Result(DiarizationResult)`; labels applied via `apply_speakers` inside the result handling (transcript rewritten to `[SPEAKER_0 0:00]` lines). Captures `num_speakers`, `source_aware`, `degraded_capture`, `speaker_embeddings` | See §3 |
| 8 | Screen-context gather | `screen::screens_dir_for` / `list_screenshots` (1739) | Optional multimodal screenshots for summary |
| 9 | **Summarize** | if `engine != "none"` → `summarize::summarize_with_template(transcript[+user notes], screen_files, config, template)` → `Option<Summary>` (1765). User notes are prepended and "weighted heavily" (1757) | See §4 |
| 10 | **Structured extraction** | `extract_action_items` → `Vec<ActionItem>` (1776), `extract_decisions` → `Vec<Decision>` (1794), `extract_intents` → `Vec<Intent>` (1797). All defined pipeline.rs:3932–4040 | Each logged as a structured LLM step |
| 11 | **Speaker attribution** (L0–L3) | `attribute_meeting_speakers` (1860, impl at 1066) → `AttributionProcessingResult { transcript, speaker_map, debug }`. Rewrites transcript with confirmed High-confidence names | See §3 |
| 12 | Speaker-map normalization | `normalize_attendees/action_items/intents/decisions_with_speaker_map` (1876–1881) | SPEAKER_X → real names propagated into structured fields |
| 13 | Entities + title refine | `build_entity_links` (1884), `maybe_refine_title_with_llm` → `summarize::refine_title` (1920) | |
| 14 | Status + warnings | `detect_summarization_warnings` (131, called 1935): if summary expected but `None` → `summarize_failed` warning → status promoted `Degraded`; else `Complete`; else `TranscriptOnly` (1942–1948) | `OutputStatus::Degraded` + `processing_warnings` (issue #243) |
| 15 | **Save** | `on_progress(Saving)` → `markdown::rewrite_with_retry_path` (1961) with summary + transcript + notes | |
| 16 | Post-save side effects | `apply_title_generation` (1969); `voice::save_meeting_embeddings` (1989, persists embeddings sidecar for L3); `events::emit_insights_from_summary` (1994, agent subscription JSONL) | |

---

## 2. `transcribe.rs` — backends, guard, decode

Entry: `transcribe` / `transcribe_with_hints` → `transcribe_dispatch` (325) which matches `config.transcription.engine` (`TranscriptionConfig::engine`, config.rs:163):
- `"whisper"` → `transcribe_whisper_dispatch` (635); `"parakeet"` → `transcribe_parakeet_dispatch` (673, gated by `--features parakeet`, else `TranscribeError::EngineNotAvailable`); `"apple-speech"` and unknown strings → **fall back to whisper** (333–345).
- All return `TranscribeResult { text, stats: FilterStats }` (124, 31). Text format is identical `[M:SS] text` lines from both backends.

**Whisper** (635): `load_whisper_context` → `transcribe_with_whisper` (872) using `whisper_guard::params::default_whisper_params(vad_path)`. GPU is a **compile-time** feature (`metal`/`cuda`/etc.), not runtime config (`whisper_context_params`, 734). Includes a no-VAD auto-retry when long audio blanks under Silero VAD (836), and a no_speech rescue (990) that restores all rescued lines rather than emit a blank transcript.

**Parakeet** (1802): subprocess-based; three execution paths in priority order — warm sidecar server (`parakeet_sidecar::transcribe_via_global_sidecar`), `minutes parakeet-helper` JSON subprocess, then direct CLI (`run_parakeet_cli_structured`). 3× WAV-duration timeout clamped [90s, 1800s], with one CPU-fallback retry on GPU/Metal failure (2387). No per-segment no_speech probability, so that guard layer is a no-op for parakeet.

**whisper-guard integration** lives in `transcription_coordinator.rs:166` `run_transcript_cleanup_pipeline`, applying `wg_segments::` in order: `dedup_segments` → `dedup_interleaved` → `strip_foreign_script` → `collapse_noise_markers` → `trim_trailing_noise`. Silero VAD gating happens inside whisper.cpp via the params; energy `strip_silence` is the fallback when no VAD model. Per-stage survivor counts feed `FilterStats.after_*`; `FilterStats::diagnosis()` (61) renders the human-readable NoSpeech hint. `clean_transcript`/`CleanOptions`/`CleanStats` are re-exported (transcribe.rs:26) for external callers but the in-tree path uses the per-stage pipeline.

**Decode** `load_audio_samples` (1062): `.wav` → `load_wav`; `m4a/mp3/ogg/webm/mp4/mov/aac` → **ffmpeg first** (`decode_with_ffmpeg`, 1165: `ffmpeg -ar 16000 -ac 1 -f wav`), falling back to **symphonia** (`decode_with_symphonia`, 1233) when ffmpeg is absent/errors. ffmpeg preferred because symphonia's AAC decoder triggers whisper hallucination loops on non-English audio (#21). Both paths downmix to mono and `resample(...,16000)` (whisper-guard windowed-sinc) + `normalize_audio`.

---

## 3. `diarize.rs` — diarization + attribution

**ML path** (`diarize` feature): `diarize_with_context` (1644) → `DiarizationOutcome::{Result|Skipped|NotConfigured}` (171). `run_diarization_engine` (1082) dispatches in a panic-isolated thread to `diarize_with_pyannote_rs` (1995): segmentation ONNX (`segmentation-3.0.onnx`) + embedding ONNX (`wespeaker_en_voxceleb_CAM++.onnx`) via `ort`, custom running-average speaker-template clustering using `voice::cosine_similarity` against `config.diarization.threshold`. Returns `DiarizationResult` (27): `segments`, `num_speakers`, `system/voice_dominant_ratio`, `degraded_capture`, `from_stems`, `source_aware`, `speaker_embeddings`. Engine `"none"` (default), `"auto"`, `"pyannote-rs"`, legacy `"pyannote"` (Python subprocess). Without the feature, returns a rebuild-with-`--features diarize` error.

**Energy/stem path** (no ML): native call capture writes `{base}.voice.wav` / `{base}.system.wav` (`StemPaths`, 367). `discover_stem_plan` (566) → `SourceAwareDiarizationPlan::{FullStems|SystemStemOnly|SilentSystemStem}` (373) using `stem_has_audio` (380, whole-file 1s-RMS scan, floor `STEM_PROBE_RMS_FLOOR=0.001`). `diarization_from_energy_windows` (884) labels `SPEAKER_0`=you/voice, `SPEAKER_1`=remote/system per louder stem (`silence_threshold=0.005`); collapses to one speaker when stems correlate above `stem_correlation_threshold` (self-echo/bleed). `diarize_from_source_aware_stems` (1306) runs stem energy first, then ML on the **system stem only** and merges remote labels (remapped to start at 2). `FailureKind` (73), `CaptureSource` (89), `DegradedCapture` (62), `DiagnosticConfidence` (105, always `Inferred` for energy-derived) flow into `markdown::RecordingHealth`.

**Attribution confidence** (`SpeakerAttribution { speaker_label, name, confidence, source }`, 145): `Confidence::{High,Medium,Low}` (122), `AttributionSource::{Deterministic,Llm,Enrollment,Manual,MlBleedDegraded,StemRecovery}` (131). Levels are orchestrated by `attribute_meeting_speakers` (pipeline.rs:1066):
- **L2 (voice enrollment)** runs first: `match_speakers_by_voice` (pipeline.rs:317) matches embeddings vs `voices.db` via `voice::match_embedding` → **High + Enrollment**.
- **L0 (deterministic 1-on-1)**: when 2 trusted attendees + 2 diarized speakers + 2 labels and no L2 match → **Medium + Deterministic** (pipeline.rs:1098). Plus `single_stem_speaker_self_attribution` (pipeline.rs:939) for source-backed `SPEAKER_0`.
- **L1 (LLM)**: remaining unmapped labels → `summarize::map_speakers` → **Medium + Llm** (capped at Medium; summarize.rs:2343).
- **L3 (confirmed learning)**: count-weighted `speaker_embeddings` saved to `voices.db` (pipeline.rs:1989) so future meetings match at L2; manual confirms carry `AttributionSource::Manual`.
- **Degraded ML**: `mark_degraded_ml_attributions` (pipeline.rs:485) → Low + MlBleedDegraded.

**The rewrite rule**: `apply_speakers` (diarize.rs:1774) renders `[SPEAKER_X M:SS] text` from segment timestamps (`find_speaker`, tolerance 2.0s for stems / 0.5s ML; all-UNKNOWN inherits a ≥60%-dominant speaker). `apply_confirmed_names` (diarize.rs:188) then rewrites bracket labels to real names **only for `Confidence::High` attributions** — "wrong names are worse than anonymous." `speaker_map: Vec<SpeakerAttribution>` is the canonical YAML attribution record (markdown.rs:286).

---

## 4. `summarize.rs` — summarization, providers, structured extraction

Entry: `summarize_with_template(transcript, screens, config, template, log) -> Option<Summary>` (63; others delegate). `Summary` (24) holds raw-string `text/decisions/action_items/open_questions/commitments/key_points/participants`. **Always returns `Option` — `None` degrades gracefully**, pipeline continues.

Engine select on `config.summarization.engine` (95): `"none"`→`None` immediately (the **Claude-via-MCP path** — Claude summarizes on demand, no key); `"auto"`→`detect_agent_cli` probes `claude>codex>gemini>opencode` and runs the found CLI under its own subscription auth (no API key); `"agent"`; `"claude"`/`"openai"`/`"mistral"`/`"ollama"`/`"openai-compatible"`.

Providers all use **ureq** `http_post` (1707, 120s timeout, no secrets in argv): Ollama `{ollama_url}/api/generate` keyless (1664); Mistral reads `MISTRAL_API_KEY` (1418); OpenAI `OPENAI_API_KEY` (1342); Claude API `ANTHROPIC_API_KEY` (1208); openai-compatible runs keyless against local base URLs. Agent-CLI path (`summarize_with_agent_impl_timeout`, 1054): truncates to 100 KB, `prepare_agent_invocation` maps argv (`claude -p -`, `codex exec - -s read-only --skip-git-repo-check`, etc.), drains stdout/stderr on separate threads, polls `try_wait`, kills on `agent_timeout_secs` (default 300s). **No API key ⇒ no crash**: key-requiring engines return `Err(...)` only when explicitly selected and the var is unset, swallowed to `None`; the product default (`auto`/`none`) never needs a key.

Prompt: `build_base_system_prompt` (434) extracts 6 fixed sections inside `<transcript>` tags with injection-guarding; `build_prompt` (485) does map-reduce chunking at ~4 chars/token with a synthesis pass. `parse_summary_response` (512) is a header-keyed line state machine.

**Structured extraction** (typed structs in markdown.rs, conversion in pipeline.rs): `extract_action_items` (parses `@user: task by Friday`), `extract_decisions`, `extract_intents` (unifies the four `IntentKind`s). **Speaker mapping** is in summarize.rs: `map_speakers` (2028) → `SPEAKER_MAPPING_PROMPT` (first 3000 chars, `SPEAKER_1 = Name`, `= UNKNOWN` when unsure) → `parse_speaker_mapping` fuzzy-matches names against attendees → **Medium + Llm** attributions (L1). Routes through the agent path even when `engine == "none"` so MCP users still get names.

---

## 5. `jobs.rs` — the background job queue (decouples `record` from processing)

**State**: `JobState` (37): `Queued→Transcribing→TranscriptOnly→Diarizing→Summarizing→Saving→{NeedsReview|Complete|Failed}`; `ProcessingJob` (71) carries mode/content_type/paths/state/timestamps/`owner_pid`/`retry_count` (no separate `JobKind` — kind = `CaptureMode`→`ContentType`). `MAX_AUTO_RETRIES = 2` (24).

**Persistence**: one JSON file per job (NOT JSONL, NOT sqlite) at `~/.minutes/jobs/<id>.json` (`job_path`, 269); captured WAV moves to `jobs/<id>.<ext>`. Terminal jobs are moved to `jobs/archive/` (`move_to_archive` via `hard_link`+`remove_file`, 739) so the 1 Hz status poll (`list_jobs_raw`, 567) never parses lifetime history. Atomic writes via temp+rename (`write_job`, 521). `update_job_state` (980) is the single read-modify-write primitive, routing across the active/archive boundary.

**Enqueue**: `queue_live_capture` (152) — on `stop`, **moves** the in-flight WAV + per-source stems + screenshots into the jobs dir (`move_capture_into_job`, 310), writes a `Queued` `<id>.json`, and **returns immediately**. `enqueue_capture_job` (392) is the no-move variant.

**Drain worker**: `process_pending_jobs` (1187) — acquires a flock PID guard (`create_worker_guard`, `~/.minutes/processing-worker.pid`; `worker_active` prevents duplicate workers), loops `next_pending_job` (954, first `Queued`), CAS-claims via `owner_pid`, runs `pipeline::transcribe_to_artifact` (Phase 1) then `enrich_transcript_artifact` (Phase 2) — **each inside `catch_unwind`** so a whisper.cpp/parakeet FFI panic becomes a `Failed` job, not a worker crash. Per-stage callback maps `PipelineStage → JobState`. On success: terminal `Complete`/`NeedsReview`, emits events, rebuilds graph index, `refresh_qmd_collection` (shells `qmd update`), runs the post-record hook, and `preserve_audio_alongside_output` (1059, moves the WAV next to the `.md`).

**Decoupling**: recording does no transcription — it renames a file + writes small JSON and returns. The heavy work runs in a separate, single-worker (flock-guarded) process that shares state only through on-disk job JSON. Crash recovery: dead-`owner_pid` non-terminal jobs are re-queued, `retry_count++`; once `> MAX_AUTO_RETRIES` they're demoted to `Failed` to break SIGABRT loops (#229). `requeue_job` (887) resets count for manual retry.

---

## 6. `markdown.rs` — frontmatter schema, output

`ContentType` (22): `Meeting | Memo | Dictation` → routes to `output_dir`, `output_dir/memos`, or `output_dir/dictations` (`write_with_retry_path`, 603). `OutputStatus` (29): `Complete | NoSpeech | TranscriptOnly | Degraded`.

`Frontmatter` (221) — YAML schema (all derive `JsonSchema` for MCP querying): `title`, `type`, `date` (custom RFC3339/local/date deserializer, 304), `duration`, `source`, `status`, `processing_warnings: Vec<ProcessingWarning>` (124, the Degraded detail), `tags`, `attendees`/`attendees_raw`, `calendar_event`, `people`, `entities: EntityLinks` (people+projects refs), `device`, `captured_at`, `context`, **`action_items: Vec<ActionItem>`** (475: assignee/task/due/status), **`decisions: Vec<Decision>`** (494: text/topic/authority/supersedes), **`intents: Vec<Intent>`** (514: kind/what/who/status/by_date), `recorded_by`, consent/`consent_notice`/`sensitivity`/`debrief`/`capture`/`visibility`, **`speaker_map: Vec<SpeakerAttribution>`** (286, canonical attribution), `recording_health: Option<RecordingHealth>` (138: stem active ratios + `capture_warnings` + `diarization_path`), `template`, and `filter_diagnosis` (`#[serde(skip)]`, 297 — only feeds the rendered NoSpeech hint, never serialized).

Write path: `render_markdown` (540) emits `---\n{yaml}---\n\n` + `## Summary` + (NoSpeech block with diagnosis + `minutes process <retry_audio>` hint) + `## Notes` + `## Transcript`. `write` → `write_with_retry_path` (603): creates the type-routed dir, `generate_slug` + `resolve_collision`, `fs::write`, then `set_permissions` — **0o600** default, **0o640** when `Visibility::Team` (638). `rewrite_with_retry_path` (670) does the same via a `.md.tmp` + atomic `fs::rename`. Returns `WriteResult { path, title, word_count, content_type }` (533).

---

**Key file paths**: `crates/core/src/{pipeline,transcribe,diarize,summarize,markdown,jobs,capture}.rs` plus the cleanup wrapper `crates/core/src/transcription_coordinator.rs` (where the whisper-guard pipeline actually runs) and config in `crates/core/src/config.rs` (`TranscriptionConfig`, `SummarizationConfig`, `DiarizationConfig`).

### tool_result · 2026-06-21 06:32:28

```
I have the complete end-to-end flow. I have everything needed to write the report.

# Minutes Core Processing Engine — Architecture Report

All references are absolute: files live under `/Users/rymalia/projects/minutes/crates/core/src/`.

---

## 1. The end-to-end pipeline (`pipeline.rs`)

There are **two distinct entry surfaces** that share the same internals:

- **Synchronous / foreground** (`mi… [+18124 chars]
```

### tool_result · 2026-06-21 06:32:28

```
agentId: af6b401b62faee5c9 (use SendMessage with to: 'af6b401b62faee5c9' to continue this agent)
<usage>subagent_tokens: 106768
tool_uses: 9
duration_ms: 1108047</usage>
```

### assistant · 2026-06-21 06:32:39

I now have a complete, deep picture across all subsystems. Let me record the key architectural insight to persistent memory, then synthesize for you.

### assistant · 2026-06-21 06:32:57

- **→** `Write(file_path='/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/project_three_frontends_coord… [+10 chars]')`

### assistant · 2026-06-21 06:32:57

- **→** `Read(file_path='/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/MEMORY.md')`

### tool_result · 2026-06-21 06:32:57

```
File created successfully at: /Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/project_three_frontends_coordination.md (file state is current in your context — no need to Read it back)
```

### tool_result · 2026-06-21 06:32:58

```
1	# Memory Index
2	
3	- [Project overview](project_overview.md) — Minutes architecture, design decisions, markdown-canonical data model
4	- [No git commit](feedback_git_no_commit.md) — Never run git commit; suggest messages only, wait for user
5	- [New user profile](user_minutes_new_user.md) — User is new to Minutes/Rust/Tauri, runs M3 Air, asks deep arch questions
6	- [Install gotchas](project_in… [+1227 chars]
```

### assistant · 2026-06-21 06:33:02

- **→** `Edit(file_path='/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/MEMORY.md')`

### tool_result · 2026-06-21 06:33:02

```
The file /Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/MEMORY.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 06:33:41

I've now read the coordination primitives directly and surveyed every major subsystem via parallel agents. Here's the synthesis, focused on your question.

# How Minutes works — and how the CLI and Tauri app relate

## The one-sentence model

**There are three front-ends — the `minutes` CLI, the Tauri desktop app, and the MCP server — sitting on top of one shared Rust engine (`minutes-core`). The CLI and Tauri app both statically link `minutes-core` and call it directly in-process. They are *peers*, not layers: neither shells out to the other. They coordinate entirely through shared files under `~/.minutes/`.**

```
        ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐
        │ minutes CLI │   │  Tauri app   │   │   MCP server (TS)   │
        │ (clap, 55   │   │ (menu bar,   │   │  npx minutes-mcp    │
        │  commands)  │   │  103 cmds)   │   │  31 tools/7 res     │
        └──────┬──────┘   └──────┬───────┘   └──────────┬──────────┘
               │ links            │ links               │ shells out via
               │ directly         │ directly            │ execFile("minutes …")
               ▼                  ▼                      │ + reads markdown via
        ┌─────────────────────────────────┐             │ minutes-sdk (TS reader)
        │      minutes-core (Rust lib)     │◀────────────┘
        │  capture·transcribe·diarize·     │
        │  summarize·pipeline·jobs·pid·    │
        │  events·live_transcript·…        │
        └─────────────────────────────────┘
               │ all durable state + all coordination
               ▼
        ~/.minutes/  (PID files+flock, events.jsonl, jobs/, desktop-control/,
                      config.toml, voices.db, overlays.db, live-transcript.jsonl)
        ~/meetings/  (the markdown corpus — the canonical product output)
```

## The CLI and Tauri app: same engine, different shells

| Dimension | CLI (`minutes-cli`) | Tauri app (`minutes-app`) |
|-----------|--------------------|-----------------|
| **How it uses core** | `clap` dispatcher; each subcommand calls `minutes_core::*` | `#[tauri::command]` fns (`cmd_*`) call the *same* `minutes_core::*` |
| **Relationship to the other** | Detects app-owned recordings; can stop them via sentinel | Reflects CLI-started recordings in its tray (PID-aware); can stop a CLI `minutes live` via SIGTERM+sentinel |
| **Feature flags** | `whisper`+`diarize` default; `streaming` always | `streaming`+`diarize` always |
| **Extra deps** | self-spawns for `process-queue` & parakeet-helper | tray, PTY, updater, autostart, global-shortcut, window-state |
| **Spawns subprocesses?** | itself (queue worker / parakeet helper) | *agent* CLIs (claude/codex) in a PTY for the Recall assistant — **never spawns `minutes`** |

The one place the app touches the CLI binary: `cli_setup.rs` symlinks `~/.local/bin/minutes` → the `minutes` sidecar bundled inside the `.app` (so app updates also update the CLI), plus a 1-second `minutes --version` probe. That `--version` call is the *only* time the app ever executes the CLI.

## The coordination layer (the heart of your question)

Everything cross-process lives in `~/.minutes/`, managed by three core modules:

**`pid.rs` — flock'd PID files + state sidecars.** `recording.pid`, `dictation.pid`, `live-transcript.pid` are each acquired under an `fs2` flock (atomic check-and-write, no TOCTOU). Both the CLI and app go through these, so each sees the other's sessions. Reads use `inspect_pid_file().is_active()` rather than reading the PID, so a Windows mandatory-locked file is still detected (#258). Companion files: `recording-meta.json` (the `CaptureMode`), `last-result.json` (recorder→`stop` handoff), `processing-status.json`, `current.wav`, `mic_mute` sentinel.

**`desktop_control.rs` — file-based IPC, reverse direction.** When a CLI command or MCP tool wants the *running app* to record (e.g. for system-audio capture), the app writes a `desktop-app.json` heartbeat; `desktop_app_owns_pid()` trusts it only if PID matches **and** it's <10s old. Requesters drop `requests/{id}.json`; the app's 2s poll claims it by **atomic rename** (single-claim guarantee) and writes `responses/{id}.json`. This is also why `minutes stop` checks `desktop_app_owns_pid()` — if the app owns the recorder it stops via sentinel only, never SIGTERM.

**`events.rs` — append-only JSONL event bus.** `events.jsonl` with a monotonic `seq` (backed by an `events.seq` sidecar + `events.lock` flock). `read_events_since_seq` is the stable cursor for agent reactivity. `agent.annotation` events let external agents annotate meetings without mutating markdown, gated by a `~/.minutes/agents.allow` allowlist.

## The processing pipeline (what all three front-ends ultimately drive)

```
WAV ─decode(ffmpeg→symphonia)→ 16kHz mono ─transcribe(whisper|parakeet)→
  ─whisper-guard cleanup→ transcript-only .md written ─┐
                                                        │ (crash-safe checkpoint)
  ─diarize(pyannote ONNX | energy stems)→ speaker_map ─┤
  ─summarize(agent CLI | Ollama | none)→ ──────────────┤
  ─extract action_items/decisions/intents→ ────────────┤
  ─attribute speakers L0–L3→ rewrite High-conf names ──┘
  → final markdown + YAML frontmatter (0600 perms) in ~/meetings/
```

**The crucial async/sync asymmetry:** `minutes record` does *not* run this pipeline — on stop it renames the WAV into `jobs/<id>.json` and returns instantly; a flock-guarded `process-queue` worker (a detached self-spawn, or the app's `--process-queue-worker`) drains the queue, each stage wrapped in `catch_unwind` so a whisper FFI panic becomes a `Failed` job, not a crash. By contrast `minutes process <file>` (offline) runs the pipeline **synchronously** in-process. Both the CLI and app share the same `jobs/` queue.

## The MCP server — the third, looser consumer

Unlike the other two, the MCP server is TypeScript and does *not* link Rust. It either shells out (`minutes search --json`, `minutes get`, `minutes capabilities`) or reads markdown directly via `minutes-sdk`'s `reader.ts` (a deliberate parity-mirror of the Rust `minutes-reader`, right down to `humanizeTranscript` only renaming `confidence: "high"` speakers). It feature-gates which tools it registers on `minutes capabilities --json` (rejecting `api_version > 1`), and for recording it *delegates to the app via the desktop-control file IPC* when running inside Claude Desktop's `.mcpb` extension or for `call` intent — otherwise it `spawn`s `minutes record` **non-detached** (a detached `setsid()` would create a new macOS audit session and sever the inherited TCC mic grant → silent recordings).

## What I cached

I read `lib.rs`, all three Cargo manifests, and the coordination primitives (`pid.rs`, `desktop_control.rs`) directly, and surveyed CLI `main.rs`, Tauri `main.rs`+`commands.rs`+`cli_setup.rs`, the full processing engine (`pipeline`/`transcribe`/`diarize`/`summarize`/`jobs`/`markdown`), the streaming subsystem (`live_transcript`/`streaming`/`dictation`/`events`/`transcription_coordinator`), and the MCP/SDK layer. I saved the cross-front-end coordination model to persistent memory as `project_three_frontends_coordination.md`.

Want me to go a level deeper on any one area — e.g. the speaker-attribution L0–L3 confidence ladder, the parakeet sidecar/subprocess fallback chain, the Tauri tray/shortcut state machine, or the live-coaching assistant workspace?

### user · 2026-06-21 06:46:32

Let's go deeper into the parakeet sidecar/subprocess fallback chain, and also specifically the parakeet install process (the instructions in `docs/PARAKEET.md` almost entirely focus on the CLI, but then in the "Building Minutes with Parakeet Support" section, line 525, there is a reference to rebuild the tauri desktop app:
```
# Tauri desktop app
TAURI_FEATURES="parakeet" cargo tauri build --bundles app
```

Does this mean that to enable parakeet features in the desktop app that it needs to be rebuilt with that feature flag set, or does the parakeet ability exist in the tauri app by default once it is built into `minutes` cli?

I clearly still don't fully understand the tauri vs cli situation. Does the tauri app just call the cli binary for everything?

### assistant · 2026-06-21 06:46:41

Great question — this gets right at the misconception. Let me verify the answer against the actual code rather than reasoning from the docs. Let me read the parakeet fallback chain and the feature-flag wiring directly.

### assistant · 2026-06-21 06:46:42

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/parakeet_sidecar.rs')`

### tool_result · 2026-06-21 06:46:42

```
1	#[cfg(all(feature = "parakeet", unix))]
2	mod imp {
3	    use crate::config::Config;
4	    use crate::error::TranscribeError;
5	    use crate::transcribe::{
6	        parakeet_transcript_from_segments, write_wav_16k_mono, ParakeetCliSegment,
7	        ParakeetCliTranscript,
8	    };
9	    use serde::{Deserialize, Serialize};
10	    use std::collections::{BTreeSet, HashMap, VecDeque};
11	    use… [+6418 chars]
```

### assistant · 2026-06-21 06:46:43

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs')`

### tool_result · 2026-06-21 06:46:43

```
1802	fn transcribe_with_parakeet(
1803	    audio_path: &Path,
1804	    config: &Config,
1805	    hints: &DecodeHints,
1806	) -> Result<TranscribeResult, TranscribeError> {
1807	    let mut stats = FilterStats::default();
1808	
1809	    // Validate model name before doing any work
1810	    if !crate::parakeet::valid_model(&config.transcription.parakeet_model) {
1811	        return Err(TranscribeErr… [+11176 chars]
```

### assistant · 2026-06-21 06:47:06

The fallback chain is taking shape. Let me confirm the feature-flag gating (the crux of your question) and read the rest of the sidecar state machine and binary resolution.

### assistant · 2026-06-21 06:47:06

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs')`

### tool_result · 2026-06-21 06:47:07

```
325	fn transcribe_dispatch(
326	    audio_path: &Path,
327	    config: &Config,
328	    hints: &DecodeHints,
329	) -> Result<TranscribeResult, TranscribeError> {
330	    match config.transcription.engine.as_str() {
331	        "whisper" => transcribe_whisper_dispatch(audio_path, config, hints),
332	        "parakeet" => transcribe_parakeet_dispatch(audio_path, config, hints),
333	        "apple-sp… [+13613 chars]
```

### assistant · 2026-06-21 06:47:14

Confirmed the crux: `transcribe_parakeet_dispatch` (line 673) is `#[cfg(feature = "parakeet")]`-gated, and this code lives **inside `minutes-core`** — compiled into whichever binary links it. Let me grab the no-feature branch and the sidecar entry + binary/helper resolution to complete the chain.

### assistant · 2026-06-21 06:47:15

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs')`

### tool_result · 2026-06-21 06:47:15

```
684	                crate::config::VALID_PARAKEET_MODELS.join(", ")
685	            )));
686	        }
687	        let samples = load_audio_samples(audio_path)?;
688	        let audio_duration_secs = samples.len() as f64 / 16000.0;
689	        let native_vad_path = resolve_parakeet_native_vad_path(config);
690	        if let Some(chunk_ranges) = parakeet_chunk_ranges(
691	            samples.len()… [+2913 chars]
```

### assistant · 2026-06-21 06:47:23

Definitive answer confirmed (lines 723–727): without the `parakeet` feature, `minutes-core` returns `EngineNotAvailable("parakeet")` — and this code is compiled into each binary independently. Let me grab the sidecar's public entry points and binary/helper resolution to finish the fallback chain.

### assistant · 2026-06-21 06:47:25

- **→** `Bash(command='echo "=== sidecar public fns + state transitions ===" && grep -n "pub fn \\|fn transcribe_via_global_… [+203 chars]', description='Find sidecar public fns and FP16 downgrade logic')`

### tool_result · 2026-06-21 06:47:26

```
=== sidecar public fns + state transitions ===
96:        pub first_request_on_process: bool,
181:        SubprocessOnly {
191:        DowngradeToFp32,
216:        fn fp16_blacklist_path(&self) -> PathBuf {
236:        fp16_blacklist_fingerprints: BTreeSet<String>,
248:                fp16_blacklist_fingerprints: BTreeSet::new(),
270:        pub fn transcribe(
307:                            self.… [+3583 chars]
```

### assistant · 2026-06-21 06:47:31

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/parakeet_sidecar.rs')`

### tool_result · 2026-06-21 06:47:32

```
270	        pub fn transcribe(
271	            &mut self,
272	            spec: SidecarLaunchSpec,
273	            request: SidecarRequest,
274	            config: &Config,
275	            audio_duration_secs: f64,
276	        ) -> Result<SidecarTranscriptResult, SidecarError> {
277	            if let SidecarState::Disabled = self.state {
278	                return Err(SidecarError::new(format!(
2… [+4042 chars]
```

### assistant · 2026-06-21 06:47:36

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/parakeet_sidecar.rs')`

### tool_result · 2026-06-21 06:47:36

```
1219	    pub fn resolve_server_binary(parakeet_binary: &str) -> Option<PathBuf> {
1220	        if let Ok(explicit) = std::env::var("MINUTES_PARAKEET_SERVER_BINARY") {
1221	            let explicit = PathBuf::from(explicit);
1222	            if explicit.exists() {
1223	                return Some(explicit);
1224	            }
1225	        }
1226	
1227	        if let Ok(path_binary) = which::which("… [+4270 chars]
```

### assistant · 2026-06-21 06:47:41

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/parakeet_sidecar.rs')`

### tool_result · 2026-06-21 06:47:41

```
1631	pub fn sidecar_enabled_effective(config: &crate::config::Config) -> bool {
1632	    match config.transcription.parakeet_sidecar_enabled {
1633	        Some(explicit) => explicit,
1634	        None => {
1635	            cfg!(feature = "parakeet")
1636	                && (config.transcription.engine == "parakeet"
1637	                    || config.effective_live_transcript_backend() == "parakee… [+4369 chars]
```

### assistant · 2026-06-21 06:47:46

- **→** `Bash(command='echo "=== resolve_minutes_parakeet_helper (transcribe.rs) ===" && grep -n "fn resolve_minutes_parake… [+328 chars]', description='Find helper + binary resolution functions')`

### tool_result · 2026-06-21 06:47:47

```
=== resolve_minutes_parakeet_helper (transcribe.rs) ===
2462:fn resolve_minutes_parakeet_helper() -> Option<PathBuf> {

=== parakeet.rs binary resolution ===
203:pub fn valid_model(model: &str) -> bool {
208:pub enum ResolveParakeetBinaryMode {
227:pub fn resolve_parakeet_binary(
229:    mode: ResolveParakeetBinaryMode,
241:            ResolveParakeetBinaryMode::Strict => Err(ResolveParakeetBinary… [+551 chars]
```

### assistant · 2026-06-21 06:47:49

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/transcribe.rs')`

### tool_result · 2026-06-21 06:47:50

```
2462	fn resolve_minutes_parakeet_helper() -> Option<PathBuf> {
2463	    if let Ok(explicit) = std::env::var("MINUTES_PARAKEET_HELPER") {
2464	        let path = PathBuf::from(explicit);
2465	        if path.exists() {
2466	            return Some(path);
2467	        }
2468	    }
2469	
2470	    if let Ok(current) = std::env::current_exe() {
2471	        if current
2472	            .file_name()
2473… [+2115 chars]
```

### assistant · 2026-06-21 06:48:56

I now have the complete picture, verified in code. Let me answer directly.

## Short answer

**Yes — to get Parakeet in the desktop app, the desktop app itself must be compiled with `TAURI_FEATURES="parakeet"`.** Having Parakeet in the `minutes` CLI does *not* give the Tauri app Parakeet. That `cargo tauri build` line at PARAKEET.md:525 is necessary, not redundant.

And the bigger question — **no, the Tauri app does not call the CLI binary for its work.** It links `minutes-core` and runs transcription *in-process*, exactly like the CLI does. They're two separate compilations of the same engine.

## Why — the mental model

`parakeet` is a **compile-time Cargo feature on `minutes-core`**, and *each* front-end binary enables it independently and re-exports it to core:

```
minutes-cli/Cargo.toml   parakeet = ["minutes-core/parakeet"]   # --features parakeet
minutes-app/Cargo.toml   parakeet = ["minutes-core/parakeet"]   # TAURI_FEATURES="parakeet"
```

The engine selection happens entirely inside `minutes-core`. `transcribe_dispatch` (`transcribe.rs:330`) reads `config.transcription.engine` and routes `"parakeet"` → `transcribe_parakeet_dispatch`. That function is feature-gated:

```rust
// transcribe.rs:673
fn transcribe_parakeet_dispatch(...) {
    #[cfg(feature = "parakeet")]      { /* real path */ }
    #[cfg(not(feature = "parakeet"))] { Err(EngineNotAvailable("parakeet")) }  // :723-727
}
```

So the gate is baked into whichever binary you compiled. Both the CLI and the app read the *same* `config.toml`, so if you set `engine = "parakeet"` there and only the CLI was built with the feature:

- `minutes record` → transcribes with Parakeet ✅
- the desktop app → hits the `#[cfg(not(feature = "parakeet"))]` arm → `EngineNotAvailable("parakeet")` ❌

This is the same pattern as Metal/CUDA and `diarize` — all compile-time, per-binary. It's also why the CLAUDE.md "rebuild ALL affected targets" rule exists: a feature change to core means recompiling *every* binary that should expose it.

The one nuance to the "never calls the CLI" rule: *inside* the Parakeet path there's an optional crash-isolation layer that can spawn `minutes parakeet-helper` (resolved via `which("minutes")` — `transcribe.rs:2462`). But that's an internal optimization reached only *after* the app's own `parakeet`-gated code runs — not the app delegating its work to the CLI. The actual ASR work needs the **parakeet.cpp binaries** (`parakeet` / `example-server`), not the `minutes` CLI.

## The Parakeet fallback chain

Once you're inside `transcribe_with_parakeet` (`transcribe.rs:1802`), there are **three execution layers**, tried in order. All run in whatever process linked core (CLI *or* app):

```
                 transcribe_with_parakeet()
                          │
   sidecar_enabled_effective(config)?  ── parakeet_sidecar.rs:1631
   (engine==parakeet OR live backend==parakeet) AND `example-server` resolves
                          │ yes
        ┌─────────────────▼─────────────────┐
        │ LAYER 1: warm sidecar server      │  transcribe_via_global_sidecar (:1251)
        │ persistent `example-server` over  │  process-global, Mutex<Manager>, OnceLock
        │ a Unix socket; model stays warm   │  state: Cold→Starting→Healthy→SubprocessOnly
        └─────────────────┬─────────────────┘
                  Ok ──────┘ return        Err → tracing::warn, fall through
                          │
        ┌─────────────────▼─────────────────┐
        │ LAYER 2: `minutes parakeet-helper`│  only if hints.is_empty() &&
        │ child `minutes` process does ONE  │  no MINUTES_PARAKEET_HELPER_ACTIVE/FORCE_DIRECT
        │ parakeet.cpp call — crash-isolated│  resolve_minutes_parakeet_helper (:2462)
        └─────────────────┬─────────────────┘
              success ─────┘                 non-zero exit / spawn fail ↓ (logged once)
                          │
        ┌─────────────────▼─────────────────┐
        │ LAYER 3: direct parakeet CLI      │  run_parakeet_cli_structured
        │ spawn the `parakeet` C++ binary   │  the unconditional floor
        └───────────────────────────────────┘
```

Notes on each:

- **Layer 1 (sidecar)** is the fast path — a long-lived `example-server` keeps the model resident, so you pay model-load cost once per session instead of per utterance. It's a real state machine (`SidecarState`: `Cold → Starting → Healthy → SubprocessOnly`, `parakeet_sidecar.rs:172`). A live request that fails restarts the server *once*; a second failure trips it to `SubprocessOnly` for that spec, and the whole call falls through to layers 2/3. The binary probe is positive-cached per process (`sidecar_binary_resolves_cached`, :1651) so the hot path doesn't PATH-scan every utterance.

- **FP16 sticky-downgrade** lives in the sidecar layer. On Apple Silicon it launches with `--fp16`, but MPSGraph has FP16 crash signatures (`"MPSGraph"`, `"requires the same element type"`, … :35). When `classify_start_failure` (:1105) matches one, it `DowngradeToFp32`, relaunches without fp16, and **persists a fingerprint** to `parakeet-fp16-blacklist.json` (`remember_fp16_downgrade` :585) so every future run for that model/binary/gpu combo skips fp16 from the start (`apply_sticky_fp16_downgrade` :608). Resettable via `parakeet_fp16_blacklist_reset` config.

- **Layer 2 (helper)** exists purely for **crash isolation**: parakeet.cpp can SIGABRT/segfault on bad GPU states, and you don't want that taking down a recording. Running it in a throwaway `minutes parakeet-helper` child means the crash kills the child; the parent logs once (`loud_once`, :2509 — guards against the #163 silent-fallback regression where the helper's clap flags drifted from the caller's) and drops to Layer 3. It's skipped when `DecodeHints` are non-empty (real meetings usually have calendar/vocabulary hints), since the helper's JSON contract didn't carry hints — those go direct to Layer 3.

- **`sidecar_enabled_effective`** (:1631) is the gate for Layer 1: explicit `parakeet_sidecar_enabled` config wins; otherwise auto-on when the feature is compiled, the engine (batch *or* live) is parakeet, and `example-server` resolves. The live-transcript loop calls `warmup_global_sidecar` at session start (:1269) so the first utterance isn't cold.

So for the desktop app specifically: built with `parakeet`, it runs this entire chain in-process. Its `example-server`/`parakeet` binaries are resolved from PATH and `MINUTES_PARAKEET_SERVER_BINARY` / `parakeet_binary` config — the same resolution the CLI uses (`resolve_server_binary` :1219). The app and CLI share the sidecar's on-disk artifacts (socket under `~/.minutes/tmp/`, the fp16 blacklist), but **not** a running sidecar process — `global_manager()` is a per-process `OnceLock`, so the app and a concurrent CLI each spawn their own `example-server`.

Let me record the per-binary feature-gating fact, since it's the recurring source of confusion.

### assistant · 2026-06-21 06:49:06

- **→** `Write(file_path='/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/project_features_are_per_bina… [+5 chars]')`

### tool_result · 2026-06-21 06:49:07

```
File created successfully at: /Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/project_features_are_per_binary.md (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 06:49:10

- **→** `Edit(file_path='/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/MEMORY.md')`

### tool_result · 2026-06-21 06:49:10

```
The file /Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/MEMORY.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 06:49:22

Done. To close the loop on your two questions:

**The feature flag question:** The Tauri app must be rebuilt with `TAURI_FEATURES="parakeet"` to use Parakeet. Parakeet in the CLI doesn't carry over, because each binary is a *separate compilation* of `minutes-core` and the engine dispatch is `#[cfg(feature = "parakeet")]`-gated inside core (`transcribe.rs:723-727`). The runtime knob (`engine = "parakeet"` in the shared `config.toml`) only takes effect in a binary that was *compiled* with the feature.

**The CLI-vs-Tauri question:** The desktop app does **not** call the CLI for its work — that's the misconception worth discarding. Both binaries statically link `minutes-core` and do everything (record, transcribe, diarize, summarize, search) in-process by calling `minutes_core::*` directly. They only coordinate through shared files under `~/.minutes/` (PID files, the event log, the job queue, desktop-control IPC). The single place the app touches the `minutes` binary at all is the optional `minutes parakeet-helper` crash-isolation subprocess *inside* the Parakeet path — and even that requires the app to already be a Parakeet build.

A useful litmus test going forward: if a capability is **runtime** (which mic, which summarization engine, where meetings are stored), it's in `config.toml` and both front-ends pick it up automatically. If it's **compile-time** (parakeet, diarize, whisper, Metal/CUDA), every binary that should expose it has to be built with that feature — which is exactly why the build docs and CLAUDE.md keep repeating "rebuild *all* affected targets."

I saved both findings to memory (`project_three_frontends_coordination` and `project_features_are_per_binary`) so this doesn't have to be re-derived next session.

### user · 2026-06-21 07:19:33

Regarding the tauri app and the minutes cli, how could a user verify whether each has been compiled with the parakeet features?

### assistant · 2026-06-21 07:19:42

Good practical question. Let me check the exact mechanisms in code rather than guess at flag names and output.

### assistant · 2026-06-21 07:19:43

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/cli/src/main.rs')`

### tool_result · 2026-06-21 07:19:44

```
4900	fn build_capability_report() -> CapabilityReport {
4901	    // Seed the map with every feature this CLI build supports. The MCP
4902	    // server reads missing keys as "not supported", so adding a key here
4903	    // is additive and safe.
4904	    //
4905	    // Policy: when adding a new MCP-visible surface backed by a CLI
4906	    // subcommand, add its stable feature name here in the same… [+3037 chars]
```

### assistant · 2026-06-21 07:19:48

CLI side confirmed. Now let me check what the Tauri app exposes — the `cmd_desktop_capabilities` command.

### assistant · 2026-06-21 07:19:50

- **→** `Bash(command='echo "=== cmd_desktop_capabilities + any cfg!(feature=parakeet) in tauri ===" && grep -n "cmd_deskto… [+215 chars]', description='Find Tauri desktop capabilities + parakeet feature checks')`

### tool_result · 2026-06-21 07:19:50

```
=== cmd_desktop_capabilities + any cfg!(feature=parakeet) in tauri ===
7184:pub fn cmd_desktop_capabilities() -> DesktopCapabilities {
8455:            "parakeet_compiled": cfg!(feature = "parakeet"),
8621:pub async fn cmd_warm_parakeet() -> Result<serde_json::Value, String> {
8631:    #[cfg(feature = "parakeet")]
8648:    #[cfg(not(feature = "parakeet"))]
11381:        if cfg!(feature = "parakeet… [+119 chars]
```

### assistant · 2026-06-21 07:19:54

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/commands.rs')`

### tool_result · 2026-06-21 07:19:55

```
7184	pub fn cmd_desktop_capabilities() -> DesktopCapabilities {
7185	    DesktopCapabilities {
7186	        platform: current_platform().into(),
7187	        folder_reveal_label: folder_reveal_label().into(),
7188	        supports_calendar_integration: supports_calendar_integration(),
7189	        supports_call_detection: supports_call_detection(),
7190	        supports_tray_artifact_copy: support… [+1948 chars]
```

### assistant · 2026-06-21 07:19:59

`cmd_desktop_capabilities` doesn't carry parakeet. The `parakeet_compiled` flag is at line 8455 — let me read that context and the `cmd_warm_parakeet` command.

### assistant · 2026-06-21 07:20:00

- **→** `Read(file_path='/Users/rymalia/projects/minutes/tauri/src-tauri/src/commands.rs')`

### tool_result · 2026-06-21 07:20:00

```
8440	        "recording": {
8441	            "device": config.recording.device,
8442	        },
8443	        "transcription": {
8444	            "engine": config.transcription.engine,
8445	            "model": config.transcription.model,
8446	            "downloaded_models": downloaded_models,
8447	            "language": config.transcription.language,
8448	            "parakeet_model": config.tra… [+1718 chars]
```

### assistant · 2026-06-21 07:20:44

Verified both surfaces. Here's how a user checks each — and they must check each *separately*, because the two binaries are independent compilations.

## CLI — `minutes capabilities --json`

This is the canonical, scriptable check. The report includes a Cargo-feature-gated key set directly from `cfg!(feature = "parakeet")` (`main.rs:4949`):

```bash
minutes capabilities --json | jq '.features.parakeet'
# true  → this CLI binary was built with parakeet
# false → it wasn't
```

Full context if you want it: `minutes capabilities --json` emits `{version, api_version, features:{…}}`, and `features.parakeet` / `features.diarize` are the compile-time ones (everything else is always `true`).

**Caveat — "the CLI" can be ambiguous.** There may be more than one `minutes` on the machine (a `cargo install` build, a Homebrew build, and the one the app symlinks from its bundle into `~/.local/bin/minutes`). They can have different features. So pin down *which* one first:

```bash
which minutes                              # which binary is on PATH
minutes capabilities --json | jq '.version, .features.parakeet'
```

## Tauri app — Settings screen (no headless flag)

The app surfaces the same `cfg!(feature = "parakeet")` of *its own* binary through `cmd_get_settings`, under `transcription.parakeet_compiled` (`commands.rs:8455`), alongside `parakeet_status`. In practice that means: **open the app → Settings → Transcription**, and the Parakeet section reflects whether the app binary was built with the feature.

There is **no** capabilities subcommand on the app binary itself — `minutes-app` only recognizes a couple of internal early-exit flags (`--diagnose-hotkey`, `--process-queue-worker`), not a `capabilities`/`--version` probe. So the runtime self-report goes through the GUI, not the terminal. Note that `cmd_desktop_capabilities` (the other "capabilities" command) is about platform/calendar/call-detection/tray/dictation — it does **not** carry the parakeet flag; the parakeet flag lives in the settings payload.

## Two distinctions worth keeping straight

1. **Per-binary, independent.** `minutes capabilities` tells you about the CLI only; the app's Settings tells you about the app only. It's entirely possible (and a common confusion) for one to be `true` and the other `false`.

2. **"Compiled in" ≠ "ready to run."** `parakeet_compiled: true` / `features.parakeet: true` only means the binary *can* dispatch to Parakeet. Actually transcribing also needs the runtime pieces resolvable: the `parakeet` (and optionally `example-server` sidecar) C++ binaries on PATH and a downloaded Parakeet model. The app's `parakeet_status` field reports that runtime readiness; on the CLI, `minutes setup --parakeet` and `minutes health` cover it. So the complete check is "feature compiled in" **and** "runtime binaries + model present."

### user · 2026-06-21 07:30:40

Did we go deeper into the parakeet sidecar/subprocess fallback chain? What exactly does 'sidecar' mean in this context?

### assistant · 2026-06-21 07:31:06

Fair challenge — I gave you the *chain* but didn't really define what the "sidecar" itself **is**. Let me read the launch + socket-protocol internals so I can answer precisely, because "sidecar" is actually an overloaded word in this codebase.

### assistant · 2026-06-21 07:31:08

- **→** `Bash(command='echo "=== start_once + transcribe_once + connect/socket ===" && grep -n "fn start_once\\|fn transcrib… [+243 chars]', description='Find sidecar server launch and socket protocol')`

### tool_result · 2026-06-21 07:31:09

```
=== start_once + transcribe_once + connect/socket ===
31:    const HEALTHCHECK_WAV_FILENAME: &str = "parakeet-sidecar-healthcheck.wav";
400:        fn transcribe_once(
463:        fn start_once(
481:            let mut command = Command::new(&spec.server_binary);
483:                .arg(&spec.socket_path)
484:                .arg(&spec.model_path)
485:                .arg(&spec.vocab_path)
486:… [+930 chars]
```

### assistant · 2026-06-21 07:31:13

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/parakeet_sidecar.rs')`

### tool_result · 2026-06-21 07:31:13

```
463	        fn start_once(
464	            &mut self,
465	            spec: SidecarLaunchSpec,
466	            _config: &Config,
467	        ) -> Result<RunningSidecar, StartFailure> {
468	            if let Some(parent) = spec.socket_path.parent() {
469	                fs::create_dir_all(parent).map_err(|error| StartFailure {
470	                    message: format!(
471	                        "… [+3180 chars]
```

### assistant · 2026-06-21 07:31:16

Let me grab the request/response protocol over the socket to complete the picture.

### assistant · 2026-06-21 07:31:17

- **→** `Read(file_path='/Users/rymalia/projects/minutes/crates/core/src/parakeet_sidecar.rs')`

### tool_result · 2026-06-21 07:31:18

```
1000	    }
1001	
1002	    fn request_timeout(audio_duration_secs: f64, timeouts: SidecarTimeouts) -> Duration {
1003	        let scaled = Duration::from_secs_f64((audio_duration_secs * 2.0).max(0.0));
1004	        scaled.clamp(timeouts.min_request, timeouts.max_request)
1005	    }
1006	
1007	    fn request_sidecar(
1008	        socket_path: &Path,
1009	        request: &SidecarRequest,
1010… [+2027 chars]
```

### assistant · 2026-06-21 07:32:03

Yes — and your instinct is right that I described the *shape* of the chain (Layer 1 sidecar → Layer 2 helper → Layer 3 direct) and the FP16 downgrade, but I never actually defined what the sidecar **is**. Now I've read the launch and socket code, so here's the precise answer.

## "Sidecar" is overloaded in this codebase — three distinct meanings

This is almost certainly why the term feels slippery. It's used in three unrelated senses:

| Sense | Where | What it means |
|-------|-------|---------------|
| **Companion process** | `parakeet_sidecar.rs` | A long-lived helper *process* holding the model warm (the one you're asking about) |
| **Companion file** | `live-transcript-status.json`, `events.seq`, `recording-meta.json` | A small *file* written next to a primary artifact ("status sidecar") |
| **Alongside-recording transcription** | `live_transcript.rs` (`run_sidecar_inner_mpsc`, `RecordingSidecarVad`, `TranscriptSource::"recording-sidecar"`) | Live transcription running *alongside* a recording, vs a standalone live session |

In the Parakeet context it's the **first** sense — borrowed from the microservices / Kubernetes "sidecar" pattern: a secondary process that runs beside the main one to provide a supporting capability.

## What the Parakeet sidecar actually is

It's a **separate, long-lived companion process** — the `example-server` binary that ships with parakeet.cpp — that loads the Parakeet model **once** and answers transcription requests over a **Unix domain socket**, so the host (CLI or app) doesn't pay model-load cost per utterance.

**Why it has to exist (the whole motivation):** whisper-rs is *linked into* the Minutes binary, so the whisper model loads into the host process and stays resident for free. Parakeet.cpp is an **external C++ binary** — there's no in-process model. The naive approach (spawn `parakeet <model> <wav>` per utterance, which is exactly Layer 3) reloads the multi-hundred-MB model on every single call. That's tolerable for one-shot batch processing but fatal for live transcription, where you transcribe an utterance every few seconds. The sidecar fixes this: spawn the model-holding server once, then fire cheap per-utterance requests at it.

**How it's launched** (`start_once`, `parakeet_sidecar.rs:463`):
```
example-server <socket_path> <model_path> <vocab_path> --model <model_id> [--gpu] [--fp16] [--vad <path>]
```
stdout is `/dev/null`, stderr is piped into a 200-line ring buffer for diagnostics. Right after spawn it runs a **health check** — sends a `__minutes_healthcheck__` request with a tiny generated WAV; if the server isn't answering within the 30s startup timeout, it's a `StartFailure` and the call falls through to Layers 2/3.

**The wire protocol** (`request_sidecar`, `:1007`): newline-delimited JSON over the socket.
- Client `UnixStream::connect`s, writes one `SidecarRequest` line: `{request_id, audio_path, decoder, timestamps, use_vad, beam_width, lm_path, lm_weight, boost_phrases, boost_score}` — note **audio is passed by file path** (the temp WAV), not streamed as bytes.
- Reads one `SidecarResponse` line: `{ok, request_id, text, elapsed_ms, word_timestamps[], error}`.
- Per-request read timeout scales with audio length: `(duration_secs × 2).clamp(120s, 30min)` (`:1002`).

**Lifecycle / who owns it:** a process-global `OnceLock<Mutex<ParakeetSidecarManager>>` (`global_manager`, `:1246`) with the state machine `Cold → Starting → Healthy(RunningSidecar) → SubprocessOnly | Stopping`. Because it's per-process, the CLI and the desktop app each spawn and own **their own** `example-server` — they share the on-disk socket dir and fp16 blacklist file, but never a running server. It's shut down via `shutdown_global_parakeet_sidecar()` on every exit path (which is why both `main`s call it).

## So the corrected mental model of the chain

```
Layer 1  example-server (sidecar PROCESS)  ── model warm, JSON-over-Unix-socket, FP16 sticky-downgrade
   │  spawned once per host process; reused across utterances
   ▼  (spawn/health-check fails, or live request fails twice → SubprocessOnly)
Layer 2  minutes parakeet-helper (child process)  ── crash isolation, one parakeet.cpp call then exits
   ▼  (helper rejects/spawn-fails, or hints non-empty → skipped)
Layer 3  parakeet <model> <wav> (direct subprocess)  ── reloads model every call; the unconditional floor
```

The key distinction the word "sidecar" encodes: **Layer 1 is the only layer that keeps the model resident.** Layers 2 and 3 are spawn-per-utterance and reload the model each time — fine as fallbacks, but the sidecar is what makes Parakeet viable for live transcription.

### user · 2026-06-21 08:12:56

I want to clarify my mental model and determine whether I am correctly understanding all of this.

My understanding (please validate or refute or clarify):

- When we say "minutes cli", we are referring to the binary at:  `~/.local/bin/minutes`
- When we say Minutes app, Desktop app or Tauri app, we are referring to the app bundle at: `/Applications/Minutes.app`

You have referred to the minutes cli as a "clap, 55 commands" -- what does that mean, what is a "clap"?

You've also mentioned the "minutes-core (rust lib)" being a separate but common element used by both the minutes cli and the minutes app. I need that explained further.

```
`minutes-core` is the shared engine (feature-gated), and both `minutes-cli` and `minutes-app` (Tauri) link it.
```

I need these two sentences clarified:
* `There are three front-ends — the minutes CLI, the Tauri desktop app, and the MCP server — sitting on top of one shared Rust engine (minutes-core).` 
* `The CLI and Tauri app both statically link minutes-core and call it directly in-process.`

What does "link" mean in these contexts?
Is there a binary or file somewhere named "minutes-core"?
Is minutes-core a *single entity* that is commonly referenced by these 3 different front-ends or is it something *replicated* three times for each of the front-ends?

Can you think of any better ways to test my understanding of the 3 front-end + minutes-core concept model?

### assistant · 2026-06-21 08:13:40

Great questions — these get at the foundational "what is actually on disk vs. running" model, which is worth nailing down precisely. Let me ground the answer in real evidence from your machine rather than just assert it.

### assistant · 2026-06-21 08:13:44

- **→** `Bash(command='echo "=== CLI binary on PATH ===" && which minutes && ls -la "$(which minutes)" 2>/dev/null\necho ""… [+708 chars]', description='Inspect installed binaries and core rlib artifact')`

### tool_result · 2026-06-21 08:13:49

```
=== CLI binary on PATH ===
/Users/rymalia/.local/bin/minutes
-rwxr-xr-x@ 1 rymalia  staff  32201968 Jun 15 03:11 /Users/rymalia/.local/bin/minutes

=== Any other minutes binaries? ===
-rwxr-xr-x  1 rymalia  staff  32917776 Jun  4 23:41 /Users/rymalia/.cargo/bin/minutes
-rwxr-xr-x@ 1 rymalia  staff  32201968 Jun 15 03:11 /Users/rymalia/.local/bin/minutes

=== Desktop app bundle + its actual executa… [+1266 chars]
```

### assistant · 2026-06-21 08:14:27

This is perfect — your machine illustrates every concept beautifully. Notice three things already: you have **two** different `minutes` CLI binaries, the app's real executable is `minutes-app` (47 MB), and `minutes-core` exists only as `.rlib` build scraps. Let me make one more concrete comparison, then explain.

### assistant · 2026-06-21 08:14:31

- **→** `Bash(command='echo "=== The TWO CLI binaries — are they the same? ==="\necho "--- ~/.local/bin/minutes (first on PA… [+743 chars]', description='Compare two CLI binaries and show embedded core symbols')`

### tool_result · 2026-06-21 08:19:29

```
=== The TWO CLI binaries — are they the same? ===
--- ~/.local/bin/minutes (first on PATH, the active one):
minutes 0.18.6
https://github.com/silverstein/minutes/releases/tag/v0.18.6
  "version": "0.18.6",
    "diarize": true,
    "parakeet": true,

--- ~/.cargo/bin/minutes (the other one, from 'cargo install'):
minutes 0.18.5
https://github.com/silverstein/minutes/releases/tag/v0.18.5
  "version"… [+237 chars]
```

### assistant · 2026-06-21 08:20:26

Ha — the experiment even surprised me, in an instructive way. Let me walk through everything, grounded in what we just saw.

## 1. Your two path claims — both essentially right, with real nuances

**"minutes CLI" = `~/.local/bin/minutes`** ✅ — *for you, right now.* But the precise definition is "whichever `minutes` the shell finds first on your `PATH`," and you actually have **two**:

| Path | Version | Source |
|------|---------|--------|
| `~/.local/bin/minutes` | **0.18.6** | this project's `cp` install (wins — earlier on PATH) |
| `~/.cargo/bin/minutes` | **0.18.5** | an older `cargo install` |

This is the single best illustration of why I keep saying "*which* minutes?" — they're different files, different versions, and could even have had different features. `which minutes` tells you the winner. This is exactly the ambiguity to keep in mind.

**"Minutes app" = `/Applications/Minutes.app`** ✅ — but with an important detail: a macOS `.app` is **a folder, not a program**. The actual executable that runs is inside it:

```
/Applications/Minutes.app/Contents/MacOS/
├── minutes-app          ← 47 MB — THE Tauri app (this is "the desktop app")
├── minutes              ← 52 bytes — a bundled pointer to the CLI sidecar
├── calendar-events      ← helper sidecar binaries
├── mic_check
└── system_audio_record
```

So when I say "the Tauri app binary," I mean `minutes-app`. (You also have the `~/Applications/Minutes Dev.app` dev identity from CLAUDE.md, currently not populated.)

## 2. What "clap" means

**clap** = "**C**ommand **L**ine **A**rgument **P**arser." It's a popular Rust *library* (you saw it in `Cargo.toml`: `clap = { version = "4", ... }`). It's the thing that turns the raw text you type — `minutes record --title "Standup" --mode meeting` — into structured data the program can act on, and auto-generates `--help`, version output, validation, and errors.

"clap, 55 commands" was shorthand for: *the CLI uses the clap library to define its command surface, which is roughly 50+ subcommands* (`record`, `stop`, `live`, `search`, `setup`, …). The CLI's whole job is "parse what the user typed with clap, then call the right `minutes-core` function." (The exact count is fuzzy — CLAUDE.md says 45; the clap enum has ~55 including hidden maintainer commands. Don't anchor on a number.)

## 3, 4, 5 — the core concept: library crate, "link," single-vs-replicated

This is the heart of your question, so let me build it from the ground up.

**A "crate" is Rust's unit of compiled code.** There are two kinds:
- **Binary crate** → compiles to an *executable* (a program with a `main()` you can run). `minutes-cli` and `minutes-app` are binary crates.
- **Library crate** → compiles to *reusable code with no `main()`*. It **cannot run on its own** — it only exists to be used by other crates. `minutes-core` is a library crate.

**So `minutes-core` is source code, not a program.** It lives at `crates/core/` as `.rs` files. When compiled, it becomes a `.rlib` file (Rust's static-library format) — which is exactly what `find` turned up:

```
target/release/deps/libminutes_core-afe0267da8026013.rlib   ← a build intermediate
```

That `.rlib` is **not installed, not runnable, and not what you launch.** You will never see `minutes-core` in Activity Monitor — only `minutes`, `minutes-app`, and maybe `example-server`/`claude`.

**What "link" means.** Compiling a program happens in two phases: *compile* each crate to machine code, then *link* — stitch those compiled pieces together into one final executable. **"Statically link `minutes-core`"** means: at build time, the compiler **copies minutes-core's compiled machine code directly into the output binary.** The result is a self-contained executable that carries its own copy of core inside it.

So the answer to your central question:

> Is minutes-core a *single entity* referenced by the 3 front-ends, or *replicated* three times?

**Single in source, replicated in the compiled binaries.** There is exactly one `minutes-core` codebase (one folder, one version in git). But when you build, its compiled code gets **baked into each binary independently.** Your evidence shows it directly:

- `minutes` (CLI) = **32 MB** — contains its own compiled copy of core
- `minutes-app` (Tauri) = **47 MB** — contains *another* compiled copy of core, plus the Tauri/WebView/UI machinery (that's the extra ~15 MB)

There is **no shared `minutes-core` file sitting on disk that both load at runtime.** Each binary is self-sufficient.

A useful analogy: `minutes-core` is a **recipe**, and the two binaries are two **cakes** baked from it. Each cake has the recipe's ingredients baked *into* it. There's no shared bowl of batter in the fridge at dinnertime — and if you used decaf espresso (omitted the `parakeet` feature) when baking one cake, *that* cake is decaf no matter what the other one contains. **That is precisely why features are per-binary** — it's the same fact viewed from the build side.

*(The contrast, for completeness: **dynamic linking** — `.dylib`/`.so`/`.dll` files — is when one shared library file lives on disk and multiple programs load it at runtime. That *would* be "one entity referenced by three." Rust crates link statically by default, so that's not what happens here.)*

**A footnote on my failed experiment:** I tried to count `minutes_core` symbols inside each binary with `nm` and got `0` for both — which looks like it contradicts everything I just said. It doesn't. Your release builds use `strip = true` (in the workspace `Cargo.toml`), which *removes the symbol names* to shrink the binary. The code is still baked in (that's the 32 MB / 47 MB); the human-readable labels were stripped, so `nm` sees nothing. The binary **sizes** are the real proof of embedding.

## The MCP server is the asterisk

When I said "three front-ends on top of minutes-core," that's slightly loose, and worth tightening now that the model is clear:

- **CLI and Tauri app**: *link* minutes-core → each carries a compiled copy, calls it directly in-process. **No `minutes` subprocess involved.**
- **MCP server**: written in **TypeScript**, so it *cannot* link a Rust library. It does **not** contain minutes-core. Instead it **shells out to the `minutes` CLI binary** (`execFile("minutes", ["search", "--json"])`) and reads the markdown files directly. So it sits on top of core *transitively, through the CLI.*

So precisely: **two binaries embed core; the third talks to core by running the CLI.**

## 6. Better ways to test your own understanding

Here are predictive tests — if you can call the outcome before running, you've got it:

1. **Activity Monitor test.** Start a recording from the app and predict the process names you'll see. (Answer: `minutes-app`, maybe `example-server`/`claude` — *never* `minutes-core`. It's not a runnable thing.)

2. **Delete-the-CLI test.** `rm ~/.local/bin/minutes ~/.cargo/bin/minutes`. Predict: does the **app** still record and transcribe? (Yes — it embeds core, doesn't need the CLI.) Does **MCP** still work? (It degrades to read-only markdown reading and tries to auto-reinstall the CLI.) This cleanly separates which front-ends actually depend on the CLI *binary*.

3. **Feature-divergence prediction.** Suppose you `cargo build --features parakeet` the CLI but build the app *without* `TAURI_FEATURES="parakeet"`, and set `engine = "parakeet"` in the shared `config.toml`. Predict each: `minutes record` → ✅ transcribes; the app → ❌ `EngineNotAvailable`. (You already understood this — it's the same "decaf cake" fact.)

4. **Binary-size reasoning.** Explain *why* `minutes-app` (47 MB) is bigger than `minutes` (32 MB), given both embed core. (Tauri + WebView + the bundled UI assets.)

5. **The "two CLIs" check** (you can run this now): `~/.local/bin/minutes --version` vs `~/.cargo/bin/minutes --version` → 0.18.6 vs 0.18.5. If you understand *why two binaries can report different versions and even different features*, you've internalized "replicated, not shared."

6. **The naming test.** Question: "Where is the `minutes-core` executable installed?" Correct answer: *trick question — there isn't one.* It's a library; it only ever exists as source (`crates/core/`) and as `.rlib` build intermediates that get baked into the two binaries.

Want me to actually run test #2 or #5 against a throwaway copy, or diagram the build→link→run flow visually? I can also show the exact `Cargo.toml` lines where each binary "pulls in" core, if seeing the dependency declaration would help cement it.

### user · 2026-06-21 08:37:27

So at what level is versioning set? It feels obvious to me there would be a version number for the `minutes-core`, and it could be possible for `minutes-app` and `minutes-cli` to be out of sync if they were compiled at different times and each have linked different versions of `minutes-core` - is that correct? Then within this specific project repo, do they publish version numbers at the `minutes-core` level and also for  `minutes-app` and `minutes-cli`?

And diagram the build→link→run flow visually

### assistant · 2026-06-21 08:37:54

Let me verify the actual version wiring in the repo rather than reason from memory — the Tauri side in particular has a subtlety.

### assistant · 2026-06-21 08:37:59

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== workspace version (the single source of truth) ==="\ngre… [+907 chars]', description='Verify version declarations across all crates')`

### tool_result · 2026-06-21 08:38:06

```
=== workspace version (the single source of truth) ===
version = "0.18.14"

=== core: how it declares its version ===
version.workspace = true

=== cli: its own version + the version it REQUIRES of core ===
version.workspace = true
whisper = ["minutes-core/whisper"]
diarize = ["minutes-core/diarize", "dep:pyannote-rs", "dep:ort", "dep:symphonia"]
parakeet = ["minutes-core/parakeet"]
# Streaming Si… [+1029 chars]
```

### assistant · 2026-06-21 08:39:00

All confirmed. Here's the complete picture.

## At what level is versioning set?

**One number, at the workspace level — and core/CLI/app are deliberately locked to it, not versioned independently.**

```
Cargo.toml  [workspace.package]  version = "0.18.14"   ← THE single source of truth
   │
   ├── crates/core   version.workspace = true   → 0.18.14   (minutes-core)
   ├── crates/cli    version.workspace = true   → 0.18.14   (minutes-cli)
   └── tauri/src-tauri  version = "0.1.0"  ← vestigial, ignore it
              the REAL app version lives in tauri.conf.json → 0.18.14
```

So your intuition is right that `minutes-core` *has* a version number — but it's **not bumped on its own cadence.** It inherits the one workspace version. core, cli, and the app all move together as 0.18.14. (The Tauri Cargo crate's `0.1.0` is a throwaway internal number nobody sees; the user-facing app version is in `tauri.conf.json`, which the release checklist keeps synced to 0.18.14 by hand.)

**The one deliberate exception:** `whisper-guard` (0.3.0) is the sub-crate that "ships on its own cadence" — it's the only piece versioned and published independently. Everything else is unified.

There's also a wrinkle worth pointing out so it doesn't confuse you later: the CLI declares its dependency on core as `{ path = "../core", version = "0.18.6", ... }`. That `version = "0.18.6"` is **not** what gets linked — it's a *minimum-version constraint* that only matters if core were pulled from crates.io. For a `path` dependency, Cargo always uses the local source (currently 0.18.14) and the constraint is just a floor (and here it's a slightly stale floor — harmless).

## Can the app and CLI be out of sync? Two different axes — and the answer differs

**Axis 1 — within a single repo checkout: No, they cannot diverge.** Both the CLI and the app depend on core via a **`path =` dependency** pointing at the *same* `crates/core/` folder. At any given commit there is exactly one `minutes-core` source on disk, so both binaries compile and link the **identical** core. You can't build a CLI and an app from the same tree and have them embed different core versions — it's structurally impossible.

**Axis 2 — across different build times / install channels: Yes, absolutely — and your machine is living proof.** This is the real version-drift, and it's exactly the divergence you're intuiting, just located at the *install* axis rather than the *linking* axis:

- Your two CLIs: `~/.local/bin/minutes` = **0.18.6**, `~/.cargo/bin/minutes` = **0.18.5** — built from two different commits at two different times.
- Your installed app (`/Applications/Minutes.app`) was built **Jun 2**; a CLI you `cargo build` today would be newer still.

The app and CLI update through **separate channels** — the app via its in-app updater / DMG, the CLI via `cp`/`cargo install`/`brew`. Nothing keeps the *installed artifacts* in lockstep, so they routinely drift. (This is a known operational fact for this project: after an in-app update you re-sync the CLI separately, e.g. `brew upgrade minutes`.)

So the precise statement: **same source tree → always identical core; different build/install moments → freely divergent.** The repo guarantees consistency at build time; it does *not* guarantee it across whatever you happen to have installed.

## The build → link → run flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. SOURCE  (one repo checkout @ commit X — everything is version 0.18.14)    │
│                                                                               │
│   crates/core/   ──┐  library crate (no main(), can't run)                    │
│     *.rs           │                                                          │
│   crates/cli/   ───┤  binary crate ─ depends on core via  path="../core"      │
│     main.rs (clap) │                                                          │
│   tauri/src-tauri/─┘  binary crate ─ depends on core via  path="../../core"   │
│     main.rs           ▲                                                        │
│                       └── BOTH point at the SAME core folder → same version   │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                     │  cargo build  (release: strip=true)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. COMPILE   each crate → machine code                                       │
│                                                                               │
│   core   → libminutes_core-<hash>.rlib   (static library, in target/deps/)    │
│            ⚠ a build intermediate — never installed, never run                │
│   cli    → object code (with its own copy of core's feature flags)            │
│   app    → object code  +  Tauri / WebView / UI assets                        │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                     │  LINK = copy core's compiled code
                                     │  INTO each binary (static linking)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. LINKED BINARIES   (self-contained — each carries its OWN baked-in core)   │
│                                                                               │
│   target/release/minutes        32 MB  = [ cli code | COPY of core ]          │
│   target/release/minutes-app    47 MB  = [ app code | COPY of core | Tauri ]  │
│                                              ▲ two independent copies          │
└──────────────────┬────────────────────────────────────────┬───────────────────┘
        cp / cargo / brew                          cargo tauri build + install
                   ▼                                          ▼
┌──────────────────────────────────┐      ┌──────────────────────────────────────┐
│  4a. INSTALL (CLI)               │      │  4b. INSTALL (App)                    │
│  ~/.local/bin/minutes  (0.18.6)  │      │  /Applications/Minutes.app/           │
│  ~/.cargo/bin/minutes  (0.18.5)  │      │    Contents/MacOS/minutes-app         │
│   ↑ separate channel,            │      │   ↑ separate channel (in-app updater) │
│     can drift in version         │      │     can drift in version              │
└──────────────────┬───────────────┘      └──────────────────┬───────────────────┘
                   ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. RUN   (what you'd see in Activity Monitor)                                │
│                                                                               │
│   `minutes record`        → process: minutes          ─┐ each calls its OWN   │
│   click Record in the app → process: minutes-app      ─┘ embedded core        │
│   (parakeet warm path)    → child process: example-server                     │
│                                                                               │
│   ✗ there is NO "minutes-core" process — it's library code, baked in          │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────────────┐
   │  MCP server (the asterisk): TypeScript, does NOT embed core.              │
   │  It SHELLS OUT →  execFile("minutes", ["search","--json"])  ──► whichever  │
   │  `minutes` is on PATH (so it inherits THAT binary's version + features).   │
   └──────────────────────────────────────────────────────────────────────────┘
```

The two ideas to anchor on:

- **Steps 1–2 guarantee consistency:** one source, `path` deps, one workspace version → both binaries embed identical core. No within-tree drift.
- **Steps 4–5 allow drift:** the *installed* CLI and app are independent artifacts on independent update channels, so what you actually have running can be different versions (your 0.18.5 / 0.18.6 / Jun-2-app trio). And the MCP server has no version of its own at the core level — it borrows whatever CLI it finds on PATH.

Want me to render this as a polished HTML diagram you can keep open alongside the code, or is the ASCII version enough?

### user · 2026-06-21 08:39:01

yes, please be strict about always grounding all references to the real codebase and not "in theory"

### assistant · 2026-06-21 08:39:15

Understood — and I'll treat that as a standing instruction: every claim grounded in the actual files, no "in theory." Let me first verify the one thing in my diagram I hand-waved (the 52-byte `minutes` in the app bundle), then render the HTML and record your grounding preference.

### assistant · 2026-06-21 08:39:19

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== What IS the 52-byte minutes in the app bundle? (I calle… [+519 chars]', description='Verify bundle sidecar, strip setting, MCP shell-out')`

### tool_result · 2026-06-21 08:39:23

```
=== What IS the 52-byte minutes in the app bundle? (I called it a 'pointer' — verify) ===
/Applications/Minutes.app/Contents/MacOS/minutes: POSIX shell script text executable, ASCII text
--- raw contents:
#!/bin/sh
echo 'minutes CLI placeholder' >&2
exit 1


=== Confirm release strip setting (claimed strip=true) ===
[profile.release]
strip = true
lto = "thin"


=== Confirm MCP shells out to the mi… [+265 chars]
```

### assistant · 2026-06-21 08:39:42

Important correction caught by your instruction: the 52-byte bundle file is **not** "a pointer to the CLI sidecar" as I claimed — `file` reports it's a placeholder shell script that prints `minutes CLI placeholder` and `exit 1`. So in *this* installed app (built Jun 2), there is no real bundled CLI; it's a stub. That's exactly the kind of "sounds right but isn't" claim your grounding rule is meant to catch. Let me record the preference and render the verified diagram.

### assistant · 2026-06-21 08:39:49

- **→** `Write(file_path='/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/feedback_ground_in_real_codeb… [+6 chars]')`

### tool_result · 2026-06-21 08:39:50

```
File created successfully at: /Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/feedback_ground_in_real_codebase.md (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 08:39:53

- **→** `Edit(file_path='/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/MEMORY.md')`

### tool_result · 2026-06-21 08:39:54

```
The file /Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/memory/MEMORY.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 08:39:56

Now let me render the verified diagram as HTML.

### assistant · 2026-06-21 08:39:57

- **→** `Skill(skill='visual-explainer')`

### tool_result · 2026-06-21 08:39:58

```
Launching skill: visual-explainer
```

### assistant · 2026-06-21 08:40:05

I'll build this as a flow diagram. Let me read the relevant template and patterns first, per the skill.

### assistant · 2026-06-21 08:40:05

- **→** `Read(file_path='/Users/rymalia/.claude/skills/visual-explainer/templates/mermaid-flowchart.html')`

### tool_result · 2026-06-21 08:43:36

```
1	<!DOCTYPE html>
2	<html lang="en">
3	<head>
4	<meta charset="UTF-8">
5	<meta name="viewport" content="width=device-width, initial-scale=1.0">
6	<title>CI/CD Pipeline — Reference Template</title>
7	<!--
8	  Reference template for the visual-explainer skill: Mermaid diagrams.
9	  Teal/cyan palette — distinctly different from terracotta (architecture)
10	  and rose (data-table) templates so agents… [+14572 chars]
```

### assistant · 2026-06-21 08:44:28

Template patterns absorbed. Now I'll build the page — blueprint aesthetic, every node and table cell traceable to a verified file read or shell command from this session.

### assistant · 2026-06-21 08:45:57

- **→** `Write(file_path='/Users/rymalia/.agent/diagrams/minutes-build-link-run.html')`

### tool_result · 2026-06-21 08:47:50

```
File created successfully at: /Users/rymalia/.agent/diagrams/minutes-build-link-run.html (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 08:47:54

- **→** `Bash(command='open ~/.agent/diagrams/minutes-build-link-run.html && echo "opened"', description='Open diagram in browser')`

### tool_result · 2026-06-21 08:48:00

```
opened
```

### assistant · 2026-06-21 08:48:12

Opened in your browser:

**`~/.agent/diagrams/minutes-build-link-run.html`**

The page has four parts, all grounded in this session's file reads and shell commands:

1. **The build → link → run flowchart** (Mermaid, zoomable) — five stages: SOURCE (one checkout, all 0.18.14) → COMPILE (`.rlib`) → LINK (core copied *into* each binary) → INSTALL (separate channels) → RUN (process names). The MCP server hangs off to the side, shelling out to whichever `minutes` is on PATH.

2. **Verified evidence table** — every claim traced to its source: `crates/core/Cargo.toml`, the `.rlib` artifacts, the two CLI byte-sizes/versions (32,201,968 B / 0.18.6 and 32,917,776 B / 0.18.5), the 46,967,968 B `minutes-app`, the `transcribe.rs:330/673/723` parakeet gate, and the MCP `execFile` shell-out.

3. **Version-source table** — workspace `0.18.14` as the single source of truth, the vestigial `0.1.0` Tauri Cargo version vs. the real `tauri.conf.json` `0.18.14`, and `whisper-guard` (`0.3.0`) as the lone independent-cadence crate.

4. **The two divergence axes** — within one checkout (can't diverge) vs. across install moments (your 0.18.6 / 0.18.5 / Jun-2-app trio proves it does).

Two corrections this round, both from your grounding rule:
- The bundle's `minutes` is a **52-byte placeholder shell script** (`echo 'minutes CLI placeholder'; exit 1`), not a real bundled CLI — so I withdrew my earlier "bundled pointer to the sidecar" claim. The page states it plainly.
- The `nm` check showed **0 core symbols** — not a contradiction, but because `strip = true` in the release profile removes symbol names; the 32/47 MB sizes are the real proof of embedding. That nuance is now in the evidence table.

I also saved your grounding preference to memory (`feedback_ground_in_real_codebase`) so it carries into future sessions. The footer notes that the byte sizes/versions reflect what's *installed on this machine*, not repo HEAD.

### user · 2026-06-21 09:02:01

Now diagram the parakeet sidecar fallback chain visually

### assistant · 2026-06-21 09:03:05

Same grounding discipline — every node and line below traces to `transcribe.rs` or `parakeet_sidecar.rs`, which I read directly. Let me build it (Dracula-inspired this time, to vary the aesthetic).

### assistant · 2026-06-21 09:04:36

- **→** `Write(file_path='/Users/rymalia/.agent/diagrams/minutes-parakeet-fallback.html')`

### tool_result · 2026-06-21 09:04:37

```
File created successfully at: /Users/rymalia/.agent/diagrams/minutes-parakeet-fallback.html (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 09:04:41

- **→** `Bash(command='open ~/.agent/diagrams/minutes-parakeet-fallback.html && echo "opened"', description='Open parakeet fallback diagram in browser')`

### tool_result · 2026-06-21 09:04:52

```
opened
```

### assistant · 2026-06-21 09:05:05

Opened in your browser:

**`~/.agent/diagrams/minutes-parakeet-fallback.html`**

Two linked Mermaid diagrams plus three reference tables, every node and line traced to code I read this session:

1. **The fallback chain** — from the `engine == "parakeet"` gate (`transcribe.rs:330`) and the `#[cfg(feature)]` check (`:673/:723`), through the chunking decision, into `transcribe_with_parakeet` (`:1802`), then the three layers in order: **Layer 1** warm sidecar (`transcribe_via_global_sidecar :1251`) → **Layer 2** crash-isolated `minutes parakeet-helper` (`:1931`) → **Layer 3** direct `parakeet` subprocess. The `Err → warn "falling back"` and `non-zero → log_once → L3` edges are the actual fall-through transitions.

2. **The sidecar state machine** — `Cold → Starting → Healthy`, with the two failure exits: the **FP16 crash signature → DowngradeToFp32 → relaunch** loop (`classify_start_failure :1105`, `remember_fp16_downgrade :585`) and `→ SubprocessOnly` (which is what hands control back to Layers 2/3).

3. **Reference tables** — binary/helper resolution order for each layer (`resolve_server_binary :1219`, `resolve_minutes_parakeet_helper :2462`, `parakeet.rs:227`), and the verified timeout constants (startup 30s, connect 3s, fp16 window 60s, request 120s–30min) plus the per-process `OnceLock<Mutex>` ownership.

Two grounded callouts: the **socket protocol** (newline-delimited JSON, audio passed by path, `request_sidecar :1007`) and the **FP16 sticky-downgrade**. And a closing note reiterating that "sidecar" here means *only* the Layer-1 companion process — distinct from the codebase's other two uses of the word (companion files; the recording-sidecar live mode).

One honesty note on precision: the top-level layer/function line numbers (330, 673, 723, 1802, 1251, 1925, 2462, 1219, 1105, 585) and the constants are all from direct reads. A few sub-line refs inside the helper fall-through (e.g. the `log_*_once :1978`) are approximate to the block I read around lines 1966–2020 rather than exact — if you want, I can pin those to the precise lines.

### user · 2026-06-21 20:55:50

Great deep-dive information all stemming from an inital "/claude-mem:learn-codebase" call. Now package all of this up into a robust reference document we can look back on.

### assistant · 2026-06-21 20:56:08

A reference document is the right capstone. Let me check the `docs/` conventions so it lands in the right place and doesn't clobber anything.

### assistant · 2026-06-21 20:56:11

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== existing architecture-ish docs ===" && ls docs/ | grep… [+309 chars]', description='Check docs conventions and existing architecture docs')`

### tool_result · 2026-06-21 21:20:06

```
=== existing architecture-ish docs ===
CLI-DUAL-SOURCE-CAPTURE-PLAN.md
COWORK-RESEARCH.md
designs
DESKTOP-CONTEXT-RUNTIME-CHECKLIST.md
DESKTOP-DEVELOPMENT.md
PLAN-bundle-cli-in-app.md

=== top-level doc files for naming convention ===
docs/AGENT-INTEGRATIONS.md
docs/APPLE_SPEECH.md
docs/audio-devices.md
docs/AUTO-UPDATE-EVALUATION.md
docs/CALL-CAPTURE-DURABLE-PLAN.md
docs/CALL-CAPTURE-HANDOFF-2026… [+895 chars]
```

### assistant · 2026-06-21 21:20:22

No existing `ARCHITECTURE.md` — and the convention is `UPPERCASE-HYPHENATED.md`. I'll write the canonical `docs/ARCHITECTURE.md`, grounded with file:line references throughout and linking the two diagrams.

### assistant · 2026-06-21 21:22:44

- **→** `Write(file_path='/Users/rymalia/projects/minutes/docs/ARCHITECTURE.md')`

### tool_result · 2026-06-21 21:22:45

```
File created successfully at: /Users/rymalia/projects/minutes/docs/ARCHITECTURE.md (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 21:22:55

Now let me make the package self-contained by copying the two diagrams into the repo alongside the doc, and point the doc at the repo copies.

### assistant · 2026-06-21 21:22:56

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\nmkdir -p docs/diagrams\ncp ~/.agent/diagrams/minutes-build-link-ru… [+110 chars]', description='Copy diagrams into repo docs/diagrams')`

### tool_result · 2026-06-21 21:22:56

```
total 136
drwxr-xr-x   5 rymalia  staff    160 Jun 21 14:22 .
drwxr-xr-x  47 rymalia  staff   1504 Jun 21 14:22 ..
-rw-r--r--@  1 rymalia  staff  17675 May 15 13:40 minutes-architecture.html
-rw-r--r--@  1 rymalia  staff  21585 Jun 21 14:22 minutes-build-link-run.html
-rw-r--r--@  1 rymalia  staff  21332 Jun 21 14:22 minutes-parakeet-fallback.html
```

### assistant · 2026-06-21 21:23:00

There's already a `docs/diagrams/` directory (with a prior `minutes-architecture.html`). Let me update the doc's diagram links to point at the repo copies.

### assistant · 2026-06-21 21:23:03

- **→** `Edit(file_path='/Users/rymalia/projects/minutes/docs/ARCHITECTURE.md')`

### tool_result · 2026-06-21 21:23:03

```
The file /Users/rymalia/projects/minutes/docs/ARCHITECTURE.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 21:23:21

Packaged. Everything from this deep dive is now consolidated into a durable, version-controllable reference in the repo.

## What was created

| Artifact | Location | What it is |
|----------|----------|------------|
| **Architecture reference** | `docs/ARCHITECTURE.md` | 14-section markdown reference, grounded with `file:line` throughout |
| **Diagram 1** | `docs/diagrams/minutes-build-link-run.html` | Build → link → run + three front-ends (copied into repo) |
| **Diagram 2** | `docs/diagrams/minutes-parakeet-fallback.html` | Parakeet fallback chain + sidecar state machine (copied into repo) |

The doc links to both diagrams via repo-relative paths, so the whole package travels together and is self-contained.

## What `docs/ARCHITECTURE.md` covers

1. The one-paragraph mental model
2. The three front-ends + `minutes-core` (crate table)
3. Build → link → run (library vs binary crate, static linking, single-source/replicated)
4. Versioning (workspace-level, the two divergence axes, whisper-guard's independent cadence)
5. The coordination layer — `pid.rs`, `desktop_control.rs`, `events.rs`, `jobs.rs`
6. The async `record` / sync `process` split
7. The processing pipeline (11 stages)
8. The live/streaming subsystem
9. Transcription engines + the **Parakeet 3-layer fallback chain**, sidecar state machine, FP16 sticky-downgrade, socket protocol
10. Diarization + L0–L3 speaker attribution
11. Summarization + structured extraction
12. The MCP server (capabilities contract, recording delegation)
13. Compile-time features per-binary + **how to verify** each binary
14. Key file map

A few deliberate choices worth flagging:
- **Grounding held throughout** — every structural claim carries a `file:line`, and the doc states up front that line numbers are "start reading here," approximate to 0.18.14 and drift over time. The corrected facts from earlier (the 52-byte bundle stub, the `strip = true` reason `nm` shows 0 symbols) are baked in.
- **`docs/diagrams/` already existed** (there's a prior `minutes-architecture.html` from May 15) — so I added to it rather than inventing a new convention.
- I followed your git restriction — **nothing committed**. When you're ready, a suggested commit message:

```
docs: add architecture reference + build/parakeet diagrams

Add docs/ARCHITECTURE.md — a grounded deep-dive reference covering the
three front-ends (CLI/Tauri/MCP) over minutes-core, the ~/.minutes
coordination layer, the record/process async split, the pipeline, the
live/streaming subsystem, the Parakeet sidecar fallback chain, versioning,
and per-binary compile-time features. Include two interactive HTML diagrams
under docs/diagrams/.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01TBqU7PBPbXfT8sRoi8md7z
```

Want me to add a link to `docs/ARCHITECTURE.md` from the project structure section of `CLAUDE.md` (or the README you have open) so it's discoverable, or run `/session-summary` to close out the session per your workflow?

### user · 2026-06-21 21:32:12

Please add a frontmatter section to your `docs/ARCHITECTURE.md` file to record at least the date of this assessment and any other relevant info you think should be included.

/init please create file `CLAUDE.local.md` for our use -- this repo contains a committed `CLAUDE.md` which essentially makes it an uneditable file for us so let's use a local override for our needs.
Then you can add a link to `docs/ARCHITECTURE.md` as you suggested.

### assistant · 2026-06-21 21:32:47

I'll honor the `/init` command, then adapt it to your explicit need (a local `CLAUDE.local.md` override rather than touching the committed `CLAUDE.md`).

### assistant · 2026-06-21 21:32:47

- **→** `Skill(skill='init')`

### tool_result · 2026-06-21 21:32:47

```
Launching skill: init
```

### assistant · 2026-06-21 21:33:14

The init skill targets `CLAUDE.md`, but per your explicit instruction I'll create a lean **`CLAUDE.local.md`** override instead — not duplicating the committed `CLAUDE.md`, just adding local-use guidance and the `docs/ARCHITECTURE.md` link. Let me gather a couple of facts first (ignore status + commit for frontmatter).

### assistant · 2026-06-21 21:33:17

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== is CLAUDE.local.md already git-ignored? ==="\ngit check-… [+479 chars]', description='Check ignore status and git metadata')`

### tool_result · 2026-06-21 21:47:06

```
=== is CLAUDE.local.md already git-ignored? ===
→ NOT ignored yet

=== does .gitignore mention CLAUDE.local / *.local.md ? ===
1:# Local working docs (not for repo)
2:.claude/*.local.md
3:.claude/*.local.json
4:.claude/extension-stats/
6:# Internal planning/review artifacts (keep local)
9:# Local bd export state
19:# was switched to .claude/plugins/minutes/ in commit 270839d (Mar 24). The
20:# can… [+454 chars]
```

### assistant · 2026-06-21 21:47:33

`CLAUDE.local.md` isn't covered by `.gitignore` (it only ignores `.claude/*.local.md`). To keep it truly local without modifying the committed `.gitignore`, I'll add it to `.git/info/exclude` (per-clone, never committed). Doing all three tasks now:

### assistant · 2026-06-21 21:47:38

- **→** `Edit(file_path='/Users/rymalia/projects/minutes/docs/ARCHITECTURE.md')`

### tool_result · 2026-06-21 21:47:38

```
The file /Users/rymalia/projects/minutes/docs/ARCHITECTURE.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 21:47:40

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\n# Keep CLAUDE.local.md local-only without touching the committed… [+334 chars]', description='Add CLAUDE.local.md to local git exclude')`

### tool_result · 2026-06-21 21:48:09

```
=== .git/info/exclude tail ===

# Local Claude override (not for repo)
CLAUDE.local.md

=== confirm it's now ignored ===
CLAUDE.local.md
→ IGNORED ✓
```

### assistant · 2026-06-21 21:48:13

Frontmatter added and `CLAUDE.local.md` is now locally ignored. Now creating the file itself:

### assistant · 2026-06-21 21:48:26

- **→** `Write(file_path='/Users/rymalia/projects/minutes/CLAUDE.local.md')`

### tool_result · 2026-06-21 21:48:27

```
File created successfully at: /Users/rymalia/projects/minutes/CLAUDE.local.md (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 21:48:41

All three done.

| Task | Result |
|------|--------|
| **Frontmatter on `docs/ARCHITECTURE.md`** | YAML block with `date: 2026-06-21`, `assessed_version: 0.18.14`, `assessed_commit: 8a45434`, `branch: main`, the assessment method, companion-diagram paths, and a line-number-drift caveat |
| **`CLAUDE.local.md` created** | Lean local override — explains its relationship to the committed `CLAUDE.md`, links `docs/ARCHITECTURE.md` + both diagrams, and carries a "fast facts" cheat-sheet plus your grounding preference |
| **Kept it truly local** | Added `CLAUDE.local.md` to `.git/info/exclude` (per-clone, never committed) rather than editing the committed `.gitignore`; confirmed `git check-ignore` now flags it |

A few deliberate choices worth noting:

- **Why `.git/info/exclude`, not `.gitignore`:** `.gitignore` only ignores `.claude/*.local.md`, not a root-level `CLAUDE.local.md`. Editing `.gitignore` would itself be a committed change affecting everyone. `.git/info/exclude` keeps the override genuinely yours.
- **Didn't touch the committed `CLAUDE.md`** — exactly as you asked. `CLAUDE.local.md` is additive; it explicitly defers build/test/release/git rules to the committed file and only adds local context + the architecture pointer. Future Claude Code instances auto-load `CLAUDE.local.md` alongside `CLAUDE.md`, so the link and fast-facts will be in context automatically.
- **No duplication** — per the init skill's guidance, I avoided re-listing commands or file trees that already live in `CLAUDE.md` / `docs/ARCHITECTURE.md`.

Since `docs/ARCHITECTURE.md` and `docs/diagrams/*.html` *are* committable (they're real repo docs) while `CLAUDE.local.md` is not, a suggested commit for just the shareable artifacts:

```
docs: add architecture reference + build/parakeet diagrams

Add docs/ARCHITECTURE.md (with assessment frontmatter) — a grounded
deep-dive covering the three front-ends over minutes-core, the ~/.minutes
coordination layer, the record/process async split, the pipeline, the
live/streaming subsystem, the Parakeet sidecar fallback chain, versioning,
and per-binary compile-time features. Include two interactive HTML diagrams
under docs/diagrams/.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01TBqU7PBPbXfT8sRoi8md7z
```

Want me to run `/session-summary` to close out per your workflow?

### user · 2026-06-21 21:52:26

<command-message>session-tools:session-summary</command-message>
<command-name>/session-tools:session-summary</command-name>

### assistant · 2026-06-21 21:52:29

I'll gather the metadata, then write the summary.

### assistant · 2026-06-21 21:52:31

- **→** `Bash(command='bash "$SESSION_TOOLS_ROOT/scripts/collect-metadata.sh" 2>/dev/null || { echo "FALLBACK"; echo "now:… [+252 chars]', description='Collect session metadata and timestamps')`

### tool_result · 2026-06-21 21:52:34

```
now: 2026-06-21 02:52 PM PDT
project: minutes
branch: main
open_prs: []
---
START: 2026-06-20 11:08 PM PDT
RESUME: 
SID: 17279b0b-265a-4b18-87fa-6661125e349f
```

### assistant · 2026-06-21 21:53:26

- **→** `Write(file_path='/Users/rymalia/projects/minutes/docs/session-summary-2026-06-21-architecture-deep-dive.md')`

### tool_result · 2026-06-21 21:53:26

```
File created successfully at: /Users/rymalia/projects/minutes/docs/session-summary-2026-06-21-architecture-deep-dive.md (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 21:53:36

Session summary written to **`docs/session-summary-2026-06-21-architecture-deep-dive.md`**.

Metadata captured from the collection script and SessionStart env:
- **session_id:** `17279b0b-265a-4b18-87fa-6661125e349f`
- **time:** 2026-06-20 11:08 PM PDT – 2026-06-21 2:52 PM PDT (spanned two dates, so both are shown)
- **branch** omitted (`main`), **resumed** omitted (not resumed), **related_pr** omitted (no open PRs)

The summary scales to the session's arc — a `learn-codebase` deep dive that resolved your CLI-vs-Tauri mental model and produced durable artifacts. It includes the optional **Discoveries / Handoff Notes** and **Current State** sections because the session had non-obvious findings worth preserving (the placeholder-stub correction, the `strip=true` reason `nm` shows 0 symbols, the per-binary feature gating, the workspace versioning model) and an uncommitted-files state worth recording for handoff.

This closes out the session. The committable docs (`docs/ARCHITECTURE.md`, the two `docs/diagrams/*.html`, and the two session-summary files) are staged in your working tree for whenever you want to commit them; `CLAUDE.local.md` stays local. Nothing was committed, per the repo's git rule.

### user · 2026-06-21 22:11:48

Great session. Now what I want to do is switch to our 'dev' branch and commit all of these files there, instead of on main. Can you assist me with that so that I don't lose any files in that process? And my dev branch is out of sync with main so we may want to do some syncing or merging there within this process, I really am unsure

### assistant · 2026-06-21 22:12:17

Git branch work with uncommitted files is exactly where things get lost, so let me investigate the real state first before touching anything — and per the repo rule, I won't run `git commit` myself; I'll get everything staged-and-ready and hand you the exact commands. Also worth noting: your memory flags a Parakeet WIP **stash** and a `parakeet-install-rewrite` branch on hold, so I'll check those aren't disturbed.

### assistant · 2026-06-21 22:12:20

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== STATUS (untracked + modified) ==="\ngit status --short\ne… [+461 chars]', description='Investigate working tree, branches, stashes')`

### tool_result · 2026-06-21 22:12:57

```
=== STATUS (untracked + modified) ===
?? AGENTS.override.md
?? PATHFINDER-2026-06-21/
?? docs/ARCHITECTURE.md
?? docs/diagrams/minutes-build-link-run.html
?? docs/diagrams/minutes-parakeet-fallback.html
?? docs/replay-17279b0b-full.md
?? docs/replay-17279b0b.md
?? docs/session-summary-2026-06-20-stash-main-sync-parakeet-backup.md
?? docs/session-summary-2026-06-21-architecture-deep-dive.md
?? docs… [+3963 chars]
```

### assistant · 2026-06-21 22:13:19

Lots of important context here. Before anything: there are **more untracked files than just this session's work** (e.g. `AGENTS.override.md`, `PATHFINDER-2026-06-21/`, `docs/replay-*.md`, a `pathfinder-core-audit` summary), plus your Parakeet WIP stash is intact and untouched. Let me map the dev↔main divergence before proposing a plan.

### assistant · 2026-06-21 22:13:25

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== divergence count (main <<left | right>> dev) ==="\ngit r… [+959 chars]', description='Analyze dev vs main divergence and path conflicts')`

### tool_result · 2026-06-21 22:13:44

```
=== divergence count (main <<left | right>> dev) ===
47	7
  (left = commits on main not in dev | right = commits on dev not in main)

=== what does dev have that main does NOT (dev only) ===
f041c9f Merge branch 'silverstein:main' into dev
57756b5 Merge branch 'silverstein:main' into dev
91f29d0 docs: committing parakeet doc, as-is, incomplete
d5119a3 docs: add session summary for CLI/app version… [+4034 chars]
```

### assistant · 2026-06-21 22:14:37

Now I have the full topology. Here's the situation before we touch anything:

**Branch divergence:** `dev` is **47 commits behind and 7 ahead** of `main` (common ancestor `a564cbd`, ~0.18.7-era).
- `dev`'s 7 unique commits are all **docs** (a parakeet rewrite, session summaries, catch-up commits).
- `main`'s 47 are the real feature/release work (0.18.8 → 0.18.14).
- ⚠️ Overlap risk: `dev` has `f69ffb7 docs(parakeet): rewrite install guide…` and `main` has the merged `8a45434 …(#250)` — **the same parakeet-doc work in two forms**, so a merge will likely conflict on `docs/PARAKEET.md`.
- `dev` == `origin/dev` (in sync), and all 4 of this session's target paths are **absent on dev** → switching is safe, no file loss.

Before I stage anything, let me ground the *other* untracked files (not from this session) so we know what we're deciding about.

### assistant · 2026-06-21 22:14:42

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== unknown untracked items — what are they? ==="\nfor f in… [+497 chars]', description='Inspect unknown untracked files')`

### tool_result · 2026-06-21 22:17:02

```
=== unknown untracked items — what are they? ===
--- AGENTS.override.md (      16 lines):
# Local Agent Override

This file is for local agent coordination in this checkout. The committed

--- docs/replay-17279b0b.md (     349 lines):
# Session replay: `17279b0b-265a-4b18-87fa-6661125e349f`

- **main**: `/Users/rymalia/.claude/projects/-Users-rymalia-projects-minutes/17279b0b-265a-4b18-87fa-666112… [+1071 chars]
```

### assistant · 2026-06-21 22:17:33

I now have everything mapped. Here's the full inventory of untracked files, sorted by origin:

**This session's deliverables (4):** `docs/ARCHITECTURE.md`, `docs/diagrams/minutes-build-link-run.html`, `docs/diagrams/minutes-parakeet-fallback.html`, `docs/session-summary-2026-06-21-architecture-deep-dive.md`

**From other work (not this session):**
- `AGENTS.override.md` — self-describes as a "Local Agent Override … for local agent coordination in this checkout" → it's the `AGENTS.md` analog of `CLAUDE.local.md`, i.e. meant to stay **local**, not committed.
- `PATHFINDER-2026-06-21/` + `docs/session-summary-2026-06-21-pathfinder-core-audit.md` — output of a separate Codex "pathfinder" audit.
- `docs/replay-17279b0b.md` (349 lines) + `docs/replay-17279b0b-full.md` (4,378 lines) — replay transcript dumps of this session.
- `docs/session-summary-2026-06-20-…md` — last session's summary.

Confirmed: **no modified tracked files** (only untracked), so switching to `dev` needs no stash and won't lose anything — git carries untracked files across the switch, and none of our paths exist on `dev`.

Two decisions are genuinely yours, and committing to a shared branch (`origin/dev` exists) is awkward to undo — so let me confirm scope and sync strategy rather than guess.

### assistant · 2026-06-21 22:17:40

- **→** `AskUserQuestion(questions=…)`

### tool_result · 2026-06-21 22:20:25

```
Your questions have been answered: "Which untracked files should I stage for the commit on dev?"="This session + other doc artifacts", "dev is 47 commits behind main. How do you want to handle that?"="Commit on dev now, sync later". You can now continue with these answers in mind.
```

### assistant · 2026-06-21 22:20:45

Got it — committing this session's files **plus** the other doc artifacts (pathfinder audit, replays, prior summaries), **excluding** `AGENTS.override.md` (keeping it local like `CLAUDE.local.md`), and committing on `dev` now with **no merge** (sync later).

First, a safety check — confirm none of the files we're carrying over already exist as tracked files on `dev` (which would block the switch):

### assistant · 2026-06-21 22:20:48

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== do any to-be-committed paths already exist on dev? (any… [+629 chars]', description='Verify no path conflicts on dev before switching')`

### tool_result · 2026-06-21 22:21:36

```
=== do any to-be-committed paths already exist on dev? (any 'EXISTS' = must handle before switch) ===
absent (safe): docs/ARCHITECTURE.md
absent (safe): docs/diagrams/minutes-build-link-run.html
absent (safe): docs/diagrams/minutes-parakeet-fallback.html
absent (safe): docs/session-summary-2026-06-21-architecture-deep-dive.md
absent (safe): docs/session-summary-2026-06-21-pathfinder-core-audit.md… [+283 chars]
```

### assistant · 2026-06-21 22:21:44

All clear — every path is absent on `dev`, so the switch is clean. (And thanks for the context — that confirms the Pathfinder files are intentional Codex output you want included.) Executing the safe steps now: switch to dev, exclude `AGENTS.override.md` locally, stage the chosen files.

### assistant · 2026-06-21 22:21:48

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== switch to dev (untracked files carry over) ==="\ngit swi… [+796 chars]', description='Switch to dev, exclude local file, stage chosen files')`

### tool_result · 2026-06-21 22:23:10

```
=== switch to dev (untracked files carry over) ===
Switched to branch 'dev'
Your branch is up to date with 'origin/dev'.

=== keep AGENTS.override.md local (like CLAUDE.local.md) ===
AGENTS.override.md
→ AGENTS.override.md now ignored ✓

=== stage the chosen files (NOT AGENTS.override.md, NOT CLAUDE.local.md) ===
staged.
```

### assistant · 2026-06-21 22:23:26

Staging done. Note that switching to `dev` reverted the **tracked** files to dev's older state (dev is 47 commits behind, so its `CLAUDE.md`, `Cargo.toml`, etc. are older versions) — that's expected and correct, not a loss; main's newer versions are safe on `main`. Our untracked docs carried over intact and are staged. Let me verify the exact staged set before handing you the commit command:

### assistant · 2026-06-21 22:23:30

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== STAGED for commit (should be 8 files + the PATHFINDER d… [+626 chars]', description='Verify staged set, ignored files, main untouched')`

### tool_result · 2026-06-21 22:24:17

```
=== STAGED for commit (should be 8 files + the PATHFINDER dir's 6 files) ===
docs/session-summary-2026-06-21-pathfinder-core-audit.md
PATHFINDER-2026-06-21/00-features.md
PATHFINDER-2026-06-21/01-flowcharts/desktop-shell.md
PATHFINDER-2026-06-21/01-flowcharts/live-dictation.md
PATHFINDER-2026-06-21/01-flowcharts/mcp-agent-surface.md
PATHFINDER-2026-06-21/01-flowcharts/processing-jobs-watcher.md
PA… [+1024 chars]
```

### assistant · 2026-06-21 22:24:48

Everything is staged correctly and safely. Final state:

- **On branch `dev`** (in sync with `origin/dev`).
- **19 files staged** — this session's 4 (ARCHITECTURE.md + 2 diagrams + architecture summary), the full `PATHFINDER-2026-06-21/` audit (12 files incl. the `01-flowcharts/` set), both replay files, and the two prior session summaries.
- **`CLAUDE.local.md` and `AGENTS.override.md` excluded** ✓ (both confirmed ignored, won't be committed) — your local agent-override files stay local.
- **`main` is untouched** at `8a45434`, and its newer tracked files (the up-to-date `CLAUDE.md`, `Cargo.toml`, etc.) are safe there. On `dev` those tracked files show their older `dev` versions — expected, since dev is 47 behind; nothing was lost.
- Your **Parakeet WIP stash** (`stash@{0}`) and the `docs/parakeet-install-rewrite` branch are untouched.

Per the repo rule, I haven't committed — here's the ready-to-run command:

```bash
git commit -F - <<'EOF'
docs: add architecture reference, Pathfinder audit, and session artifacts

Documentation from two parallel agent sessions (no source changes):

- docs/ARCHITECTURE.md — grounded deep-dive on the three front-ends
  (CLI/Tauri/MCP) over minutes-core: coordination via ~/.minutes, the
  record/process async split, the pipeline, live/streaming, the Parakeet
  sidecar fallback chain, versioning, and per-binary compile-time features.
  Plus two interactive diagrams under docs/diagrams/.
- PATHFINDER-2026-06-21/ — Codex "Pathfinder" architecture audit: feature
  map, per-feature flowcharts, duplication report, unified proposal,
  handoff prompts, and final synthesized audit.
- docs/session-summary-* and docs/replay-* — session summaries and replay
  transcripts.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01TBqU7PBPbXfT8sRoi8md7z
EOF
```

Then to publish to your fork's dev:

```bash
git push origin dev
```

**When you're ready to sync later** (you chose to defer it): the merge will be `git switch dev && git merge main`, and expect one conflict on `docs/PARAKEET.md` (dev's `f69ffb7` vs main's `#250` — the same parakeet-doc work in two forms). Since main's `#250` is the merged/canonical version, resolving in favor of main's content is almost certainly right. Ping me and I'll walk it through with you.

Want me to verify the commit landed after you run it, or help with the push?

### user · 2026-06-21 22:28:13

<local-command-caveat>Caveat: The messages below were generated by the user while running local commands. DO NOT respond to these messages or otherwise consider them in your response unless the user explicitly asks you to.</local-command-caveat>

### user · 2026-06-21 22:28:13

<command-name>/copy</command-name>
            <command-message>copy</command-message>
            <command-args></command-args>

### user · 2026-06-21 22:28:13

<local-command-stdout>Copied to clipboard (934 characters, 19 lines)
Also written to /tmp/claude-501/copy.bash</local-command-stdout>

### user · 2026-06-21 23:00:47

I decided to break up the commits into smaller pieces and also add the work-in-progress versions of PARAKEET.md I had in stash so I now have them safely stored in a commit in `dev`. So now it is your turn to get your deep dive documents committed -- please scan the files I have staged and provide a proper commit message for them.

### assistant · 2026-06-21 23:00:51

I'll scan exactly what's currently staged and craft a commit message for that set.

### assistant · 2026-06-21 23:00:53

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== branch + sync state ==="\ngit branch --show-current\ngit… [+292 chars]', description='Scan currently staged files on dev')`

### tool_result · 2026-06-21 23:00:53

```
=== branch + sync state ===
dev
## dev...origin/dev [ahead 3]

=== STAGED files (what your commit message must describe) ===
A	docs/ARCHITECTURE.md
A	docs/codebase-assessment_2016-06-20.md
A	docs/diagrams/minutes-build-link-run.html
A	docs/diagrams/minutes-parakeet-fallback.html
A	docs/replay-17279b0b-full.md
A	docs/replay-17279b0b.md
A	docs/session-summary-2026-06-21-architecture-deep-dive.md

==… [+715 chars]
```

### assistant · 2026-06-21 23:01:03

All this-session's deep-dive material — the Pathfinder audit and prior summaries are already in your separate commits (`314c727`, `39451fe`, `b028088`). One staged file I didn't create — `docs/codebase-assessment_2016-06-20.md` — let me peek so the message describes it accurately rather than guessing.

### assistant · 2026-06-21 23:01:04

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== docs/codebase-assessment_2016-06-20.md — first 25 lines… [+111 chars]', description='Inspect the new codebase-assessment file')`

### tool_result · 2026-06-21 23:01:05

```
=== docs/codebase-assessment_2016-06-20.md — first 25 lines + size ===
      63 docs/codebase-assessment_2016-06-20.md
# MINUTES - Codebase Assessment

## Mental Model
Minutes is built around `minutes-core`, not around the desktop app or CLI.

The main layers are:

- [crates/core/src/lib.rs](/Users/rymalia/projects/minutes/crates/core/src/lib.rs): shared engine for config, capture, transcription,… [+1747 chars]
```

### assistant · 2026-06-21 23:01:31

Scanned. The staged set is exactly this session's deep-dive output (7 files, 6,156 insertions, all docs — your Pathfinder and Parakeet-stash work is already in the separate commits above). The one file I didn't author, `docs/codebase-assessment_2016-06-20.md`, is a concise 63-line mental-model assessment of the core-centric architecture — a companion to the full `ARCHITECTURE.md`, so it belongs in this commit.

One small heads-up before you commit: that filename reads **`2016`-06-20** — almost certainly a typo for `2026`. Want me to `git mv` it to `docs/codebase-assessment_2026-06-20.md` first? (Your call; the message below uses the current name.)

Commit message for the staged set:

```bash
git commit -F - <<'EOF'
docs: add CLI/Tauri/core architecture deep-dive + diagrams

Documentation from a learn-codebase deep dive (no source changes):

- docs/ARCHITECTURE.md — grounded reference on the three front-ends
  (CLI/Tauri/MCP) over minutes-core: coordination via ~/.minutes, the
  record/process async split, the pipeline, live/streaming, the Parakeet
  sidecar fallback chain, versioning, and per-binary compile-time features.
- docs/codebase-assessment_2016-06-20.md — concise mental-model summary of
  the shared core flow and the CLI/Tauri/MCP layers.
- docs/diagrams/minutes-build-link-run.html and
  docs/diagrams/minutes-parakeet-fallback.html — interactive companion diagrams.
- docs/session-summary-2026-06-21-architecture-deep-dive.md plus
  docs/replay-17279b0b.md and docs/replay-17279b0b-full.md — session summary
  and replay transcripts.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01TBqU7PBPbXfT8sRoi8md7z
EOF
```

After committing, `dev` will be **4 ahead** of `origin/dev`; push with `git push origin dev` when ready. Want me to rename the mistyped file first, or verify the commit once you've run it?

### user · 2026-06-21 23:02:15

<command-name>/copy</command-name>
            <command-message>copy</command-message>
            <command-args></command-args>

### user · 2026-06-21 23:02:15

<local-command-stdout>Copied to clipboard (1009 characters, 20 lines)
Also written to /tmp/claude-501/copy.bash</local-command-stdout>

### user · 2026-06-21 23:02:15

<local-command-caveat>Caveat: The messages below were generated by the user while running local commands. DO NOT respond to these messages or otherwise consider them in your response unless the user explicitly asks you to.</local-command-caveat>

### user · 2026-06-21 23:09:52

<bash-input>git log --name-status -5</bash-input>

### user · 2026-06-21 23:09:52

<local-command-caveat>Caveat: The messages below were generated by the user while running local commands. DO NOT respond to these messages or otherwise consider them in your response unless the user explicitly asks you to.</local-command-caveat>

### user · 2026-06-21 23:09:52

<bash-stdout>commit bd4b9d6abff2bfae03f3f9d40cb488da61f70ed7
Author: Ryan Malia &lt;ryanmalia@gmail.com&gt;
Date:   Sun Jun 21 16:08:04 2026 -0700

    docs: add CLI/Tauri/core architecture deep-dive + diagrams
    
    Documentation from a learn-codebase deep dive (no source changes):
    
    - docs/ARCHITECTURE.md — grounded reference on the three front-ends
      (CLI/Tauri/MCP) over minutes-core: coordination via ~/.minutes, the
      record/process async split, the pipeline, live/streaming, the Parakeet
      sidecar fallback chain, versioning, and per-binary compile-time features.
    - docs/codebase-assessment_2016-06-20.md — concise mental-model summary of
      the shared core flow and the CLI/Tauri/MCP layers.
    - docs/diagrams/minutes-build-link-run.html and
      docs/diagrams/minutes-parakeet-fallback.html — interactive companion diagrams.
    - docs/session-summary-2026-06-21-architecture-deep-dive.md plus
      docs/replay-17279b0b.md and docs/replay-17279b0b-full.md — session summary
      and replay transcripts used for intra-agent communication.

A	docs/ARCHITECTURE.md
A	docs/diagrams/minutes-build-link-run.html
A	docs/diagrams/minutes-parakeet-fallback.html
A	docs/replay-17279b0b-full.md
A	docs/replay-17279b0b.md
A	docs/session-summary-2026-06-21-architecture-deep-dive.md

commit b92d6d3b94561985cff9af92153daff0b87a56ba
Author: Ryan Malia &lt;ryanmalia@gmail.com&gt;
Date:   Sun Jun 21 16:06:22 2026 -0700

    docs: add source-verified Pathfinder architecture audit
    
    Add the June 21 Pathfinder audit artifacts for the Minutes runtime
    architecture and synchronize the duplication report, unified proposal,
    and handoff prompts with the final source-verified assessment.
    
    Key points captured:
    - clarify that CLI and Tauri link minutes-core directly, while MCP is a
      CLI bridge with TypeScript read-only fallbacks
    - document start-only desktop-control and CLI-backed stop semantics
    - identify watcher/job orchestration drift and graph/search corpus drift
    - add desktop update readiness as a Tauri-local cleanup target
    - preserve desktop-native call capture, Recall, foreground process, and
      specialized retrieval stores as intentional boundaries
    
    Also add the session summary for the Pathfinder audit work.

A	PATHFINDER-2026-06-21/00-features.md
A	PATHFINDER-2026-06-21/01-flowcharts/desktop-shell.md
A	PATHFINDER-2026-06-21/01-flowcharts/live-dictation.md
A	PATHFINDER-2026-06-21/01-flowcharts/mcp-agent-surface.md
A	PATHFINDER-2026-06-21/01-flowcharts/processing-jobs-watcher.md
A	PATHFINDER-2026-06-21/01-flowcharts/recording-capture.md
A	PATHFINDER-2026-06-21/01-flowcharts/search-graph-knowledge.md
A	PATHFINDER-2026-06-21/02-duplication-report.md
A	PATHFINDER-2026-06-21/03-unified-proposal.md
A	PATHFINDER-2026-06-21/04-handoff-prompts.md
A	PATHFINDER-2026-06-21/05-final-synthesized-audit.md
A	docs/codebase-assessment_2026-06-20.md
A	docs/session-summary-2026-06-21-pathfinder-core-audit.md

commit 39451fe32ca4ae66ed1cb75a10430e38cf5da76a
Author: Ryan Malia &lt;ryanmalia@gmail.com&gt;
Date:   Sun Jun 21 15:56:35 2026 -0700

    docs: the stash of in-progress versions of PARAKEET.md for PR #250
    
    PARAKEET_ryan.md being the version furthest-along
    in the direction I want to take
    
    docs/PARAKEET_claude.md
    docs/PARAKEET_claude2.md
    docs/PARAKEET_claude2_claude1_merge.md
    docs/PARAKEET_claude2_claude2_merge.md
    docs/PARAKEET_claude2_codex1.md
    docs/PARAKEET_claude2_codex2.md
    docs/PARAKEET_codex.md
    docs/PARAKEET_codex2.md
    docs/PARAKEET_ryBAK_2026-06-11.md
    docs/PARAKEET_ryan.md
    docs/PARAKEET_staged_2026-06-15.md
    docs/PARAKEET_vDev_2026-05-22.md
    docs/PARAKEET_vPR_2026-05-15.md
    docs/PARAKEET_vUpstream_2026-05-13.md

A	docs/PARAKEET_claude.md
A	docs/PARAKEET_claude2.md
A	docs/PARAKEET_claude2_claude1_merge.md
A	docs/PARAKEET_claude2_claude2_merge.md
A	docs/PARAKEET_claude2_codex1.md
A	docs/PARAKEET_claude2_codex2.md
A	docs/PARAKEET_codex.md
A	docs/PARAKEET_codex2.md
A	docs/PARAKEET_ryBAK_2026-06-11.md
A	docs/PARAKEET_ryan.md
A	docs/PARAKEET_staged_2026-06-15.md
A	docs/PARAKEET_vDev_2026-05-22.md
A	docs/PARAKEET_vPR_2026-05-15.md
A	docs/PARAKEET_vUpstream_2026-05-13.md
A	docs/session-summary-2026-06-20-stash-main-sync-parakeet-backup.md

commit b02808891201a04364975dcdd53a03b382b3c4be
Author: Ryan Malia &lt;ryanmalia@gmail.com&gt;
Date:   Sun Jun 21 15:42:09 2026 -0700

    docs: session summary from parakeet PR #250 docs/parakeet-install-rewrite

A	docs/session-summary-2026-06-11-parakeet-cmake-numpy-dogfood.md

commit f041c9f696079a4650b2090255b2b320bc3d19da
Merge: 57756b5 a564cbd
Author: Ryan &lt;ryanmalia@gmail.com&gt;
Date:   Tue Jun 9 09:35:19 2026 -0700

    Merge branch 'silverstein:main' into dev</bash-stdout><bash-stderr></bash-stderr>

### user · 2026-06-21 23:09:59

All done with the commits

### assistant · 2026-06-21 23:10:22

All set — nice clean breakup of the commits. From your log, everything landed where it should:

- **`bd4b9d6`** — the architecture deep-dive docs (ARCHITECTURE.md, both diagrams, session summary, replays).
- **`b92d6d3`** — the Pathfinder audit, and I see you folded `docs/codebase-assessment_2026-06-20.md` in there with the year typo fixed (2016 → 2026). 👍
- **`39451fe`** — the 14 PARAKEET.md WIP drafts out of the stash, safely in history now.

Two optional follow-ups whenever you want them (no rush, nothing's blocking):

1. **Push** — `dev` is ahead of `origin/dev` by your new commits; `git push origin dev` publishes them.
2. **The deferred main→dev sync** — `dev` is still 47 behind `main`. When you're ready, `git switch dev && git merge main`, expecting the one `docs/PARAKEET.md` conflict (dev's `f69ffb7` vs main's `#250`) — resolve toward main's canonical version. Ping me and I'll walk it through.

Your Parakeet WIP stash and `docs/parakeet-install-rewrite` branch remain untouched throughout. Good session — the deep dive is now durable in `dev` and in memory for next time.

### user · 2026-06-21 23:13:08

So when I do the merge of main onto dev, is `docs/PARAKEET` expected to be the only conflict?

### assistant · 2026-06-21 23:13:23

Good instinct not to take my word for it — let me actually compute it rather than assume. `git merge-tree` performs a real in-memory merge without touching your working tree, so it predicts the exact conflict set.

### assistant · 2026-06-21 23:13:29

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\nBASE=$(git merge-base main dev)\necho "=== merge-base: $(git log -… [+793 chars]', description='Predict merge conflicts via merge-tree')`

### tool_result · 2026-06-21 23:13:31

```
=== merge-base: a564cbd docs(audio): desktop app uses native call capture (no BlackHole); fix [capture] typo (#239) (#285) ===

=== files changed on DEV since base (dev's side) ===
PATHFINDER-2026-06-21/00-features.md
PATHFINDER-2026-06-21/01-flowcharts/desktop-shell.md
PATHFINDER-2026-06-21/01-flowcharts/live-dictation.md
PATHFINDER-2026-06-21/01-flowcharts/mcp-agent-surface.md
PATHFINDER-2026-06… [+3048 chars]
```

### assistant · 2026-06-21 23:13:53

Good that you asked — I need to correct what I told you earlier. **No, `docs/PARAKEET.md` is not the only conflict.** The authoritative in-memory merge shows **two** conflicts:

| Conflicted file | Why |
|-----------------|-----|
| `docs/PARAKEET.md` | dev's `f69ffb7` vs main's `#250` — same parakeet-doc rewrite, two forms |
| `README.md` | changed on **both** sides since the common ancestor |

The logic is clean: the only files that *can* conflict are those changed on **both** branches since the merge-base (`a564cbd`). That intersection is exactly those two files — everything else dev added (ARCHITECTURE.md, the PATHFINDER set, all the PARAKEET_*.md drafts, the session summaries) is dev-only and merges cleanly, and main's 47 commits touch source files dev never changed, so they come in cleanly too. `merge-tree` confirms both are *content* conflicts git can't auto-resolve.

I should have computed this the first time instead of asserting "one conflict" — my earlier statement was a guess, not verified.

Let me characterize the README conflict so the resolution is planned, not a surprise:

### assistant · 2026-06-21 23:13:59

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\nBASE=$(git merge-base main dev)\necho "=== README.md — what DEV ch… [+276 chars]', description='Characterize the README conflict on both sides')`

### tool_result · 2026-06-21 23:14:02

```
=== README.md — what DEV changed since base ===
 README.md | 10 +++++++---
 1 file changed, 7 insertions(+), 3 deletions(-)

=== README.md — what MAIN changed since base ===
 README.md | 60 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++----
 1 file changed, 56 insertions(+), 4 deletions(-)

=== dev's README change (full diff, likely small) ===
diff --git a/README.md b/README.md
index a7f… [+1201 chars]
```

### assistant · 2026-06-21 23:14:31

Both conflicts are in the **same area** — parakeet documentation — which makes them straightforward to reason about:

**`README.md`** — both sides edited the parakeet-setup block:
- **dev** (+7/−3): your small clarification that `minutes setup --parakeet` installs Silero VAD weights but the `.nemo` download + `convert_nemo.py` step is still manual (~2.3 GB result).
- **main** (+56/−4): a much larger rewrite of the same region (part of the `#250` "fix verified gotchas" work).

**`docs/PARAKEET.md`** — the same `#250` rewrite vs your dev `f69ffb7` version.

So the pattern is: **main carries the canonical, merged versions of the parakeet docs; dev carries your earlier in-progress versions of the same content.**

**Suggested resolution when you do the merge:**
- `docs/PARAKEET.md` → take **main's** version wholesale (`#250` is the canonical, reviewed rewrite). `git checkout --theirs docs/PARAKEET.md`.
- `README.md` → take **main's** as the base, then verify your dev-specific clarifications (the manual `.nemo`/`convert_nemo.py` note, the ~2.3 GB figure) actually survived in main's rewrite — graft them in if main dropped them. This one deserves a real look rather than blind `--theirs`, since your edit added a specific gotcha.

Net: **2 conflicts, both parakeet-doc, both shallow.** When you're ready I can run `git merge main`, then walk both files with you side-by-side and resolve — and per the repo rule I'll stage the resolution and hand you the final `git commit` rather than committing the merge myself.

And noted for myself: I should have run `merge-tree` before claiming "one conflict" the first time — verifying beat guessing again.

### user · 2026-06-21 23:15:22

go ahead and run the merge

### assistant · 2026-06-21 23:15:35

On it. First confirming a clean tree, then running the merge (it'll stop at the conflicts without committing).

### assistant · 2026-06-21 23:15:38

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== pre-merge: branch + clean tree check ==="\ngit branch --… [+203 chars]', description='Verify clean tree and run merge main into dev')`

### tool_result · 2026-06-21 23:16:02

```
=== pre-merge: branch + clean tree check ===
dev
(empty above = clean, safe to merge)

=== running: git merge main (no-edit; will pause on conflicts) ===
Auto-merging README.md
CONFLICT (content): Merge conflict in README.md
Auto-merging docs/PARAKEET.md
CONFLICT (content): Merge conflict in docs/PARAKEET.md
Automatic merge failed; fix conflicts and then commit the result.
merge exit=1
```

### assistant · 2026-06-21 23:16:14

Both predicted conflicts, exactly as computed. Resolving `docs/PARAKEET.md` toward main (canonical `#250`), then inspecting the README conflict in detail:

### assistant · 2026-06-21 23:16:16

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== resolve docs/PARAKEET.md → take main\'s canonical versio… [+262 chars]', description='Resolve PARAKEET.md, show README conflict')`

### tool_result · 2026-06-21 23:16:21

```
=== resolve docs/PARAKEET.md → take main's canonical version ===
Updated 1 path from the index
PARAKEET.md resolved (main's version) + staged ✓

=== README.md conflict — show the conflicted hunk(s) with markers ===
947:<<<<<<< HEAD
948-# The `.nemo` download and `convert_nemo.py` step are still manual in v0.18.0.
949-=======
950-# The `.nemo` download and `convert_nemo.py` step are still manual.
9… [+1992 chars]
```

### assistant · 2026-06-21 23:16:57

The README conflict is genuinely tiny — main's larger rewrite auto-merged everywhere except **one line**, and even there your dev version is identical to main's except a version pin:

- dev (HEAD): `# … still manual in v0.18.0.`
- main: `# … still manual.`

main deliberately dropped the version pin (it goes stale), and main is canonical — so I'll keep main's line. Resolving surgically so the change is transparent:

### assistant · 2026-06-21 23:16:58

- **→** `Read(file_path='/Users/rymalia/projects/minutes/README.md')`

### tool_result · 2026-06-21 23:16:59

```
943	#
944	# Note: `minutes setup --parakeet` installs the bundled Silero VAD weights
945	# (~1.2 MB) and prints a manual recipe for downloading + converting the
946	# tdt-600m .nemo from HuggingFace (the resulting safetensors file is ~2.3 GB).
947	<<<<<<< HEAD
948	# The `.nemo` download and `convert_nemo.py` step are still manual in v0.18.0.
949	=======
950	# The `.nemo` download and `convert_nemo… [+235 chars]
```

### assistant · 2026-06-21 23:17:03

- **→** `Edit(file_path='/Users/rymalia/projects/minutes/README.md')`

### tool_result · 2026-06-21 23:17:03

```
The file /Users/rymalia/projects/minutes/README.md has been updated successfully. (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 23:17:07

README resolved. Now staging it and verifying no conflict markers remain anywhere before handing off:

### assistant · 2026-06-21 23:17:09

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\ngit add README.md\necho "=== any conflict markers left in the tree… [+415 chars]', description='Stage README, verify no markers, check merge state')`

### tool_result · 2026-06-21 23:17:37

```
=== any conflict markers left in the tree? (should be empty) ===
none ✓

=== merge status: all conflicts resolved? ===
M  .agents/skills/minutes/minutes-debrief/SKILL.md
M  .beads/issues.jsonl
M  .claude/plugins/minutes/skills/minutes-debrief/SKILL.md
M  .github/workflows/release-macos.yml
M  .opencode/skills/minutes-debrief/SKILL.md
M  CLAUDE.md
M  Cargo.lock
M  Cargo.toml
A  ISSUE_live_sidecar_i… [+3984 chars]
```

### assistant · 2026-06-21 23:18:13

Both conflicts resolved cleanly — no markers remain, no unmerged paths. The merge is fully staged and ready to commit.

**About that long staged file list:** don't be alarmed — that's main's 47 commits of real work now integrating into `dev` (the whole point of the merge). Here's the key safety fact: **`dev` had zero source-code changes** (its 7 commits were all docs), so for every `.rs`/`.ts`/source file the merge simply takes main's exact, already-tested version — there's no line-level interleaving of code to introduce a broken combination. The only files I manually resolved were the two docs conflicts:

| File | Resolution |
|------|-----------|
| `docs/PARAKEET.md` | took main's canonical `#250` version (`--theirs`) |
| `README.md` | kept main's line (dropped the stale `in v0.18.0` version pin); rest auto-merged |

Because my only hand-edits were docs and all code equals main's green tree, no rebuild/lint is needed for *this* merge.

Per the repo rule, I won't run the commit — complete the merge with either:

```bash
# simplest — uses the standard "Merge branch 'main' into dev" message
git commit --no-edit
```

or, if you'd like the resolution documented in history:

```bash
git commit -F - <<'EOF'
Merge branch 'main' into dev

Bring dev up to date with main (0.18.7 → 0.18.14). dev's only unique
work was docs, so all source files take main's versions cleanly.

Conflicts (both docs, resolved toward main as canonical):
- docs/PARAKEET.md — took main's #250 install-guide rewrite
- README.md — kept main's parakeet-setup wording (dropped stale "in v0.18.0" pin)
EOF
```

After committing, `dev` will be even with `main` plus your dev-only doc commits; publish with `git push origin dev`.

Want me to verify the result once you've committed (confirm `dev` contains all of main's commits and the tree is clean)?

### user · 2026-06-21 23:19:04

<bash-input>git commit -F - <<'EOF'
Merge branch 'main' into dev

Bring dev up to date with main (0.18.7 → 0.18.14). dev's only unique
work was docs, so all source files take main's versions cleanly.

Conflicts (both docs, resolved toward main as canonical):
- docs/PARAKEET.md — took main's #250 install-guide rewrite
- README.md — kept main's parakeet-setup wording (dropped stale "in v0.18.0" pin)
EOF
</bash-input>

### user · 2026-06-21 23:19:04

<local-command-caveat>Caveat: The messages below were generated by the user while running local commands. DO NOT respond to these messages or otherwise consider them in your response unless the user explicitly asks you to.</local-command-caveat>

### user · 2026-06-21 23:19:04

<bash-stdout>[dev a50561f] Merge branch 'main' into dev</bash-stdout><bash-stderr></bash-stderr>

### user · 2026-06-21 23:19:42

double-check that please

### assistant · 2026-06-21 23:19:56

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "=== HEAD now ==="\ngit log --oneline -1\necho ""\necho "=== do… [+1126 chars]', description='Verify merge result, tree clean, dev superset of main')`

### tool_result · 2026-06-21 23:19:59

```
=== HEAD now ===
a50561f Merge branch 'main' into dev

=== does dev now contain ALL of main? (dev..main should be EMPTY) ===
commits in main but NOT in dev: 0  ✓ dev has everything from main

=== divergence now (main <<left|right>> dev) ===
0	12
  (left=on main not dev | right=on dev not main → should be 0 left, N right=your doc commits+merge)

=== working tree clean? ===
(empty = clean)

=== no c… [+506 chars]
```

### assistant · 2026-06-21 23:20:14

Verified — the merge is clean and complete. All checks pass:

| Check | Result |
|-------|--------|
| HEAD | `a50561f Merge branch 'main' into dev` |
| **dev contains all of main** | `dev..main` = **0 commits** ✓ — nothing from main is missing |
| Divergence | `0` left / `12` right — main has nothing dev lacks; dev is ahead by your doc commits + the merge ✓ |
| Working tree | clean ✓ |
| Conflict markers | none (outside the replay transcripts, which legitimately contain `=======` as markdown) ✓ |
| `docs/PARAKEET.md` | byte-identical to main's canonical version ✓ |
| `README.md` | main's wording kept (`…still manual.`, stale version pin gone) ✓ |
| Parakeet WIP stash | `stash@{0}` intact, untouched ✓ |

So `dev` is now **fully caught up with `main` (0.18.14)** and carries your doc work on top — exactly the goal. The earlier 47-behind gap is closed.

**One thing left:** `dev` is **48 commits ahead of `origin/dev`** (all unpushed — main's 47 + your local commits + the merge). To publish:

```bash
git push origin dev
```

That's a normal fast-forward push to your fork; nothing force-related, nothing risky. Want me to stand by and confirm once you've pushed?

### user · 2026-06-21 23:20:32

<bash-input>git push origin dev</bash-input>

### user · 2026-06-21 23:20:33

<local-command-caveat>Caveat: The messages below were generated by the user while running local commands. DO NOT respond to these messages or otherwise consider them in your response unless the user explicitly asks you to.</local-command-caveat>

### user · 2026-06-21 23:20:33

<bash-stdout>To https://github.com/rymalia/minutes.git
   bd4b9d6..a50561f  dev -&gt; dev</bash-stdout><bash-stderr></bash-stderr>

### user · 2026-06-21 23:21:23

Looks good

### assistant · 2026-06-21 23:21:34

Pushed cleanly — `origin/dev` now points at `a50561f` (fast-forward `bd4b9d6..a50561f`, no force). Everything is published and consistent.

Final state:

- **`dev` (local + `origin/dev`)** — in sync, fully caught up with `main` (0.18.14) plus your doc work: the architecture deep-dive, the Pathfinder audit, the PARAKEET.md draft stash, and session summaries.
- **`main`** — untouched throughout this whole operation.
- **Local-only, never committed** — `CLAUDE.local.md` and `AGENTS.override.md` (both git-excluded).
- **Parakeet WIP stash** (`stash@{0}`) and `docs/parakeet-install-rewrite` branch — intact, untouched.

Nothing was lost at any step, which was the original concern. Good session all around — the deep-dive docs are now durable in `dev`, the merge is verified, and it's all on your fork.

### user · 2026-06-21 23:22:48

Instead of Updating the session summary to note the dev merge and push, can you just create a new session summary doc, a rather slim one, just recapping what git gymnastics we've just completed here, for documentation sake

### assistant · 2026-06-21 23:23:03

Slim recap doc it is. Let me grab the exact timestamp and commit hashes so it's accurate, then write it.

### assistant · 2026-06-21 23:23:04

- **→** `Bash(command='cd /Users/rymalia/projects/minutes\necho "now: $(date \'+%Y-%m-%d %I:%M %p %Z\')"\necho "branch: $(git b… [+194 chars]', description='Get timestamp and commit hashes for the recap')`

### tool_result · 2026-06-21 23:23:04

```
now: 2026-06-21 04:23 PM PDT
branch: dev

=== commits produced/landed during this git session (newest first) ===
a50561f Merge branch 'main' into dev
bd4b9d6 docs: add CLI/Tauri/core architecture deep-dive + diagrams
b92d6d3 docs: add source-verified Pathfinder architecture audit
39451fe docs: the stash of in-progress versions of PARAKEET.md for PR #250
b028088 docs: session summary from parakeet… [+236 chars]
```

### assistant · 2026-06-21 23:23:24

- **→** `Write(file_path='/Users/rymalia/projects/minutes/docs/session-summary-2026-06-21-dev-branch-sync.md')`

### tool_result · 2026-06-21 23:23:24

```
File created successfully at: /Users/rymalia/projects/minutes/docs/session-summary-2026-06-21-dev-branch-sync.md (file state is current in your context — no need to Read it back)
```

### assistant · 2026-06-21 23:23:34

Created **`docs/session-summary-2026-06-21-dev-branch-sync.md`** — a slim, git-only recap that complements (rather than edits) the architecture deep-dive summary. It covers just the branch gymnastics: the dev switch, the piecewise commits, the predicted-then-resolved merge, and the push — plus the verified end state and a couple of reusable gotchas (`merge-tree` for conflict prediction, untracked-files-survive-switch).

It's currently untracked on `dev`. If you want it in history too, the staging + message:

```bash
git add docs/session-summary-2026-06-21-dev-branch-sync.md
git commit -F - <<'EOF'
docs: session summary for dev branch sync & doc commits

Git recap of moving the architecture deep-dive + Pathfinder audit docs
onto dev and merging main into dev (0.18.7 → 0.18.14).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01TBqU7PBPbXfT8sRoi8md7z
EOF
git push origin dev
```

That's the whole git episode documented. Anything else you want captured before we wrap?

### user · 2026-06-21 23:24:17

<local-command-caveat>Caveat: The messages below were generated by the user while running local commands. DO NOT respond to these messages or otherwise consider them in your response unless the user explicitly asks you to.</local-command-caveat>

### user · 2026-06-21 23:24:17

<command-name>/copy</command-name>
            <command-message>copy</command-message>
            <command-args></command-args>

### user · 2026-06-21 23:24:17

<local-command-stdout>Copied to clipboard (1047 characters, 19 lines)
Also written to /tmp/claude-501/response.md</local-command-stdout>
