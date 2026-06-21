# Recording Capture And Stop Coordination

## Flowchart

```mermaid
flowchart TD
  CLI["CLI Record Command<br/>crates/cli/src/main.rs:1390"] --> CLIIntent["Resolve Device/Intent<br/>crates/cli/src/main.rs:1418"]
  CLIIntent --> CLICmd["cmd_record<br/>crates/cli/src/main.rs:2159"]
  CLICmd --> CLIPid["Create PID Lock<br/>crates/cli/src/main.rs:2227"]
  CLIPid --> CLINotes["Save Metadata/Notes Context<br/>crates/cli/src/main.rs:2244"]
  CLINotes --> CLICapture["record_to_wav_with_lifecycle<br/>crates/cli/src/main.rs:2316"]

  TauriStart["cmd_start_recording<br/>tauri/src-tauri/src/commands.rs:5921"] --> Reserve["prepare_cmd_recording_launch<br/>tauri/src-tauri/src/commands.rs:5969"]
  Reserve --> Spawn["spawn_reserved_recording<br/>tauri/src-tauri/src/commands.rs:5574"]
  Spawn --> StartRec["start_recording<br/>tauri/src-tauri/src/commands.rs:5098"]
  StartRec --> Preflight["Preflight + Native Availability<br/>tauri/src-tauri/src/commands.rs:5140"]
  Preflight --> NativeDecision{"Call + native available?<br/>tauri/src-tauri/src/commands.rs:5191"}

  NativeDecision -- no --> TauriPid["Create PID + Metadata<br/>tauri/src-tauri/src/commands.rs:5244"]
  TauriPid --> TauriCapture["record_to_wav_with_lifecycle<br/>tauri/src-tauri/src/commands.rs:5309"]
  CLICapture --> CapturePlan["Resolve Capture Plan<br/>crates/core/src/capture.rs:1523"]
  TauriCapture --> CapturePlan
  CapturePlan --> Dual{"Dual source?<br/>crates/core/src/capture.rs:1525"}
  Dual -- yes --> DualLoop["Dual Voice/System Loop<br/>crates/core/src/capture.rs:1144"]
  DualLoop --> DualStop["Stop Flag or Sentinel<br/>crates/core/src/capture.rs:1250"]
  DualStop --> DualFinalize["Finalize Mixed + Stems<br/>crates/core/src/capture.rs:1464"]
  Dual -- no --> SingleLoop["Single cpal Loop<br/>crates/core/src/capture.rs:1570"]
  SingleLoop --> SingleStop["Stop Flag or Sentinel<br/>crates/core/src/capture.rs:1635"]
  SingleStop --> SingleFinalize["Finalize WAV<br/>crates/core/src/capture.rs:1774"]

  CLIStop["CLI cmd_stop<br/>crates/cli/src/main.rs:2456"] --> WriteSentinel["write_stop_sentinel<br/>crates/core/src/pid.rs:613"]
  TauriStop["cmd_stop_recording<br/>tauri/src-tauri/src/commands.rs:6030"] --> RequestStop["request_stop<br/>tauri/src-tauri/src/commands.rs:3312"]
  RequestStop --> InProcStop["Set Atomic Stop Flag<br/>tauri/src-tauri/src/commands.rs:3318"]
  RequestStop --> WriteSentinel
  CallAutoStop["Call Detect Countdown Fires<br/>tauri/src-tauri/src/call_detect.rs:689"] --> InProcStop
  WriteSentinel --> CheckSentinel["check_and_clear_sentinel<br/>crates/core/src/pid.rs:623"]
  CheckSentinel --> DualStop
  CheckSentinel --> SingleStop
  InProcStop --> DualStop
  InProcStop --> SingleStop

  SingleFinalize --> CLIQueue["CLI queue_live_capture<br/>crates/cli/src/main.rs:2343"]
  DualFinalize --> CLIQueue
  SingleFinalize --> TauriQueue["Tauri queue_live_capture<br/>tauri/src-tauri/src/commands.rs:5354"]
  DualFinalize --> TauriQueue
  CLIQueue --> CLIWorker["Spawn process-queue<br/>crates/cli/src/main.rs:2417"]
  TauriQueue --> TauriWorker["spawn_processing_worker<br/>tauri/src-tauri/src/commands.rs:5384"]

  NativeDecision -- yes --> NativeStart["start_native_call_recording<br/>tauri/src-tauri/src/commands.rs:2886"]
  NativeStart --> HelperStart["start_native_call_capture<br/>tauri/src-tauri/src/call_capture.rs:242"]
  HelperStart --> HelperReady["Helper ready + health stdout<br/>tauri/src-tauri/src/call_capture.rs:378"]
  HelperReady --> NativeLoop["Poll stop/sentinel/helper<br/>tauri/src-tauri/src/commands.rs:2959"]
  NativeLoop --> NativeStop["Native session.stop SIGTERM<br/>tauri/src-tauri/src/call_capture.rs:132"]
  NativeStop --> NativeQueue["queue_native_call_capture_for_processing<br/>tauri/src-tauri/src/commands.rs:3212"]
  NativeQueue --> NativeWorker["spawn_processing_worker<br/>tauri/src-tauri/src/commands.rs:3241"]
```

## Notes

- CLI and Tauri both converge on `record_to_wav_with_lifecycle` and `queue_live_capture_with_recording_health`.
- The desktop native call branch is legitimate specialization: it owns ScreenCaptureKit/helper process state and can capture system audio without CLI loopback routing.
- Stop coordination is shared through `recording.stop` plus Tauri in-process atomics when the desktop app owns the active recording.

## Sources

- `crates/cli/src/main.rs:1390-1480`, `crates/cli/src/main.rs:2205-2534`
- `crates/core/src/capture.rs:1138-1810`
- `crates/core/src/pid.rs:23-70`, `crates/core/src/pid.rs:491-653`
- `tauri/src-tauri/src/commands.rs:2886-3270`, `tauri/src-tauri/src/commands.rs:3312-3365`, `tauri/src-tauri/src/commands.rs:5098-5650`, `tauri/src-tauri/src/commands.rs:5921-6048`
- `tauri/src-tauri/src/call_capture.rs:80-383`
- `tauri/src-tauri/src/call_detect.rs:583-714`
