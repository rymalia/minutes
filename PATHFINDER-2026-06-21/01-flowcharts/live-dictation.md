# Live Transcript And Dictation

## Flowchart

```mermaid
flowchart TD
  CLI_Live["CLI Live command<br/>crates/cli/src/main.rs:1831"] --> CLI_CmdLive["cmd_live<br/>crates/cli/src/main.rs:9166"]
  Tauri_Live["Tauri cmd_start_live_transcript<br/>tauri/src-tauri/src/commands.rs:12878"] --> Tauri_RunLive["run_live_session<br/>tauri/src-tauri/src/commands.rs:12734"]
  Tauri_LiveShortcut["handle_live_shortcut_event<br/>tauri/src-tauri/src/commands.rs:12958"] --> Tauri_RunLive
  MCP_Live["MCP start_live_transcript<br/>crates/mcp/src/index.ts:3257"] --> CLI_Live

  CLI_Dict["CLI Dictate command<br/>crates/cli/src/main.rs:1668"] --> CLI_CmdDict["cmd_dictate<br/>crates/cli/src/main.rs:8586"]
  Tauri_DictShortcut["ShortcutSlot::Dictation<br/>tauri/src-tauri/src/shortcut_manager.rs:782"] --> Tauri_StartDict["start_dictation_session<br/>tauri/src-tauri/src/commands.rs:13650"]
  MCP_Dict["MCP start_dictation<br/>crates/mcp/src/index.ts:2925"] --> CLI_Dict

  CLI_CmdLive --> LiveRun["live_transcript::run<br/>crates/core/src/live_transcript.rs:568"]
  Tauri_RunLive --> LiveRun
  LiveRun --> LiveGuard["check recording/dictation + create_pid_guard<br/>crates/core/src/live_transcript.rs:584"]
  LiveGuard --> LiveInner["run_inner<br/>crates/core/src/live_transcript.rs:662"]
  LiveInner --> AudioStartLive["AudioStream::start<br/>crates/core/src/streaming.rs:193"]
  AudioStartLive --> LiveWriter["LiveTranscriptWriter::new<br/>crates/core/src/live_transcript.rs:310"]
  LiveWriter --> LiveLoop["VAD + chunk loop<br/>crates/core/src/live_transcript.rs:795"]
  LiveLoop --> LiveFeed["StreamingWhisper::feed<br/>crates/core/src/streaming_whisper.rs:123"]
  LiveLoop --> LiveFinalize["finalize_live_utterance<br/>crates/core/src/live_transcript.rs:1791"]
  LiveFinalize --> WhisperFinalLive["StreamingWhisper::finalize<br/>crates/core/src/streaming_whisper.rs:149"]
  WhisperFinalLive --> LiveWrite["write_utterance JSONL/status/event<br/>crates/core/src/live_transcript.rs:424"]
  LiveWrite --> LiveDone["writer.finalize + clear_status_file<br/>crates/core/src/live_transcript.rs:1103"]

  CLI_CmdDict --> DictRun["dictation::run<br/>crates/core/src/dictation.rs:219"]
  Tauri_StartDict --> DictRun
  DictRun --> DictGuard["check recording/live/dictation + create_pid_file<br/>crates/core/src/dictation.rs:229"]
  DictGuard --> DictInner["run_inner<br/>crates/core/src/dictation.rs:259"]
  DictInner --> AudioStartDict["AudioStream::start<br/>crates/core/src/streaming.rs:193"]
  AudioStartDict --> DictLoop["VAD + chunk loop<br/>crates/core/src/dictation.rs:380"]
  DictLoop --> DictFeed["StreamingWhisper::feed<br/>crates/core/src/streaming_whisper.rs:123"]
  DictLoop --> DictFinalize["finalize_dictation_transcription<br/>crates/core/src/dictation.rs:669"]
  DictFinalize --> WhisperFinalDict["StreamingWhisper::finalize<br/>crates/core/src/streaming_whisper.rs:149"]
  WhisperFinalDict --> DictHandle["handle_utterance<br/>crates/core/src/dictation.rs:801"]
  DictHandle --> DictOutputs["write_result_outputs / finish_session<br/>crates/core/src/dictation.rs:876"]
  DictOutputs --> DictMemory["append_record<br/>crates/core/src/dictation_memory.rs:112"]
  DictOutputs --> TauriInsert["insert_text<br/>tauri/src-tauri/src/text_insertion.rs:112"]
```

## Notes

- Live and dictation share streaming/VAD/Whisper mechanics but intentionally diverge at output: live writes JSONL/status/events, dictation writes clipboard/files/daily note/history and Tauri insertion.
- Session guard concepts are duplicated across CLI, Tauri atomics, MCP checks, and core PID checks.
- MCP `stop_dictation` sends SIGTERM to `dictation.pid`, while CLI dictation ignores SIGTERM on Unix; this is a probable correctness gap.

## Sources

- `crates/core/src/live_transcript.rs:568-1135`, `crates/core/src/live_transcript.rs:1791-2078`
- `crates/core/src/dictation.rs:219-720`, `crates/core/src/dictation.rs:801-940`, `crates/core/src/dictation.rs:946-1187`
- `crates/core/src/streaming.rs:177-260`
- `crates/core/src/streaming_whisper.rs:83-230`
- `crates/cli/src/main.rs:1668-1695`, `crates/cli/src/main.rs:8586-8713`, `crates/cli/src/main.rs:9166-9331`
- `tauri/src-tauri/src/commands.rs:12641-12983`, `tauri/src-tauri/src/commands.rs:13643-13871`
- `crates/mcp/src/index.ts:2923-3022`, `crates/mcp/src/index.ts:3255-3366`
