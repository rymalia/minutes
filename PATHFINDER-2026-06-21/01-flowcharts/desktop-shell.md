# Desktop Shell, Command RPC, Recall, Palette, And Updates

## Flowchart

```mermaid
flowchart TD
  A["Bootstrap Builder<br/>tauri/src-tauri/src/main.rs:1409"] --> B["Manage AppState<br/>tauri/src-tauri/src/main.rs:1606"]
  B --> C["Setup Hooks/Watchers<br/>tauri/src-tauri/src/main.rs:1660"]
  C --> D["Auto Update Thread<br/>tauri/src-tauri/src/main.rs:1705"]
  C --> E["Register Palette Shortcut<br/>tauri/src-tauri/src/main.rs:1832"]
  B --> F["Register IPC Handlers<br/>tauri/src-tauri/src/main.rs:2449"]

  F --> G["Frontend Status Poll<br/>tauri/src/index.html:6511"]
  G --> H["cmd_capture_status<br/>tauri/src-tauri/src/commands.rs:6308"]
  H --> I["status_value Includes updateState<br/>tauri/src-tauri/src/commands.rs:6230"]
  I --> J["Render Status/Update Banner<br/>tauri/src/index.html:6532"]

  E --> K["Global Palette Shortcut Dispatch<br/>tauri/src-tauri/src/main.rs:1565"]
  J --> L["Focused Cmd+K Toggle<br/>tauri/src/index.html:8756"]
  K --> M["handle_palette_shortcut_event<br/>tauri/src-tauri/src/commands.rs:14459"]
  L --> N["cmd_toggle_palette<br/>tauri/src-tauri/src/commands.rs:14494"]
  M --> O["toggle_palette_window<br/>tauri/src-tauri/src/commands.rs:14499"]
  N --> O
  O --> P["Build Palette Webview<br/>tauri/src-tauri/src/commands.rs:14652"]
  P --> Q["fetchCommands<br/>tauri/src/palette/index.html:573"]
  Q --> R["palette_current_meeting<br/>tauri/src-tauri/src/commands.rs:14720"]
  Q --> S["palette_list<br/>tauri/src-tauri/src/palette_dispatch.rs:351"]
  S --> T["visible_commands + recents<br/>tauri/src-tauri/src/palette_dispatch.rs:355"]
  T --> U["executeWithFreshVisibility<br/>tauri/src/palette/index.html:638"]
  U --> V["palette_execute<br/>tauri/src-tauri/src/palette_dispatch.rs:397"]
  V --> W["dispatch_action<br/>tauri/src-tauri/src/palette_dispatch.rs:413"]

  F --> X["Open Recall<br/>tauri/src/index.html:10813"]
  X --> Y["cmd_spawn_terminal<br/>tauri/src-tauri/src/commands.rs:8278"]
  Y --> Z["spawn_terminal<br/>tauri/src-tauri/src/commands.rs:8213"]
  Z --> AA["create_workspace<br/>tauri/src-tauri/src/context.rs:174"]
  AA --> AB["write assistant context<br/>tauri/src-tauri/src/context.rs:500"]
  Z --> AC["PtyManager::spawn<br/>tauri/src-tauri/src/pty.rs:87"]
  AC --> AD["PTY reader emits pty:data<br/>tauri/src-tauri/src/pty.rs:175"]
  AD --> AE["xterm listener writes bytes<br/>tauri/src/index.html:10716"]
  X --> AF["persist Recall workspace<br/>tauri/src/index.html:12318"]
  AF --> AG["cmd_set_recall_workspace_state<br/>tauri/src-tauri/src/commands.rs:6901"]

  D --> AH["check_for_update<br/>tauri/src-tauri/src/main.rs:719"]
  AH --> AI["store PendingUpdate/defer or notify<br/>tauri/src-tauri/src/main.rs:766"]
  AI --> AJ["update-ready listener<br/>tauri/src/index.html:11244"]
  AJ --> AK["startUpdateInstall<br/>tauri/src/index.html:11198"]
  AK --> AL["cmd_install_update<br/>tauri/src-tauri/src/commands.rs:14044"]
  AL --> AM["download_update_bytes<br/>tauri/src-tauri/src/commands.rs:1170"]
  AM --> AN["set_update_ui_state events<br/>tauri/src-tauri/src/commands.rs:1064"]
  AN --> AO["update phase/progress/error listeners<br/>tauri/src/index.html:11252"]
  AL --> AP["verify signature + install + restart<br/>tauri/src-tauri/src/commands.rs:14145"]
```

## Notes

- The desktop app has one `AppState` and one IPC registration surface, but `commands.rs` is a very large mixed command/RPC module.
- Palette, Recall, updates, recording state, dictation, live transcript, and settings all converge through the same status polling and event bus.
- The shell’s duplication risk is less about algorithms and more about repeated lifecycle/status gating across commands.

## Sources

- `tauri/src-tauri/src/main.rs:1409-1736`, `tauri/src-tauri/src/main.rs:1828-1860`, `tauri/src-tauri/src/main.rs:2449-2570`
- `tauri/src-tauri/src/commands.rs:6230-6336`, `tauri/src-tauri/src/commands.rs:6890-6942`, `tauri/src-tauri/src/commands.rs:8213-8330`, `tauri/src-tauri/src/commands.rs:14044-14205`, `tauri/src-tauri/src/commands.rs:14459-14735`
- `tauri/src-tauri/src/palette_dispatch.rs:351-758`
- `tauri/src-tauri/src/pty.rs:85-224`
- `tauri/src-tauri/src/context.rs:174-539`
- `tauri/src/index.html:6490-6555`, `tauri/src/index.html:8728-8780`, `tauri/src/index.html:10640-11295`, `tauri/src/index.html:12310-12342`
- `tauri/src/palette/index.html:573-666`
