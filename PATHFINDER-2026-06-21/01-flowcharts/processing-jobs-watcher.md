# Processing Pipeline, Background Jobs, And Watcher

## Flowchart

```mermaid
flowchart TD
  A["Recorded current.wav<br/>crates/cli/src/main.rs:2315"] --> B["Queue live capture<br/>crates/cli/src/main.rs:2344"]
  A2["Tauri current.wav<br/>tauri/src-tauri/src/commands.rs:5241"] --> B2["Tauri queue live capture<br/>tauri/src-tauri/src/commands.rs:5354"]
  B --> C["queue_live_capture_with_recording_health<br/>crates/core/src/jobs.rs:182"]
  B2 --> C
  C --> D["move_capture_into_job<br/>crates/core/src/jobs.rs:310"]
  D --> E["write_job queued JSON<br/>crates/core/src/jobs.rs:521"]
  E --> F["Spawn queue worker<br/>crates/cli/src/main.rs:2417"]
  E --> G["Spawn Tauri worker process<br/>tauri/src-tauri/src/commands.rs:3917"]
  F --> H["process_pending_jobs<br/>crates/core/src/jobs.rs:1187"]
  G --> H
  I["Queued imported recovery audio<br/>tauri/src-tauri/src/commands.rs:7253"] --> J["enqueue_capture_job<br/>crates/core/src/jobs.rs:391"]
  J --> E

  H --> K["next_pending_job<br/>crates/core/src/jobs.rs:954"]
  K --> L["Claim Transcribing owner_pid<br/>crates/core/src/jobs.rs:1193"]
  L --> M["transcribe_to_artifact<br/>crates/core/src/pipeline.rs:1367"]
  M --> N["prepare_transcription_input<br/>crates/core/src/pipeline.rs:593"]
  N --> O["resolve_ffmpeg for stem mix<br/>crates/core/src/ffmpeg.rs:32"]
  M --> P["transcribe_path_for_content_with_hints<br/>crates/core/src/pipeline.rs:1433"]
  P --> Q["write_transcript_artifact<br/>crates/core/src/pipeline.rs:1460"]
  Q --> R["markdown write/rewrite initial transcript<br/>crates/core/src/pipeline.rs:1629"]
  R --> S["Mark TranscriptOnly<br/>crates/core/src/jobs.rs:1315"]
  S --> T["enrich_transcript_artifact<br/>crates/core/src/pipeline.rs:1656"]
  T --> U["Optional diarize<br/>crates/core/src/pipeline.rs:1677"]
  T --> V["Optional summarize<br/>crates/core/src/pipeline.rs:1753"]
  V --> W["Rewrite enriched markdown<br/>crates/core/src/pipeline.rs:1960"]
  W --> X["Events vault knowledge side effects<br/>crates/core/src/pipeline.rs:1988"]
  X --> Y["Complete job update<br/>crates/core/src/jobs.rs:1370"]
  Y --> Z["preserve_audio_alongside_output<br/>crates/core/src/jobs.rs:1059"]
  Y --> AA["update_job_state terminal<br/>crates/core/src/jobs.rs:980"]
  AA --> AB["move_to_archive hard-link unlink<br/>crates/core/src/jobs.rs:739"]

  WC["Watched audio event<br/>crates/core/src/watch.rs:635"] --> WD["build_candidate<br/>crates/core/src/watch.rs:693"]
  WD --> WE["process_candidate<br/>crates/core/src/watch.rs:342"]
  WE --> WF["process_with_sidecar direct<br/>crates/core/src/watch.rs:354"]
  WF --> WG["process_with_progress_and_sidecar<br/>crates/core/src/pipeline.rs:2061"]
  WG --> WH["write markdown direct<br/>crates/core/src/pipeline.rs:2604"]
  WH --> WI["move source to processed<br/>crates/core/src/watch.rs:394"]

  CD["CLI process path<br/>crates/cli/src/main.rs:4353"] --> CE["process_with_template direct<br/>crates/cli/src/main.rs:4371"]
  CE --> WG
```

## Notes

- Recorded audio and Tauri retry-all enter the job queue.
- Watcher normal processing and `minutes process` call the pipeline directly without job JSON/archive state.
- The queue path preserves progress and recovery state; direct paths are simpler but duplicate pipeline lifecycle decisions.

## Sources

- `crates/core/src/jobs.rs:182-243`, `crates/core/src/jobs.rs:310-435`, `crates/core/src/jobs.rs:1187-1407`
- `crates/core/src/pipeline.rs:1367-1654`, `crates/core/src/pipeline.rs:1656-2061`, `crates/core/src/pipeline.rs:2061-2702`
- `crates/core/src/watch.rs:342-410`, `crates/core/src/watch.rs:621-757`
- `crates/cli/src/main.rs:2315-2380`, `crates/cli/src/main.rs:2417-2581`, `crates/cli/src/main.rs:4353-4379`, `crates/cli/src/main.rs:5130-5144`
- `tauri/src-tauri/src/commands.rs:3917-3945`, `tauri/src-tauri/src/commands.rs:5354-5391`, `tauri/src-tauri/src/commands.rs:7245-7361`
