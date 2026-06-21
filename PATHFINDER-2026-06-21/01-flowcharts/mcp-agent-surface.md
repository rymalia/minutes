# MCP Agent Surface And CLI Delegation

## Flowchart

```mermaid
flowchart TD
  A["McpServer constructed<br/>crates/mcp/src/index.ts:1281"] --> B["App resource registered<br/>crates/mcp/src/index.ts:1331"]
  A --> C["registerTool start_recording<br/>crates/mcp/src/index.ts:1351"]
  A --> D["registerTool live/dictation<br/>crates/mcp/src/index.ts:2925"]
  A --> E["Start stdio transport<br/>crates/mcp/src/index.ts:3563"]

  C --> F["runMinutes status/preflight<br/>crates/mcp/src/index.ts:1382"]
  F --> G{"Extension runtime or call intent?<br/>crates/mcp/src/index.ts:1404"}
  G -- yes --> H["delegateRecordingToDesktop<br/>crates/mcp/src/index.ts:841"]
  H --> I["Write desktop-control request<br/>crates/mcp/src/index.ts:873"]
  I --> J["Poll desktop response<br/>crates/mcp/src/index.ts:879"]
  G -- no --> K["spawn minutes record<br/>crates/mcp/src/index.ts:1512"]
  K --> L["runMinutes status verify<br/>crates/mcp/src/index.ts:1521"]

  M["stop_recording tool<br/>crates/mcp/src/index.ts:1549"] --> N["runMinutes stop<br/>crates/mcp/src/index.ts:1559"]

  D --> O["start_dictation tool<br/>crates/mcp/src/index.ts:2925"]
  O --> P["spawn minutes dictate<br/>crates/mcp/src/index.ts:2969"]
  O --> Q["stop_dictation sends SIGTERM<br/>crates/mcp/src/index.ts:2997"]

  D --> R["start_live_transcript tool<br/>crates/mcp/src/index.ts:3257"]
  R --> S["runMinutes status/transcript status<br/>crates/mcp/src/index.ts:3269"]
  S --> T["spawn minutes live<br/>crates/mcp/src/index.ts:3307"]
  T --> U["verify transcript status<br/>crates/mcp/src/index.ts:3316"]

  V["Retrieval tools<br/>crates/mcp/src/index.ts:1696"] --> W["runMinutes CLI bridge<br/>crates/mcp/src/index.ts:1040"]
  W --> X["CLI list/search/research/people<br/>crates/mcp/src/index.ts:1740"]
  V --> Y["QMD search optional<br/>crates/mcp/src/index.ts:384"]
  V --> Z["TS reader fallback<br/>crates/mcp/src/index.ts:2219"]
```

## Notes

- MCP is intentionally not a direct Rust API consumer. `runMinutes` keeps CLI behavior authoritative, while lightweight TS readers provide fallback.
- Call recording delegation to desktop is legitimate specialization because the desktop app has native permissions and system-audio capture.
- Dictation/live MCP spawn paths mirror CLI child process behavior, but stop semantics are inconsistent for dictation.

## Sources

- `crates/mcp/src/index.ts:784-899`
- `crates/mcp/src/index.ts:1038-1065`
- `crates/mcp/src/index.ts:1281-1544`
- `crates/mcp/src/index.ts:1549-1560`
- `crates/mcp/src/index.ts:1696-1895`
- `crates/mcp/src/index.ts:2134-2340`
- `crates/mcp/src/index.ts:2923-3022`
- `crates/mcp/src/index.ts:3255-3335`
- `crates/mcp/src/index.ts:3563-3585`
