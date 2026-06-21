# Search, Graph, Knowledge, And Retrieval

## Flowchart

```mermaid
flowchart TD
  A["Markdown Artifacts<br/>crates/core/src/search.rs:16"] --> B["SearchIndex::sync walks .md<br/>crates/core/src/search_index.rs:139"]
  B --> C["upsert_file_inner writes FTS rows<br/>crates/core/src/search_index.rs:263"]
  C --> D["search_with_mode opens/syncs index<br/>crates/core/src/search.rs:541"]
  D --> E["SearchIndex::search dispatch<br/>crates/core/src/search_index.rs:369"]
  E --> F["List: search_list<br/>crates/core/src/search_index.rs:405"]
  E --> G["Search: search_match FTS5<br/>crates/core/src/search_index.rs:462"]
  A --> H["Intent walk: search_intents<br/>crates/core/src/search.rs:656"]
  H --> I["process_intent_file parses YAML<br/>crates/core/src/search.rs:1113"]
  A --> J["Research walk: cross_meeting_research<br/>crates/core/src/search.rs:343"]
  A --> K["Person walk: person_profile<br/>crates/core/src/search.rs:892"]
  A --> L["Graph rebuild_index<br/>crates/core/src/graph.rs:336"]
  L --> M["Graph writes people/meetings<br/>crates/core/src/graph.rs:436"]
  L --> N["Graph writes commitments/topics<br/>crates/core/src/graph.rs:589"]
  M --> O["relationship_map people output<br/>crates/core/src/graph.rs:877"]
  N --> P["query_commitments output<br/>crates/core/src/graph.rs:824"]
  A --> Q["Knowledge extract facts<br/>crates/core/src/knowledge_extract.rs:16"]
  Q --> R["Knowledge adapter writes profiles/log<br/>crates/core/src/knowledge.rs:244"]
  S["CLI cmd_list<br/>crates/cli/src/main.rs:3203"] --> D
  T["CLI cmd_search<br/>crates/cli/src/main.rs:3077"] --> D
  T --> H
  U["CLI cmd_research<br/>crates/cli/src/main.rs:3949"] --> J
  V["CLI cmd_person<br/>crates/cli/src/main.rs:3334"] --> K
  W["CLI cmd_people/cmd_commitments<br/>crates/cli/src/main.rs:3376"] --> L
  W --> O
  W --> P
  X["Tauri cmd_list_meetings/cmd_search<br/>tauri/src-tauri/src/commands.rs:6573"] --> D
  Y["MCP runMinutes<br/>crates/mcp/src/index.ts:1040"] --> S
  Y --> T
  Y --> U
  Y --> W
  Z["SDK list/search/person<br/>crates/sdk/src/reader.ts:415"] --> AA["Direct markdown reader<br/>crates/sdk/src/reader.ts:358"]
```

## Notes

- Search has an indexed core path and a direct markdown reader/SDK path.
- Person/commitment data is split across markdown walks (`person_profile`, `cross_meeting_research`, `search_intents`) and graph-backed queries (`relationship_map`, `query_commitments`).
- MCP uses CLI for authoritative full behavior, optional QMD for semantic search, and TS reader fallbacks when CLI is unavailable.

## Sources

- `crates/core/src/search.rs:300-1335`
- `crates/core/src/search_index.rs:1-560`
- `crates/core/src/graph.rs:336-940`
- `crates/core/src/knowledge.rs:104-385`
- `crates/core/src/knowledge_extract.rs:1-175`
- `crates/reader/src/search.rs:1-75`
- `crates/sdk/src/reader.ts:328-785`
- `crates/cli/src/main.rs:3060-3485`, `crates/cli/src/main.rs:3850-4155`
- `crates/mcp/src/index.ts:1696-1895`, `crates/mcp/src/index.ts:2134-2340`, `crates/mcp/src/index.ts:2622-2685`
- `tauri/src-tauri/src/commands.rs:6570-6660`
